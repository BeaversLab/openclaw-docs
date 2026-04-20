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

Si falta el archivo, OpenClaw utiliza valores predeterminados seguros. Razones comunes para añadir una configuración:

- Conectar canales y controlar quién puede enviar mensajes al bot
- Establecer modelos, herramientas, sandboxing o automatización (cron, hooks)
- Ajustar sesiones, medios, redes o interfaz de usuario

Consulte la [referencia completa](/es/gateway/configuration-reference) para todos los campos disponibles.

<Tip>**¿Nuevo en la configuración?** Comience con `openclaw onboard` para una configuración interactiva, o consulte la guía de [Ejemplos de configuración](/es/gateway/configuration-examples) para configuraciones completas para copiar y pegar.</Tip>

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
  <Tab title="Interfaz de control">
    Abra [http://127.0.0.1:18789](http://127.0.0.1:18789) y use la pestaña **Config**. La Interfaz de control genera un formulario a partir del esquema de configuración en vivo, incluyendo metadatos de documentación de campo `title` / `description`, además de esquemas de complementos y canales cuando estén disponibles, con un editor **Raw JSON** como salida de emergencia. Para interfaces de
    usuario de navegación detallada y otras herramientas, la puerta de enlace también expone `config.schema.lookup` para obtener un nodo de esquema con ámbito de ruta más resúmenes secundarios inmediatos.
  </Tab>
  <Tab title="Edición directa">Edite `~/.openclaw/openclaw.json` directamente. La puerta de enlace monitorea el archivo y aplica los cambios automáticamente (consulte [recarga en caliente](#config-hot-reload)).</Tab>
</Tabs>

## Validación estricta

<Warning>OpenClaw solo acepta configuraciones que coincidan completamente con el esquema. Las claves desconocidas, los tipos con formato incorrecto o los valores no válidos hacen que la puerta de enlace **se niegue a iniciarse**. La única excepción de nivel raíz es `$schema` (cadena), para que los editores puedan adjuntar metadatos de JSON Schema.</Warning>

Notas sobre herramientas de esquema:

- `openclaw config schema` imprime la misma familia de esquemas JSON que utiliza la Interfaz de control
  y la validación de configuración.
- Trate esa salida de esquema como el contrato legible por máquina canónico para
  `openclaw.json`; esta descripción general y la referencia de configuración lo resumen.
- Los valores de campo `title` y `description` se llevan a la salida del esquema para
  herramientas de editor y formulario.
- Las entradas de objeto anidado, comodín (`*`) y elemento de matriz (`[]`) heredan los mismos
  metadatos de documentación donde existe documentación de campo coincidente.
- Las ramas de composición `anyOf` / `oneOf` / `allOf` también heredan los mismos
  metadatos de documentación, por lo que las variantes de unión/intersección mantienen la misma ayuda de campo.
- `config.schema.lookup` devuelve una ruta de configuración normalizada con un
  nodo de esquema superficial (`title`, `description`, `type`, `enum`, `const`, límites comunes
  y campos de validación similares), metadatos de sugerencias de interfaz coincidentes y resúmenes de hijos inmediatos
  para herramientas de exploración.
- Los esquemas de complementos/canales en tiempo de ejecución se fusionan cuando la puerta de enlace puede cargar el
  registro de manifiesto actual.
- `pnpm config:docs:check` detecta desviaciones entre los artefactos de referencia de configuración orientados a documentación
  y la superficie del esquema actual.

Cuando falla la validación:

- La puerta de enlace no se inicia
- Solo funcionan los comandos de diagnóstico (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Ejecute `openclaw doctor` para ver los problemas exactos
- Ejecute `openclaw doctor --fix` (o `--yes`) para aplicar reparaciones

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

    - `agents.defaults.models` define el catálogo de modelos y actúa como la lista de permitidos para `/model`.
    - Las referencias de modelo usan el formato `provider/model` (p. ej. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` controla la reducción de escala de imágenes de transcripción/herramientas (predeterminado `1200`); los valores más bajos generalmente reducen el uso de tokens de visión en ejecuciones con muchas capturas de pantalla.
    - Consulte [Models CLI](/es/concepts/models) para cambiar modelos en el chat y [Model Failover](/es/concepts/model-failover) para el comportamiento de rotación de autenticación y alternancia.
    - Para proveedores personalizados/autohospedados, consulte [Custom providers](/es/gateway/configuration-reference#custom-providers-and-base-urls) en la referencia.

  </Accordion>

  <Accordion title="Controlar quién puede enviar mensajes al bot">
    El acceso a MD se controla por canal a través de `dmPolicy`:

    - `"pairing"` (predeterminado): los remitentes desconocidos reciben un código de emparejamiento de un solo vez para aprobar
    - `"allowlist"`: solo remitentes en `allowFrom` (o el almacén de permitidos emparejado)
    - `"open"`: permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)
    - `"disabled"`: ignorar todos los MD

    Para grupos, use `groupPolicy` + `groupAllowFrom` o listas de permitidos específicas del canal.

    Consulte la [referencia completa](/es/gateway/configuration-reference#dm-and-group-access) para detalles por canal.

  </Accordion>

  <Accordion title="Configurar el filtrado de menciones en grupos">
    Los mensajes de grupo predeterminan a **requerir mención**. Configure patrones por agente:

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

    - **Menciones de metadatos**: menciones nativas de @ (menciones al tocar en WhatsApp, @bot en Telegram, etc.)
    - **Patrones de texto**: patrones de regex seguros en `mentionPatterns`
    - Consulte la [referencia completa](/es/gateway/configuration-reference#group-chat-mention-gating) para anulaciones por canal y el modo de chat propio.

  </Accordion>

  <Accordion title="Restringir habilidades por agente">
    Use `agents.defaults.skills` para una base compartida, luego anule agentes
    específicos con `agents.list[].skills`:

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
    - Consulte [Habilidades](/es/tools/skills), [Configuración de habilidades](/es/tools/skills-config) y
      la [Referencia de configuración](/es/gateway/configuration-reference#agents-defaults-skills).

  </Accordion>

  <Accordion title="Ajustar el monitoreo de salud del canal de la puerta de enlace">
    Controle qué tan agresivamente la puerta de enlace reinicia los canales que parecen obsoletos:

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

    - Establezca `gateway.channelHealthCheckMinutes: 0` para deshabilitar globalmente los reinicios del monitor de salud.
    - `channelStaleEventThresholdMinutes` debe ser mayor o igual que el intervalo de verificación.
    - Use `channels.<provider>.healthMonitor.enabled` o `channels.<provider>.accounts.<id>.healthMonitor.enabled` para deshabilitar los reinicios automáticos para un canal o cuenta sin deshabilitar el monitor global.
    - Consulte [Verificaciones de salud](/es/gateway/health) para depuración operativa y la [referencia completa](/es/gateway/configuration-reference#gateway) para todos los campos.

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
    - `threadBindings`: valores predeterminados globales para el enrutamiento de sesiones vinculado a hilos (Discord admite `/focus`, `/unfocus`, `/agents`, `/session idle` y `/session max-age`).
    - Consulte [Gestión de sesiones](/es/concepts/session) para el alcance, los enlaces de identidad y la política de envío.
    - Consulte la [referencia completa](/es/gateway/configuration-reference#session) para todos los campos.

  </Accordion>

  <Accordion title="Habilitar aislamiento">
    Ejecute sesiones de agente en contenedores Docker aislados:

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

    Construya la imagen primero: `scripts/sandbox-setup.sh`

    Consulte [Aislamiento](/es/gateway/sandboxing) para la guía completa y [referencia completa](/es/gateway/configuration-reference#agentsdefaultssandbox) para todas las opciones.

  </Accordion>

  <Accordion title="Habilitar push respaldado por relay para compilaciones oficiales de iOS">
    El push respaldado por relay se configura en `openclaw.json`.

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

    Lo que esto hace:

    - Permite que la puerta de enlace envíe `push.test`, avisos de activación (wake nudges) y activaciones de reconexión a través del relay externo.
    - Utiliza un permiso de envío (send grant) con alcance de registro reenviado por la aplicación iOS emparejada. La puerta de enlace no necesita un token de relay para toda la implementación.
    - Vincula cada registro respaldado por relay con la identidad de la puerta de enlace con la que la aplicación iOS se emparejó, por lo que otra puerta de enlace no puede reutilizar el registro almacenado.
    - Mantiene las compilaciones locales/manuales de iOS en APNs directos. Los envíos respaldados por relay se aplican solo a compilaciones distribuidas oficialmente que se registraron a través del relay.
    - Debe coincidir con la URL base del relay incorporada en la compilación oficial de iOS/TestFlight, de modo que el tráfico de registro y envío llegue a la misma implementación de relay.

    Flujo de un extremo a otro:

    1. Instale una compilación oficial/TestFlight de iOS que se compiló con la misma URL base de relay.
    2. Configure `gateway.push.apns.relay.baseUrl` en la puerta de enlace.
    3. Empareje la aplicación iOS con la puerta de enlace y permita que se conecten tanto las sesiones de nodo como las de operador.
    4. La aplicación iOS obtiene la identidad de la puerta de enlace, se registra con el relay usando App Attest más el recibo de la aplicación y luego publica la carga útil de `push.apns.register` respaldada por relay en la puerta de enlace emparejada.
    5. La puerta de enlace almacena el identificador y el permiso de envío del relay, y luego los usa para `push.test`, avisos de activación y activaciones de reconexión.

    Notas operativas:

    - Si cambia la aplicación iOS a una puerta de enlace diferente, reconecte la aplicación para que pueda publicar un nuevo registro de relay vinculado a esa puerta de enlace.
    - Si envía una nueva compilación de iOS que apunta a una implementación de relay diferente, la aplicación actualiza su registro de relay en caché en lugar de reutilizar el origen del relay antiguo.

    Nota de compatibilidad:

    - `OPENCLAW_APNS_RELAY_BASE_URL` y `OPENCLAW_APNS_RELAY_TIMEOUT_MS` todavía funcionan como anulaciones temporales de variables de entorno.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` sigue siendo una salida de emergencia para el desarrollo solo de bucle local (loopback); no persista las URLs de relay HTTP en la configuración.

    Consulte [iOS App](/es/platforms/ios#relay-backed-push-for-official-builds) para ver el flujo de un extremo a otro y [Authentication and trust flow](/es/platforms/ios#authentication-and-trust-flow) para conocer el modelo de seguridad del relay.

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
    - `directPolicy`: `allow` (predeterminado) o `block` para objetivos de latido estilo DM
    - Consulte [Heartbeat](/es/gateway/heartbeat) para ver la guía completa.

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

    - `sessionRetention`: poda las sesiones de ejecución aisladas completadas de `sessions.json` (predeterminado `24h`; establezca `false` para desactivar).
    - `runLog`: poda `cron/runs/<jobId>.jsonl` por tamaño y líneas retenidas.
    - Consulte [Cron jobs](/es/automation/cron-jobs) para ver la descripción general de las características y los ejemplos de CLI.

  </Accordion>

  <Accordion title="Configurar webhooks (hooks)">
    Active los endpoints de webhook HTTP en la Gateway:

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
    - Use un `hooks.token` dedicado; no reutilice el token compartido de la Gateway.
    - La autenticación de hook es solo mediante encabezados (`Authorization: Bearer ...` o `x-openclaw-token`); se rechazan los tokens en la cadena de consulta.
    - `hooks.path` no puede ser `/`; mantenga el ingreso de webhooks en una subruta dedicada como `/hooks`.
    - Mantenga las banderas de omisión de contenido inseguro deshabilitadas (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) a menos que esté realizando una depuración con un alcance estricto.
    - Si habilita `hooks.allowRequestSessionKey`, también establezca `hooks.allowedSessionKeyPrefixes` para limitar las claves de sesión seleccionadas por el llamador.
    - Para agentes impulsados por hooks, prefiera capas de modelos modernos y fuertes y una política de herramientas estricta (por ejemplo, solo mensajería más sandboxing donde sea posible).

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

    Consulte [Multi-Agent](/es/concepts/multi-agent) y la [referencia completa](/es/gateway/configuration-reference#multi-agent-routing) para las reglas de vinculación y perfiles de acceso por agente.

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
    - **Array de archivos**: se fusiona en profundidad en orden (el último prevalece)
    - **Claves hermanas**: se fusionan después de las inclusiones (anulan los valores incluidos)
    - **Inclusiones anidadas**: compatibles hasta 10 niveles de profundidad
    - **Rutas relativas**: se resuelven en relación con el archivo que incluye
    - **Manejo de errores**: errores claros para archivos faltantes, errores de análisis e inclusiones circulares

  </Accordion>
</AccordionGroup>

## Recarga en caliente de la configuración

El Gateway observa `~/.openclaw/openclaw.json` y aplica los cambios automáticamente; no se necesita reiniciar manualmente para la mayoría de los ajustes.

### Modos de recarga

| Modo                          | Comportamiento                                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------------------------------ |
| **`hybrid`** (predeterminado) | Aplica cambios seguros instantáneamente. Reinicia automáticamente para los críticos.                   |
| **`hot`**                     | Aplica solo cambios seguros. Registra una advertencia cuando se necesita un reinicio; usted lo maneja. |
| **`restart`**                 | Reinicia el Gateway ante cualquier cambio de configuración, seguro o no.                               |
| **`off`**                     | Desactiva la observación de archivos. Los cambios surten efecto en el próximo reinicio manual.         |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Qué se aplica en caliente vs qué necesita un reinicio

La mayoría de los campos se aplican en caliente sin tiempo de inactividad. En el modo `hybrid`, los cambios que requieren reinicio se manejan automáticamente.

| Categoría                    | Campos                                                                       | ¿Se necesita reinicio? |
| ---------------------------- | ---------------------------------------------------------------------------- | ---------------------- |
| Canales                      | `channels.*`, `web` (WhatsApp) — todos los canales integrados y de extensión | No                     |
| Agente y modelos             | `agent`, `agents`, `models`, `routing`                                       | No                     |
| Automatización               | `hooks`, `cron`, `agent.heartbeat`                                           | No                     |
| Sesiones y mensajes          | `session`, `messages`                                                        | No                     |
| Herramientas y medios        | `tools`, `browser`, `skills`, `audio`, `talk`                                | No                     |
| Interfaz de usuario y varios | `ui`, `logging`, `identity`, `bindings`                                      | No                     |
| Servidor Gateway             | `gateway.*` (puerto, enlace, autenticación, tailscale, TLS, HTTP)            | **Sí**                 |
| Infraestructura              | `discovery`, `canvasHost`, `plugins`                                         | **Sí**                 |

<Note>`gateway.reload` y `gateway.remote` son excepciones; cambiarlos **no** activa un reinicio.</Note>

## Config RPC (actualizaciones programáticas)

<Note>Las RPC de escritura del plano de control (`config.apply`, `config.patch`, `update.run`) tienen una tasa limitada a **3 solicitudes por 60 segundos** por `deviceId+clientIp`. Cuando están limitadas, la RPC devuelve `UNAVAILABLE` con `retryAfterMs`.</Note>

Flujo seguro/predeterminado:

- `config.schema.lookup`: inspeccionar un subárbol de configuración con ámbito de ruta con un nodo de esquema superficial, metadatos de sugerencia coincidentes e resúmenes de hijos inmediatos
- `config.get`: obtener la instantánea actual + hash
- `config.patch`: ruta de actualización parcial preferida
- `config.apply`: solo reemplazo de configuración completa
- `update.run`: actualización explícita + reinicio

Cuando no estás reemplazando toda la configuración, prefiere `config.schema.lookup`
luego `config.patch`.

<AccordionGroup>
  <Accordion title="config.apply (full replace)">
    Valida + escribe la configuración completa y reinicia el Gateway en un solo paso.

    <Warning>
    `config.apply` reemplaza la **configuración completa**. Usa `config.patch` para actualizaciones parciales, o `openclaw config set` para claves individuales.
    </Warning>

    Parámetros:

    - `raw` (cadena) — carga útil JSON5 para toda la configuración
    - `baseHash` (opcional) — hash de configuración de `config.get` (requerido cuando la configuración existe)
    - `sessionKey` (opcional) — clave de sesión para el ping de activación posterior al reinicio
    - `note` (opcional) — nota para el centinela de reinicio
    - `restartDelayMs` (opcional) — retraso antes del reinicio (predeterminado 2000)

    Las solicitudes de reinicio se combinan mientras una ya está pendiente/en curso, y se aplica un tiempo de enfriamiento de 30 segundos entre ciclos de reinicio.

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
    Combina una actualización parcial en la configuración existente (semántica de parche de fusión JSON):

    - Los objetos se combinan de forma recursiva
    - `null` elimina una clave
    - Las matrices se reemplazan

    Parámetros:

    - `raw` (cadena) — JSON5 con solo las claves a cambiar
    - `baseHash` (requerido) — hash de configuración de `config.get`
    - `sessionKey`, `note`, `restartDelayMs` — igual que `config.apply`

    El comportamiento de reinicio coincide con `config.apply`: reinicios pendientes combinados más un tiempo de espera de 30 segundos entre ciclos de reinicio.

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## Variables de entorno

OpenClaw lee las variables de entorno del proceso principal más:

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
- Las variables faltantes/vacías arrojan un error en el momento de la carga
- Escapa con `$${VAR}` para una salida literal
- Funciona dentro de los archivos `$include`
- Sustitución en línea: `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
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

Los detalles de SecretRef (incluido `secrets.providers` para `env`/`file`/`exec`) están en [Secrets Management](/es/gateway/secrets).
Las rutas de credenciales compatibles se enumeran en [SecretRef Credential Surface](/es/reference/secretref-credential-surface).

</Accordion>

Consulte [Environment](/es/help/environment) para obtener la precedencia completa y las fuentes.

## Referencia completa

Para obtener la referencia completa campo por campo, consulte **[Configuration Reference](/es/gateway/configuration-reference)**.

---

_Relacionado: [Configuration Examples](/es/gateway/configuration-examples) · [Configuration Reference](/es/gateway/configuration-reference) · [Doctor](/es/gateway/doctor)_
