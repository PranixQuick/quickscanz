// Shared allow-list for reviewer/demo accounts. Lives outside any "use server"
// module because those files may only export async functions.
//
// Google Play reviewers can't receive an SMS OTP, so they need a login path
// (see demoSignIn in lib/actions/auth.ts) and a way past the mandatory phone
// -binding gate (see app/dashboard/page.tsx) that doesn't depend on Phone OTP
// or Google. Real users are never on this list.
export const DEMO_LOGIN_ALLOWLIST = (
  process.env.DEMO_LOGIN_ALLOWLIST ?? "test1@quickscanz.com,test2@quickscanz.com"
)
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);
