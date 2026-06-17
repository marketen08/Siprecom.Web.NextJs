import { NextResponse } from "next/server"

// Config de auth resuelta en RUNTIME (no build-time). El browser la consulta
// antes de instanciar MSAL. Misma idea que API_URL: estas vars van como
// Application Settings del SWA POR SITIO (sin NEXT_PUBLIC), así un único build
// sirve a N clientes sin re-buildear ni administrar variables en GitHub.
//
// clientId/tenantId NO son secretos (igual viajan al browser dentro del bundle
// de MSAL), por eso devolverlos por este endpoint es inocuo.
export const dynamic = "force-dynamic"

export async function GET() {
  const clientId = process.env.MICROSOFT_CLIENT_ID ?? ""
  const tenantId = process.env.MICROSOFT_TENANT_ID ?? "common"
  return NextResponse.json({ clientId, tenantId })
}
