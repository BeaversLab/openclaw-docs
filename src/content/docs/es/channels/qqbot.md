---
summary: "Configuración, uso y configuración del QQ Bot"
read_when:
  - You want to connect OpenClaw to QQ
  - You need QQ Bot credential setup
  - You want QQ Bot group or private chat support
title: Bot de QQ
---

El Bot de QQ se conecta a OpenClaw a través de la API oficial del Bot de QQ (puerto WebSocket). El
complemento admite chat privado C2C, mensajes @ de grupo y mensajes de canal de gremio con
medios enriquecidos (imágenes, voz, video, archivos).

Estado: complemento incluido. Los mensajes directos, chats de grupo, canales de gremio y
medios son compatibles. Las reacciones y los hilos no son compatibles.

## Complemento incluido

Las versiones actuales de OpenClaw incluyen el Bot de QQ, por lo que las compilaciones empaquetadas normales no necesitan
un paso de `openclaw plugins install` por separado.

## Configuración

1. Vaya a la [Plataforma Abierta QQ](https://q.qq.com/) y escanee el código QR con su
   QQ móvil para registrarse / iniciar sesión.
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

Notas:

- La alternativa de env (fallback) se aplica solo a la cuenta predeterminada del Bot de QQ.
- `openclaw channels add --channel qqbot --token-file ...` proporciona
  solo el AppSecret; el AppID ya debe estar establecido en la configuración o en `QQBOT_APP_ID`.
- `clientSecret` también acepta entrada SecretRef, no solo una cadena de texto sin formato.

### Configuración multicuenta

Ejecute múltiples bots de QQ bajo una sola instancia de OpenClaw:

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

Añada un segundo bot a través de la CLI:

```bash
openclaw channels add --channel qqbot --account bot2 --token "222222222:secret-of-bot-2"
```

### Voz (STT / TTS)

STT y TTS admiten configuración de dos niveles con alternativa de prioridad:

| Configuración | Específico del complemento                               | Alternativa del marco         |
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
        qq-main: {
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

Establezca `enabled: false` en cualquiera de los dos para desactivar.
Las anulaciones de TTS a nivel de cuenta usan la misma forma que `messages.tts` y realizan una fusión profunda
sobre la configuración TTS del canal/global.

Los archivos de voz entrantes de QQ se exponen a los agentes como metadatos de medios de audio, manteniendo los archivos de voz sin procesar fuera de `MediaPaths` genérico. Las respuestas de texto plano `[[audio_as_voice]]` sintetizan TTS y envían un mensaje de voz nativo de QQ cuando TTS está configurado.

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

> Cada bot tiene su propio conjunto de OpenIDs de usuario. Un OpenID recibido por el Bot A **no**
> puede usarse para enviar mensajes a través del Bot B.

## Comandos de barra

Comandos integrados interceptados antes de la cola de IA:

| Comando        | Descripción                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------------------- |
| `/bot-ping`    | Prueba de latencia                                                                                                   |
| `/bot-version` | Mostrar la versión del framework OpenClaw                                                                            |
| `/bot-help`    | Listar todos los comandos                                                                                            |
| `/bot-upgrade` | Mostrar el enlace de la guía de actualización de QQBot                                                               |
| `/bot-logs`    | Exportar registros recientes de la puerta de enlace como un archivo                                                  |
| `/bot-approve` | Aprueba una acción pendiente del Bot QQ (por ejemplo, confirmar una carga C2C o de grupo) a través del flujo nativo. |

Añada `?` a cualquier comando para obtener ayuda de uso (por ejemplo `/bot-upgrade ?`).

## Arquitectura del motor

QQ Bot se incluye como un motor autónomo dentro del complemento:

- Cada cuenta posee una pila de recursos aislada (conexión WebSocket, cliente API, caché de tokens, raíz de almacenamiento de medios) claveada por `appId`. Las cuentas nunca comparten el estado de entrada/salida.
- El registrador multicuenta etiqueta las líneas de registro con la cuenta propietaria, de modo que los diagnósticos se mantengan separables cuando ejecutes varios bots bajo una sola pasarela.
- Las rutas de puente de entrada, salida y puerta de enlace comparten una sola raíz de carga útil de medios bajo `~/.openclaw/media`, por lo que las cargas, descargas y cachés de transcodificación aterrizan en un directorio protegido en lugar de un árbol por subsistema.
- Las credenciales se pueden respaldar y restaurar como parte de las instantáneas de credenciales estándar de OpenClaw; el motor vuelve a adjuntar la pila de recursos de cada cuenta al restaurar sin requerir un nuevo par de códigos QR.

## Incorporación mediante código QR

Como alternativa a pegar `AppID:AppSecret` manualmente, el motor soporta un flujo de incorporación mediante código QR para vincular un QQ Bot a OpenClaw:

1. Ejecute la ruta de configuración del QQ Bot (por ejemplo `openclaw channels add --channel qqbot`) y elija el flujo de código QR cuando se le solicite.
2. Escanea el código QR generado con la aplicación móvil vinculada al Bot QQ de destino.
3. Aprobe el emparejamiento en el teléfono. OpenClaw persiste las credenciales devueltas en `credentials/` bajo el ámbito de cuenta correcto.

Las solicitudes de aprobación generadas por el propio bot (por ejemplo, flujos de "¿permitir esta acción?" expuestos por la API del QQ Bot) se muestran como solicitudes nativas de OpenClaw que puede aceptar con `/bot-approve` en lugar de responder a través del cliente QQ sin procesar.

## Solución de problemas

- **El bot responde "se ha ido a Marte":** credenciales no configuradas o Pasarela no iniciada.
- **Sin mensajes entrantes:** verifique que `appId` y `clientSecret` son correctos, y que el bot está habilitado en la Plataforma Abierta de QQ.
- **Autorrespuestas repetidas:** OpenClaw registra los índices de referencia de salida de QQ como
  creados por el bot e ignora los eventos entrantes cuyo `msgIdx` actual coincida con esa
  misma cuenta de bot. Esto evita bucles de eco en la plataforma permitiendo al mismo tiempo que los usuarios
  citen o respondan a mensajes anteriores del bot.
- **La configuración con `--token-file` sigue apareciendo como no configurada:** `--token-file` solo establece
  el AppSecret. Aún necesitas `appId` en la configuración o `QQBOT_APP_ID`.
- **Mensajes proactivos no llegan:** QQ puede interceptar los mensajes iniciados por el bot si
  el usuario no ha interactuado recientemente.
- **Voz no transcrita:** asegúrate de que STT esté configurado y que el proveedor sea accesible.

## Relacionado

- [Emparejamiento](/es/channels/pairing)
- [Grupos](/es/channels/groups)
- [Solución de problemas de canales](/es/channels/troubleshooting)
