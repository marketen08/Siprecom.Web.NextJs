"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"

import { useGetCamposSelect } from "@/features/campos/api/use-get-campos-select"
import { useCreateCampo } from "@/features/campos/api/use-create-campo"
import { useAddCampo } from "@/features/planillas/api/use-add-campo"
import { campoSchema, type CampoFormValues } from "@/features/campos/schema"
import { CAMPO_TIPO_DATO, type CampoTipoDato, type PlanillaSeccion } from "@/features/planillas/types"

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { cn } from "@/lib/utils"

interface AddCampoModalProps {
  open: boolean
  onClose: () => void
  planillaId: string
  secciones: PlanillaSeccion[]
  selectedSeccionId: string | null
  existingCampoIds: string[]
  nextOrden: number
}

type Tab = "existing" | "new"

export function AddCampoModal({
  open,
  onClose,
  planillaId,
  secciones,
  selectedSeccionId,
  existingCampoIds,
  nextOrden,
}: AddCampoModalProps) {
  const [tab, setTab] = useState<Tab>("existing")
  const [selectedCampoId, setSelectedCampoId] = useState<string>("")
  const [seccionId, setSeccionId] = useState<string>(selectedSeccionId ?? "__none__")
  const [campoSearch, setCampoSearch] = useState("")

  const { data: camposResult } = useGetCamposSelect()
  const campos = (camposResult as any)?.data ?? []
  const createCampoMutation = useCreateCampo()
  const addCampoMutation = useAddCampo()

  const form = useForm<CampoFormValues>({
    resolver: zodResolver(campoSchema),
    defaultValues: {
      codigo: "",
      nombre: "",
      etiqueta: "",
      tipoDato: 1,
      unidad: "",
      descripcion: "",
    },
  })

  const availableCampos = campos.filter(
    (c) => !existingCampoIds.includes(c.id) &&
      (campoSearch === "" ||
        c.nombre.toLowerCase().includes(campoSearch.toLowerCase()) ||
        c.codigo.toLowerCase().includes(campoSearch.toLowerCase()))
  )

  const handleClose = () => {
    setSelectedCampoId("")
    setCampoSearch("")
    form.reset()
    onClose()
  }

  const handleAddExisting = () => {
    if (!selectedCampoId) return
    addCampoMutation.mutate(
      {
        planillaId,
        campoId: selectedCampoId,
        planillaSeccionId: seccionId === "__none__" ? undefined : seccionId,
        orden: nextOrden,
        esObligatorio: false,
        visible: true,
        soloLectura: false,
      },
      { onSuccess: handleClose }
    )
  }

  const handleCreateAndAdd = (values: CampoFormValues) => {
    createCampoMutation.mutate(values, {
      onSuccess: (res) => {
        const newCampoId = res?.data?.id ?? res?.id
        if (!newCampoId) return
        addCampoMutation.mutate(
          {
            planillaId,
            campoId: newCampoId,
            planillaSeccionId: seccionId === "__none__" ? undefined : seccionId,
            orden: nextOrden,
            esObligatorio: false,
            visible: true,
            soloLectura: false,
          },
          { onSuccess: handleClose }
        )
      },
    })
  }

  const isPending = createCampoMutation.isPending || addCampoMutation.isPending

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Agregar campo</SheetTitle>
          <SheetDescription>
            Seleccioná un campo existente o creá uno nuevo.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-4 px-4 pb-6 space-y-4">
          {/* Tab selector */}
          <div className="flex border-b">
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "existing"
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("existing")}
            >
              Campos existentes
            </button>
            <button
              className={cn(
                "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                tab === "new"
                  ? "border-blue-900 text-blue-900"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
              onClick={() => setTab("new")}
            >
              Crear nuevo campo
            </button>
          </div>

          {/* Sección destino (shared) */}
          <div className="space-y-1.5">
            <Label>Sección destino</Label>
            <Select value={seccionId} onValueChange={setSeccionId}>
              <SelectTrigger>
                <SelectValue placeholder="Sin sección">
                  {seccionId === "__none__"
                    ? "Sin sección"
                    : secciones.find((s) => s.id === seccionId)?.nombre ?? "Sin sección"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sin sección</SelectItem>
                {secciones.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.nombre}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {tab === "existing" ? (
            <div className="space-y-3">
              <Input
                placeholder="Buscar campo por nombre o código..."
                value={campoSearch}
                onChange={(e) => setCampoSearch(e.target.value)}
              />
              <div className="max-h-56 overflow-y-auto border rounded-md divide-y">
                {availableCampos.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">
                    {campos.length === 0 ? "No hay campos disponibles." : "No hay más campos para agregar."}
                  </p>
                ) : (
                  availableCampos.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setSelectedCampoId(c.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 text-sm transition-colors",
                        selectedCampoId === c.id
                          ? "bg-blue-50 text-blue-900"
                          : "hover:bg-gray-50"
                      )}
                    >
                      <span className="font-medium">{c.nombre}</span>
                      <span className="ml-2 text-xs text-muted-foreground font-mono">{c.codigo}</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {CAMPO_TIPO_DATO[c.tipoDato as CampoTipoDato]}
                      </span>
                    </button>
                  ))
                )}
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  className="flex-1 bg-blue-900 hover:bg-blue-800"
                  onClick={handleAddExisting}
                  disabled={!selectedCampoId || isPending}
                >
                  {isPending ? "Agregando..." : "Agregar"}
                </Button>
                <Button variant="outline" onClick={handleClose} disabled={isPending}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleCreateAndAdd)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="codigo"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input placeholder="TEMP-001" disabled={isPending} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="tipoDato"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo de dato</FormLabel>
                        <Select
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(Number(v))}
                          disabled={isPending}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue>
                                {CAMPO_TIPO_DATO[field.value as CampoTipoDato] ?? ""}
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {Object.entries(CAMPO_TIPO_DATO).map(([k, v]) => (
                              <SelectItem key={k} value={k}>{v}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="nombre"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre</FormLabel>
                      <FormControl>
                        <Input placeholder="Temperatura de aceite" disabled={isPending} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="etiqueta"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Etiqueta</FormLabel>
                        <FormControl>
                          <Input placeholder="Temp. aceite" disabled={isPending} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="unidad"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Unidad</FormLabel>
                        <FormControl>
                          <Input placeholder="°C" disabled={isPending} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <Button
                    type="submit"
                    className="flex-1 bg-blue-900 hover:bg-blue-800"
                    disabled={isPending}
                  >
                    {isPending ? "Creando..." : "Crear y agregar"}
                  </Button>
                  <Button type="button" variant="outline" onClick={handleClose} disabled={isPending}>
                    Cancelar
                  </Button>
                </div>
              </form>
            </Form>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
