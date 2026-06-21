import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/catalogos/export-all → JSON con especialidades + tipos de elemento. Solo SuperAdmin (backend).
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/catalogos/export-all")
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="catalogos.json"`,
    },
  })
}
