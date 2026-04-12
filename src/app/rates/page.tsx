import Link from "next/link";

export default function RatesPage() {
  return (
    <div>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="section-title">Rates &amp; Membership</h1>
        <p className="text-gray-500 mb-10">2026 Season</p>
        <h2 className="section-title text-center">Daily Green Fees</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
          <div className="card text-center">
            <h3 className="font-bold text-lg mb-1">9 Holes</h3>
            <p className="text-4xl font-bold text-swan-green">$25</p>
          </div>
          <div className="card text-center">
            <h3 className="font-bold text-lg mb-1">18 Holes</h3>
            <p className="text-4xl font-bold text-swan-green">$35</p>
          </div>
        </div>

        <div className="card mt-8">
          <h3 className="font-bold text-lg text-swan-green mb-4">Youth Rates</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Ages 16&ndash;18</td>
                  <td className="py-3 font-semibold text-right">$15.00</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Ages 13&ndash;15</td>
                  <td className="py-3 font-semibold text-right">$10.00</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Age 12 &amp; under</td>
                  <td className="py-3 font-semibold text-right text-swan-green">Free</td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-gray-500 text-sm mt-3">Ages 12 &amp; under play free with a paying adult and must golf together.</p>
        </div>
      </section>

      {/* Cart & Equipment Rentals */}
      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="section-title text-center">Cart &amp; Equipment Rentals</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Member Cart Rates */}
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green mb-4">Power Carts &mdash; Members</h3>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 pr-4 text-sm font-semibold text-gray-600"></th>
                    <th className="py-2 pr-4 text-sm font-semibold text-gray-600 text-right">Half Cart</th>
                    <th className="py-2 text-sm font-semibold text-gray-600 text-right">Full Cart</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">9 Holes</td>
                    <td className="py-2 pr-4 text-right">$10.00</td>
                    <td className="py-2 text-right">$17.50</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">18 Holes</td>
                    <td className="py-2 pr-4 text-right">$15.00</td>
                    <td className="py-2 text-right">$25.00</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Non-Member Cart Rates */}
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green mb-4">Power Carts &mdash; Non-Members</h3>
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-2 pr-4 text-sm font-semibold text-gray-600"></th>
                    <th className="py-2 pr-4 text-sm font-semibold text-gray-600 text-right">Half Cart</th>
                    <th className="py-2 text-sm font-semibold text-gray-600 text-right">Full Cart</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-2 pr-4">9 Holes</td>
                    <td className="py-2 pr-4 text-right">$17.50</td>
                    <td className="py-2 text-right">$30.00</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">18 Holes</td>
                    <td className="py-2 pr-4 text-right">$25.00</td>
                    <td className="py-2 text-right">$40.00</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Other Rentals */}
          <div className="card mt-8">
            <h3 className="font-bold text-lg text-swan-green mb-4">Other Fees</h3>
            <table className="w-full text-left">
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Personal cart drop fee</td>
                  <td className="py-3 font-semibold text-right">$20.00</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Pull cart rental</td>
                  <td className="py-3 font-semibold text-right">$3.00</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Club rental (9 holes)</td>
                  <td className="py-3 font-semibold text-right">$15.00</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Club rental (18 holes)</td>
                  <td className="py-3 font-semibold text-right">$20.00</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Driving Range */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title text-center">Driving Range</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-lg mx-auto">
          <div className="card text-center">
            <h3 className="font-bold text-lg mb-1">Small Bag</h3>
            <p className="text-3xl font-bold text-swan-green">$5</p>
          </div>
          <div className="card text-center">
            <h3 className="font-bold text-lg mb-1">Large Bag</h3>
            <p className="text-3xl font-bold text-swan-green">$7</p>
          </div>
        </div>
        <p className="text-center text-gray-500 text-sm mt-4">
          Closed Fridays 8am&ndash;10am in June and July for youth programs.
        </p>
      </section>

      {/* Memberships */}
      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="section-title text-center">Seasonal Memberships</h2>
          <p className="text-center text-gray-500 mb-8">Prices include tax. Season: May 1 &ndash; October 31.</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green">Junior Summer Pass</h3>
              <p className="text-sm text-gray-500 mb-2">Age 18 and under</p>
              <p className="text-3xl font-bold">$100</p>
            </div>
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green">Young Adult</h3>
              <p className="text-sm text-gray-500 mb-2">Ages 19&ndash;29</p>
              <p className="text-3xl font-bold">$445</p>
            </div>
            <div className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-swan-green">Single</h3>
                  <p className="text-3xl font-bold mt-1">$740</p>
                </div>
                <span className="bg-swan-gold/20 text-swan-gold-dark text-xs font-semibold px-2 py-1 rounded">
                  $100 gift card for new members
                </span>
              </div>
            </div>
            <div className="card">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-lg text-swan-green">Household</h3>
                  <p className="text-3xl font-bold mt-1">$962.50</p>
                </div>
                <span className="bg-swan-gold/20 text-swan-gold-dark text-xs font-semibold px-2 py-1 rounded">
                  $100 gift card for new members
                </span>
              </div>
            </div>
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green">Driving Range &mdash; Single</h3>
              <p className="text-3xl font-bold mt-1">$80</p>
            </div>
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green">Driving Range &mdash; Household</h3>
              <p className="text-3xl font-bold mt-1">$125</p>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-6">
            Seniors (75+) receive a 15% discount on membership fees.
          </p>

          <div className="text-center mt-8">
            <Link href="/memberships" className="btn-primary text-lg px-8 py-3">
              Purchase a Membership Online
            </Link>
          </div>
        </div>
      </section>

      {/* Private Cart Storage */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title text-center">Private Cart Storage</h2>
        <div className="card max-w-lg mx-auto">
          <table className="w-full text-left">
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4">Trail fee (seasonal)</td>
                <td className="py-3 font-semibold text-right">$120.00</td>
              </tr>
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4">Gas cart storage (annual)</td>
                <td className="py-3 font-semibold text-right">$200.00</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Electric cart storage (annual)</td>
                <td className="py-3 font-semibold text-right">$230.00</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
