# Fase 1: Inventario de endpoints — Siprecom API

Output del mapeo automático del backend `.NET`. Base para definir el plan de ataque del pentest.

**Total endpoints**: 285 (35+ controllers)
**Generado**: 2026-05-14

---

## Distribución por nivel de auth

| Nivel | Cantidad | Notas |
|---|---|---|
| Anónimos | 4 | Solo `/api/auth/{login,refresh,google,microsoft}` — todos con rate limit |
| Autenticados sin rol específico | 8 | Novedades + FirmasDesestimadas — superficies a auditar |
| Admin only | 12 | Operaciones críticas (register, password reset, planilla seed, etc.) |
| Admin + Supervisor | 57 | CRUD de datos maestros |
| Admin + User | 135 | Lectura general + escritura de operaciones |
| Admin + Supervisor + User | 52 | Pendientes mayormente |
| Otros | 17 | Variantes y combinaciones |

---

## Vectores prioritarios para el pentest

### 🔴 1. IDOR / cross-project tenancy (DENSIDAD ALTA)

Familias completas que toman `{id}` en path SIN guard de propiedad evidente:

- **`/api/registros/{registroId}/*`** — toda la familia (15+ acciones). El más crítico.
  - Verbos: GET, POST, DELETE, valores, firmar, PDF, historial, archivos, certificado, etc.
  - **Test prioritario**: como `pentest1` (proyecto A), tomar el ID de un registro de `pentest2` (proyecto B), intentar leer/modificar.

- **`/api/pendientes/{id}/*`** — toda la familia.
  - Tests: cross-project, transiciones de estado sin permiso (aprobar pendiente ajeno, etc.)

- **`/api/elementos/{id}/valores-precargados/{planillaId}`** — PUT upsert.

- **`/api/proyectos/{proyectoId}/usuarios-roles/{asignacionId}`** — DELETE sin validar que el `proyectoId` sea del user.

### 🔴 2. Open redirect confirmado

- **`GET /api/registros/{id}/pdf-oficial`** → `Redirect(result.Data)` sin whitelist de dominio.
  - Aikido lo flaggeó. Si en el path interno se logra que `result.Data` apunte a otra URL, es open redirect.

### 🟡 3. File upload sin whitelist robusta

| Endpoint | Validación actual | Riesgo |
|---|---|---|
| `/api/registros/{id}/archivos` | Solo tamaño (30 MB) | No whitelist de tipos → upload de ASPX/HTML/SVG-XSS |
| `/api/import/{preview,apply}` | Solo no-vacío | Subir XLSX malicioso → posible XXE en parseo |
| `/api/import/pendientes/*` | Igual | Idem |
| `/api/pendientes/{id}/adjuntos` | Solo no-vacío | Sin whitelist |
| `/api/planillas/campos/imagen` | ✓ Content-Type checked | OK |
| `/api/usuarios/me/firma` | ✓ Content-Type + tamaño | OK |

**Tests prioritarios**: subir `.svg` con XSS, `.html` que se renderice si se sirve, file con `..` en nombre (path traversal).

### 🟡 4. DoS / Bulk endpoints sin rate limit

Operaciones costosas sin protección:

- `POST /api/elementos-tareas/sync` — sincronización masiva
- `POST /api/import/{preview,apply}` — parse XLSX en memoria
- `POST /api/import/pendientes/*`
- `POST /api/planillas/pdf/bulk` — genera ZIP de N PDFs en memoria
- `POST /api/registros/{id}/valores/batch` — batch sin límite de cantidad

**Test**: mandar requests en paralelo con payloads grandes (XLSX de 100MB, bulk PDF de 1000 registros).

### 🟡 5. State transition validation

Endpoints de transición de estado que **podrían no validar el estado previo**:

- `POST /api/elementos-tareas/{id}/completar` — sin validar EN_PROCESO?
- `POST /api/pendientes/{id}/aprobar` — sin validar estado intermedio?
- `POST /api/registros/{id}/firmar` — sin validar que esté COMPLETADO?

**Test**: intentar saltar estados (PENDIENTE → COMPLETADO directo).

### 🟢 6. Endpoints anónimos (bien protegidos pero verificar)

Los 4 endpoints públicos están con rate limit + Identity lockout. Tests:

- **Rate limit confirmado** funcionando (12 requests → 429 en el 11°). ✓
- **Validación del ID token Microsoft**: ya removimos fallback inseguro a `preferred_username`. Verificar tokens de otros tenants. ✓
- **Account enumeration**: ¿`/auth/login` con email-que-no-existe vs `password-mal` tiene **timing** distinto? CheckPasswordAsync usa bcrypt → password-mal demora más que user-no-existe.

### 🟢 7. Endpoints autenticados sin rol específico (8)

`NovedadesController` y `FirmasDesestimadasController` heredan `[Authorize]` clase pero sin roles. Cualquier user autenticado puede:

- GET/POST/DELETE novedades
- GET/POST/DELETE firmas desestimadas

**Verificar**: ¿el listado filtra por user/proyecto, o cualquiera ve TODO?

---

## Endpoints con file upload — detalle

| Path | Tipo | Tamaño max | Whitelist | Acción |
|---|---|---|---|---|
| `POST /api/usuarios/me/firma` | multipart | 2 MB | ✓ PNG, JPG, SVG | Sube a blob como firma user |
| `POST /api/registros/{id}/completar/fisico` | multipart | — | ❌ | Adjunta planilla física |
| `POST /api/registros/{id}/archivos` | multipart | **30 MB** | ❌ Sin whitelist | Adjunta archivo a registro |
| `POST /api/planillas/campos/imagen` | multipart | 5 MB | ✓ JPG, PNG, WebP, SVG, GIF | Imagen decorativa de campo |
| `POST /api/pendientes/{id}/adjuntos` | multipart | — | ❌ | Adjunto de pendiente |
| `POST /api/import/preview` | XLSX | — | ❌ | Preview importar datos del proyecto |
| `POST /api/import/apply` | XLSX | — | ❌ | Aplicar importación datos del proyecto |
| `POST /api/import/pendientes/preview` | XLSX | — | ❌ | Preview importar pendientes |
| `POST /api/import/pendientes/apply` | XLSX | — | ❌ | Aplicar importación pendientes |

---

## Endpoints con SAS URLs (Azure Blob)

- `GET /api/registros/{id}/archivos?expiryMinutes=60` — devuelve SAS URLs de adjuntos
- `GET /api/registros/{id}/certificado?expiryMinutes=60` — SAS al certificado PDF
- `GET /api/registros/{id}/pdf-oficial` — Redirect 302 a SAS
- `GET /api/pendientes/{id}/adjuntos` — listado con SAS

**Tests**:
- `?expiryMinutes=99999999` → ¿se valida el upper bound?
- ¿Los SAS son re-utilizables después de soft-delete del archivo?
- ¿El SAS dura más que la sesión del usuario?
- ¿El SAS scope es solo al archivo o al container completo?

---

## Plan de ataque por fase

### Fase 2 (post-mapeo): focused IDOR / BOLA
Targets prioritarios:
1. `/api/registros/{id}/*` — set completo de tests cross-user, cross-project
2. `/api/pendientes/{id}/*` — idem
3. State transitions: completar, aprobar, rechazar, cancelar

### Fase 3: file upload exploitation
1. SVG con XSS en `/api/registros/{id}/archivos`
2. XLSX con XXE en `/api/import/*`
3. Path traversal en nombres de archivo

### Fase 4: lógica de negocio
1. Saltar estados (PENDIENTE → COMPLETADO)
2. Firmar registros ajenos
3. Aprobar pendientes propios
4. Crear `ElementoTarea` que pisa otra existente

### Fase 5: DoS y rate limit
1. Bulk operations en paralelo
2. Upload de archivos gigantes
3. Generar ZIP de muchos PDFs

### Fase 6: misc
1. Account enumeration por timing
2. SAS URL abuse
3. Header injection en `X-Terminal-Hostname`
4. Mass assignment en `PUT /auth/profile`

---

## Usuarios de pentest necesarios

Para los tests prioritarios necesitamos:

| User | Rol | Proyecto | Para qué |
|---|---|---|---|
| `pentest1@test.com` | User | Proyecto A | IDOR/BOLA same-tenant |
| `pentest2@test.com` | User | Proyecto B | Cross-project tenancy |
| `pentest3@test.com` | Supervisor | Proyecto A | Privilege escalation tests |
| `pentestadmin@test.com` | Admin | Proyecto A | Admin baseline + auth flow |

(Se pueden crear con scripts SQL o vía `/api/auth/register` ahora que requiere Admin).
