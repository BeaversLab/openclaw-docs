---
summary: "Configuración del webhook de Synology Chat y configuración de OpenClaw"
read_when:
  - Setting up Synology Chat with OpenClaw
  - Debugging Synology Chat webhook routing
title: "Synology Chat"
---

# Synology Chat

Estado: canal de mensaje directo del complemento incluido que utiliza webhooks de Synology Chat.
El complemento acepta mensajes entrantes de los webhooks salientes de Synology Chat y envía respuestas
a través de un webhook entrante de Synology Chat.

## Complemento incluido

Synology Chat se distribuye como un complemento incluido en las versiones actuales de OpenClaw, por lo que las versiones empaquetadas normales no necesitan una instalación por separado.

Si está en una versión antigua o una instalación personalizada que excluye Synology Chat,
instálelo manualmente:

Instalar desde una copia local:

```bash
openclaw plugins install ./path/to/local/synology-chat-plugin
```

Detalles: [Plugins](/es/tools/plugin)

## Configuración rápida

1. Asegúrese de que el complemento Synology Chat esté disponible.
   - Las versiones empaquetadas actuales de OpenClaw ya lo incluyen.
   - Las instalaciones antiguas/personalizadas pueden agregarlo manualmente desde una copia del código fuente con el comando anterior.
   - `openclaw onboard` ahora muestra Synology Chat en la misma lista de configuración de canales que `openclaw channels add`.
   - Configuración no interactiva: `openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
2. En las integraciones de Synology Chat:
   - Cree un webhook entrante y copie su URL.
   - Cree un webhook saliente con su token secreto.
3. Apunte la URL del webhook saliente a su puerta de enlace OpenClaw:
   - `https://gateway-host/webhook/synology` de forma predeterminada.
   - O su `channels.synology-chat.webhookPath` personalizado.
4. Finalice la configuración en OpenClaw.
   - Guiado: `openclaw onboard`
   - Directo: `openclaw channels add --channel synology-chat --token <token> --url <incoming-webhook-url>`
5. Reinicie la puerta de enlace y envíe un mensaje directo al bot de Synology Chat.

Detalles de autenticación del webhook:

- OpenClaw acepta el token del webhook saliente de `body.token`, luego
  `?token=...`, luego los encabezados.
- Formas de encabezado aceptadas:
  - `x-synology-token`
  - `x-webhook-token`
  - `x-openclaw-token`
  - `Authorization: Bearer <token>`
- Los tokens vacíos o faltantes fallan de forma segura.

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

Para la cuenta predeterminada, puede usar variables de entorno:

- `SYNOLOGY_CHAT_TOKEN`
- `SYNOLOGY_CHAT_INCOMING_URL`
- `SYNOLOGY_NAS_HOST`
- `SYNOLOGY_ALLOWED_USER_IDS` (separados por comas)
- `SYNOLOGY_RATE_LIMIT`
- `OPENCLAW_BOT_NAME`

Los valores de configuración anulan las variables de entorno.

## Política de MD y control de acceso

- `dmPolicy: "allowlist"` es el valor predeterminado recomendado.
- `allowedUserIds` acepta una lista (o una cadena separada por comas) de IDs de usuario de Synology.
- En modo `allowlist`, una lista vacía de `allowedUserIds` se trata como una configuración errónea y la ruta del webhook no se iniciará (use `dmPolicy: "open"` para permitir todo).
- `dmPolicy: "open"` permite cualquier remitente.
- `dmPolicy: "disabled"` bloquea los MDs.
- El enlace del destinatario de respuesta se mantiene en el `user_id` numérico estable de manera predeterminada. `channels.synology-chat.dangerouslyAllowNameMatching: true` es un modo de compatibilidad de emergencia que vuelve a habilitar la búsqueda mutable de nombre de usuario/apodo para la entrega de respuestas.
- Las aprobaciones de emparejamiento funcionan con:
  - `openclaw pairing list synology-chat`
  - `openclaw pairing approve synology-chat <CODE>`

## Entrega saliente

Use los IDs de usuario numéricos de Synology Chat como destinos.

Ejemplos:

```bash
openclaw message send --channel synology-chat --target 123456 --text "Hello from OpenClaw"
openclaw message send --channel synology-chat --target synology-chat:123456 --text "Hello again"
```

Los envíos de medios son compatibles mediante la entrega de archivos por URL.
Las URL de archivos salientes deben usar `http` o `https`, y los objetivos de red privados o bloqueados de otro modo se rechazan antes de que OpenClaw reenvíe la URL al webhook del NAS.

## Multicuenta

Se admiten múltiples cuentas de Synology Chat bajo `channels.synology-chat.accounts`.
Cada cuenta puede anular el token, la URL entrante, la ruta del webhook, la política de MD y los límites.
Las sesiones de mensaje directo están aisladas por cuenta y usuario, por lo que el mismo `user_id` numérico
en dos cuentas de Synology diferentes no comparte el estado de la transcripción.
Asigne a cada cuenta habilitada un `webhookPath` distinto. OpenClaw ahora rechaza las rutas exactas duplicadas
y se niega a iniciar cuentas con nombre que solo heredan una ruta de webhook compartida en configuraciones multicuenta.
Si necesita intencionalmente la herencia heredada para una cuenta con nombre, establezca
`dangerouslyAllowInheritedWebhookPath: true` en esa cuenta o en `channels.synology-chat`,
pero las rutas exactas duplicadas aún se rechazan de forma segura (fail-closed). Se prefieren rutas explícitas por cuenta.

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
- Las solicitudes entrantes de webhook se verifican por token y tienen límite de velocidad por remitente.
- Las verificaciones de tokens no válidas utilizan una comparación de secreto de tiempo constante y fallan cerradas.
- Prefiera `dmPolicy: "allowlist"` para producción.
- Mantenga `dangerouslyAllowNameMatching` desactivado a menos que necesite explícitamente la entrega de respuestas basada en el nombre de usuario heredado.
- Mantenga `dangerouslyAllowInheritedWebhookPath` desactivado a menos que acepte explícitamente el riesgo de enrutamiento de ruta compartida en una configuración multicuenta.

## Solución de problemas

- `Missing required fields (token, user_id, text)`:
  - el payload del webhook saliente falta uno de los campos requeridos
  - si Synology envía el token en los encabezados, asegúrese de que la puerta de enlace/proxy preserve esos encabezados
- `Invalid token`:
  - el secreto del webhook saliente no coincide con `channels.synology-chat.token`
  - la solicitud está llegando a la cuenta/ruta de webhook incorrecta
  - un proxy inverso eliminó el encabezado del token antes de que la solicitud llegara a OpenClaw
- `Rate limit exceeded`:
  - demasiados intentos de token no válidos desde la misma fuente pueden bloquear temporalmente esa fuente
  - los remitentes autenticados también tienen un límite de tasa de mensajes separado por usuario
- `Allowlist is empty. Configure allowedUserIds or use dmPolicy=open.`:
  - `dmPolicy="allowlist"` está habilitado pero no hay usuarios configurados
- `User not authorized`:
  - el `user_id` numérico del remitente no está en `allowedUserIds`

## Relacionado

- [Resumen de canales](/es/channels) — todos los canales compatibles
- [Emparejamiento](/es/channels/pairing) — autenticación y flujo de emparejamiento de MD
- [Grupos](/es/channels/groups) — comportamiento del chat grupal y filtrado de menciones
- [Enrutamiento de canales](/es/channels/channel-routing) — enrutamiento de sesión para mensajes
- [Seguridad](/es/gateway/security) — modelo de acceso y endurecimiento
