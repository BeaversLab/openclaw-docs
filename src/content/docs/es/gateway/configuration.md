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
  <Tab title="Interactive wizard">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">
    Abra [http://127.0.0.1:18789](http://127.0.0.1:18789) y use la pestaña **Config** (Configuración). La interfaz de usuario de control (Control UI) renderiza un formulario a partir del esquema de configuración en vivo, incluyendo metadatos de documentación de campo `title` / `description` además de esquemas de complementos y canales cuando están disponibles, con un editor **Raw JSON** como vía
    de escape. Para interfaces de usuario de exploración (drill-down) y otras herramientas, la puerta de enlace (gateway) también expone `config.schema.lookup` para obtener un nodo de esquema con ámbito de ruta más resúmenes secundarios inmediatos.
  </Tab>
  <Tab title="Direct edit">Edite `~/.openclaw/openclaw.json` directamente. La puerta de enlace (Gateway) observa el archivo y aplica los cambios automáticamente (consulte [recarga en caliente](#config-hot-reload)).</Tab>
</Tabs>

## Validación estricta

<Warning>OpenClaw solo acepta configuraciones que coincidan completamente con el esquema. Claves desconocidas, tipos malformados o valores no válidos hacen que la puerta de enlace **se niegue a iniciarse**. La única excepción a nivel raíz es `$schema` (cadena), para que los editores puedan adjuntar metadatos de JSON Schema.</Warning>

Notas sobre las herramientas de esquema:

- `openclaw config schema` imprime la misma familia de esquemas JSON que utiliza la Interfaz de Control
  y la validación de configuración.
- Trate esa salida de esquema como el contrato legible por máquina canónico para
  `openclaw.json`; esta descripción general y la referencia de configuración lo resumen.
- Los valores de campo `title` y `description` se llevan a la salida del esquema para
  herramientas de editor y formulario.
- Las entradas de objeto anidadas, comodín (`*`) y de elemento de matriz (`[]`) heredan los mismos
  metadatos de documentación donde existe documentación de campo coincidente.
- Las ramas de composición `anyOf` / `oneOf` / `allOf` también heredan los mismos metadatos
  de documentación, por lo que las variantes de unión/intersección mantienen la misma ayuda de campo.
- `config.schema.lookup` devuelve una ruta de configuración normalizada con un nodo de
  esquema superficial (`title`, `description`, `type`, `enum`, `const`, límites comunes,
  y campos de validación similares), metadatos de sugerencia de interfaz coincidentes y resúmenes secundarios
  inmediatos para herramientas de exploración.
- Los esquemas de complemento/canal en tiempo de ejecución se fusionan cuando la puerta de enlace puede cargar el registro de manifiesto actual.
- `pnpm config:docs:check` detecta desviaciones entre los artefactos de la línea base de configuración orientados a la documentación y la superficie del esquema actual.

Cuando la validación falla:

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
    Configure el modelo principal y las reservas opcionales:

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
    - Las referencias de modelos utilizan el formato `provider/model` (ej. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` controla la reducción de escala de imágenes de transcripciones/herramientas (por defecto `1200`); los valores más bajos generalmente reducen el uso de tokens de visión en ejecuciones con muchas capturas de pantalla.
    - Consulte [CLI de Modelos](/es/concepts/models) para cambiar modelos en el chat y [Conmutación por error de modelos](/es/concepts/model-failover) para la rotación de autenticación y el comportamiento de reserva.
    - Para proveedores personalizados/autoalojados, consulte [Proveedores personalizados](/es/gateway/configuration-reference#custom-providers-and-base-urls) en la referencia.

  </Accordion>

  <Accordion title="Controlar quién puede enviar mensajes al bot">
    El acceso a MD se controla por canal a través de `dmPolicy`:

    - `"pairing"` (por defecto): los remitentes desconocidos reciben un código de emparejamiento de un solo vez para aprobar
    - `"allowlist"`: solo remitentes en `allowFrom` (o el almacén de permisos emparejado)
    - `"open"`: permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)
    - `"disabled"`: ignorar todos los MD

    Para grupos, use `groupPolicy` + `groupAllowFrom` o listas de permitidas específicas del canal.

    Consulte la [referencia completa](/es/gateway/configuration-reference#dm-and-group-access) para detalles por canal.

  </Accordion>

  <Accordion title="Configurar el filtrado de menciones en chats grupales">
    Los mensajes grupales predeterminados a **requerir mención**. Configure patrones por agente:

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

    - **Menciones de metadatos**: menciones @ nativas (menciones al tocar en WhatsApp, @bot en Telegram, etc.)
    - **Patrones de texto**: patrones de regex seguros en `mentionPatterns`
    - Consulte [referencia completa](/es/gateway/configuration-reference#group-chat-mention-gating) para anulaciones por canal y modo de chat propio.

  </Accordion>

  <Accordion title="Restringir habilidades por agente">
    Use `agents.defaults.skills` para una línea base compartida y luego anule agentes específicos
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
    - Consulte [Skills](/es/tools/skills), [Skills config](/es/tools/skills-config) y
      la [Configuration Reference](/es/gateway/configuration-reference#agents-defaults-skills).

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
    - `channelStaleEventThresholdMinutes` debe ser mayor o igual al intervalo de verificación.
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

    - `dmScope`: `main` (compartida) | `per-peer` | `per-channel-peer` | `per-account-channel-peer`
    - `threadBindings`: valores predeterminados globales para el enrutamiento de sesiones vinculado a hilos (Discord admite `/focus`, `/unfocus`, `/agents`, `/session idle` y `/session max-age`).
    - Consulte [Gestión de sesiones](/es/concepts/session) para el alcance, los enlaces de identidad y la política de envío.
    - Consulte la [referencia completa](/es/gateway/configuration-reference#session) para todos los campos.

  </Accordion>

  <Accordion title="Enable sandboxing">
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

    Primero construya la imagen: `scripts/sandbox-setup.sh`

    Consulte [Sandboxing](/es/gateway/sandboxing) para obtener la guía completa y [full reference](/es/gateway/configuration-reference#agentsdefaultssandbox) para ver todas las opciones.

  </Accordion>

  <Accordion title="Activar push respaldado por relay para compilaciones oficiales de iOS">
    El push respaldado por relay se configura en `openclaw.json`.

    Establézcalo en la configuración del gateway:

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

    Equivalente en CLI:

    ```bash
    openclaw config set gateway.push.apns.relay.baseUrl https://relay.example.com
    ```

    Lo que hace esto:

    - Permite que el gateway envíe `push.test`, empujes de activación y reactivaciones de reconexión a través del relay externo.
    - Utiliza un concesión de envío con alcance de registro reenviada por la aplicación iOS emparejada. El gateway no necesita un token de relay para todo el despliegue.
    - Vincula cada registro respaldado por relay con la identidad del gateway con la que la aplicación iOS se emparejó, por lo que otro gateway no puede reutilizar el registro almacenado.
    - Mantiene las compilaciones locales/manuales de iOS en APNs directos. Los envíos respaldados por relay se aplican solo a compilaciones distribuidas oficialmente que se registraron a través del relay.
    - Debe coincidir con la URL base del relay integrada en la compilación oficial/TestFlight de iOS, para que el tráfico de registro y envío llegue al mismo despliegue del relay.

    Flujo de extremo a extremo:

    1. Instale una compilación oficial/TestFlight de iOS que se haya compilado con la misma URL base del relay.
    2. Configure `gateway.push.apns.relay.baseUrl` en el gateway.
    3. Empareje la aplicación iOS con el gateway y permita que se conecten tanto las sesiones de nodo como las de operador.
    4. La aplicación iOS obtiene la identidad del gateway, se registra con el relay utilizando App Attest más el recibo de la aplicación y luego publica la carga útil del `push.apns.register` respaldada por relay en el gateway emparejado.
    5. El gateway almacena el identificador del relay y la concesión de envío, y luego los utiliza para `push.test`, empujes de activación y reactivaciones de reconexión.

    Notas operacionales:

    - Si cambia la aplicación iOS a un gateway diferente, vuelva a conectar la aplicación para que pueda publicar un nuevo registro de relay vinculado a ese gateway.
    - Si publica una nueva compilación de iOS que apunta a un despliegue de relay diferente, la aplicación actualiza su registro de relay en caché en lugar de reutilizar el origen del relay antiguo.

    Nota de compatibilidad:

    - `OPENCLAW_APNS_RELAY_BASE_URL` y `OPENCLAW_APNS_RELAY_TIMEOUT_MS` todavía funcionan como anulaciones temporales de env.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` sigue siendo una salida de emergencia para el desarrollo solo de loopback; no persista las URLs de relay HTTP en la configuración.

    Consulte [iOS App](/es/platforms/ios#relay-backed-push-for-official-builds) para el flujo de extremo a extremo y [Authentication and trust flow](/es/platforms/ios#authentication-and-trust-flow) para el modelo de seguridad del relay.

  </Accordion>

  <Accordion title="Configurar latido (verificaciones periódicas)">
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

    - `sessionRetention`: poda las sesiones de ejecución aisladas completadas de `sessions.json` (predeterminado `24h`; establezca `false` para desactivar).
    - `runLog`: poda `cron/runs/<jobId>.jsonl` por tamaño y líneas retenidas.
    - Consulte [Cron jobs](/es/automation/cron-jobs) para ver la descripción general de las características y ejemplos de CLI.

  </Accordion>

  <Accordion title="Configurar webhooks (hooks)">
    Active los endpoints de webhooks HTTP en la Gateway:

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
    - Trate todo el contenido del payload del hook/webhook como entrada no confiable.
    - Utilice un `hooks.token` dedicado; no reutilice el token compartido de la Gateway.
    - La autenticación de los hooks es solo mediante encabezados (`Authorization: Bearer ...` o `x-openclaw-token`); se rechazan los tokens en la cadena de consulta.
    - `hooks.path` no puede ser `/`; mantenga el ingreso de webhooks en una subruta dedicada como `/hooks`.
    - Mantenga las banderas de omisión de contenido no seguro desactivadas (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) a menos que esté realizando una depuración de alcance limitado.
    - Si habilita `hooks.allowRequestSessionKey`, también configure `hooks.allowedSessionKeyPrefixes` para limitar las claves de sesión seleccionadas por el llamador.
    - Para los agentes impulsados por hooks, prefiera niveles de modelo modernos y sólidos y una política de herramientas estricta (por ejemplo, solo mensajería más aislamiento cuando sea posible).

    Consulte la [referencia completa](/es/gateway/configuration-reference#hooks) para todas las opciones de mapeo e integración con Gmail.

  </Accordion>

  <Accordion title="Configurar el enrutamiento multiagente">
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

    Consulte [Multi-Agent](/es/concepts/multi-agent) y la [referencia completa](/es/gateway/configuration-reference#multi-agent-routing) para conocer las reglas de vinculación y los perfiles de acceso por agente.

  </Accordion>

  <Accordion title="Dividir la configuración en varios archivos ($include)">
    Utilice `$include` para organizar configuraciones grandes:

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

    - **Archivo único**: reemplaza al objeto contenedor
    - **Array de archivos**: se fusiona en profundidad en orden (el último prevalece)
    - **Claves hermanas**: se fusionan después de las inclusiones (anulan los valores incluidos)
    - **Inclusiones anidadas**: compatibles hasta 10 niveles de profundidad
    - **Rutas relativas**: se resuelven en relación con el archivo que incluye
    - **Manejo de errores**: errores claros para archivos faltantes, errores de análisis e inclusiones circulares

  </Accordion>
</AccordionGroup>

## Recarga en caliente de la configuración

El Gateway observa `~/.openclaw/openclaw.json` y aplica los cambios automáticamente — no se necesita un reinicio manual para la mayoría de las configuraciones.

### Modos de recarga

| Modo                          | Comportamiento                                                                                            |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (predeterminado) | Aplica cambios seguros instantáneamente. Se reinicia automáticamente para los críticos.                   |
| **`hot`**                     | Aplica solo cambios seguros. Registra una advertencia cuando se necesita un reinicio — usted lo gestiona. |
| **`restart`**                 | Reinicia el Gateway ante cualquier cambio de configuración, sea seguro o no.                              |
| **`off`**                     | Deshabilita la observación de archivos. Los cambios surten efecto en el siguiente reinicio manual.        |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Qué se aplica en caliente vs qué necesita un reinicio

La mayoría de los campos se aplican en caliente sin tiempo de inactividad. En el modo `hybrid`, los cambios que requieren reinicio se gestionan automáticamente.

| Categoría             | Campos                                                                       | ¿Se necesita reinicio? |
| --------------------- | ---------------------------------------------------------------------------- | ---------------------- |
| Canales               | `channels.*`, `web` (WhatsApp) — todos los canales integrados y de extensión | No                     |
| Agente y modelos      | `agent`, `agents`, `models`, `routing`                                       | No                     |
| Automatización        | `hooks`, `cron`, `agent.heartbeat`                                           | No                     |
| Sesiones y mensajes   | `session`, `messages`                                                        | No                     |
| Herramientas y medios | `tools`, `browser`, `skills`, `audio`, `talk`                                | No                     |
| IU y varios           | `ui`, `logging`, `identity`, `bindings`                                      | No                     |
| Servidor Gateway      | `gateway.*` (puerto, enlace, autenticación, tailscale, TLS, HTTP)            | **Sí**                 |
| Infraestructura       | `discovery`, `canvasHost`, `plugins`                                         | **Sí**                 |

<Note>`gateway.reload` y `gateway.remote` son excepciones — cambiarlos **no** activa un reinicio.</Note>

## Config RPC (actualizaciones programáticas)

<Note>Las RPC de escritura del plano de control (`config.apply`, `config.patch`, `update.run`) tienen una tasa limitada a **3 solicitudes por 60 segundos** por `deviceId+clientIp`. Cuando están limitadas, la RPC devuelve `UNAVAILABLE` con `retryAfterMs`.</Note>

Flujo seguro/predeterminado:

- `config.schema.lookup`: inspeccionar un subárbol de configuración con ámbito de ruta con un nodo de esquema superficial, metadatos de sugerencia coincidentes y resúmenes de hijos inmediatos
- `config.get`: obtener la instantánea actual + hash
- `config.patch`: ruta preferida de actualización parcial
- `config.apply`: solo reemplazo de configuración completa
- `update.run`: autactualización explícita + reinicio

Cuando no estás reemplazando toda la configuración, prefiere `config.schema.lookup`
luego `config.patch`.

<AccordionGroup>
  <Accordion title="config.apply (reemplazo completo)">
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
    Fusiona una actualización parcial en la configuración existente (semántica de parche de fusión JSON):

    - Los objetos se fusionan de forma recursiva
    - `null` elimina una clave
    - Las matrices se reemplazan

    Parámetros:

    - `raw` (cadena) — JSON5 con solo las claves a cambiar
    - `baseHash` (requerido) — hash de configuración de `config.get`
    - `sessionKey`, `note`, `restartDelayMs` — igual que `config.apply`

    El comportamiento de reinicio coincide con `config.apply`: reinicios pendientes combinados más un periodo de enfriamiento de 30 segundos entre ciclos de reinicio.

    ```bash
    openclaw gateway call config.patch --params '{
      "raw": "{ channels: { telegram: { groups: { \"*\": { requireMention: false } } } } }",
      "baseHash": "<hash>"
    }'
    ```

  </Accordion>
</AccordionGroup>

## Variables de entorno

OpenClaw lee las variables de entorno del proceso principal y además:

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

<Accordion title="Importación de entorno de Shell (opcional)">
  Si está habilitado y las claves esperadas no están establecidas, OpenClaw ejecuta tu shell de inicio de sesión e importa solo las claves que faltan:

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

- Solo se coinciden los nombres en mayúsculas: `[A-Z_][A-Z0-9_]*`
- Las variables faltantes/vacías lanzan un error en el momento de la carga
- Escapa con `$${VAR}` para una salida literal
- Funciona dentro de archivos `$include`
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

Los detalles de SecretRef (incluyendo `secrets.providers` para `env`/`file`/`exec`) están en [Secrets Management](/es/gateway/secrets).
Las rutas de credenciales compatibles se enumeran en [SecretRef Credential Surface](/es/reference/secretref-credential-surface).

</Accordion>

Consulte [Environment](/es/help/environment) para obtener la precedencia y los orígenes completos.

## Referencia completa

Para obtener la referencia completa campo por campo, consulte **[Configuration Reference](/es/gateway/configuration-reference)**.

---

_Relacionado: [Configuration Examples](/es/gateway/configuration-examples) · [Configuration Reference](/es/gateway/configuration-reference) · [Doctor](/es/gateway/doctor)_
