---
summary: "Resumen del bot Yuanbao, características y configuración"
read_when:
  - You want to connect a Yuanbao bot
  - You are configuring the Yuanbao channel
title: Yuanbao
---

Tencent Yuanbao es la plataforma de asistente de IA de Tencent. El complemento de canal de OpenClaw
conecta los bots de Yuanbao con OpenClaw a través de WebSocket para que puedan interactuar con los usuarios
a través de mensajes directos y chats de grupo.

**Estado:** listo para producción para MDs de bot + chats de grupo. WebSocket es el único modo de conexión admitido.

---

## Inicio rápido

> **Requiere OpenClaw 2026.4.10 o superior.** Ejecute `openclaw --version` para verificar. Actualice con `openclaw update`.

<Steps>
  <Step title="Añada el canal Yuanbao con sus credenciales">
  ```bash
  openclaw channels add --channel yuanbao --token "appKey:appSecret"
  ```
  El valor `--token` utiliza el formato `appKey:appSecret` separado por dos puntos. Puede obtenerlos desde la aplicación Yuanbao creando un robot en la configuración de su aplicación.
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

Siga las indicaciones para ingresar su ID de aplicación (App ID) y su Secreto de aplicación (App Secret).

---

## Control de acceso

### Mensajes directos

Configure `dmPolicy` para controlar quién puede enviar MDs al bot:

- `"pairing"` - los usuarios desconocidos reciben un código de emparejamiento; apruebe a través de la CLI
- `"allowlist"` - solo los usuarios listados en `allowFrom` pueden chatear
- `"open"` - permitir a todos los usuarios (por defecto)
- `"disabled"` - deshabilitar todos los MDs

**Aprobar una solicitud de emparejamiento:**

```bash
openclaw pairing list yuanbao
openclaw pairing approve yuanbao <CODE>
```

### Chats de grupo

**Requisito de mención** (`channels.yuanbao.requireMention`):

- `true` - requerir @mención (por defecto)
- `false` - responder sin @mención

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

> Yuanbao admite menús nativos de comandos de barra diagonal. Los comandos se sincronizan con la plataforma automáticamente cuando se inicia la puerta de enlace.

---

## Solución de problemas

### El bot no responde en los chats de grupo

1. Asegúrese de que el bot se haya agregado al grupo
2. Asegúrese de hacer una @mención al bot (requerido por defecto)
3. Verifique los registros: `openclaw logs --follow`

### El bot no recibe mensajes

1. Asegúrese de que el bot esté creado y aprobado en la aplicación Yuanbao
2. Asegúrese de que `appKey` y `appSecret` estén configurados correctamente
3. Asegúrese de que la puerta de enlace esté ejecutándose: `openclaw gateway status`
4. Verifique los registros: `openclaw logs --follow`

### El bot envía respuestas vacías o de reserva

1. Verifique si el modelo de IA está devolviendo contenido válido
2. La respuesta de reserva predeterminada es: "暂时无法解答，你可以换个问题问问我哦"
3. Personalícela a través de `channels.yuanbao.fallbackReply`

### Secreto de la aplicación filtrado

1. Restablezca el Secreto de la aplicación en la aplicación YuanBao
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

`defaultAccount` controla qué cuenta se utiliza cuando las API de salida no especifican un `accountId`.

### Límites de mensajes

- `maxChars` - recuento máximo de caracteres por mensaje individual (predeterminado: `3000` caracteres)
- `mediaMaxMb` - límite de carga/descarga de medios (predeterminado: `20` MB)
- `overflowPolicy` - comportamiento cuando el mensaje excede el límite: `"split"` (predeterminado) o `"stop"`

### Transmisión (Streaming)

Yuanbao admite la salida de transmisión a nivel de bloque. Cuando está habilitado, el bot envía texto en fragmentos a medida que se genera.

```json5
{
  channels: {
    yuanbao: {
      disableBlockStreaming: false, // block streaming enabled (default)
    },
  },
}
```

Establezca `disableBlockStreaming: true` para enviar la respuesta completa en un solo mensaje.

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

### Modo de respuesta (Reply-to)

Controle cómo el bot cita mensajes al responder en los chats de grupo:

```json5
{
  channels: {
    yuanbao: {
      replyToMode: "first", // "off" | "first" | "all" (default: "first")
    },
  },
}
```

| Valor     | Comportamiento                                                        |
| --------- | --------------------------------------------------------------------- |
| `"off"`   | Sin respuesta con cita                                                |
| `"first"` | Citar solo la primera respuesta por mensaje entrante (predeterminado) |
| `"all"`   | Citar cada respuesta                                                  |

### Inyección de sugerencia de Markdown

De forma predeterminada, el bot inyecta instrucciones en el prompt del sistema para evitar que el modelo de IA envuelva toda la respuesta en bloques de código Markdown.

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

Habilitar salida de registro no saneada para IDs de bot específicos:

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

Use `bindings` para enrutar MDs o grupos de Yuanbao a diferentes agentes.

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

Configuración completa: [Configuración de puerta de enlace](/es/gateway/configuration)

| Configuración                              | Descripción                                                                        | Predeterminado                         |
| ------------------------------------------ | ---------------------------------------------------------------------------------- | -------------------------------------- |
| `channels.yuanbao.enabled`                 | Habilitar/deshabilitar el canal                                                    | `true`                                 |
| `channels.yuanbao.defaultAccount`          | Cuenta predeterminada para el enrutamiento saliente                                | `default`                              |
| `channels.yuanbao.accounts.<id>.appKey`    | App Key (usada para firmar y generación de tickets)                                | -                                      |
| `channels.yuanbao.accounts.<id>.appSecret` | App Secret (usada para firmar)                                                     | -                                      |
| `channels.yuanbao.accounts.<id>.token`     | Token prefirmado (omite la firma automática de tickets)                            | -                                      |
| `channels.yuanbao.accounts.<id>.name`      | Nombre para mostrar de la cuenta                                                   | -                                      |
| `channels.yuanbao.accounts.<id>.enabled`   | Habilitar/deshabilitar una cuenta específica                                       | `true`                                 |
| `channels.yuanbao.dm.policy`               | Política de MD                                                                     | `open`                                 |
| `channels.yuanbao.dm.allowFrom`            | Lista de permitidos de MD (lista de ID de usuario)                                 | -                                      |
| `channels.yuanbao.requireMention`          | Requerir @mención en grupos                                                        | `true`                                 |
| `channels.yuanbao.overflowPolicy`          | Manejo de mensajes largos (`split` o `stop`)                                       | `split`                                |
| `channels.yuanbao.replyToMode`             | Estrategia de respuesta en grupos (`off`, `first`, `all`)                          | `first`                                |
| `channels.yuanbao.outboundQueueStrategy`   | Estrategia de salida (`merge-text` o `immediate`)                                  | `merge-text`                           |
| `channels.yuanbao.minChars`                | Fusión de texto: caracteres mínimos para enviar                                    | `2800`                                 |
| `channels.yuanbao.maxChars`                | Fusión de texto: caracteres máximos por mensaje                                    | `3000`                                 |
| `channels.yuanbao.idleMs`                  | Fusión de texto: tiempo de espera de inactividad antes del vaciado automático (ms) | `5000`                                 |
| `channels.yuanbao.mediaMaxMb`              | Límite de tamaño de multimedia (MB)                                                | `20`                                   |
| `channels.yuanbao.historyLimit`            | Entradas de contexto del historial del chat grupal                                 | `100`                                  |
| `channels.yuanbao.disableBlockStreaming`   | Desactivar salida de transmisión a nivel de bloque                                 | `false`                                |
| `channels.yuanbao.fallbackReply`           | Respuesta de reserva cuando la IA no devuelve contenido                            | `暂时无法解答，你可以换个问题问问我哦` |
| `channels.yuanbao.markdownHintEnabled`     | Inyectar instrucciones anti-ajuste de markdown                                     | `true`                                 |
| `channels.yuanbao.debugBotIds`             | IDs de bot de lista blanca de depuración (registros no saneados)                   | `[]`                                   |

---

## Tipos de mensajes compatibles

### Recibir

- ✅ Texto
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio / Voz
- ✅ Video
- ✅ Pegatinas / Emojis personalizados
- ✅ Elementos personalizados (tarjetas de enlace, etc.)

### Enviar

- ✅ Texto (con soporte para markdown)
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video
- ✅ Pegatinas

### Hilos y respuestas

- ✅ Respuestas de cita (configurable mediante `replyToMode`)
- ❌ Respuestas de hilo (no compatibles con la plataforma)

---

## Relacionado

- [Descripción general de canales](/es/channels) - todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) - flujo de autenticación y emparejamiento de MD
- [Grupos](/es/channels/groups) - comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) - enrutamiento de sesión para mensajes
- [Seguridad](/es/gateway/security) - modelo de acceso y protección
