export default function ConciertosDeBesmaya() {
  const concerts = [
    { city: "VALENCIA", date: "30/01/2026", link: "https://feverup.com/m/473770" },
    { city: "ZARAGOZA", date: "31/01/2026", link: "https://feverup.com/m/473764" },
    { city: "A CORUÑA", date: "06/02/2026", link: "https://feverup.com/m/473776" },
    { city: "OVIEDO", date: "07/02/2026", link: "https://feverup.com/m/473778" },
    {
      city: "MADRID",
      date: "13/02/2026",
      link: "https://www.ticketmaster.es/event/1165738819?subchannel_id=11808&brand=base_mb_es",
    },
    { city: "MURCIA", date: "19/02/2026", link: "https://feverup.com/m/473781" },
    { city: "GRANADA", date: "05/03/2026", link: "https://feverup.com/m/473783" },
    { city: "CORDOBA", date: "06/03/2026", link: "https://feverup.com/m/473792" },
    { city: "PAMPLONA", date: "19/03/2026", link: "https://feverup.com/m/473782" },
    { city: "VALLADOLID", date: "21/03/2026", link: "https://feverup.com/m/473780" },
  ]

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl md:text-4xl font-bold text-center mb-6 md:mb-8">Conciertos de Besmaya</h1>

        <div className="hidden md:block bg-white rounded-lg shadow-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-100 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">City</th>
                <th className="px-6 py-4 text-left text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Event Date
                </th>
                <th className="px-6 py-4 text-center text-sm font-bold text-gray-700 uppercase tracking-wider">
                  Tickets
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {concerts.map((concert, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">{concert.city}</td>
                  <td className="px-6 py-4 text-sm text-gray-700">{concert.date}</td>
                  <td className="px-6 py-4 text-center">
                    <a
                      href={concert.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg transition-colors"
                    >
                      Comprar Tickets
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="md:hidden space-y-4">
          {concerts.map((concert, index) => (
            <div key={index} className="bg-white rounded-lg shadow-lg p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-gray-900 mb-2">{concert.city}</h2>
                <p className="text-gray-600 text-lg">{concert.date}</p>
              </div>
              <a
                href={concert.link}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors text-center"
              >
                Comprar Tickets
              </a>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
