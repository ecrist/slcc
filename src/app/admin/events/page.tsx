"use client";

import { useState, useEffect } from "react";
import type { GolfEvent } from "@/lib/types";
import { SkeletonTable } from "@/components/Skeleton";
import ConfirmDialog from "@/components/ConfirmDialog";

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
    is_public: true,
  });
  const [submitResult, setSubmitResult] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<GolfEvent | null>(null);
  const [editTarget, setEditTarget] = useState<GolfEvent | null>(null);
  const [editForm, setEditForm] = useState({
    title: "", description: "", event_date: "", start_time: "", end_time: "",
    event_type: "general", max_participants: "", cost: "", is_public: true,
  });
  const [editSaving, setEditSaving] = useState(false);

  useEffect(() => { fetchEvents(); }, []);

  async function fetchEvents() {
    try {
      const res = await fetch("/api/admin/events");
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
      const res = await fetch("/api/admin/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          max_participants: form.max_participants ? parseInt(form.max_participants) : null,
          cost: form.cost ? parseFloat(form.cost) : null,
          is_public: form.is_public,
        }),
      });
      if (res.ok) {
        setSubmitResult({ type: "success", message: "Event created!" });
        setForm({ title: "", description: "", event_date: "", start_time: "", end_time: "", event_type: "general", max_participants: "", cost: "", is_public: true });
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

  async function togglePublic(evt: GolfEvent) {
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: evt.id, is_public: evt.is_public ? 0 : 1 }),
    });
    fetchEvents();
  }

  async function toggleCorporate(evt: GolfEvent) {
    await fetch("/api/admin/events", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: evt.id, is_corporate_event: evt.is_corporate_event ? 0 : 1 }),
    });
    fetchEvents();
  }

  function openEdit(evt: GolfEvent) {
    setEditTarget(evt);
    setEditForm({
      title: evt.title,
      description: evt.description || "",
      event_date: evt.event_date,
      start_time: evt.start_time || "",
      end_time: evt.end_time || "",
      event_type: evt.event_type,
      max_participants: evt.max_participants ? String(evt.max_participants) : "",
      cost: evt.cost ? String(evt.cost) : "",
      is_public: !!evt.is_public,
    });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setEditSaving(true);
    try {
      const res = await fetch("/api/admin/events", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editTarget.id,
          title: editForm.title,
          description: editForm.description || null,
          event_date: editForm.event_date,
          start_time: editForm.start_time || null,
          end_time: editForm.end_time || null,
          event_type: editForm.event_type,
          max_participants: editForm.max_participants ? parseInt(editForm.max_participants) : null,
          cost: editForm.cost ? parseFloat(editForm.cost) : null,
          is_public: editForm.is_public ? 1 : 0,
        }),
      });
      if (res.ok) {
        setSubmitResult({ type: "success", message: "Event updated!" });
        setEditTarget(null);
        fetchEvents();
      } else {
        const err = await res.json();
        setSubmitResult({ type: "error", message: err.error || "Failed to update event" });
      }
    } catch {
      setSubmitResult({ type: "error", message: "Network error" });
    } finally {
      setEditSaving(false);
    }
  }

  async function handleDelete(id: number) {
    await fetch(`/api/admin/events?id=${id}`, { method: "DELETE" });
    setDeleteTarget(null);
    fetchEvents();
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
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={!form.is_public}
                onChange={(e) => setForm({ ...form, is_public: !e.target.checked })}
                className="w-4 h-4 text-purple-600 rounded"
              />
              <span className="text-sm font-medium text-gray-700">
                Private event
                <span className="ml-1.5 text-xs font-normal text-gray-400">
                  — hidden from public calendar and blocks online tee time booking during event hours
                </span>
              </span>
            </label>
            <button type="submit" className="btn-primary">Create Event</button>
          </form>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={6} cols={5} />
      ) : events.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No events.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full bg-white rounded-xl shadow-md overflow-hidden">
            <thead className="bg-swan-green text-white">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium">Date</th>
                <th className="px-4 py-3 text-left text-sm font-medium">Event</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Type</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Visibility</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Corporate</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Registered</th>
                <th className="px-4 py-3 text-center text-sm font-medium">Cost</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {events.map((evt) => (
                <tr key={evt.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    {formatDate(evt.event_date)}
                    {(evt.start_time || evt.end_time) && (
                      <div className="text-xs text-gray-400">
                        {evt.start_time ?? ""}
                        {evt.start_time && evt.end_time ? " – " : ""}
                        {evt.end_time ?? ""}
                      </div>
                    )}
                  </td>
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
                    <button
                      onClick={() => togglePublic(evt)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        evt.is_public
                          ? "bg-green-100 text-green-700 hover:bg-green-200"
                          : "bg-purple-100 text-purple-700 hover:bg-purple-200"
                      }`}
                      title="Click to toggle"
                    >
                      {evt.is_public ? "Public" : "Private"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggleCorporate(evt)}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                        evt.is_corporate_event
                          ? "bg-blue-100 text-blue-700 hover:bg-blue-200"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                      title="Click to toggle corporate event"
                    >
                      {evt.is_corporate_event ? "Corporate" : "—"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {evt.current_participants}
                    {evt.max_participants && <span className="text-gray-400">/{evt.max_participants}</span>}
                  </td>
                  <td className="px-4 py-3 text-center text-sm">
                    {evt.cost ? `$${evt.cost}` : "Free"}
                  </td>
                  <td className="px-4 py-3 text-right space-x-3">
                    <button onClick={() => openEdit(evt)} className="text-swan-green hover:text-swan-green-light text-xs font-medium">
                      Edit
                    </button>
                    <button onClick={() => setDeleteTarget(evt)} className="text-red-500 hover:text-red-700 text-xs font-medium">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Event Modal */}
      {editTarget && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40 animate-overlay-in" onClick={() => setEditTarget(null)} />
          <div className="relative bg-white rounded-xl shadow-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto animate-modal-in">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-swan-green">Edit Event</h2>
                <button onClick={() => setEditTarget(null)} className="text-gray-400 hover:text-gray-600">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" required className="input-field" value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea className="input-field" rows={3} value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
                    <input type="date" required className="input-field" value={editForm.event_date}
                      onChange={(e) => setEditForm({ ...editForm, event_date: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Start Time</label>
                    <input type="time" className="input-field" value={editForm.start_time}
                      onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">End Time</label>
                    <input type="time" className="input-field" value={editForm.end_time}
                      onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                    <select className="input-field" value={editForm.event_type}
                      onChange={(e) => setEditForm({ ...editForm, event_type: e.target.value })}>
                      <option value="general">General</option>
                      <option value="tournament">Tournament</option>
                      <option value="league">League</option>
                      <option value="clinic">Clinic</option>
                      <option value="social">Social</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Max Participants</label>
                    <input type="number" className="input-field" value={editForm.max_participants}
                      onChange={(e) => setEditForm({ ...editForm, max_participants: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
                    <input type="number" step="0.01" className="input-field" value={editForm.cost}
                      onChange={(e) => setEditForm({ ...editForm, cost: e.target.value })} />
                  </div>
                </div>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" checked={!editForm.is_public}
                    onChange={(e) => setEditForm({ ...editForm, is_public: !e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded" />
                  <span className="text-sm font-medium text-gray-700">Private event</span>
                </label>
                <div className="flex justify-end gap-3 pt-2">
                  <button type="button" onClick={() => setEditTarget(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                    Cancel
                  </button>
                  <button type="submit" disabled={editSaving} className="btn-primary py-2 px-6 text-sm">
                    {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Event"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This will also remove all registrations. This cannot be undone.`}
        confirmLabel="Delete Event"
        variant="danger"
        onConfirm={() => deleteTarget && handleDelete(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
