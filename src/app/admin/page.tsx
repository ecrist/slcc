"use client";

import Link from "next/link";
import { useState, useEffect } from "react";

interface Stats {
  todayTeeTimes: number;
  activeMembers: number;
  upcomingEvents: number;
  pendingPayments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [ttRes, memRes, evtRes] = await Promise.all([
          fetch(`/api/tee-times?date=${new Date().toISOString().split("T")[0]}`),
          fetch("/api/memberships"),
          fetch("/api/events"),
        ]);
        const teeTimes = await ttRes.json();
        const memberships = await memRes.json();
        const events = await evtRes.json();

        setStats({
          todayTeeTimes: Array.isArray(teeTimes) ? teeTimes.length : 0,
          activeMembers: Array.isArray(memberships)
            ? memberships.filter((m: { status: string }) => m.status === "active").length
            : 0,
          upcomingEvents: Array.isArray(events) ? events.length : 0,
          pendingPayments: Array.isArray(memberships)
            ? memberships.filter((m: { payment_status: string }) => m.payment_status === "pending").length
            : 0,
        });
      } catch {
        console.error("Failed to load stats");
      }
    }
    fetchStats();
  }, []);

  const cards = [
    {
      title: "Tee Times",
      href: "/admin/tee-times",
      stat: stats?.todayTeeTimes,
      statLabel: "booked today",
      description: "View and manage tee time reservations",
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      title: "Memberships",
      href: "/admin/memberships",
      stat: stats?.activeMembers,
      statLabel: "active members",
      description: "Manage memberships and payment status",
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
        </svg>
      ),
    },
    {
      title: "Events",
      href: "/admin/events",
      stat: stats?.upcomingEvents,
      statLabel: "upcoming events",
      description: "Create and manage events and registrations",
      icon: (
        <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="section-title">Admin Dashboard</h1>
          <p className="text-gray-600">Swan Lake Country Club Management</p>
        </div>
        {stats?.pendingPayments ? (
          <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-2 rounded-lg text-sm">
            {stats.pendingPayments} pending payment{stats.pendingPayments !== 1 ? "s" : ""}
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="card hover:shadow-xl transition-shadow group">
            <div className="flex items-start justify-between mb-4">
              <div className="text-swan-green">{card.icon}</div>
              {card.stat !== undefined && (
                <div className="text-right">
                  <div className="text-2xl font-bold text-swan-green">{card.stat}</div>
                  <div className="text-xs text-gray-500">{card.statLabel}</div>
                </div>
              )}
            </div>
            <h2 className="text-xl font-bold text-swan-dark group-hover:text-swan-green transition-colors">
              {card.title}
            </h2>
            <p className="text-gray-600 text-sm mt-1">{card.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
