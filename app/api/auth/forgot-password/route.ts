import { NextRequest } from "next/server"

const API_URL = process.env.NEXT_PUBLIC_API_URL

// POST /api/auth/forgot-password — anónimo (no requiere token). Proxy directo al backend.
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await fetch(`${API_URL}/auth/forgot-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
