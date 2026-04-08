"use client";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-swan-dark flex items-center justify-center p-6">
      <div className="text-center text-white max-w-sm">
        <div className="text-6xl mb-6">⛳</div>
        <h1 className="text-2xl font-bold text-swan-gold mb-3">You&apos;re Offline</h1>
        <p className="text-white/70 mb-6">
          No network connection. Some features require internet access.
        </p>
        <p className="text-white/50 text-sm">
          The tee sheet and member check-in work offline if you&apos;ve visited them recently.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="mt-8 px-6 py-3 bg-swan-gold text-swan-dark font-semibold rounded-xl hover:bg-swan-gold-light transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
