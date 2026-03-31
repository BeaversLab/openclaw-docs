---
summary: "Resumen general, características y configuración del bot de Feishu"
read_when:
  - You want to connect a Feishu/Lark bot
  - You are configuring the Feishu channel
title: Feishu
---

# Bot de Feishu

Feishu (Lark) es una plataforma de chat de equipo utilizada por empresas para mensajería y colaboración. Este complemento conecta OpenClaw a un bot de Feishu/Lark utilizando la suscripción de eventos WebSocket de la plataforma para que se puedan recibir mensajes sin exponer una URL de webhook pública.

---

## Complemento incluido

Feishu se incluye en las versiones actuales de OpenClaw, por lo que no se requiere
una instalación separada del complemento.

Si utiliza una versión anterior o una instalación personalizada que no incluye Feishu
incluido, instálelo manualmente:

```bash
openclaw plugins install @openclaw/feishu
```

---

## Inicio rápido

Hay dos formas de agregar el canal Feishu:

### Método 1: incorporación (recomendado)

Si acaba de instalar OpenClaw, ejecute la incorporación:

```bash
openclaw onboard
```

El asistente le guía a través de:

1. Crear una aplicación Feishu y recopilar las credenciales
2. Configurar las credenciales de la aplicación en OpenClaw
3. Iniciar la puerta de enlace

✅ **Después de la configuración**, verifique el estado de la puerta de enlace:

- `openclaw gateway status`
- `openclaw logs --follow`

### Método 2: configuración mediante CLI

Si ya completó la instalación inicial, agregue el canal a través de la CLI:

```bash
openclaw channels add
```

Elija **Feishu** y luego ingrese el ID de la aplicación y el secreto de la aplicación.

✅ **Después de la configuración**, gestione la puerta de enlace:

- `openclaw gateway status`
- `openclaw gateway restart`
- `openclaw logs --follow`

---

## Paso 1: Crear una aplicación Feishu

### 1. Abrir la plataforma abierta Feishu

Visite [Feishu Open Platform](https://open.feishu.cn/app) e inicie sesión.

Los inquilinos de Lark (global) deben usar [https://open.larksuite.com/app](https://open.larksuite.com/app) y establecer `domain: "lark"` en la configuración de Feishu.

### 2. Crear una aplicación

1. Haga clic en **Crear aplicación empresarial**
2. Complete el nombre de la aplicación + descripción
3. Elija un icono para la aplicación

![Crear aplicación empresarial](/images/feishu-step2-create-app.png)

### 3. Copiar las credenciales

Desde **Credenciales e información básica**, copie:

- **ID de aplicación** (formato: `cli_xxx`)
- **Secreto de la aplicación**

❗ **Importante:** mantenga el secreto de la aplicación en privado.

![Obtener credenciales](/images/feishu-step3-credentials.png)

### 4. Configurar permisos

En **Permisos**, haga clic en **Importación por lotes** y pegue:

```json
{
  "scopes": {
    "tenant": [
      "aily:file:read",
      "aily:file:write",
      "application:application.app_message_stats.overview:readonly",
      "application:application:self_manage",
      "application:bot.menu:write",
      "cardkit:card:read",
      "cardkit:card:write",
      "contact:user.employee_id:readonly",
      "corehr:file:download",
      "event:ip_list",
      "im:chat.access_event.bot_p2p_chat:read",
      "im:chat.members:bot_access",
      "im:message",
      "im:message.group_at_msg:readonly",
      "im:message.p2p_msg:readonly",
      "im:message:readonly",
      "im:message:send_as_bot",
      "im:resource"
    ],
    "user": ["aily:file:read", "aily:file:write", "im:chat.access_event.bot_p2p_chat:read"]
  }
}
```

![Configurar permisos](/images/feishu-step4-permissions.png)

### 5. Habilitar la capacidad del bot

En **Capacidad de la aplicación** > **Bot**:

1. Habilitar capacidad del bot
2. Establecer el nombre del bot

![Activar capacidad de bot](/images/feishu-step5-bot-capability.png)

### 6. Configurar la suscripción de eventos

⚠️ **Importante:** antes de configurar la suscripción de eventos, asegúrese de:

1. Ya ejecutó `openclaw channels add` para Feishu
2. La puerta de enlace se está ejecutando (`openclaw gateway status`)

En **Suscripción de eventos**:

1. Elija **Usar conexión larga para recibir eventos** (WebSocket)
2. Añada el evento: `im.message.receive_v1`

⚠️ Si la puerta de enlace no se está ejecutando, es posible que la configuración de conexión larga no se guarde.

![Configurar suscripción de eventos](/images/feishu-step6-event-subscription.png)

### 7. Publicar la aplicación

1. Cree una versión en **Gestión de versiones y lanzamiento**
2. Enviar para su revisión y publicación
3. Espere la aprobación del administrador (las aplicaciones empresariales generalmente se aprueban automáticamente)

---

## Paso 2: Configurar OpenClaw

### Configurar con el asistente (recomendado)

```bash
openclaw channels add
```

Elija **Feishu** y pegue su ID de aplicación + Secreto de aplicación.

### Configurar mediante archivo de configuración

Edite `~/.openclaw/openclaw.json`:

```json5
{
  channels: {
    feishu: {
      enabled: true,
      dmPolicy: "pairing",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          name: "My AI assistant",
        },
      },
    },
  },
}
```

Si usa `connectionMode: "webhook"`, configure tanto `verificationToken` como `encryptKey`. El servidor webhook de Feishu se vincula a `127.0.0.1` de manera predeterminada; configure `webhookHost` solo si necesita intencionalmente una dirección de enlace diferente.

#### Token de verificación y clave de cifrado (modo webhook)

Al usar el modo webhook, configure tanto `channels.feishu.verificationToken` como `channels.feishu.encryptKey` en su configuración. Para obtener los valores:

1. En la plataforma abierta de Feishu, abra su aplicación
2. Vaya a **Desarrollo** → **Eventos y devoluciones de llamada** (开发配置 → 事件与回调)
3. Abra la pestaña **Cifrado** (加密策略)
4. Copie el **Token de verificación** y la **Clave de cifrado**

La siguiente captura de pantalla muestra dónde encontrar el **Token de verificación**. La **Clave de cifrado** aparece en la misma sección de **Cifrado**.

![Ubicación del Token de verificación](/images/feishu-verification-token.png)

### Configurar mediante variables de entorno

```bash
export FEISHU_APP_ID="cli_xxx"
export FEISHU_APP_SECRET="xxx"
```

### Dominio de Lark (global)

Si su inquilino está en Lark (internacional), configure el dominio en `lark` (o una cadena de dominio completa). Puede configurarlo en `channels.feishu.domain` o por cuenta (`channels.feishu.accounts.<id>.domain`).

```json5
{
  channels: {
    feishu: {
      domain: "lark",
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
        },
      },
    },
  },
}
```

### Indicadores de optimización de cuota

Puede reducir el uso de la API de Feishu con dos indicadores opcionales:

- `typingIndicator` (predeterminado `true`): cuando `false`, omite las llamadas de reacción de escritura.
- `resolveSenderNames` (predeterminado `true`): cuando `false`, omite las llamadas de búsqueda de perfil del remitente.

Establécelos a nivel superior o por cuenta:

```json5
{
  channels: {
    feishu: {
      typingIndicator: false,
      resolveSenderNames: false,
      accounts: {
        main: {
          appId: "cli_xxx",
          appSecret: "xxx",
          typingIndicator: true,
          resolveSenderNames: false,
        },
      },
    },
  },
}
```

---

## Paso 3: Iniciar + probar

### 1. Iniciar la puerta de enlace

```bash
openclaw gateway
```

### 2. Enviar un mensaje de prueba

En Feishu, busca tu bot y envía un mensaje.

### 3. Aprobar el emparejamiento

Por defecto, el bot responde con un código de emparejamiento. Apruébalo:

```bash
openclaw pairing approve feishu <CODE>
```

Después de la aprobación, puedes chatear con normalidad.

---

## Descripción general

- **Canal del bot Feishu**: bot de Feishu gestionado por la puerta de enlace
- **Enrutamiento determinista**: las respuestas siempre regresan a Feishu
- **Aislamiento de sesión**: los MDs comparten una sesión principal; los grupos están aislados
- **Conexión WebSocket**: conexión larga a través del SDK de Feishu, no se necesita una URL pública

---

## Control de acceso

### Mensajes directos

- **Predeterminado**: `dmPolicy: "pairing"` (los usuarios desconocidos reciben un código de emparejamiento)
- **Aprobar emparejamiento**:

  ```bash
  openclaw pairing list feishu
  openclaw pairing approve feishu <CODE>
  ```

- **Modo de lista de permitidos**: configure `channels.feishu.allowFrom` con los Open ID permitidos

### Chats de grupo

**1. Política de grupo** (`channels.feishu.groupPolicy`):

- `"open"` = permitir a todos en los grupos
- `"allowlist"` = permitir solo `groupAllowFrom`
- `"disabled"` = desactivar mensajes de grupo

Predeterminado: `allowlist`

**2. Requisito de mención** (`channels.feishu.requireMention`, reemplazable vía `channels.feishu.groups.<chat_id>.requireMention`):

- `true` explícito = requerir @mención
- `false` explícito = responder sin menciones
- cuando no está configurado y `groupPolicy: "open"` = predeterminado a `false`
- cuando no está configurado y `groupPolicy` no es `"open"` = predeterminado a `true`

---

## Ejemplos de configuración de grupos

### Permitir todos los grupos, no se requiere @mención (predeterminado para grupos abiertos)

```json5
{
  channels: {
    feishu: {
      groupPolicy: "open",
    },
  },
}
```

### Permitir todos los grupos, pero aún requiriendo @mención

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
      // Feishu group IDs (chat_id) look like: oc_xxx
      groupAllowFrom: ["oc_xxx", "oc_yyy"],
    },
  },
}
```

### Restringir qué remitentes pueden enviar mensajes en un grupo (lista de permitidos de remitentes)

Además de permitir el grupo en sí, **todos los mensajes** en ese grupo están controlados por el open_id del remitente: solo los usuarios listados en `groups.<chat_id>.allowFrom` tienen sus mensajes procesados; los mensajes de otros miembros se ignoran (este es un control total a nivel de remitente, no solo para comandos de control como /reset o /new).

```json5
{
  channels: {
    feishu: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["oc_xxx"],
      groups: {
        oc_xxx: {
          // Feishu user IDs (open_id) look like: ou_xxx
          allowFrom: ["ou_user1", "ou_user2"],
        },
      },
    },
  },
}
```

---

## Obtener IDs de grupo/usuario

### IDs de grupo (chat_id)

Los IDs de grupo se parecen a `oc_xxx`.

**Método 1 (recomendado)**

1. Inicie el gateway y @mencione al bot en el grupo
2. Ejecute `openclaw logs --follow` y busque `chat_id`

**Método 2**

Use el depurador de la API de Feishu para listar los chats grupales.

### IDs de usuario (open_id)

Los IDs de usuario se parecen a `ou_xxx`.

**Método 1 (recomendado)**

1. Inicie el gateway y envíe un MD al bot
2. Ejecute `openclaw logs --follow` y busque `open_id`

**Método 2**

Compruebe las solicitudes de emparejamiento para los Open IDs de usuario:

```bash
openclaw pairing list feishu
```

---

## Comandos comunes

| Comando   | Descripción               |
| --------- | ------------------------- |
| `/status` | Mostrar el estado del bot |
| `/reset`  | Restablecer la sesión     |
| `/model`  | Mostrar/cambiar modelo    |

> Nota: Feishu aún no admite menús de comandos nativos, por lo que los comandos deben enviarse como texto.

## Comandos de gestión de la pasarela

| Comando                    | Descripción                              |
| -------------------------- | ---------------------------------------- |
| `openclaw gateway status`  | Mostrar el estado de la pasarela         |
| `openclaw gateway install` | Instalar/iniciar el servicio de pasarela |
| `openclaw gateway stop`    | Detener el servicio de pasarela          |
| `openclaw gateway restart` | Reiniciar el servicio de pasarela        |
| `openclaw logs --follow`   | Ver los registros de la pasarela         |

---

## Solución de problemas

### El bot no responde en los chats de grupo

1. Asegúrese de que el bot se haya añadido al grupo
2. Asegúrese de @mencionar al bot (comportamiento predeterminado)
3. Compruebe que `groupPolicy` no esté establecido en `"disabled"`
4. Compruebe los registros: `openclaw logs --follow`

### El bot no recibe mensajes

1. Asegúrese de que la aplicación esté publicada y aprobada
2. Asegúrese de que la suscripción de eventos incluya `im.message.receive_v1`
3. Asegúrese de que la **conexión larga** esté habilitada
4. Asegúrese de que los permisos de la aplicación estén completos
5. Asegúrese de que la pasarela se esté ejecutando: `openclaw gateway status`
6. Compruebe los registros: `openclaw logs --follow`

### Fuga de App Secret

1. Restablezca el App Secret en la Feishu Open Platform
2. Actualice el App Secret en su configuración
3. Reinicie la pasarela

### Fallos en el envío de mensajes

1. Asegúrese de que la aplicación tenga el permiso `im:message:send_as_bot`
2. Asegúrese de que la aplicación esté publicada
3. Compruebe los registros para ver errores detallados

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

`defaultAccount` controla qué cuenta de Feishu se utiliza cuando las APIs salientes no especifican un `accountId` explícitamente.

### Límites de mensajes

- `textChunkLimit`: tamaño del fragmento de texto saliente (predeterminado: 2000 caracteres)
- `mediaMaxMb`: límite de carga/descarga de medios (predeterminado: 30MB)

### Transmisión

Feishu admite respuestas en transmisión mediante tarjetas interactivas. Cuando está habilitado, el bot actualiza una tarjeta a medida que genera texto.

```json5
{
  channels: {
    feishu: {
      streaming: true, // enable streaming card output (default true)
      blockStreaming: true, // enable block-level streaming (default true)
    },
  },
}
```

Establezca `streaming: false` para esperar a que se complete la respuesta antes de enviarla.

### Sesiones ACP

Feishu admite ACP para:

- Mensajes directos
- conversaciones de temas de grupo

El ACP de Feishu se basa en comandos de texto. No hay menús nativos de comandos de barra, por lo que debe usar mensajes `/acp ...` directamente en la conversación.

#### Enlaces ACP persistentes

Use enlaces ACP escritos de nivel superior para fijar un MD de Feishu o una conversación de tema a una sesión ACP persistente.

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

#### Generación de ACP ligada a hilos desde el chat

En un MD de Feishu o conversación de tema, puede generar y vincular una sesión ACP en el lugar:

```text
/acp spawn codex --thread here
```

Notas:

- `--thread here` funciona para MDs y temas de Feishu.
- Los mensajes de seguimiento en el MD/tema vinculado se enrutan directamente a esa sesión ACP.
- v1 no tiene como objetivo los chats grupales genéricos que no son temas.

### Enrutamiento multiagente

Use `bindings` para enrutar MDs o grupos de Feishu a diferentes agentes.

```json5
{
  agents: {
    list: [
      { id: "main" },
      {
        id: "clawd-fan",
        workspace: "/home/user/clawd-fan",
        agentDir: "/home/user/.openclaw/agents/clawd-fan/agent",
      },
      {
        id: "clawd-xi",
        workspace: "/home/user/clawd-xi",
        agentDir: "/home/user/.openclaw/agents/clawd-xi/agent",
      },
    ],
  },
  bindings: [
    {
      agentId: "main",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_xxx" },
      },
    },
    {
      agentId: "clawd-fan",
      match: {
        channel: "feishu",
        peer: { kind: "direct", id: "ou_yyy" },
      },
    },
    {
      agentId: "clawd-xi",
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
- `match.peer.kind`: `"direct"` o `"group"`
- `match.peer.id`: ID abierto de usuario (`ou_xxx`) o ID de grupo (`oc_xxx`)

Consulte [Obtener IDs de grupo/usuario](#get-groupuser-ids) para obtener consejos de búsqueda.

---

## Referencia de configuración

Configuración completa: [Configuración de Gateway](/en/gateway/configuration)

Opciones clave:

| Configuración                                     | Descripción                                               | Predeterminado   |
| ------------------------------------------------- | --------------------------------------------------------- | ---------------- |
| `channels.feishu.enabled`                         | Habilitar/deshabilitar canal                              | `true`           |
| `channels.feishu.domain`                          | Dominio de API (`feishu` o `lark`)                        | `feishu`         |
| `channels.feishu.connectionMode`                  | Modo de transporte de eventos                             | `websocket`      |
| `channels.feishu.defaultAccount`                  | ID de cuenta predeterminada para el enrutamiento saliente | `default`        |
| `channels.feishu.verificationToken`               | Requerido para el modo webhook                            | -                |
| `channels.feishu.encryptKey`                      | Requerido para el modo webhook                            | -                |
| `channels.feishu.webhookPath`                     | Ruta de enrutamiento de webhook                           | `/feishu/events` |
| `channels.feishu.webhookHost`                     | Host de enlace de webhook                                 | `127.0.0.1`      |
| `channels.feishu.webhookPort`                     | Puerto de enlace de webhook                               | `3000`           |
| `channels.feishu.accounts.<id>.appId`             | ID de aplicación                                          | -                |
| `channels.feishu.accounts.<id>.appSecret`         | Secreto de aplicación                                     | -                |
| `channels.feishu.accounts.<id>.domain`            | Anulación de dominio de API por cuenta                    | `feishu`         |
| `channels.feishu.dmPolicy`                        | Política de MD                                            | `pairing`        |
| `channels.feishu.allowFrom`                       | Lista de permitidos de MD (lista de open_id)              | -                |
| `channels.feishu.groupPolicy`                     | Política de grupo                                         | `allowlist`      |
| `channels.feishu.groupAllowFrom`                  | Lista de permitidos de grupo                              | -                |
| `channels.feishu.requireMention`                  | Requerir @mención por defecto                             | condicional      |
| `channels.feishu.groups.<chat_id>.requireMention` | Anulación de requerir @mención por grupo                  | heredado         |
| `channels.feishu.groups.<chat_id>.enabled`        | Habilitar grupo                                           | `true`           |
| `channels.feishu.textChunkLimit`                  | Tamaño del fragmento de mensaje                           | `2000`           |
| `channels.feishu.mediaMaxMb`                      | Límite de tamaño de medios                                | `30`             |
| `channels.feishu.streaming`                       | Habilitar salida de tarjeta en flujo continuo             | `true`           |
| `channels.feishu.blockStreaming`                  | Habilitar flujo continuo de bloques                       | `true`           |

---

## Referencia de dmPolicy

| Valor         | Comportamiento                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------- |
| `"pairing"`   | **Por defecto.** Los usuarios desconocidos reciben un código de emparejamiento; deben ser aprobados |
| `"allowlist"` | Solo los usuarios en `allowFrom` pueden chatear                                                     |
| `"open"`      | Permitir todos los usuarios (requiere `"*"` en allowFrom)                                           |
| `"disabled"`  | Desactivar MDs                                                                                      |

---

## Tipos de mensajes admitidos

### Recibir

- ✅ Texto
- ✅ Texto enriquecido (publicación)
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video/medios
- ✅ Pegatinas

### Enviar

- ✅ Texto
- ✅ Imágenes
- ✅ Archivos
- ✅ Audio
- ✅ Video/medios
- ✅ Tarjetas interactivas
- ⚠️ Texto enriquecido (formato de estilo de publicación y tarjetas, no características de autoría arbitrarias de Feishu)

### Hilos y respuestas

- ✅ Respuestas en línea
- ✅ Respuestas a hilos de temas donde Feishu expone `reply_in_thread`
- ✅ Las respuestas de medios mantienen el conocimiento del hilo al responder a un mensaje de hilo/tema

## Superficie de acción en tiempo de ejecución

Feishu actualmente expone estas acciones en tiempo de ejecución:

- `send`
- `read`
- `edit`
- `thread-reply`
- `pin`
- `list-pins`
- `unpin`
- `member-info`
- `channel-info`
- `channel-list`
- `react` y `reactions` cuando las reacciones están habilitadas en la configuración
