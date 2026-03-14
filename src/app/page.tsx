import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-swan-green text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-swan-green via-swan-green-light to-swan-green opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-4">
              Swan Lake
              <span className="block text-swan-gold">Country Club</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-4">
              Pengilly, Minnesota
            </p>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
              Online booking and membership portal for Swan Lake Country Club in Pengilly, Minnesota.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/tee-times" className="btn-secondary text-center text-lg">
                Book a Tee Time
              </Link>
              <Link href="/memberships" className="btn-outline border-white text-white hover:bg-white hover:text-swan-green text-center text-lg">
                Become a Member
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <Link href="/tee-times" className="card hover:shadow-xl transition-shadow group">
            <div className="text-swan-green mb-4">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-swan-green mb-2 group-hover:text-swan-green-light">
              Tee Times
            </h3>
            <p className="text-gray-600">
              Book your tee time online. Available 7 days in advance with 12-minute intervals.
            </p>
          </Link>

          <Link href="/memberships" className="card hover:shadow-xl transition-shadow group">
            <div className="text-swan-green mb-4">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-swan-green mb-2 group-hover:text-swan-green-light">
              Annual Memberships
            </h3>
            <p className="text-gray-600">
              Join the club! Individual, couple, family, and senior memberships available. Pay online.
            </p>
          </Link>

          <Link href="/events" className="card hover:shadow-xl transition-shadow group">
            <div className="text-swan-green mb-4">
              <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-swan-green mb-2 group-hover:text-swan-green-light">
              Events Calendar
            </h3>
            <p className="text-gray-600">
              Tournaments, leagues, clinics, and social events. Something for everyone!
            </p>
          </Link>
        </div>
      </section>

      {/* Rates */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title text-center">Green Fees</h2>
        <p className="text-center text-gray-500 mb-10">2026 Season Rates</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto mb-6">
          <div className="card text-center">
            <h3 className="font-bold text-lg mb-1">9 Holes</h3>
            <p className="text-3xl font-bold text-swan-green">$25</p>
          </div>
          <div className="card text-center">
            <h3 className="font-bold text-lg mb-1">18 Holes</h3>
            <p className="text-3xl font-bold text-swan-green">$35</p>
          </div>
        </div>
        <p className="text-center text-sm text-gray-500">
          Youth (13–18) discount available. Ages 12 &amp; under play free with a paying adult.{" "}
          <a href="https://www.swanlakecc.com/rates-and-membership" className="text-swan-green underline hover:text-swan-green-light">
            View full rates &amp; cart fees
          </a>
        </p>
      </section>
    </div>
  );
}
