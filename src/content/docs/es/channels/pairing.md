---
summary: "Resumen del emparejamiento: aprobar quién te puede enviar MD + qué nodos pueden unirse"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Emparejamiento"
---

# Emparejamiento

El “Emparejamiento” es el paso explícito de **aprobación del propietario** de OpenClaw.
Se utiliza en dos lugares:

1. **Emparejamiento MD** (quién tiene permiso para hablar con el bot)
2. **Emparejamiento de nodos** (qué dispositivos/nodos tienen permiso para unirse a la red de pasarela)

Contexto de seguridad: [Seguridad](/es/gateway/security)

## 1) Emparejamiento MD (acceso de chat entrante)

Cuando un canal está configurado con la política de MD `pairing`, los remitentes desconocidos reciben un código corto y su mensaje **no se procesa** hasta que usted lo apruebe.

Las políticas de DM predeterminadas están documentadas en: [Seguridad](/es/gateway/security)

Códigos de emparejamiento:

- 8 caracteres, mayúsculas, sin caracteres ambiguos (`0O1I`).
- **Caducan después de 1 hora**. El bot solo envía el mensaje de emparejamiento cuando se crea una nueva solicitud (aproximadamente una vez por hora por remitente).
- Las solicitudes de emparejamiento MD pendientes tienen un límite de **3 por canal** de forma predeterminada; las solicitudes adicionales se ignoran hasta que una caduca o se aprueba.

### Aprobar un remitente

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canales compatibles: `bluebubbles`, `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### Dónde reside el estado

Almacenado en `~/.openclaw/credentials/`:

- Solicitudes pendientes: `<channel>-pairing.json`
- Almacén de lista de permitidos aprobados:
  - Cuenta predeterminada: `<channel>-allowFrom.json`
  - Cuenta no predeterminada: `<channel>-<accountId>-allowFrom.json`

Comportamiento del ámbito de la cuenta:

- Las cuentas no predeterminadas solo leen/escriben su archivo de lista de permitidos con ámbito.
- La cuenta predeterminada utiliza el archivo de lista de permitidos sin ámbito con ámbito de canal.

Trátelos como confidenciales (controlan el acceso a su asistente).

Importante: este almacén es para el acceso a DM. La autorización de grupos es independiente.
Aprobar un código de emparejamiento de DM no permite automáticamente que ese remitente ejecute comandos de grupo o controle el bot en los grupos. Para el acceso a grupos, configure las listas de permitidos explícitas del canal (por ejemplo `groupAllowFrom`, `groups`, o anulaciones por grupo/por tema dependiendo del canal).

## 2) Emparejamiento de dispositivos nodos (nodos iOS/Android/macOS/headless)

Los nodos se conectan a la puerta de enlace (Gateway) como **dispositivos** con `role: node`. La puerta de enlace
crea una solicitud de emparejamiento de dispositivo que debe ser aprobada.

### Emparejar a través de Telegram (recomendado para iOS)

Si utiliza el complemento `device-pair`, puede realizar el emparejamiento por primera vez del dispositivo completamente desde Telegram:

1. En Telegram, envíe un mensaje a su bot: `/pair`
2. El bot responde con dos mensajes: un mensaje de instrucción y un mensaje de **código de configuración** separado (fácil de copiar/pegar en Telegram).
3. En su teléfono, abra la aplicación OpenClaw para iOS → Configuración → Puerta de enlace (Gateway).
4. Pegue el código de configuración y conéctese.
5. De vuelta en Telegram: `/pair pending` (revise los IDs de solicitud, el rol y los alcances), luego apruebe.

El código de configuración es una carga útil JSON codificada en base64 que contiene:

- `url`: la URL de WebSocket de la puerta de enlace (`ws://...` o `wss://...`)
- `bootstrapToken`: un token de arranque de dispositivo único de corta duración que se utiliza para el protocolo de enlace de emparejamiento inicial

Ese token de arranque lleva el perfil de arranque de emparejamiento integrado:

- el token `node` entregado (handed-off) principal permanece `scopes: []`
- cualquier token `operator` entregado permanece limitado a la lista de permitidos de arranque:
  `operator.approvals`, `operator.read`, `operator.talk.secrets`, `operator.write`
- las comprobaciones de alcance de arranque están prefijadas por rol, no son un grupo de alcances plano:
  las entradas de alcance de operador solo satisfacen las solicitudes de operador, y los roles que no son operadores
  aún deben solicitar alcances bajo su propio prefijo de rol

Trate el código de configuración como una contraseña mientras sea válido.

### Aprobar un dispositivo nodo

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Si el mismo dispositivo vuelve a intentar con diferentes detalles de autenticación (por ejemplo, diferente rol/alcances/clave pública), la solicitud pendiente anterior es reemplazada y se crea una nueva `requestId`.

### Almacenamiento del estado de emparejamiento de nodos

Almacenado bajo `~/.openclaw/devices/`:

- `pending.json` (de corta duración; las solicitudes pendientes caducan)
- `paired.json` (dispositivos emparejados + tokens)

### Notas

- La API heredada `node.pair.*` (CLI: `openclaw nodes pending|approve|reject|rename`) es un almacén de emparejamiento separado propiedad de la pasarela. Los nodos WS aún requieren emparejamiento de dispositivos.
- El registro de emparejamiento es la fuente duradera de verdad para los roles aprobados. Los tokens de dispositivo activos permanecen vinculados a ese conjunto de roles aprobados; una entrada de token extraviada fuera de los roles aprobados no crea nuevo acceso.

## Documentos relacionados

- Modelo de seguridad + inyección de prompt: [Seguridad](/es/gateway/security)
- Actualización segura (ejecutar doctor): [Actualización](/es/install/updating)
- Configuraciones de canales:
  - Telegram: [Telegram](/es/channels/telegram)
  - WhatsApp: [WhatsApp](/es/channels/whatsapp)
  - Signal: [Signal](/es/channels/signal)
  - BlueBubbles (iMessage): [BlueBubbles](/es/channels/bluebubbles)
  - iMessage (heredado): [iMessage](/es/channels/imessage)
  - Discord: [Discord](/es/channels/discord)
  - Slack: [Slack](/es/channels/slack)
