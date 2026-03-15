# Semántica de credenciales de autenticación

Este documento define la semántica canónica de elegibilidad y resolución de credenciales utilizada en:

- `resolveAuthProfileOrder`
- `resolveApiKeyForProfile`
- `models status --probe`
- `doctor-auth`

El objetivo es mantener el comportamiento de tiempo de selección y tiempo de ejecución alineados.

## Códigos de razón estables

- `ok`
- `missing_credential`
- `invalid_expires`
- `expired`
- `unresolved_ref`

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

## Mensajes compatibles con versiones anteriores

Para la compatibilidad con scripts, los errores de sonda mantienen esta primera línea sin cambios:

`Auth profile credentials are missing or expired.`

Se pueden agregar detalles amigables para humanos y códigos de razón estables en las líneas siguientes.

import es from "/components/footer/es.mdx";

<es />
