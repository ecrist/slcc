export default function CoursePage() {
  const scorecard = [
    { hole: 1, par: "4/5", hcp: 2, blue: 430, white: 414, red: 388 },
    { hole: 2, par: 3, hcp: 3, blue: 196, white: 162, red: 141 },
    { hole: 3, par: 4, hcp: 6, blue: 358, white: 337, red: 270 },
    { hole: 4, par: 5, hcp: 5, blue: 460, white: 444, red: 401 },
    { hole: 5, par: 3, hcp: 9, blue: 154, white: 142, red: 120 },
    { hole: 6, par: 4, hcp: 8, blue: 354, white: 333, red: 309 },
    { hole: 7, par: 4, hcp: 7, blue: 323, white: 315, red: 307 },
    { hole: 8, par: "4/5", hcp: 1, blue: 455, white: 437, red: 416 },
    { hole: 9, par: 5, hcp: 4, blue: 505, white: 495, red: 400 },
  ];

  const totals = {
    par: scorecard.reduce((s, h) => s + (typeof h.par === "number" ? h.par : 4), 0),
    blue: scorecard.reduce((s, h) => s + h.blue, 0),
    white: scorecard.reduce((s, h) => s + h.white, 0),
    red: scorecard.reduce((s, h) => s + h.red, 0),
  };

  return (
    <div>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="section-title">Golf Course Overview</h1>
        <p className="text-gray-500 mb-10">9 Holes &middot; Par 36 &middot; Est. 1929</p>
        <div className="prose prose-lg max-w-none text-gray-700">
          <p>
            Swan Lake Country Club is a par-36 scenic 9-hole golf course with MGA ratings. The blue
            tees offer a challenging 3,235 yards followed by white tees playing 3,079 yards. The red
            tees play at 2,752 yards. New in 2025, we&apos;ll be rating our gold tees (located between the
            whites and reds) and adding forward green tees to provide more options for your golfing
            pleasure. Feel free to mix and match; play the tees that best suit your game! Swan Lake
            Country Club also offers an onsite driving range, plus a clubhouse with tasty food and
            beverages.
          </p>
        </div>
      </section>

      {/* Tee Information */}
      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="section-title">Tee Options</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="card text-center">
              <div className="inline-block w-5 h-5 rounded-full bg-blue-600 mb-3"></div>
              <h3 className="font-bold text-lg">Blue Tees</h3>
              <p className="text-3xl font-bold text-swan-green mt-1">3,235</p>
              <p className="text-gray-500 text-sm">yards</p>
            </div>
            <div className="card text-center">
              <div className="inline-block w-5 h-5 rounded-full bg-white border-2 border-gray-300 mb-3"></div>
              <h3 className="font-bold text-lg">White Tees</h3>
              <p className="text-3xl font-bold text-swan-green mt-1">3,079</p>
              <p className="text-gray-500 text-sm">yards</p>
            </div>
            <div className="card text-center">
              <div className="inline-block w-5 h-5 rounded-full bg-red-500 mb-3"></div>
              <h3 className="font-bold text-lg">Red Tees</h3>
              <p className="text-3xl font-bold text-swan-green mt-1">2,752</p>
              <p className="text-gray-500 text-sm">yards</p>
            </div>
          </div>
          <p className="text-center text-gray-500 text-sm">
            Gold tees (between white and red) and forward green tees are being added and rated for 2025.
          </p>
        </div>
      </section>

      {/* Scorecard */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title">Scorecard</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-center text-sm">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="py-3 px-2 text-left font-semibold text-gray-700">Hole</th>
                {scorecard.map((h) => (
                  <th key={h.hole} className="py-3 px-2 font-semibold text-gray-700">{h.hole}</th>
                ))}
                <th className="py-3 px-2 font-bold text-gray-900">Out</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-2 text-left font-semibold text-gray-700">Par</td>
                {scorecard.map((h) => (
                  <td key={h.hole} className="py-2 px-2">{h.par}</td>
                ))}
                <td className="py-2 px-2 font-bold">{totals.par}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-2 text-left font-semibold text-gray-700">HCP</td>
                {scorecard.map((h) => (
                  <td key={h.hole} className="py-2 px-2 text-gray-500">{h.hcp}</td>
                ))}
                <td className="py-2 px-2"></td>
              </tr>
              <tr className="border-b border-gray-100 bg-blue-50">
                <td className="py-2 px-2 text-left font-semibold text-blue-700">Blue</td>
                {scorecard.map((h) => (
                  <td key={h.hole} className="py-2 px-2">{h.blue}</td>
                ))}
                <td className="py-2 px-2 font-bold">{totals.blue}</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-2 px-2 text-left font-semibold text-gray-600">White</td>
                {scorecard.map((h) => (
                  <td key={h.hole} className="py-2 px-2">{h.white}</td>
                ))}
                <td className="py-2 px-2 font-bold">{totals.white}</td>
              </tr>
              <tr className="bg-red-50">
                <td className="py-2 px-2 text-left font-semibold text-red-700">Red</td>
                {scorecard.map((h) => (
                  <td key={h.hole} className="py-2 px-2">{h.red}</td>
                ))}
                <td className="py-2 px-2 font-bold">{totals.red}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Holes 1 and 8 have separate mens (4) and ladies (5) par.
        </p>
      </section>

      {/* Amenities */}
      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="section-title">Amenities</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green mb-2">Driving Range</h3>
              <p className="text-gray-600">
                Practice your swing at our driving range. Small bag $5, large bag $7.
                Closed Fridays 8am&ndash;10am in June and July for youth programs.
              </p>
            </div>
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green mb-2">Clubhouse &amp; Sugar Shack</h3>
              <p className="text-gray-600">
                Enjoy food and beverages in our clubhouse, built in 1939. The Sugar Shack offers
                a great spot to relax after your round.
              </p>
            </div>
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green mb-2">Cart &amp; Club Rentals</h3>
              <p className="text-gray-600">
                Power carts, pull carts, and club sets available for rent.
                Walk or ride &mdash; your choice.
              </p>
            </div>
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green mb-2">Event Venue</h3>
              <p className="text-gray-600">
                Host your tournament, league, or private event at Swan Lake.
                Our clubhouse accommodates groups of all sizes.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
