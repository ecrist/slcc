import Link from "next/link";

export default function Home() {
  return (
    <div>
      {/* Hero Section */}
      <section className="relative bg-swan-green text-white">
        <div className="absolute inset-0 bg-gradient-to-br from-swan-green via-swan-green-light to-swan-green opacity-90" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 md:py-36">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-4 animate-fade-in-up">
              Swan Lake
              <span className="block text-swan-gold">Country Club</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-200 mb-4 animate-fade-in-up stagger-2">
              Pengilly, Minnesota
            </p>
            <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10 animate-fade-in-up stagger-3">
              Online booking and membership portal for Swan Lake Country Club in Pengilly, Minnesota.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-in-up stagger-4">
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <Link href="/tee-times" className="card hover:shadow-xl transition-shadow group animate-fade-in-up stagger-1">
            <div className="text-swan-green mb-4">
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
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

          <Link href="/rates" className="card hover:shadow-xl transition-shadow group animate-fade-in-up stagger-2">
            <div className="text-swan-green mb-4">
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-swan-green mb-2 group-hover:text-swan-green-light">
              Rates
            </h3>
            <p className="text-gray-600">
              Green fees, cart rentals, equipment fees, and driving range pricing.
            </p>
          </Link>

          <Link href="/memberships" className="card hover:shadow-xl transition-shadow group animate-fade-in-up stagger-3">
            <div className="text-swan-green mb-4">
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 9h3.75M15 12h3.75M15 15h3.75M4.5 19.5h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5zm6-10.125a1.875 1.875 0 11-3.75 0 1.875 1.875 0 013.75 0zm1.294 6.336a6.721 6.721 0 01-3.17.789 6.721 6.721 0 01-3.168-.789 3.376 3.376 0 016.338 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-swan-green mb-2 group-hover:text-swan-green-light">
              Memberships
            </h3>
            <p className="text-gray-600">
              Join the club! Individual, couple, family, and senior memberships available. Pay online.
            </p>
          </Link>

          <Link href="/course" className="card hover:shadow-xl transition-shadow group animate-fade-in-up stagger-4">
            <div className="text-swan-green mb-4">
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-swan-green mb-2 group-hover:text-swan-green-light">
              Course
            </h3>
            <p className="text-gray-600">
              Par 36, 9 holes of scenic golf with MGA ratings. View the scorecard and tee options.
            </p>
          </Link>

          <Link href="/events" className="card hover:shadow-xl transition-shadow group animate-fade-in-up stagger-5">
            <div className="text-swan-green mb-4">
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-swan-green mb-2 group-hover:text-swan-green-light">
              Events
            </h3>
            <p className="text-gray-600">
              Leagues, clinics, and social events. Something for everyone!
            </p>
          </Link>

          <Link href="/tournaments" className="card hover:shadow-xl transition-shadow group animate-fade-in-up stagger-6">
            <div className="text-swan-green mb-4">
              <svg className="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 4h12v2a6 6 0 01-12 0V4zM6 4H4a1 1 0 00-1 1v1a3 3 0 003 3M18 4h2a1 1 0 011 1v1a3 3 0 01-3 3M12 12v4m-3 4h6m-3 0v-4" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-swan-green mb-2 group-hover:text-swan-green-light">
              Tournaments
            </h3>
            <p className="text-gray-600">
              Compete in our seasonal tournaments. View schedules, register, and check results.
            </p>
          </Link>
        </div>
      </section>
    </div>
  );
}
