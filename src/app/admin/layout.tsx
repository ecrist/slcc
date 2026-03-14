import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <div className="bg-swan-dark text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6 h-12 text-sm overflow-x-auto">
            <Link href="/admin" className="text-swan-gold font-medium hover:text-swan-gold-light whitespace-nowrap">
              Dashboard
            </Link>
            <Link href="/admin/tee-times" className="text-gray-300 hover:text-white whitespace-nowrap">
              Tee Times
            </Link>
            <Link href="/admin/memberships" className="text-gray-300 hover:text-white whitespace-nowrap">
              Memberships
            </Link>
            <Link href="/admin/events" className="text-gray-300 hover:text-white whitespace-nowrap">
              Events
            </Link>
            <div className="flex-1" />
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
