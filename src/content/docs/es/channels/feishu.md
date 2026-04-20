---
summary: "Resumen del bot de Feishu, funciones y configuración"
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

> **Requiere OpenClaw 2026.4.10 o superior.** Ejecute `openclaw --version` para verificar. Actualice con `openclaw update`.

<Steps>
  <Step title="Ejecute el asistente de configuración del canal">```bash openclaw channels login --channel feishu ``` Escanee el código QR con su aplicación móvil Feishu/Lark para crear un bot Feishu/Lark automáticamente.</Step>

  <Step title="Después de que se complete la configuración, reinicie la puerta de enlace para aplicar los cambios">```bash openclaw gateway restart ```</Step>
</Steps>

---

## Control de acceso

### Mensajes directos

Configure `dmPolicy` para controlar quién puede enviar MD al bot:

- `"pairing"` — los usuarios desconocidos reciben un código de emparejamiento; apruebe a través de CLI
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

| Valor         | Comportamiento                              |
| ------------- | ------------------------------------------- |
| `"open"`      | Responder a todos los mensajes en grupos    |
| `"allowlist"` | Solo responder a grupos en `groupAllowFrom` |
| `"disabled"`  | Deshabilitar todos los mensajes de grupo    |

Predeterminado: `allowlist`

**Requisito de mención** (`channels.feishu.requireMention`):

- `true` — requerir @mención (predeterminado)
- `false` — responder sin @mención
- Anulación por grupo: `channels.feishu.groups.<chat_id>.requireMention`

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

## Obtener IDs de grupo/usuario

### IDs de grupo (`chat_id`, formato: `oc_xxx`)

Abra el grupo en Feishu/Lark, haga clic en el icono del menú en la esquina superior derecha y vaya a **Configuración** (Settings). El ID del grupo (`chat_id`) aparece en la página de configuración.

![Obtener ID de grupo](/images/feishu-get-group-id.png)

### IDs de usuario (`open_id`, formato: `ou_xxx`)

Inicie el gateway, envíe un mensaje directo al bot y luego revise los registros:

```bash
openclaw logs --follow
```

Busque `open_id` en la salida del registro. También puede verificar las solicitudes de emparejamiento pendientes:

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

> Feishu/Lark no admite menús nativos de comandos de barra diagonal, así que envíelos como mensajes de texto sin formato.

---

## Solución de problemas

### El bot no responde en los chats grupales

1. Asegúrese de que el bot haya sido añadido al grupo
2. Asegúrese de hacer @mención al bot (requerido de forma predeterminada)
3. Verifique que `groupPolicy` no sea `"disabled"`
4. Revise los registros: `openclaw logs --follow`

### El bot no recibe mensajes

1. Asegúrese de que el bot esté publicado y aprobado en Feishu Open Platform / Lark Developer
2. Asegúrese de que la suscripción de eventos incluya `im.message.receive_v1`
3. Asegúrese de que **conexión persistente** (WebSocket) esté seleccionada
4. Asegúrese de que se hayan otorgado todos los ámbitos de permisos requeridos
5. Asegúrese de que el gateway se esté ejecutando: `openclaw gateway status`
6. Revise los registros: `openclaw logs --follow`

### App Secret filtrado

1. Restablezca el App Secret en Feishu Open Platform / Lark Developer
2. Actualice el valor en su configuración
3. Reinicie el gateway: `openclaw gateway restart`

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

`defaultAccount` controla qué cuenta se utiliza cuando las API de salida no especifican un `accountId`.

### Límites de mensajes

- `textChunkLimit` — tamaño del fragmento de texto de salida (predeterminado: `2000` caracteres)
- `mediaMaxMb` — límite de carga/descarga de medios (predeterminado: `30` MB)

### Transmisión (Streaming)

Feishu/Lark admite respuestas en streaming a través de tarjetas interactivas. Cuando está habilitado, el bot actualiza la tarjeta en tiempo real a medida que genera el texto.

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

Establezca `streaming: false` para enviar la respuesta completa en un mensaje.

### Optimización de cuotas

Reduzca el número de llamadas a la API de Feishu/Lark con dos indicadores opcionales:

- `typingIndicator` (por defecto `true`): establezca `false` para omitir las llamadas de reacción de escritura
- `resolveSenderNames` (por defecto `true`): establezca `false` para omitir las búsquedas de perfiles del remitente

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

Feishu/Lark admite ACP para mensajes de MD y de hilos de grupos. El ACP de Feishu/Lark se basa en comandos de texto: no hay menús nativos de comandos de barra diagonal, así que use mensajes `/acp ...` directamente en la conversación.

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

`--thread here` funciona para MD y mensajes de hilo de Feishu/Lark. Los mensajes de seguimiento en la conversación vinculada se enrutan directamente a esa sesión ACP.

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

Configuración completa: [Configuración de la puerta de enlace](/en/gateway/configuration)

| Ajuste                                            | Descripción                                         | Predeterminado   |
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
| `channels.feishu.accounts.<id>.domain`            | Anulación de dominio por cuenta                     | `feishu`         |
| `channels.feishu.dmPolicy`                        | Política de MD                                      | `allowlist`      |
| `channels.feishu.allowFrom`                       | Lista blanca de MD (lista de open_id)               | [BotOwnerId]     |
| `channels.feishu.groupPolicy`                     | Política de grupo                                   | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | Lista blanca de grupos                              | —                |
| `channels.feishu.requireMention`                  | Requerir @mención en grupos                         | `true`           |
| `channels.feishu.groups.<chat_id>.requireMention` | Anulación de @mención por grupo                     | heredado         |
| `channels.feishu.groups.<chat_id>.enabled`        | Habilitar/deshabilitar un grupo específico          | `true`           |
| `channels.feishu.textChunkLimit`                  | Tamaño del fragmento de mensaje                     | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Límite de tamaño de medios                          | `30`             |
| `channels.feishu.streaming`                       | Salida de tarjeta en streaming                      | `true`           |
| `channels.feishu.blockStreaming`                  | Streaming a nivel de bloque                         | `true`           |
| `channels.feishu.typingIndicator`                 | Enviar reacciones de escritura                      | `true`           |
| `channels.feishu.resolveSenderNames`              | Resolver nombres de pantalla del remitente          | `true`           |

---

## Tipos de mensaje compatibles

### Recibir

- ✅ Texto
- ✅ Texto enriquecido (publicación)
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video/medios
- ✅ Stickers

### Enviar

- ✅ Texto
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video/medios
- ✅ Tarjetas interactivas (incluyendo actualizaciones en streaming)
- ⚠️ Texto enriquecido (formato de estilo de publicación; no admite todas las capacidades de autoría de Feishu/Lark)

### Hilos y respuestas

- ✅ Respuestas en línea
- ✅ Respuestas a hilos
- ✅ Las respuestas de medios mantienen el conocimiento del hilo al responder a un mensaje de un hilo

---

## Relacionado

- [Resumen de canales](/en/channels) — todos los canales compatibles
- [Emparejamiento](/en/channels/pairing) — flujo de autenticación y emparejamiento por mensaje directo
- [Grupos](/en/channels/groups) — comportamiento del chat grupal y restricción de menciones
- [Enrutamiento de canales](/en/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/en/gateway/security) — modelo de acceso y endurecimiento
