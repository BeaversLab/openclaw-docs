---
summary: "Secrets management: SecretRef contract, runtime snapshot behavior, and safe one-way scrubbing"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Secrets Management"
---

# Secrets management

OpenClaw soporta SecretRefs aditivos para que las credenciales compatibles no necesiten almacenarse como texto sin formato en la configuración.

El texto sin formato todavía funciona. Los SecretRefs son opcionales por credencial.

## Goals and runtime model

Los secretos se resuelven en una instantánea de tiempo de ejecución en memoria.

- La resolución es ansiosa durante la activación, no perezosa en las rutas de solicitud.
- El inicio falla rápido cuando no se puede resolver un SecretRef efectivamente activo.
- La recarga utiliza intercambio atómico: éxito total o mantener la instantánea last-known-good.
- Las solicitudes de tiempo de ejecución leen solo de la instantánea activa en memoria.
- Las rutas de entrega saliente también leen de esa instantánea activa (por ejemplo, entrega de respuesta/hilo de Discord y envíos de acciones de Telegram); no resuelven nuevamente los SecretRefs en cada envío.

Esto mantiene las interrupciones del proveedor de secretos fuera de las rutas de solicitud activas.

## Active-surface filtering

Los SecretRefs solo se validan en superficies efectivamente activas.

- Superficies habilitadas: las referencias no resueltas bloquean el inicio/recarga.
- Superficies inactivas: las referencias no resueltas no bloquean el inicio/recarga.
- Las referencias inactivas emiten diagnósticos no fatales con el código `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

Ejemplos de superficies inactivas:

- Entradas de canal/cuenta deshabilitadas.
- Credenciales de canal de nivel superior que ninguna cuenta habilitada hereda.
- Superficies de herramientas/características deshabilitadas.
- Claves específicas del proveedor de búsqueda web que no están seleccionadas por `tools.web.search.provider`.
  En modo automático (proveedor no establecido), se consultan las claves por precedencia para la detección automática del proveedor hasta que una se resuelva.
  Después de la selección, las claves del proveedor no seleccionado se tratan como inactivas hasta que sean seleccionadas.
- El material de autenticación SSH de Sandbox (`agents.defaults.sandbox.ssh.identityData`,
  `certificateData`, `knownHostsData`, más las anulaciones por agente) está activo solo
  cuando el backend efectivo de Sandbox es `ssh` para el agente predeterminado o un agente habilitado.
- Los SecretRefs `gateway.remote.token` / `gateway.remote.password` están activos si se cumple una de estas condiciones:
  - `gateway.mode=remote`
  - `gateway.remote.url` está configurado
  - `gateway.tailscale.mode` es `serve` o `funnel`
  - En modo local sin esas superficies remotas:
    - `gateway.remote.token` está activo cuando la autenticación por token puede ganar y no hay ningún token de entorno/autenticación configurado.
    - `gateway.remote.password` está activo solo cuando la autenticación por contraseña puede ganar y no hay ninguna contraseña de entorno/autenticación configurada.
- El SecretRef `gateway.auth.token` está inactivo para la resolución de autenticación al inicio cuando `OPENCLAW_GATEWAY_TOKEN` (o `CLAWDBOT_GATEWAY_TOKEN`) está establecido, porque la entrada del token de entorno gana para ese tiempo de ejecución.

## Diagnósticos de la superficie de autenticación de la pasarela

Cuando se configura un SecretRef en `gateway.auth.token`, `gateway.auth.password`,
`gateway.remote.token` o `gateway.remote.password`, el registro de inicio/recarga de la pasarela registra
explícitamente el estado de la superficie:

- `active`: el SecretRef es parte de la superficie de autenticación efectiva y debe resolverse.
- `inactive`: el SecretRef se ignora para este tiempo de ejecución porque gana otra superficie de autenticación, o
  porque la autenticación remota está deshabilitada/inactiva.

Estas entradas se registran con `SECRETS_GATEWAY_AUTH_SURFACE` e incluyen el motivo utilizado por la
política de superficie activa, por lo que puede ver por qué una credencial se trató como activa o inactiva.

## Verificación previa de referencia de incorporación

Cuando la incorporación se ejecuta en modo interactivo y elige el almacenamiento SecretRef, OpenClaw ejecuta una validación previa antes de guardar:

- Referencias de entorno (Env refs): valida el nombre de la variable de entorno y confirma que un valor no vacío sea visible durante la configuración.
- Referencias de proveedor (`file` o `exec`): valida la selección del proveedor, resuelve `id` y verifica el tipo de valor resuelto.
- Ruta de reutilización de inicio rápido: cuando `gateway.auth.token` ya es un SecretRef, la incorporación lo resuelve antes del inicio del sonde/panel (para referencias `env`, `file` y `exec`) utilizando la misma puerta de falla rápida (fail-fast).

Si la validación falla, la incorporación muestra el error y le permite reintentar.

## Contrato de SecretRef

Use una forma de objeto en todas partes:

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

### `source: "env"`

```json5
{ source: "env", provider: "default", id: "OPENAI_API_KEY" }
```

Validación:

- `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
- `id` debe coincidir con `^[A-Z][A-Z0-9_]{0,127}$`

### `source: "file"`

```json5
{ source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
```

Validación:

- `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
- `id` debe ser un puntero JSON absoluto (`/...`)
- Escapado RFC6901 en segmentos: `~` => `~0`, `/` => `~1`

### `source: "exec"`

```json5
{ source: "exec", provider: "vault", id: "providers/openai/apiKey" }
```

Validación:

- `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
- `id` debe coincidir con `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
- `id` no debe contener `.` o `..` como segmentos de ruta delimitados por barras (por ejemplo, `a/../b` se rechaza)

## Configuración del proveedor

Defina los proveedores bajo `secrets.providers`:

```json5
{
  secrets: {
    providers: {
      default: { source: "env" },
      filemain: {
        source: "file",
        path: "~/.openclaw/secrets.json",
        mode: "json", // or "singleValue"
      },
      vault: {
        source: "exec",
        command: "/usr/local/bin/openclaw-vault-resolver",
        args: ["--profile", "prod"],
        passEnv: ["PATH", "VAULT_ADDR"],
        jsonOnly: true,
      },
    },
    defaults: {
      env: "default",
      file: "filemain",
      exec: "vault",
    },
    resolution: {
      maxProviderConcurrency: 4,
      maxRefsPerProvider: 512,
      maxBatchBytes: 262144,
    },
  },
}
```

### Proveedor Env

- Lista de permitidos opcional vía `allowlist`.
- Valores de entorno faltantes o vacíos fallan la resolución.

### Proveedor de archivos

- Lee el archivo local desde `path`.
- `mode: "json"` espera una carga útil de objeto JSON y resuelve `id` como puntero.
- `mode: "singleValue"` espera el ID de referencia `"value"` y devuelve el contenido del archivo.
- La ruta debe pasar las verificaciones de propietario/permisos.
- Nota de fail-closed de Windows: si la verificación de ACL no está disponible para una ruta, la resolución falla. Solo para rutas confiables, establezca `allowInsecurePath: true` en ese proveedor para omitir las verificaciones de seguridad de la ruta.

### Proveedor Exec

- Ejecuta la ruta binaria absoluta configurada, sin shell.
- De forma predeterminada, `command` debe apuntar a un archivo normal (no a un enlace simbólico).
- Establezca `allowSymlinkCommand: true` para permitir rutas de comando de enlaces simbólicos (por ejemplo, shims de Homebrew). OpenClaw valida la ruta de destino resuelta.
- Combine `allowSymlinkCommand` con `trustedDirs` para rutas de administradores de paquetes (por ejemplo `["/opt/homebrew"]`).
- Admite tiempo de espera, tiempo de espera sin salida, límites de bytes de salida, lista blanca de env y directorios confiables.
- Nota de fail-closed de Windows: si la verificación de ACL no está disponible para la ruta del comando, la resolución falla. Solo para rutas confiables, establezca `allowInsecurePath: true` en ese proveedor para omitir las verificaciones de seguridad de la ruta.

Carga útil de la solicitud (stdin):

```json
{ "protocolVersion": 1, "provider": "vault", "ids": ["providers/openai/apiKey"] }
```

Carga útil de la respuesta (stdout):

```jsonc
{ "protocolVersion": 1, "values": { "providers/openai/apiKey": "<openai-api-key>" } } // pragma: allowlist secret
```

Errores opcionales por ID:

```json
{
  "protocolVersion": 1,
  "values": {},
  "errors": { "providers/openai/apiKey": { "message": "not found" } }
}
```

## Ejemplos de integración Exec

### CLI de 1Password

```json5
{
  secrets: {
    providers: {
      onepassword_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/op",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["read", "op://Personal/OpenClaw QA API Key/password"],
        passEnv: ["HOME"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "onepassword_openai", id: "value" },
      },
    },
  },
}
```

### CLI de HashiCorp Vault

```json5
{
  secrets: {
    providers: {
      vault_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/vault",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["kv", "get", "-field=OPENAI_API_KEY", "secret/openclaw"],
        passEnv: ["VAULT_ADDR", "VAULT_TOKEN"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "vault_openai", id: "value" },
      },
    },
  },
}
```

### `sops`

```json5
{
  secrets: {
    providers: {
      sops_openai: {
        source: "exec",
        command: "/opt/homebrew/bin/sops",
        allowSymlinkCommand: true, // required for Homebrew symlinked binaries
        trustedDirs: ["/opt/homebrew"],
        args: ["-d", "--extract", '["providers"]["openai"]["apiKey"]', "/path/to/secrets.enc.json"],
        passEnv: ["SOPS_AGE_KEY_FILE"],
        jsonOnly: false,
      },
    },
  },
  models: {
    providers: {
      openai: {
        baseUrl: "https://api.openai.com/v1",
        models: [{ id: "gpt-5", name: "gpt-5" }],
        apiKey: { source: "exec", provider: "sops_openai", id: "value" },
      },
    },
  },
}
```

## Material de autenticación SSH de Sandbox

El backend de sandbox `ssh` central también admite SecretRefs para el material de autenticación SSH:

```json5
{
  agents: {
    defaults: {
      sandbox: {
        mode: "all",
        backend: "ssh",
        ssh: {
          target: "user@gateway-host:22",
          identityData: { source: "env", provider: "default", id: "SSH_IDENTITY" },
          certificateData: { source: "env", provider: "default", id: "SSH_CERTIFICATE" },
          knownHostsData: { source: "env", provider: "default", id: "SSH_KNOWN_HOSTS" },
        },
      },
    },
  },
}
```

Comportamiento en tiempo de ejecución:

- OpenClaw resuelve estas referencias durante la activación del sandbox, no de forma perezosa durante cada llamada SSH.
- Los valores resueltos se escriben en archivos temporales con permisos restrictivos y se utilizan en la configuración SSH generada.
- Si el backend de sandbox efectivo no es `ssh`, estas referencias permanecen inactivas y no bloquean el inicio.

## Superficie de credenciales admitida

Las credenciales admitidas y no admitidas canónicas se enumeran en:

- [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface)

Las credenciales generadas en tiempo de ejecución o rotativas y el material de actualización de OAuth se excluyen intencionadamente de la resolución de SecretRef de solo lectura.

## Comportamiento y precedencia requeridos

- Campo sin referencia: sin cambios.
- Campo con referencia: requerido en las superficies activas durante la activación.
- Si están presentes tanto el texto sin formato como la referencia, la referencia tiene prioridad en las rutas de precedencia admitidas.

Señales de advertencia y auditoría:

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (advertencia de tiempo de ejecución)
- `REF_SHADOWED` (hallazgo de auditoría cuando las credenciales `auth-profiles.json` tienen prioridad sobre las referencias `openclaw.json`)

Comportamiento de compatibilidad con Google Chat:

- `serviceAccountRef` tiene prioridad sobre el texto sin formato `serviceAccount`.
- El valor de texto sin formato se ignora cuando se establece la referencia del mismo nivel.

## Activadores de activación

La activación de secretos se ejecuta en:

- Inicio (previo al vuelo más activación final)
- Ruta de aplicación en caliente de recarga de configuración
- Ruta de verificación de reinicio de recarga de configuración
- Recarga manual mediante `secrets.reload`

Contrato de activación:

- El éxito intercambia la instantánea de forma atómica.
- El fallo de inicio aborta el inicio de la puerta de enlace.
- El fallo de recarga en tiempo de ejecución mantiene la última instantánea conocida buena (last-known-good).
- Proporcionar un token de canal por llamada explícito a una llamada de herramienta/ayuda saliente no activa la activación de SecretRef; los puntos de activación siguen siendo inicio, recarga y `secrets.reload` explícito.

## Señales degradadas y recuperadas

Cuando falla la activación en el momento de la recarga después de un estado saludable, OpenClaw entra en un estado de secretos degradado.

Códigos de eventos y registros del sistema de un solo disparo:

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportamiento:

- Degradado: el tiempo de ejecución mantiene la última instantánea conocida buena.
- Recuperado: se emite una vez después de la siguiente activación exitosa.
- Los fallos repetidos mientras ya está degradado registran advertencias pero no envían spam de eventos.
- El fallo rápido de inicio (fail-fast) no emite eventos degradados porque el tiempo de ejecución nunca se activó.

## Resolución de ruta de comandos

Las rutas de comandos pueden optar por la resolución de SecretRef admitida a través de RPC de instantánea de la puerta de enlace.

Hay dos comportamientos generales:

- Las rutas de comandos estrictas (por ejemplo, rutas de memoria remota `openclaw memory` y `openclaw qr --remote`) leen de la instantánea activa y fallan rápidamente cuando un SecretRef requerido no está disponible.
- Las rutas de comandos de solo lectura (por ejemplo `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit`, y los flujos de reparación de doctor/config de solo lectura) también prefieren la instantánea activa, pero se degradan en lugar de abortar cuando un SecretRef específico no está disponible en esa ruta de comando.

Comportamiento de solo lectura:

- Cuando la puerta de enlace se está ejecutando, estos comandos leen primero de la instantánea activa.
- Si la resolución de la puerta de enlace está incompleta o la puerta de enlace no está disponible, intentan una reserva local específica para la superficie de comando específica.
- Si un SecretRef específico todavía no está disponible, el comando continúa con una salida de solo lectura degradada y diagnósticos explícitos como "configurado pero no disponible en esta ruta de comando".
- Este comportamiento degradado es exclusivo del comando local. No debilita el inicio en tiempo de ejecución, la recarga, o las rutas de envío/autenticación.

Otras notas:

- La actualización de la instantánea después de la rotación de secretos del backend es manejada por `openclaw secrets reload`.
- Método RPC de puerta de enlace utilizado por estas rutas de comando: `secrets.resolve`.

## Flujo de trabajo de auditoría y configuración

Flujo de operador predeterminado:

```bash
openclaw secrets audit --check
openclaw secrets configure
openclaw secrets audit --check
```

### `secrets audit`

Los hallazgos incluyen:

- valores en texto plano en reposo (`openclaw.json`, `auth-profiles.json`, `.env` y `agents/*/agent/models.json` generados)
- residuos de encabezados de proveedores sensibles en texto plano en entradas `models.json` generadas
- referencias sin resolver
- sombreado de precedencia (`auth-profiles.json` tomando prioridad sobre las referencias `openclaw.json`)
- residuos heredados (`auth.json`, recordatorios de OAuth)

Nota sobre el residuo del encabezado:

- La detección de encabezados de proveedores sensibles se basa en heurística de nombres (nombres comunes de encabezados de autenticación/credenciales y fragmentos como `authorization`, `x-api-key`, `token`, `secret`, `password` y `credential`).

### `secrets configure`

Asistente interactivo que:

- configura `secrets.providers` primero (`env`/`file`/`exec`, añadir/editar/eliminar)
- le permite seleccionar campos compatibles que portan secretos en `openclaw.json` además de `auth-profiles.json` para un ámbito de agente
- puede crear una nueva asignación de `auth-profiles.json` directamente en el selector de destino
- captura los detalles de SecretRef (`source`, `provider`, `id`)
- ejecuta la resolución previa al vuelo
- puede aplicar inmediatamente

Modos útiles:

- `openclaw secrets configure --providers-only`
- `openclaw secrets configure --skip-provider-setup`
- `openclaw secrets configure --agent <id>`

`configure` aplicar valores predeterminados:

- elimina las credenciales estáticas coincidentes de `auth-profiles.json` para los proveedores específicos
- elimina las entradas estáticas heredadas de `api_key` de `auth.json`
- elimina las líneas de secretos conocidas coincidentes de `<config-dir>/.env`

### `secrets apply`

Aplicar un plan guardado:

```bash
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
```

Para obtener detalles estrictos del contrato de destino/ruta y reglas de rechazo exactas, consulte:

- [Contrato del plan de aplicación de secretos](/es/gateway/secrets-plan-contract)

## Política de seguridad unidireccional

OpenClaw intencionalmente no escribe copias de seguridad de reversión que contengan valores históricos de secretos en texto plano.

Modelo de seguridad:

- la verificación previa debe tener éxito antes del modo de escritura
- la activación en tiempo de ejecución se valida antes de la confirmación
- apply actualiza los archivos utilizando reemplazo atómico de archivos y restauración de mejor esfuerzo en caso de error

## Notas de compatibilidad con la autenticación heredada

Para las credenciales estáticas, el tiempo de ejecución ya no depende del almacenamiento de autenticación heredada en texto plano.

- El origen de la credencial en tiempo de ejecución es la instantánea resuelta en memoria.
- Las entradas estáticas heredadas de `api_key` se eliminan cuando se descubren.
- El comportamiento de compatibilidad relacionado con OAuth permanece separado.

## Nota sobre la interfaz de usuario web

Algunas uniones de SecretInput son más fáciles de configurar en el modo de editor sin formato que en el modo de formulario.

## Documentos relacionados

- Comandos de CLI: [secrets](/es/cli/secrets)
- Detalles del contrato del plan: [Contrato del plan de aplicación de secretos](/es/gateway/secrets-plan-contract)
- Superficie de credenciales: [Superficie de credenciales de SecretRef](/es/reference/secretref-credential-surface)
- Configuración de autenticación: [Authentication](/es/gateway/authentication)
- Postura de seguridad: [Security](/es/gateway/security)
- Precedencia del entorno: [Environment Variables](/es/help/environment)

import es from "/components/footer/es.mdx";

<es />
