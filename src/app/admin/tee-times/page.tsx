"use client";

import { useState, useEffect } from "react";
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
      const res = await fetch(`/api/tee-times?date=${selectedDate}`);
      setTeeTimes(await res.json());
    } catch {
      console.error("Failed to fetch");
    } finally {
      setLoading(false);
    }
  }

  async function cancelTeeTime(id: number) {
    if (!confirm("Cancel this tee time?")) return;
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
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : teeTimes.length === 0 ? (
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
                <th className="px-4 py-3 text-center text-sm font-medium">Cart</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Status</th>
                <th className="px-4 py-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {teeTimes.map((tt) => (
                <tr key={tt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{formatTime(tt.time)}</td>
                  <td className="px-4 py-3">{tt.player_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    <div>{tt.player_email}</div>
                    {tt.player_phone && <div>{tt.player_phone}</div>}
                  </td>
                  <td className="px-4 py-3 text-center">{tt.players}</td>
                  <td className="px-4 py-3 text-center">{tt.holes}</td>
                  <td className="px-4 py-3 text-center">{tt.cart ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      tt.status === "confirmed" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                    }`}>
                      {tt.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {tt.status === "confirmed" && (
                      <button
                        onClick={() => cancelTeeTime(tt.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Cancel
                      </button>
                    )}
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
