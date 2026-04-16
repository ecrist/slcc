import Link from "next/link";
import { getConfigValue } from "@/lib/admin";

export const dynamic = "force-dynamic";

async function rate(key: string, fallback: string): Promise<string> {
  const v = await getConfigValue(key);
  return v || fallback;
}

function fmt(val: string): string {
  const n = parseFloat(val);
  if (isNaN(n)) return `$${val}`;
  return `$${n.toFixed(2)}`;
}

export default async function RatesPage() {
  // Fetch all rates in parallel
  const [
    fee9, fee18, youthFee1618, youthFee1315,
    cmh9, cmf9, cmh18, cmf18,
    cnmh9, cnmf9, cnmh18, cnmf18,
    pullCart, personalDrop,
    club9, club18,
    storageTrail, storageGas, storageElectric,
    rangeSmall, rangeLarge,
  ] = await Promise.all([
    rate("green_fee_9_holes", "25"), rate("green_fee_18_holes", "35"),
    rate("green_fee_youth_16_18", "15"), rate("green_fee_youth_13_15", "10"),
    rate("cart_member_half_9", "10"), rate("cart_member_full_9", "17.50"),
    rate("cart_member_half_18", "15"), rate("cart_member_full_18", "25"),
    rate("cart_nonmember_half_9", "17.50"), rate("cart_nonmember_full_9", "30"),
    rate("cart_nonmember_half_18", "25"), rate("cart_nonmember_full_18", "40"),
    rate("pull_cart_fee", "3"), rate("personal_cart_drop_fee", "20"),
    rate("club_rental_9", "15"), rate("club_rental_18", "20"),
    rate("cart_storage_trail", "120"), rate("cart_storage_gas", "200"),
    rate("cart_storage_electric", "230"),
    rate("range_small_bag", "5"), rate("range_large_bag", "7"),
  ]);

  return (
    <div>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="section-title animate-fade-in-up">Rates &amp; Fees</h1>
        <p className="text-gray-600 mb-2 max-w-2xl animate-fade-in-up stagger-1">
          All pricing below reflects the current season and is subject to change. Here you&rsquo;ll find
          daily green fees, youth rates, cart and equipment rental fees, private cart storage, and driving range pricing.
        </p>
        <p className="text-gray-400 text-sm mb-6 animate-fade-in-up stagger-2">Prices include tax where applicable</p>
        <h2 className="section-title text-center mb-8 animate-fade-in-up stagger-2">Daily Green Fees</h2>
        <div className="card animate-fade-in-up stagger-3">
          <h3 className="font-bold text-lg text-swan-green mb-4">Adult Rates</h3>
          <table className="w-full text-left">
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4">9 Holes</td>
                <td className="py-3 font-semibold text-right">{fmt(fee9)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">18 Holes</td>
                <td className="py-3 font-semibold text-right">{fmt(fee18)}</td>
              </tr>
            </tbody>
          </table>

          <h3 className="font-bold text-lg text-swan-green mt-6 mb-4">Youth Rates</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Ages 16&ndash;18</td>
                  <td className="py-3 font-semibold text-right">{fmt(youthFee1618)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Ages 13&ndash;15</td>
                  <td className="py-3 font-semibold text-right">{fmt(youthFee1315)}</td>
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
        <Link
          href="/memberships"
          className="flex items-center justify-between mt-8 px-5 py-3 rounded-xl bg-gradient-to-r from-swan-green to-swan-green-light text-white shadow-md hover:shadow-lg transition-all group animate-fade-in-up stagger-4"
        >
          <span className="font-semibold text-sm">Looking for a seasonal membership?</span>
          <svg className="w-5 h-5 text-swan-gold group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
          </svg>
        </Link>
      </section>

      {/* Cart & Equipment Rentals */}
      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="section-title text-center mb-8">Cart &amp; Equipment Fees</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
                    <td className="py-2 pr-4 text-right">{fmt(cmh9)}</td>
                    <td className="py-2 text-right">{fmt(cmf9)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">18 Holes</td>
                    <td className="py-2 pr-4 text-right">{fmt(cmh18)}</td>
                    <td className="py-2 text-right">{fmt(cmf18)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

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
                    <td className="py-2 pr-4 text-right">{fmt(cnmh9)}</td>
                    <td className="py-2 text-right">{fmt(cnmf9)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-4">18 Holes</td>
                    <td className="py-2 pr-4 text-right">{fmt(cnmh18)}</td>
                    <td className="py-2 text-right">{fmt(cnmf18)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-8">
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green mb-4">Other Cart Fees</h3>
              <table className="w-full text-left">
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4">Pull cart rental</td>
                    <td className="py-3 font-semibold text-right">{fmt(pullCart)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">Personal cart drop fee</td>
                    <td className="py-3 font-semibold text-right">{fmt(personalDrop)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3 className="font-bold text-lg text-swan-green mb-4">Club Rentals</h3>
              <table className="w-full text-left">
                <tbody className="text-gray-700">
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4">9 Holes</td>
                    <td className="py-3 font-semibold text-right">{fmt(club9)}</td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4">18 Holes</td>
                    <td className="py-3 font-semibold text-right">{fmt(club18)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="card mt-8">
            <h3 className="font-bold text-lg text-swan-green mb-4">Private Cart Storage</h3>
            <table className="w-full text-left">
              <tbody className="text-gray-700">
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Trail fee (seasonal)</td>
                  <td className="py-3 font-semibold text-right">{fmt(storageTrail)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="py-3 pr-4">Gas cart storage (annual)</td>
                  <td className="py-3 font-semibold text-right">{fmt(storageGas)}</td>
                </tr>
                <tr>
                  <td className="py-3 pr-4">Electric cart storage (annual)</td>
                  <td className="py-3 font-semibold text-right">{fmt(storageElectric)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Driving Range */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title text-center mb-8">Driving Range</h2>
        <div className="card">
          <table className="w-full text-left">
            <tbody className="text-gray-700">
              <tr className="border-b border-gray-100">
                <td className="py-3 pr-4">Small Bag</td>
                <td className="py-3 font-semibold text-right">{fmt(rangeSmall)}</td>
              </tr>
              <tr>
                <td className="py-3 pr-4">Large Bag</td>
                <td className="py-3 font-semibold text-right">{fmt(rangeLarge)}</td>
              </tr>
            </tbody>
          </table>
          <p className="text-gray-500 text-sm mt-3">
            Closed Fridays 8am&ndash;10am in June and July for youth programs.
          </p>
        </div>
      </section>
    </div>
  );
}
