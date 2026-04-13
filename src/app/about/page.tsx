export default function AboutPage() {
  return (
    <div>
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="section-title">About Swan Lake</h1>
        <p className="text-gray-500 mb-10">Established 1929 &middot; Pengilly, Minnesota</p>
        <div className="prose prose-lg max-w-none text-gray-700">
          <p>
            Swan Lake Country Club was established in 1929. It is an incorporated golf course,
            serving the public as well as its membership. Swan Lake Country Club&apos;s bucolic setting
            features numerous changes in elevation including elevated greens, beautiful variety of
            old growth trees, water features, sand traps, and old town charm. And you&apos;re likely to
            see wildlife while you play your round. With golf carts available to rent, you can
            choose to ride or walk the course. The clubhouse was put in place in 1939 and offers
            food and beverages; a great place to sit and relax before or after your round, or
            anytime. SLCC has long been a meeting place for golfers as well as community members
            at events hosted onsite throughout the season.
          </p>
        </div>
      </section>

      {/* Leadership */}
      <section className="bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="section-title text-center mb-8">Personnel</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
            <div className="card text-center">
              <h3 className="font-bold text-lg text-swan-green">Club Manager</h3>
              <p className="text-xl mt-2">Laurie Chellico</p>
              <a href="tel:+12188853543" className="text-swan-green hover:underline text-sm mt-1 inline-block">(218) 885-3543</a>
              <p className="text-gray-500 text-sm mt-1">2024 &ndash; Current</p>
            </div>
            <div className="card text-center">
              <h3 className="font-bold text-lg text-swan-green">Course Superintendent</h3>
              <p className="text-xl mt-2">Ed Pietila</p>
              <p className="text-gray-500 text-sm mt-1">2024 &ndash; Current</p>
            </div>
            <div className="card text-center">
              <h3 className="font-bold text-lg text-swan-green">President</h3>
              <p className="text-xl mt-2">Mike Anderson</p>
              <a href="tel:+12189691450" className="text-swan-green hover:underline text-sm mt-1 inline-block">(218) 969-1450</a>
              <p className="text-gray-500 text-sm mt-1">2025 &ndash; 2027</p>
            </div>
          </div>

          <div className="card">
            <h3 className="text-xl font-bold text-swan-green mb-4 text-center">Board of Directors</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="py-3 pr-4 font-semibold text-gray-700">Name</th>
                    <th className="py-3 pr-4 font-semibold text-gray-700">Year Elected</th>
                    <th className="py-3 pr-4 font-semibold text-gray-700">Term Expires</th>
                    <th className="py-3 pr-4 font-semibold text-gray-700">Phone</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600">
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium">Jamie Wright</td>
                    <td className="py-3 pr-4">2025</td>
                    <td className="py-3 pr-4">2028</td>
                    <td className="py-3 pr-4"><a href="tel:+12189108131" className="text-swan-green hover:underline">(218) 910-8131</a></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium">Deb Bruns</td>
                    <td className="py-3 pr-4">2025</td>
                    <td className="py-3 pr-4">2028</td>
                    <td className="py-3 pr-4"><a href="tel:+12183982982" className="text-swan-green hover:underline">(218) 398-2982</a></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium">Lisa Peratalo</td>
                    <td className="py-3 pr-4">2024</td>
                    <td className="py-3 pr-4">2027</td>
                    <td className="py-3 pr-4"><a href="tel:+12189290920" className="text-swan-green hover:underline">(218) 929-0920</a></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium">Justin Gustafson</td>
                    <td className="py-3 pr-4">2024</td>
                    <td className="py-3 pr-4">2027</td>
                    <td className="py-3 pr-4"><a href="tel:+12183435375" className="text-swan-green hover:underline">(218) 343-5375</a></td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="py-3 pr-4 font-medium">Jake Castle</td>
                    <td className="py-3 pr-4">2023</td>
                    <td className="py-3 pr-4">2026</td>
                    <td className="py-3 pr-4"><a href="tel:+17637723532" className="text-swan-green hover:underline">(763) 772-3532</a></td>
                  </tr>
                  <tr>
                    <td className="py-3 pr-4 font-medium">Joe Gabardi</td>
                    <td className="py-3 pr-4">2023</td>
                    <td className="py-3 pr-4">2026</td>
                    <td className="py-3 pr-4"><a href="tel:+12189695841" className="text-swan-green hover:underline">(218) 969-5841</a></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h2 className="section-title text-center mb-8">Contact Info</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <a href="tel:+12188853543" className="card text-center hover:shadow-lg transition-shadow">
            <svg className="h-8 w-8 text-swan-green mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
            </svg>
            <p className="font-semibold text-swan-green">(218) 885-3543</p>
          </a>
          <a href="mailto:golf@swanlakecc.com" className="card text-center hover:shadow-lg transition-shadow">
            <svg className="h-8 w-8 text-swan-green mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            <p className="font-semibold text-swan-green">golf@swanlakecc.com</p>
          </a>
          <a href="https://goo.gl/maps/eavaLfnd1zQdaPLD6" target="_blank" rel="noopener noreferrer" className="card text-center hover:shadow-lg transition-shadow">
            <svg className="h-8 w-8 text-swan-green mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
            </svg>
            <p className="font-semibold text-swan-green">Get Directions</p>
          </a>
        </div>
      </section>
    </div>
  );
}
