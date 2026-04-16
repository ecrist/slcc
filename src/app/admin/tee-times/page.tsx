"use client";

import { useState, useEffect } from "react";
import { SkeletonTable } from "@/components/Skeleton";
import type { TeeTime } from "@/lib/types";

export default function AdminTeeTimes() {
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [teeTimes, setTeeTimes] = useState<TeeTime[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeeTimes();
  }, [selectedDate]);

  async function fetchTeeTimes() {
    setLoading(true);
    try {
      // Admin fetches the full tee_times rows directly
      const res = await fetch(`/api/admin/tee-times?date=${selectedDate}`);
      setTeeTimes(await res.json());
    } catch {
      console.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  async function cancelTeeTime(id: number) {
    if (!confirm("Cancel this tee time? The entire group booking will be cancelled.")) return;
    await fetch(`/api/tee-times?id=${id}`, { method: "DELETE" });
    fetchTeeTimes();
  }

  function formatTime(time: string) {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

  // Group slots by group_booking_id for display
  const groups = teeTimes.reduce<Record<string, TeeTime[]>>((acc, tt) => {
    const key = tt.group_booking_id ?? String(tt.id);
    if (!acc[key]) acc[key] = [];
    acc[key].push(tt);
    return acc;
  }, {});

  const groupList = Object.values(groups).sort((a, b) =>
    a[0].time.localeCompare(b[0].time)
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">Manage Tee Times</h1>
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="input-field w-auto"
        />
      </div>

      {loading ? (
        <SkeletonTable rows={6} cols={4} />
      ) : groupList.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No tee times booked for this date.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-md overflow-hidden">
            <thead className="bg-swan-green text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Time</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Player</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Contact</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Players</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Holes</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Equipment</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {groupList.map((group) => {
                const lead = group.find((t) => t.slot_index === 0) ?? group[0];
                const timeRange =
                  group.length > 1
                    ? `${formatTime(group[0].time)} – ${formatTime(group[group.length - 1].time)}`
                    : formatTime(lead.time);
                const equipment = [];
                if (lead.carts_requested > 0) equipment.push(`${lead.carts_requested} cart${lead.carts_requested > 1 ? "s" : ""}`);
                if (lead.buggies_requested > 0) equipment.push(`${lead.buggies_requested} buggy${lead.buggies_requested > 1 ? "s" : ""}`);
                if (lead.clubs_requested > 0) equipment.push(`${lead.clubs_requested} club set${lead.clubs_requested > 1 ? "s" : ""}`);
                if (lead.personal_cart_drop) equipment.push("personal cart drop");
                return (
                  <tr key={lead.group_booking_id ?? lead.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium whitespace-nowrap">{timeRange}</td>
                    <td className="px-4 py-3">{lead.player_name}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      <div>{lead.player_email}</div>
                      {lead.player_phone && <div>{lead.player_phone}</div>}
                    </td>
                    <td className="px-4 py-3 text-center">{lead.players}</td>
                    <td className="px-4 py-3 text-center">{lead.holes}</td>
                    <td className="px-4 py-3 text-center text-sm">
                      {equipment.length > 0 ? equipment.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        lead.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}>
                        {lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {lead.status === "confirmed" && (
                        <button
                          onClick={() => cancelTeeTime(lead.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
