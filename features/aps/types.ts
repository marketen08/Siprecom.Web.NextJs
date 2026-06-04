// Mirror de los DTOs de Core/DTOs/Aps/ApsDtos.cs

export interface ApsStatus {
  conectado: boolean
  expiresAt: string | null
}

export interface ApsHub {
  id: string
  nombre: string
  tipo: string | null
}

export interface ApsProject {
  id: string
  nombre: string
  topFolderId: string | null
}

export interface ApsFolderItem {
  id: string
  nombre: string
  tipo: "folder" | "item"
  extension: string | null
  latestVersionId: string | null
  updatedAt: string | null
}

export interface ApsVersion {
  id: string
  nombre: string
  versionNumber: number | null
  createdAt: string | null
  createdBy: string | null
}

export interface ApsImportarInput {
  proyectoId: string
  hubId: string
  projectId: string
  itemId: string
  versionId: string
  nombre?: string
  disciplina?: string
  marcarComoPrincipal?: boolean
}
