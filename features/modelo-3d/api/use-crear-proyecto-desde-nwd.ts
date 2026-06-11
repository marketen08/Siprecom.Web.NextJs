import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { ApiResponse } from "@/features/proyectos/types"
import type {
  CrearProyectoDesdeIfcInput,
  CrearProyectoDesdeIfcOutput,
  NwdUploadSas,
} from "../types"

/**
 * Crea un Proyecto nuevo a partir de un NWD (Plant 3D / Navisworks) en 3 pasos,
 * SIN pasar el binario por ningún proxy (evita 413/502 del gateway de Railway/SWA):
 *
 *   1. Pide una SAS de subida al backend (request chica).
 *   2. Sube el NWD DIRECTO a Azure Blob con la SAS (browser → Azure, sin proxy).
 *   3. Crea el proyecto referenciando el blob ya subido (request chica). El worker
 *      lo levanta del blob, lo sube a APS OSS, traduce y bootstrapea en background.
 *
 * Misma interfaz pública que antes — el componente no cambia. `isPending` cubre
 * los 3 pasos (el más largo es el PUT directo al blob).
 *
 * Requiere CORS habilitado en la cuenta de Storage para el origen del frontend
 * (PUT + header x-ms-blob-type).
 */
export function useCrearProyectoDesdeNwd() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: CrearProyectoDesdeIfcInput): Promise<CrearProyectoDesdeIfcOutput> => {
      // ─── 1. Pedir la SAS de subida ──────────────────────────────────────
      const sasRes = await fetch(`/api/aps/nwd-upload-sas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombreArchivo: input.archivo.name }),
      })
      const sasBody = await sasRes.json().catch(() => ({}))
      if (!sasRes.ok) throw new Error(formatError(sasBody, "No se pudo iniciar la subida."))
      const sas = (sasBody as ApiResponse<NwdUploadSas>)?.data
      if (!sas?.uploadUrl) throw new Error("Respuesta inválida del servidor (sin URL de subida).")

      // ─── 2. PUT del binario DIRECTO a Azure Blob (sin proxy) ────────────
      const putRes = await fetch(sas.uploadUrl, {
        method: "PUT",
        headers: {
          "x-ms-blob-type": "BlockBlob",
          "Content-Type": "application/octet-stream",
        },
        body: input.archivo,
      })
      if (!putRes.ok) {
        // 403 acá suele ser SAS expirada o CORS mal configurado en el storage.
        throw new Error(
          `Error subiendo el archivo al storage (HTTP ${putRes.status}). ` +
            `Si persiste, revisá CORS en la cuenta de Storage.`,
        )
      }

      // ─── 3. Crear el proyecto referenciando el blob ya subido ───────────
      const createRes = await fetch(`/api/aps/crear-proyecto-desde-nwd-staged`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: input.nombre,
          clienteId: input.clienteId,
          contratistaId: input.contratistaId,
          nombreArchivo: input.nombreArchivo,
          disciplina: input.disciplina,
          apsTagProperties: input.apsTagProperties,
          archivoId: sas.archivoId,
          blobName: sas.blobName,
          nombreArchivoOriginal: input.archivo.name,
        }),
      })
      const createBody = await createRes
        .json()
        .catch(() => ({ message: "Error creando proyecto desde NWD" }))
      if (!createRes.ok) throw new Error(formatError(createBody, "Error creando proyecto desde NWD"))
      const data = (createBody as ApiResponse<CrearProyectoDesdeIfcOutput>)?.data
      if (!data?.proyectoId) throw new Error("Respuesta inválida del servidor.")
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["proyectos"] })
    },
  })
}

function formatError(body: any, fallback: string): string {
  if (Array.isArray(body?.errors)) {
    const lineas = body.errors.flatMap((e: any) =>
      Array.isArray(e?.errors)
        ? e.errors.map((m: string) => (e.field ? `${e.field}: ${m}` : m))
        : [],
    )
    if (lineas.length > 0) return lineas.join("\n")
  }
  return body?.message ?? fallback
}
