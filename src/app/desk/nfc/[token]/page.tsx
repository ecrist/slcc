// This page handles NFC tags programmed with the URL:
//   https://book.swanlakecc.com/desk/nfc/<token>
//
// On iOS, tapping an NFC tag near a phone/iPad opens this URL in Safari.
// If the device is already signed in as a desk/admin user, it auto-logs
// the check-in and redirects back to /desk. Otherwise it shows a message
// for desk staff to complete manually.

import { auth } from "@/auth";
import { isAdminEmail } from "@/lib/admin";
import { queryOne, execute } from "@/lib/db";
import { MEMBERSHIP_TYPES, type MembershipType } from "@/lib/types";
import { redirect } from "next/navigation";

export default async function NfcCheckinPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const member = await queryOne<{
    id: number; first_name: string; last_name: string;
    email: string; membership_type: string; status: string;
  }>(
    "SELECT id, first_name, last_name, email, membership_type, status FROM memberships WHERE nfc_token = $1",
    [token]
  );

  if (!member) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8 text-center">
        <div>
          <div className="text-6xl mb-4">❓</div>
          <h1 className="text-2xl font-bold mb-2">Unrecognised Card</h1>
          <p className="text-slate-400">This NFC card is not linked to any active member account.</p>
          <p className="text-slate-500 text-sm mt-4">Please see desk staff.</p>
        </div>
      </div>
    );
  }

  const session = await auth();
  const isDesk  = session?.user?.email && (await isAdminEmail(session.user.email));

  if (isDesk && member.status === "active") {
    await execute(
      "INSERT INTO checkins (type, name, email, players, holes, membership_id) VALUES ('nfc', $1, $2, 1, 18, $3)",
      [`${member.first_name} ${member.last_name}`, member.email, member.id]
    );
    redirect(`/desk?checked_in=${encodeURIComponent(member.first_name + " " + member.last_name)}`);
  }

  const typeName = MEMBERSHIP_TYPES[member.membership_type as MembershipType]?.name ?? member.membership_type;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white p-8">
      <div className="max-w-sm w-full text-center">
        <div className={`w-24 h-24 rounded-full mx-auto mb-6 flex items-center justify-center text-4xl ${
          member.status === "active" ? "bg-green-900/50" : "bg-red-900/50"
        }`}>
          {member.status === "active" ? "👤" : "⚠️"}
        </div>
        <h1 className="text-3xl font-bold mb-1">{member.first_name} {member.last_name}</h1>
        <p className="text-slate-400 mb-1">{member.email}</p>
        <p className={`text-lg font-semibold mb-6 ${member.status === "active" ? "text-green-400" : "text-red-400"}`}>
          {typeName} — {member.status}
        </p>
        {member.status !== "active" && (
          <p className="text-red-400 text-sm mb-6">This membership is not currently active.</p>
        )}
        <p className="text-slate-500 text-sm">Please see desk staff to complete check-in.</p>
        <a href="/desk" className="mt-6 inline-block bg-slate-700 hover:bg-slate-600 text-white rounded-xl px-6 py-3 text-sm font-medium">
          Back to Desk
        </a>
      </div>
    </div>
  );
}
