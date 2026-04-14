"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";

interface MembershipInfo {
  member_number: string;
  membership_type: string;
  status: string;
  start_date: string;
  end_date: string;
  payment_status: string;
}

export default function SettingsPage() {
  const { data: session, status, update: updateSession } = useSession();
  const router = useRouter();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [memberSince, setMemberSince] = useState("");
  const [membership, setMembership] = useState<MembershipInfo | null>(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/settings");
      return;
    }
    if (status === "authenticated") {
      fetch("/api/user/settings")
        .then((r) => r.json())
        .then((data) => {
          // Split stored full name into first / last
          const parts = (data.name || "").trim().split(/\s+/);
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
          setEmail(data.email || "");
          setPhone(data.phone || "");
          if (data.membership) setMembership(data.membership);
          if (data.created_at) {
            setMemberSince(
              new Date(data.created_at).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })
            );
          }
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [status, router]);

  async function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return;
    setSaving(true);
    setMessage(null);

    const res = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `${firstName.trim()} ${lastName.trim()}`,
        email,
        phone,
      }),
    });

    const data = await res.json();
    if (res.ok) {
      await updateSession();
      setMessage({ type: "success", text: "Profile updated successfully." });
    } else {
      setMessage({ type: "error", text: data.error || "Failed to update profile." });
    }
    setSaving(false);
  }

  async function handlePasswordSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "New passwords do not match." });
      setSaving(false);
      return;
    }

    const res = await fetch("/api/user/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });

    const data = await res.json();
    if (res.ok) {
      setMessage({ type: "success", text: "Password updated successfully." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } else {
      setMessage({ type: "error", text: data.error || "Failed to update password." });
    }
    setSaving(false);
  }

  if (status === "loading" || loading) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-48"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() ||
    (session.user?.email?.[0] || "?").toUpperCase();

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="section-title">Account Settings</h1>

      {/* User avatar + info header */}
      <div className="flex items-center gap-4 mb-10">
        <div className="w-16 h-16 rounded-full bg-swan-green flex items-center justify-center text-white text-xl font-bold shrink-0">
          {initials}
        </div>
        <div>
          <p className="text-xl font-semibold text-gray-900">
            {firstName || lastName ? `${firstName} ${lastName}`.trim() : session.user?.email}
          </p>
          <p className="text-gray-500 text-sm">{session.user?.email}</p>
          {memberSince && (
            <p className="text-gray-400 text-xs mt-0.5">Account created {memberSince}</p>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-6 px-4 py-3 rounded-lg text-sm font-medium ${
          message.type === "success"
            ? "bg-green-50 text-green-800 border border-green-200"
            : "bg-red-50 text-red-800 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Membership Section */}
      {membership ? (
        <div className="card mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-lg text-swan-green">Membership</h2>
            <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
              membership.status === "active"  ? "bg-green-100 text-green-800" :
              membership.status === "pending" ? "bg-yellow-100 text-yellow-800" :
              "bg-gray-100 text-gray-800"
            }`}>
              {membership.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Member #</p>
              <p className="font-semibold font-mono">{membership.member_number}</p>
            </div>
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-semibold capitalize">{membership.membership_type.replace(/_/g, " ")}</p>
            </div>
            <div>
              <p className="text-gray-500">Season</p>
              <p className="font-semibold">{membership.start_date} &ndash; {membership.end_date}</p>
            </div>
            <div>
              <p className="text-gray-500">Payment</p>
              <p className={`font-semibold ${membership.payment_status === "paid" ? "text-green-700" : "text-yellow-700"}`}>
                {membership.payment_status}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card mb-8 text-center py-6">
          <p className="text-gray-500 mb-3">No active membership found.</p>
          <Link href="/memberships" className="btn-primary py-2 px-6 text-sm inline-block">
            View Memberships
          </Link>
        </div>
      )}

      {/* Profile Section */}
      <div className="card mb-8">
        <h2 className="font-bold text-lg text-swan-green mb-4">Profile</h2>
        <form onSubmit={handleProfileSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="firstName"
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-swan-green focus:border-swan-green outline-none"
                required
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="lastName"
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-swan-green focus:border-swan-green outline-none"
                required
              />
            </div>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-swan-green focus:border-swan-green outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-swan-green focus:border-swan-green outline-none"
              placeholder="(218) 555-1234"
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving || !firstName.trim() || !lastName.trim() || !email.trim()}
              className="btn-primary py-2 px-6 text-sm disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>

      {/* Password Section */}
      <div className="card">
        <h2 className="font-bold text-lg text-swan-green mb-4">Change Password</h2>
        <form onSubmit={handlePasswordSave} className="space-y-4">
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-swan-green focus:border-swan-green outline-none"
              required
            />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-swan-green focus:border-swan-green outline-none"
              required
              minLength={8}
            />
            <p className="text-gray-400 text-xs mt-1">Minimum 8 characters</p>
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-900 focus:ring-2 focus:ring-swan-green focus:border-swan-green outline-none"
              required
              minLength={8}
            />
          </div>
          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="btn-primary py-2 px-6 text-sm disabled:opacity-50"
            >
              {saving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
