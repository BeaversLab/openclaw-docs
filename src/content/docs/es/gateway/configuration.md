---
summary: "Resumen de la configuración: tareas comunes, configuración rápida y enlaces a la referencia completa"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuración"
---

OpenClaw lee una configuración opcional de <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> desde `~/.openclaw/openclaw.json`.
La ruta de configuración activa debe ser un archivo regular. Los diseños `openclaw.json`
enlazados simbólicamente no son compatibles con las escrituras propiedad de OpenClaw; una escritura atómica puede reemplazar
la ruta en lugar de preservar el enlace simbólico. Si mantiene la configuración fuera del
directorio de estado predeterminado, apunte `OPENCLAW_CONFIG_PATH` directamente al archivo real.

Si falta el archivo, OpenClaw usa valores predeterminados seguros. Razones comunes para añadir una configuración:

- Conectar canales y controlar quién puede enviar mensajes al bot
- Establecer modelos, herramientas, sandbox (caja de arena) o automatización (cron, hooks)
- Ajustar sesiones, medios, red o interfaz de usuario (UI)

Consulte la [referencia completa](/es/gateway/configuration-reference) para cada campo disponible.

Los agentes y la automatización deben usar `config.schema.lookup` para obtener documentación exacta a nivel de campo antes de editar la configuración. Use esta página para obtener orientación orientada a tareas y [Referencia de configuración](/es/gateway/configuration-reference) para el mapa de campos más amplio y los valores predeterminados.

<Tip>**¿Nuevo en la configuración?** Comience con `openclaw onboard` para una configuración interactiva, o consulte la guía [Ejemplos de configuración](/es/gateway/configuration-examples) para configuraciones completas para copiar y pegar.</Tip>

## Configuración mínima

```json5
// ~/.openclaw/openclaw.json
{
  agents: { defaults: { workspace: "~/.openclaw/workspace" } },
  channels: { whatsapp: { allowFrom: ["+15555550123"] } },
}
```

## Editar configuración

<Tabs>
  <Tab title="Asistente interactivo">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">
    Abra [http://127.0.0.1:18789](http://127.0.0.1:18789) y use la pestaña **Config**. La interfaz de usuario de control renderiza un formulario a partir del esquema de configuración en vivo, incluyendo los metadatos de documentación `title` / `description` de los campos más los esquemas de complementos y canales cuando estén disponibles, con un editor **Raw JSON** como salida de emergencia. Para
    interfaces de usuario de profundización y otras herramientas, la puerta de enlace también expone `config.schema.lookup` para obtener un nodo de esquema con ámbito de ruta más resúmenes secundarios inmediatos.
  </Tab>
  <Tab title="Direct edit">Edite `~/.openclaw/openclaw.json` directamente. La puerta de enlace supervisa el archivo y aplica los cambios automáticamente (consulte [recarga en caliente](#config-hot-reload)).</Tab>
</Tabs>

## Validación estricta

<Warning>OpenClaw solo acepta configuraciones que coincidan completamente con el esquema. Las claves desconocidas, los tipos con formato incorrecto o los valores no válidos hacen que la puerta de enlace **se niegue a iniciarse**. La única excepción a nivel raíz es `$schema` (cadena), por lo que los editores pueden adjuntar metadatos de JSON Schema.</Warning>

`openclaw config schema` imprime el esquema JSON canónico utilizado por la interfaz de usuario de Control
y la validación. `config.schema.lookup` obtiene un único nodo con ámbito de ruta más
resúmenes secundarios para herramientas de profundización. Los metadatos de documentación del campo `title`/`description`
se transmiten a través de objetos anidados, comodines (`*`), elementos de matriz (`[]`) y ramas `anyOf`/
`oneOf`/`allOf`. Los esquemas de complementos y canales en tiempo de ejecución se fusionan cuando se
carga el registro de manifiestos.

Cuando falla la validación:

- El Gateway no se inicia
- Solo funcionan los comandos de diagnóstico (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Ejecute `openclaw doctor` para ver los problemas exactos
- Ejecute `openclaw doctor --fix` (o `--yes`) para aplicar reparaciones

El Gateway mantiene una copia confiable de la última buena configuración conocida después de cada inicio exitoso,
pero el inicio y la recarga en caliente no la restauran automáticamente. Si `openclaw.json`
falla la validación (incluida la validación local del complemento), el inicio del Gateway falla o
se omite la recarga y el tiempo de ejecución actual mantiene la última configuración aceptada.
Ejecute `openclaw doctor --fix` (o `--yes`) para reparar la configuración prefijada/sobrescrita o
restaurar la copia de la última buena configuración conocida. La promoción a última buena configuración conocida se omite cuando un
candidato contiene marcadores de posición de secretos redactados como `***`.

## Tareas comunes

<AccordionGroup>
  <Accordion title="Configurar un canal (WhatsApp, Telegram, Discord, etc.)">
    Cada canal tiene su propia sección de configuración en `channels.<provider>`. Consulte la página dedicada del canal para ver los pasos de configuración:

    - [WhatsApp](/es/channels/whatsapp) - `channels.whatsapp`
    - [Telegram](/es/channels/telegram) - `channels.telegram`
    - [Discord](/es/channels/discord) - `channels.discord`
    - [Feishu](/es/channels/feishu) - `channels.feishu`
    - [Google Chat](/es/channels/googlechat) - `channels.googlechat`
    - [Microsoft Teams](/es/channels/msteams) - `channels.msteams`
    - [Slack](/es/channels/slack) - `channels.slack`
    - [Signal](/es/channels/signal) - `channels.signal`
    - [iMessage](/es/channels/imessage) - `channels.imessage`
    - [Mattermost](/es/channels/mattermost) - `channels.mattermost`

    Todos los canales comparten el mismo patrón de política de MD:

    ```json5
    {
      channels: {
        telegram: {
          enabled: true,
          botToken: "123:abc",
          dmPolicy: "pairing",   // pairing | allowlist | open | disabled
          allowFrom: ["tg:123"], // only for allowlist/open
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Elegir y configurar modelos">
    Configure el modelo principal y las alternativas opcionales:

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.4"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.4": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` define el catálogo de modelos y actúa como la lista de permitidos para `/model`; las entradas `provider/*` filtran `/model`, `/models` y los selectores de modelos para los proveedores seleccionados, al tiempo que siguen utilizando el descubrimiento dinámico de modelos.
    - Use `openclaw config set agents.defaults.models '<json>' --strict-json --merge` para agregar entradas a la lista de permitidos sin eliminar los modelos existentes. Los reemplazos simples que eliminarían entradas son rechazados a menos que pase `--replace`.
    - Las referencias de modelo usan el formato `provider/model` (p. ej., `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` controla la reducción de escala de las imágenes de transcripción/herramientas (predeterminado `1200`); los valores más bajos generalmente reducen el uso de tokens de visión en ejecuciones con muchas capturas de pantalla.
    - Consulte [CLI de modelos](/es/concepts/models) para cambiar modelos en el chat y [Conmutación por error de modelo](/es/concepts/model-failover) para el comportamiento de rotación de autenticación y conmutación por error.
    - Para proveedores personalizados/autohospedados, consulte [Proveedores personalizados](/es/gateway/config-tools#custom-providers-and-base-urls) en la referencia.

  </Accordion>

  <Accordion title="Controlar quién puede enviar mensajes al bot">
    El acceso a MD se controla por canal mediante `dmPolicy`:

    - `"pairing"` (predeterminado): los remitentes desconocidos reciben un código de emparejamiento de un solo vez para aprobar
    - `"allowlist"`: solo remitentes en `allowFrom` (o el almacén de permisos emparejados)
    - `"open"`: permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)
    - `"disabled"`: ignorar todos los MD

    Para grupos, use `groupPolicy` + `groupAllowFrom` o listas de permitidos específicas del canal.

    Consulte la [referencia completa](/es/gateway/config-channels#dm-and-group-access) para obtener detalles por canal.

  </Accordion>

  <Accordion title="Configurar el filtrado de menciones en chats grupales">
    Los mensajes grupales predeterminados **requieren mención**. Configure los patrones de activación por agente. Las respuestas normales a grupos/canales se publican automáticamente; opte por la ruta de herramienta de mensaje (message-tool) para salas compartidas donde el agente debe decidir cuándo hablar:

    ```json5
    {
      messages: {
        visibleReplies: "automatic", // set "message_tool" to require message-tool sends everywhere
        groupChat: {
          visibleReplies: "message_tool", // opt-in; visible output requires message(action=send)
          unmentionedInbound: "room_event", // unmentioned always-on group chatter is quiet context
        },
      },
      agents: {
        list: [
          {
            id: "main",
            groupChat: {
              mentionPatterns: ["@openclaw", "openclaw"],
            },
          },
        ],
      },
      channels: {
        whatsapp: {
          groups: { "*": { requireMention: true } },
        },
      },
    }
    ```

    - **Menciones de metadatos**: menciones nativas con @ (menciones al tocar en WhatsApp, @bot en Telegram, etc.)
    - **Patrones de texto**: patrones de regex seguros en `mentionPatterns`
    - **Respuestas visibles**: `messages.visibleReplies` puede requerir envíos a través de la herramienta de mensaje (message-tool) globalmente; `messages.groupChat.visibleReplies` anula eso para grupos/canales.
    - Consulte la [referencia completa](/es/gateway/config-channels#group-chat-mention-gating) para ver los modos de respuesta visibles, las anulaciones por canal y el modo de chat propio.

  </Accordion>

  <Accordion title="Restringir habilidades por agente">
    Use `agents.defaults.skills` para una base compartida, luego anule agentes específicos
    con `agents.list[].skills`:

    ```json5
    {
      agents: {
        defaults: {
          skills: ["github", "weather"],
        },
        list: [
          { id: "writer" }, // inherits github, weather
          { id: "docs", skills: ["docs-search"] }, // replaces defaults
          { id: "locked-down", skills: [] }, // no skills
        ],
      },
    }
    ```

    - Omita `agents.defaults.skills` para habilidades sin restricciones de forma predeterminada.
    - Omita `agents.list[].skills` para heredar los valores predeterminados.
    - Establezca `agents.list[].skills: []` para no tener habilidades.
    - Consulte [Habilidades](/es/tools/skills), [Configuración de habilidades](/es/tools/skills-config) y la
      [Referencia de configuración](/es/gateway/config-agents#agents-defaults-skills).

  </Accordion>

  <Accordion title="Ajustar la supervisión de salud del canal de la pasarela">
    Controle qué tan agresivamente la pasarela reinicia los canales que parecen obsoletos:

    ```json5
    {
      gateway: {
        channelHealthCheckMinutes: 5,
        channelStaleEventThresholdMinutes: 30,
        channelMaxRestartsPerHour: 10,
      },
      channels: {
        telegram: {
          healthMonitor: { enabled: false },
          accounts: {
            alerts: {
              healthMonitor: { enabled: true },
            },
          },
        },
      },
    }
    ```

    - Establezca `gateway.channelHealthCheckMinutes: 0` para desactivar los reinicios de supervisión de salud globalmente.
    - `channelStaleEventThresholdMinutes` debe ser mayor o igual que el intervalo de verificación.
    - Use `channels.<provider>.healthMonitor.enabled` o `channels.<provider>.accounts.<id>.healthMonitor.enabled` para desactivar los reinicios automáticos de un canal o cuenta sin desactivar el monitor global.
    - Consulte [Verificaciones de salud](/es/gateway/health) para la depuración operativa y la [referencia completa](/es/gateway/configuration-reference#gateway) para todos los campos.

  </Accordion>

  <Accordion title="Ajustar el tiempo de espera del handshake WebSocket de la puerta de enlace">
    Dé a los clientes locales más tiempo para completar el handshake WebSocket previo a la autenticación en
    hosts con carga o de baja potencia:

    ```json5
    {
      gateway: {
        handshakeTimeoutMs: 30000,
      },
    }
    ```

    - El valor predeterminado es `15000` milisegundos.
    - `OPENCLAW_HANDSHAKE_TIMEOUT_MS` todavía tiene prioridad para anulaciones únicas de servicio o shell.
    - Se prefiere corregir primero los bloqueos de inicio/bucle de eventos; este control es para hosts que están sanos pero son lentos durante el calentamiento.

  </Accordion>

  <Accordion title="Configurar sesiones y restablecimientos">
    Las sesiones controlan la continuidad y el aislamiento de la conversación:

    ```json5
    {
      session: {
        dmScope: "per-channel-peer",  // recommended for multi-user
        threadBindings: {
          enabled: true,
          idleHours: 24,
          maxAgeHours: 0,
        },
        reset: {
          mode: "daily",
          atHour: 4,
          idleMinutes: 120,
        },
      },
    }
    ```

    - `dmScope`: `main` (compartida) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: valores predeterminados globales para el enrutamiento de sesiones vinculadas a hilos (Discord admite `/focus`, `/unfocus`, `/agents`, `/session idle` y `/session max-age`).
    - Consulte [Gestión de sesiones](/es/concepts/session) para obtener información sobre el alcance, los vínculos de identidad y la política de envío.
    - Consulte la [referencia completa](/es/gateway/config-agents#session) para todos los campos.

  </Accordion>

  <Accordion title="Habilitar sandbox">
    Ejecute sesiones de agentes en entornos de ejecución de sandbox aislados:

    ```json5
    {
      agents: {
        defaults: {
          sandbox: {
            mode: "non-main",  // off | non-main | all
            scope: "agent",    // session | agent | shared
          },
        },
      },
    }
    ```

    Primero compile la imagen: desde una comprobación de código fuente ejecute `scripts/sandbox-setup.sh`, o desde una instalación de npm consulte el comando `docker build` en línea en [Sandbox § Imágenes y configuración](/es/gateway/sandboxing#images-and-setup).

    Consulte [Sandbox](/es/gateway/sandboxing) para obtener la guía completa y la [referencia completa](/es/gateway/config-agents#agentsdefaultssandbox) para todas las opciones.

  </Accordion>

  <Accordion title="Habilitar push basado en relay para compilaciones oficiales de iOS">
    El push basado en relay utiliza el relay OpenClaw alojado de forma predeterminada: `https://ios-push-relay.openclaw.ai`.

    Para utilizar un relay personalizado, configúrelo en la configuración de la pasarela:

    ```json5
    {
      gateway: {
        push: {
          apns: {
            relay: {
              baseUrl: "https://relay.example.com",
              // Optional. Default: 10000
              timeoutMs: 10000,
            },
          },
        },
      },
    }
    ```

    Equivalente de CLI:

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    Lo que hace esto:

    - Permite que la pasarela envíe `push.test`, notificaciones de activación (wake nudges) y reactivaciones de reconexión a través del relay externo.
    - Utiliza un permiso de envío (send grant) con alcance de registro reenviado por la aplicación iOS emparejada. La pasarela no necesita un token de relay para toda la implementación.
    - Vincula cada registro respaldado por relay con la identidad de la pasarela con la que se emparejó la aplicación iOS, de modo que otra pasarela no pueda reutilizar el registro almacenado.
    - Mantiene las compilaciones locales/manuales de iOS en APNs directas. Los envíos respaldados por relay se aplican solo a las compilaciones distribuidas oficialmente que se registraron a través del relay.
    - Debe coincidir con la URL base del relay incorporada en la compilación oficial/TestFlight de iOS, para que el registro y el tráfico de envío lleguen a la misma implementación del relay.

    Flujo de extremo a extremo:

    1. Instale una compilación oficial/TestFlight de iOS.
    2. Opcional: configure `gateway.push.apns.relay.baseUrl` en la pasarela solo cuando use una implementación de relay personalizada.
    3. Empareje la aplicación iOS con la pasarela y permita que se conecten tanto las sesiones de nodo como las de operador.
    4. La aplicación iOS obtiene la identidad de la pasarela, se registra con el relay utilizando App Attest más el recibo de la aplicación y luego publica la carga útil del `push.apns.register` respaldada por relay en la pasarela emparejada.
    5. La pasarela almacena el identificador (handle) del relay y el permiso de envío, y luego los usa para `push.test`, notificaciones de activación y reactivaciones de reconexión.

    Notas operativas:

    - Si cambia la aplicación iOS a una pasarela diferente, reconecte la aplicación para que pueda publicar un nuevo registro de relay vinculado a esa pasarela.
    - Si lanza una nueva compilación de iOS que apunta a una implementación de relay diferente, la aplicación actualiza su registro de relay en caché en lugar de reutilizar el origen del relay antiguo.

    Nota de compatibilidad:

    - `OPENCLAW_APNS_RELAY_BASE_URL` y `OPENCLAW_APNS_RELAY_TIMEOUT_MS` todavía funcionan como anulaciones temporales de variables de entorno.
    - Las URLs de relay de pasarela personalizadas deben coincidir con la URL base del relay incorporada en la compilación oficial/TestFlight de iOS.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` sigue siendo una salida de emergencia de desarrollo solo de bucle de retorno (loopback-only); no persista las URLs de relay HTTP en la configuración.

    Consulte [iOS App](/es/platforms/ios#relay-backed-push-for-official-builds) para ver el flujo de extremo a extremo y [Authentication and trust flow](/es/platforms/ios#authentication-and-trust-flow) para el modelo de seguridad del relay.

  </Accordion>

  <Accordion title="Configurar latido (comprobaciones periódicas)">
    ```json5
    {
      agents: {
        defaults: {
          heartbeat: {
            every: "30m",
            target: "last",
          },
        },
      },
    }
    ```

    - `every`: cadena de duración (`30m`, `2h`). Establezca `0m` para desactivar.
    - `target`: `last` | `none` | `<channel-id>` (por ejemplo `discord`, `matrix`, `telegram` o `whatsapp`)
    - `directPolicy`: `allow` (predeterminado) o `block` para destinos de latido estilo MD
    - Consulte [Heartbeat](/es/gateway/heartbeat) para obtener la guía completa.

  </Accordion>

  <Accordion title="Configurar trabajos cron">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 8, // default; cron dispatch + isolated cron agent-turn execution
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`: poda las sesiones de ejecución aisladas completadas de `sessions.json` (predeterminado `24h`; establezca `false` para desactivar).
    - `runLog`: poda las filas del historial de ejecución de cron retenidas por trabajo. `maxBytes` sigue siendo aceptado para registros de ejecución antiguos basados en archivos.
    - Consulte [Cron jobs](/es/automation/cron-jobs) para ver una descripción general de las funciones y ejemplos de CLI.

  </Accordion>

  <Accordion title="Configurar webhooks (hooks)">
    Activa los endpoints de webhook HTTP en la Gateway:

    ```json5
    {
      hooks: {
        enabled: true,
        token: "shared-secret",
        path: "/hooks",
        defaultSessionKey: "hook:ingress",
        allowRequestSessionKey: false,
        allowedSessionKeyPrefixes: ["hook:"],
        mappings: [
          {
            match: { path: "gmail" },
            action: "agent",
            agentId: "main",
            deliver: true,
          },
        ],
      },
    }
    ```

    Nota de seguridad:
    - Trata todo el contenido del payload de hooks/webhooks como entrada no confiable.
    - Usa un `hooks.token` dedicado; no reutilices los secretos de autenticación activos de la Gateway (`gateway.auth.token` / `OPENCLAW_GATEWAY_TOKEN` o `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`).
    - La autenticación de hooks es solo mediante encabezados (`Authorization: Bearer ...` o `x-openclaw-token`); se rechazan los tokens en la cadena de consulta.
    - `hooks.path` no puede ser `/`; mantén el ingreso de webhooks en una subruta dedicada como `/hooks`.
    - Mantén las marcas de omisión de contenido inseguro desactivadas (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) a menos que estés realizando una depuración de alcance limitado.
    - Si activas `hooks.allowRequestSessionKey`, también establece `hooks.allowedSessionKeyPrefixes` para limitar las claves de sesión seleccionadas por el llamador.
    - Para agentes impulsados por hooks, prefiere niveles de modelos modernos y fuertes, y una política estricta de herramientas (por ejemplo, solo mensajería más sandboxing cuando sea posible).

    Consulta la [referencia completa](/es/gateway/configuration-reference#hooks) para todas las opciones de mapeo e integración con Gmail.

  </Accordion>

  <Accordion title="Configurar el enrutamiento multiagente">
    Ejecuta múltiples agentes aislados con espacios de trabajo y sesiones separadas:

    ```json5
    {
      agents: {
        list: [
          { id: "home", default: true, workspace: "~/.openclaw/workspace-home" },
          { id: "work", workspace: "~/.openclaw/workspace-work" },
        ],
      },
      bindings: [
        { agentId: "home", match: { channel: "whatsapp", accountId: "personal" } },
        { agentId: "work", match: { channel: "whatsapp", accountId: "biz" } },
      ],
    }
    ```

    Consulta [Multi-Agent](/es/concepts/multi-agent) y [referencia completa](/es/gateway/config-agents#multi-agent-routing) para las reglas de vinculación y perfiles de acceso por agente.

  </Accordion>

  <Accordion title="Dividir la configuración en varios archivos ($include)">
    Use `$include` para organizar configuraciones grandes:

    ```json5
    // ~/.openclaw/openclaw.json
    {
      gateway: { port: 18789 },
      agents: { $include: "./agents.json5" },
      broadcast: {
        $include: ["./clients/a.json5", "./clients/b.json5"],
      },
    }
    ```

    - **Archivo único**: reemplaza el objeto contenedor
    - **Matriz de archivos**: se fusiona en profundidad en orden (el último prevalece)
    - **Claves hermanas**: se fusionan después de las inclusiones (anulan los valores incluidos)
    - **Inclusiones anidadas**: admitidas hasta 10 niveles de profundidad
    - **Rutas relativas**: se resuelven en relación con el archivo que incluye
    - **Formato de ruta**: las rutas de inclusión no deben contener bytes nulos y deben ser estrictamente menores a 4096 caracteres antes y después de la resolución
    - **Escrituras propiedad de OpenClaw**: cuando una escritura modifica solo una sección de nivel superior
      respaldada por una inclusión de archivo único como `plugins: { $include: "./plugins.json5" }`,
      OpenClaw actualiza ese archivo incluido y deja `openclaw.json` intacto
    - **Escritura no admitida**: las inclusiones raíz, las matrices de inclusión y las inclusiones
      con anulaciones hermanas fallan cerradas para las escrituras propiedad de OpenClaw en lugar de
      aplanar la configuración
    - **Confinamiento**: las rutas `$include` deben resolverse dentro del directorio que contiene
      `openclaw.json`. Para compartir un árbol entre máquinas o usuarios, establezca
      `OPENCLAW_INCLUDE_ROOTS` en una lista de rutas (`:` en POSIX, `;` en Windows) de
      directorios adicionales que las inclusiones pueden referenciar. Los enlaces simbólicos se resuelven
      y se verifican nuevamente, por lo que una ruta que léxicamente vive en un directorio de configuración pero cuyo
      objetivo real escapa de cada raíz permitida todavía se rechaza.
    - **Manejo de errores**: errores claros para archivos faltantes, errores de análisis, inclusiones circulares, formato de ruta no válido y longitud excesiva

  </Accordion>
</AccordionGroup>

## Recarga en caliente de la configuración

El Gateway monitorea `~/.openclaw/openclaw.json` y aplica los cambios automáticamente; no se necesita reinicio manual para la mayoría de las configuraciones.

Las ediciones directas de archivos se tratan como no confiables hasta que se validen. El observador espera
a que se estabilice la actividad temporal de escritura/cambio de nombre del editor, lee el archivo final y rechaza
las ediciones externas inválidas sin reescribir `openclaw.json`. Las escrituras de configuración
propias de OpenClaw utilizan la misma puerta de esquema antes de escribir; las sobrescrituras destructivas, como
eliminar `gateway.mode` o reducir el archivo a menos de la mitad, se rechazan y
se guardan como `.rejected.*` para su inspección.

Si ve `config reload skipped (invalid config)` o los informes de inicio indican `Invalid
config`, inspect the config, run `openclaw config validate`, then run `openclaw
doctor --fix` para su reparación. Consulte [Solución de problemas de Gateway](/es/gateway/troubleshooting#gateway-rejected-invalid-config)
para ver la lista de verificación.

### Modos de recarga

| Modo                          | Comportamiento                                                                                                 |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (predeterminado) | Aplica cambios seguros instantáneamente. Se reinicia automáticamente para los cambios críticos.                |
| **`hot`**                     | Aplica cambios seguros en caliente. Registra una advertencia cuando es necesario un reinicio: usted lo maneja. |
| **`restart`**                 | Reinicia el Gateway ante cualquier cambio de configuración, sea seguro o no.                                   |
| **`off`**                     | Desactiva la observación de archivos. Los cambios surten efecto en el próximo reinicio manual.                 |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Qué se aplica en caliente y qué necesita un reinicio

La mayoría de los campos se aplican en caliente sin tiempo de inactividad. En el modo `hybrid`, los cambios que requieren reinicio se manejan automáticamente.

| Categoría             | Campos                                                                          | ¿Se necesita reinicio? |
| --------------------- | ------------------------------------------------------------------------------- | ---------------------- |
| Canales               | `channels.*`, `web` (WhatsApp) - todos los canales integrados y de complementos | No                     |
| Agente y modelos      | `agent`, `agents`, `models`, `routing`                                          | No                     |
| Automatización        | `hooks`, `cron`, `agent.heartbeat`                                              | No                     |
| Sesiones y mensajes   | `session`, `messages`                                                           | No                     |
| Herramientas y medios | `tools`, `browser`, `skills`, `mcp`, `audio`, `talk`                            | No                     |
| IU y varios           | `ui`, `logging`, `identity`, `bindings`                                         | No                     |
| Servidor Gateway      | `gateway.*` (puerto, vinculación, autenticación, tailscale, TLS, HTTP)          | **Sí**                 |
| Infraestructura       | `discovery`, `plugins`                                                          | **Sí**                 |

<Note>`gateway.reload` y `gateway.remote` son excepciones: cambiarlos **no** provoca un reinicio.</Note>

### Planificación de recarga

Cuando editas un archivo fuente al que se hace referencia a través de `$include`, OpenClaw planifica
la recarga desde el diseño original del fuente, no desde la vista planificada en memoria.
Esto mantiene las decisiones de recarga en caliente (aplicación en caliente vs. reinicio) predecibles incluso cuando una
sola sección de nivel superior reside en su propio archivo incluido, como
`plugins: { $include: "./plugins.json5" }`. La planificación de la recarga falla de forma segura si el
diseño del fuente es ambiguo.

## Config RPC (actualizaciones programáticas)

Para las herramientas que escriben configuración a través de la API de la puerta de enlace, prefiere este flujo:

- `config.schema.lookup` para inspeccionar un subárbol (nodo esquema superficial + resúmenes
  secundarios)
- `config.get` para obtener la instantánea actual más `hash`
- `config.patch` para actualizaciones parciales (parche de fusión JSON: los objetos se fusionan, `null`
  elimina, las matrices reemplazan)
- `config.apply` solo cuando pretendes reemplazar toda la configuración
- `update.run` para una autoactualización explícita más reinicio; incluye `continuationMessage` cuando la sesión posterior al reinicio debe ejecutar una vuelta de seguimiento
- `update.status` para inspeccionar el centinela de reinicio de actualización más reciente y verificar la versión en ejecución después de un reinicio

Los agentes deben tratar `config.schema.lookup` como la primera parada para documentación exacta
a nivel de campo y restricciones. Usa [Referencia de configuración](/es/gateway/configuration-reference)
cuando necesiten el mapa de configuración más amplio, los valores predeterminados o enlaces a
referencias de subsistemas dedicados.

<Note>
  Las escrituras del plano de control (`config.apply`, `config.patch`, `update.run`) están limitadas a 3 solicitudes por 60 segundos por `deviceId+clientIp`. Las solicitudes de reinicio se agrupan y luego aplican un tiempo de espera de 30 segundos entre los ciclos de reinicio. `update.status` es de solo lectura pero de ámbito de administrador porque el centinela de reinicio puede incluir resúmenes
  de pasos de actualización y colas de salida de comandos.
</Note>

Ejemplo de parche parcial:

```bash
openclaw gateway call config.get --params '{}'  # capture payload.hash
openclaw gateway call config.patch --params '{
  "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
  "baseHash": "<hash>"
}'
```

Tanto `config.apply` como `config.patch` aceptan `raw`, `baseHash`, `sessionKey`,
`note` y `restartDelayMs`. `baseHash` es obligatorio para ambos métodos cuando una
configuración ya existe.

## Variables de entorno

OpenClaw lee las variables de entorno del proceso principal y además:

- `.env` desde el directorio de trabajo actual (si está presente)
- `~/.openclaw/.env` (respaldo global)

Ningún archivo anula las variables de entorno existentes. También puedes establecer variables de entorno en línea en la configuración:

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Importación de entorno de shell (opcional)">
  Si está habilitado y las claves esperadas no están configuradas, OpenClaw ejecuta su shell de inicio de sesión e importa solo las claves faltantes:

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

Variable de entorno equivalente: `OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Sustitución de variables de entorno en valores de configuración">
  Haga referencia a variables de entorno en cualquier valor de cadena de configuración con `${VAR_NAME}`:

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

Reglas:

- Solo se hacen coincidir nombres en mayúsculas: `[A-Z_][A-Z0-9_]*`
- Las variables faltantes/vacías lanzan un error en el momento de la carga
- Escapar con `$${VAR}` para una salida literal
- Funciona dentro de archivos `$include`
- Sustitución en línea: `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Referencias secretas (env, file, exec)">
  Para los campos que admiten objetos SecretRef, puede utilizar:

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "image-lab": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/image-lab/apiKey",
        },
      },
    },
  },
  channels: {
    googlechat: {
      serviceAccountRef: {
        source: "exec",
        provider: "vault",
        id: "channels/googlechat/serviceAccount",
      },
    },
  },
}
```

Los detalles de SecretRef (incluyendo `secrets.providers` para `env`/`file`/`exec`) están en [Gestión de secretos](/es/gateway/secrets).
Las rutas de credenciales compatibles se enumeran en [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface).

</Accordion>

Consulte [Environment](/es/help/environment) para obtener la precedencia y fuentes completas.

## Referencia completa

Para la referencia completa campo por campo, consulte **[Configuration Reference](/es/gateway/configuration-reference)**.

---

_Relacionado: [Configuration Examples](/es/gateway/configuration-examples) · [Configuration Reference](/es/gateway/configuration-reference) · [Doctor](/es/gateway/doctor)_

## Relacionado

- [Referencia de configuración](/es/gateway/configuration-reference)
- [Ejemplos de configuración](/es/gateway/configuration-examples)
- [Manual de procedimientos de Gateway](/es/gateway)
