import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/usuarios/[id]/login-method  Body: { loginMethod: 0|1 }
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/auth/users/${id}/login-method`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
