"use client";

import { useState, useEffect } from "react";
import { SkeletonTable } from "@/components/Skeleton";

interface EquipmentItem {
  id: number;
  type: "cart" | "buggy" | "clubs";
  identifier: string;
  status: "available" | "out_of_service" | "maintenance";
  service_notes: string | null;
  make: string | null;
  model: string | null;
  year: number | null;
  serial_number: string | null;
  color: string | null;
  seats: number | null;
  fuel_type: string | null;
  battery_year: number | null;
  hours_reading: number | null;
  last_service_date: string | null;
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

const FUEL_TYPES = [
  { value: "electric", label: "Electric" },
  { value: "gas", label: "Gas" },
  { value: "push", label: "Push/Manual" },
];

type DetailDraft = {
  identifier: string;
  make: string;
  model: string;
  year: string;
  serial_number: string;
  color: string;
  seats: string;
  fuel_type: string;
  battery_year: string;
  hours_reading: string;
  last_service_date: string;
  status: string;
  service_notes: string;
};

function blankDraft(): DetailDraft {
  return {
    identifier: "", make: "", model: "", year: "", serial_number: "",
    color: "", seats: "", fuel_type: "", battery_year: "",
    hours_reading: "", last_service_date: "", status: "available", service_notes: "",
  };
}

function itemToDraft(item: EquipmentItem): DetailDraft {
  return {
    identifier: item.identifier,
    make: item.make ?? "",
    model: item.model ?? "",
    year: item.year?.toString() ?? "",
    serial_number: item.serial_number ?? "",
    color: item.color ?? "",
    seats: item.seats?.toString() ?? "",
    fuel_type: item.fuel_type ?? "",
    battery_year: item.battery_year?.toString() ?? "",
    hours_reading: item.hours_reading?.toString() ?? "",
    last_service_date: item.last_service_date ?? "",
    status: item.status,
    service_notes: item.service_notes ?? "",
  };
}

export default function EquipmentPage() {
  const [items, setItems] = useState<EquipmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Detail modal
  const [detailItem, setDetailItem] = useState<EquipmentItem | null>(null);
  const [detailDraft, setDetailDraft] = useState<DetailDraft>(blankDraft());
  const [savingDetail, setSavingDetail] = useState(false);

  // Quick status edit (inline)
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState<{ status: string; service_notes: string }>({ status: "", service_notes: "" });
  const [saving, setSaving] = useState(false);

  // Add form
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState("cart");
  const [addDraft, setAddDraft] = useState<DetailDraft>(blankDraft());
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

  // ── Inline status edit ──────────────────────────────────────────────────────
  function startEdit(item: EquipmentItem) {
    setEditingId(item.id);
    setEditDraft({ status: item.status, service_notes: item.service_notes ?? "" });
  }

  async function saveEdit(id: number) {
    setSaving(true);
    const res = await fetch(`/api/admin/equipment?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: editDraft.status, service_notes: editDraft.service_notes || null }),
    });
    setSaving(false);
    if (res.ok) { setEditingId(null); fetchItems(); flash("success", "Updated."); }
    else flash("error", "Failed to update.");
  }

  async function quickStatus(id: number, status: string) {
    const res = await fetch(`/api/admin/equipment?id=${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) { fetchItems(); flash("success", `Marked as ${STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label ?? status}.`); }
    else flash("error", "Failed to update status.");
  }

  // ── Detail modal ────────────────────────────────────────────────────────────
  function openDetail(item: EquipmentItem) {
    setDetailItem(item);
    setDetailDraft(itemToDraft(item));
  }

  async function saveDetail() {
    if (!detailItem) return;
    setSavingDetail(true);
    const body = {
      status: detailDraft.status || undefined,
      service_notes: detailDraft.service_notes || null,
      make: detailDraft.make || null,
      model: detailDraft.model || null,
      year: detailDraft.year ? parseInt(detailDraft.year) : null,
      serial_number: detailDraft.serial_number || null,
      color: detailDraft.color || null,
      seats: detailDraft.seats ? parseInt(detailDraft.seats) : null,
      fuel_type: detailDraft.fuel_type || null,
      battery_year: detailDraft.battery_year ? parseInt(detailDraft.battery_year) : null,
      hours_reading: detailDraft.hours_reading ? parseFloat(detailDraft.hours_reading) : null,
      last_service_date: detailDraft.last_service_date || null,
    };
    const res = await fetch(`/api/admin/equipment?id=${detailItem.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSavingDetail(false);
    if (res.ok) { setDetailItem(null); fetchItems(); flash("success", "Details saved."); }
    else flash("error", "Failed to save details.");
  }

  // ── Add equipment ───────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addDraft.identifier.trim()) return;
    setAdding(true);
    const body = {
      type: addType,
      identifier: addDraft.identifier.trim(),
      make: addDraft.make || null,
      model: addDraft.model || null,
      year: addDraft.year ? parseInt(addDraft.year) : null,
      serial_number: addDraft.serial_number || null,
      color: addDraft.color || null,
      seats: addDraft.seats ? parseInt(addDraft.seats) : null,
      fuel_type: addDraft.fuel_type || null,
      battery_year: addDraft.battery_year ? parseInt(addDraft.battery_year) : null,
      hours_reading: addDraft.hours_reading ? parseFloat(addDraft.hours_reading) : null,
      last_service_date: addDraft.last_service_date || null,
    };
    const res = await fetch("/api/admin/equipment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setAdding(false);
    if (res.ok) {
      setAddOpen(false);
      setAddDraft(blankDraft());
      fetchItems();
      flash("success", `${addDraft.identifier} added.`);
    } else {
      const err = await res.json();
      flash("error", err.error || "Failed to add.");
    }
  }

  async function handleDelete(id: number, identifier: string) {
    if (!confirm(`Remove "${identifier}" from inventory?`)) return;
    const res = await fetch(`/api/admin/equipment?id=${id}`, { method: "DELETE" });
    if (res.ok) { fetchItems(); flash("success", `${identifier} removed.`); }
    else flash("error", "Failed to remove.");
  }

  const types = ["cart", "buggy", "clubs"] as const;
  const grouped = types.map((type) => ({ type, items: items.filter((i) => i.type === type) }));
  const stats = types.map((type) => {
    const group = items.filter((i) => i.type === type);
    return { type, total: group.length, available: group.filter((i) => i.status === "available").length, needsAttention: group.filter((i) => i.status !== "available").length };
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
              {needsAttention > 0 && <p className="text-xs text-amber-700 mt-1">{needsAttention} need attention</p>}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : (
        <>
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
                      <th className="pb-2 font-medium">Make / Model</th>
                      <th className="pb-2 font-medium">Year</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Hours</th>
                      <th className="pb-2 font-medium">Last Service</th>
                      <th className="pb-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {group.map((item) => (
                      <tr key={item.id} className="border-b border-gray-50 align-top">
                        <td className="py-3 font-medium">{item.identifier}</td>
                        <td className="py-3 text-gray-600">
                          {item.make || item.model
                            ? [item.make, item.model].filter(Boolean).join(" ")
                            : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3 text-gray-600">{item.year ?? <span className="text-gray-300">—</span>}</td>
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
                        <td className="py-3 text-gray-500 text-xs">
                          {item.hours_reading != null ? item.hours_reading.toLocaleString() : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3 text-xs text-gray-400 whitespace-nowrap">
                          {item.last_service_date ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          {editingId === item.id ? (
                            <span className="flex gap-2 justify-end">
                              <button onClick={() => saveEdit(item.id)} disabled={saving} className="text-swan-green hover:text-green-700 text-xs font-medium">
                                {saving ? "Saving…" : "Save"}
                              </button>
                              <button onClick={() => setEditingId(null)} className="text-gray-400 hover:text-gray-600 text-xs">Cancel</button>
                            </span>
                          ) : (
                            <span className="flex gap-3 justify-end">
                              {item.status === "available" ? (
                                <button onClick={() => quickStatus(item.id, "out_of_service")} className="text-amber-600 hover:text-amber-800 text-xs font-medium">
                                  Out of Service
                                </button>
                              ) : (
                                <button onClick={() => quickStatus(item.id, "available")} className="text-green-600 hover:text-green-800 text-xs font-medium">
                                  Mark Available
                                </button>
                              )}
                              <button onClick={() => openDetail(item)} className="text-swan-green hover:text-green-700 text-xs font-medium">
                                Details
                              </button>
                              <button onClick={() => startEdit(item)} className="text-gray-500 hover:text-gray-700 text-xs font-medium">
                                Status
                              </button>
                              <button onClick={() => handleDelete(item.id, item.identifier)} className="text-red-500 hover:text-red-700 text-xs font-medium">
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-swan-green">Add Equipment</h2>
              <button onClick={() => { setAddOpen(!addOpen); setAddDraft(blankDraft()); }} className="btn-primary text-sm px-4 py-2">
                {addOpen ? "Cancel" : "+ Add Item"}
              </button>
            </div>
            {addOpen && (
              <form onSubmit={handleAdd} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select className="input-field" value={addType} onChange={(e) => setAddType(e.target.value)}>
                      <option value="cart">Golf Cart</option>
                      <option value="buggy">Walking Buggy</option>
                      <option value="clubs">Club Set</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Identifier *</label>
                    <input type="text" required className="input-field" placeholder="Cart #7" value={addDraft.identifier} onChange={(e) => setAddDraft({ ...addDraft, identifier: e.target.value })} />
                  </div>
                </div>
                <EquipmentDetailFields draft={addDraft} onChange={setAddDraft} />
                <button type="submit" disabled={adding} className="btn-primary">{adding ? "Adding…" : "Add to Inventory"}</button>
              </form>
            )}
          </section>
        </>
      )}

      {/* Detail / Edit modal */}
      {detailItem && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 my-4">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-bold text-swan-green">{detailItem.identifier}</h2>
              <button onClick={() => setDetailItem(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select className="input-field" value={detailDraft.status} onChange={(e) => setDetailDraft({ ...detailDraft, status: e.target.value })}>
                    <option value="available">Available</option>
                    <option value="out_of_service">Out of Service</option>
                    <option value="maintenance">Needs Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Identifier</label>
                  <input type="text" className="input-field bg-gray-50" value={detailDraft.identifier} readOnly />
                </div>
              </div>
              <EquipmentDetailFields draft={detailDraft} onChange={setDetailDraft} />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Notes</label>
                <textarea className="input-field" rows={2} placeholder="Describe any issues or work needed…" value={detailDraft.service_notes} onChange={(e) => setDetailDraft({ ...detailDraft, service_notes: e.target.value })} />
              </div>
            </div>

            <div className="mt-6 flex gap-3 justify-end">
              <button onClick={() => setDetailItem(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium">Cancel</button>
              <button onClick={saveDetail} disabled={savingDetail} className="btn-primary px-6">{savingDetail ? "Saving…" : "Save Changes"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EquipmentDetailFields({ draft, onChange }: { draft: DetailDraft; onChange: (d: DetailDraft) => void }) {
  return (
    <>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
          <input type="text" className="input-field" placeholder="Club Car" value={draft.make} onChange={(e) => onChange({ ...draft, make: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
          <input type="text" className="input-field" placeholder="Precedent i2" value={draft.model} onChange={(e) => onChange({ ...draft, model: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
          <input type="number" className="input-field" placeholder="2022" min="1990" max="2030" value={draft.year} onChange={(e) => onChange({ ...draft, year: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Serial / VIN</label>
          <input type="text" className="input-field" placeholder="PH2107-123456" value={draft.serial_number} onChange={(e) => onChange({ ...draft, serial_number: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
          <input type="text" className="input-field" placeholder="White" value={draft.color} onChange={(e) => onChange({ ...draft, color: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Seats</label>
          <input type="number" className="input-field" placeholder="2" min="0" max="8" value={draft.seats} onChange={(e) => onChange({ ...draft, seats: e.target.value })} />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Fuel Type</label>
          <select className="input-field" value={draft.fuel_type} onChange={(e) => onChange({ ...draft, fuel_type: e.target.value })}>
            <option value="">— select —</option>
            {FUEL_TYPES.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Battery Year</label>
          <input type="number" className="input-field" placeholder="2023" min="2000" max="2030" value={draft.battery_year} onChange={(e) => onChange({ ...draft, battery_year: e.target.value })} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Hours Reading</label>
          <input type="number" className="input-field" placeholder="842" min="0" step="0.1" value={draft.hours_reading} onChange={(e) => onChange({ ...draft, hours_reading: e.target.value })} />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Last Service Date</label>
        <input type="date" className="input-field w-48" value={draft.last_service_date} onChange={(e) => onChange({ ...draft, last_service_date: e.target.value })} />
      </div>
    </>
  );
}
