import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/downloads/win-local/installer — proxy binario del installer de la
// app de escritorio (Velopack Setup.exe). Auth requerida; el backend valida.
export async function GET(request: NextRequest) {
  // Forwardeamos ?from=<origen> al backend para que codifique el URL en el
  // filename del installer. Ver page.tsx de app-escritorio y DownloadsController.
  const from = request.nextUrl.searchParams.get("from") ?? ""
  const qs = from ? `?from=${encodeURIComponent(from)}` : ""
  const res = await backendFetch(request, `/downloads/win-local/installer${qs}`)
  if (!res.ok) {
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    })
  }
  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? `attachment; filename="Siprecom-Setup.exe"`,
    },
  })
}
