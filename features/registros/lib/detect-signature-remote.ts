"use client"

/**
 * Wrapper del endpoint server-side `POST /api/registros/detectar-firmas`. Reemplaza
 * el detector client-side (`detect-signature.ts` + rasterización pdfjs) por una
 * llamada al backend que resuelve ambos formatos (PDF e imagen) con el mismo
 * pipeline fiducial. Devuelve el mismo shape para no cambiar el consumo en la UI.
 */

export interface DetectSignatureRemoteResult {
  detected: boolean
  slotsDetectados: number
  slotsTotal: number
  slots: Array<{ indice: number; detected: boolean; densidadPct: number }>
  sinFiduciales: boolean
  umbralUsado: number | null
  error: string | null
}

const empty = (patch: Partial<DetectSignatureRemoteResult>): DetectSignatureRemoteResult => ({
  detected: false,
  slotsDetectados: 0,
  slotsTotal: 1,
  slots: [],
  sinFiduciales: false,
  umbralUsado: null,
  error: null,
  ...patch,
})

/**
 * Envía el archivo al backend para que rasterice (si es PDF) y detecte firmas.
 * El archivo va tal cual — sin pre-procesamiento en el browser.
 */
export async function detectSignatureRemote(
  file: File,
  cantidadSlots: number,
): Promise<DetectSignatureRemoteResult> {
  const N = Math.max(1, Math.floor(cantidadSlots || 1))

  const form = new FormData()
  form.append("archivo", file, file.name)
  form.append("cantidadSlots", String(N))

  let res: Response
  try {
    res = await fetch("/api/registros/detectar-firmas", {
      method: "POST",
      body: form,
    })
  } catch (err) {
    return empty({ slotsTotal: N, error: err instanceof Error ? err.message : "Error de red" })
  }

  const json = await res.json().catch(() => null) as { data?: {
    detected: boolean
    slotsDetectados: number
    slotsTotal: number
    slots: Array<{ indice: number; detected: boolean; densidadPct: number }>
    sinFiduciales: boolean
    umbralUsado: number
    error: string
  }; message?: string } | null

  if (!res.ok) {
    return empty({ slotsTotal: N, error: json?.message ?? `HTTP ${res.status}` })
  }

  const data = json?.data
  if (!data) return empty({ slotsTotal: N, error: "Respuesta vacía" })

  return {
    detected: !!data.detected,
    slotsDetectados: data.slotsDetectados ?? 0,
    slotsTotal: data.slotsTotal ?? N,
    slots: data.slots ?? [],
    sinFiduciales: !!data.sinFiduciales,
    umbralUsado: data.umbralUsado ?? null,
    error: data.error ?? null,
  }
}
