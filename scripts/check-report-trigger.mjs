// End-to-end check of review reports against the real Supabase project (RLS + trigger).
// Creates 4 temporary confirmed users (1 author + 3 reporters) with the service role key,
// reports the author's review 3 times and checks it is hidden on the third report.
// Everything is deleted at the end (users cascade to profiles, reviews and reports).
// Usage: npm run check:reports
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

// Reports are admin-only reads, so INSERT ... RETURNING would fail RLS: ask for no body.
const minimal = { prefer: "return=minimal" };

const reviewState = async (id) => (await (await admin(`/rest/v1/reviews?id=eq.${id}&select=status,report_count`)).json())[0];

const users = [];
try {
  const author = await createUser("Autora Prueba");
  const reporters = [
    await createUser("Reportero Uno"),
    await createUser("Reportera Dos"),
    await createUser("Reportero Tres"),
  ];
  check("create 4 temporary users", true);

  // Polymorphic target without FK: a random id keeps the test away from real content.
  const targetId = randomUUID();
  const ins = await author.rest("/reviews", {
    method: "POST",
    body: JSON.stringify({ target_type: "place", target_id: targetId, rating: 2, body: "Reseña de prueba", status: "hidden", report_count: 99 }),
  });
  const [review] = await ins.json();
  check("author creates review (RLS)", ins.ok && !!review?.id, `${ins.status}`);
  check("author cannot preset moderation fields", review?.status === "visible" && review?.report_count === 0, JSON.stringify(review));

  const self = await author.rest("/reports", { method: "POST", headers: minimal, body: JSON.stringify({ review_id: review.id, reason: "spam" }) });
  check("author cannot report own review", !self.ok, `${self.status}`);

  for (const [i, reporter] of reporters.entries()) {
    const res = await reporter.rest("/reports", { method: "POST", headers: minimal, body: JSON.stringify({ review_id: review.id, reason: "ofensivo" }) });
    check(`reporter ${i + 1} reports`, res.status === 201, `${res.status}`);
    const state = await reviewState(review.id);
    const expected = i + 1 >= 3 ? "hidden" : "visible";
    check(`after ${i + 1} report(s): ${expected}`, state?.status === expected && state?.report_count === i + 1, JSON.stringify(state));

    if (i === 0) {
      const dup = await reporter.rest("/reports", { method: "POST", headers: minimal, body: JSON.stringify({ review_id: review.id, reason: "spam" }) });
      const body = await dup.json().catch(() => ({}));
      check("second report by same user rejected (unique)", dup.status === 409 && body.code === "23505", `${dup.status} ${body.code}`);
      check("duplicate did not count", (await reviewState(review.id))?.report_count === 1);
    }
  }

  const otherView = await (await reporters[0].rest(`/reviews?id=eq.${review.id}&select=id`)).json();
  check("hidden review invisible to other users", Array.isArray(otherView) && otherView.length === 0, JSON.stringify(otherView));
  const ownView = await (await author.rest(`/reviews?id=eq.${review.id}&select=status`)).json();
  check("author still sees own hidden review", ownView[0]?.status === "hidden", JSON.stringify(ownView));

  const unhide = await author.rest(`/reviews?id=eq.${review.id}`, { method: "PATCH", body: JSON.stringify({ status: "visible", report_count: 0, body: "Editada" }) });
  const after = await reviewState(review.id);
  check("author edit cannot unhide the review", unhide.ok && after?.status === "hidden" && after?.report_count === 3, JSON.stringify(after));

  const rpc = await reporters[0].rest("/rpc/get_reviews", { method: "POST", body: JSON.stringify({ p_target_type: "place", p_target_id: targetId }) });
  if (rpc.status === 404) {
    console.log("SKIP get_reviews (migration 0006 not applied yet)");
  } else {
    const rows = await rpc.json();
    check("get_reviews hides it from others", rpc.ok && rows.length === 0, JSON.stringify(rows));
    const own = await (await author.rest("/rpc/get_reviews", { method: "POST", body: JSON.stringify({ p_target_type: "place", p_target_id: targetId }) })).json();
    check("get_reviews shows it to the author", own[0]?.is_own === true && own[0]?.status === "hidden" && own[0]?.author_name === "Autora", JSON.stringify(own));
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
