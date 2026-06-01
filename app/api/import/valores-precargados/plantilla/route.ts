import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  // Forward subSistemaId / tareaId si vinieron como query params.
  const qs = request.nextUrl.searchParams.toString()
  const path = qs
    ? `/import/valores-precargados/plantilla?${qs}`
    : "/import/valores-precargados/plantilla"

  const res = await backendFetch(request, path)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type":
        res.headers.get("Content-Type") ??
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ??
        `attachment; filename="valores-precargados.xlsx"`,
    },
  })
}
