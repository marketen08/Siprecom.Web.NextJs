import Link from "next/link"
import { BarChart3, BarChart, LineChart, PieChart } from "lucide-react"

const tarjetas = [
  {
    href: "/estadisticas/avance-subsistemas",
    titulo: "Avance por subsistemas",
    descripcion: "% de avance de cada subsistema en barras horizontales.",
    Icon: BarChart3,
  },
  {
    href: "/estadisticas/cuantitativo-subsistemas",
    titulo: "Cuantitativo por subsistemas",
    descripcion: "Cantidad de elementos por subsistema.",
    Icon: BarChart,
  },
  {
    href: "/estadisticas/avance-programado",
    titulo: "Avance programado",
    descripcion: "Curva S: programado vs completado por semana.",
    Icon: LineChart,
  },
  {
    href: "/estadisticas/estado-pendientes",
    titulo: "Estado de pendientes",
    descripcion: "Distribución de pendientes abiertos por estado, especialidad y categoría.",
    Icon: PieChart,
  },
]

export default function EstadisticasHubPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estadísticas</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Indicadores gráficos del proyecto activo.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tarjetas.map(({ href, titulo, descripcion, Icon }) => (
          <Link
            key={href}
            href={href}
            className="group rounded-xl border border-gray-200 bg-white shadow-sm p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/40"
          >
            <div className="flex items-start gap-3">
              <span className="rounded-lg bg-blue-50 p-2 text-blue-700 group-hover:bg-blue-100">
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 className="font-semibold text-gray-900">{titulo}</h2>
                <p className="text-sm text-muted-foreground mt-0.5">{descripcion}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
