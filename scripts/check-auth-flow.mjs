// End-to-end check of auth routing against a running server and the real Supabase project.
// Creates a temporary confirmed user with the service role key and deletes it at the end.
// Usage: npm run build && npx next start -p 3001, then APP_URL=http://localhost:3001 npm run check:auth
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
const APP = process.env.APP_URL ?? "http://localhost:3000";
const ref = new URL(SB).hostname.split(".")[0];

let failures = 0;
const check = (label, ok, extra = "") => {
  if (!ok) failures++;
  console.log(`${ok ? "PASS" : "FAIL"} ${label}${extra ? ` (${extra})` : ""}`);
};

async function get(path, cookie) {
  const res = await fetch(APP + path, {
    redirect: "manual",
    headers: cookie ? { cookie } : {},
  });
  const location = res.headers.get("location");
  return { status: res.status, location: location && new URL(location, APP).pathname + new URL(location, APP).search, text: res.status === 200 ? await res.text() : "" };
}

async function expectRedirect(path, to, cookie) {
  const r = await get(path, cookie);
  check(`${path} -> ${to}`, r.status >= 300 && r.status < 400 && r.location === to, `${r.status} ${r.location ?? ""}`);
}
async function expectOk(path, cookie, contains) {
  const r = await get(path, cookie);
  const ok = r.status === 200 && (!contains || r.text.includes(contains));
  check(`${path} 200${contains ? ` contains "${contains}"` : ""}`, ok, `${r.status} ${r.location ?? ""}`);
}

// 1. Anonymous
console.log("-- anonymous");
await expectOk("/", null, "Entrar con Google");
for (const p of ["/inicio", "/perfil", "/chat", "/onboarding", "/admin"]) await expectRedirect(p, "/", null);
await expectRedirect("/auth/callback", "/?error=auth", null);
await expectRedirect("/auth/callback?code=invalid", "/?error=auth", null);

// 2. Google provider enabled in Supabase?
console.log("-- supabase google provider");
const authz = await fetch(`${SB}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent("http://localhost:3000/auth/callback")}`, { redirect: "manual" });
const authzLoc = authz.headers.get("location") ?? "";
check("authorize redirects to Google", authzLoc.startsWith("https://accounts.google.com"), `${authz.status} ${authzLoc.slice(0, 60)}`);

// 3. Signed-in user (temporary test user, deleted at the end)
console.log("-- signed in");
const admin = (path, init = {}) =>
  fetch(`${SB}${path}`, { ...init, headers: { apikey: SERVICE, authorization: `Bearer ${SERVICE}`, "content-type": "application/json", ...init.headers } });
const email = `aterriza-test-${randomUUID().slice(0, 8)}@example.com`;
const password = randomUUID();
const created = await admin("/auth/v1/admin/users", {
  method: "POST",
  body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { full_name: "Laura Prueba Gómez" } }),
});
const user = await created.json();
check("create test user", created.ok, created.ok ? "" : JSON.stringify(user));
try {
  const tokenRes = await fetch(`${SB}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: ANON, "content-type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const session = await tokenRes.json();
  check("password sign-in (test only)", tokenRes.ok, tokenRes.ok ? "" : JSON.stringify(session));

  // @supabase/ssr cookie format: "base64-" + base64url(JSON), chunked at 3180 chars.
  const value = "base64-" + Buffer.from(JSON.stringify(session)).toString("base64url");
  const name = `sb-${ref}-auth-token`;
  const chunks = value.match(/.{1,3180}/g);
  const cookie = chunks.length === 1 ? `${name}=${value}` : chunks.map((c, i) => `${name}.${i}=${c}`).join("; ");

  const rest = (path, init = {}) =>
    fetch(`${SB}/rest/v1${path}`, { ...init, headers: { apikey: ANON, authorization: `Bearer ${session.access_token}`, "content-type": "application/json", prefer: "return=representation", ...init.headers } });

  const before = await (await rest(`/profiles?id=eq.${user.id}&select=full_name,onboarded,role,origin_country`)).json();
  check("trigger created profile", before[0]?.full_name === "Laura Prueba Gómez" && before[0]?.onboarded === false, JSON.stringify(before));

  // Not onboarded yet
  await expectRedirect("/", "/onboarding", cookie);
  await expectRedirect("/inicio", "/onboarding", cookie);
  await expectRedirect("/admin", "/onboarding", cookie);
  await expectOk("/onboarding", cookie, "De dónde vienes");

  // Same update the onboarding Server Action runs, with the user's own token (RLS).
  const upd = await rest(`/profiles?id=eq.${user.id}`, {
    method: "PATCH",
    body: JSON.stringify({ origin_country: "CO", destination_country: "PE", destination_city: "Piura", onboarded: true }),
  });
  check("user can mark itself onboarded (RLS)", upd.ok && (await upd.json()).length === 1);

  // Role escalation must fail
  const esc = await rest(`/profiles?id=eq.${user.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
  check("user cannot make itself admin", !esc.ok, `${esc.status}`);

  // Onboarded
  await expectRedirect("/", "/inicio", cookie);
  await expectRedirect("/onboarding", "/inicio", cookie);
  await expectRedirect("/admin", "/inicio", cookie);
  await expectOk("/inicio", cookie, "Laura");
  await expectOk("/inicio", cookie, "Colombia → Piura");
  await expectOk("/inicio", cookie, "Próximamente");
  await expectOk("/perfil", cookie, "Laura Prueba Gómez");
  await expectOk("/identificar", cookie, "Próximamente");
  await expectOk("/chat", cookie, "Chat");

  // Profile edit (same update the /perfil Server Action runs)
  const edit = await rest(`/profiles?id=eq.${user.id}`, { method: "PATCH", body: JSON.stringify({ full_name: "Laura Editada", origin_country: "EC" }) });
  check("user can edit name and country (RLS)", edit.ok);
  await expectOk("/inicio", cookie, "Ecuador → Piura");

  // Admin
  await admin(`/rest/v1/profiles?id=eq.${user.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
  await expectOk("/admin", cookie, "Administración");
} finally {
  const del = await admin(`/auth/v1/admin/users/${user.id}`, { method: "DELETE" });
  check("delete test user", del.ok, `${del.status}`);
}

console.log(failures ? `\n${failures} FAILED` : "\nALL PASSED");
process.exit(failures ? 1 : 0);
