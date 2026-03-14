"use client";

import { useState, useEffect } from "react";

interface EquipmentItem {
  id: number;
  type: "cart" | "buggy" | "clubs";
  identifier: string;
  status: "available" | "out_of_service" | "maintenance";
  service_notes: string | null;
  updated_at: string;
}

const TYPE_LABELS: Record<string, string> = {
  cart: "Golf Carts",
  buggy: "Walking Buggies",
  clubs: "Club Rentals",
};

const STATUS_CONFIG = {
  available: { label: "Available", className: "bg-green-100 text-green-800" },
  out_of_service: { label: "Out of Service", className: "bg-red-100 text-red-800" },
  maintenance: { label: "Needs Service", className: "bg-amber-100 text-amber-800" },
};

export default function EquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ status: string; service_notes: string }>({ status: "", service_notes: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [addForm, setAddForm] = useState({ type: "cart", identifier: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => { fetchItems(); }, []);

  async function fetchItems() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/equipment");
      if (res.ok) setItems(await res.json());
    } finally {
      setLoading(false);
    }
  }

  function flash(type: "success" | "error", text: string) {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  }

  function startEdit(item: EquipmentItem) {
    setEditingId(item.id);
    setEditDraft({ status: item.status, service_notes: item.service_notes ?? "" });
  }

  function cancelEdit() {
    setEditingId(null);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    const res = await fetch(`/api/admin/equipment?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: editDraft.status,
        service_notes: editDraft.service_notes || null,
      }),
    });
    setSaving(false);
    if (res.ok) {
      setEditingId(null);
      fetchItems();
      flash("success", "Equipment updated.");
    } else {
      flash("error", "Failed to update.");
    }
  }

  async function quickStatus(id: number, status: string) {
    const res = await fetch(`/api/admin/equipment?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      fetchItems();
      flash("success", `Marked as ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label ?? status}.`);
    } else {
      flash("error", "Failed to update status.");
    }
  }

  async function handleDelete(id: number, identifier: string) {
    if (!confirm(`Remove "${identifier}" from inventory?`)) return;
    const res = await fetch(`/api/admin/equipment?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchItems();
      flash("success", `${identifier} removed.`);
    } else {
      flash("error", "Failed to remove.");
    }
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.identifier.trim()) return;
    setAdding(true);
    const res = await fetch("/api/admin/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(addForm),
    });
    setAdding(false);
    if (res.ok) {
      setAddForm({ type: "cart", identifier: "" });
      fetchItems();
      flash("success", `${addForm.identifier} added.`);
    } else {
      const err = await res.json();
      flash("error", err.error || "Failed to add.");
    }
  }

  const types = ["cart", "buggy", "clubs"] as const;
  const grouped = types.map((type) => ({
    type,
    items: items.filter((i) => i.type === type),
  }));

  // Summary stats
  const stats = types.map((type) => {
    const group = items.filter((i) => i.type === type);
    return {
      type,
      total: group.length,
      available: group.filter((i) => i.status === "available").length,
      needsAttention: group.filter((i) => i.status !== "available").length,
    };
  });

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-10">
      <div>
        <h1 className="section-title">Equipment</h1>
        <p className="text-gray-600">Track inventory, availability, and service status for all rental equipment.</p>
      </div>

      {message && (
        <div className={`p-4 rounded-lg text-sm ${message.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {message.text}
        </div>
      )}

      {/* Summary */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {stats.map(({ type, total, available, needsAttention }) => (
            <div key={type} className="card text-center py-4">
              <p className="text-2xl font-bold text-swan-green">{available}<span className="text-gray-400 text-lg font-normal">/{total}</span></p>
              <p className="text-sm font-medium text-gray-700 mt-1">{TYPE_LABELS[type]}</p>
              {needsAttention > 0 && (
                <p className="text-xs text-amber-700 mt-1">{needsAttention} need attention</p>
              )}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          {/* Equipment sections */}
          {grouped.map(({ type, items: group }) => (
            <section key={type} className="card">
              <h2 className="text-xl font-bold text-swan-green mb-4">{TYPE_LABELS[type]}</h2>

              {group.length === 0 ? (
                <p className="text-gray-400 text-sm">No {TYPE_LABELS[type].toLowerCase()} in inventory.</p>
              ) : (
                <table className="w-full text-sm mb-2">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-gray-500">
                      <th className="pb-2 font-medium">Identifier</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Service Notes</th>
                      <th className="pb-2 font-medium">Last Updated</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 align-top">
                        <td className="py-3 font-medium">{item.identifier}</td>
                        <td className="py-3">
                          {editingId === item.id ? (
                            <select
                              className="input-field py-1 text-xs"
                              value={editDraft.status}
                              onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value })}
                            >
                              <option value="available">Available</option>
                              <option value="out_of_service">Out of Service</option>
                              <option value="maintenance">Needs Service</option>
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_CONFIG[item.status]?.className}`}>
                              {STATUS_CONFIG[item.status]?.label}
                            </span>
                          )}
                        </td>
                        <td className="py-3 max-w-xs">
                          {editingId === item.id ? (
                            <textarea
                              className="input-field text-xs py-1"
                              rows={2}
                              placeholder="Describe the issue or work needed…"
                              value={editDraft.service_notes}
                              onChange={(e) => setEditDraft({ ...editDraft, service_notes: e.target.value })}
                            />
                          ) : (
                            <span className="text-gray-500 text-xs">{item.service_notes || "—"}</span>
                          )}
                        </td>
                        <td className="py-3 text-xs text-gray-400 whitespace-nowrap">
                          {new Date(item.updated_at).toLocaleDateString()}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          {editingId === item.id ? (
                            <span className="flex gap-2 justify-end">
                              <button
                                onClick={() => saveEdit(item.id)}
                                disabled={saving}
                                className="text-swan-green hover:text-green-700 text-xs font-medium"
                              >
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600 text-xs">
                                Cancel
                              </button>
                            </span>
                          ) : (
                            <span className="flex gap-3 justify-end">
                              {item.status === "available" ? (
                                <button
                                  onClick={() => quickStatus(item.id, "out_of_service")}
                                  className="text-amber-600 hover:text-amber-800 text-xs font-medium"
                                >
                                  Mark Out of Service
                                </button>
                              ) : (
                                <button
                                  onClick={() => quickStatus(item.id, "available")}
                                  className="text-green-600 hover:text-green-800 text-xs font-medium"
                                >
                                  Mark Available
                                </button>
                              )}
                              <button
                                onClick={() => startEdit(item)}
                                className="text-gray-500 hover:text-gray-700 text-xs font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(item.id, item.identifier)}
                                className="text-red-500 hover:text-red-700 text-xs font-medium"
                              >
                                Remove
                              </button>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))}

          {/* Add equipment */}
          <section className="card">
            <h2 className="text-xl font-bold text-swan-green mb-4">Add Equipment</h2>
            <form onSubmit={handleAdd} className="flex flex-wrap gap-3 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  className="input-field w-40"
                  value={addForm.type}
                  onChange={(e) => setAddForm({ ...addForm, type: e.target.value })}
                >
                  <option value="cart">Golf Cart</option>
                  <option value="buggy">Walking Buggy</option>
                  <option value="clubs">Club Set</option>
                </select>
              </div>
              <div className="flex-1 min-w-48">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Identifier <span className="text-gray-400 font-normal">(e.g. Cart #5, Buggy B, Men&apos;s Set 2)</span>
                </label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Cart #5"
                  value={addForm.identifier}
                  onChange={(e) => setAddForm({ ...addForm, identifier: e.target.value })}
                />
              </div>
              <button type="submit" disabled={adding} className="btn-primary whitespace-nowrap">
                {adding ? "Adding…" : "Add to Inventory"}
              </button>
            </form>
          </section>
        </>
      )}
    </div>
  );
}
