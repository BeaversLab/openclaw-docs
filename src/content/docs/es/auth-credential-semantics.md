---
summary: "Semántica canónica de elegibilidad y resolución de credenciales para perfiles de autenticación"
title: "Semántica de credenciales de autenticación"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

Este documento define la semántica canónica de elegibilidad y resolución de credenciales utilizada en:

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

El objetivo es mantener el comportamiento del momento de selección y el tiempo de ejecución alineados.

## Códigos de motivo de sonda estables

- `ok`
- `excluded_by_auth_order`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`
- `no_model`

## Credenciales de token

Las credenciales de token (`type: "token"`) admiten `token` en línea y/o `tokenRef`.

### Reglas de elegibilidad

1. Un perfil de token no es elegible cuando tanto `token` como `tokenRef` están ausentes.
2. `expires` es opcional.
3. Si `expires` está presente, debe ser un número finito mayor que `0`.
4. Si `expires` no es válido (`NaN`, `0`, negativo, no finito o tipo incorrecto), el perfil no es elegible con `invalid_expires`.
5. Si `expires` está en el pasado, el perfil no es elegible con `expired`.
6. `tokenRef` no omite la validación de `expires`.

### Reglas de resolución

1. La semántica del solucionador coincide con la semántica de elegibilidad para `expires`.
2. Para los perfiles elegibles, el material del token se puede resolver desde el valor en línea o `tokenRef`.
3. Las referencias no resolubles producen `unresolved_ref` en la salida `models status --probe`.

## Filtrado explícito del orden de autenticación

- Cuando `auth.order.<provider>` o la anulación del orden de auth-store está establecida para un proveedor, `models status --probe` solo sondea los IDs de perfil que permanecen en el orden de autenticación resuelto para ese proveedor.
- Un perfil almacenado para ese proveedor que se omite del orden explícito no se intenta silenciosamente más tarde. La salida del sondeo lo reporta con `reasonCode: excluded_by_auth_order` y el detalle `Excluded by auth.order for this provider.`

## Resolución del objetivo del sondeo

- Los objetivos del sondeo pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
- Si un proveedor tiene credenciales pero OpenClaw no puede resolver un candidato de modelo sondeable para él, `models status --probe` reporta `status: no_model` con `reasonCode: no_model`.

## Guardia de política de SecretRef de OAuth

- La entrada de SecretRef es solo para credenciales estáticas.
- Si una credencial de perfil es `type: "oauth"`, los objetos SecretRef no son compatibles con ese material de credencial de perfil.
- Si `auth.profiles.<id>.mode` es `"oauth"`, se rechaza la entrada `keyRef`/`tokenRef` respaldada por SecretRef para ese perfil.
- Las violaciones son fallos graves en las rutas de resolución de autenticación de inicio/recarga.

## Mensajes compatibles con versiones anteriores

Para la compatibilidad de scripts, los errores de sondeo mantienen esta primera línea sin cambios:

`Auth profile credentials are missing or expired.`

Se pueden agregar detalles amigables para humanos y códigos de razón estables en las líneas siguientes.

## Relacionado

- [Gestión de secretos](/es/gateway/secrets)
- [Almacenamiento de autenticación](/es/concepts/oauth)
