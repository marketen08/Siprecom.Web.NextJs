"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

import { useEficacia, useNoConformidadTransicion } from "../api/use-no-conformidades"
import { NC_ESTADO_IDS, type NoConformidadDetalle } from "../types"
import { useCanWrite } from "@/lib/use-roles"

/**
 * Panel de la acción que corresponde al estado actual del informe.
 *
 * Solo se muestra UNA acción por vez — la que el circuito habilita — más el
 * rechazo cuando está en revisión y la cancelación mientras no sea terminal.
 * Mostrar todas las acciones siempre obligaría al usuario a saber cuál aplica,
 * y el backend rechazaría el resto igual.
 *
 * La autorización fina (proyecto × acción × grupo) vive en el backend. Acá solo
 * se filtra por permiso de escritura: si el usuario no está autorizado, el
 * backend devuelve el error y se muestra.
 */
export function NcAccionesPanel({ nc }: { nc: NoConformidadDetalle }) {
  const canWrite = useCanWrite()
  const transicion = useNoConformidadTransicion()
  const eficacia = useEficacia()

  const [error, setError] = useState<string | null>(null)
  const [comentario, setComentario] = useState("")
  const [accionInmediata, setAccionInmediata] = useState("")
  const [causaRaiz, setCausaRaiz] = useState("")
  const [accionCorrectiva, setAccionCorrectiva] = useState("")
  const [planMejora, setPlanMejora] = useState("")
  const [objetivo, setObjetivo] = useState("")
  const [fechaEval, setFechaEval] = useState("")
  const [resultado, setResultado] = useState("")

  if (!canWrite) return null
  if (nc.esTerminal) {
    return (
      <p className="rounded bg-slate-50 p-3 text-sm text-muted-foreground">
        El informe está cerrado. No admite más acciones.
      </p>
    )
  }

  const pendiente = transicion.isPending || eficacia.isPending

  const onError = (e: unknown) => {
    const msg =
      (e as { body?: { message?: string } })?.body?.message ??
      (e as Error)?.message ??
      "No se pudo ejecutar la acción."
    setError(msg)
  }
  const opts = { onError, onSuccess: () => setError(null) }

  return (
    <div className="space-y-3 rounded border bg-slate-50/60 p-3">
      <h4 className="text-sm font-semibold">Acción disponible</h4>

      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}

      {/* EVALUACION → NUEVO */}
      {nc.estadoId === NC_ESTADO_IDS.EVALUACION && (
        <div className="space-y-2">
          <Label>Observación (opcional)</Label>
          <Textarea value={comentario} onChange={(e) => setComentario(e.target.value)} />
          <Button
            disabled={pendiente}
            onClick={() =>
              transicion.mutate(
                { id: nc.id, accion: "evaluar", body: { comentario } },
                opts,
              )
            }
          >
            Aceptar el informe
          </Button>
        </div>
      )}

      {/* NUEVO → INVESTIGACION */}
      {nc.estadoId === NC_ESTADO_IDS.NUEVO && (
        <div className="space-y-2">
          <Label>Acción inmediata de contención *</Label>
          <Textarea
            value={accionInmediata}
            onChange={(e) => setAccionInmediata(e.target.value)}
            placeholder="Qué se hizo para contener el problema ahora."
          />
          <Button
            disabled={pendiente || !accionInmediata.trim()}
            onClick={() =>
              transicion.mutate(
                {
                  id: nc.id,
                  accion: "accion-inmediata",
                  body: { accionInmediata, comentario },
                },
                opts,
              )
            }
          >
            Registrar y firmar
          </Button>
        </div>
      )}

      {/* INVESTIGACION → REVISION */}
      {nc.estadoId === NC_ESTADO_IDS.INVESTIGACION && (
        <div className="space-y-2">
          <Label>Causa raíz *</Label>
          <Textarea
            value={causaRaiz || nc.causaRaiz || ""}
            onChange={(e) => setCausaRaiz(e.target.value)}
            placeholder="Por qué pasó."
          />
          <Label>Acción correctiva *</Label>
          <Textarea
            value={accionCorrectiva || nc.accionCorrectiva || ""}
            onChange={(e) => setAccionCorrectiva(e.target.value)}
            placeholder="Qué se hace para corregirlo."
          />
          <Label>Plan de mejora</Label>
          <Textarea
            value={planMejora || nc.planMejora || ""}
            onChange={(e) => setPlanMejora(e.target.value)}
            placeholder="Qué se cambia para que no vuelva a pasar."
          />
          <Button
            disabled={
              pendiente ||
              !(causaRaiz || nc.causaRaiz) ||
              !(accionCorrectiva || nc.accionCorrectiva)
            }
            onClick={() =>
              transicion.mutate(
                {
                  id: nc.id,
                  accion: "investigacion",
                  body: {
                    causaRaiz: causaRaiz || nc.causaRaiz,
                    accionCorrectiva: accionCorrectiva || nc.accionCorrectiva,
                    planMejora: planMejora || nc.planMejora,
                    comentario,
                  },
                },
                opts,
              )
            }
          >
            Enviar a revisión y firmar
          </Button>
        </div>
      )}

      {/* REVISION → aprobar o rechazar */}
      {nc.estadoId === NC_ESTADO_IDS.REVISION && (
        <div className="space-y-2">
          <Label>Observación / motivo</Label>
          <Textarea
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            placeholder="Al rechazar, el motivo es obligatorio y queda en el historial."
          />
          <div className="flex gap-2">
            <Button
              disabled={pendiente}
              onClick={() =>
                transicion.mutate(
                  { id: nc.id, accion: "aprobar", body: { comentario } },
                  opts,
                )
              }
            >
              Aprobar el cierre
            </Button>
            <Button
              variant="outline"
              disabled={pendiente || !comentario.trim()}
              onClick={() =>
                transicion.mutate(
                  { id: nc.id, accion: "rechazar", body: { comentario } },
                  opts,
                )
              }
            >
              Rechazar
            </Button>
          </div>
        </div>
      )}

      {/* INDICADOR_EFICACIA → ESPERA_RESULTADO */}
      {nc.estadoId === NC_ESTADO_IDS.INDICADOR_EFICACIA && (
        <div className="space-y-2">
          <Label>Qué se va a medir *</Label>
          <Textarea
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            placeholder="El indicador que prueba que la corrección sirvió."
          />
          <Label>Fecha de medición *</Label>
          <Input
            type="date"
            value={fechaEval}
            onChange={(e) => setFechaEval(e.target.value)}
          />
          <Button
            disabled={pendiente || !objetivo.trim() || !fechaEval}
            onClick={() =>
              eficacia.mutate(
                {
                  id: nc.id,
                  etapa: "objetivo",
                  body: {
                    objetivoEficacia: objetivo,
                    fechaEvaluacionEficacia: fechaEval,
                    comentario,
                  },
                },
                opts,
              )
            }
          >
            Definir y firmar
          </Button>
        </div>
      )}

      {/* ESPERA_RESULTADO → FINALIZADO (y encadena si no fue eficaz) */}
      {nc.estadoId === NC_ESTADO_IDS.ESPERA_RESULTADO && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            Medición prevista para {fecha(nc.fechaEvaluacionEficacia)}. Objetivo:{" "}
            {nc.objetivoEficacia}
          </p>
          <Label>Resultado de la medición *</Label>
          <Textarea value={resultado} onChange={(e) => setResultado(e.target.value)} />
          <div className="flex gap-2">
            <Button
              disabled={pendiente || !resultado.trim()}
              onClick={() =>
                eficacia.mutate(
                  {
                    id: nc.id,
                    etapa: "resultado",
                    body: { resultadoEficacia: resultado, fueEficaz: true, comentario },
                  },
                  opts,
                )
              }
            >
              Fue eficaz — cerrar
            </Button>
            <Button
              variant="outline"
              disabled={pendiente || !resultado.trim()}
              title="Cierra este informe y genera uno nuevo encadenado"
              onClick={() =>
                eficacia.mutate(
                  {
                    id: nc.id,
                    etapa: "resultado",
                    body: { resultadoEficacia: resultado, fueEficaz: false, comentario },
                  },
                  opts,
                )
              }
            >
              No fue eficaz
            </Button>
          </div>
        </div>
      )}

      {/* Cancelación: disponible en cualquier estado no terminal */}
      <div className="pt-2">
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive"
          disabled={pendiente || !comentario.trim()}
          title="Requiere motivo en el campo de observación"
          onClick={() =>
            transicion.mutate(
              { id: nc.id, accion: "cancelar", body: { comentario } },
              opts,
            )
          }
        >
          Cancelar informe
        </Button>
      </div>
    </div>
  )
}

function fecha(v: string | null | undefined) {
  if (!v) return "—"
  const [y, m, d] = v.slice(0, 10).split("-")
  return `${d}/${m}/${y}`
}
