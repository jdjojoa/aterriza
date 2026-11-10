// End-to-end check of community tips against the real Supabase project (RLS + RPC + triggers).
// Requires supabase/migrations/0009_simplify_verification.sql.
// Creates 5 temporary confirmed users (author, 3 other students, admin) with the
// service role key: the author publishes a tip (live at once), the others see
// it, 3 reports hide it, the admin publishes it again like moderateTip() does,
// the author edits it (stays published) and deletes it.
// Everything is deleted at the end (users cascade to profiles, tips and reports).
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
const tipFromRpc = async (user, id) => {
  const rows = await (await approvedTips(user)).json();
  return Array.isArray(rows) ? (rows.find((r) => r.id === id) ?? null) : null;
};
const storedTip = async (id) => (await (await admin(`/rest/v1/tips?id=eq.${id}&select=status,report_count`)).json())[0];
// Same insert as ReportDialog (no RETURNING: reports are admin-only reads).
const report = (user, tipId, reason) =>
  user.rest("/reports", { method: "POST", headers: { prefer: "return=minimal" }, body: JSON.stringify({ tip_id: tipId, reason }) });

try {
  const author = await createUser("Autora Prueba");
  const readers = [await createUser("Lector Uno"), await createUser("Lectora Dos"), await createUser("Lector Tres")];
  const moderator = await createUser("Admin Prueba");
  // service_role may change roles (prevent_role_change trigger allows it).
  const promote = await admin(`/rest/v1/profiles?id=eq.${moderator.id}`, { method: "PATCH", body: JSON.stringify({ role: "admin" }) });
  check("create 5 temporary users, one admin", promote.ok, `${promote.status}`);

  // Even a crafted insert asking for 'pending' or a report count ends up approved / 0.
  const ins = await author.rest("/tips", {
    method: "POST",
    body: JSON.stringify({ user_id: author.id, category: "llegada", body: `Aporte de prueba ${randomUUID()}`, status: "pending", report_count: 7 }),
  });
  const [tip] = await ins.json();
  check(
    "author publishes tip (approved at once)",
    ins.ok && tip?.status === "approved" && tip?.report_count === 0,
    `${ins.status} ${JSON.stringify(tip)} (0009_simplify_verification.sql applied?)`,
  );

  const seen = await tipFromRpc(readers[0], tip.id);
  check(
    "other users see it via get_approved_tips",
    seen?.author_name === "Autora" && seen?.is_own === false && seen?.reported_by_me === false,
    JSON.stringify(seen),
  );
  const own = await tipFromRpc(author, tip.id);
  check("author sees it marked as own", own?.is_own === true, JSON.stringify(own));

  const anon = await fetch(`${SB}/rest/v1/rpc/get_approved_tips`, {
    method: "POST",
    headers: { apikey: ANON, authorization: `Bearer ${ANON}`, "content-type": "application/json" },
    body: JSON.stringify({ p_limit: 1 }),
  });
  check("get_approved_tips denied to anonymous visitors", !anon.ok, `${anon.status}`);

  // --- Reports: 3 hide the tip ---
  const selfReport = await report(author, tip.id, "spam");
  check("author cannot report own tip", !selfReport.ok, `${selfReport.status}`);

  const r1 = await report(readers[0], tip.id, "falso");
  check("reader 1 reports the tip", r1.ok, `${r1.status} ${await r1.text()}`);
  const dup = await report(readers[0], tip.id, "spam");
  check("same reader cannot report twice (unique)", !dup.ok, `${dup.status}`);
  const flagged = await tipFromRpc(readers[0], tip.id);
  check("reported_by_me true for reader 1", flagged?.reported_by_me === true, JSON.stringify(flagged));

  await report(readers[1], tip.id, "ofensivo");
  let stored = await storedTip(tip.id);
  check("2 reports: still published", stored?.status === "approved" && stored?.report_count === 2, JSON.stringify(stored));

  await report(readers[2], tip.id, "otro: prueba");
  stored = await storedTip(tip.id);
  check("3 reports: tip hidden (pending)", stored?.status === "pending" && stored?.report_count === 3, JSON.stringify(stored));
  check("hidden tip gone from get_approved_tips", (await tipFromRpc(readers[1], tip.id)) === null);

  const openReports = await (await moderator.rest(`/reports?tip_id=eq.${tip.id}&status=eq.open&select=id`)).json();
  check("admin sees the 3 open reports", Array.isArray(openReports) && openReports.length === 3, JSON.stringify(openReports));

  const notAdmin = await (await readers[0].rest(`/tips?id=eq.${tip.id}`, { method: "PATCH", body: JSON.stringify({ status: "approved" }) })).json();
  check("non-admin cannot re-publish", Array.isArray(notAdmin) && notAdmin.length === 0, JSON.stringify(notAdmin));

  // Same updates as moderateTip(tipId, "approved") in src/app/admin/actions.ts.
  const approve = await moderator.rest(`/tips?id=eq.${tip.id}&select=id,status,report_count`, {
    method: "PATCH",
    body: JSON.stringify({ status: "approved", report_count: 0, reviewed_by: moderator.id }),
  });
  const approved = await approve.json();
  check(
    "admin publishes it again, counter reset",
    approve.ok && approved[0]?.status === "approved" && approved[0]?.report_count === 0,
    `${approve.status} ${JSON.stringify(approved)}`,
  );
  const close = await moderator.rest(`/reports?tip_id=eq.${tip.id}&status=eq.open&select=id`, {
    method: "PATCH",
    body: JSON.stringify({ status: "dismissed", resolved_by: moderator.id, resolved_at: new Date().toISOString() }),
  });
  const closed = await close.json();
  check("admin closes the reports", close.ok && closed.length === 3, `${close.status} ${JSON.stringify(closed)}`);
  check("tip visible again", (await tipFromRpc(readers[1], tip.id)) !== null);

  // --- Author edit/delete ---
  const editedBody = `Aporte editado ${randomUUID()}`;
  const otherEdit = await (await readers[0].rest(`/tips?id=eq.${tip.id}`, { method: "PATCH", body: JSON.stringify({ body: "hack" }) })).json();
  check("other user cannot edit the tip", Array.isArray(otherEdit) && otherEdit.length === 0, JSON.stringify(otherEdit));

  // Same update as updateTip() in src/app/(app)/aportes/actions.ts.
  const edit = await author.rest(`/tips?id=eq.${tip.id}&select=id,body,status`, {
    method: "PATCH",
    body: JSON.stringify({ category: "transporte", body: editedBody }),
  });
  const edited = await edit.json();
  check(
    "author edits tip, stays published",
    edit.ok && edited[0]?.body === editedBody && edited[0]?.status === "approved",
    `${edit.status} ${JSON.stringify(edited)}`,
  );

  const sneaky = await author.rest(`/tips?id=eq.${tip.id}&select=status,report_count`, {
    method: "PATCH",
    body: JSON.stringify({ status: "rejected", report_count: 9 }),
  });
  const sneakyRows = await sneaky.json();
  check(
    "author cannot change status or report count",
    !sneaky.ok || (sneakyRows[0]?.status === "approved" && sneakyRows[0]?.report_count === 0),
    `${sneaky.status} ${JSON.stringify(sneakyRows)}`,
  );

  const otherDel = await (await readers[0].rest(`/tips?id=eq.${tip.id}`, { method: "DELETE" })).json();
  check("other user cannot delete the tip", Array.isArray(otherDel) && otherDel.length === 0, JSON.stringify(otherDel));

  // Same delete as deleteTip().
  const del = await author.rest(`/tips?id=eq.${tip.id}&select=id`, { method: "DELETE" });
  const deleted = await del.json();
  check("author deletes own tip", del.ok && deleted.length === 1, `${del.status} ${JSON.stringify(deleted)}`);
  const gone = await (await admin(`/rest/v1/tips?id=eq.${tip.id}&select=id`)).json();
  check("tip removed from the database", Array.isArray(gone) && gone.length === 0, JSON.stringify(gone));
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
