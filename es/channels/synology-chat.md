---
summary: "Configuración del webhook de Synology Chat y configuración de OpenClaw"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat (plugin)

Estado: soportado a través de un plugin como un canal de mensaje directo utilizando los webhooks de Synology Chat.
El plugin acepta mensajes entrantes de los webhooks salientes de Synology Chat y envía respuestas
a través de un webhook entrante de Synology Chat.

## Plugin requerido

Synology Chat está basado en un plugin y no forma parte de la instalación del canal principal predeterminado.

Instalar desde una copia local:

```bash
openclaw plugins install ./extensions/synology-chat
```

Detalles: [Plugins](/es/tools/plugin)

## Configuración rápida

1. Instale y habilite el plugin de Synology Chat.
   - `openclaw onboard` ahora muestra Synology Chat en la misma lista de configuración de canales que `openclaw channels add`.
   - Configuración no interactiva: `openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. En las integraciones de Synology Chat:
   - Cree un webhook entrante y copie su URL.
   - Cree un webhook saliente con su token secreto.
3. Apunte la URL del webhook saliente a su puerta de enlace OpenClaw:
   - `https://gateway-host/webhook/synology` por defecto.
   - O su `channels.synology-chat.webhookPath` personalizado.
4. Finalice la configuración en OpenClaw.
   - Guiado: `openclaw onboard`
   - Directo: `openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. Reinicie la puerta de enlace y envíe un MD al bot de Synology Chat.

Configuración mínima:

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      token: "synology-outgoing-token",
      incomingUrl: "https://nas.example.com/webapi/entry.cgi?api=SYNO.Chat.External&method=incoming&version=2&token=...",
      webhookPath: "/webhook/synology",
      dmPolicy: "allowlist",
      allowedUserIds: ["123456"],
      rateLimitPerMinute: 30,
      allowInsecureSsl: false,
    },
  },
}
```

## Variables de entorno

Para la cuenta predeterminada, puede usar las variables de entorno:

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS` (separados por comas)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

Los valores de configuración sobrescriben las variables de entorno.

## Política de MD y control de acceso

- `dmPolicy: "allowlist"` es el valor predeterminado recomendado.
- `allowedUserIds` acepta una lista (o cadena separada por comas) de IDs de usuario de Synology.
- En el modo `allowlist`, una lista vacía de `allowedUserIds` se trata como una configuración incorrecta y la ruta del webhook no se iniciará (use `dmPolicy: "open"` para permitir todo).
- `dmPolicy: "open"` permite cualquier remitente.
- `dmPolicy: "disabled"` bloquea los MD.
- El enlace del destinatario de respuesta se mantiene en un `user_id` numérico estable de forma predeterminada. `channels.synology-chat.dangerouslyAllowNameMatching: true` es un modo de compatibilidad de emergencia que reactiva la búsqueda de nombre de usuario/apodo mutable para la entrega de respuestas.
- Las aprobaciones de emparejamiento funcionan con:
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## Entrega saliente

Utilice los IDs de usuario numéricos de Synology Chat como destinos.

Ejemplos:

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

Los envíos de medios son compatibles mediante la entrega de archivos basada en URL.

## Multicuenta

Se admiten varias cuentas de Synology Chat bajo `channels.synology-chat.accounts`.
Cada cuenta puede anular el token, la URL entrante, la ruta del webhook, la política de DM y los límites.
Las sesiones de mensajes directos están aisladas por cuenta y usuario, por lo que el mismo `user_id` numérico
en dos cuentas de Synology diferentes no comparte el estado de la transcripción.
Asigne a cada cuenta habilitada un `webhookPath` distinto. OpenClaw ahora rechaza las rutas exactas duplicadas
y se niega a iniciar cuentas con nombre que solo heredan una ruta de webhook compartida en configuraciones multicuenta.
Si necesita intencionalmente la herencia heredada para una cuenta con nombre, establezca
`dangerouslyAllowInheritedWebhookPath: true` en esa cuenta o en `channels.synology-chat`,
pero las rutas exactas duplicadas aún se rechazan con fallo cerrado. Prefiera rutas explícitas por cuenta.

```json5
{
  channels: {
    "synology-chat": {
      enabled: true,
      accounts: {
        default: {
          token: "token-a",
          incomingUrl: "https://nas-a.example.com/...token=...",
        },
        alerts: {
          token: "token-b",
          incomingUrl: "https://nas-b.example.com/...token=...",
          webhookPath: "/webhook/synology-alerts",
          dmPolicy: "allowlist",
          allowedUserIds: ["987654"],
        },
      },
    },
  },
}
```

## Notas de seguridad

- Mantenga `token` en secreto y rótelo si se filtra.
- Mantenga `allowInsecureSsl: false` a menos que confíe explícitamente en un certificado NAS local autofirmado.
- Las solicitudes entrantes de webhook se verifican por token y tienen límites de tasa por remitente.
- Prefiera `dmPolicy: "allowlist"` para producción.
- Mantenga `dangerouslyAllowNameMatching` desactivado a menos que necesite explícitamente la entrega de respuestas heredada basada en nombre de usuario.
- Mantenga `dangerouslyAllowInheritedWebhookPath` desactivado a menos que acepte explícitamente el riesgo de enrutamiento de ruta compartida en una configuración multicuenta.

import es from "/components/footer/es.mdx";

<es />
