import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/usuarios/me/firma")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function POST(request: NextRequest) {
  const fd = await request.formData()
  const res = await backendFetch(request, "/usuarios/me/firma", {
    method: "POST",
    body: fd,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function DELETE(request: NextRequest) {
  const res = await backendFetch(request, "/usuarios/me/firma", {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
