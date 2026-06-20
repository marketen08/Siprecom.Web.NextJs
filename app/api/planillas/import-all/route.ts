import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(request: NextRequest) {
  const body = await request.json()
  const omitir = request.nextUrl.searchParams.get("omitirExistentes") === "true"
  const path = `/planillas/import-all${omitir ? "?omitirExistentes=true" : ""}`
  const res = await backendFetch(request, path, {
    method: "POST",
    body: JSON.stringify(body),
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
