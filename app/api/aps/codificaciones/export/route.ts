import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

/**
 * POST /api/aps/codificaciones/export → proxy a POST /aps/codificaciones/export.
 *
 * Devuelve el .xlsx del reporte de codificaciones. Lo armaba el navegador con la
 * librería `xlsx` (SheetJS); se movió al backend para poder sacar esa
 * dependencia, que arrastra dos vulnerabilidades HIGH sin fix en npm.
 *
 * Proxea el binario y sus headers sin tocarlos, igual que las otras descargas
 * (ver app/api/pendientes-catalogo/import/plantilla).
 */
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) return Response.json({ message: "No autenticado" }, { status: 401 })

  const body = await request.text()
  const res = await fetch(`${BACKEND_URL}/aps/codificaciones/export`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body,
  })

  if (!res.ok) {
    const texto = await res.text()
    return Response.json(
      { message: `No se pudo generar el Excel (${res.status}): ${texto.slice(0, 300)}` },
      { status: res.status },
    )
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type":
        res.headers.get("content-type") ??
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": res.headers.get("content-disposition") ?? "attachment",
    },
  })
}
