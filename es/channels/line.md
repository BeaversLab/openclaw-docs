---
summary: "Configuración, configuración y uso del complemento de LINE Messaging API"
read_when:
  - Deseas conectar OpenClaw con LINE
  - Necesitas la configuración del webhook y las credenciales de LINE
  - Deseas opciones de mensajes específicas de LINE
title: LINE
---

# LINE (complemento)

LINE se conecta a OpenClaw a través de la LINE Messaging API. El complemento se ejecuta como un receptor
de webhook en la puerta de enlace y utiliza tu token de acceso al canal y el secreto del canal para
la autenticación.

Estado: compatible a través del complemento. Se admiten mensajes directos, chats grupales, medios, ubicaciones, mensajes
Flex, mensajes de plantilla y respuestas rápidas. Las reacciones y los hilos
no son compatibles.

## Complemento requerido

Instala el complemento de LINE:

```bash
openclaw plugins install @openclaw/line
```

Despliegue local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./extensions/line
```

## Configuración

1. Crea una cuenta de desarrolladores de LINE y abre la Consola:
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. Crea (o selecciona) un Proveedor y añade un canal **Messaging API**.
3. Copia el **Channel access token** (token de acceso al canal) y el **Channel secret** (secreto del canal) desde la configuración del canal.
4. Habilita **Use webhook** (Usar webhook) en la configuración de Messaging API.
5. Establece la URL del webhook en tu punto final de puerta de enlace (se requiere HTTPS):

```
https://gateway-host/line/webhook
```

La puerta de enlace responde a la verificación de webhook de LINE (GET) y a los eventos entrantes (POST).
Si necesitas una ruta personalizada, establece `channels.line.webhookPath` o
`channels.line.accounts.<id>.webhookPath` y actualiza la URL en consecuencia.

Nota de seguridad:

- La verificación de la firma de LINE depende del cuerpo (HMAC sobre el cuerpo sin procesar), por lo que OpenClaw aplica límites estrictos de cuerpo previos a la autenticación y un tiempo de espera antes de la verificación.

## Configurar

Configuración mínima:

```json5
{
  channels: {
    line: {
      enabled: true,
      channelAccessToken: "LINE_CHANNEL_ACCESS_TOKEN",
      channelSecret: "LINE_CHANNEL_SECRET",
      dmPolicy: "pairing",
    },
  },
}
```

Variables de entorno (solo cuenta predeterminada):

- `LINE_CHANNEL_ACCESS_TOKEN`
- `LINE_CHANNEL_SECRET`

Archivos de token/secret:

```json5
{
  channels: {
    line: {
      tokenFile: "/path/to/line-token.txt",
      secretFile: "/path/to/line-secret.txt",
    },
  },
}
```

`tokenFile` y `secretFile` deben apuntar a archivos regulares. Se rechazan los enlaces simbólicos.

Múltiples cuentas:

```json5
{
  channels: {
    line: {
      accounts: {
        marketing: {
          channelAccessToken: "...",
          channelSecret: "...",
          webhookPath: "/line/marketing",
        },
      },
    },
  },
}
```

## Control de acceso

Los mensajes directos se configuran por defecto para emparejamiento. Los remitentes desconocidos reciben un código de emparejamiento y sus
mensajes se ignoran hasta que sean aprobados.

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

Listas de permitidos y políticas:

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: IDs de usuario de LINE permitidos para mensajes directos
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: IDs de usuario de LINE permitidos para grupos
- Anulaciones por grupo: `channels.line.groups.<groupId>.allowFrom`
- Nota de ejecución: si `channels.line` falta completamente, la ejecución vuelve a `groupPolicy="allowlist"` para las comprobaciones de grupo (incluso si `channels.defaults.groupPolicy` está configurado).

Los IDs de LINE distinguen entre mayúsculas y minúsculas. Los IDs válidos tienen el siguiente aspecto:

- Usuario: `U` + 32 caracteres hexadecimales
- Grupo: `C` + 32 caracteres hexadecimales
- Sala: `R` + 32 caracteres hexadecimales

## Comportamiento del mensaje

- El texto se divide en fragmentos de 5000 caracteres.
- El formato Markdown se elimina; los bloques de código y las tablas se convierten en tarjetas Flex cuando es posible.
- Las respuestas en streaming se almacenan en el búfer; LINE recibe fragmentos completos con una animación de carga mientras el agente trabaja.
- Las descargas de medios están limitadas por `channels.line.mediaMaxMb` (predeterminado 10).

## Datos del canal (mensajes enriquecidos)

Use `channelData.line` para enviar respuestas rápidas, ubicaciones, tarjetas Flex o mensajes de plantilla.

```json5
{
  text: "Here you go",
  channelData: {
    line: {
      quickReplies: ["Status", "Help"],
      location: {
        title: "Office",
        address: "123 Main St",
        latitude: 35.681236,
        longitude: 139.767125,
      },
      flexMessage: {
        altText: "Status card",
        contents: {
          /* Flex payload */
        },
      },
      templateMessage: {
        type: "confirm",
        text: "Proceed?",
        confirmLabel: "Yes",
        confirmData: "yes",
        cancelLabel: "No",
        cancelData: "no",
      },
    },
  },
}
```

El complemento LINE también incluye un comando `/card` para preajustes de mensajes Flex:

```
/card info "Welcome" "Thanks for joining!"
```

## Solución de problemas

- **Error en la verificación del webhook:** asegúrese de que la URL del webhook sea HTTPS y que el `channelSecret` coincida con la consola de LINE.
- **Sin eventos entrantes:** confirme que la ruta del webhook coincida con `channels.line.webhookPath` y que la pasarela sea accesible desde LINE.
- **Errores de descarga de medios:** aumente `channels.line.mediaMaxMb` si los medios exceden el límite predeterminado.

import es from "/components/footer/es.mdx";

<es />
