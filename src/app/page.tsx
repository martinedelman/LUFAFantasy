export default function Home() {
  return (
    <div className="bg-gradient-to-b from-green-50 to-green-100 min-h-screen">
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Sistema de Gestión de Flag Football</h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Administra torneos, equipos, jugadores y estadísticas de manera profesional. Una plataforma
            completa para ligas de Flag Football.
          </p>
        </div>

        {/* Dashboard Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Torneos Activos</h3>
                <p className="text-3xl font-bold text-blue-600">3</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Equipos Registrados</h3>
                <p className="text-3xl font-bold text-green-600">24</p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-yellow-500">
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Jugadores Activos</h3>
                <p className="text-3xl font-bold text-yellow-600">168</p>
              </div>
              <div className="bg-yellow-100 p-3 rounded-full">
                <svg
                  className="w-6 h-6 text-yellow-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-red-500">
            <div className="flex items-center">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">Partidos Jugados</h3>
                <p className="text-3xl font-bold text-red-600">45</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity & Quick Links */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Games */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Próximos Partidos</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold">Halcones vs Águilas</p>
                  <p className="text-sm text-gray-600">División Masculino A</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Sábado 15:00</p>
                  <p className="text-sm text-gray-600">Campo Central</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold">Lobos vs Tigres</p>
                  <p className="text-sm text-gray-600">División Masculino B</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Domingo 10:00</p>
                  <p className="text-sm text-gray-600">Campo Norte</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold">Panteras vs Leones</p>
                  <p className="text-sm text-gray-600">División Femenino</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">Domingo 12:30</p>
                  <p className="text-sm text-gray-600">Campo Sur</p>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Mejores Jugadores</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold">
                    JR
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold">Juan Rodríguez</p>
                    <p className="text-sm text-gray-600">QB - Halcones</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">15 TD</p>
                  <p className="text-sm text-gray-600">Pases</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white font-bold">
                    AM
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold">Ana María López</p>
                    <p className="text-sm text-gray-600">WR - Panteras</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">12 TD</p>
                  <p className="text-sm text-gray-600">Recepciones</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center text-white font-bold">
                    CM
                  </div>
                  <div className="ml-3">
                    <p className="font-semibold">Carlos Mendoza</p>
                    <p className="text-sm text-gray-600">LB - Águilas</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold">8 INT</p>
                  <p className="text-sm text-gray-600">Intercepciones</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <p className="text-gray-400">© 2025 LUFA Fantasy - Sistema de Gestión de Flag Football</p>
            <p className="text-sm text-gray-500 mt-2">Desarrollado con Next.js, TypeScript y MongoDB</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
