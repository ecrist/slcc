"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname } from "next/navigation";

export default function AdminBar() {
  const { data: session } = useSession();
  const pathname = usePathname();

  if (!session?.user?.isAdmin) return null;

  const links = [
    { href: "/admin", label: "Dashboard" },
    { href: "/admin/tee-sheet", label: "Tee Sheet" },
    { href: "/admin/memberships", label: "Memberships" },
    { href: "/admin/billing", label: "Billing" },
    { href: "/admin/tournaments", label: "Tournaments" },
    { href: "/admin/events", label: "Events" },
    { href: "/admin/equipment", label: "Equipment" },
    { href: "/admin/players", label: "Players" },
    { href: "/admin/reports", label: "Reports" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="bg-swan-dark text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6 h-12 text-sm overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`whitespace-nowrap ${
                pathname === link.href
                  ? "text-swan-gold font-medium"
                  : "text-gray-300 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <div className="flex-1" />
          <Link
            href="/desk"
            className={`whitespace-nowrap font-medium ${
              pathname === "/desk"
                ? "text-swan-gold"
                : "text-swan-gold hover:text-swan-gold-light"
            }`}
          >
            Desk Mode
          </Link>
        </div>
      </div>
    </div>
  );
}
