## SIPRECOM Web + IBM Verify Federation

Este proyecto implementa autenticacion federada con IBM Security Verify (OIDC) para `siprecom-web` (Next.js) y `siprecom-backend` (.NET 8), manteniendo compatibilidad con el esquema actual de cookies `accessToken` / `refreshToken` y con el flujo existente de proxy API.

## Conclusion Ejecutiva

Implementar IBM Verify en SIPRECOM aporta ventajas concretas frente al esquema actual centrado en login local/Microsoft:

- Seguridad de credenciales: SIPRECOM deja de gestionar contraseñas federadas. La autenticacion primaria queda en el IdP (IBM Verify), reduciendo superficie de riesgo en backend propio.
- Validacion criptografica robusta: el backend valida `id_token` firmado con claves asimetricas publicadas en JWKS (`RS256/ES256`), en lugar de confiar en tokens no verificados o en claims aislados.
- Proteccion de flujo OIDC: NextAuth usa Authorization Code + PKCE + `state` + `nonce`, mitigando robo de codigo, CSRF y replay.
- Federacion y ciclo de vida centralizado: usuarios, MFA, politicas de acceso, condicionales y fuentes de identidad (AD/LDAP/Cloud Directory) pasan a gobernarse desde IBM Verify.
- Provisioning automatico: primer login federado crea/actualiza usuario local en SIPRECOM sin friccion operativa.
- Compatibilidad sin refactor masivo: se conserva el consumo actual de cookies `accessToken` y `refreshToken`, evitando reescribir capas de API cliente/proxy ya productivas.

## Arquitectura Implementada

1. Login en frontend con `signIn("ibm-verify")` (NextAuth).
2. IBM Verify autentica al usuario y devuelve `code` al callback.
3. NextAuth intercambia `code` por `id_token`.
4. Callback `jwt` llama a backend `POST /api/auth/ibm-verify` enviando `IdToken`.
5. Backend valida firma/audience/issuer/lifetime via OIDC discovery + JWKS.
6. Backend provisiona usuario local (create/update) y devuelve JWT interno SIPRECOM.
7. NextAuth guarda temporalmente esos tokens en su sesion cifrada.
8. Ruta `GET /api/auth/ibm-verify-finalize` transfiere tokens a cookies httpOnly (`accessToken`/`refreshToken`).
9. Resto de la app opera como siempre usando el esquema de cookies existente.

## Archivos Clave

- Frontend:
	- `app/api/auth/[...nextauth]/route.ts`
	- `lib/ibm-verify-auth.ts`
	- `app/api/auth/ibm-verify-finalize/route.ts`
	- `app/(auth)/login/page.tsx`
	- `types/next-auth.d.ts`
	- `proxy.ts`
- Backend:
	- `Controllers/AuthController.cs` (`POST /auth/ibm-verify`)
	- `Core/DTOs/Auth/IbmVerifyLoginDTO.cs`
	- `appsettings.json` / `appsettings.Example.json` (`IbmVerify`)

## Variables de Entorno (Web)

Configurar en `.env.local`:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_API_URL=https://localhost:5021/api

# Habilita boton IBM Verify en login
NEXT_PUBLIC_IBM_VERIFY_ENABLED=true

# OIDC IBM Verify
IBM_VERIFY_ISSUER=https://<tu-tenant>/oidc/endpoint/default
IBM_VERIFY_CLIENT_ID=<client-id-ibm-verify>
IBM_VERIFY_CLIENT_SECRET=<client-secret-ibm-verify>

# Secreto de sesion NextAuth (>= 32 bytes)
NEXTAUTH_SECRET=<openssl-rand-base64-32>
```

## Variables de Entorno / Config (.NET)

En `appsettings.Development.json`, user-secrets o Azure Key Vault:

```json
{
	"IbmVerify": {
		"Authority": "https://<tu-tenant>/oidc/endpoint/default",
		"ClientId": "<client-id-ibm-verify>"
	}
}
```

Nota: el backend no necesita `ClientSecret` para validar `id_token`; usa clave publica de JWKS.

## Endpoints de Auth Relevantes

- Web NextAuth:
	- `GET/POST /api/auth/*`
	- `GET /api/auth/ibm-verify-finalize`
- Backend:
	- `POST /api/auth/ibm-verify`
	- `POST /api/auth/login`
	- `POST /api/auth/microsoft`
	- `POST /api/auth/google`
	- `POST /api/auth/refresh`

## Cambios de Seguridad Aplicados en Esta Implementacion

- Validacion IBM Verify endurecida en backend:
	- `ValidateIssuer = true`
	- `ValidateAudience = true`
	- `ValidateIssuerSigningKey = true`
	- Rechazo explicito cuando falta `IbmVerify:ClientId`
- Asignacion de roles federados segura:
	- Solo se agregan roles presentes en `AspNetRoles`
	- Roles desconocidos del IdP se ignoran
- Persistencia de tokens:
	- Cookies httpOnly + `SameSite=Lax`
	- `secure=true` en produccion
	- Sin uso de `localStorage` para tokens sensibles

## Ejecucion Local

1. Levantar backend:

```bash
cd "c:/Users/Nicolas/Documents/.NET Development/siprecom-backend"
dotnet run
```

2. Levantar frontend:

```bash
cd "c:/Users/Nicolas/Documents/Workplace/siprecom-web"
npm install
npm run dev
```

3. Probar login IBM Verify:
	- Ir a `/login`
	- Click en "Iniciar sesion con IBM Verify"
	- Completar autenticacion en IBM Verify
	- Verificar redireccion a `/dashboard`

## Troubleshooting Rapido

- Error de callback OIDC: verificar redirect URI en app IBM Verify y que coincida con `/api/auth/callback/ibm-verify`.
- `IbmVerifyExchangeFailed`: revisar logs de backend en `/auth/ibm-verify`, `Authority`, `ClientId`, `iss` y `aud`.
- Falta claim email: mapear atributo `email` en IBM Verify para ID token.
- 401 en API despues del login: validar que `ibm-verify-finalize` haya seteado cookies `accessToken` y `refreshToken`.

## Recomendaciones de Produccion

- HTTPS obligatorio en frontend/backend.
- Guardar secretos en Key Vault o secret manager (no en repositorio).
- Mantener expiracion corta de access token y renovacion por refresh.
- Auditar/monitorear eventos de login federado y bloqueos.
- Activar MFA en IBM Verify para perfiles criticos.
