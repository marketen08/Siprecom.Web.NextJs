"use client"

import { useMemo } from "react"
import { PublicClientApplication } from "@azure/msal-browser"
import { MsalProvider as MsalProviderLib } from "@azure/msal-react"
import { msalConfig } from "@/lib/msal-config"

export function MsalProviderClient({ children }: { children: React.ReactNode }) {
  // useMemo asegura que PublicClientApplication se cree una sola vez por mount.
  // En SSR `window` no existe; el constructor usa redirectUri en config (resuelto ahí).
  const instance = useMemo(() => new PublicClientApplication(msalConfig), [])

  return <MsalProviderLib instance={instance}>{children}</MsalProviderLib>
}
