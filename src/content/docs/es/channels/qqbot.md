---
summary: "Configuración, uso y configuración del Bot de QQ"
read_when:
  - You want to connect OpenClaw to QQ
  - You need QQ Bot credential setup
  - You want QQ Bot group or private chat support
title: Bot de QQ
---

El Bot de QQ se conecta a OpenClaw a través de la API oficial del Bot de QQ (puerto WebSocket). El
complemento admite chat privado C2C, mensajes @ de grupo y mensajes de canal de gremio con
medios enriquecidos (imágenes, voz, video, archivos).

Estado: complemento descargable. Se admiten mensajes directos, chats de grupo, canales de gremio y medios. Las reacciones y los hilos no son compatibles.

## Instalar

Instale el Bot de QQ antes de la configuración:

```bash
openclaw plugins install @openclaw/qqbot
```

## Configuración

1. Ve a la [Plataforma abierta QQ](https://q.qq.com/) y escanea el código QR con tu
   QQ móvil para registrarte / iniciar sesión.
2. Haga clic en **Crear Bot** para crear un nuevo bot de QQ.
3. Busque **AppID** y **AppSecret** en la página de configuración del bot y cópielos.

> AppSecret no se almacena en texto sin formato; si abandona la página sin guardarlo,
> tendrá que regenerar uno nuevo.

4. Añada el canal:

```bash
openclaw channels add --channel qqbot --token "AppID:AppSecret"
```

5. Reinicie el Gateway.

Rutas de configuración interactiva:

```bash
openclaw channels add
openclaw configure --section channels
```

## Configurar

Configuración mínima:

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: "YOUR_APP_SECRET",
    },
  },
}
```

Variables de entorno de cuenta predeterminada:

- `QQBOT_APP_ID`
- `QQBOT_CLIENT_SECRET`

AppSecret respaldado por archivo:

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecretFile: "/path/to/qqbot-secret.txt",
    },
  },
}
```

Env SecretRef AppSecret:

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "YOUR_APP_ID",
      clientSecret: { source: "env", provider: "default", id: "QQBOT_CLIENT_SECRET" },
    },
  },
}
```

Notas:

- La alternativa de entorno (env fallback) se aplica solo a la cuenta predeterminada de QQ Bot.
- `openclaw channels add --channel qqbot --token-file ...` proporciona solo el
  AppSecret; el AppID ya debe estar configurado en config o `QQBOT_APP_ID`.
- `clientSecret` también acepta entrada SecretRef, no solo una cadena de texto sin formato.
- Las cadenas de marcador `secretref:/...` heredadas no son valores `clientSecret` válidos;
  use objetos SecretRef estructurados como en el ejemplo anterior.

### Configuración multicuenta

Ejecutar múltiples bots de QQ bajo una sola instancia de OpenClaw:

```json5
{
  channels: {
    qqbot: {
      enabled: true,
      appId: "111111111",
      clientSecret: "secret-of-bot-1",
      accounts: {
        bot2: {
          enabled: true,
          appId: "222222222",
          clientSecret: "secret-of-bot-2",
        },
      },
    },
  },
}
```

Cada cuenta inicia su propia conexión WebSocket y mantiene un caché de tokens
independiente (aislado por `appId`).

Añadir un segundo bot a través de la CLI:

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### Chats de grupo

El soporte de chat de grupo del Bot de QQ usa OpenIDs de grupo de QQ, no nombres para mostrar. Añada el bot
a un grupo, luego menciónelo o configure el grupo para que se ejecute sin mención.

```json5
{
  channels: {
    qqbot: {
      groupPolicy: "allowlist",
      groupAllowFrom: ["member_openid"],
      groups: {
        "*": {
          requireMention: true,
          historyLimit: 50,
          toolPolicy: "restricted",
        },
        GROUP_OPENID: {
          name: "Release room",
          requireMention: false,
          ignoreOtherMentions: true,
          historyLimit: 20,
          prompt: "Keep replies short and operational.",
        },
      },
    },
  },
}
```

`groups["*"]` establece los valores predeterminados para cada grupo, y una entrada
`groups.GROUP_OPENID` concreta anula esos valores predeterminados para un grupo. La configuración
del grupo incluye:

- `requireMention`: requerir una @mención antes de que el bot responda. Predeterminado: `true`.
- `ignoreOtherMentions`: descartar mensajes que mencionen a otra persona pero no al bot.
- `historyLimit`: mantener los mensajes recientes del grupo sin mención como contexto para el siguiente turno mencionado. Establezca `0` para desactivar.
- `toolPolicy`: `full`, `restricted` o `none` para herramientas con ámbito de grupo.
- `name`: etiqueta descriptiva utilizada en registros y contexto de grupo.
- `prompt`: aviso de comportamiento por grupo agregado al contexto del agente.

Los modos de activación son `mention` y `always`. `requireMention: true` se asigna a `mention`; `requireMention: false` se asigna a `always`. Una anulación de activación a nivel de sesión, si está presente, tiene prioridad sobre la configuración.

La cola de entrada es por par. Los pares de grupo obtienen un límite de cola mayor, mantienen los mensajes humanos por delante de las conversaciones generadas por el bot cuando está llena y fusionan ráfagas de mensajes de grupo normales en un turno atribuido. Los comandos de barra diagonal todavía se ejecutan uno por uno.

### Voz (STT / TTS)

STT y TTS admiten una configuración de dos niveles con respaldo prioritario:

| Configuración | Específico del complemento                               | Respaldo del marco            |
| ------------- | -------------------------------------------------------- | ----------------------------- |
| STT           | `channels.qqbot.stt`                                     | `tools.media.audio.models[0]` |
| TTS           | `channels.qqbot.tts`, `channels.qqbot.accounts.<id>.tts` | `messages.tts`                |

```json5
{
  channels: {
    qqbot: {
      stt: {
        provider: "your-provider",
        model: "your-stt-model",
      },
      tts: {
        provider: "your-provider",
        model: "your-tts-model",
        voice: "your-voice",
      },
      accounts: {
        "qq-main": {
          tts: {
            providers: {
              openai: { voice: "shimmer" },
            },
          },
        },
      },
    },
  },
}
```

Establezca `enabled: false` en cualquiera de los dos para desactivar. Las anulaciones de TTS a nivel de cuenta utilizan la misma forma que `messages.tts` y se fusionan profundamente sobre la configuración TTS del canal/global.

Los archivos de voz entrantes de QQ se exponen a los agentes como metadatos de medios de audio, manteniendo los archivos de voz sin procesar fuera del `MediaPaths` genérico. Las respuestas de texto plano `[[audio_as_voice]]` sintetizan TTS y envían un mensaje de voz nativo de QQ cuando TTS está configurado.

El comportamiento de carga/transcodificación de audio saliente también se puede ajustar con `channels.qqbot.audioFormatPolicy`:

- `sttDirectFormats`
- `uploadDirectFormats`
- `transcodeEnabled`

## Formatos de destino

| Formato                    | Descripción        |
| -------------------------- | ------------------ |
| `qqbot:c2c:OPENID`         | Chat privado (C2C) |
| `qqbot:group:GROUP_OPENID` | Chat de grupo      |
| `qqbot:channel:CHANNEL_ID` | Canal de gremio    |

> Cada bot tiene su propio conjunto de OpenIDs de usuario. Un OpenID recibido por el Bot A **no** puede usarse para enviar mensajes a través del Bot B.

## Comandos de barra diagonal

Comandos integrados interceptados antes de la cola de IA:

| Comando        | Descripción                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/bot-ping`    | Prueba de latencia                                                                                                   |
| `/bot-version` | Mostrar la versión del marco OpenClaw                                                                                |
| `/bot-help`    | Listar todos los comandos                                                                                            |
| `/bot-me`      | Mostrar el ID de usuario QQ (openid) del remitente para la configuración `allowFrom`/`groupAllowFrom`                |
| `/bot-upgrade` | Mostrar el enlace de la guía de actualización de QQBot                                                               |
| `/bot-logs`    | Exportar registros recientes de la puerta de enlace como un archivo                                                  |
| `/bot-approve` | Aprobar una acción pendiente del QQ Bot (por ejemplo, confirmar una carga C2C o de grupo) a través del flujo nativo. |

Añada `?` a cualquier comando para obtener ayuda de uso (por ejemplo `/bot-upgrade ?`).

Los comandos de administrador (`/bot-me`, `/bot-upgrade`, `/bot-logs`, `/bot-clear-storage`, `/bot-streaming`, `/bot-approve`) son solo para mensajes directos y requieren el openid del remitente en una lista `allowFrom` explícita sin comodines. Un comodín `allowFrom: ["*"]` permite el chat pero no otorga acceso a los comandos de administrador. Los mensajes de grupo se comparan primero con `groupAllowFrom` y, si no hay coincidencia, recurren a `allowFrom`. Ejecutar un comando de administrador en un grupo devuelve una sugerencia en lugar de ser ignorado silenciosamente.

Cuando las aprobaciones de ejecución del QQ Bot utilizan la reserva de mismo chat predeterminada, los clics en los botones de aprobación nativos siguen la misma lista blanca de comandos explícitos sin comodines. Para conceder
solo acceso de aprobación sin acceso más amplio a comandos, configure
`channels.qqbot.execApprovals.approvers`.

## Arquitectura del motor

QQ Bot se envía como un motor independiente dentro del complemento:

- Cada cuenta posee una pila de recursos aislada (conexión WebSocket, cliente API, caché de token, raíz de almacenamiento de medios) clave por `appId`. Las cuentas nunca comparten el estado de entrada/salida.
- El registrador de multicuenta etiqueta las líneas de registro con la cuenta propietaria para que los diagnósticos se mantengan separables cuando ejecuta varios bots bajo una sola puerta de enlace.
- Las rutas de puente entrantes, salientes y de puerta de enlace comparten una única raíz de carga útil de medios bajo `~/.openclaw/media`, por lo que las cargas, descargas y cachés de transcodificación aterrizan en un directorio protegido en lugar de un árbol por subsistema.
- La entrega de medios enriquecidos pasa a través de una ruta `sendMedia` para objetivos C2C y grupales. Los archivos locales y los búferes por encima del umbral de archivos grandes utilizan los puntos finales de carga fragmentada de QQ, mientras que las cargas útiles más pequeñas utilizan la API de medios de un solo disparo.
- Las credenciales se pueden respaldar y restaurar como parte de instantáneas de credenciales estándar de OpenClaw; el motor vuelve a adjuntar la pila de recursos de cada cuenta al restaurar sin requerir un nuevo par de códigos QR.

## Incorporación mediante código QR

Como alternativa a pegar `AppID:AppSecret` manualmente, el motor admite un flujo de incorporación mediante código QR para vincular un QQ Bot a OpenClaw:

1. Ejecute la ruta de configuración del QQ Bot (por ejemplo `openclaw channels add --channel qqbot`) y elija el flujo de código QR cuando se le solicite.
2. Escanee el código QR generado con la aplicación móvil vinculada al QQ Bot de destino.
3. Apruebe el emparejamiento en el teléfono. OpenClaw persiste las credenciales devueltas en `credentials/` bajo el ámbito de cuenta correcto.

Las solicitudes de aprobación generadas por el propio bot (por ejemplo, flujos de "¿permitir esta acción?" expuestos por la API de QQ Bot) se muestran como solicitudes nativas de OpenClaw que puede aceptar con `/bot-approve` en lugar de responder a través del cliente QQ sin procesar.

## Solución de problemas

- **El bot responde "se fue a Marte":** credenciales no configuradas o Gateway no iniciado.
- **Sin mensajes entrantes:** verifique que `appId` y `clientSecret` sean correctos y que
  el bot esté habilitado en la QQ Open Platform.
- **Autorrespuestas repetidas:** OpenClaw registra los índices de referencia de salida de QQ como
  creados por el bot e ignora los eventos entrantes cuyo `msgIdx` actual coincida con esa
  misma cuenta de bot. Esto evita bucles de eco en la plataforma y al mismo tiempo permite a los usuarios
  citar o responder a mensajes anteriores del bot.
- **La configuración con `--token-file` sigue mostrando no configurada:** `--token-file` solo establece
  el AppSecret. Aún necesita `appId` en la configuración o `QQBOT_APP_ID`.
- **Mensajes proactivos no llegan:** QQ puede interceptar los mensajes iniciados por el bot si
  el usuario no ha interactuado recientemente.
- **Voz no transcrita:** asegúrese de que STT esté configurado y que el proveedor sea accesible.

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Grupos](/es/channels/groups)
- [Solución de problemas de canales](/es/channels/troubleshooting)
