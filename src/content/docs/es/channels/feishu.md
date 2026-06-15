---
summary: "Descripción general, características y configuración del bot de Feishu"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

Feishu/Lark es una plataforma de colaboración integral donde los equipos chatean, comparten documentos, administran calendarios y trabajan juntos.

**Estado:** listo para producción para MDs de bots + chats grupales. WebSocket es el modo predeterminado; el modo webhook es opcional.

---

## Inicio rápido

<Note>Requiere OpenClaw 2026.5.29 o superior. Ejecute `openclaw --version` para verificar. Actualice con `openclaw update`.</Note>

<Steps>
  <Step title="Ejecute el asistente de configuración del canal">
    ```bash openclaw channels login --channel feishu ``` Elija la configuración manual para pegar un ID de aplicación y un secreto de aplicación desde la plataforma abierta de Feishu, o elija la configuración QR para crear un bot automáticamente. Si la aplicación móvil doméstica de Feishu no reacciona al código QR, vuelva a ejecutar la configuración y elija la configuración manual.
  </Step>

  <Step title="Una vez completada la configuración, reinicie la puerta de enlace para aplicar los cambios">```bash openclaw gateway restart ```</Step>
</Steps>

---

## Control de acceso

### Mensajes directos

Configure `dmPolicy` para controlar quién puede enviar mensajes directos al bot:

- `"pairing"` - los usuarios desconocidos reciben un código de emparejamiento; apruebe a través de la CLI
- `"allowlist"` - solo los usuarios listados en `allowFrom` pueden chatear (predeterminado: solo el propietario del bot)
- `"open"` - permitir MD públicos solo cuando `allowFrom` incluye `"*"`; con entradas restrictivas, solo los usuarios coincidentes pueden chatear
- `"disabled"` - desactivar todos los MD

**Aprobar una solicitud de emparejamiento:**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### Chats grupales

**Política de grupo** (`channels.feishu.groupPolicy`):

| Valor         | Comportamiento                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------- |
| `"open"`      | Responder a todos los mensajes en grupos                                                             |
| `"allowlist"` | Responder solo a grupos en `groupAllowFrom` o configurados explícitamente en `groups.<chat_id>`      |
| `"disabled"`  | Desactivar todos los mensajes de grupo; las entradas explícitas de `groups.<chat_id>` no anulan esto |

Predeterminado: `allowlist`

**Requisito de mención** (`channels.feishu.requireMention`):

- `true` - requerir @mención (predeterminado)
- `false` - responder sin @mención
- Anulación por grupo: `channels.feishu.groups.<chat_id>.requireMention`
- Los `@all` y `@_all` de solo transmisión no se tratan como menciones al bot. Un mensaje que menciona tanto `@all` como al bot directamente todavía cuenta como una mención al bot.

---

## Ejemplos de configuración de grupos

### Permitir todos los grupos, no se requiere @mención

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### Permitir todos los grupos, aún así requerir @mención

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
      requireMention: true,
    },
  },
}
```

### Permitir solo grupos específicos

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      // Group IDs look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

En el modo `allowlist`, también puedes admitir un grupo añadiendo una entrada explícita de `groups.<chat_id>`. Las entradas explícitas no anulan `groupPolicy: "disabled"`. Los comodines predeterminados bajo `groups.*` configuran los grupos coincidentes, pero no admiten grupos por sí mismos.

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groups: {
        oc_xxx: {
          requireMention: false,
        },
      },
    },
  },
}
```

### Restringir remitentes dentro de un grupo

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // User open_ids look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

<a id="get-groupuser-ids"></a>

## Obtener IDs de grupo/usuario

### ID de grupo (`chat_id`, formato: `oc_xxx`)

Abre el grupo en Feishu/Lark, haz clic en el icono del menú en la esquina superior derecha y ve a **Configuración**. El ID de grupo (`chat_id`) se enumera en la página de configuración.

![Obtener ID de grupo](/images/feishu-get-group-id.png)

### ID de usuario (`open_id`, formato: `ou_xxx`)

Inicia la puerta de enlace, envía un mensaje directo al bot y luego revisa los registros:

```bash
openclaw logs --follow
```

Busca `open_id` en el resultado del registro. También puedes comprobar las solicitudes de emparejamiento pendientes:

```bash
openclaw pairing list feishu
```

---

## Comandos comunes

| Comando   | Descripción                       |
| --------- | --------------------------------- |
| `/status` | Mostrar el estado del bot         |
| `/reset`  | Restablecer la sesión actual      |
| `/model`  | Mostrar o cambiar el modelo de IA |

<Note>Feishu/Lark no admite menús nativos de comandos de barra diagonal, así que envíalos como mensajes de texto sin formato.</Note>

---

## Solución de problemas

### El bot no responde en los chats de grupo

1. Asegúrate de que el bot se haya agregado al grupo
2. Asegúrate de hacer @mención al bot (requerido de forma predeterminada)
3. Verifica que `groupPolicy` no sea `"disabled"`
4. Revisa los registros: `openclaw logs --follow`

### El bot no recibe mensajes

1. Asegúrate de que el bot esté publicado y aprobado en Feishu Open Platform / Lark Developer
2. Asegúrate de que la suscripción de eventos incluya `im.message.receive_v1`
3. Asegúrate de que la **conexión persistente** (WebSocket) esté seleccionada
4. Asegúrate de que se hayan otorgado todos los ámbitos de permisos requeridos
5. Asegúrate de que la puerta de enlace esté ejecutándose: `openclaw gateway status`
6. Revisa los registros: `openclaw logs --follow`

### La configuración QR no reacciona en la aplicación móvil de Feishu

1. Vuelve a ejecutar la configuración: `openclaw channels login --channel feishu`
2. Elija la configuración manual
3. En la plataforma abierta de Feishu, cree una aplicación autoconstruida y copie su App ID y App Secret
4. Pegue esas credenciales en el asistente de configuración

### App Secret filtrado

1. Restablezca el App Secret en la plataforma abierta de Feishu / Lark Developer
2. Actualice el valor en su configuración
3. Reinicia la puerta de enlace: `openclaw gateway restart`

---

## Configuración avanzada

### Múltiples cuentas

```json5
{
  channels: {
    feishu: {
      defaultAccount: "main",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "Primary bot",
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
        backup: {
          appId: "cli_yyy",
          appSecret: "yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` controla qué cuenta se utiliza cuando las APIs de salida no especifican un `accountId`.
`accounts.<id>.tts` utiliza la misma forma que `messages.tts` y se fusiona profundamente con la
configuración global de TTS, por lo que las configuraciones de Feishu con varios bots pueden mantener las credenciales
compartidas del proveedor globalmente, mientras que solo anulan la voz, el modelo, el persona o el modo automático
por cuenta.

### Límites de mensajes

- `textChunkLimit` - tamaño del fragmento de texto de salida (predeterminado: `2000` caracteres)
- `mediaMaxMb` - límite de subida/descarga de medios (predeterminado: `30` MB)

### Transmisión (Streaming)

Feishu/Lark admite respuestas en streaming a través de tarjetas interactivas. Cuando está habilitado, el bot actualiza la tarjeta en tiempo real mientras genera texto.

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default: true)
      blockStreaming: true, // opt into completed-block streaming
    },
  },
}
```

Establece `streaming: false` para enviar la respuesta completa en un solo mensaje. `blockStreaming` está desactivado de forma predeterminada; actívalo solo cuando desees que los bloques completados del asistente se vacíen antes de la respuesta final.

### Optimización de cuota

Reduzca el número de llamadas a la API de Feishu/Lark con dos indicadores opcionales:

- `typingIndicator` (predeterminado `true`): configure `false` para omitir las llamadas de reacción de escritura
- `resolveSenderNames` (predeterminado `true`): configure `false` para omitir las búsquedas de perfil del remitente

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
    },
  },
}
```

### Sesiones ACP

Feishu/Lark admite ACP para MDs y mensajes de hilos de grupo. El ACP de Feishu/Lark se basa en comandos de texto: no hay menús nativos de comandos con barra, así que use mensajes `/acp ...` directamente en la conversación.

#### Vinculación persistente de ACP

```json5
{
  agents: {
    list: [
      {
        id: "codex",
        runtime: {
          type: "acp",
          acp: {
            agent: "codex",
            backend: "acpx",
            mode: "persistent",
            cwd: "/workspace/openclaw",
          },
        },
      },
    ],
  },
  bindings: [
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "direct", id: "ou_1234567890" },
      },
    },
    {
      type: "acp",
      agentId: "codex",
      match: {
        channel: "feishu",
        accountId: "default",
        peer: { kind: "group", id: "oc_group_chat:topic:om_topic_root" },
      },
      acp: { label: "codex-feishu-topic" },
    },
  ],
}
```

#### Iniciar ACP desde el chat

En un mensaje directo o hilo de Feishu/Lark:

```text
/acp spawn codex --thread here
```

`--thread here` funciona para MDs y mensajes de hilos de Feishu/Lark. Los mensajes de seguimiento en la conversación vinculada se enrutan directamente a esa sesión ACP.

### Enrutamiento multiagente

Use `bindings` para enrutar MDs o grupos de Feishu/Lark a diferentes agentes.

```json5
{
  agents: {
    list: [{ id: "main" }, { id: "agent-a", workspace: "/home/user/agent-a" }, { id: "agent-b", workspace: "/home/user/agent-b" }],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "feishu",
        peer: { kind: "group", id: "oc_zzz" },
      },
    },
  ],
}
```

Campos de enrutamiento:

- `match.channel`: `"feishu"`
- `match.peer.kind`: `"direct"` (MD) o `"group"` (chat de grupo)
- `match.peer.id`: ID de usuario abierto (`ou_xxx`) o ID de grupo (`oc_xxx`)

Consulte [Obtener ID de grupo/usuario](#get-groupuser-ids) para obtener consejos de búsqueda.

---

## Aislamiento de agente por usuario (Creación dinámica de agentes)

Habilite `dynamicAgentCreation` para crear automáticamente **instancias de agente aisladas** para cada usuario de MD. Cada usuario obtiene su propio:

- Directorio de espacio de trabajo independiente
- `USER.md` / `SOUL.md` / `MEMORY.md` separados
- Historial de conversación privado
- Habilidades y estado aislados

Esto es esencial para bots públicos donde desea que cada usuario tenga su propia experiencia de asistente de IA privada.

<Note>
  **Limitación de la cuenta**: `dynamicAgentCreation` actualmente funciona solo con la **cuenta predeterminada de Feishu**. Las configuraciones con nombre o multicuenta aún no son totalmente compatibles: los enlaces dinámicos se crean sin `accountId`, por lo que los mensajes a cuentas con nombre aún pueden dirigirse a `agent:main`. Siga el progreso en [Issue
  #42837](https://github.com/openclaw/openclaw/issues/42837).
</Note>

### Configuración rápida

```json5
{
  channels: {
    feishu: {
      dmPolicy: "open",
      allowFrom: ["*"],
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // Critical: makes each user's DM their "main session"
    // Automatically loads USER.md / SOUL.md / MEMORY.md
    // For stronger isolation, use "per-channel-peer" instead
    dmScope: "main",
  },
}
```

### Cómo funciona

Cuando un nuevo usuario envía su primer MD:

1. El canal genera un `agentId` único = `feishu-{user_open_id}`
2. Crea un nuevo espacio de trabajo en la ruta `workspaceTemplate`
3. Registra el agente y crea un enlace para este usuario
4. El asistente del espacio de trabajo asegura los archivos de arranque (`AGENTS.md`, `SOUL.md`, `USER.md`, etc.) en el primer acceso
5. Enruta todos los mensajes futuros de este usuario a su agente dedicado

### Opciones de configuración

| Configuración                                            | Descripción                                                     | Predeterminado                       |
| -------------------------------------------------------- | --------------------------------------------------------------- | ------------------------------------ |
| `channels.feishu.dynamicAgentCreation.enabled`           | Habilitar la creación automática de agentes por usuario         | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | Plantilla de ruta para espacios de trabajo de agentes dinámicos | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | Plantilla de nombre de directorio del agente                    | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | Número máximo de agentes dinámicos a crear                      | ilimitado                            |

Variables de plantilla:

- `{agentId}` - el ID del agente generado (por ejemplo, `feishu-ou_xxxxxx`)
- `{userId}` - el open_id del remitente en Feishu (por ejemplo, `ou_xxxxxx`)

### Ámbito de sesión

`session.dmScope` controla cómo se asignan los mensajes directos a las sesiones de los agentes. Esta es una **configuración global** que afecta a todos los canales.

| Valor                | Comportamiento                                                     | Lo mejor para                                                                             |
| -------------------- | ------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- |
| `"main"`             | El MD de cada usuario se asigna a la sesión principal de su agente | Bots de un solo usuario donde deseas que `USER.md` / `SOUL.md` se carguen automáticamente |
| `"per-channel-peer"` | Cada combinación de (canal + usuario) obtiene una sesión separada  | Bots públicos multiusuario que necesitan un aislamiento más fuerte                        |

**Compromiso**: El uso de `"main"` permite la carga automática de archivos de arranque (`USER.md`, `SOUL.md`, `MEMORY.md`), pero significa que todos los MD de todos los canales comparten el mismo patrón de clave de sesión. Para bots públicos multiusuario donde el aislamiento es más importante que la carga automática de arranque, considera `"per-channel-peer"` y gestiona los archivos de arranque manualmente.

<Note>`"per-account-channel-peer"` no se recomienda con `dynamicAgentCreation` porque los enlaces dinámicos se crean sin `accountId`. Úselo solo con enlaces manuales.</Note>

```json5
{
  session: {
    // For single-user personal bots: enables auto bootstrap loading
    dmScope: "main",

    // For public multi-user bots: stronger isolation
    // dmScope: "per-channel-peer",
  },
}
```

### Despliegue multiusuario típico

```json5
{
  channels: {
    feishu: {
      appId: "cli_xxx",
      appSecret: "xxx",
      dmPolicy: "open",
      allowFrom: ["*"],
      groupPolicy: "open",
      requireMention: true,
      dynamicAgentCreation: {
        enabled: true,
        workspaceTemplate: "~/.openclaw/workspace-{agentId}",
        agentDirTemplate: "~/.openclaw/agents/{agentId}/agent",
      },
    },
  },
  session: {
    // Choose dmScope based on your isolation needs:
    // "main" for bootstrap auto-loading, "per-channel-peer" for stronger isolation
    dmScope: "main",
  },
  bindings: [], // Empty - dynamic agents auto-bind
}
```

### Verificación

Revise los registros de la puerta de enlace para confirmar que la creación dinámica funciona:

```
feishu: creating dynamic agent "feishu-ou_xxxxxx" for user ou_xxxxxx
workspace: /Users/you/.openclaw/workspace-feishu-ou_xxxxxx
feishu: dynamic agent created, new route: agent:feishu-ou_xxxxxx:main
```

Listar todos los espacios de trabajo creados:

```bash
ls -la ~/.openclaw/workspace-*
```

### Notas

- **Aislamiento del espacio de trabajo**: Cada usuario obtiene su propio directorio de espacio de trabajo e instancia de agente. Los usuarios no pueden ver el historial de conversación ni los archivos de los demás dentro del flujo de mensajería normal.
- **Límite de seguridad**: Este es un mecanismo de aislamiento de contexto de mensajería, no un límite de seguridad contra inquilinos hostiles. El proceso del agente y el entorno del host se comparten.
- **`bindings` debe estar vacío**: Los agentes dinámicos registran automáticamente sus propios enlaces
- **Ruta de actualización**: Los enlaces manuales existentes continúan funcionando junto con los agentes dinámicos
- **`session.dmScope` es global**: Esto afecta a todos los canales, no solo a Feishu

---

## Referencia de configuración

Configuración completa: [Configuración de puerta de enlace](/es/gateway/configuration)

| Ajuste                                                   | Descripción                                                                                               | Predeterminado                       |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `channels.feishu.enabled`                                | Habilitar/deshabilitar el canal                                                                           | `true`                               |
| `channels.feishu.domain`                                 | Dominio de API (`feishu` o `lark`)                                                                        | `feishu`                             |
| `channels.feishu.connectionMode`                         | Transporte de eventos (`websocket` o `webhook`)                                                           | `websocket`                          |
| `channels.feishu.defaultAccount`                         | Cuenta predeterminada para el enrutamiento saliente                                                       | `default`                            |
| `channels.feishu.verificationToken`                      | Requerido para el modo webhook                                                                            | -                                    |
| `channels.feishu.encryptKey`                             | Requerido para el modo webhook                                                                            | -                                    |
| `channels.feishu.webhookPath`                            | Ruta de enlace del webhook                                                                                | `/feishu/events`                     |
| `channels.feishu.webhookHost`                            | Host de enlace del webhook                                                                                | `127.0.0.1`                          |
| `channels.feishu.webhookPort`                            | Puerto de enlace del webhook                                                                              | `3000`                               |
| `channels.feishu.accounts.<id>.appId`                    | ID de la aplicación                                                                                       | -                                    |
| `channels.feishu.accounts.<id>.appSecret`                | Secreto de la aplicación                                                                                  | -                                    |
| `channels.feishu.accounts.<id>.domain`                   | Invalidación de dominio por cuenta                                                                        | `feishu`                             |
| `channels.feishu.accounts.<id>.tts`                      | Anulación de TTS por cuenta                                                                               | `messages.tts`                       |
| `channels.feishu.dmPolicy`                               | Política de MD                                                                                            | `allowlist`                          |
| `channels.feishu.allowFrom`                              | Lista permitida de MD (lista de open_id)                                                                  | [BotOwnerId]                         |
| `channels.feishu.groupPolicy`                            | Política de grupo                                                                                         | `allowlist`                          |
| `channels.feishu.groupAllowFrom`                         | Lista permitida de grupos                                                                                 | -                                    |
| `channels.feishu.requireMention`                         | Requerir @mención en grupos                                                                               | `true`                               |
| `channels.feishu.groups.<chat_id>.requireMention`        | Anulación de @mención por grupo; los IDs explícitos también admiten el grupo en modo de lista permitida   | heredado                             |
| `channels.feishu.groups.<chat_id>.enabled`               | Habilitar/deshabilitar un grupo específico                                                                | `true`                               |
| `channels.feishu.dynamicAgentCreation.enabled`           | Habilitar la creación automática de agentes por usuario                                                   | `false`                              |
| `channels.feishu.dynamicAgentCreation.workspaceTemplate` | Plantilla de ruta para espacios de trabajo de agentes dinámicos                                           | `~/.openclaw/workspace-{agentId}`    |
| `channels.feishu.dynamicAgentCreation.agentDirTemplate`  | Plantilla de nombre de directorio de agentes                                                              | `~/.openclaw/agents/{agentId}/agent` |
| `channels.feishu.dynamicAgentCreation.maxAgents`         | Número máximo de agentes dinámicos a crear                                                                | ilimitado                            |
| `channels.feishu.textChunkLimit`                         | Tamaño de fragmento de mensaje                                                                            | `2000`                               |
| `channels.feishu.mediaMaxMb`                             | Límite de tamaño de medios                                                                                | `30`                                 |
| `channels.feishu.streaming`                              | Salida de tarjeta en streaming                                                                            | `true`                               |
| `channels.feishu.blockStreaming`                         | Respuesta de streaming de bloque completado                                                               | `false`                              |
| `channels.feishu.typingIndicator`                        | Enviar reacciones de escritura                                                                            | `true`                               |
| `channels.feishu.resolveSenderNames`                     | Resolver nombres para mostrar del remitente                                                               | `true`                               |
| `channels.feishu.tools.bitable`                          | Habilitar herramientas de Bitable/Base                                                                    | `true`                               |
| `channels.feishu.tools.base`                             | Alias para `channels.feishu.tools.bitable`; prevalece `bitable` explícito cuando ambos están configurados | `true`                               |
| `channels.feishu.accounts.<id>.tools.bitable`            | Puerta de herramientas de Bitable/Base por cuenta                                                         | heredado                             |
| `channels.feishu.accounts.<id>.tools.base`               | Alias por cuenta para `tools.bitable`                                                                     | heredado                             |

---

## Tipos de mensajes compatibles

### Recibir

- ✅ Texto
- ✅ Texto enriquecido (publicación)
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video/medios
- ✅ Pegatinas

Los mensajes de audio entrantes de Feishu/Lark se normalizan como marcadores de posición de medios en lugar
de JSON `file_key` sin procesar. Cuando se configura `tools.media.audio`, OpenClaw
descarga el recurso de nota de voz y ejecuta la transcripción de audio compartida antes del
turno del agente, por lo que el agente recibe la transcripción hablada. Si Feishu incluye
el texto de la transcripción directamente en la carga de audio, ese texto se usa sin otra
llamada ASR. Sin un proveedor de transcripción de audio, el agente aún recibe un
marcador de posición `<media:audio>` además del archivo adjunto guardado, no la carga de
recurso de Feishu sin procesar.

### Enviar

- ✅ Texto
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video/medios
- ✅ Tarjetas interactivas (incluyendo actualizaciones en streaming)
- ⚠️ Texto enriquecido (formato de estilo publicación; no admite todas las capacidades de creación de Feishu/Lark)

Las burbujas de audio nativas de Feishu/Lark utilizan el tipo de mensaje de Feishu `audio` y requieren
medios de carga Ogg/Opus (`file_type: "opus"`). Los medios `.opus` y `.ogg` existentes
se envían directamente como audio nativo. Los formatos de audio probables como MP3/WAV/M4A y otros
se transcodifican a Ogg/Opus de 48kHz con `ffmpeg` solo cuando la respuesta solicita entrega
de voz (`audioAsVoice` / herramienta de mensaje `asVoice`, incluidas las respuestas de notas de
voz TTS). Los archivos adjuntos MP3 ordinarios se mantienen como archivos normales. Si falta `ffmpeg` o
la conversión falla, OpenClaw recurre a un archivo adjunto y registra el motivo.

### Hilos y respuestas

- ✅ Respuestas en línea
- ✅ Respuestas en hilos
- ✅ Las respuestas con medios mantienen el contexto del hilo al responder a un mensaje de un hilo

Para `groupSessionScope: "group_topic"` y `"group_topic_sender"`, los grupos de
temas nativos de Feishu/Lark utilizan el evento `thread_id` (`omt_*`) como la clave
canónica de sesión del tema. Si un evento inicial de tema nativo omite `thread_id`, OpenClaw
lo rellena desde Feishu antes de enrutar el turno. Las respuestas grupales normales que
OpenClaw convierte en hilos siguen utilizando el ID del mensaje raíz de la respuesta (`om_*`) para que
el primer turno y el turno de seguimiento permanezcan en la misma sesión.

---

## Relacionado

- [Descripción general de canales](/es/channels) - todos los canales admitidos
- [Emparejamiento](/es/channels/pairing) - autenticación y flujo de emparejamiento por MD
- [Grupos](/es/channels/groups) - comportamiento del chat en grupos y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) - enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) - modelo de acceso y endurecimiento
