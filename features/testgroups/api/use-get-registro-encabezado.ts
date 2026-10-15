import { useQuery } from "@tanstack/react-query"
import { apiClient } from "@/lib/api-client"
import type { ApiResponse } from "@/features/proyectos/types"
import type { EstadoRegistro } from "./use-get-tareas-pack"

export interface TestGroupEncabezadoValor {
  planillaCampoId: string
  etiqueta: string
  orden: number
  /** Tipo de dato del campo (para formateo si lo necesita el front). */
  tipoDato: number
  /** Valor ya formateado para display (fechas ISO, bools "Sí"/"No", nums con "."). */
  valor: string
}

export interface TestGroupRegistroEncabezado {
  registroId: string
  planillaId: string
  planillaCodigo: string | null
  planillaNombre: string | null
  estado: EstadoRegistro
  porcentajeCompletitud: number
  /** Campos con valor cargado, en orden. Vacío si el encabezado no fue completado. */
  valores: TestGroupEncabezadoValor[]
}

/**
 * Registro que captura la metadata del encabezado del pack. Se crea al
 * momento de crear el TG si el ElementoTipo sintético tiene planilla asignada.
 * El backend devuelve `data: null` si el pack no tiene planilla configurada —
 * la UI usa esa señal para no mostrar el botón "Editar encabezado".
 */
export function useGetTestGroupRegistroEncabezado(testGroupId: string | null) {
  return useQuery({
    queryKey: ["testgroups", testGroupId, "registro-encabezado"],
    queryFn: () =>
      apiClient.get<ApiResponse<TestGroupRegistroEncabezado | null>>(
        `/api/testgroups/${testGroupId}/registro-encabezado`,
      ),
    enabled: !!testGroupId,
  })
}
