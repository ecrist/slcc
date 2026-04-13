"use client";

import Link from "next/link";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

function UserInitials({ name, email }: { name?: string | null; email?: string | null }) {
  const initials = (name || email || "?")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="w-9 h-9 rounded-full bg-white/20 border-2 border-swan-gold/50 flex items-center justify-center text-white text-sm font-bold cursor-pointer hover:bg-white/30 transition-colors">
      {initials}
    </div>
  );
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    if (userMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [userMenuOpen]);

  return (
    <header className="bg-swan-green shadow-lg sticky top-0 z-50">
      <div className="bg-swan-green-light border-b border-green-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between">
          <a
            href="https://www.swanlakecc.com"
            className="text-white/90 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to swanlakecc.com
          </a>
          <a href="tel:+12188853543" className="sm:hidden text-white/90 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            (218) 885-3543
          </a>
          <div className="hidden sm:flex items-center gap-4">
            <a href="https://goo.gl/maps/eavaLfnd1zQdaPLD6" target="_blank" rel="noopener noreferrer" className="text-white/90 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
              </svg>
              Directions
            </a>
            <a href="mailto:golf@swanlakecc.com" className="text-white/90 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
              </svg>
              golf@swanlakecc.com
            </a>
            <a href="tel:+12188853543" className="text-white/90 hover:text-white text-sm flex items-center gap-1.5 transition-colors">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
              </svg>
              (218) 885-3543
            </a>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-3">
            <div className="bg-white rounded-xl h-12 w-12 flex items-center justify-center p-1.5 shadow-md">
              <img
                src="/icons/swan-logo.png"
                alt="Swan Lake CC"
                className="h-9 w-9 object-contain"
              />
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">Swan Lake</h1>
              <p className="text-swan-gold text-sm font-medium">Country Club</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/course" className="text-white hover:text-swan-gold transition-colors font-medium">
              Course
            </Link>
            <Link href="/tee-times" className="text-white hover:text-swan-gold transition-colors font-medium">
              Tee Times
            </Link>
            <Link href="/rates" className="text-white hover:text-swan-gold transition-colors font-medium">
              Rates
            </Link>
            <Link href="/memberships" className="text-white hover:text-swan-gold transition-colors font-medium">
              Memberships
            </Link>
            <Link href="/events" className="text-white hover:text-swan-gold transition-colors font-medium">
              Events
            </Link>
            <Link href="/tournaments" className="text-white hover:text-swan-gold transition-colors font-medium">
              Tournaments
            </Link>
            <Link href="/about" className="text-white hover:text-swan-gold transition-colors font-medium">
              About
            </Link>
            {session ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)} aria-label="User menu">
                  <UserInitials name={session.user?.name} email={session.user?.email} />
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                    <div className="px-4 py-2 border-b border-gray-100">
                      <p className="font-semibold text-gray-900 text-sm truncate">{session.user?.name}</p>
                      <p className="text-gray-500 text-xs truncate">{session.user?.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 010 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </Link>
                    <button
                      onClick={async () => {
                        setUserMenuOpen(false);
                        await signOut({ redirect: false });
                        router.push("/");
                      }}
                      className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
                      </svg>
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <button
                onClick={() => router.push("/login")}
                className="btn-secondary text-sm py-2 px-4"
              >
                Sign In
              </button>
            )}
          </nav>

          <button
            className="md:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-swan-green-light border-t border-swan-green">
          <div className="px-4 py-3 space-y-3">
            <Link href="/course" className="block text-white hover:text-swan-gold font-medium" onClick={() => setMobileOpen(false)}>
              Course
            </Link>
            <Link href="/tee-times" className="block text-white hover:text-swan-gold font-medium" onClick={() => setMobileOpen(false)}>
              Tee Times
            </Link>
            <Link href="/rates" className="block text-white hover:text-swan-gold font-medium" onClick={() => setMobileOpen(false)}>
              Rates
            </Link>
            <Link href="/memberships" className="block text-white hover:text-swan-gold font-medium" onClick={() => setMobileOpen(false)}>
              Memberships
            </Link>
            <Link href="/events" className="block text-white hover:text-swan-gold font-medium" onClick={() => setMobileOpen(false)}>
              Events
            </Link>
            <Link href="/tournaments" className="block text-white hover:text-swan-gold font-medium" onClick={() => setMobileOpen(false)}>
              Tournaments
            </Link>
            <Link href="/about" className="block text-white hover:text-swan-gold font-medium" onClick={() => setMobileOpen(false)}>
              About
            </Link>
            {session ? (
              <>
                <div className="border-t border-white/10 pt-3 mt-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 border border-swan-gold/50 flex items-center justify-center text-white text-xs font-bold">
                      {(session.user?.name || session.user?.email || "?")
                        .split(" ")
                        .map((w) => w[0])
                        .join("")
                        .toUpperCase()
                        .slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-white text-sm font-medium">{session.user?.name}</p>
                      <p className="text-white/50 text-xs">{session.user?.email}</p>
                    </div>
                  </div>
                  <Link href="/settings" className="block text-white/80 hover:text-white font-medium text-sm" onClick={() => setMobileOpen(false)}>
                    Settings
                  </Link>
                  <button
                    onClick={async () => { await signOut({ redirect: false }); setMobileOpen(false); router.push("/"); }}
                    className="block text-white/60 hover:text-white font-medium text-sm mt-2"
                  >
                    Sign Out
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={() => { router.push("/login"); setMobileOpen(false); }}
                className="block text-swan-gold hover:text-swan-gold-light font-medium"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
