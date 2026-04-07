import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { redirect } from "next/navigation";

export default async function DeskLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.email) redirect("/login?callbackUrl=/desk");
  if (!(await isAdminEmail(session.user.email))) redirect("/");

  return (
    // Fixed overlay — covers the root layout header/footer for a full-screen kiosk feel
    <div className="fixed inset-0 z-[100] bg-slate-900 flex flex-col overflow-hidden">
      {children}
    </div>
  );
}
