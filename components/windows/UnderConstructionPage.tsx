export function UnderConstructionPage({ onToggle }: { onToggle: () => void }) {
  return (
    <div className="h-screen w-screen bg-gradient-to-br from-blue-900 via-purple-900 to-black flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fillRule=evenodd%3E%3Cg fill=%23ffffff fillOpacity=0.1%3E%3Ccircle cx=30 cy=30 r=2/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]"></div>
      </div>

      <div className="text-center z-10 max-w-2xl mx-auto px-6">
        <div className="mb-8">
          <h1 className="text-6xl md:text-8xl font-bold text-white mb-4 tracking-wider">BESMAYA</h1>
          <div className="w-32 h-1 bg-gradient-to-r from-purple-400 to-pink-400 mx-auto"></div>
        </div>

        <div className="mb-12">
          <h2 className="text-2xl md:text-4xl text-gray-300 mb-6 font-light">Sitio en Construcción</h2>
          <p className="text-lg text-gray-400 leading-relaxed max-w-lg mx-auto">
            Estamos trabajando en algo increíble. Muy pronto podrás disfrutar de una experiencia única.
          </p>
        </div>

        <div className="mb-12">
          <div className="flex justify-center space-x-6">
            <a
              href="https://merchandtour.com/besmaya/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full hover:from-purple-700 hover:to-pink-700 transition-all duration-300 transform hover:scale-105"
            >
              Merchan
            </a>
            <a
              href="/conciertos"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105"
            >
              Entradas
            </a>
          </div>
        </div>

        <div className="text-gray-500 text-sm">
          <p>Próximamente...</p>
        </div>
      </div>

      <button
        onClick={onToggle}
        className="absolute bottom-4 right-4 opacity-0 hover:opacity-50 text-white text-xs px-2 py-1 bg-black bg-opacity-50 rounded"
        title="Press Ctrl+Shift+C to toggle"
      >
        Admin
      </button>
    </div>
  )
}
