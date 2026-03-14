"use client";

import { useState, useEffect } from "react";
import type { Membership } from "@/lib/types";
import { MEMBERSHIP_TYPES, MembershipType } from "@/lib/types";

export default function AdminMemberships() {
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    fetchMemberships();
  }, []);

  async function fetchMemberships() {
    try {
      const res = await fetch("/api/memberships");
      setMemberships(await res.json());
    } catch {
      console.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  const filtered = filter === "all" ? memberships : memberships.filter((m) => m.status === filter);

  const totalRevenue = memberships
    .filter((m) => m.payment_status === "paid")
    .reduce((sum, m) => sum + (m.amount_paid || 0), 0);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title">Manage Memberships</h1>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-swan-green">{memberships.length}</div>
          <div className="text-sm text-gray-500">Total</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-green-600">
            {memberships.filter((m) => m.status === "active").length}
          </div>
          <div className="text-sm text-gray-500">Active</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-yellow-600">
            {memberships.filter((m) => m.payment_status === "pending").length}
          </div>
          <div className="text-sm text-gray-500">Pending Payment</div>
        </div>
        <div className="card text-center">
          <div className="text-2xl font-bold text-swan-green">${totalRevenue.toLocaleString()}</div>
          <div className="text-sm text-gray-500">Revenue</div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {["all", "active", "pending", "expired"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-medium capitalize ${
              filter === f ? "bg-swan-green text-white" : "bg-white border border-gray-300"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No memberships found.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-md overflow-hidden">
            <thead className="bg-swan-green text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Member #</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Name</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Email</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Amount</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Payment</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((m) => (
                <tr key={m.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm">{m.member_number}</td>
                  <td className="px-4 py-3 font-medium">{m.first_name} {m.last_name}</td>
                  <td className="px-4 py-3 text-sm">
                    {MEMBERSHIP_TYPES[m.membership_type as MembershipType]?.name || m.membership_type}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{m.email}</td>
                  <td className="px-4 py-3 text-center">
                    ${MEMBERSHIP_TYPES[m.membership_type as MembershipType]?.price || 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      m.payment_status === "paid" ? "bg-green-100 text-green-800" :
                      m.payment_status === "processing" ? "bg-blue-100 text-blue-800" :
                      "bg-yellow-100 text-yellow-800"
                    }`}>
                      {m.payment_status}
                    </span>
                    {m.payment_provider && (
                      <div className="text-xs text-gray-400 mt-1">{m.payment_provider}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      m.status === "active" ? "bg-green-100 text-green-800" :
                      m.status === "pending" ? "bg-yellow-100 text-yellow-800" :
                      "bg-gray-100 text-gray-800"
                    }`}>
                      {m.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
