"use client"

import { useState } from "react"
import Link from "next/link"
import { AlertTriangle, ExternalLink, Sparkles } from "lucide-react"

import { useOpenElemento } from "../hooks/use-open-elemento"
import { useGetElemento } from "../api/use-get-elemento"
import { useUpdateElemento } from "../api/use-update-elemento"
import { ElementoForm } from "./elemento-form"
import { ElementoValoresPrecargadosDialog } from "./elemento-valores-precargados-dialog"
import type { Elemento } from "../types"
import type { ElementoFormValues } from "../schema"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"

export function EditElementoSheet() {
  const { id, isOpen, close } = useOpenElemento()
  const { data, isLoading } = useGetElemento(id)
  const mutation = useUpdateElemento(id ?? "")
  const [valoresOpen, setValoresOpen] = useState(false)

  const elemento = data?.data

  const onSubmit = (values: ElementoFormValues) => {
    mutation.mutate(
      {
        ...values,
        proyectoId: elemento!.proyectoId,
        terminalId: elemento!.terminalId,
        codigo: elemento!.codigo,
      },
      { onSuccess: close }
    )
  }

  return (
    <>
      <Sheet open={isOpen} onOpenChange={close}>
        <SheetContent className="w-full sm:max-w-2xl! overflow-y-auto">
          <SheetHeader>
            <SheetTitle>
              {elemento?.esSintetico ? "Elemento (Test Group)" : "Editar elemento"}
            </SheetTitle>
            <SheetDescription>
              {elemento?.esSintetico
                ? "Solo lectura — los datos del pack se gestionan desde el detalle del Test Group."
                : "Modificá los datos del elemento."}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 px-4 pb-6">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Cargando...</p>
            ) : elemento && elemento.esSintetico ? (
              // Elemento sintético: portador de un TestGroup. Todo readonly + link
              // al detalle del pack. El backend rechaza el PUT si esto se bypasea.
              <ElementoSinteticoReadonly elemento={elemento} onClose={close} />
            ) : elemento ? (
              <div className="space-y-6">
                <ElementoForm
                  defaultValues={elemento}
                  onSubmit={onSubmit}
                  isPending={mutation.isPending}
                  onCancel={close}
                />
                <Separator />
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Valores precargados
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Datos que vienen rellenados al iniciar el registro digital y se imprimen
                    en la planilla PDF en blanco. Se aplican a todas las planillas del elemento.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => setValoresOpen(true)}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Editar valores precargados
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-sm text-destructive">No se pudo cargar el elemento.</p>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {elemento && !elemento.esSintetico && (
        <ElementoValoresPrecargadosDialog
          elementoId={elemento.id}
          open={valoresOpen}
          onClose={() => setValoresOpen(false)}
        />
      )}
    </>
  )
}

/**
 * Vista solo lectura del elemento sintético (portador de un TestGroup).
 * Muestra los datos identificatorios + link al detalle del pack. Nada editable
 * — la fuente de verdad es el detalle del TestGroup.
 */
function ElementoSinteticoReadonly({
  elemento,
  onClose,
}: {
  elemento: Elemento
  onClose: () => void
}) {
  const tgHref = elemento.testGroupId
    ? `/alcance/test-groups/${elemento.testGroupId}`
    : null

  return (
    <div className="space-y-5">
      {/* Banner: qué es + link al pack */}
      <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 flex items-start gap-3 text-sm text-amber-900">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0 text-amber-700" />
        <div className="flex-1 space-y-2">
          <div className="space-y-1">
            <p className="font-medium">Este elemento es el portador de un Test Group.</p>
            <p className="text-xs">
              Sus datos se gestionan desde el detalle del pack — acá aparecen sólo para consulta.
            </p>
          </div>
          {tgHref && (
            <Button asChild size="sm" variant="outline" className="gap-1.5 bg-white">
              <Link href={tgHref}>
                <ExternalLink className="h-3.5 w-3.5" />
                Ver Test Group
                {elemento.testGroupCodigo && (
                  <span className="font-mono text-xs">· {elemento.testGroupCodigo}</span>
                )}
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Separator />

      {/* Datos identificatorios — todos disabled. */}
      <div className="space-y-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Datos del elemento
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>TAG</Label>
            <Input value={elemento.tag ?? "—"} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Código</Label>
            <Input value={String(elemento.codigo ?? "—")} disabled />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Nombre</Label>
          <Input value={elemento.nombre ?? "—"} disabled />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label>Tipo de elemento</Label>
            <Input value={elemento.elementoTipoNombre ?? "—"} disabled />
          </div>
          <div className="space-y-1.5">
            <Label>Especialidad</Label>
            <Input value={elemento.elementoTipoEspecialidadNombre ?? "—"} disabled />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Subsistema</Label>
          <Input
            value={
              elemento.subSistemaCodigo
                ? `${elemento.subSistemaCodigo}${elemento.subSistemaNombre ? ` — ${elemento.subSistemaNombre}` : ""}`
                : "—"
            }
            disabled
          />
        </div>

        {(elemento.moduloNombre || (elemento.areaIds?.length ?? 0) > 0) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {elemento.moduloNombre && (
              <div className="space-y-1.5">
                <Label>Módulo</Label>
                <Input value={elemento.moduloNombre} disabled />
              </div>
            )}
            {(elemento.areaIds?.length ?? 0) > 0 && (
              <div className="space-y-1.5">
                <Label>Áreas</Label>
                <Input value={`${elemento.areaIds.length} asignada(s)`} disabled />
              </div>
            )}
          </div>
        )}

        {elemento.pid && (
          <div className="space-y-1.5">
            <Label>PID</Label>
            <Input value={elemento.pid} disabled />
          </div>
        )}

        {elemento.observaciones && (
          <div className="space-y-1.5">
            <Label>Observaciones</Label>
            <Textarea value={elemento.observaciones} disabled rows={3} />
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cerrar
        </Button>
      </div>
    </div>
  )
}
