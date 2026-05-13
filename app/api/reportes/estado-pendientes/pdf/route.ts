import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/reportes/estado-pendientes/pdf?soloAbiertos=true
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams
  const soloAbiertos = sp.get("soloAbiertos")
  const path = soloAbiertos !== null
    ? `/reportes/estado-pendientes/pdf?soloAbiertos=${soloAbiertos}`
    : "/reportes/estado-pendientes/pdf"

  const res = await backendFetch(request, path)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ??
        `attachment; filename="estado-pendientes.pdf"`,
    },
  })
}
