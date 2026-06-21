import { redirect } from "next/navigation";

// Auth is now passwordless (Phone OTP + Google), so there is no password to reset.
// Keep this route as a redirect so any old links/bookmarks land on the login screen.
export default function ForgotPasswordPage() {
  redirect("/login");
}
