// End-to-end check of community tips against the real Supabase project (RLS + RPC).
// Creates 3 temporary confirmed users (author, another student, admin) with the
// service role key: the author submits a tip, the admin approves it like
// moderateTip() does, and the other student must then see it both with a plain
// select (RLS) and through get_approved_tips (what /aportes uses).
// Everything is deleted at the end (users cascade to profiles and tips).
// Usage: npm run check:tips
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
  return { id: user.id, rest };
}

const approvedTips = (user) => user.rest("/rpc/get_approved_tips", { method: "POST", body: JSON.stringify({ p_limit: 100 }) });

try {
  const author = await createUser("Autora Prueba");
  const other = await createUser("Otro Estudiante");
  const moderator = await createUser("Admin Prueba");
  // service_role may change roles (prevent_role_change trigger allows it).
  const promote = await admin(`/rest/v1/profiles?id=eq.${moderator.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
  check("create 3 temporary users, one admin", promote.ok, `${promote.status}`);

  const ins = await author.rest("/tips", {
    method: "POST",
    body: JSON.stringify({ user_id: author.id, category: "llegada", body: `Aporte de prueba ${randomUUID()}` }),
  });
  const [tip] = await ins.json();
  check("author submits tip (pending)", ins.ok && tip?.status === "pending", `${ins.status} ${tip?.status}`);

  const before = await (await other.rest(`/tips?id=eq.${tip.id}&select=id`)).json();
  check("pending tip invisible to other users", Array.isArray(before) && before.length === 0, JSON.stringify(before));

  const notAdmin = await (await other.rest(`/tips?id=eq.${tip.id}&status=eq.pending`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) })).json();
  check("non-admin cannot approve", Array.isArray(notAdmin) && notAdmin.length === 0, JSON.stringify(notAdmin));

  // Same update as moderateTip() in src/app/admin/actions.ts.
  const approve = await moderator.rest(`/tips?id=eq.${tip.id}&status=eq.pending&select=id`, {
    method: "PATCH",
    body: JSON.stringify({ status: "approved", reviewed_by: moderator.id }),
  });
  const approved = await approve.json();
  check("admin approves tip (RLS update)", approve.ok && approved.length === 1, `${approve.status} ${JSON.stringify(approved)}`);

  const stored = (await (await admin(`/rest/v1/tips?id=eq.${tip.id}&select=status,reviewed_by`)).json())[0];
  check("status saved as approved", stored?.status === "approved" && stored?.reviewed_by === moderator.id, JSON.stringify(stored));

  const direct = await (await other.rest(`/tips?id=eq.${tip.id}&select=id,status`)).json();
  check("approved tip visible to other users (RLS select)", direct[0]?.status === "approved", JSON.stringify(direct));

  for (const [label, user] of [["other user", other], ["author", author]]) {
    const rpc = await approvedTips(user);
    if (rpc.status === 404) {
      check(`get_approved_tips exists for ${label}`, false, "404: apply supabase/migrations/0006_community.sql in the SQL Editor");
      continue;
    }
    const rows = await rpc.json();
    const row = Array.isArray(rows) ? rows.find((r) => r.id === tip.id) : null;
    check(`get_approved_tips returns it to ${label}`, rpc.ok && row?.author_name === "Autora", `${rpc.status} ${JSON.stringify(row ?? rows)}`);
  }

  const anon = await fetch(`${SB}/rest/v1/rpc/get_approved_tips`, {
    method: "POST",
    headers: { apikey: ANON, authorization: `Bearer ${ANON}`, "content-type": "application/json" },
    body: JSON.stringify({ p_limit: 1 }),
  });
  check("get_approved_tips denied to anonymous visitors", !anon.ok, `${anon.status}`);
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
