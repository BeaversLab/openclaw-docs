---
summary: "Gestión de secretos: contrato SecretRef, comportamiento de la instantánea de tiempo de ejecución y limpieza segura unidireccional"
read_when:
  - Configuring SecretRefs for provider credentials and `auth-profiles.json` refs
  - Operating secrets reload, audit, configure, and apply safely in production
  - Understanding startup fail-fast, inactive-surface filtering, and last-known-good behavior
title: "Gestión de secretos"
sidebarTitle: "Gestión de secretos"
---

OpenClaw soporta SecretRefs aditivos para que las credenciales compatibles no necesiten almacenarse como texto sin formato en la configuración.

<Note>El texto plano aún funciona. Los SecretRefs son optativos por cada credencial.</Note>

## Goals and runtime model

Los secretos se resuelven en una instantánea de tiempo de ejecución en memoria.

- La resolución es ansiosa durante la activación, no perezosa en las rutas de solicitud.
- El inicio falla rápido cuando no se puede resolver un SecretRef efectivamente activo.
- La recarga utiliza intercambio atómico: éxito total o mantener la instantánea last-known-good.
- Las violaciones de la política SecretRef (por ejemplo, perfiles de autenticación en modo OAuth combinados con entrada SecretRef) fallan la activación antes del intercambio en tiempo de ejecución.
- Las solicitudes en tiempo de ejecución leen solo de la instantánea activa en memoria.
- Después de la primera activación/carga exitosa de la configuración, las rutas de código en tiempo de ejecución siguen leyendo esa instantánea activa en memoria hasta que una recarga exitosa la intercambia.
- Las rutas de entrega saliente también leen de esa instantánea activa (por ejemplo, entrega de respuestas/hilos de Discord y envíos de acciones de Telegram); no resuelven nuevamente los SecretRefs en cada envío.

Esto mantiene las interrupciones del proveedor de secretos fuera de las rutas de solicitudes activas.

## Filtrado de superficie activa

Los SecretRefs solo se validan en superficies efectivamente activas.

- Superficies habilitadas: las referencias no resueltas bloquean el inicio/recarga.
- Superficies inactivas: las referencias no resueltas no bloquean el inicio/recarga.
- Las referencias inactivas emiten diagnósticos no fatales con el código `SECRETS_REF_IGNORED_INACTIVE_SURFACE`.

<AccordionGroup>
  <Accordion title="Ejemplos de superficies inactivas">
    - Entradas de canal/cuenta deshabilitadas.
    - Credenciales de canal de nivel superior que ninguna cuenta habilitada hereda.
    - Superficies de herramientas/funcionalidades deshabilitadas.
    - Claves específicas del proveedor de búsqueda web que no están seleccionadas por `tools.web.search.provider`. En modo automático (proveedor no establecido), se consultan las claves por precedencia para la detección automática del proveedor hasta que una se resuelve. Después de la selección, las claves del proveedor no seleccionado se tratan como inactivas hasta que se seleccionen.
    - El material de autenticación SSH de sandbox (`agents.defaults.sandbox.ssh.identityData`, `certificateData`, `knownHostsData`, además de las anulaciones por agente) solo está activo cuando el backend efectivo de sandbox es `ssh` para el agente predeterminado o un agente habilitado.
    - Los SecretRefs `gateway.remote.token` / `gateway.remote.password` están activos si se cumple una de estas condiciones:
      - `gateway.mode=remote`
      - `gateway.remote.url` está configurado
      - `gateway.tailscale.mode` es `serve` o `funnel`
      - En modo local sin esas superficies remotas:
        - `gateway.remote.token` está activo cuando la autenticación por token puede ganar y no se ha configurado ningún token de entorno/autenticación.
        - `gateway.remote.password` está activo solo cuando la autenticación por contraseña puede ganar y no se ha configurado ninguna contraseña de entorno/autenticación.
    - El SecretRef `gateway.auth.token` está inactivo para la resolución de autenticación de inicio cuando `OPENCLAW_GATEWAY_TOKEN` está establecido, porque la entrada de token de entorno gana para ese tiempo de ejecución.

  </Accordion>
</AccordionGroup>

## Diagnósticos de la superficie de autenticación de la puerta de enlace

Cuando se configura un SecretRef en `gateway.auth.token`, `gateway.auth.password`, `gateway.remote.token` o `gateway.remote.password`, el registro de inicio/recarga de la puerta de enlace registra explícitamente el estado de la superficie:

- `active`: el SecretRef es parte de la superficie de autenticación efectiva y debe resolverse.
- `inactive`: el SecretRef se ignora para este tiempo de ejecución porque otra superficie de autenticación tiene prioridad, o porque la autenticación remota está desactivada/inactiva.

Estas entradas se registran con `SECRETS_GATEWAY_AUTH_SURFACE` e incluyen el motivo utilizado por la política de superficie activa, para que pueda ver por qué una credencial se trató como activa o inactiva.

## Verificación previa de referencia de incorporación

Cuando la incorporación se ejecuta en modo interactivo y elige almacenamiento SecretRef, OpenClaw ejecuta una validación previa antes de guardar:

- Referencias de entorno (Env refs): valida el nombre de la variable de entorno y confirma que un valor no vacío sea visible durante la configuración.
- Referencias de proveedor (`file` o `exec`): valida la selección del proveedor, resuelve `id` y verifica el tipo del valor resuelto.
- Ruta de reutilización de inicio rápido: cuando `gateway.auth.token` ya es un SecretRef, la integración lo resuelve antes del arranque del probe/dashboard (para referencias `env`, `file` y `exec`) usando la misma puerta de falla rápida.

Si la validación falla, la incorporación muestra el error y le permite reintentar.

## Contrato SecretRef

Use una forma de objeto en todas partes:

```json5
{ source: "env" | "file" | "exec", provider: "default", id: "..." }
```

<Tabs>
  <Tab title="env">
    ```json5
    { source: "env", provider: "default", id: "OPENAI_API_KEY" }
    ```

    Los campos SecretInput compatibles también acepten abreviaturas de cadena exactas:

    ```json5
    "${OPENAI_API_KEY}"
    "$OPENAI_API_KEY"
    ```

    Validación:

    - `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
    - `id` debe coincidir con `^[A-Z][A-Z0-9_]{0,127}$`

  </Tab>
  <Tab title="file">
    ```json5
    { source: "file", provider: "filemain", id: "/providers/openai/apiKey" }
    ```

    Validación:

    - `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
    - `id` debe ser un puntero JSON absoluto (`/...`)
    - Escapado RFC6901 en segmentos: `~` => `~0`, `/` => `~1`

  </Tab>
  <Tab title="exec">
    ```json5
    { source: "exec", provider: "vault", id: "providers/openai/apiKey" }
    ```

    Validación:

    - `provider` debe coincidir con `^[a-z][a-z0-9_-]{0,63}$`
    - `id` debe coincidir con `^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$`
    - `id` no debe contener `.` o `..` como segmentos de ruta delimitados por barras (por ejemplo, `a/../b` se rechaza)

  </Tab>
</Tabs>

## Configuración del proveedor

Defina los proveedores en `secrets.providers`:

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

<AccordionGroup>
  <Accordion title="Proveedor de entorno">
    - Lista de permitidos opcional a través de `allowlist`.
    - Los valores de entorno faltantes o vacíos fallan la resolución.

  </Accordion>
  <Accordion title="Proveedor de archivos">
    - Lee el archivo local desde `path`.
    - `mode: "json"` espera una carga útil de objeto JSON y resuelve `id` como puntero.
    - `mode: "singleValue"` espera el id de referencia `"value"` y devuelve el contenido del archivo.
    - La ruta debe pasar las verificaciones de propiedad/permisos.
    - Nota de falla cerrada en Windows: si la verificación de ACL no está disponible para una ruta, la resolución falla. Solo para rutas confiables, establezca `allowInsecurePath: true` en ese proveedor para omitir las verificaciones de seguridad de ruta.

  </Accordion>
  <Accordion title="Proveedor Exec">
    - Ejecuta la ruta binaria absoluta configurada, sin shell.
    - De forma predeterminada, `command` debe apuntar a un archivo regular (no a un enlace simbólico).
    - Establezca `allowSymlinkCommand: true` para permitir rutas de comandos de enlace simbólico (por ejemplo, shims de Homebrew). OpenClaw valida la ruta de destino resuelta.
    - Combine `allowSymlinkCommand` con `trustedDirs` para rutas de administradores de paquetes (por ejemplo, `["/opt/homebrew"]`).
    - Admite tiempo de espera, tiempo de espera sin salida, límites de bytes de salida, lista de permitidos para variables de entorno y directorios de confianza.
    - Nota de fail-closed en Windows: si la verificación de ACL no está disponible para la ruta del comando, la resolución falla. Solo para rutas de confianza, establezca `allowInsecurePath: true` en ese proveedor para omitir las verificaciones de seguridad de la ruta.

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

  </Accordion>
</AccordionGroup>

## Claves de API respaldadas por archivos

No ponga cadenas `file:...` en el bloque `env` de configuración. El bloque `env` es
literal y no anulable, por lo que `file:...` no se resuelve.

Utilice un archivo SecretRef en un campo de credencial compatible en su lugar:

```json5
{
  secrets: {
    providers: {
      xai_key_file: {
        source: "file",
        path: "~/.openclaw/secrets/xai-api-key.txt",
        mode: "singleValue",
      },
    },
  },
  models: {
    providers: {
      xai: {
        apiKey: { source: "file", provider: "xai_key_file", id: "value" },
      },
    },
  },
}
```

Para `mode: "singleValue"`, el SecretRef `id` es `"value"`. Para
`mode: "json"`, utilice un puntero JSON absoluto como
`"/providers/xai/apiKey"`.

Consulte [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface) para
ver los campos de configuración que aceptan SecretRefs.

## Ejemplos de integración Exec

<AccordionGroup>
  <Accordion title="CLI de 1Password">
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
  </Accordion>
  <Accordion title="CLI de HashiCorp Vault">
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
  </Accordion>
  <Accordion title="sops">
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
  </Accordion>
</AccordionGroup>

## Variables de entorno del servidor MCP

Las variables de entorno del servidor MCP configuradas a través de `plugins.entries.acpx.config.mcpServers` admiten SecretInput. Esto evita que las claves de API y los tokens se almacenen como texto sin formato en la configuración:

```json5
{
  plugins: {
    entries: {
      acpx: {
        enabled: true,
        config: {
          mcpServers: {
            github: {
              command: "npx",
              args: ["-y", "@modelcontextprotocol/server-github"],
              env: {
                GITHUB_PERSONAL_ACCESS_TOKEN: {
                  source: "env",
                  provider: "default",
                  id: "MCP_GITHUB_PAT",
                },
              },
            },
          },
        },
      },
    },
  },
}
```

Los valores de cadena de texto sin formato todavía funcionan. Las referencias de plantilla de entorno como `${MCP_SERVER_API_KEY}` y los objetos SecretRef se resuelven durante la activación de la puerta de enlace antes de que se genere el proceso del servidor MCP. Al igual que con otras superficies SecretRef, las referencias sin resolver solo bloquean la activación cuando el complemento `acpx` está efectivamente activo.

## Material de autenticación SSH de Sandbox

El backend de sandbox `ssh` también admite SecretRefs para el material de autenticación SSH:

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

- OpenClaw resuelve estas referencias durante la activación del sandbox, no de forma diferida durante cada llamada SSH.
- Los valores resueltos se escriben en archivos temporales con permisos restrictivos y se utilizan en la configuración SSH generada.
- Si el backend efectivo del sandbox no es `ssh`, estas referencias permanecen inactivas y no bloquean el inicio.

## Superficie de credenciales admitida

Las credenciales admitidas y no admitidas canónicas se enumeran en:

- [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface)

<Note>Las credenciales creadas en tiempo de ejecución o rotativas y el material de actualización de OAuth se excluyen intencionalmente de la resolución de SecretRef de solo lectura.</Note>

## Comportamiento y precedencia requeridos

- Campo sin referencia: sin cambios.
- Campo con una referencia: requerido en superficies activas durante la activación.
- Si existen tanto el texto sin formato como la referencia, la referencia tiene prioridad en las rutas de precedencia admitidas.
- El valor centinela de redacción `__OPENCLAW_REDACTED__` está reservado para la redacción/restauración de la configuración interna y se rechaza como datos de configuración enviados literales.

Advertencias y señales de auditoría:

- `SECRETS_REF_OVERRIDES_PLAINTEXT` (advertencia en tiempo de ejecución)
- `REF_SHADOWED` (hallazgo de auditoría cuando las credenciales `auth-profiles.json` tienen prioridad sobre las referencias `openclaw.json`)

Comportamiento de compatibilidad con Google Chat:

- `serviceAccountRef` tiene prioridad sobre el texto sin formato `serviceAccount`.
- El valor de texto sin formato se ignora cuando se establece la referencia del mismo nivel.

## Activadores de activación

La activación de secretos se ejecuta en:

- Inicio (verificación previa más activación final)
- Ruta de aplicación en caliente de recarga de configuración
- Ruta de verificación de reinicio de recarga de configuración
- Recarga manual mediante `secrets.reload`
- Verificación previa a la escritura de configuración de RPC de Gateway (`config.set` / `config.apply` / `config.patch`) para la resolución de SecretRef de superficie activa dentro de la carga útil de configuración enviada antes de persistir las ediciones

Contrato de activación:

- El éxito intercambia la instantánea atómicamente.
- El fallo de inicio aborta el inicio de la puerta de enlace.
- El fallo de recarga en tiempo de ejecución mantiene la última instantánea conocida válida.
- El fallo en la verificación previa de escritura de RPC rechaza la configuración enviada y mantiene tanto la configuración en disco como la instantánea de tiempo de ejecución activa sin cambios.
- Proporcionar un token de canal explícito por llamada a una llamada de herramienta/ayuda saliente no activa la activación de SecretRef; los puntos de activación siguen siendo inicio, recarga y `secrets.reload` explícito.

## Señales degradadas y recuperadas

Cuando la activación en el momento de la recarga falla después de un estado saludable, OpenClaw entra en un estado de secretos degradados.

Códigos de eventos del sistema y de registro de una sola vez:

- `SECRETS_RELOADER_DEGRADED`
- `SECRETS_RELOADER_RECOVERED`

Comportamiento:

- Degradado: el tiempo de ejecución mantiene la última instantánea conocida válida.
- Recuperado: se emite una vez después de la siguiente activación exitosa.
- Los fallos repetidos mientras ya está degradado registran advertencias, pero no envían eventos en masa.
- El fallo rápido de inicio no emite eventos degradados porque el tiempo de ejecución nunca se activó.

## Resolución de ruta de comandos

Las rutas de comandos pueden optar por la resolución admitida de SecretRef mediante RPC de instantánea de la puerta de enlace.

Existen dos comportamientos generales:

<Tabs>
  <Tab title="Rutas de comandos estrictas">
    Por ejemplo `openclaw memory` rutas de memoria remota y `openclaw qr --remote` cuando necesita referencias de secretos compartidos remotos. Leen desde la instantánea activa y fallan rápido cuando un SecretRef requerido no está disponible.
  </Tab>
  <Tab title="Rutas de comandos de solo lectura">
    Por ejemplo `openclaw status`, `openclaw status --all`, `openclaw channels status`, `openclaw channels resolve`, `openclaw security audit` y los flujos de reparación de configuración/doctor de solo lectura. También prefieren la instantánea activa, pero degradan en lugar de abortar cuando un SecretRef específico no está disponible en esa ruta de comando.

    Comportamiento de solo lectura:

    - Cuando la puerta de enlace se está ejecutando, estos comandos leen primero de la instantánea activa.
    - Si la resolución de la puerta de enlace está incompleta o la puerta de enlace no está disponible, intentan una reserva local específica para la superficie de comando específica.
    - Si un SecretRef específico todavía no está disponible, el comando continúa con una salida degradada de solo lectura y diagnósticos explícitos como "configurado pero no disponible en esta ruta de comando".
    - Este comportamiento degradado es solo local al comando. No debilita el inicio en tiempo de ejecución, la recarga, o las rutas de envío/autenticación.

  </Tab>
</Tabs>

Otras notas:

- La actualización de la instantánea después de la rotación del secreto del backend es manejada por `openclaw secrets reload`.
- Método RPC de puerta de enlace utilizado por estas rutas de comando: `secrets.resolve`.

## Flujo de trabajo de auditoría y configuración

Flujo de operador predeterminado:

<Steps>
  <Step title="Auditar estado actual">```bash openclaw secrets audit --check ```</Step>
  <Step title="Configurar SecretRefs">```bash openclaw secrets configure ```</Step>
  <Step title="Reauditar">```bash openclaw secrets audit --check ```</Step>
</Steps>

<AccordionGroup>
  <Accordion title="secrets audit">
    Los hallazgos incluyen:

    - valores en texto plano en reposo (`openclaw.json`, `auth-profiles.json`, `.env`, y `agents/*/agent/models.json` generados)
    - residuos de encabezados de proveedores confidenciales en texto plano en entradas `models.json` generadas
    - referencias no resueltas
    - sombreado de precedencia (`auth-profiles.json` tomando prioridad sobre las referencias `openclaw.json`)
    - residuos heredados (`auth.json`, recordatorios de OAuth)

    Nota de Exec:

    - De forma predeterminada, la auditoría omite las comprobaciones de resolubilidad de SecretRef de exec para evitar efectos secundarios de comandos.
    - Use `openclaw secrets audit --allow-exec` para ejecutar proveedores exec durante la auditoría.

    Nota de residuos de encabezado:

    - La detección de encabezados de proveedores confidenciales se basa en heurística de nombres (nombres comunes de encabezados de autenticación/credenciales y fragmentos como `authorization`, `x-api-key`, `token`, `secret`, `password`, y `credential`).

  </Accordion>
  <Accordion title="secrets configure">
    Asistente interactivo que:

    - configura `secrets.providers` primero (`env`/`file`/`exec`, añadir/editar/eliminar)
    - le permite seleccionar los campos compatibles que portan secretos en `openclaw.json` además de `auth-profiles.json` para un ámbito de agente
    - puede crear una nueva asignación `auth-profiles.json` directamente en el selector de destino
    - captura los detalles de SecretRef (`source`, `provider`, `id`)
    - ejecuta la resolución preliminar
    - puede aplicar inmediatamente

    Nota sobre Exec:

    - La comprobación preliminar omite las comprobaciones de exec SecretRef a menos que `--allow-exec` esté establecido.
    - Si aplica directamente desde `configure --apply` y el plan incluye referencias/proveedores exec, mantenga `--allow-exec` establecido también para el paso de aplicación.

    Modos útiles:

    - `openclaw secrets configure --providers-only`
    - `openclaw secrets configure --skip-provider-setup`
    - `openclaw secrets configure --agent <id>`

    `configure` valores predeterminados de aplicación:

    - elimina las credenciales estáticas coincidentes de `auth-profiles.json` para los proveedores específicos
    - elimina las entradas `api_key` estáticas heredadas de `auth.json`
    - elimina las líneas de secreto conocidas coincidentes de `<config-dir>/.env`

  </Accordion>
  <Accordion title="secrets apply">
    Aplicar un plan guardado:

    ```bash
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --allow-exec
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run
    openclaw secrets apply --from /tmp/openclaw-secrets-plan.json --dry-run --allow-exec
    ```

    Nota sobre Exec:

    - La ejecución de prueba omite las comprobaciones exec a menos que `--allow-exec` esté establecido.
    - El modo de escritura rechaza los planes que contienen SecretRefs/proveedores exec a menos que `--allow-exec` esté establecido.

    Para obtener detalles estrictos sobre el contrato de destino/ruta y las reglas exactas de rechazo, consulte [Secrets Apply Plan Contract](/es/gateway/secrets-plan-contract).

  </Accordion>
</AccordionGroup>

## Política de seguridad unidireccional

<Warning>OpenClaw intencionalmente no escribe copias de seguridad de reversión que contengan valores de secretos en texto plano históricos.</Warning>

Modelo de seguridad:

- la comprobación preliminar debe tener éxito antes del modo de escritura
- la activación en tiempo de ejecución se valida antes de la confirmación
- apply actualiza los archivos mediante reemplazo atómico de archivos y restauración con mejor esfuerzo en caso de error

## Notas de compatibilidad de autenticación heredada

Para las credenciales estáticas, el tiempo de ejecución ya no depende del almacenamiento de autenticación heredada en texto plano.

- El origen de las credenciales en tiempo de ejecución es la instantánea en memoria resuelta.
- Las entradas estáticas heredadas `api_key` se eliminan cuando se descubren.
- El comportamiento de compatibilidad relacionado con OAuth permanece separado.

## Nota sobre la interfaz de usuario web

Algunas uniones de SecretInput son más fáciles de configurar en el modo de editor sin formato que en el modo de formulario.

## Relacionado

- [Authentication](/es/gateway/authentication) — configuración de autenticación
- [CLI: secrets](/es/cli/secrets) — comandos de CLI
- [Environment Variables](/es/help/environment) — precedencia del entorno
- [SecretRef Credential Surface](/es/reference/secretref-credential-surface) — superficie de credenciales
- [Secrets Apply Plan Contract](/es/gateway/secrets-plan-contract) — detalles del contrato del plan
- [Security](/es/gateway/security) — postura de seguridad
