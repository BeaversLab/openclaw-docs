---
summary: "Resumen de la configuración: tareas comunes, configuración rápida y enlaces a la referencia completa"
read_when:
  - Setting up OpenClaw for the first time
  - Looking for common configuration patterns
  - Navigating to specific config sections
title: "Configuración"
---

# Configuración

OpenClaw lee una configuración opcional de <Tooltip tip="JSON5 supports comments and trailing commas">**JSON5**</Tooltip> desde `~/.openclaw/openclaw.json`.

Si falta el archivo, OpenClaw utiliza valores predeterminados seguros. Razones comunes para añadir una configuración:

- Conectar canales y controlar quién puede enviar mensajes al bot
- Establecer modelos, herramientas, sandboxing o automatización (cron, hooks)
- Ajustar sesiones, medios, redes o interfaz de usuario

Consulte la [referencia completa](/en/gateway/configuration-reference) para ver todos los campos disponibles.

<Tip>**¿Es nuevo en la configuración?** Comience con `openclaw onboard` para una configuración interactiva, o consulte la guía de [Ejemplos de configuración](/en/gateway/configuration-examples) para ver configuraciones completas para copiar y pegar.</Tip>

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
  <Tab title="Control UI">Abra [http://127.0.0.1:18789](http://127.0.0.1:18789) y use la pestaña **Config**. La Interfaz de Control representa un formulario a partir del esquema de configuración, con un editor **Raw JSON** como vía de escape.</Tab>
  <Tab title="Direct edit">Edite `~/.openclaw/openclaw.json` directamente. El Gateway supervisa el archivo y aplica los cambios automáticamente (ver [recarga en caliente](#config-hot-reload)).</Tab>
</Tabs>

## Validación estricta

<Warning>OpenClaw solo acepta configuraciones que coincidan completamente con el esquema. Las claves desconocidas, los tipos malformados o los valores no válidos hacen que el Gateway **rehuse iniciarse**. La única excepción a nivel raíz es `$schema` (cadena), para que los editores puedan adjuntar metadatos de JSON Schema.</Warning>

Cuando falla la validación:

- El Gateway no se inicia
- Solo funcionan los comandos de diagnóstico (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Ejecute `openclaw doctor` para ver los problemas exactos
- Ejecute `openclaw doctor --fix` (o `--yes`) para aplicar reparaciones

## Tareas comunes

<AccordionGroup>
  <Accordion title="Set up a channel (WhatsApp, Telegram, Discord, etc.)">
    Cada canal tiene su propia sección de configuración en `channels.<provider>`. Consulte la página dedicada del canal para ver los pasos de configuración:

    - [WhatsApp](/en/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/en/channels/telegram) — `channels.telegram`
    - [Discord](/en/channels/discord) — `channels.discord`
    - [Slack](/en/channels/slack) — `channels.slack`
    - [Signal](/en/channels/signal) — `channels.signal`
    - [iMessage](/en/channels/imessage) — `channels.imessage`
    - [Google Chat](/en/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/en/channels/mattermost) — `channels.mattermost`
    - [Microsoft Teams](/en/channels/msteams) — `channels.msteams`

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

  <Accordion title="Choose and configure models">
    Configure el modelo principal y las alternativas opcionales:

    ```json5
    {
      agents: {
        defaults: {
          model: {
            primary: "anthropic/claude-sonnet-4-6",
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-6": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` define el catálogo de modelos y actúa como la lista de permitidos para `/model`.
    - Las referencias de modelos utilizan el formato `provider/model` (ej. `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` controla la reducción de escala de imágenes de transcripciones/herramientas (por defecto `1200`); los valores más bajos generalmente reducen el uso de tokens de visión en ejecuciones con muchas capturas de pantalla.
    - Consulte [Models CLI](/en/concepts/models) para cambiar modelos en el chat y [Model Failover](/en/concepts/model-failover) para la rotación de autenticación y el comportamiento de alternancia.
    - Para proveedores personalizados/autoalojados, consulte [Custom providers](/en/gateway/configuration-reference#custom-providers-and-base-urls) en la referencia.

  </Accordion>

  <Accordion title="Control who can message the bot">
    El acceso a MD se controla por canal a través de `dmPolicy`:

    - `"pairing"` (predeterminado): los remitentes desconocidos reciben un código de emparejamiento de un solo vez para aprobar
    - `"allowlist"`: solo remitentes en `allowFrom` (o el almacenamiento de permisos emparejado)
    - `"open"`: permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)
    - `"disabled"`: ignorar todos los MD

    Para grupos, utilice `groupPolicy` + `groupAllowFrom` o listas de permitidos específicas del canal.

    Consulte la [referencia completa](/en/gateway/configuration-reference#dm-and-group-access) para obtener detalles por canal.

  </Accordion>

  <Accordion title="Set up group chat mention gating">
    Los mensajes de grupo por defecto **requieren mención**. Configure patrones por agente:

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

    - **Menciones de metadatos**: menciones nativas @-mentions (menciones al tocar en WhatsApp, @bot en Telegram, etc.)
    - **Patrones de texto**: patrones de regex seguros en `mentionPatterns`
    - Consulte [referencia completa](/en/gateway/configuration-reference#group-chat-mention-gating) para anulaciones por canal y modo de chat propio.

  </Accordion>

  <Accordion title="Ajustar la supervisión del estado de los canales de la puerta de enlace">
    Controle la frecuencia con la que la puerta de enlace reinicia los canales que parecen obsoletos:

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

    - Establezca `gateway.channelHealthCheckMinutes: 0` para desactivar globalmente los reinicios de supervisión de estado.
    - `channelStaleEventThresholdMinutes` debe ser mayor o igual que el intervalo de verificación.
    - Use `channels.<provider>.healthMonitor.enabled` o `channels.<provider>.accounts.<id>.healthMonitor.enabled` para desactivar los reinicios automáticos para un canal o cuenta sin desactivar el supervisor global.
    - Consulte [Verificaciones de estado](/en/gateway/health) para la depuración operativa y la [referencia completa](/en/gateway/configuration-reference#gateway) para todos los campos.

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
    - Consulte [Gestión de sesiones](/en/concepts/session) para obtener información sobre el ámbito, los enlaces de identidad y la política de envío.
    - Consulte la [referencia completa](/en/gateway/configuration-reference#session) para todos los campos.

  </Accordion>

  <Accordion title="Activar el aislamiento (sandboxing)">
    Ejecute sesiones de agentes en contenedores Docker aislados:

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

    Compile primero la imagen: `scripts/sandbox-setup.sh`

    Consulte [Aislamiento](/en/gateway/sandboxing) para obtener la guía completa y la [referencia completa](/en/gateway/configuration-reference#agentsdefaultssandbox) para todas las opciones.

  </Accordion>

  <Accordion title="Habilitar notificaciones con respaldo de relay para compilaciones oficiales de iOS">
    Las notificaciones con respaldo de relay se configuran en `openclaw.json`.

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

    - Permite que la puerta de enlace envíe `push.test`, empujes de activación (wake nudges) y activaciones de reconexión a través del relay externo.
    - Utiliza un permiso de envío con alcance de registro reenviado por la aplicación iOS emparejada. La puerta de enlace no necesita un token de relay para todo el despliegue.
    - Vincula cada registro con respaldo de relay a la identidad de la puerta de enlace con la que la aplicación iOS se emparejó, de modo que otra puerta de enlace no pueda reutilizar el registro almacenado.
    - Mantiene las compilaciones locales/manuales de iOS en APNs directos. Los envíos con respaldo de relay se aplican solo a compilaciones distribuidas oficialmente que se registraron a través del relay.
    - Debe coincidir con la URL base del relay integrada en la compilación oficial/TestFlight de iOS, de modo que el tráfico de registro y envío llegue al mismo despliegue del relay.

    Flujo de un extremo a otro:

    1. Instale una compilación oficial/TestFlight de iOS que se compiló con la misma URL base del relay.
    2. Configure `gateway.push.apns.relay.baseUrl` en la puerta de enlace.
    3. Empareje la aplicación iOS con la puerta de enlace y permita que se conecten tanto las sesiones de nodo como las de operador.
    4. La aplicación iOS obtiene la identidad de la puerta de enlace, se registra con el relay usando App Attest más el recibo de la aplicación y luego publica el payload `push.apns.register` con respaldo de relay en la puerta de enlace emparejada.
    5. La puerta de enlace almacena el identificador y el permiso de envío del relay, y luego los usa para `push.test`, empujes de activación y activaciones de reconexión.

    Notas operativas:

    - Si cambia la aplicación iOS a una puerta de enlace diferente, reconecte la aplicación para que pueda publicar un nuevo registro de relay vinculado a esa puerta de enlace.
    - Si envía una nueva compilación de iOS que apunta a un despliegue de relay diferente, la aplicación actualiza su registro de relay en caché en lugar de reutilizar el origen del relay antiguo.

    Nota de compatibilidad:

    - `OPENCLAW_APNS_RELAY_BASE_URL` y `OPENCLAW_APNS_RELAY_TIMEOUT_MS` aún funcionan como anulaciones de entorno temporales.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` sigue siendo una salida de emergencia para desarrollo solo de bucle invertido; no persista las URLs de relay HTTP en la configuración.

    Consulte [iOS App](/en/platforms/ios#relay-backed-push-for-official-builds) para el flujo de un extremo a otro y [Authentication and trust flow](/en/platforms/ios#authentication-and-trust-flow) para el modelo de seguridad del relay.

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
    - `directPolicy`: `allow` (predeterminado) o `block` para objetivos de latido estilo DM
    - Vea [Heartbeat](/en/gateway/heartbeat) para la guía completa.

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
    - Vea [Cron jobs](/en/automation/cron-jobs) para la descripción general de las características y ejemplos de CLI.

  </Accordion>

  <Accordion title="Configurar webhooks (hooks)">
    Activar endpoints de webhook HTTP en la Pasarela (Gateway):

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
    - Mantenga las banderas de omisión de contenido no seguro desactivadas (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) a menos que esté realizando una depuración de alcance limitado.
    - Para los agentes impulsados por hooks, prefiera niveles de modelo modernos y fuertes y una política de herramientas estricta (por ejemplo, solo mensajería más sandbox donde sea posible).

    Vea [referencia completa](/en/gateway/configuration-reference#hooks) para todas las opciones de mapeo e integración con Gmail.

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

    Consulte [Multi-Agent](/en/concepts/multi-agent) y [referencia completa](/en/gateway/configuration-reference#multi-agent-routing) para conocer las reglas de vinculación y los perfiles de acceso por agente.

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
    - **Array de archivos**: fusionados en profundidad por orden (los últimos prevalecen)
    - **Claves hermanas**: se fusionan después de las inclusiones (anulan los valores incluidos)
    - **Inclusiones anidadas**: compatibles hasta 10 niveles de profundidad
    - **Rutas relativas**: se resuelven en relación con el archivo que incluye
    - **Manejo de errores**: errores claros para archivos faltantes, errores de análisis e inclusiones circulares

  </Accordion>
</AccordionGroup>

## Recarga en caliente de la configuración

El Gateway observa `~/.openclaw/openclaw.json` y aplica los cambios automáticamente; no se necesita reinicio manual para la mayoría de los ajustes.

### Modos de recarga

| Modo                          | Comportamiento                                                                                                      |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (predeterminado) | Aplica cambios seguros en caliente al instante. Reinicia automáticamente para los críticos.                         |
| **`hot`**                     | Solo aplica cambios seguros en caliente. Registra una advertencia cuando es necesario un reinicio: usted lo maneja. |
| **`restart`**                 | Reinicia el Gateway ante cualquier cambio de configuración, seguro o no.                                            |
| **`off`**                     | Desactiva la observación de archivos. Los cambios surten efecto en el próximo reinicio manual.                      |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Qué se aplica en caliente vs qué necesita un reinicio

La mayoría de los campos se aplican en caliente sin tiempo de inactividad. En el modo `hybrid`, los cambios que requieren reinicio se manejan automáticamente.

| Categoría                    | Campos                                                                       | ¿Reinicio necesario? |
| ---------------------------- | ---------------------------------------------------------------------------- | -------------------- |
| Canales                      | `channels.*`, `web` (WhatsApp) — todos los canales integrados y de extensión | No                   |
| Agente y modelos             | `agent`, `agents`, `models`, `routing`                                       | No                   |
| Automatización               | `hooks`, `cron`, `agent.heartbeat`                                           | No                   |
| Sesiones y mensajes          | `session`, `messages`                                                        | No                   |
| Herramientas y medios        | `tools`, `browser`, `skills`, `audio`, `talk`                                | No                   |
| Interfaz de usuario y varios | `ui`, `logging`, `identity`, `bindings`                                      | No                   |
| Servidor Gateway             | `gateway.*` (puerto, bind, auth, tailscale, TLS, HTTP)                       | **Sí**               |
| Infraestructura              | `discovery`, `canvasHost`, `plugins`                                         | **Sí**               |

<Note>`gateway.reload` y `gateway.remote` son excepciones: cambiarlos **no** activa un reinicio.</Note>

## Config RPC (actualizaciones programáticas)

<Note>Las RPCs de escritura del plano de control (`config.apply`, `config.patch`, `update.run`) tienen una limitación de tasa de **3 solicitudes por 60 segundos** por `deviceId+clientIp`. Cuando se limitan, la RPC devuelve `UNAVAILABLE` con `retryAfterMs`.</Note>

<AccordionGroup>
  <Accordion title="config.apply (reemplazo total)">
    Valida + escribe la configuración completa y reinicia el Gateway en un solo paso.

    <Warning>
    `config.apply` reemplaza la **configuración completa**. Usa `config.patch` para actualizaciones parciales, o `openclaw config set` para claves individuales.
    </Warning>

    Parámetros:

    - `raw` (cadena) — carga útil JSON5 para toda la configuración
    - `baseHash` (opcional) — hash de configuración de `config.get` (requerido cuando existe configuración)
    - `sessionKey` (opcional) — clave de sesión para el ping de activación posterior al reinicio
    - `note` (opcional) — nota para el centinela de reinicio
    - `restartDelayMs` (opcional) — retraso antes del reinicio (predeterminado 2000)

    Las solicitudes de reinicio se combinan mientras una ya está pendiente/en curso, y se aplica un enfriamiento de 30 segundos entre los ciclos de reinicio.

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

    - Los objetos se combinan recursivamente
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

OpenClaw lee las variables de entorno del proceso principal y también:

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

<Accordion title="Importación de entorno de Shell (opcional)">
  Si está habilitado y las claves esperadas no están establecidas, OpenClaw ejecuta su shell de inicio de sesión e importa solo las claves faltantes:

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
  Referencie variables de entorno en cualquier valor de cadena de configuración con `${VAR_NAME}`:

```json5
{
  gateway: { auth: { token: "${OPENCLAW_GATEWAY_TOKEN}" } },
  models: { providers: { custom: { apiKey: "${CUSTOM_API_KEY}" } } },
}
```

Reglas:

- Solo coinciden los nombres en mayúsculas: `[A-Z_][A-Z0-9_]*`
- Las variables faltantes/vacías arrojan un error en el momento de la carga
- Escapar con `$${VAR}` para una salida literal
- Funciona dentro de archivos `$include`
- Sustitución en línea: `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
  Para los campos que admiten objetos SecretRef, puedes usar:

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

Los detalles de SecretRef (incluyendo `secrets.providers` para `env`/`file`/`exec`) están en [Gestión de secretos](/en/gateway/secrets).
Las rutas de credenciales compatibles se enumeran en [Superficie de credenciales SecretRef](/en/reference/secretref-credential-surface).

</Accordion>

Consulta [Entorno](/en/help/environment) para obtener la precedencia y fuentes completas.

## Referencia completa

Para obtener la referencia completa campo por campo, consulta **[Referencia de configuración](/en/gateway/configuration-reference)**.

---

_Relacionado: [Ejemplos de configuración](/en/gateway/configuration-examples) · [Referencia de configuración](/en/gateway/configuration-reference) · [Doctor](/en/gateway/doctor)_
