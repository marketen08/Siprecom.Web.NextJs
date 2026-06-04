/**
 * Cache local de archivos IFC en IndexedDB. La idea: cuando el usuario abre el
 * visor un IFC de 43 MB se baja entero. Si después vuelve a entrar a la página,
 * tener que bajarlo de nuevo es lento (incluso desde Azure directo). IndexedDB
 * persiste los bytes entre sesiones sin límites prácticos para archivos de
 * decenas/cientos de MB en navegadores modernos.
 *
 * Clave del cache: `archivoId` (el ID del ProyectoIfcArchivo). Si el usuario
 * sube un archivo nuevo, el ID es nuevo y el cache no se golpea. Como secondary
 * check usamos el tamaño en bytes — si el blob cambió en disco, el size cambia
 * y bypasseamos el cache.
 *
 * Importante: solo cargar este módulo client-side. IndexedDB no existe en SSR.
 */

const DB_NAME = "siprecom-ifc-cache"
const DB_VERSION = 1
const STORE = "archivos"

interface CacheEntry {
  buffer: ArrayBuffer
  size: number
  cachedAt: number
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB no disponible"))
      return
    }
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      const db = req.result
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

/**
 * Devuelve el buffer cacheado para el archivoId, o null si no hay cache válido.
 * Si `expectedSize` está definido y no coincide con el tamaño guardado, retorna
 * null (cache stale).
 */
export async function getCachedIfc(
  archivoId: string,
  expectedSize?: number | null,
): Promise<ArrayBuffer | null> {
  try {
    const db = await openDB()
    return await new Promise<ArrayBuffer | null>((resolve) => {
      const tx = db.transaction(STORE, "readonly")
      const store = tx.objectStore(STORE)
      const req = store.get(archivoId)
      req.onsuccess = () => {
        const entry = req.result as CacheEntry | undefined
        if (!entry) { resolve(null); return }
        if (expectedSize != null && entry.size !== expectedSize) {
          // Tamaño no coincide → cache stale, lo ignoramos.
          resolve(null)
          return
        }
        resolve(entry.buffer)
      }
      req.onerror = () => resolve(null)
    })
  } catch {
    return null
  }
}

/**
 * Guarda el buffer en el cache para futuras visitas. Errores silenciosos —
 * si IndexedDB falla (sin permisos, modo incógnito agresivo, quota llena), el
 * caller obtiene el resultado normalmente sin cache, no rompe nada.
 */
export async function setCachedIfc(archivoId: string, buffer: ArrayBuffer): Promise<void> {
  try {
    const db = await openDB()
    const entry: CacheEntry = {
      buffer,
      size: buffer.byteLength,
      cachedAt: Date.now(),
    }
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite")
      const store = tx.objectStore(STORE)
      const req = store.put(entry, archivoId)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    })
  } catch {
    // silent
  }
}

/** Borra una entrada específica del cache. Útil cuando se elimina un archivo. */
export async function clearCachedIfc(archivoId: string): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite")
      const store = tx.objectStore(STORE)
      const req = store.delete(archivoId)
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    })
  } catch {
    // silent
  }
}

/** Borra todo el cache. Función de "debug/reset" para el usuario. */
export async function clearAllIfcCache(): Promise<void> {
  try {
    const db = await openDB()
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE, "readwrite")
      const store = tx.objectStore(STORE)
      const req = store.clear()
      req.onsuccess = () => resolve()
      req.onerror = () => resolve()
    })
  } catch {
    // silent
  }
}
