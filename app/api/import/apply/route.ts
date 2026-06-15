import { NextRequest } from "next/server"

const BACKEND_URL = process.env.API_URL

// POST /api/import/apply  (multipart/form-data)
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  if (!accessToken) {
    return Response.json({ message: "No autenticado" }, { status: 401 })
  }

  const formData = await request.formData()
  const res = await fetch(`${BACKEND_URL}/import/apply`, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}` },
    body: formData,
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
