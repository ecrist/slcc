"use client";

import { useState, useEffect } from "react";
import type { GolfEvent } from "@/lib/types";

export default function AdminEvents() {
  const [events, setEvents] = useState<GolfEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    event_date: "",
    start_time: "",
    end_time: "",
    event_type: "general",
    max_participants: "",
    cost: "",
  });
  const [submitResult, setSubmitResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch("/api/events");
      setEvents(await res.json());
    } catch {
      console.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitResult(null);

    try {
      const res = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          max_participants: form.max_participants ? parseInt(form.max_participants) : null,
          cost: form.cost ? parseFloat(form.cost) : null,
        }),
      });

      if (res.ok) {
        setSubmitResult({ type: "success", message: "Event created!" });
        setForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", event_type: "general", max_participants: "", cost: "" });
        setShowForm(false);
        fetchEvents();
      } else {
        const err = await res.json();
        setSubmitResult({ type: "error", message: err.error || "Failed to create event" });
      }
    } catch {
      setSubmitResult({ type: "error", message: "Network error" });
    }
  }

  function formatDate(dateStr: string) {
    return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-center justify-between mb-8">
        <h1 className="section-title">Manage Events</h1>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? "Cancel" : "+ New Event"}
        </button>
      </div>

      {submitResult && (
        <div className={`mb-6 p-4 rounded-lg ${submitResult.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {submitResult.message}
        </div>
      )}

      {/* New Event Form */}
      {showForm && (
        <div className="card mb-8">
          <h2 className="text-xl font-bold mb-4">Create New Event</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
              <input type="text" required className="input-field" value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea className="input-field" rows={3} value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                <input type="date" required className="input-field" value={form.event_date}
                  onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                <input type="time" className="input-field" value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                <input type="time" className="input-field" value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select className="input-field" value={form.event_type}
                  onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                  <option value="general">General</option>
                  <option value="tournament">Tournament</option>
                  <option value="league">League</option>
                  <option value="clinic">Clinic</option>
                  <option value="social">Social</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                <input type="number" className="input-field" value={form.max_participants}
                  onChange={(e) => setForm({ ...form, max_participants: e.target.value })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
                <input type="number" step="0.01" className="input-field" value={form.cost}
                  onChange={(e) => setForm({ ...form, cost: e.target.value })} />
              </div>
            </div>
            <button type="submit" className="btn-primary">Create Event</button>
          </form>
        </div>
      )}

      {/* Events List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No upcoming events.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-md overflow-hidden">
            <thead className="bg-swan-green text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Event</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Registered</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{formatDate(evt.event_date)}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium">{evt.title}</div>
                    {evt.description && (
                      <div className="text-sm text-gray-500 truncate max-w-md">{evt.description}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 capitalize">
                      {evt.event_type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {evt.current_participants}
                    {evt.max_participants && <span className="text-gray-400">/{evt.max_participants}</span>}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {evt.cost ? `$${evt.cost}` : "Free"}
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
