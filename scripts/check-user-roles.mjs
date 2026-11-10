// End-to-end check of role management against the real Supabase project.
// Requires supabase/migrations/0010_admin_users.sql.
// Creates 3 temporary confirmed users with the service role key: two normal
// users and one admin (promoted with the service role, like make_admin.sql).
// Checks that a normal user cannot change any role (direct UPDATE or RPC) nor
// list users/emails, and that an admin can change others' roles but not their own.
// The "at least one admin" rule cannot be exercised here without demoting the
// real admin; it is enforced inside admin_set_user_role.
// Everything is deleted at the end (users cascade to profiles).
// Usage: npm run check:roles
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(process.argv[2] ?? ".env.local", "utf8")
    .split(/\r?\n/)
    .filter((l) => /^[A-Z_]+=/.test(l))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).trim()]),
);
const SB = env.NEXT_PUBLIC_SUPABASE_URL.replace(/\/$/, "");
const ANON = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = env.SUPABASE_SERVICE_ROLE_KEY;

let failures = 0;
const check = (label, ok, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? ` (${extra})` : ""}`);
};

const admin = (path, init = {}) =>
  fetch(`${SB}${path}`, {
    ...init,
    headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json", prefer: "return=representation", ...init.headers },
  });

const anonRest = (path, init = {}) =>
  fetch(`${SB}/rest/v1${path}`, { ...init, headers: { apikey: ANON, "content-type": "application/json", ...init.headers } });

const users = [];
async function createUser(fullName) {
  const email = `aterriza-test-${randomUUID().slice(0, 8)}@example.com`;
  const password = randomUUID();
  const res = await admin("/auth/v1/admin/users", {
    method: "POST",
    body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: fullName } }),
  });
  const user = await res.json();
  if (!res.ok) throw new Error(`create user: ${JSON.stringify(user)}`);
  users.push(user);
  const tokenRes = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await tokenRes.json();
  if (!tokenRes.ok) throw new Error(`sign in: ${JSON.stringify(session)}`);
  const rest = (path, init = {}) =>
    fetch(`${SB}/rest/v1${path}`, {
      ...init,
      headers: { apikey: ANON, authorization: `Bearer ${session.access_token}`, "content-type": "application/json", prefer: "return=representation", ...init.headers },
    });
  const rpc = async (fn, args = {}) => {
    const res = await rest(`/rpc/${fn}`, { method: "POST", body: JSON.stringify(args) });
    return { status: res.status, ok: res.ok, body: await res.json().catch(() => null) };
  };
  return { id: user.id, email, rest, rpc };
}

const roleOf = async (id) => (await (await admin(`/rest/v1/profiles?id=eq.${id}&select=role`)).json())[0]?.role;

try {
  const alice = await createUser("Alicia Prueba");
  const bruno = await createUser("Bruno Prueba");
  const carla = await createUser("Carla Admin Prueba");
  // Promote Carla with the service role (the trigger allows service_role).
  const promote = await admin(`/rest/v1/profiles?id=eq.${carla.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
  check("create 3 temporary users (1 admin)", promote.ok && (await roleOf(carla.id)) === "admin", `${promote.status}`);

  // --- Normal user: direct table writes ---
  const selfPatch = await alice.rest(`/profiles?id=eq.${alice.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
  const selfBody = await selfPatch.json().catch(() => ({}));
  check(
    "normal user cannot UPDATE own role",
    !selfPatch.ok && selfBody.code === "42501" && (await roleOf(alice.id)) === "user",
    `${selfPatch.status} ${selfBody.code}`,
  );

  const otherPatch = await alice.rest(`/profiles?id=eq.${bruno.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
  check("normal user cannot UPDATE another user's role", (await roleOf(bruno.id)) === "user", `${otherPatch.status}`);

  // --- Normal user: RPCs ---
  const probe = await alice.rpc("admin_set_user_role", { p_user_id: bruno.id, p_role: "admin" });
  if (probe.status === 404) {
    console.log("SKIP RPC checks: migration 0010_admin_users.sql not applied yet");
  } else {
    check(
      "normal user cannot promote another user (RPC)",
      !probe.ok && probe.body?.code === "42501" && (await roleOf(bruno.id)) === "user",
      `${probe.status} ${probe.body?.code}`,
    );

    const selfRpc = await alice.rpc("admin_set_user_role", { p_user_id: alice.id, p_role: "admin" });
    check("normal user cannot promote self (RPC)", !selfRpc.ok && (await roleOf(alice.id)) === "user", `${selfRpc.status} ${selfRpc.body?.code}`);

    const demote = await alice.rpc("admin_set_user_role", { p_user_id: carla.id, p_role: "user" });
    check("normal user cannot demote an admin (RPC)", !demote.ok && (await roleOf(carla.id)) === "admin", `${demote.status} ${demote.body?.code}`);

    const list = await alice.rpc("admin_list_users");
    check("normal user cannot list users/emails", !list.ok && list.body?.code === "42501", `${list.status} ${list.body?.code}`);

    const anonList = await anonRest("/rpc/admin_list_users", { method: "POST", body: "{}" });
    check("anonymous cannot list users", !anonList.ok, `${anonList.status}`);

    // --- Admin ---
    const found = await carla.rpc("admin_list_users", { p_search: alice.email });
    check(
      "admin lists users with email (search by email)",
      found.ok && found.body?.length === 1 && found.body[0].email === alice.email && found.body[0].role === "user",
      JSON.stringify(found.body),
    );

    const byName = await carla.rpc("admin_list_users", { p_search: "bruno prueba" });
    check("admin searches by name", byName.ok && byName.body?.some((u) => u.id === bruno.id), `${byName.status}`);

    const up = await carla.rpc("admin_set_user_role", { p_user_id: bruno.id, p_role: "admin" });
    check("admin promotes another user", up.ok && (await roleOf(bruno.id)) === "admin", `${up.status} ${JSON.stringify(up.body)}`);

    const down = await carla.rpc("admin_set_user_role", { p_user_id: bruno.id, p_role: "user" });
    check("admin demotes another admin", down.ok && (await roleOf(bruno.id)) === "user", `${down.status} ${JSON.stringify(down.body)}`);

    const own = await carla.rpc("admin_set_user_role", { p_user_id: carla.id, p_role: "user" });
    check(
      "admin cannot change own role",
      !own.ok && /propio rol/.test(own.body?.message ?? "") && (await roleOf(carla.id)) === "admin",
      `${own.status} ${own.body?.message}`,
    );

    const bad = await carla.rpc("admin_set_user_role", { p_user_id: bruno.id, p_role: "superadmin" });
    check("invalid role rejected", !bad.ok && (await roleOf(bruno.id)) === "user", `${bad.status} ${bad.body?.code}`);

    const ghost = await carla.rpc("admin_set_user_role", { p_user_id: randomUUID(), p_role: "admin" });
    check("unknown user rejected", !ghost.ok, `${ghost.status} ${ghost.body?.message}`);
  }
} catch (error) {
  check("unexpected error", false, error.message);
} finally {
  for (const user of users) {
    const del = await admin(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
    check(`delete test user ${user.email}`, del.ok, `${del.status}`);
  }
}

console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
