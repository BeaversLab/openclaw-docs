---
summary: "Descripción general, características y configuración del bot de Feishu"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# Feishu / Lark

Feishu/Lark es una plataforma de colaboración todo en uno donde los equipos chatean, comparten documentos, gestionan calendarios y trabajan juntos.

**Estado:** listo para producción para MDs de bot + chats de grupo. WebSocket es el modo predeterminado; el modo webhook es opcional.

---

## Inicio rápido

<Note>Requiere OpenClaw 2026.4.25 o superior. Ejecute `openclaw --version` para verificar. Actualice con `openclaw update`.</Note>

<Steps>
  <Step title="Ejecute el asistente de configuración del canal">```bash openclaw channels login --channel feishu ``` Escanee el código QR con su aplicación móvil de Feishu/Lark para crear un bot de Feishu/Lark automáticamente.</Step>

  <Step title="Una vez que se complete la configuración, reinicie la puerta de enlace para aplicar los cambios">```bash openclaw gateway restart ```</Step>
</Steps>

---

## Control de acceso

### Mensajes directos

Configure `dmPolicy` para controlar quién puede enviar MD al bot:

- `"pairing"` — los usuarios desconocidos reciben un código de emparejamiento; apruebe mediante CLI
- `"allowlist"` — solo los usuarios listados en `allowFrom` pueden chatear (predeterminado: solo el propietario del bot)
- `"open"` — permitir a todos los usuarios
- `"disabled"` — deshabilitar todos los MDs

**Aprobar una solicitud de emparejamiento:**

```bash
openclaw pairing list feishu
openclaw pairing approve feishu <CODE>
```

### Chats de grupo

**Política de grupo** (`channels.feishu.groupPolicy`):

| Valor         | Comportamiento                                  |
| ------------- | ----------------------------------------------- |
| `"open"`      | Responder a todos los mensajes en grupos        |
| `"allowlist"` | Responder solo a los grupos en `groupAllowFrom` |
| `"disabled"`  | Deshabilitar todos los mensajes de grupo        |

Predeterminado: `allowlist`

**Requisito de mención** (`channels.feishu.requireMention`):

- `true` — requerir @mención (predeterminado)
- `false` — responder sin @mención
- Anulación por grupo: `channels.feishu.groups.<chat_id>.requireMention`
- Las `@all` y `@_all` de solo transmisión no se tratan como menciones del bot. Un mensaje que menciona tanto a `@all` como al bot directamente todavía cuenta como una mención del bot.

---

## Ejemplos de configuración de grupo

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

### Permitir todos los grupos, aún requerir @mención

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

### IDs de grupo (`chat_id`, formato: `oc_xxx`)

Abre el grupo en Feishu/Lark, haz clic en el icono del menú en la esquina superior derecha y ve a **Configuración**. El ID del grupo (`chat_id`) aparece en la página de configuración.

![Obtener ID de grupo](/images/feishu-get-group-id.png)

### IDs de usuario (`open_id`, formato: `ou_xxx`)

Inicia la puerta de enlace, envía un mensaje directo al bot y luego revisa los registros:

```bash
openclaw logs --follow
```

Busca `open_id` en la salida de los registros. También puedes verificar las solicitudes de emparejamiento pendientes:

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

### App Secret filtrada

1. Restablece el App Secret en Feishu Open Platform / Lark Developer
2. Actualiza el valor en tu configuración
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

`defaultAccount` controla qué cuenta se usa cuando las APIs de salida no especifican un `accountId`.
`accounts.<id>.tts` usa la misma forma que `messages.tts` y se fusiona profundamente con la
configuración global de TTS, por lo que las configuraciones de Feishu con múltiples bots pueden mantener las credenciales
compartidas del proveedor globalmente, sobrescribiendo solo la voz, el modelo, el persona o el modo automático
por cuenta.

### Límites de mensajes

- `textChunkLimit` — tamaño del fragmento de texto de salida (predeterminado: `2000` caracteres)
- `mediaMaxMb` — límite de carga/descarga de medios (predeterminado: `30` MB)

### Transmisión en vivo (Streaming)

Feishu/Lark admite respuestas en transmisión a través de tarjetas interactivas. Cuando está habilitado, el bot actualiza la tarjeta en tiempo real mientras genera el texto.

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default: true)
      blockStreaming: true, // enable block-level streaming (default: true)
    },
  },
}
```

Establezca `streaming: false` para enviar la respuesta completa en un solo mensaje.

### Optimización de cuota

Reduzca el número de llamadas a la API de Feishu/Lark con dos indicadores opcionales:

- `typingIndicator` (predeterminado `true`): establezca `false` para omitir las llamadas de reacción de escritura
- `resolveSenderNames` (predeterminado `true`): establezca `false` para omitir las búsquedas de perfil del remitente

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

Feishu/Lark admite ACP para mensajes de hilos de grupos y MD. El ACP de Feishu/Lark se basa en comandos de texto: no hay menús nativos de comandos con barra, así que use mensajes `/acp ...` directamente en la conversación.

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

#### Generar ACP desde el chat

En un MD o hilo de Feishu/Lark:

```text
/acp spawn codex --thread here
```

`--thread here` funciona para MD y mensajes de hilos de Feishu/Lark. Los mensajes de seguimiento en la conversación vinculada se dirigen directamente a esa sesión de ACP.

### Enrutamiento multiagente

Use `bindings` para enrutar MD o grupos de Feishu/Lark a diferentes agentes.

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

Consulte [Obtener IDs de grupo/usuario](#get-groupuser-ids) para obtener consejos de búsqueda.

---

## Referencia de configuración

Configuración completa: [Configuración de la pasarela](/es/gateway/configuration)

| Configuración                                     | Descripción                                         | Predeterminado   |
| ------------------------------------------------- | --------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Habilitar/deshabilitar el canal                     | `true`           |
| `channels.feishu.domain`                          | Dominio de la API (`feishu` o `lark`)               | `feishu`         |
| `channels.feishu.connectionMode`                  | Transporte de eventos (`websocket` o `webhook`)     | `websocket`      |
| `channels.feishu.defaultAccount`                  | Cuenta predeterminada para el enrutamiento saliente | `default`        |
| `channels.feishu.verificationToken`               | Requerido para el modo webhook                      | —                |
| `channels.feishu.encryptKey`                      | Requerido para el modo webhook                      | —                |
| `channels.feishu.webhookPath`                     | Ruta de la ruta del webhook                         | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Host de enlace del webhook                          | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Puerto de enlace del webhook                        | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | ID de aplicación                                    | —                |
| `channels.feishu.accounts.<id>.appSecret`         | Secreto de la aplicación                            | —                |
| `channels.feishu.accounts.<id>.domain`            | Invalidación de dominio por cuenta                  | `feishu`         |
| `channels.feishu.accounts.<id>.tts`               | Invalidación de TTS por cuenta                      | `messages.tts`   |
| `channels.feishu.dmPolicy`                        | Política de MD                                      | `allowlist`      |
| `channels.feishu.allowFrom`                       | Lista blanca de MD (lista de open_id)               | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | Política de grupo                                   | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | Lista blanca de grupos                              | —                |
| `channels.feishu.requireMention`                  | Requerir @mención en grupos                         | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | Invalidación de @mención por grupo                  | heredado         |
| `channels.feishu.groups.<chat_id>.enabled`        | Habilitar/deshabilitar un grupo específico          | `true`           |
| `channels.feishu.textChunkLimit`                  | Tamaño del fragmento del mensaje                    | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Límite de tamaño de medios                          | `30`             |
| `channels.feishu.streaming`                       | Salida de tarjeta en flujo                          | `true`           |
| `channels.feishu.blockStreaming`                  | Transmisión a nivel de bloque                       | `true`           |
| `channels.feishu.typingIndicator`                 | Enviar reacciones de escritura                      | `true`           |
| `channels.feishu.resolveSenderNames`              | Resolver nombres para mostrar del remitente         | `true`           |

---

## Tipos de mensajes admitidos

### Recibir

- ✅ Texto
- ✅ Texto enriquecido (publicación)
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video/multimedia
- ✅ Stickers

Los mensajes de audio entrantes de Feishu/Lark se normalizan como marcadores de posición de medios en lugar de JSON sin procesar `file_key`. Cuando se configura `tools.media.audio`, OpenClaw descarga el recurso de nota de voz y ejecuta la transcripción de audio compartida antes del turno del agente, por lo que el agente recibe la transcripción hablada. Si Feishu incluye el texto de la transcripción directamente en el payload de audio, se usa ese texto sin otra llamada ASR. Sin un proveedor de transcripción de audio, el agente todavía recibe un marcador de posición `<media:audio>` más el archivo adjunto guardado, no el payload del recurso sin procesar de Feishu.

### Enviar

- ✅ Texto
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video/multimedia
- ✅ Tarjetas interactivas (incluidas las actualizaciones de transmisión)
- ⚠️ Texto enriquecido (formato de estilo de publicación; no admite todas las capacidades de autoría de Feishu/Lark)

Las burbujas de audio nativas de Feishu/Lark usan el tipo de mensaje `audio` de Feishu y requieren medios de carga Ogg/Opus (`file_type: "opus"`). Los medios existentes `.opus` y `.ogg` se envían directamente como audio nativo. Los formatos de audio probables MP3/WAV/M4A y otros se transcodifican a 48kHz Ogg/Opus con `ffmpeg` solo cuando la respuesta solicita entrega de voz (`audioAsVoice` / herramienta de mensaje `asVoice`, incluidas las respuestas de notas de voz TTS). Los archivos adjuntos MP3 ordinarios permanecen como archivos normales. Si falta `ffmpeg` o la conversión falla, OpenClaw recurre a un archivo adjunto y registra el motivo.

### Hilos y respuestas

- ✅ Respuestas en línea
- ✅ Respuestas en hilo
- ✅ Las respuestas multimedia mantienen el conocimiento del hilo al responder a un mensaje de hilo

Para `groupSessionScope: "group_topic"` y `"group_topic_sender"`, los grupos de
temas nativos de Feishu/Lark usan el evento `thread_id` (`omt_*`) como clave
canónica de la sesión del tema. Las respuestas normales en el grupo que OpenClaw convierte en hilos siguen
usando el ID del mensaje raíz de la respuesta (`om_*`) para que el primer turno y los siguientes
permanezcan en la misma sesión.

---

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — flujo de autenticación y emparejamiento por MD
- [Grupos](/es/channels/groups) — comportamiento del chat de grupo y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
