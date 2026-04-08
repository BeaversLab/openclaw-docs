---
title: "Semántica de credenciales de autenticación"
summary: "Semántica canónica de elegibilidad y resolución de credenciales para perfiles de autenticación"
read_when:
  - Working on auth profile resolution or credential routing
  - Debugging model auth failures or profile order
---

# Semántica de credenciales de autenticación

Este documento define la semántica canónica de elegibilidad y resolución de credenciales utilizada en:

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

El objetivo es mantener el comportamiento de selección y tiempo de ejecución alineados.

## Códigos de razón de sondeo estables

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
2. Para los perfiles elegibles, el material del token se puede resolver a partir del valor en línea o `tokenRef`.
3. Las referencias no resolubles producen `unresolved_ref` en la salida de `models status --probe`.

## Filtrado de orden de autenticación explícito

- Cuando se establece `auth.order.<provider>` o la invalidación del orden de almacenamiento de autenticación para un proveedor, `models status --probe` solo sondea los identificadores de perfil que permanecen en el orden de autenticación resuelto para ese proveedor.
- Un perfil almacenado para ese proveedor que se omite del orden explícito no se intenta silenciosamente más tarde. La salida del sondeo lo informa con `reasonCode: excluded_by_auth_order` y el detalle `Excluded by auth.order for this provider.`

## Resolución del objetivo del sondeo

- Los objetivos del sondeo pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
- Si un proveedor tiene credenciales pero OpenClaw no puede resolver un candidato de modelo sondeable para él, `models status --probe` informa `status: no_model` con `reasonCode: no_model`.

## OAuth SecretRef Policy Guard

- La entrada SecretRef es solo para credenciales estáticas.
- Si una credencial de perfil es `type: "oauth"`, los objetos SecretRef no son compatibles con el material de esa credencial de perfil.
- Si `auth.profiles.<id>.mode` es `"oauth"`, la entrada `keyRef`/`tokenRef` respaldada por SecretRef para ese perfil se rechaza.
- Las violaciones son fallos críticos en las rutas de resolución de autenticación al inicio/recargar.

## Mensajes compatibles con versiones anteriores

Para la compatibilidad con scripts, los errores de sonda mantienen esta primera línea sin cambios:

`Auth profile credentials are missing or expired.`

Se pueden agregar detalles amigables para humanos y códigos de razón estables en las líneas siguientes.
