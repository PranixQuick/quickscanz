import AppHeader from "@/components/layout/AppHeader";
import BottomNav from "@/components/layout/BottomNav";
import SupportLauncher from "@/components/support/SupportLauncher";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({ children, embed = false }: { children: React.ReactNode; embed?: boolean }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userName = user?.email?.split("@")[0] || "User";

  if (embed) {
    return (
      <div className="min-h-screen bg-gradient-warm">
        <main className="max-w-2xl mx-auto px-4 pt-6 pb-6">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-warm">
      <AppHeader userName={userName} />
      <main className="max-w-2xl mx-auto px-4 pt-6 pb-28">
        {children}
      </main>
      <BottomNav />
      <SupportLauncher />
    </div>
  );
}
