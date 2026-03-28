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
  <Tab title="Interactive wizard">```bash openclaw onboard # full onboarding flow openclaw configure # config wizard ```</Tab>
  <Tab title="CLI (one-liners)">```bash openclaw config get agents.defaults.workspace openclaw config set agents.defaults.heartbeat.every "2h" openclaw config unset plugins.entries.brave.config.webSearch.apiKey ```</Tab>
  <Tab title="Control UI">Abra [http://127.0.0.1:18789](http://127.0.0.1:18789) y use la pestaña **Config**. La Interfaz de Control renderiza un formulario a partir del esquema de configuración, con un editor **Raw JSON** como opción de escape.</Tab>
  <Tab title="Direct edit">Edite `~/.openclaw/openclaw.json` directamente. El Gateway observa el archivo y aplica los cambios automáticamente (consulte [recarga en caliente](#config-hot-reload)).</Tab>
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
  <Accordion title="Configurar un canal (WhatsApp, Telegram, Discord, etc.)">
    Cada canal tiene su propia sección de configuración bajo `channels.<provider>`. Consulta la página dedicada del canal para ver los pasos de configuración:

    - [WhatsApp](/es/channels/whatsapp) — `channels.whatsapp`
    - [Telegram](/es/channels/telegram) — `channels.telegram`
    - [Discord](/es/channels/discord) — `channels.discord`
    - [Slack](/es/channels/slack) — `channels.slack`
    - [Signal](/es/channels/signal) — `channels.signal`
    - [iMessage](/es/channels/imessage) — `channels.imessage`
    - [Google Chat](/es/channels/googlechat) — `channels.googlechat`
    - [Mattermost](/es/channels/mattermost) — `channels.mattermost`
    - [Microsoft Teams](/es/channels/msteams) — `channels.msteams`

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
    Establezca el modelo principal y los respaldos opcionales:

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
    - Las referencias de modelos usan el formato `provider/model` (p. ej., `anthropic/claude-opus-4-6`).
    - `agents.defaults.imageMaxDimensionPx` controla la reducción de escala de imágenes de transcripción/herramientas (por defecto `1200`); los valores más bajos generalmente reducen el uso de tokens de visión en ejecuciones con muchas capturas de pantalla.
    - Consulte [CLI de Modelos](/es/concepts/models) para cambiar modelos en el chat y [Conmutación por error de modelos](/es/concepts/model-failover) para el comportamiento de rotación de autenticación y respaldo.
    - Para proveedores personalizados/autohospedados, consulte [Proveedores personalizados](/es/gateway/configuration-reference#custom-providers-and-base-urls) en la referencia.

  </Accordion>

  <Accordion title="Controlar quién puede enviar mensajes al bot">
    El acceso por MD se controla por canal mediante `dmPolicy`:

    - `"pairing"` (predeterminado): los remitentes desconocidos reciben un código de emparejamiento de un solo uso para aprobar
    - `"allowlist"`: solo remitentes en `allowFrom` (o el almacén de permitidos emparejado)
    - `"open"`: permitir todos los MD entrantes (requiere `allowFrom: ["*"]`)
    - `"disabled"`: ignorar todos los MD

    Para grupos, use `groupPolicy` + `groupAllowFrom` o listas de permitidas específicas del canal.

    Consulte la [referencia completa](/es/gateway/configuration-reference#dm-and-group-access) para obtener detalles por canal.

  </Accordion>

  <Accordion title="Configurar el filtrado de menciones en chats grupales">
    Los mensajes grupales predeterminados a **requieren mención**. Configure patrones por agente:

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

  <Accordion title="Ajustar la supervisión de salud del canal de la puerta de enlace">
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

    - Establezca `gateway.channelHealthCheckMinutes: 0` para desactivar los reinicios del monitor de salud globalmente.
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
    - `threadBindings`: valores predeterminados globales para el enrutamiento de sesiones vinculadas a hilos (Discord admite `/focus`, `/unfocus`, `/agents`, `/session idle` y `/session max-age`).
    - Consulte [Gestión de sesiones](/es/concepts/session) para obtener información sobre el ámbito, los enlaces de identidad y la política de envío.
    - Consulte [referencia completa](/es/gateway/configuration-reference#session) para todos los campos.

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

    Consulta [Sandboxing](/es/gateway/sandboxing) para la guía completa y [full reference](/es/gateway/configuration-reference#agentsdefaultssandbox) para todas las opciones.

  </Accordion>

  <Accordion title="Activar el respaldo de notificaciones mediante relay para las compilaciones oficiales de iOS">
    El envío respaldado por relay se configura en `openclaw.json`.

    Configure esto en la configuración del gateway:

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

    Lo que esto hace:

    - Permite que el gateway envíe `push.test`, empujes de activación (wake nudges) y reactivaciones de reconexión a través del relay externo.
    - Utiliza un permiso de envío (send grant) con ámbito de registro reenviado por la aplicación iOS emparejada. El gateway no necesita un token de relay para toda la implementación.
    - Vincula cada registro respaldado por relay a la identidad del gateway con la que la aplicación iOS se emparejó, para que otro gateway no pueda reutilizar el registro almacenado.
    - Mantiene las compilaciones locales/manuales de iOS en APNs directas. Los envíos respaldados por relay se aplican solo a las compilaciones distribuidas oficialmente que se registraron a través del relay.
    - Debe coincidir con la URL base del relay incorporada en la compilación oficial/TestFlight de iOS, para que el tráfico de registro y envío llegue a la misma implementación del relay.

    Flujo de extremo a extremo:

    1. Instale una compilación oficial/TestFlight de iOS que se haya compilado con la misma URL base del relay.
    2. Configure `gateway.push.apns.relay.baseUrl` en el gateway.
    3. Empareje la aplicación iOS con el gateway y permita que se conecten tanto la sesión del nodo como la del operador.
    4. La aplicación iOS obtiene la identidad del gateway, se registra con el relay usando App Attest más el recibo de la aplicación y luego publica la carga útil (payload) de `push.apns.register` respaldada por relay en el gateway emparejado.
    5. El gateway almacena el identificador (handle) del relay y el permiso de envío, y luego los usa para `push.test`, empujes de activación y reactivaciones de reconexión.

    Notas operativas:

    - Si cambia la aplicación iOS a un gateway diferente, vuelva a conectar la aplicación para que pueda publicar un nuevo registro de relay vinculado a ese gateway.
    - Si implementa una nueva compilación de iOS que apunta a una implementación de relay diferente, la aplicación actualiza su registro de relay en caché en lugar de reutilizar el origen del relay anterior.

    Nota de compatibilidad:

    - `OPENCLAW_APNS_RELAY_BASE_URL` y `OPENCLAW_APNS_RELAY_TIMEOUT_MS` todavía funcionan como anulaciones temporales de entorno (env overrides).
    - `OPENCLAW_APNS_RELAY_ALLOW_HTTP=true` sigue siendo una salida de emergencia de desarrollo solo de bucle local (loopback-only); no persista las URLs de relay HTTP en la configuración.

    Vea [iOS App](/es/platforms/ios#relay-backed-push-for-official-builds) para el flujo de extremo a extremo y [Authentication and trust flow](/es/platforms/ios#authentication-and-trust-flow) para el modelo de seguridad del relay.

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
    - `target`: `last` | `whatsapp` | `telegram` | `discord` | `none`
    - `directPolicy`: `allow` (predeterminado) o `block` para objetivos de latido estilo DM
    - Consulte [Heartbeat](/es/gateway/heartbeat) para obtener la guía completa.

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
    - Consulte [Cron jobs](/es/automation/cron-jobs) para ver la descripción general de las funciones y los ejemplos de CLI.

  </Accordion>

  <Accordion title="Configurar webhooks (hooks)">
    Habilitar endpoints de webhook HTTP en la Gateway:

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
    - Mantenga las banderas de omisión de contenido inseguro desactivadas (`hooks.gmail.allowUnsafeExternalContent`, `hooks.mappings[].allowUnsafeExternalContent`) a menos que realice una depuración con un alcance estricto.
    - Para agentes impulsados por hooks, prefiera niveles de modelos modernos y sólidos y una política de herramientas estricta (por ejemplo, solo mensajería más sandbox cuando sea posible).

    Consulte [referencia completa](/es/gateway/configuration-reference#hooks) para todas las opciones de mapeo e integración con Gmail.

  </Accordion>

  <Accordion title="Configurar enrutamiento multiagente">
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

    Consulte [Multiagente](/es/concepts/multi-agent) y [referencia completa](/es/gateway/configuration-reference#multi-agent-routing) para conocer las reglas de enlace y los perfiles de acceso por agente.

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
    - **Array de archivos**: se combina profundamente en orden (el último prevalece)
    - **Claves hermanas**: se combinan después de las inclusiones (anulan los valores incluidos)
    - **Inclusiones anidadas**: admitidas hasta 10 niveles de profundidad
    - **Rutas relativas**: se resuelven en relación con el archivo que incluye
    - **Manejo de errores**: errores claros para archivos faltantes, errores de análisis e inclusiones circulares

  </Accordion>
</AccordionGroup>

## Recarga en caliente de la configuración

El Gateway observa `~/.openclaw/openclaw.json` y aplica los cambios automáticamente; no es necesario reiniciar manualmente para la mayoría de la configuraciones.

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

<Note>`gateway.reload` y `gateway.remote` son excepciones — cambiarlos **no** activa un reinicio.</Note>

## Config RPC (actualizaciones programáticas)

<Note>Las RPC de escritura del plano de control (`config.apply`, `config.patch`, `update.run`) tienen una tasa limitada de **3 solicitudes por 60 segundos** por `deviceId+clientIp`. Cuando se limitan, la RPC devuelve `UNAVAILABLE` con `retryAfterMs`.</Note>

<AccordionGroup>
  <Accordion title="config.apply (reemplazo total)">
    Valida + escribe la configuración completa y reinicia el Gateway en un solo paso.

    <Warning>
    `config.apply` reemplaza la **configuración completa**. Use `config.patch` para actualizaciones parciales, o `openclaw config set` para claves individuales.
    </Warning>

    Parámetros:

    - `raw` (cadena) — carga útil JSON5 para toda la configuración
    - `baseHash` (opcional) — hash de configuración de `config.get` (requerido cuando la configuración existe)
    - `sessionKey` (opcional) — clave de sesión para el ping de reactivación posterior al reinicio
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
    - `baseHash` (obligatorio) — hash de configuración de `config.get`
    - `sessionKey`, `note`, `restartDelayMs` — igual que `config.apply`

    El comportamiento de reinicio coincide con `config.apply`: reinicios pendientes fusionados más un periodo de enfriamiento de 30 segundos entre ciclos de reinicio.

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

<Accordion title="Referencias secretas (env, file, exec)">
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

Los detalles de SecretRef (incluidos `secrets.providers` para `env`/`file`/`exec`) están en [Gestión de secretos](/es/gateway/secrets).
Las rutas de credenciales admitidas se enumeran en [Superficie de credenciales SecretRef](/es/reference/secretref-credential-surface).

</Accordion>

Consulte [Environment](/es/help/environment) para obtener la precedencia y las fuentes completas.

## Referencia completa

Para la referencia completa campo por campo, consulte **[Configuration Reference](/es/gateway/configuration-reference)**.

---

_Relacionado: [Configuration Examples](/es/gateway/configuration-examples) · [Configuration Reference](/es/gateway/configuration-reference) · [Doctor](/es/gateway/doctor)_
