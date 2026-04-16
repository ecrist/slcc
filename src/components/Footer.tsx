import { getConfigValue } from "@/lib/admin";

function fmt12h(time: string): string {
  if (!time || time.includes("AM") || time.includes("PM")) return time || "";
  const [h, m] = time.split(":");
  const hour = parseInt(h);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${display}:${m} ${ampm}`;
}

export default async function Footer() {
  let displayPhone = "(218) 885-3543";
  let displayEmail = "golf@swanlakecc.com";
  let chOpen = "6:00 AM";
  let chClose = "8:00 PM";
  let sStart = "05-01";
  let sEnd = "10-31";

  try {
    const [phone, email, clubhouseOpen, clubhouseClose, seasonStart, seasonEnd] =
      await Promise.all([
        getConfigValue("contact_phone"),
        getConfigValue("contact_email"),
        getConfigValue("clubhouse_open"),
        getConfigValue("clubhouse_close"),
        getConfigValue("season_start"),
        getConfigValue("season_end"),
      ]);

    if (phone) displayPhone = phone;
    if (email) displayEmail = email;
    if (clubhouseOpen) chOpen = fmt12h(clubhouseOpen);
    if (clubhouseClose) chClose = fmt12h(clubhouseClose);
    if (seasonStart) sStart = seasonStart;
    if (seasonEnd) sEnd = seasonEnd;
  } catch {
    // DB not available during build — use defaults
  }

  // Convert MM-DD to month name
  function monthName(mmdd: string): string {
    const [mm] = (mmdd || "").split("-");
    const months = ["January","February","March","April","May","June","July","August","September","October","November","December"];
    return months[parseInt(mm) - 1] || "";
  }
  const seasonLabel = `${monthName(sStart)} - ${monthName(sEnd)}`;

  return (
    <footer className="bg-swan-dark text-gray-300 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-white font-bold text-lg mb-3">Swan Lake Country Club</h3>
            <p className="text-sm leading-relaxed">
              Pengilly, Minnesota&apos;s premier golf destination.
              Nestled among the beautiful Iron Range lakes and forests.
            </p>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-3">Contact</h3>
            <div className="text-sm space-y-2">
              <p>Pengilly, MN 55775</p>
              <p>Phone: <a href={`tel:${displayPhone.replace(/[^\d+]/g, "")}`} className="hover:text-white transition-colors">{displayPhone}</a></p>
              <p>Email: <a href={`mailto:${displayEmail}`} className="hover:text-white transition-colors">{displayEmail}</a></p>
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-3">Hours</h3>
            <div className="text-sm space-y-2">
              <p>Course: Dawn to Dusk ({seasonLabel})</p>
              <p>Clubhouse: {chOpen} - {chClose}</p>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
          <p>&copy; {new Date().getFullYear()} Swan Lake Country Club, Pengilly, MN. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
