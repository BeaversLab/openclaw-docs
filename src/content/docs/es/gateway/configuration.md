---
summary: "Resumen de la configuración: tareas comunes, configuración rápida y enlaces a la referencia completa"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuración"
---

# Configuración

OpenClaw lee una configuración opcional <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> desde `~/.openclaw/openclaw.json`.
La ruta de configuración activa debe ser un archivo regular. Los diseños `openclaw.json`
enlazados simbólicamente no son compatibles con las escrituras propias de OpenClaw; una escritura atómica puede reemplazar
la ruta en lugar de preservar el enlace simbólico. Si mantiene la configuración fuera del
directorio de estado predeterminado, apunte `OPENCLAW_CONFIG_PATH` directamente al archivo real.

Si falta el archivo, OpenClaw utiliza valores predeterminados seguros. Razones comunes para añadir una configuración:

- Conectar canales y controlar quién puede enviar mensajes al bot
- Establecer modelos, herramientas, sandboxing o automatización (cron, hooks)
- Ajustar sesiones, medios, redes o interfaz de usuario

Consulte la [referencia completa](/es/gateway/configuration-reference) para todos los campos disponibles.

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
    Abra [http://127.0.0.1:18789](http://127.0.0.1:18789) y use la pestaña **Config**. La Interfaz de Control representa un formulario a partir del esquema de configuración en vivo, incluyendo los metadatos de documentación de campo `title` / `description` más los esquemas de complementos y canales cuando están disponibles, con un editor **Raw JSON** como vía de escape. Para interfaces de usuario
    de profundización y otras herramientas, el pasarela también expone `config.schema.lookup` para obtener un nodo de esquema con ámbito de ruta más resúmenes secundarios inmediatos.
  </Tab>
  <Tab title="Direct edit">Edite `~/.openclaw/openclaw.json` directamente. El Gateway observa el archivo y aplica los cambios automáticamente (ver [recarga en caliente](#config-hot-reload)).</Tab>
</Tabs>

## Validación estricta

<Warning>OpenClaw solo acepta configuraciones que coincidan completamente con el esquema. Claves desconocidas, tipos con formato incorrecto o valores no válidos hacen que el Gateway **se niegue a iniciarse**. La única excepción a nivel de raíz es `$schema` (cadena), para que los editores puedan adjuntar metadatos de JSON Schema.</Warning>

Notas sobre herramientas de esquema:

- `openclaw config schema` imprime la misma familia de esquemas JSON que utiliza la Interfaz de Control
  y la validación de configuración.
- Trate esa salida de esquema como el contrato legible por máquina canónico para
  `openclaw.json`; esta descripción general y la referencia de configuración lo resumen.
- Los valores de `title` y `description` se llevan a la salida del esquema para
  herramientas de edición y formularios.
- Las entradas de objetos anidados, comodines (`*`) y elementos de matriz (`[]`) heredan los mismos
  metadatos de documentación donde existe documentación del campo coincidente.
- Las ramas de composición `anyOf` / `oneOf` / `allOf` también heredan los mismos metadatos
  de documentación, por lo que las variantes de unión/intersección mantienen la misma ayuda de campo.
- `config.schema.lookup` devuelve una ruta de configuración normalizada con un
  nodo de esquema superficial (`title`, `description`, `type`, `enum`, `const`, límites comunes
  y campos de validación similares), metadatos de sugerencias de IU coincidentes e hijos inmediatos
  resúmenes para herramientas de exploración.
- Los esquemas de complementos/canales en tiempo de ejecución se fusionan cuando la puerta de enlace puede cargar el
  registro de manifiesto actual.
- `pnpm config:docs:check` detecta desviaciones entre los artefactos de línea base de configuración
  orientados a documentos y la superficie del esquema actual.

Cuando falla la validación:

- La puerta de enlace no se inicia
- Solo funcionan los comandos de diagnóstico (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Ejecute `openclaw doctor` para ver los problemas exactos
- Ejecute `openclaw doctor --fix` (o `--yes`) para aplicar reparaciones

La puerta de enlace (Gateway) también mantiene una copia confiable de la última configuración válida conocida después de un inicio exitoso. Si `openclaw.json` se modifica más tarde fuera de OpenClaw y ya no valida, el inicio y la recarga en caliente preservan el archivo roto como una instantánea `.clobbered.*` con marca de tiempo, restauran la última configuración válida conocida y registran una advertencia notable con el motivo de la recuperación. La recuperación de lectura al inicio también trata las caídas bruscas de tamaño, los metadatos de configuración faltantes y un `gateway.mode` faltante como firmas críticas de sobrescritura cuando la última copia válida conocida tenía esos campos.
Si una línea de estado/registro se antepone accidentalmente antes de una configuración JSON válida, el inicio de la puerta de enlace y `openclaw doctor --fix` pueden eliminar el prefijo, preservar el archivo contaminado como `.clobbered.*` y continuar con el JSON recuperado.
El siguiente turno del agente principal también recibe una advertencia de evento del sistema que le indica que la configuración se restauró y que no debe reescribirse a ciegas. La promoción de la última configuración válida conocida se actualiza después de un inicio validado y después de recargas en caliente aceptadas, incluidas las escrituras de configuración propiedad de OpenClaw cuyo hash de archivo persistido aún coincida con la escritura aceptada. La promoción se omite cuando el candidato contiene marcadores de posición de secretos redactados, como `***` o valores de token acortados.

## Tareas comunes

<AccordionGroup>
  <Accordion title="Configurar un canal (WhatsApp, Telegram, Discord, etc.)">
    Cada canal tiene su propia sección de configuración bajo `channels.<provider>`. Consulte la página dedicada del canal para ver los pasos de configuración:

    - [WhatsApp](/es/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/es/channels/telegram) — `channels.telegram`
    - [Discord](/es/channels/discord) — `channels.discord`
    - [Feishu](/es/channels/feishu) — `channels.feishu`
    - [Google Chat](/es/channels/googlechat) — `channels.googlechat`
    - [Microsoft Teams](/es/channels/msteams) — `channels.msteams`
    - [Slack](/es/channels/slack) — `channels.slack`
    - [Signal](/es/channels/signal) — `channels.signal`
    - [iMessage](/es/channels/imessage) — `channels.imessage`
    - [Mattermost](/es/channels/mattermost) — `channels.mattermost`

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
    Establezca el modelo principal y las alternativas opcionales:

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

    - `agents.defaults.models` define el catálogo de modelos y actúa como la lista de permitidos para `/model`.
    - Use `openclaw config set agents.defaults.models '<json>' --strict-json --merge` para agregar entradas a la lista de permitidos sin eliminar los modelos existentes. Los reemplazos simples que eliminarían entradas son rechazados a menos que pase `--replace`.
    - Las referencias de modelos usan el formato `provider/model` (ej. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` controla la reducción de escala de imágenes de transcripciones/herramientas (por defecto `1200`); valores más bajos generalmente reducen el uso de tokens de visión en ejecuciones con muchas capturas de pantalla.
    - Vea [Models CLI](/es/concepts/models) para cambiar modelos en el chat y [Model Failover](/es/concepts/model-failover) para la rotación de autenticación y el comportamiento de respaldo.
    - Para proveedores personalizados/autohospedados, consulte [Custom providers](/es/gateway/configuration-reference#custom-providers-and-base-urls) en la referencia.

  </Accordion>

  <Accordion title="Controlar quién puede enviar mensajes al bot">
    El acceso a DM se controla por canal a través de `dmPolicy`:

    - `"pairing"` (predeterminado): los remitentes desconocidos obtienen un código de emparejamiento de una sola vez para aprobar
    - `"allowlist"`: solo remitentes en `allowFrom` (o el almacén de permisos emparejado)
    - `"open"`: permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)
    - `"disabled"`: ignorar todos los MD

    Para grupos, use `groupPolicy` + `groupAllowFrom` o listas de permitidos específicas del canal.

    Consulte la [referencia completa](/es/gateway/configuration-reference#dm-and-group-access) para detalles por canal.

  </Accordion>

  <Accordion title="Configurar el filtrado de menciones en chats grupales">
    Los mensajes grupales por defecto **requieren mención**. Configure patrones por agente:

    ```json5
    {
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
    - Consulte la [referencia completa](/es/gateway/configuration-reference#group-chat-mention-gating) para las anulaciones por canal y el modo de chat propio.

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

    - Omita `agents.defaults.skills` para habilidades sin restricciones por defecto.
    - Omita `agents.list[].skills` para heredar los valores predeterminados.
    - Establezca `agents.list[].skills: []` para no tener habilidades.
    - Consulte [Habilidades](/es/tools/skills), [Configuración de habilidades](/es/tools/skills-config) y
      la [Referencia de configuración](/es/gateway/configuration-reference#agents-defaults-skills).

  </Accordion>

  <Accordion title="Ajustar la supervisión de salud del canal de la pasarela">
    Controle la frecuencia con la que la pasarela reinicia los canales que parecen obsoletos:

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

    - Establezca `gateway.channelHealthCheckMinutes: 0` para desactivar globalmente los reinicios del monitor de salud.
    - `channelStaleEventThresholdMinutes` debe ser mayor o igual que el intervalo de verificación.
    - Use `channels.<provider>.healthMonitor.enabled` o `channels.<provider>.accounts.<id>.healthMonitor.enabled` para desactivar los reinicios automáticos de un canal o cuenta sin desactivar el monitor global.
    - Consulte [Verificaciones de salud](/es/gateway/health) para la depuración operativa y la [referencia completa](/es/gateway/configuration-reference#gateway) para todos los campos.

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

    - `dmScope`: `main` (compartido) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: valores predeterminados globales para el enrutamiento de sesiones ligadas a hilos (Discord admite `/focus`, `/unfocus`, `/agents`, `/session idle` y `/session max-age`).
    - Consulte [Gestión de sesiones](/es/concepts/session) para obtener información sobre el alcance, los enlaces de identidad y la política de envío.
    - Consulte la [referencia completa](/es/gateway/configuration-reference#session) para todos los campos.

  </Accordion>

  <Accordion title="Habilitar sandbox">
    Ejecute sesiones de agentes en tiempos de ejecución de sandbox aislados:

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

    Primero construya la imagen: `scripts/sandbox-setup.sh`

    Consulte [Sandbox](/es/gateway/sandboxing) para obtener la guía completa y la [referencia completa](/es/gateway/configuration-reference#agentsdefaultssandbox) para todas las opciones.

  </Accordion>

  <Accordion title="Habilitar respaldo de push para compilaciones oficiales de iOS">
    El respaldo de push mediante relé se configura en `openclaw.json`.

    Establézcalo en la configuración de la puerta de enlace:

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

    - Permite que la puerta de enlace envíe `push.test`, notificaciones de activación y activaciones de reconexión a través del relé externo.
    - Utiliza un permiso de envío con ámbito de registro reenviado por la aplicación iOS emparejada. La puerta de enlace no necesita un token de relé para todo el despliegue.
    - Vincula cada registro respaldado por relé a la identidad de la puerta de enlace con la que la aplicación iOS se emparejó, de modo que otra puerta de enlace no pueda reutilizar el registro almacenado.
    - Mantiene las compilaciones locales/manuales de iOS en APNs directos. Los envíos respaldados por relé se aplican solo a las compilaciones oficiales distribuidas que se registraron a través del relé.
    - Debe coincidir con la URL base del relé integrada en la compilación oficial/TestFlight de iOS, para que el registro y el tráfico de envío lleguen al mismo despliegue de relé.

    Flujo de un extremo a otro:

    1. Instale una compilación oficial/TestFlight de iOS que se haya compilado con la misma URL base del relé.
    2. Configure `gateway.push.apns.relay.baseUrl` en la puerta de enlace.
    3. Empareje la aplicación iOS con la puerta de enlace y permita que se conecten tanto la sesión del nodo como la del operador.
    4. La aplicación iOS obtiene la identidad de la puerta de enlace, se registra en el relé utilizando App Attest más el recibo de la aplicación y, a continuación, publica la carga útil del registro respaldado por relé `push.apns.register` en la puerta de enlace emparejada.
    5. La puerta de enlace almacena el identificador del relé y el permiso de envío, y luego los utiliza para `push.test`, notificaciones de activación y activaciones de reconexión.

    Notas operativas:

    - Si cambia la aplicación iOS a una puerta de enlace diferente, reconecte la aplicación para que pueda publicar un nuevo registro de relé vinculado a esa puerta de enlace.
    - Si envía una nueva compilación de iOS que apunta a un despliegue de relé diferente, la aplicación actualiza su registro de relé almacenado en caché en lugar de reutilizar el origen del relé antiguo.

    Nota de compatibilidad:

    - `OPENCLAW_APNS_RELAY_BASE_URL` y `OPENCLAW_APNS_RELAY_TIMEOUT_MS` todavía funcionan como anulaciones de entorno temporales.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` sigue siendo una salida de emergencia para el desarrollo solo de bucle invertido; no persista las URLs de relé HTTP en la configuración.

    Consulte [iOS App](/es/platforms/ios#relay-backed-push-for-official-builds) para conocer el flujo de un extremo a otro y [Authentication and trust flow](/es/platforms/ios#authentication-and-trust-flow) para el modelo de seguridad del relé.

  </Accordion>

  <Accordion title="Configurar latido (chequeos periódicos)">
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
    - `target`: `last` | `none` | `<channel-id>` (por ejemplo `discord`, `matrix`, `telegram`, o `whatsapp`)
    - `directPolicy`: `allow` (predeterminado) o `block` para objetivos de latido estilo MD
    - Consulte [Heartbeat](/es/gateway/heartbeat) para la guía completa.

  </Accordion>

  <Accordion title="Configurar trabajos cron">
    ```json5
    {
      cron: {
        enabled: true,
        maxConcurrentRuns: 2,
        sessionRetention: "24h",
        runLog: {
          maxBytes: "2mb",
          keepLines: 2000,
        },
      },
    }
    ```

    - `sessionRetention`: eliminar sesiones de ejecución aisladas completadas de `sessions.json` (predeterminado `24h`; establezca `false` para desactivar).
    - `runLog`: eliminar `cron/runs/<jobId>.jsonl` por tamaño y líneas retenidas.
    - Consulte [Cron jobs](/es/automation/cron-jobs) para ver la descripción general de la función y ejemplos de CLI.

  </Accordion>

  <Accordion title="Configurar webhooks (hooks)">
    Habilite los endpoints de webhook HTTP en el Gateway:

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
    - Trate todo el contenido del payload de hook/webhook como entrada no confiable.
    - Use un `hooks.token` dedicado; no reutilice el token compartido del Gateway.
    - La autenticación de hook es solo mediante encabezados (`Authorization: Bearer ...` o `x-openclaw-token`); se rechazan los tokens en la cadena de consulta.
    - `hooks.path` no se puede `/`; mantenga el ingreso de webhook en una subruta dedicada como `/hooks`.
    - Mantenga las marcas de omisión de contenido inseguro deshabilitadas (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) a menos que esté realizando una depuración de alcance limitado.
    - Si habilita `hooks.allowRequestSessionKey`, también establezca `hooks.allowedSessionKeyPrefixes` para limitar las claves de sesión seleccionadas por el llamador.
    - Para los agentes impulsados por hooks, prefiera niveles de modelos modernos fuertes y políticas estrictas de herramientas (por ejemplo, solo mensajería más sandboxing cuando sea posible).

    Consulte la [referencia completa](/es/gateway/configuration-reference#hooks) para todas las opciones de mapeo e integración con Gmail.

  </Accordion>

  <Accordion title="Configurar el enrutamiento multi-agente">
    Ejecute múltiples agentes aislados con espacios de trabajo y sesiones separados:

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

    Consulte [Multi-Agent](/es/concepts/multi-agent) y [referencia completa](/es/gateway/configuration-reference#multi-agent-routing) para las reglas de enlace y perfiles de acceso por agente.

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
    - **Matriz de archivos**: combinados en profundidad por orden (el último gana)
    - **Claves hermanas**: combinadas después de las inclusiones (anulan los valores incluidos)
    - **Inclusiones anidadas**: compatibles hasta 10 niveles de profundidad
    - **Rutas relativas**: resueltas en relación con el archivo que incluye
    - **Escrituras propiedad de OpenClaw**: cuando una escritura cambia solo una sección de nivel superior
      respaldada por una inclusión de archivo único como `plugins: { $include: "./plugins.json5" }`,
      OpenClaw actualiza ese archivo incluido y deja `openclaw.json` intacto
    - **Escritura directa no compatible**: las inclusiones raíz, las matrices de inclusión y las inclusiones
      con anulaciones de hermanos fallan cerradas para las escrituras propiedad de OpenClaw en lugar de
      aplanar la configuración
    - **Manejo de errores**: errores claros para archivos faltantes, errores de análisis e inclusiones circulares

  </Accordion>
</AccordionGroup>

## Recarga en caliente de la configuración

El Gateway observa `~/.openclaw/openclaw.json` y aplica los cambios automáticamente; no se necesita reinicio manual para la mayoría de las configuraciones.

Las ediciones directas de archivos se tratan como no confiables hasta que se validen. El observador espera
a que se asiente el ajetreo de escritura temporal/cambio de nombre del editor, lee el archivo final y rechaza
las ediciones externas no válidas restaurando la última configuración conocida válida. Las escrituras de
configuración propiedad de OpenClaw usan la misma puerta de esquema antes de escribir; las sobrescrituras destructivas como
eliminar `gateway.mode` o reducir el archivo a menos de la mitad se rechazan
y se guardan como `.rejected.*` para su inspección.

Si ve `Config auto-restored from last-known-good` o
`config reload restored last-known-good config` en los registros, inspeccione el archivo `.clobbered.*` correspondiente
junto a `openclaw.json`, corrija la carga rechazada y luego ejecute
`openclaw config validate`. Consulte [Solución de problemas del Gateway](/es/gateway/troubleshooting#gateway-restored-last-known-good-config)
para obtener la lista de verificación de recuperación.

### Modos de recarga

| Modo                          | Comportamiento                                                                                                           |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **`hybrid`** (predeterminado) | Aplica en caliente los cambios seguros al instante. Reinicia automáticamente para los críticos.                          |
| **`hot`**                     | Aplica en caliente solo los cambios seguros. Registra una advertencia cuando es necesario reiniciar — usted lo gestiona. |
| **`restart`**                 | Reinicia el Gateway ante cualquier cambio de configuración, ya sea seguro o no.                                          |
| **`off`**                     | Deshabilita la observación de archivos. Los cambios surten efecto en el próximo reinicio manual.                         |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Qué se aplica en caliente vs qué necesita un reinicio

La mayoría de los campos se aplican en caliente sin tiempo de inactividad. En el modo `hybrid`, los cambios que requieren reinicio se manejan automáticamente.

| Categoría                    | Campos                                                                          | ¿Reinicio necesario? |
| ---------------------------- | ------------------------------------------------------------------------------- | -------------------- |
| Canales                      | `channels.*`, `web` (WhatsApp) — todos los canales integrados y de complementos | No                   |
| Agente y modelos             | `agent`, `agents`, `models`, `routing`                                          | No                   |
| Automatización               | `hooks`, `cron`, `agent.heartbeat`                                              | No                   |
| Sesiones y mensajes          | `session`, `messages`                                                           | No                   |
| Herramientas y medios        | `tools`, `browser`, `skills`, `audio`, `talk`                                   | No                   |
| IU y varios                  | `ui`, `logging`, `identity`, `bindings`                                         | No                   |
| Servidor de puerta de enlace | `gateway.*` (puerto, enlace, autenticación, tailscale, TLS, HTTP)               | **Sí**               |
| Infraestructura              | `discovery`, `canvasHost`, `plugins`                                            | **Sí**               |

<Note>`gateway.reload` y `gateway.remote` son excepciones: cambiarlos **no** activa un reinicio.</Note>

### Planificación de la recarga

Cuando editas un archivo fuente al que se hace referencia a través de `$include`, OpenClaw planifica
la recarga desde el diseño creado por el origen, no desde la vista aplanada en memoria.
Esto mantiene las decisiones de recarga en caliente (aplicación en caliente frente a reinicio) predecibles, incluso cuando una
sola sección de nivel superior vive en su propio archivo incluido, como
`plugins: { $include: "./plugins.json5" }`.

Si no se puede planificar una recarga de forma segura, por ejemplo, porque el diseño de origen
combina inclusiones raíz con anulaciones de hermanos, OpenClaw falla de forma cerrada, registra el
motivo y deja la configuración de ejecución actual en su lugar para que puedas corregir la forma del origen
en lugar de volver silenciosamente a una recarga aplanada.

## Config RPC (actualizaciones programáticas)

<Note>Las RPCs de escritura del plano de control (`config.apply`, `config.patch`, `update.run`) tienen una tasa limitada a **3 solicitudes por 60 segundos** por `deviceId+clientIp`. Cuando están limitadas, la RPC devuelve `UNAVAILABLE` con `retryAfterMs`.</Note>

Flujo seguro/predeterminado:

- `config.schema.lookup`: inspeccionar un subárbol de configuración con ámbito de ruta con un nodo de esquema superficial, metadatos de sugerencia coincidentes y resúmenes de hijos inmediatos
- `config.get`: obtener la instantánea actual + hash
- `config.patch`: ruta preferida de actualización parcial
- `config.apply`: solo reemplazo de configuración completa
- `update.run`: autactualización explícita + reinicio

Cuando no estás reemplazando la configuración completa, prefiere `config.schema.lookup`
luego `config.patch`.

<AccordionGroup>
  <Accordion title="config.apply (reemplazo total)">
    Valida + escribe la configuración completa y reinicia el Gateway en un solo paso.

    <Warning>
    `config.apply` reemplaza la **configuración completa**. Usa `config.patch` para actualizaciones parciales, o `openclaw config set` para claves individuales.
    </Warning>

    Parámetros:

    - `raw` (cadena) — carga útil JSON5 para la configuración completa
    - `baseHash` (opcional) — hash de configuración de `config.get` (requerido cuando la configuración existe)
    - `sessionKey` (opcional) — clave de sesión para el ping de activación posterior al reinicio
    - `note` (opcional) — nota para el centinela de reinicio
    - `restartDelayMs` (opcional) — retraso antes del reinicio (predeterminado 2000)

    Las solicitudes de reinicio se combinan mientras una ya está pendiente/en curso, y se aplica un tiempo de espera de 30 segundos entre los ciclos de reinicio.

    ```bash
    openclaw gateway call config.get --params '{}'  # capture payload.hash
    openclaw gateway call config.apply --params '{
      "raw": "{ agents: { defaults: { workspace: \"~/.openclaw/workspace\" } } }",
      "baseHash": "<hash>",
      "sessionKey": "agent:main:whatsapp:direct:+15555550123"
    }'
    ```

  </Accordion>

  <Accordion title="config.patch (actualización parcial)">
    Combina una actualización parcial en la configuración existente (semántica de parche de combinación JSON):

    - Los objetos se combinan de forma recursiva
    - `null` elimina una clave
    - Las matrices se reemplazan

    Parámetros:

    - `raw` (cadena) — JSON5 con solo las claves a cambiar
    - `baseHash` (obligatorio) — hash de configuración de `config.get`
    - `sessionKey`, `note`, `restartDelayMs` — igual que `config.apply`

    El comportamiento de reinicio coincide con `config.apply`: reinicios pendientes combinados más un período de enfriamiento de 30 segundos entre ciclos de reinicio.

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## Variables de entorno

OpenClaw lee las variables de entorno del proceso principal además de:

- `.env` del directorio de trabajo actual (si está presente)
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
  Si está habilitado y las claves esperadas no están establecidas, OpenClaw ejecuta tu shell de inicio de sesión e importa solo las claves faltantes:

```json5
{
  env: {
    shellEnv: { enabled: true, timeoutMs: 15000 },
  },
}
```

Equivalente de variable de entorno: `OPENCLAW_LOAD_SHELL_ENV=1`

</Accordion>

<Accordion title="Sustitución de variables de entorno en valores de configuración">
  Referencia variables de entorno en cualquier valor de cadena de configuración con `${VAR_NAME}`:

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

Reglas:

- Solo coinciden los nombres en mayúsculas: `[A-Z_][A-Z0-9_]*`
- Las variables faltantes/vacías lanzan un error en el momento de la carga
- Escapa con `$${VAR}` para una salida literal
- Funciona dentro de archivos `$include`
- Sustitución en línea: `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
  Para los campos que admiten objetos SecretRef, puede usar:

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

Los detalles de SecretRef (incluido `secrets.providers` para `env`/`file`/`exec`) están en [Secrets Management](/es/gateway/secrets).
Las rutas de credenciales admitidas se enumeran en [SecretRef Credential Surface](/es/reference/secretref-credential-surface).

</Accordion>

Consulte [Environment](/es/help/environment) para obtener la precedencia y las fuentes completas.

## Referencia completa

Para la referencia completa campo por campo, consulte **[Configuration Reference](/es/gateway/configuration-reference)**.

---

_Relacionado: [Configuration Examples](/es/gateway/configuration-examples) · [Configuration Reference](/es/gateway/configuration-reference) · [Doctor](/es/gateway/doctor)_
