/**
 * El callback de APS es una ruta autenticada, así que queda fuera del
 * prerenderizado estático como el resto (hallazgo #2 del pentest).
 *
 * Va acá y no en la page porque esa es un client component, y el segment config
 * sólo lo lee Next en Server Components: puesto ahí se ignora en silencio.
 */
export const dynamic = "force-dynamic"

export default function ApsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
