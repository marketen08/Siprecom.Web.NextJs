import { NextRequest } from "next/server"
import { headersIpCliente } from "@/lib/server/ip-cliente"

const API_URL = process.env.API_URL

// POST /api/auth/reset-password — anónimo (define/restablece con el token del email).
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await fetch(`${API_URL}/auth/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headersIpCliente(request) },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
