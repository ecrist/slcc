import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { isAdminEmail } from "@/lib/admin";
import Link from "next/link";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user?.email) {
    redirect("/login?callbackUrl=/admin");
  }

  if (!(await isAdminEmail(session.user.email))) {
    redirect("/?error=unauthorized");
  }

  return (
    <div>
      <div className="bg-swan-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 h-12 text-sm overflow-x-auto">
            <Link href="/admin" className="text-swan-gold font-medium hover:text-swan-gold-light whitespace-nowrap">
              Dashboard
            </Link>
            <Link href="/admin/tee-sheet" className="text-gray-300 hover:text-white whitespace-nowrap">
              Tee Sheet
            </Link>
            <Link href="/admin/tee-times" className="text-gray-300 hover:text-white whitespace-nowrap">
              Bookings
            </Link>
            <Link href="/admin/memberships" className="text-gray-300 hover:text-white whitespace-nowrap">
              Memberships
            </Link>
            <Link href="/admin/billing" className="text-gray-300 hover:text-white whitespace-nowrap">
              Billing
            </Link>
            <Link href="/admin/tournaments" className="text-gray-300 hover:text-white whitespace-nowrap">
              Tournaments
            </Link>
            <Link href="/admin/events" className="text-gray-300 hover:text-white whitespace-nowrap">
              Events
            </Link>
            <Link href="/admin/equipment" className="text-gray-300 hover:text-white whitespace-nowrap">
              Equipment
            </Link>
            <Link href="/admin/settings" className="text-gray-300 hover:text-white whitespace-nowrap">
              Settings
            </Link>
            <div className="flex-1" />
            <Link href="/desk" className="text-swan-gold hover:text-swan-gold-light whitespace-nowrap font-medium">
              Desk Mode
            </Link>
            <Link href="/" className="text-gray-400 hover:text-white whitespace-nowrap">
              View Site
            </Link>
          </div>
        </div>
      </div>
      {children}
    </div>
  );
}
