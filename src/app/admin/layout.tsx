import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/admin");
  }

  if (!(await isAdminEmail(session.user.email))) {
    redirect("/?error=unauthorized");
  }

  return <>{children}</>;
}
