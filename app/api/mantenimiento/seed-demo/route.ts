import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/mantenimiento/seed-demo → { demoSeeded }. Solo SuperAdmin (backend).
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/mantenimiento/seed-demo")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/mantenimiento/seed-demo?limpiarAntes= → carga los datos de muestra.
export async function POST(request: NextRequest) {
  const limpiar = request.nextUrl.searchParams.get("limpiarAntes") === "true"
  const res = await backendFetch(request, `/mantenimiento/seed-demo${limpiar ? "?limpiarAntes=true" : ""}`, {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
