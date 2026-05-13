import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/reportes/cuantitativo-subsistemas/pdf
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/reportes/cuantitativo-subsistemas/pdf")
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ??
        `attachment; filename="cuantitativo-subsistemas.pdf"`,
    },
  })
}
