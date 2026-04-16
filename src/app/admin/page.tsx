"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { SkeletonDashboard } from "@/components/Skeleton";

interface DashboardData {
  todayBookings: number;
  todayCheckins: number;
  activeMembers: number;
  pendingPayments: number;
  upcomingEvents: number;
  openChargesTotal: number;
  membershipRevenue: number;
  recentBookings: { id: number; player_name: string; date: string; time: string; players: number; status: string }[];
  recentCharges: { id: number; member_name: string; charge_type: string; amount: number; status: string; created_at: string }[];
}

function fmt12h(time: string): string {
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default function AdminDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => r.json())
      .then(setData)
      .catch(() => {});
  }, []);

  if (!data) return <SkeletonDashboard />;

  const statCards = [
    {
      label: "Today's Bookings",
      value: data.todayBookings,
      sub: `${data.todayCheckins} checked in`,
      href: "/admin/tee-sheet",
      color: "bg-swan-green",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Active Members",
      value: data.activeMembers,
      sub: `${data.pendingPayments} pending`,
      href: "/admin/memberships",
      color: "bg-emerald-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      label: "Open Charges",
      value: `$${data.openChargesTotal.toLocaleString("en-US", { minimumFractionDigits: 2 })}`,
      sub: "outstanding balance",
      href: "/admin/billing",
      color: "bg-amber-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: "Upcoming Events",
      value: data.upcomingEvents,
      sub: "next 30 days",
      href: "/admin/events",
      color: "bg-purple-600",
      icon: (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
  ];

  const chargeTypeLabels: Record<string, string> = {
    bar_tab: "Bar Tab",
    cart_storage: "Cart Storage",
    cart_drop: "Cart Drop",
    invoice: "Invoice",
    other: "Other",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8 animate-fade-in-up">
        <div>
          <h1 className="section-title">Admin Dashboard</h1>
          <p className="text-gray-600">Swan Lake Country Club Management</p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/tee-sheet" className="btn-primary py-2 px-4 text-sm">
            Today&apos;s Tee Sheet
          </Link>
          <Link href="/desk" className="btn-outline py-2 px-4 text-sm">
            Desk Mode
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((card, i) => (
          <Link
            key={card.label}
            href={card.href}
            className={`card hover:shadow-xl transition-all group animate-fade-in-up stagger-${i + 1}`}
          >
            <div className="flex items-start justify-between">
              <div className={`w-10 h-10 rounded-lg ${card.color} text-white flex items-center justify-center`}>
                {card.icon}
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{card.value}</div>
                <div className="text-xs text-gray-500">{card.sub}</div>
              </div>
            </div>
            <p className="text-sm font-semibold text-gray-700 mt-3 group-hover:text-swan-green transition-colors">
              {card.label}
            </p>
          </Link>
        ))}
      </div>

      {/* Membership Revenue Banner */}
      {data.membershipRevenue > 0 && (
        <div className="card bg-gradient-to-r from-swan-green to-swan-green-light text-white mb-8 animate-fade-in-up stagger-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80">Season Membership Revenue</p>
              <p className="text-3xl font-bold">${data.membershipRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}</p>
            </div>
            <Link href="/admin/reports" className="text-white/80 hover:text-white text-sm underline">
              View Reports
            </Link>
          </div>
        </div>
      )}

      {/* Two-column activity feeds */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Bookings */}
        <div className="card animate-fade-in-up stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-swan-green">Recent Bookings</h2>
            <Link href="/admin/tee-sheet" className="text-sm text-swan-green hover:underline">View all</Link>
          </div>
          {data.recentBookings.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No bookings yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentBookings.map((b) => (
                <div key={b.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{b.player_name}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(b.date + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      {" at "}{fmt12h(b.time)} &middot; {b.players} player{b.players !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    b.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                  }`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Charges */}
        <div className="card animate-fade-in-up stagger-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-swan-green">Recent Charges</h2>
            <Link href="/admin/billing" className="text-sm text-swan-green hover:underline">View all</Link>
          </div>
          {data.recentCharges.length === 0 ? (
            <p className="text-gray-400 text-sm py-4 text-center">No charges yet</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {data.recentCharges.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-sm text-gray-900">{c.member_name}</p>
                    <p className="text-xs text-gray-500">
                      {chargeTypeLabels[c.charge_type] || c.charge_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-sm">${c.amount.toFixed(2)}</p>
                    <span className={`text-xs font-medium ${
                      c.status === "open" ? "text-amber-600" : c.status === "paid" ? "text-green-600" : "text-gray-400"
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-8 animate-fade-in-up stagger-6">
        {[
          { label: "Tee Sheet", href: "/admin/tee-sheet" },
          { label: "Memberships", href: "/admin/memberships" },
          { label: "Billing", href: "/admin/billing" },
          { label: "Tournaments", href: "/admin/tournaments" },
          { label: "Events", href: "/admin/events" },
          { label: "Equipment", href: "/admin/equipment" },
          { label: "Reports", href: "/admin/reports" },
          { label: "Settings", href: "/admin/settings" },
        ].map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-center py-3 px-2 rounded-lg bg-white border border-gray-200 text-sm font-medium text-gray-700 hover:border-swan-green hover:text-swan-green transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
