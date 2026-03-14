export default function Footer() {
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
              <p>Phone: (218) 885-3543</p>
              <p>Email: golf@swanlakecc.com</p>
            </div>
          </div>
          <div>
            <h3 className="text-white font-bold text-lg mb-3">Hours</h3>
            <div className="text-sm space-y-2">
              <p>Course: Dawn to Dusk (May - October)</p>
              <p>Pro Shop: 7:00 AM - 6:00 PM</p>
              <p>Clubhouse: 11:00 AM - 9:00 PM</p>
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
