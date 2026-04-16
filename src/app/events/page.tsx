"use client";

import { useState, useEffect } from "react";
import type { GolfEvent } from "@/lib/types";

const EVENT_TYPE_LABELS: Record<string, { label: string; color: string }> = {
  tournament: { label: "Tournament", color: "bg-red-100 text-red-800" },
  league: { label: "League", color: "bg-blue-100 text-blue-800" },
  clinic: { label: "Clinic", color: "bg-green-100 text-green-800" },
  social: { label: "Social", color: "bg-purple-100 text-purple-800" },
  general: { label: "Event", color: "bg-gray-100 text-gray-800" },
};

export default function EventsPage() {
  const [events, setEvents] = useState<GolfEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [registering, setRegistering] = useState<number | null>(null);
  const [regForm, setRegForm] = useState({ name: "", email: "", phone: "", party_size: "1" });
  const [regResult, setRegResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  useEffect(() => {
    fetchEvents();
  }, []);

  async function fetchEvents() {
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data);
    } catch {
      console.error("Failed to fetch events");
    } finally {
      setLoading(false);
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!registering) return;

    try {
      const res = await fetch(`/api/events/${registering}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...regForm, party_size: parseInt(regForm.party_size) }),
      });

      if (res.ok) {
        setRegResult({ type: "success", message: "Registration confirmed! Check your email for details." });
        setRegistering(null);
        setRegForm({ name: "", email: "", phone: "", party_size: "1" });
        fetchEvents();
      } else {
        const err = await res.json();
        setRegResult({ type: "error", message: err.error || "Registration failed" });
      }
    } catch {
      setRegResult({ type: "error", message: "Network error. Please try again." });
    }
  }

  function formatDate(dateStr: string) {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  }

  function formatTime(time: string) {
    const [h, m] = time.split(":");
    const hour = parseInt(h);
    const ampm = hour >= 12 ? "PM" : "AM";
    const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${display}:${m} ${ampm}`;
  }

  const filteredEvents = filter === "all" ? events : events.filter((e) => e.event_type === filter);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title animate-fade-in-up">Events Calendar</h1>
      <p className="text-gray-600 mb-8 animate-fade-in-up">Tournaments, leagues, clinics, and social gatherings at Swan Lake.</p>

      {regResult && (
        <div className={`mb-6 p-4 rounded-lg ${regResult.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {regResult.message}
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2 mb-8 flex-wrap animate-fade-in-up stagger-1">
        {[{ key: "all", label: "All Events" }, ...Object.entries(EVENT_TYPE_LABELS).map(([key, v]) => ({ key, label: v.label + "s" }))].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === f.key ? "bg-swan-green text-white" : "bg-white border border-gray-300 text-gray-600 hover:border-swan-green"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading events...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12 text-gray-500">No upcoming events found.</div>
      ) : (
        <div className="space-y-6">
          {filteredEvents.map((event, index) => {
            const typeInfo = EVENT_TYPE_LABELS[event.event_type] || EVENT_TYPE_LABELS.general;
            const spotsLeft = event.max_participants ? event.max_participants - event.current_participants : null;

            return (
              <div key={event.id} className="card flex flex-col md:flex-row gap-6 animate-fade-in-up" style={{ animationDelay: `${index * 0.05}s` }}>
                {/* Date badge */}
                <div className="flex-shrink-0 text-center md:w-24">
                  <div className="bg-swan-green text-white rounded-lg p-3">
                    <div className="text-sm font-medium">
                      {new Date(event.event_date + "T12:00:00").toLocaleDateString("en-US", { month: "short" })}
                    </div>
                    <div className="text-3xl font-bold">
                      {new Date(event.event_date + "T12:00:00").getDate()}
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="flex-1">
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <div>
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${typeInfo.color} mb-2`}>
                        {typeInfo.label}
                      </span>
                      <h3 className="text-xl font-bold text-swan-dark">{event.title}</h3>
                    </div>
                    {event.cost !== null && event.cost > 0 && (
                      <div className="text-right flex-shrink-0">
                        <div className="text-2xl font-bold text-swan-green">${event.cost}</div>
                        <div className="text-xs text-gray-500">per person</div>
                      </div>
                    )}
                    {event.cost === 0 && (
                      <div className="text-swan-green font-bold flex-shrink-0">FREE</div>
                    )}
                  </div>

                  <p className="text-gray-500 text-sm mb-2">
                    {formatDate(event.event_date)}
                    {event.start_time && ` | ${formatTime(event.start_time)}`}
                    {event.end_time && ` - ${formatTime(event.end_time)}`}
                    {event.location && ` | ${event.location}`}
                  </p>

                  <p className="text-gray-600 mb-4">{event.description}</p>

                  <div className="flex items-center gap-4">
                    {spotsLeft !== null && (
                      <span className={`text-sm font-medium ${spotsLeft <= 5 ? "text-red-600" : "text-gray-500"}`}>
                        {spotsLeft > 0 ? `${spotsLeft} spots left` : "FULL"}
                      </span>
                    )}
                    {(spotsLeft === null || spotsLeft > 0) && (
                      <button
                        onClick={() => setRegistering(registering === event.id ? null : event.id)}
                        className="btn-primary text-sm py-2 px-4"
                      >
                        {registering === event.id ? "Cancel" : "Register"}
                      </button>
                    )}
                  </div>

                  {/* Registration form */}
                  {registering === event.id && (
                    <form onSubmit={handleRegister} className="mt-4 p-4 bg-gray-50 rounded-lg space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <input type="text" required placeholder="Your Name" className="input-field" value={regForm.name}
                          onChange={(e) => setRegForm({ ...regForm, name: e.target.value })} />
                        <input type="email" required placeholder="Email" className="input-field" value={regForm.email}
                          onChange={(e) => setRegForm({ ...regForm, email: e.target.value })} />
                        <input type="tel" placeholder="Phone" className="input-field" value={regForm.phone}
                          onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })} />
                        <select className="input-field" value={regForm.party_size}
                          onChange={(e) => setRegForm({ ...regForm, party_size: e.target.value })}>
                          {[1, 2, 3, 4, 5, 6].map((n) => (
                            <option key={n} value={n}>{n} {n === 1 ? "person" : "people"}</option>
                          ))}
                        </select>
                      </div>
                      <button type="submit" className="btn-primary text-sm py-2">
                        Confirm Registration
                      </button>
                    </form>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
