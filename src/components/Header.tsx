"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

async function gravatarUrl(email: string): Promise<string> {
  const encoded = new TextEncoder().encode(email.trim().toLowerCase());
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoded);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `https://www.gravatar.com/avatar/${hashHex}?d=mp&s=80`;
}

export default function Header() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: session } = useSession();
  const [avatar, setAvatar] = useState<string | null>(null);

  useEffect(() => {
    if (session?.user?.email) {
      gravatarUrl(session.user.email).then(setAvatar);
    } else {
      setAvatar(null);
    }
  }, [session?.user?.email]);

  return (
    <header className="bg-swan-green shadow-lg sticky top-0 z-50">
      <div className="bg-swan-green-light border-b border-green-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5 flex items-center">
          <a
            href="https://www.swanlakecc.com"
            className="text-white/80 hover:text-white text-xs flex items-center gap-1 transition-colors"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to swanlakecc.com
          </a>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <Link href="/" className="flex items-center space-x-3">
            <div className="text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2C8 2 4 5 4 9c0 3 2 5 4 6l1 5h6l1-5c2-1 4-3 4-6 0-4-4-7-8-7z" />
                <circle cx="12" cy="8" r="2" fill="currentColor" />
              </svg>
            </div>
            <div>
              <h1 className="text-white font-bold text-xl leading-tight">Swan Lake</h1>
              <p className="text-swan-gold text-sm font-medium">Country Club</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center space-x-8">
            <Link href="/tee-times" className="text-white hover:text-swan-gold transition-colors font-medium">
              Tee Times
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
            {session ? (
              <div className="flex items-center gap-3">
                {avatar && (
                  <img
                    src={avatar}
                    alt={session.user?.name || ""}
                    className="h-8 w-8 rounded-full border-2 border-swan-gold/50"
                  />
                )}
                <span className="text-white/70 text-sm">{session.user?.name?.split(" ")[0]}</span>
                {session.user?.isAdmin && (
                  <Link href="/admin" className="text-swan-gold hover:text-swan-gold-light transition-colors font-medium text-sm">
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => signOut()}
                  className="text-white/60 hover:text-white transition-colors font-medium text-sm"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn()}
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
            <Link href="/tee-times" className="block text-white hover:text-swan-gold font-medium" onClick={() => setMobileOpen(false)}>
              Tee Times
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
            {session ? (
              <>
                <span className="block text-white/70 text-sm">{session.user?.email}</span>
                {session.user?.isAdmin && (
                  <Link href="/admin" className="block text-swan-gold hover:text-swan-gold-light font-medium" onClick={() => setMobileOpen(false)}>
                    Admin
                  </Link>
                )}
                <button
                  onClick={() => { signOut(); setMobileOpen(false); }}
                  className="block text-white/60 hover:text-white font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => { signIn(); setMobileOpen(false); }}
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
