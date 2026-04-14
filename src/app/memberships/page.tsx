"use client";

import { useState, useEffect } from "react";
import { useSession, signIn } from "next-auth/react";
import { MEMBERSHIP_TYPES, MembershipType } from "@/lib/types";
import SquareWalletButtons from "@/components/SquareWalletButtons";

type PaymentProvider = "square" | "quickbooks" | "wallet";

// Map which membership types can bundle a driving range add-on
const RANGE_ADDON: Partial<Record<MembershipType, MembershipType>> = {
  young_adult: "driving_range_single",
  single: "driving_range_single",
  household: "driving_range_household",
};

export default function MembershipsPage() {
  const { data: session } = useSession();
  const [selectedType, setSelectedType] = useState<MembershipType | null>(null);
  const [addRange, setAddRange] = useState(false);
  const [paymentProvider, setPaymentProvider] = useState<PaymentProvider>("wallet");
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "MN",
    zip: "",
  });
  const [saveCard, setSaveCard] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pre-fill form from logged-in user — fetch first/last directly from profile API
  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/user/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!data) return;
        setForm((prev) => ({
          ...prev,
          first_name: prev.first_name || data.first_name || "",
          last_name:  prev.last_name  || data.last_name  || "",
          email:      prev.email      || data.email       || "",
          phone:      prev.phone      || data.phone       || "",
        }));
      })
      .catch(() => {});
  }, [session]);

  // Reset add-on when changing membership type
  useEffect(() => {
    setAddRange(false);
  }, [selectedType]);

  const rangeAddonKey = selectedType ? RANGE_ADDON[selectedType] : undefined;
  const rangeAddonTier = rangeAddonKey ? MEMBERSHIP_TYPES[rangeAddonKey] : null;

  const basePrice = selectedType ? MEMBERSHIP_TYPES[selectedType].price : 0;
  const totalPrice = basePrice + (addRange && rangeAddonTier ? rangeAddonTier.price : 0);

  async function handleWalletToken(token: string) {
    if (!selectedType) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/payments/square/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          ...form,
          membership_type: selectedType,
          amount: totalPrice,
          save_card: saveCard,
          range_addon: addRange && rangeAddonKey ? rangeAddonKey : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({
          type: "success",
          message: `Payment successful! Your member number is ${data.member_number}. Welcome to Swan Lake Country Club!`,
        });
        setSelectedType(null);
        setAddRange(false);
        setForm({ first_name: "", last_name: "", email: "", phone: "", address: "", city: "", state: "MN", zip: "" });
      } else {
        setResult({ type: "error", message: data.error || "Payment failed" });
      }
    } catch {
      setResult({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedType) return;
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch("/api/memberships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          membership_type: selectedType,
          payment_provider: paymentProvider,
          range_addon: addRange && rangeAddonKey ? rangeAddonKey : undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.payment_url) {
          window.location.href = data.payment_url;
        } else {
          setResult({
            type: "success",
            message: `Membership application submitted! Your member number is ${data.member_number}. You will receive payment instructions by email.`,
          });
          setSelectedType(null);
          setAddRange(false);
          setForm({ first_name: "", last_name: "", email: "", phone: "", address: "", city: "", state: "MN", zip: "" });
        }
      } else {
        setResult({ type: "error", message: data.error || "Failed to submit membership" });
      }
    } catch {
      setResult({ type: "error", message: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  const displayTypes = Object.entries(MEMBERSHIP_TYPES) as [MembershipType, typeof MEMBERSHIP_TYPES[MembershipType]][];

  return (
    <>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <h1 className="section-title">Annual Memberships</h1>
      <p className="text-gray-600 mb-10 max-w-2xl">
        Join Swan Lake Country Club and enjoy unlimited golf all season long.
        All memberships run from May 1 through October 31, 2026.
      </p>

      {result && (
        <div className={`mb-6 p-4 rounded-lg ${result.type === "success" ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
          {result.message}
        </div>
      )}

      {/* Membership Tiers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {displayTypes.map(([key, tier]) => (
          <button
            key={key}
            onClick={() => setSelectedType(key)}
            className="card text-left transition-all hover:shadow-lg"
          >
            <h3 className="text-xl font-bold text-swan-green mb-1">{tier.name}</h3>
            <p className="text-3xl font-bold text-swan-dark mb-2">
              ${tier.price}
              <span className="text-sm font-normal text-gray-500">/season</span>
            </p>
            <p className="text-gray-600 text-sm">{tier.description}</p>
          </button>
        ))}
      </div>

    </div>
    <section className="bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title text-center mb-8">Member Information</h2>
        {/* Member Days & Times */}
        <div className="card mb-8">
          <h2 className="font-bold text-xl text-swan-green mb-4">Member Days &amp; Times</h2>
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="py-3 pr-4 font-semibold text-gray-700">Day</th>
                <th className="py-3 pr-4 font-semibold text-gray-700">Time</th>
                <th className="py-3 font-semibold text-gray-700">Event</th>
              </tr>
            </thead>
            <tbody className="text-gray-600">
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium">Monday</td>
                <td className="py-3 pr-4">4:30pm &ndash; 5:30pm</td>
                <td className="py-3">Ladies&rsquo; Club <span className="text-gray-400 text-sm">(through August)</span></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium">Tuesday</td>
                <td className="py-3 pr-4">Opening &ndash; 12:00pm</td>
                <td className="py-3">Senior Men&rsquo;s Club <span className="text-gray-400 text-sm">(through August)</span></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium">Wednesday</td>
                <td className="py-3 pr-4">Opening &ndash; 1:00pm</td>
                <td className="py-3">Ladies&rsquo; Club <span className="text-gray-400 text-sm">(through August)</span></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium">Wednesday</td>
                <td className="py-3 pr-4">4:30pm &ndash; 5:30pm</td>
                <td className="py-3">Little Dogs Scramble <span className="text-gray-400 text-sm">(sign up by 4:00pm each Wednesday)</span></td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4 font-medium">Thursday</td>
                <td className="py-3 pr-4">11:00am &ndash; Close</td>
                <td className="py-3">Men&rsquo;s Club <span className="text-gray-400 text-sm">(through August)</span></td>
              </tr>
              <tr>
                <td className="py-3 pr-4 font-medium">Friday</td>
                <td className="py-3 pr-4">8:00am &ndash; 10:00am</td>
                <td className="py-3">Youth Golf Program <span className="text-gray-400 text-sm">(June &amp; July)</span></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Ladies League */}
        <div className="card">
          <h2 className="font-bold text-xl text-swan-green mb-4">Ladies League Information</h2>
          <p className="text-gray-600">
            For SLCC Ladies League info and calendar, please{" "}
            <a href="https://cdn.prod.website-files.com/62164adfeaffe62555ecab49/67edc8ed516198e28c414c41_Swan%20Lake%20Ladies%202025%20Letter.pdf" target="_blank" rel="noopener noreferrer" className="text-swan-green font-medium hover:underline">
              click here
            </a>.
          </p>
        </div>
      </div>
    </section>

    {/* Modal */}
    {selectedType && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg my-8 relative">
            {/* Modal header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div>
                <h2 className="text-xl font-bold text-swan-green">
                  {MEMBERSHIP_TYPES[selectedType].name}
                </h2>
                <p className="text-gray-500 text-sm">2026 Season</p>
              </div>
              <button
                onClick={() => { setSelectedType(null); setAddRange(false); }}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none p-1"
              >
                &times;
              </button>
            </div>

            <div className="p-6 max-h-[70vh] overflow-y-auto">
              {/* Sign-in gate */}
              {!session ? (
                <div className="text-center py-4">
                  <svg className="h-12 w-12 mx-auto mb-3 text-swan-green" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <h3 className="text-lg font-bold mb-2">Sign in to continue</h3>
                  <p className="text-gray-500 text-sm mb-5">
                    An account is required to purchase a membership. This keeps your membership record tied to your account.
                  </p>
                  <button onClick={() => signIn(undefined, { callbackUrl: "/memberships" })} className="btn-primary w-full mb-3">
                    Sign In
                  </button>
                  <a href={`/register?callbackUrl=${encodeURIComponent("/memberships")}`} className="block text-sm text-swan-green hover:underline">
                    Don&apos;t have an account? Register free
                  </a>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Driving Range Add-on */}
                  {rangeAddonTier && (
                    <label className="flex items-start gap-3 p-3 rounded-lg border-2 border-dashed border-swan-gold/40 cursor-pointer hover:bg-swan-gold/5 transition-colors">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={addRange}
                        onChange={(e) => setAddRange(e.target.checked)}
                      />
                      <div className="flex-1">
                        <span className="font-semibold text-sm text-swan-dark">Add {rangeAddonTier.name}</span>
                        <span className="text-swan-green font-bold text-sm ml-2">+${rangeAddonTier.price}</span>
                        <p className="text-gray-500 text-xs mt-0.5">{rangeAddonTier.description}</p>
                      </div>
                    </label>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">First Name *</label>
                      <input type="text" required className="input-field" value={form.first_name}
                        onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Last Name *</label>
                      <input type="text" required className="input-field" value={form.last_name}
                        onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input type="email" required className="input-field" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                    <input type="tel" className="input-field" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                    <input type="text" className="input-field" value={form.address}
                      onChange={(e) => setForm({ ...form, address: e.target.value })} />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                      <input type="text" className="input-field" value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                      <input type="text" className="input-field" value={form.state}
                        onChange={(e) => setForm({ ...form, state: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">ZIP</label>
                      <input type="text" className="input-field" value={form.zip}
                        onChange={(e) => setForm({ ...form, zip: e.target.value })} />
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-3">Payment Method</label>
                    <SquareWalletButtons
                      price={totalPrice}
                      label={`${MEMBERSHIP_TYPES[selectedType].name} Membership`}
                      onToken={handleWalletToken}
                      onError={(msg) => setResult({ type: "error", message: msg })}
                    />
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <label className={`card cursor-pointer text-center transition-all py-3 ${paymentProvider === "square" ? "ring-2 ring-swan-green" : ""}`}>
                        <input type="radio" name="payment" value="square" checked={paymentProvider === "square"}
                          onChange={() => setPaymentProvider("square")} className="sr-only" />
                        <div className="font-bold mb-0.5 text-sm">Credit / Debit</div>
                        <div className="text-xs text-gray-500">via Square</div>
                      </label>
                      <label className={`card cursor-pointer text-center transition-all py-3 ${paymentProvider === "quickbooks" ? "ring-2 ring-swan-green" : ""}`}>
                        <input type="radio" name="payment" value="quickbooks" checked={paymentProvider === "quickbooks"}
                          onChange={() => setPaymentProvider("quickbooks")} className="sr-only" />
                        <div className="font-bold mb-0.5 text-sm">Invoice / ACH</div>
                        <div className="text-xs text-gray-500">via QuickBooks</div>
                      </label>
                    </div>
                  </div>

                  {paymentProvider === "square" && (
                    <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        className="mt-0.5"
                        checked={saveCard}
                        onChange={(e) => setSaveCard(e.target.checked)}
                      />
                      <span className="text-sm text-gray-700">
                        <span className="font-medium">Enable auto-renewal</span> — save my card for automatic renewal next season.
                      </span>
                    </label>
                  )}

                  {/* Price summary */}
                  {addRange && rangeAddonTier && (
                    <div className="bg-gray-50 rounded-lg p-3 text-sm">
                      <div className="flex justify-between">
                        <span>{MEMBERSHIP_TYPES[selectedType].name}</span>
                        <span>${basePrice}</span>
                      </div>
                      <div className="flex justify-between text-gray-500">
                        <span>{rangeAddonTier.name}</span>
                        <span>+${rangeAddonTier.price}</span>
                      </div>
                      <div className="flex justify-between font-bold border-t border-gray-200 mt-2 pt-2">
                        <span>Total</span>
                        <span>${totalPrice}</span>
                      </div>
                    </div>
                  )}

                  <button type="submit" disabled={submitting} className="btn-primary w-full text-lg">
                    {submitting
                      ? "Processing..."
                      : paymentProvider === "quickbooks"
                      ? `Request Invoice – $${totalPrice}`
                      : `Pay $${totalPrice} with Card`}
                  </button>

                  <p className="text-xs text-gray-400 text-center">
                    {paymentProvider === "quickbooks"
                      ? "An invoice will be sent to your email via QuickBooks Payments."
                      : "Payment processed securely via Square."}
                  </p>
                </form>
              )}
            </div>
          </div>
        </div>
    )}
    </>
  );
}
