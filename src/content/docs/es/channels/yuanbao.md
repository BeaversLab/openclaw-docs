---
summary: "Descripción general, características y configuración del bot de YuanBao"
read_when:
  - You want to connect a YuanBao bot
  - You are configuring the YuanBao channel
title: YuanBao
---

# YuanBao

YuanBao es la plataforma de asistente de IA de Tencent que admite la integración de bots a través de mensajería instantánea. Los bots pueden interactuar con los usuarios mediante mensajes directos y chats de grupo.

**Estado:** listo para producción para MDs de bot + chats de grupo. WebSocket es el único modo de conexión admitido.

---

## Inicio rápido

> **Requiere OpenClaw 2026.4.10 o superior.** Ejecute `openclaw --version` para verificar. Actualice con `openclaw update`.

<Steps>
  <Step title="Añada el canal YuanBao con sus credenciales">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  El valor `--token` utiliza el formato `appKey:appSecret` separado por dos puntos. Puede obtenerlos desde la aplicación YuanBao creando un robot en la configuración de su aplicación.
  </Step>

  <Step title="Una vez completada la configuración, reinicie la puerta de enlace para aplicar los cambios">
  ```bash
  openclaw gateway restart
  ```
  </Step>
</Steps>

### Configuración interactiva (alternativa)

También puede utilizar el asistente interactivo:

```bash
openclaw channels login --channel yuanbao
```

Siga las instrucciones para ingresar su ID de aplicación y Secreto de aplicación.

---

## Control de acceso

### Mensajes directos

Configure `dmPolicy` para controlar quién puede enviar MD al bot:

- `"pairing"` — los usuarios desconocidos reciben un código de emparejamiento; apruebe a través de la CLI
- `"allowlist"` — solo los usuarios listados en `allowFrom` pueden chatear
- `"open"` — permitir a todos los usuarios (predeterminado)
- `"disabled"` — deshabilitar todos los MDs

**Aprobar una solicitud de emparejamiento:**

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### Chats de grupo

**Requisito de mención** (`channels.yuanbao.requireMention`):

- `true` — requerir @mención (predeterminado)
- `false` — responder sin @mención

Responder al mensaje del bot en un chat de grupo se trata como una mención implícita.

---

## Ejemplos de configuración

### Configuración básica con política de MD abierta

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "open",
      },
    },
  },
}
```

### Restringir MDs a usuarios específicos

```json5
{
  channels: {
    yuanbao: {
      appKey: "your_app_key",
      appSecret: "your_app_secret",
      dm: {
        policy: "allowlist",
        allowFrom: ["user_id_1", "user_id_2"],
      },
    },
  },
}
```

### Deshabilitar el requisito de @mención en grupos

```json5
{
  channels: {
    yuanbao: {
      requireMention: false,
    },
  },
}
```

### Optimizar la entrega de mensajes salientes

```json5
{
  channels: {
    yuanbao: {
      // Send each chunk immediately without buffering
      outboundQueueStrategy: "immediate",
    },
  },
}
```

### Ajustar la estrategia de fusión de texto

```json5
{
  channels: {
    yuanbao: {
      outboundQueueStrategy: "merge-text",
      minChars: 2800, // buffer until this many chars
      maxChars: 3000, // force split above this limit
      idleMs: 5000, // auto-flush after idle timeout (ms)
    },
  },
}
```

---

## Comandos comunes

| Comando    | Descripción                        |
| ---------- | ---------------------------------- |
| `/help`    | Mostrar comandos disponibles       |
| `/status`  | Mostrar el estado del bot          |
| `/new`     | Iniciar una nueva sesión           |
| `/stop`    | Detener la ejecución actual        |
| `/restart` | Reiniciar OpenClaw                 |
| `/compact` | Compactar el contexto de la sesión |

> YuanBao admite menús nativos de comandos de barra. Los comandos se sincronizan con la plataforma automáticamente cuando se inicia la puerta de enlace.

---

## Solución de problemas

### El bot no responde en los chats de grupo

1. Asegúrese de que el bot se haya añadido al grupo
2. Asegúrese de mencionar al bot con @mención (requerido de manera predeterminada)
3. Verifique los registros: `openclaw logs --follow`

### El bot no recibe mensajes

1. Asegúrese de que el bot se haya creado y aprobado en la APP de YuanBao
2. Asegúrese de que `appKey` y `appSecret` estén configurados correctamente
3. Asegúrese de que la puerta de enlace se esté ejecutando: `openclaw gateway status`
4. Verifique los registros: `openclaw logs --follow`

### El bot envía respuestas vacías o de reserva

1. Compruebe si el modelo de IA está devolviendo contenido válido
2. La respuesta de reserva predeterminada es: "暂时无法解答，你可以换个问题问问我哦"
3. Personalícela a través de `channels.yuanbao.fallbackReply`

### App Secret filtrado

1. Restablezca el App Secret en la APP de YuanBao
2. Actualice el valor en su configuración
3. Reinicie la puerta de enlace: `openclaw gateway restart`

---

## Configuración avanzada

### Múltiples cuentas

```json5
{
  channels: {
    yuanbao: {
      defaultAccount: "main",
      accounts: {
        main: {
          appKey: "key_xxx",
          appSecret: "secret_xxx",
          name: "Primary bot",
        },
        backup: {
          appKey: "key_yyy",
          appSecret: "secret_yyy",
          name: "Backup bot",
          enabled: false,
        },
      },
    },
  },
}
```

`defaultAccount` controla qué cuenta se utiliza cuando las APIs de salida no especifican un `accountId`.

### Límites de mensajes

- `maxChars` — recuento máximo de caracteres por mensaje (predeterminado: `3000` caracteres)
- `mediaMaxMb` — límite de carga/descarga de medios (predeterminado: `20` MB)
- `overflowPolicy` — comportamiento cuando el mensaje excede el límite: `"split"` (predeterminado) o `"stop"`

### Transmisión (Streaming)

YuanBao admite la transmisión de salida a nivel de bloque. Cuando está habilitada, el bot envía el texto en fragmentos a medida que lo genera.

```json5
{
  channels: {
    yuanbao: {
      disableBlockStreaming: false, // block streaming enabled (default)
    },
  },
}
```

Configure `disableBlockStreaming: true` para enviar la respuesta completa en un solo mensaje.

### Contexto del historial del chat de grupo

Controle cuántos mensajes históricos se incluyen en el contexto de la IA para los chats de grupo:

```json5
{
  channels: {
    yuanbao: {
      historyLimit: 100, // default: 100, set 0 to disable
    },
  },
}
```

### Modo de responder a (Reply-to mode)

Controle cómo el bot cita los mensajes al responder en los chats de grupo:

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all" (default: "first")
    },
  },
}
```

| Valor     | Comportamiento                                                             |
| --------- | -------------------------------------------------------------------------- |
| `"off"`   | Sin respuesta con cita                                                     |
| `"first"` | Citar solo la primera respuesta por cada mensaje entrante (predeterminado) |
| `"all"`   | Citar cada respuesta                                                       |

### Inyección de sugerencias de Markdown

De manera predeterminada, el bot inyecta instrucciones en el prompt del sistema para evitar que el modelo de IA envuelva toda la respuesta en bloques de código de markdown.

```json5
{
  channels: {
    yuanbao: {
      markdownHintEnabled: true, // default: true
    },
  },
}
```

### Modo de depuración

Habilitar la salida de registro sin sanitizar para ID de bots específicos:

```json5
{
  channels: {
    yuanbao: {
      debugBotIds: ["bot_user_id_1", "bot_user_id_2"],
    },
  },
}
```

### Enrutamiento multiagente

Use `bindings` para enrutar MDs o grupos de YuanBao a diferentes agentes.

```json5
{
  agents: {
    list: [{ id: "main" }, { id: "agent-a", workspace: "/home/user/agent-a" }, { id: "agent-b", workspace: "/home/user/agent-b" }],
  },
  bindings: [
    {
      agentId: "agent-a",
      match: {
        channel: "yuanbao",
        peer: { kind: "direct", id: "user_xxx" },
      },
    },
    {
      agentId: "agent-b",
      match: {
        channel: "yuanbao",
        peer: { kind: "group", id: "group_zzz" },
      },
    },
  ],
}
```

Campos de enrutamiento:

- `match.channel`: `"yuanbao"`
- `match.peer.kind`: `"direct"` (MD) o `"group"` (chat de grupo)
- `match.peer.id`: ID de usuario o código de grupo

---

## Referencia de configuración

Configuración completa: [Configuración de la puerta de enlace](/es/gateway/configuration)

| Ajuste                                     | Descripción                                                           | Predeterminado                         |
| ------------------------------------------ | --------------------------------------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | Habilitar/deshabilitar el canal                                       | `true`                                 |
| `channels.yuanbao.defaultAccount`          | Cuenta predeterminada para el enrutamiento saliente                   | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | Clave de la aplicación (usada para firmar y la generación de tickets) | —                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | Secreto de la aplicación (usado para firmar)                          | —                                      |
| `channels.yuanbao.accounts.<id>.token`     | Token prefirmado (omite la firma automática de tickets)               | —                                      |
| `channels.yuanbao.accounts.<id>.name`      | Nombre para mostrar de la cuenta                                      | —                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | Habilitar/deshabilitar una cuenta específica                          | `true`                                 |
| `channels.yuanbao.dm.policy`               | Política de MD                                                        | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | Lista de permitidos de MD (lista de ID de usuario)                    | —                                      |
| `channels.yuanbao.requireMention`          | Requerir mención (@) en grupos                                        | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | Manejo de mensajes largos (`split` o `stop`)                          | `split`                                |
| `channels.yuanbao.replyToMode`             | Estrategia de respuesta en grupos (`off`, `first`, `all`)             | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | Estrategia de salida (`merge-text` o `immediate`)                     | `merge-text`                           |
| `channels.yuanbao.minChars`                | Merge-text: min chars to trigger send                                 | `2800`                                 |
| `channels.yuanbao.maxChars`                | Merge-text: max chars per message                                     | `3000`                                 |
| `channels.yuanbao.idleMs`                  | Merge-text: idle timeout before auto-flush (ms)                       | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | Media size limit (MB)                                                 | `20`                                   |
| `channels.yuanbao.historyLimit`            | Group chat history context entries                                    | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | Disable block-level streaming output                                  | `false`                                |
| `channels.yuanbao.fallbackReply`           | Fallback reply when AI returns no content                             | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | Inject markdown anti-wrapping instructions                            | `true`                                 |
| `channels.yuanbao.debugBotIds`             | Debug whitelist bot IDs (unsanitized logs)                            | `[]`                                   |

---

## Tipos de mensajes admitidos

### Recibir

- ✅ Texto
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio / Voz
- ✅ Video
- ✅ Stickers / Emojis personalizados
- ✅ Elementos personalizados (tarjetas de enlace, etc.)

### Enviar

- ✅ Texto (con compatibilidad con markdown)
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video
- ✅ Stickers

### Hilos y respuestas

- ✅ Respuestas con cita (configurable vía `replyToMode`)
- ❌ Respuestas en hilo (no admitidas por la plataforma)

---

## Relacionado

- [Descripción general de canales](/es/channels) — todos los canales admitidos
- [Emparejamiento](/es/channels/pairing) — autenticación y flujo de emparejamiento por MD
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
