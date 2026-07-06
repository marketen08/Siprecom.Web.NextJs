import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/hitos-fases — hitos (RFC/RFSU/AOC) + fases por Nivel.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/avance/hitos-fases")
  const text = await res.text()
  let data: unknown
  try { data = JSON.parse(text) } catch { data = { message: text } }
  return Response.json(data, { status: res.status })
}
