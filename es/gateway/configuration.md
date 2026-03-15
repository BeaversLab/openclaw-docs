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

Consulte la [referencia completa](/es/gateway/configuration-reference) para ver todos los campos disponibles.

<Tip>
  **¿Nuevo en la configuración?** Comience con `openclaw onboard` para una configuración
  interactiva, o consulte la guía de [Ejemplos de configuración](/es/gateway/configuration-examples)
  para obtener configuraciones completas para copiar y pegar.
</Tip>

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
  <Tab title="Interactive wizard">
    ```bash openclaw onboard # full setup wizard openclaw configure # config wizard ```
  </Tab>
  <Tab title="CLI (one-liners)">
    ```bash openclaw config get agents.defaults.workspace openclaw config set
    agents.defaults.heartbeat.every "2h" openclaw config unset tools.web.search.apiKey ```
  </Tab>
  <Tab title="Interfaz de control">
    Abra [http://127.0.0.1:18789](http://127.0.0.1:18789) y use la pestaña **Config**. La interfaz
    de control renderiza un formulario a partir del esquema de configuración, con un editor **Raw
    JSON** como opción de emergencia.
  </Tab>
  <Tab title="Edición directa">
    Edite `~/.openclaw/openclaw.json` directamente. El Gateway vigila el archivo y aplica los
    cambios automáticamente (consulte [recarga en caliente](#config-hot-reload)).
  </Tab>
</Tabs>

## Validación estricta

<Warning>
  OpenClaw solo acepta configuraciones que coincidan completamente con el esquema. Claves
  desconocidas, tipos mal formados o valores no válidos hacen que el Gateway **se niegue a
  iniciarse**. La única excepción a nivel de raíz es `$schema` (cadena), para que los editores
  puedan adjuntar metadatos de JSON Schema.
</Warning>

Cuando falla la validación:

- El Gateway no se inicia
- Solo funcionan los comandos de diagnóstico (`openclaw doctor`, `openclaw logs`, `openclaw health`, `openclaw status`)
- Ejecute `openclaw doctor` para ver los problemas exactos
- Ejecute `openclaw doctor --fix` (o `--yes`) para aplicar reparaciones

## Tareas comunes

<AccordionGroup>
  <Accordion title="Configurar un canal (WhatsApp, Telegram, Discord, etc.)">
    Cada canal tiene su propia sección de configuración en `channels.<provider>`. Consulte la página dedicada del canal para ver los pasos de configuración:

    - [WhatsApp](/es/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/es/channels/telegram) — `channels.telegram`
    - [Discord](/es/channels/discord) — `channels.discord`
    - [Slack](/es/channels/slack) — `channels.slack`
    - [Signal](/es/channels/signal) — `channels.signal`
    - [iMessage](/es/channels/imessage) — `channels.imessage`
    - [Google Chat](/es/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/es/channels/mattermost) — `channels.mattermost`
    - [MS Teams](/es/channels/msteams) — `channels.msteams`

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
            primary: "anthropic/claude-sonnet-4-5",
            fallbacks: ["openai/gpt-5.2"],
          },
          models: {
            "anthropic/claude-sonnet-4-5": { alias: "Sonnet" },
            "openai/gpt-5.2": { alias: "GPT" },
          },
        },
      },
    }
    ```

    - `agents.defaults.models` define el catálogo de modelos y actúa como la lista de permitidos para `/model`.
    - Las referencias de modelos utilizan el formato `provider/model` (por ejemplo, `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` controla la reducción de escala de las imágenes de transcripción/herramientas (por defecto `1200`); los valores más bajos generalmente reducen el uso de tokens de visión en ejecuciones con muchas capturas de pantalla.
    - Consulte [CLI de modelos](/es/concepts/models) para cambiar de modelos en el chat y [Conmutación por error de modelos](/es/concepts/model-failover) para el comportamiento de rotación de autenticación y conmutación por error.
    - Para proveedores personalizados/autohospedados, consulte [Proveedores personalizados](/es/gateway/configuration-reference#custom-providers-and-base-urls) en la referencia.

  </Accordion>

  <Accordion title="Control who can message the bot">
    El acceso a MD se controla por canal mediante `dmPolicy`:

    - `"pairing"` (predeterminado): los remitentes desconocidos obtienen un código de emparejamiento de un solo uso para aprobar
    - `"allowlist"`: solo remitentes en `allowFrom` (o el almacén de permitidos emparejado)
    - `"open"`: permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)
    - `"disabled"`: ignorar todos los MD

    Para grupos, use `groupPolicy` + `groupAllowFrom` o listas de permitidas específicas del canal.

    Consulte la [referencia completa](/es/gateway/configuration-reference#dm-and-group-access) para obtener detalles por canal.

  </Accordion>

  <Accordion title="Set up group chat mention gating">
    Los mensajes de grupo de forma predeterminada **requieren mención**. Configure patrones por agente:

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
    - **Patrones de texto**: patrones regex en `mentionPatterns`
    - Consulte la [referencia completa](/es/gateway/configuration-reference#group-chat-mention-gating) para obtener anulaciones por canal y el modo de autoprocesamiento.

  </Accordion>

  <Accordion title="Configure sessions and resets">
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
    - Consulte [Gestión de sesiones](/es/concepts/session) para obtener información sobre el ámbito, los vínculos de identidad y la política de envío.
    - Consulte la [referencia completa](/es/gateway/configuration-reference#session) para ver todos los campos.

  </Accordion>

  <Accordion title="Habilitar sandbox">
    Ejecuta sesiones de agente en contenedores Docker aislados:

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

    Construye la imagen primero: `scripts/sandbox-setup.sh`

    Consulta [Sandboxing](/es/gateway/sandboxing) para obtener la guía completa y [referencia completa](/es/gateway/configuration-reference#sandbox) para ver todas las opciones.

  </Accordion>

  <Accordion title="Activar notificaciones push respaldadas por relay para compilaciones oficiales de iOS">
    Las notificaciones push respaldadas por relay se configuran en `openclaw.json`.

    Establezca esto en la configuración del gateway:

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

    - Permite que el gateway envíe `push.test`, empujones de activación (wake nudges) y reactivaciones de reconexión a través del relay externo.
    - Utiliza un permiso de envío (send grant) con ámbito de registro reenviado por la aplicación iOS emparejada. El gateway no necesita un token de relay para toda la implementación.
    - Vincula cada registro respaldado por relay con la identidad del gateway con la que la aplicación iOS se emparejó, por lo que otro gateway no puede reutilizar el registro almacenado.
    - Mantiene las compilaciones locales/manuales de iOS en APNs directas. Los envíos respaldados por relay se aplican únicamente a las compilaciones distribuidas oficialmente que se registraron a través del relay.
    - Debe coincidir con la URL base del relay incorporada en la compilación oficial/TestFlight de iOS, para que el registro y el tráfico de envío lleguen a la misma implementación del relay.

    Flujo de extremo a extremo:

    1. Instale una compilación oficial/TestFlight de iOS que se haya compilado con la misma URL base del relay.
    2. Configure `gateway.push.apns.relay.baseUrl` en el gateway.
    3. Empareje la aplicación iOS con el gateway y permita que se conecten tanto la sesión del nodo como la del operador.
    4. La aplicación iOS obtiene la identidad del gateway, se registra con el relay utilizando App Attest más el recibo de la aplicación y luego publica la carga útil (payload) de `push.apns.register` respaldada por relay en el gateway emparejado.
    5. El gateway almacena el identificador del relay y el permiso de envío, y luego los utiliza para `push.test`, empujones de activación y reactivaciones de reconexión.

    Notas operacionales:

    - Si cambia la aplicación iOS a un gateway diferente, reconecte la aplicación para que pueda publicar un nuevo registro de relay vinculado a ese gateway.
    - Si implementa una nueva compilación de iOS que apunta a una implementación de relay diferente, la aplicación actualiza su registro de relay en caché en lugar de reutilizar el origen del relay anterior.

    Nota de compatibilidad:

    - `OPENCLAW_APNS_RELAY_BASE_URL` y `OPENCLAW_APNS_RELAY_TIMEOUT_MS` aún funcionan como anulaciones temporales de entorno.
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` sigue siendo una salida de emergencia de desarrollo solo de loopback; no persista las URLs de relay HTTP en la configuración.

    Consulte [iOS App](/es/platforms/ios#relay-backed-push-for-official-builds) para ver el flujo de extremo a extremo y [Authentication and trust flow](/es/platforms/ios#authentication-and-trust-flow) para conocer el modelo de seguridad del relay.

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
    - `target`: `last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy`: `allow` (predeterminado) o `block` para objetivos de latido estilo DM
    - Consulte [Latido](/es/gateway/heartbeat) para la guía completa.

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

    - `sessionRetention`: limpiar sesiones de ejecución aisladas completadas de `sessions.json` (predeterminado `24h`; establezca `false` para desactivar).
    - `runLog`: limpiar `cron/runs/<jobId>.jsonl` por tamaño y líneas retenidas.
    - Consulte [Trabajos cron](/es/automation/cron-jobs) para ver la descripción general de las características y ejemplos de CLI.

  </Accordion>

  <Accordion title="Configurar webhooks (hooks)">
    Habilite los endpoints de webhook HTTP en la puerta de enlace:

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
    - Mantenga las marcas de derivación de contenido no seguro desactivadas (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) a menos que esté realizando una depuración de alcance limitado.
    - Para los agentes controlados por hooks, prefiera niveles de modelos modernos y potentes y una política de herramientas estricta (por ejemplo, solo mensajería más sandbox cuando sea posible).

    Consulte [referencia completa](/es/gateway/configuration-reference#hooks) para todas las opciones de mapeo e integración con Gmail.

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

    Consulte [Multi-Agent](/es/concepts/multi-agent) y [referencia completa](/es/gateway/configuration-reference#multi-agent-routing) para obtener las reglas de vinculación y los perfiles de acceso por agente.

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

    - **Archivo único**: reemplaza al objeto contenedor
    - **Array de archivos**: se fusiona profundamente en orden (el último prevalece)
    - **Claves hermanas**: se fusionan después de las inclusiones (anulan los valores incluidos)
    - **Inclusiones anidadas**: compatibles hasta 10 niveles de profundidad
    - **Rutas relativas**: se resuelven en relación con el archivo que incluye
    - **Manejo de errores**: errores claros para archivos faltantes, errores de análisis e inclusiones circulares

  </Accordion>
</AccordionGroup>

## Recarga en caliente de la configuración

El Gateway supervisa `~/.openclaw/openclaw.json` y aplica los cambios automáticamente; no se necesita un reinicio manual para la mayoría de los ajustes.

### Modos de recarga

| Modo                          | Comportamiento                                                                                                    |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **`hybrid`** (predeterminado) | Aplica cambios seguros en caliente instantáneamente. Se reinicia automáticamente para los cambios críticos.       |
| **`hot`**                     | Aplica solo cambios seguros en caliente. Registra una advertencia cuando es necesario reiniciar: usted lo maneja. |
| **`restart`**                 | Reinicia el Gateway ante cualquier cambio de configuración, ya sea seguro o no.                                   |
| **`off`**                     | Desactiva la supervisión de archivos. Los cambios surten efecto en el próximo reinicio manual.                    |

```json5
{
  gateway: {
    reload: { mode: "hybrid", debounceMs: 300 },
  },
}
```

### Qué se aplica en caliente vs qué necesita reinicio

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

<Note>
  `gateway.reload` y `gateway.remote` son excepciones: cambiarlos **no** activa un reinicio.
</Note>

## Config RPC (actualizaciones programáticas)

<Note>
  Las RPCs de escritura del plano de control (`config.apply`, `config.patch`, `update.run`) tienen
  una limitación de velocidad de **3 solicitudes por 60 segundos** por `deviceId+clientIp`. Cuando
  están limitadas, la RPC devuelve `UNAVAILABLE` con `retryAfterMs`.
</Note>

<AccordionGroup>
  <Accordion title="config.apply (reemplazo total)">
    Valida + escribe la configuración completa y reinicia el Gateway en un solo paso.

    <Warning>
    `config.apply` reemplaza la **configuración completa**. Use `config.patch` para actualizaciones parciales, o `openclaw config set` para claves individuales.
    </Warning>

    Parámetros:

    - `raw` (string) — carga útil JSON5 para toda la configuración
    - `baseHash` (opcional) — hash de configuración de `config.get` (requerido cuando la configuración existe)
    - `sessionKey` (opcional) — clave de sesión para el ping de activación posterior al reinicio
    - `note` (opcional) — nota para el centinela de reinicio
    - `restartDelayMs` (opcional) — retraso antes del reinicio (predeterminado 2000)

    Las solicitudes de reinicio se combinan mientras ya hay una pendiente/en curso, y se aplica un tiempo de espera de 30 segundos entre los ciclos de reinicio.

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

    - `raw` (string) — JSON5 con solo las claves a cambiar
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

OpenClaw lee las variables de entorno del proceso principal más:

- `.env` desde el directorio de trabajo actual (si está presente)
- `~/.openclaw/.env` (reserva global)

Ningún archivo anula las variables de entorno existentes. También puede establecer variables de entorno en línea en la configuración:

```json5
{
  env: {
    OPENROUTER_API_KEY: "sk-or-...",
    vars: { GROQ_API_KEY: "gsk-..." },
  },
}
```

<Accordion title="Importación de entorno de shell (opcional)">
  Si está habilitado y las claves esperadas no están establecidas, OpenClaw ejecuta su shell de inicio de sesión e importa solo las claves que faltan:

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

- Solo se hacen coincidir nombres en mayúsculas: `[A-Z_][A-Z0-9_]*`
- Las variables faltantes/vacías arrojan un error en el momento de la carga
- Escapar con `$${VAR}` para salida literal
- Funciona dentro de archivos `$include`
- Sustitución en línea: `"${BASE}/v1"` → `"https://api.example.com/v1"`

</Accordion>

<Accordion title="Secret refs (env, file, exec)">
  Para los campos que soportan objetos SecretRef, puede usar:

```json5
{
  models: {
    providers: {
      openai: { apiKey: { source: "env", provider: "default", id: "OPENAI_API_KEY" } },
    },
  },
  skills: {
    entries: {
      "nano-banana-pro": {
        apiKey: {
          source: "file",
          provider: "filemain",
          id: "/skills/entries/nano-banana-pro/apiKey",
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
Las rutas de credenciales compatibles se enumeran en [Superficie de credenciales de SecretRef](/es/reference/secretref-credential-surface).

</Accordion>

Consulte [Entorno](/es/help/environment) para obtener la precedencia y las fuentes completas.

## Referencia completa

Para la referencia completa campo por campo, consulte **[Referencia de configuración](/es/gateway/configuration-reference)**.

---

_Relacionado: [Ejemplos de configuración](/es/gateway/configuration-examples) · [Referencia de configuración](/es/gateway/configuration-reference) · [Doctor](/es/gateway/doctor)_

import es from "/components/footer/es.mdx";

<es />
