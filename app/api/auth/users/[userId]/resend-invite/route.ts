import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/auth/users/[userId]/resend-invite — admin reenvía invitación/bienvenida.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  const { userId } = await context.params
  const res = await backendFetch(request, `/auth/users/${userId}/resend-invite`, { method: "POST" })
  const data = await res.json().catch(() => ({ message: "Error al reenviar" }))
  return Response.json(data, { status: res.status })
}
