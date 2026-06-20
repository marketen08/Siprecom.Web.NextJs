import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const dest = request.nextUrl.searchParams.get("proyectoDestinoId") ?? ""
  const modo = request.nextUrl.searchParams.get("modo") ?? "omitir"
  const res = await backendFetch(
    request,
    `/migracion/tareas/import?proyectoDestinoId=${encodeURIComponent(dest)}&modo=${encodeURIComponent(modo)}`,
    { method: "POST", body: JSON.stringify(body) },
  )
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
