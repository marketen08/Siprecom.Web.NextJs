export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Bienvenido al panel de control de Siprecom
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Sistemas", value: "—" },
          { label: "Subsistemas", value: "—" },
          { label: "Elementos", value: "—" },
          { label: "Pendientes", value: "—" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-1"
          >
            <span className="text-sm text-gray-500">{stat.label}</span>
            <span className="text-3xl font-bold text-blue-900">{stat.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
