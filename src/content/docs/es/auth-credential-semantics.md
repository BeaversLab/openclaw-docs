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

## Portabilidad de la copia del agente

La herencia de autenticación del agente es de lectura continua. Cuando un agente no tiene un perfil local, puede
resolver perfiles del almacenamiento predeterminado/principal del agente en tiempo de ejecución sin
copiar el material secreto en su propio `auth-profiles.json`.

Los flujos de copia explícitos, como `openclaw agents add`, utilizan esta política de portabilidad:

- Los perfiles `api_key` son portables a menos que `copyToAgents: false`.
- Los perfiles `token` son portables a menos que `copyToAgents: false`.
- Los perfiles `oauth` no son portables de manera predeterminada porque los tokens de actualización pueden ser
  de un solo uso o sensibles a la rotación.
- Los flujos de OAuth propiedad del proveedor pueden optar por participar con `copyToAgents: true` solo cuando
  se sabe que copiar el material de actualización entre agentes es seguro.

Los perfiles no portátiles siguen disponibles a través de la herencia de lectura directa a menos que
el agente de destino inicie sesión por separado y cree su propio perfil local.

## Rutas de autenticación solo de configuración

Las entradas `auth.profiles` con `mode: "aws-sdk"` son metadatos de enrutamiento, no credenciales
almacenadas. Son válidas cuando el proveedor de destino usa
`models.providers.<id>.auth: "aws-sdk"` o la configuración de Amazon Bedrock propiedad del complemento
ruta del AWS SDK. Estos identificadores de perfil pueden aparecer en `auth.order` y anulaciones
de sesión incluso cuando no existe una entrada coincidente en `auth-profiles.json`.

No escriba `type: "aws-sdk"` en `auth-profiles.json`. Si una instalación heredada
tiene dicho marcador, `openclaw doctor --fix` lo mueve a `auth.profiles` y
elimina el marcador del almacén de credenciales.

## Filtrado explícito del orden de autenticación

- Cuando se establece `auth.order.<provider>` o la anulación del orden del almacén de autenticación para un proveedor, `models status --probe` solo sondea los IDs de perfil que permanecen en el orden de autenticación resuelto para ese proveedor.
- Un perfil almacenado para ese proveedor que se omite del orden explícito no se intenta silenciosamente más tarde. El resultado del sondeo lo informa con `reasonCode: excluded_by_auth_order` y el detalle `Excluded by auth.order for this provider.`

## Resolución del objetivo del sondeo

- Los objetivos del sondeo pueden provenir de perfiles de autenticación, credenciales de entorno o `models.json`.
- Si un proveedor tiene credenciales pero OpenClaw no puede resolver un candidato de modelo sondeable para él, `models status --probe` informa `status: no_model` con `reasonCode: no_model`.

## Descubrimiento de credenciales de CLI externas

- Las credenciales de solo tiempo de ejecución propiedad de CLIs externas se descubren solo cuando el proveedor, el tiempo de ejecución o el perfil de autenticación están dentro del alcance para la operación actual, o cuando ya existe un perfil local almacenado para esa fuente externa.
- Los llamadores del almacén de autenticación deben elegir un modo de descubrimiento de CLI externo explícito: `none` solo para autenticación persistente/de complementos, `existing` para actualizar los perfiles de CLI externos ya almacenados, o `scoped` para un conjunto de proveedor/perfil concreto.
- Las rutas de solo lectura/estado pasan `allowKeychainPrompt: false`; usan solo credenciales externas de CLI respaldadas por archivos y no leen ni reutilizan los resultados del macOS Keychain.

## Protector de políticas de SecretRef de OAuth

- La entrada de SecretRef es solo para credenciales estáticas.
- Si una credencial de perfil es `type: "oauth"`, los objetos SecretRef no son compatibles con ese material de credencial de perfil.
- Si `auth.profiles.<id>.mode` es `"oauth"`, se rechaza la entrada de `keyRef`/`tokenRef` respaldada por SecretRef para ese perfil.
- Las violaciones son fallos críticos en las rutas de resolución de autenticación al iniciar/recargar.

## Mensajes compatibles con sistemas heredados

Para la compatibilidad con scripts, los errores de sonda mantienen esta primera línea sin cambios:

`Auth profile credentials are missing or expired.`

Se pueden agregar detalles amigables para humanos y códigos de motivo estables en líneas posteriores.

## Relacionado

- [Gestión de secretos](/es/gateway/secrets)
- [Almacenamiento de autenticación](/es/concepts/oauth)
