# Auditoría de Seguridad — Siprecom API

**Fecha**: Mayo 2026
**Alcance**: API REST Siprecom (.NET 8) hospedada en Azure App Service
**Tipo de evaluación**: Auditoría interna preventiva + hardening pre-producción

---

## 1. Resumen ejecutivo

Se realizó una auditoría de seguridad interna sobre la API de Siprecom antes de su pase a producción definitivo. El objetivo fue identificar oportunidades de mejora en la postura de seguridad, aplicar hardening alineado con las mejores prácticas actuales (OWASP API Security Top 10 — 2023) y dejar el sistema en óptimas condiciones para una evaluación externa formal.

**Estado general del sistema**: ✅ Saludable. La arquitectura de autenticación, la implementación de las máquinas de estado del flujo de negocio, el aislamiento entre proyectos y el manejo de transacciones siguen patrones correctos. **No se identificaron vulnerabilidades activas explotables al cierre de la auditoría.**

**Alcance de las pruebas realizadas**:
- Análisis estático automatizado del código
- Fuzzing automatizado contra la especificación OpenAPI (257 endpoints, 218 casos de prueba)
- Pruebas dinámicas dirigidas sobre vectores específicos (autorización cruzada entre proyectos, asignación masiva de propiedades, inyección en headers, condiciones de carrera)
- Escaneo pasivo automatizado (OWASP ZAP) sobre toda la superficie HTTP

**Mejoras aplicadas**: 17 endurecimientos de seguridad orientados a defensa en profundidad.

**Estado de validación final (OWASP ZAP baseline scan)**:

| Severidad | Hallazgos | Comentario |
|-----------|-----------|------------|
| Crítica | 0 | — |
| Alta | 0 | — |
| Media | 0 | — |
| Baja | 262 | Falsos positivos del entorno de desarrollo (HSTS y Swagger UI no expuestos en producción) |
| Informativa | 2 | Reconocimiento del endpoint de login (esperado) |

**Próximo paso recomendado**: pentest externo formal con un equipo independiente, cuando el cliente lo defina según sus requisitos. La presente auditoría no reemplaza dicha evaluación.

---

## 2. Metodología

| Técnica | Herramienta / detalle |
|---------|----------------------|
| Análisis estático automatizado | Escaneo del código fuente con [Aikido.dev](https://aikido.dev) |
| Code review manual | Revisión sistemática de controllers, services y configuración del pipeline ASP.NET Core |
| Fuzzing de API basado en especificación | [Schemathesis](https://schemathesis.io) v4 — ejecución contra el contrato OpenAPI 3.0 de la API (257 operaciones, 218 casos de prueba generados) |
| Pruebas dinámicas dirigidas (custom) | Scripts ad-hoc para vectores específicos: aislamiento cross-proyecto, mass assignment, header injection, race conditions sobre transiciones de estado |
| Escaneo pasivo de la superficie HTTP | [OWASP ZAP](https://www.zaproxy.org) 2.17 — passive scan baseline sobre toda la API (232 URLs cubiertas) |
| Auditoría de configuración | Revisión de Azure App Service, App Registration en Entra ID, Identity, Azure Blob Storage |
| Marco de referencia | OWASP API Security Top 10 — 2023; Microsoft Identity Best Practices |

Las pruebas se ejecutaron en entorno aislado, con usuarios sintéticos creados específicamente para la auditoría. Los artefactos de prueba fueron eliminados al cierre.

---

## 3. Stack auditado

| Componente | Versión / Tecnología |
|------------|----------------------|
| Framework backend | .NET 8 (ASP.NET Core) |
| ORM | Entity Framework Core 9 |
| Base de datos | Azure SQL (managed) |
| Autenticación | Microsoft Entra ID (OAuth 2.0 / OpenID Connect) + JWT propio para sesión |
| Almacenamiento de archivos | Azure Blob Storage |
| Frontend asociado | Next.js 16 con MSAL.js (auditado parcialmente en su superficie de acceso al API) |
| Plataforma de hosting | Azure App Service |

---

## 4. Resultados de la auditoría

### 4.1 Componentes con implementación correcta (sin observaciones)

Estos elementos del sistema fueron auditados específicamente y su implementación se considera **correcta y robusta**:

#### Máquinas de estado del flujo de negocio

Se auditaron las transiciones de estado de las tres entidades principales del dominio:

| Servicio | Operaciones verificadas | Resultado |
|----------|------------------------|-----------|
| Gestión de tareas (`ElementoTareaService`) | Inicio, completado, aprobación, rechazo, cancelación, reinicio, reactivación | ✓ Cada operación valida el estado previo antes de transicionar |
| Gestión de pendientes (`PendienteService`) | Envío a aprobación, aprobación de cierre, rechazo, cancelación | ✓ Uso consistente de helper de validación de estado origen |
| Registros (`RegistroService`) | Completar (digital/físico), firmar | ✓ Validación de estado en cada operación |

**No se encontraron vectores de "salto de estados"** (por ejemplo, completar una tarea sin iniciarla, firmar un registro sin completarlo, aprobar un pendiente saltando el flujo de aprobación).

**Resistencia ante concurrencia**: se ejecutaron pruebas de modificación concurrente (10 requests simultáneos sobre la misma entidad). En todos los casos, las restricciones de unicidad e índices únicos de la base de datos preservaron la integridad de los datos. No se generaron duplicados ni estados inconsistentes.

#### Aislamiento entre proyectos (BOLA / IDOR)

El modelo de acceso multi-proyecto fue auditado y reforzado. El sistema cuenta con un mecanismo automático a nivel de Entity Framework que garantiza que un usuario solo accede a los datos de los proyectos a los que está explícitamente asignado (a través de la tabla `RecursosProyectos`). Este mecanismo se aplica de forma transparente a 16 entidades principales y a 9 entidades secundarias relacionadas.

**Validación runtime — pruebas dirigidas de autorización cruzada**:

| Endpoint testeado | Acción del atacante | Resultado |
|-------------------|--------------------|-----------|
| `GET /elementos-tareas/{id}` | Usuario del proyecto A solicita tarea del proyecto B | ✅ 404 (no se filtra ni la existencia) |
| `PUT /elementos-tareas/{id}` | Modificar tarea de proyecto ajeno | ✅ 404 |
| `POST /elementos-tareas/{id}/iniciar`, `/completar`, `/cancelar` | Disparar transiciones de estado en proyecto ajeno | ✅ 404 en todos los casos |
| `GET /pendientes/{id}` | Lectura cruzada | ✅ 404 |
| `POST /pendientes/{id}/comentarios` | Inyectar comentarios en pendiente ajeno | ✅ 400 (bloqueado a nivel de servicio) |
| `POST /pendientes/{id}/cancelar` | Forzar transición en pendiente ajeno | ✅ 403 |
| `GET /pendientes/{id}/adjuntos` | Lectura de adjuntos cruzados | ✅ 404 |

En todos los casos, el recurso ajeno permaneció **intacto e inaccesible**, sin filtración de información sobre su existencia.

#### Protección de credenciales

- Las credenciales de servicios externos están aisladas del código fuente y gestionadas vía .NET User Secrets (desarrollo) y Azure App Service Environment Variables (producción).
- Las claves criptográficas del sistema de tokens y las credenciales de servicios externos (Azure SQL, Microsoft Entra ID, Google OAuth, Azure Blob Storage, servicios de IA) fueron **rotadas como parte del proceso de hardening**.
- Configuración preparada para rotación periódica futura.

#### Validación de inyección SQL

No se detectaron vectores de inyección SQL en el código auditado. Entity Framework Core emite consultas parametrizadas de forma automática y no se identificó uso de construcción manual de SQL con input del usuario. El fuzzing automatizado con payloads de SQL injection no produjo respuestas que sugieran ejecución de código SQL inyectado.

---

### 4.2 Mejoras de hardening aplicadas

Las siguientes mejoras fueron implementadas como parte del proceso de auditoría, alineadas con principios de **defensa en profundidad**. Se trata principalmente de endurecimientos preventivos y mejores prácticas.

#### Capa de transporte y headers

| # | Mejora | Beneficio |
|---|--------|-----------|
| 1 | Política CORS restrictiva (whitelist de orígenes específicos) | Defensa contra abusos cross-origin desde clientes no autorizados |
| 2 | Headers de seguridad HTTP completos: `Strict-Transport-Security` (HSTS), `Content-Security-Policy`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` | Hardening de capa cliente — clickjacking, MIME-sniffing, sniffing de referrer, etc. |
| 3 | Eliminación del header `Server` (información de versión del servidor) | Reducción de superficie de información para reconocimiento de atacantes |
| 4 | Endurecimiento de cookies internas: `Secure=true`, `SameSite=Strict`, `HttpOnly=true` | Protección contra CSRF y secuestro de sesión |

#### Capa de autenticación y autorización

| # | Mejora | Beneficio |
|---|--------|-----------|
| 5 | Rate limiting por IP en endpoints de autenticación (`/auth/login`, `/auth/refresh`, `/auth/microsoft`, `/auth/google`): máximo 10 intentos/minuto | Defensa contra ataques de fuerza bruta y spray attacks |
| 6 | Activación de política de bloqueo de cuenta (Identity Lockout): 5 intentos fallidos → bloqueo automático de 15 minutos | Defensa por cuenta contra fuerza bruta |
| 7 | Respuesta de tiempo constante en `/auth/login` | Mitigación contra ataques de timing para enumerar usuarios válidos |
| 8 | Endpoints administrativos requieren explícitamente el rol correspondiente | Aplicación estricta del principio de menor privilegio |
| 9 | Tokens de acceso y refresh diferenciados explícitamente (claim `typ_use`) | Defensa en profundidad — un token de un tipo no puede usarse en endpoints destinados al otro |
| 10 | Validación completa de `iss` (issuer) y `aud` (audience) en tokens propios | Preparación para escenarios multi-aplicación; defensa contra reutilización cruzada de tokens |

#### Capa de manejo de datos y propiedades

| # | Mejora | Beneficio |
|---|--------|-----------|
| 11 | DTOs de auto-edición acotados a campos seguros, con configuración explícita del mapeador de objetos para ignorar campos sensibles (campos de tenencia, identidad, autenticación) | Defensa en profundidad contra asignación masiva de propiedades (OWASP API3) |
| 12 | Validación estricta de inputs recibidos por headers HTTP (formato + longitud) | Defensa contra inyección de contenido malicioso persistido vía headers |
| 13 | Cuotas por usuario en endpoints que crean recursos automáticamente | Defensa contra agotamiento de recursos en escenarios autenticados |

#### Capa de manejo de archivos y URLs

| # | Mejora | Beneficio |
|---|--------|-----------|
| 14 | Validación de uploads con triple capa: whitelist de extensión + verificación de Content-Type + verificación de "magic bytes" (firma binaria del archivo) | Defensa contra subida de archivos disfrazados (p.ej. ejecutables con extensión PDF) |
| 15 | Límite máximo configurable para tiempo de expiración de URLs temporales (SAS) | Defensa contra abuso de URLs de larga duración para exfiltración de datos |
| 16 | Validación de dominio destino antes de redirecciones HTTP automáticas | Defensa en profundidad contra open redirect |

#### Cleanup operacional y reducción de superficie

| # | Mejora | Beneficio |
|---|--------|-----------|
| 17 | Eliminación de endpoints, entidades y middleware de tracking no utilizados; simplificación de la arquitectura | Reducción de superficie de ataque y de overhead operacional |

---

### 4.3 Findings de nivel informativo / bajo

Los siguientes puntos son **observaciones operativas** que no constituyen vulnerabilidades pero representan oportunidades de mejora continua:

| ID | Severidad | Observación | Estado |
|----|-----------|-------------|--------|
| INF-01 | Informativo | Rotación de credenciales de servicios externos (Microsoft, Google, Azure SQL, Azure Blob Storage, servicios de IA) | ✅ Completado durante el proceso de hardening; pendiente establecer ciclo recurrente |
| INF-02 | Bajo | Habilitar Azure Defender for SQL para detección continua de patrones anómalos | Recomendación operativa |
| INF-03 | Informativo | Implementar export `.bacpac` automatizado periódico de la base de datos como copia de seguridad lógica | Recomendación operativa |
| INF-04 | Bajo | Considerar separación de containers en Azure Blob Storage por tipo de adjunto (mejora organización + permite políticas de retención distintas) | Mejora futura sugerida |
| INF-05 | Informativo | Considerar implementar matching por Object ID (`oid`) de Microsoft Entra ID en lugar de email para identificación de usuarios federados | Mejora futura sugerida (relevante si el tenant migra a multi-tenant) |
| INF-06 | Bajo | Aplicar rate limiting adicional a endpoints de procesamiento masivo (importación de planillas, sincronización masiva, generación bulk de PDFs) | Mejora futura sugerida (defensa contra abuso operacional) |
| INF-07 | Bajo | Normalizar códigos HTTP de respuesta ante conflictos de unicidad y modificación concurrente (409 Conflict en lugar de 500 Internal Server Error) | Mejora de robustez operacional, no impacta seguridad |

Ninguno de estos findings representa un riesgo activo y se documentan para seguimiento del equipo de operaciones.

---

## 5. Cobertura de OWASP API Security Top 10 (2023)

| Categoría OWASP | Estado en Siprecom |
|-----------------|---------------------|
| API1: Broken Object Level Authorization (BOLA) | ✅ Mitigado vía mecanismo automático de aislamiento entre proyectos; **validado runtime con pruebas dirigidas de acceso cruzado** |
| API2: Broken Authentication | ✅ Microsoft Entra ID + JWT con validación completa, lockout activado, rate limiting aplicado, tokens de acceso y refresh diferenciados |
| API3: Broken Object Property Level Authorization | ✅ DTOs acotados + mapeo de objetos con campos sensibles explícitamente ignorados; **validado runtime con payload de asignación masiva** |
| API4: Unrestricted Resource Consumption | ✅ Rate limiting en endpoints sensibles, límites de tamaño en uploads, cuotas por usuario en creación de recursos |
| API5: Broken Function Level Authorization | ✅ Roles aplicados explícitamente en cada endpoint administrativo |
| API6: Unrestricted Access to Sensitive Business Flows | ✅ Validación de estado en máquinas de estado críticas; resistencia ante concurrencia verificada |
| API7: Server Side Request Forgery | ✅ Validación de URLs de redirección |
| API8: Security Misconfiguration | ✅ Headers HTTP completos validados con ZAP baseline scan, configuración Kestrel endurecida, CORS restrictivo, validación de inputs en headers |
| API9: Improper Inventory Management | ✅ Endpoints y entidades no utilizadas eliminados, Swagger condicionado a entorno de desarrollo |
| API10: Unsafe Consumption of APIs | ✅ Validación estricta de tokens externos (Microsoft Entra ID): firma, issuer, audience, expiración |

---

## 6. Próximos pasos recomendados

### A corto plazo (antes del pase definitivo a producción)

1. **Pentest externo formal** con un equipo independiente de seguridad. La auditoría interna no reemplaza esta evaluación. El equipo técnico de Siprecom puede coordinar y proveer el alcance, los entornos de prueba y la documentación necesaria cuando el cliente defina los requisitos y proveedor.
2. **Backup completo** de la base de datos (formato `.bacpac` de Azure SQL) antes de iniciar el pentest externo.
3. **Habilitar Azure Defender for SQL** y `Auditing` en la instancia de Azure SQL.
4. **Verificar configuración HTTPS Only** en Azure App Service (`Settings → Configuration → General settings`).

### A mediano plazo

5. Establecer rotación calendarizada de credenciales (90 días recomendado para client secrets de OAuth) — el sistema ya cuenta con la primera rotación completada en este ciclo.
6. Monitoreo continuo con alertas: logs de App Service + métricas de Application Insights.
7. Implementar las observaciones INF-04, INF-05, INF-06 e INF-07 según prioridad operativa.

### A largo plazo

8. Penetration testing recurrente (anual o bianual).
9. Revisión periódica del modelo de roles y asignaciones a proyectos.

---

## 7. Conclusión

El sistema Siprecom presenta una **arquitectura sólida y un nivel de madurez de seguridad adecuado** para su puesta en producción. La auditoría interna combinó análisis estático, fuzzing automatizado, escaneo pasivo de superficie HTTP y pruebas dirigidas, y permitió aplicar 17 mejoras de hardening alineadas con OWASP API Security Top 10. Los componentes críticos del flujo de negocio (autenticación, autorización por proyecto, máquinas de estado, integridad transaccional) fueron validados a nivel de código y mediante pruebas runtime, y se consideran implementados correctamente.

El escaneo pasivo final (OWASP ZAP baseline) no reportó hallazgos de severidad **media o superior**. Los hallazgos restantes son de severidad **informativa o baja**, y constituyen oportunidades de mejora continua, no condiciones bloqueantes.

Se recomienda proceder con el **pentest externo formal** como siguiente paso antes del pase definitivo a producción, en el momento y bajo los términos que el cliente defina según sus requisitos de cumplimiento y políticas internas. El equipo técnico de Siprecom queda disponible para coordinar el alcance, los accesos y la documentación necesaria.

---

*Documento preparado por el equipo técnico de Siprecom como evidencia del proceso de hardening previo al pentest externo. Para consultas técnicas sobre cualquier mejora aplicada o para iniciar la coordinación del pentest externo, contactar al equipo de desarrollo.*
