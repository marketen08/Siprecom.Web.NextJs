import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/usuarios/excel?<los mismos filtros que GET /api/usuarios> — devuelve el .xlsx.
//
// El listado paginado va a /auth/paged, así que el Excel es /auth/paged/excel: son
// la misma consulta y el backend comparte el armado de la query entre las dos.
export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/auth/paged/excel${search}`)
  if (!res.ok) {
    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "text/plain" },
    })
  }
  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? `attachment; filename="usuarios.xlsx"`,
    },
  })
}
