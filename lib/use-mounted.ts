import { useSyncExternalStore } from "react"

const emptySubscribe = () => () => {}

/**
 * True solo en el cliente (tras la hidratación), false en SSR y en el primer
 * render del cliente. Hydration-safe y sin `setState` dentro de un effect
 * (evita la regla react-hooks/set-state-in-effect). Útil para diferir lógica
 * que depende del estado persistido en el browser (ej. roles del auth store).
 */
export function useMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  )
}
