---
summary: "Configuración, configuración y uso del complemento de la API de mensajería de LINE"
read_when:
  - You want to connect OpenClaw to LINE
  - You need LINE webhook + credential setup
  - You want LINE-specific message options
title: LINE
---

# LINE

LINE se conecta a OpenClaw a través de la API de mensajería de LINE. El complemento se ejecuta como un receptor de webhook en la puerta de enlace y utiliza su token de acceso al canal + secreto del canal para la autenticación.

Estado: complemento incluido. Se admiten mensajes directos, chats de grupo, medios, ubicaciones, mensajes Flex, mensajes de plantilla y respuestas rápidas. Las reacciones y los hilos no son compatibles.

## Complemento incluido

LINE se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que las compilaciones empaquetadas normales no necesitan una instalación por separado.

Si está en una compilación anterior o en una instalación personalizada que excluye LINE, instálelo manualmente:

```bash
openclaw plugins install @openclaw/line
```

Desprotegido local (cuando se ejecuta desde un repositorio git):

```bash
openclaw plugins install ./path/to/local/line-plugin
```

## Configuración

1. Cree una cuenta de desarrolladores de LINE y abra la Consola:
   [https://developers.line.biz/console/](https://developers.line.biz/console/)
2. Cree (o seleccione) un proveedor y añada un canal de **Messaging API**.
3. Copie el **Channel access token** (token de acceso al canal) y el **Channel secret** (secreto del canal) desde la configuración del canal.
4. Habilite **Use webhook** en la configuración de Messaging API.
5. Establezca la URL del webhook en su punto de conexión de gateway (se requiere HTTPS):

```
https://gateway-host/line/webhook
```

El gateway responde a la verificación del webhook de LINE (GET) y a los eventos entrantes (POST).
Si necesita una ruta personalizada, configure `channels.line.webhookPath` o
`channels.line.accounts.<id>.webhookPath` y actualice la URL en consecuencia.

Nota de seguridad:

- La verificación de la firma de LINE depende del cuerpo (HMAC sobre el cuerpo sin procesar), por lo que OpenClaw aplica límites estrictos de cuerpo y tiempo de espera previos a la autenticación antes de la verificación.
- OpenClaw procesa los eventos del webhook a partir de los bytes de la solicitud verificados sin procesar. Los valores `req.body` transformados por el middleware ascendente se ignoran por seguridad de integridad de la firma.

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

Archivos de token/secreto:

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

Los mensajes directos de forma predeterminada requieren emparejamiento. Los remitentes desconocidos reciben un código de emparejamiento y sus mensajes se ignoran hasta que se aprueban.

```bash
openclaw pairing list line
openclaw pairing approve line <CODE>
```

Listas de permitidos y políticas:

- `channels.line.dmPolicy`: `pairing | allowlist | open | disabled`
- `channels.line.allowFrom`: ID de usuario de LINE permitidos para MD
- `channels.line.groupPolicy`: `allowlist | open | disabled`
- `channels.line.groupAllowFrom`: ID de usuario de LINE permitidos para grupos
- Anulaciones por grupo: `channels.line.groups.<groupId>.allowFrom`
- Nota de ejecución: si `channels.line` falta por completo, la ejecución recurre a `groupPolicy="allowlist"` para las comprobaciones de grupo (incluso si `channels.defaults.groupPolicy` está configurado).

Los ID de LINE distinguen mayúsculas y minúsculas. Los ID válidos tienen el siguiente aspecto:

- Usuario: `U` + 32 caracteres hexadecimales
- Grupo: `C` + 32 caracteres hexadecimales
- Sala: `R` + 32 caracteres hexadecimales

## Comportamiento del mensaje

- El texto se divide en fragmentos de 5000 caracteres.
- El formato Markdown se elimina; los bloques de código y las tablas se convierten en tarjetas Flex cuando es posible.
- Las respuestas en streaming se almacenan en búfer; LINE recibe fragmentos completos con una animación de carga mientras el agente trabaja.
- Las descargas de medios están limitadas por `channels.line.mediaMaxMb` (por defecto 10).

## Datos del canal (mensajes enriquecidos)

Use `channelData.line` para enviar respuestas rápidas, ubicaciones, tarjetas Flex o mensajes con plantilla.

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

## Soporte de ACP

LINE admite enlaces de conversación ACP (Agent Communication Protocol):

- `/acp spawn <agent> --bind here` vincula el chat actual de LINE a una sesión ACP sin crear un hilo secundario.
- Los enlaces ACP configurados y las sesiones ACP activas vinculadas a conversaciones funcionan en LINE como en otros canales de conversación.

Consulte [Agentes ACP](/es/tools/acp-agents) para obtener más detalles.

## Medios salientes

El complemento LINE admite el envío de imágenes, videos y archivos de audio a través de la herramienta de mensajes del agente. Los medios se envían a través de la ruta de entrega específica de LINE con el manejo adecuado de vista previa y seguimiento:

- **Imágenes**: se envían como mensajes de imagen de LINE con generación automática de vista previa.
- **Videos**: se envían con manejo explícito de vista previa y tipo de contenido.
- **Audio**: se envían como mensajes de audio de LINE.

Las URLs de medios salientes deben ser URLs HTTPS públicas. OpenClaw valida el nombre de host de destino antes de pasar la URL a LINE y rechaza los objetivos de loopback, link-local y red privada.

Los envíos de medios genéricos vuelven a la ruta existente de solo imágenes cuando no hay disponible una ruta específica de LINE.

## Solución de problemas

- **La verificación del webhook falla:** asegúrese de que la URL del webhook sea HTTPS y de que `channelSecret` coincida con la consola de LINE.
- **Sin eventos entrantes:** confirme que la ruta del webhook coincida con `channels.line.webhookPath`
  y que la pasarela sea accesible desde LINE.
- **Errores de descarga de medios:** se genera `channels.line.mediaMaxMb` si el medio excede el
  límite predeterminado.

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales admitidos
- [Emparejamiento](/es/channels/pairing) — autenticación DM y flujo de emparejamiento
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesiones para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
