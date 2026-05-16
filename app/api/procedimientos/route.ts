import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/procedimientos${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/procedimientos  (multipart/form-data)
// Reenvía el FormData (texto + PDF opcional) al backend tal cual. backend-fetch detecta
// FormData y no setea Content-Type, dejando que fetch ponga el boundary correcto.
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const res = await backendFetch(request, "/procedimientos", {
    method: "POST",
    body: formData,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
