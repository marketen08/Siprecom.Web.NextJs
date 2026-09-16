import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

/**
 * POST /api/planillas/excel-matriz → proxy a POST /planillas/excel/matriz.
 *
 * Devuelve la primera hoja del .xlsx como matriz de strings. Existe para que el
 * parseo lo haga el backend con ClosedXML y no el navegador con la librería
 * `xlsx` (SheetJS), que tiene dos vulnerabilidades HIGH sin fix en npm y las dos
 * se disparan al parsear un archivo.
 *
 * Mismo patrón que los otros importadores (ver app/api/import/tareas/preview).
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return Response.json({ message: "No autenticado" }, { status: 401 })

  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/planillas/excel/matriz`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
  })

  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 500)}` },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
