import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"

export const EstadoDemoAvanceJob = {
  PENDIENTE:  1,
  EN_PROCESO: 2,
  COMPLETADO: 3,
  ERROR:      4,
} as const
export type EstadoDemoAvanceJobValue =
  (typeof EstadoDemoAvanceJob)[keyof typeof EstadoDemoAvanceJob]

export interface DemoAvanceInspeccion {
  proyectoId: string
  proyectoNombre: string
  subSistemas: number
  tareas: number
  tareasCompletadas: number
  registros: number
  pendientes: number
  tieneAvance: boolean
  tieneEstructura: boolean
  registrosDemo: number
  pendientesDemo: number
}

export interface DemoAvanceJob {
  id: string
  proyectoId: string
  proyectoNombre: string | null
  estado: EstadoDemoAvanceJobValue
  estadoTexto: string
  solicitadoPorId: string
  solicitadoPorNombre: string | null
  creadoEn: string
  fechaInicio: string | null
  fechaCompletado: string | null
  mensajeProgreso: string | null
  pasoActual: number
  totalPasos: number
  porcentajeAvance: number
  registrosCreados: number | null
  tareasCompletadas: number | null
  fechasRedistribuidas: number | null
  pendientesCreados: number | null
  mensajeError: string | null
}

export interface DemoAvanceBorradoRespuesta {
  registrosEliminados: number
  pendientesEliminados: number
  tareasResetadas: number
}

const QK_INSPECCION = (proyectoId: string) => ["mantenimiento", "avance-demo", "inspeccion", proyectoId] as const
const QK_JOB        = (jobId: string)      => ["mantenimiento", "avance-demo", "job", jobId] as const

/** GET /api/mantenimiento/avance-demo/inspeccion?proyectoId=X */
export function useGetAvanceDemoInspeccion(proyectoId: string | null) {
  return useQuery({
    queryKey: QK_INSPECCION(proyectoId ?? ""),
    enabled: !!proyectoId,
    queryFn: () => apiClient.get<DemoAvanceInspeccion>(
      "/api/mantenimiento/avance-demo/inspeccion",
      { proyectoId: proyectoId! },
    ),
  })
}

/** POST /api/mantenimiento/avance-demo/generar — encola job. */
export function useGenerarAvanceDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (proyectoId: string) =>
      apiClient.post<{ jobId: string; estado: EstadoDemoAvanceJobValue }>(
        "/api/mantenimiento/avance-demo/generar",
        { proyectoId },
      ),
    onSuccess: (_, proyectoId) => {
      qc.invalidateQueries({ queryKey: QK_INSPECCION(proyectoId) })
    },
  })
}

/**
 * GET /api/mantenimiento/avance-demo/jobs/{jobId} — polling cada 2s mientras
 * esté activo. Se detiene al llegar a COMPLETADO o ERROR.
 */
export function useGetAvanceDemoJob(jobId: string | null) {
  return useQuery<DemoAvanceJob>({
    queryKey: QK_JOB(jobId ?? ""),
    enabled: !!jobId,
    queryFn: () => apiClient.get<DemoAvanceJob>(`/api/mantenimiento/avance-demo/jobs/${jobId}`),
    refetchInterval: (q) => {
      const data = q.state.data as DemoAvanceJob | undefined
      if (!data) return 2000
      return data.estado === EstadoDemoAvanceJob.PENDIENTE ||
        data.estado === EstadoDemoAvanceJob.EN_PROCESO
        ? 2000
        : false
    },
  })
}

/** POST /api/mantenimiento/avance-demo/borrar — input pide nombre del proyecto. */
export function useBorrarAvanceDemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ proyectoId, confirmacionNombreProyecto }: {
      proyectoId: string
      confirmacionNombreProyecto: string
    }) =>
      apiClient.post<DemoAvanceBorradoRespuesta>(
        "/api/mantenimiento/avance-demo/borrar",
        { proyectoId, confirmacionNombreProyecto },
      ),
    onSuccess: (_, { proyectoId }) => {
      qc.invalidateQueries({ queryKey: QK_INSPECCION(proyectoId) })
    },
  })
}
