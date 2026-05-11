---
summary: "Resumen del emparejamiento: aprobar quién puede enviarte MD + qué nodos pueden unirse"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Emparejamiento"
---

El "Emparejamiento" es el paso de **aprobación explícita del propietario** de OpenClaw.
Se utiliza en dos lugares:

1. **Emparejamiento por MD** (quién tiene permiso para hablar con el bot)
2. **Emparejamiento de nodos** (qué dispositivos/nodos tienen permiso para unirse a la red de puerta de enlace)

Contexto de seguridad: [Seguridad](/es/gateway/security)

## 1) Emparejamiento por MD (acceso de chat entrante)

Cuando un canal está configurado con la política de MD `pairing`, los remitentes desconocidos reciben un código corto y su mensaje **no se procesa** hasta que usted lo apruebe.

Las políticas de MD predeterminadas están documentadas en: [Seguridad](/es/gateway/security)

Códigos de emparejamiento:

- 8 caracteres, en mayúsculas, sin caracteres ambiguos (`0O1I`).
- **Expiran después de 1 hora**. El bot solo envía el mensaje de emparejamiento cuando se crea una nueva solicitud (aproximadamente una vez por hora por remitente).
- Las solicitudes de emparejamiento por MD pendientes tienen un límite de **3 por canal** de forma predeterminada; las solicitudes adicionales se ignoran hasta que una expire o sea aprobada.

### Aprobar un remitente

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canales compatibles: `bluebubbles`, `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### Dónde reside el estado

Almacenado bajo `~/.openclaw/credentials/`:

- Solicitudes pendientes: `<channel>-pairing.json`
- Almacén de lista blanca aprobada:
  - Cuenta predeterminada: `<channel>-allowFrom.json`
  - Cuenta no predeterminada: `<channel>-<accountId>-allowFrom.json`

Comportamiento del alcance de la cuenta:

- Las cuentas no predeterminadas solo leen/escriben su archivo de lista blanca con alcance.
- La cuenta predeterminada utiliza el archivo de lista de permitidos sin ámbito específico del canal (channel-scoped unscoped allowlist).

Trátalos como información sensible (controlan el acceso a tu asistente).

<Note>
  Este almacén es para el acceso por MD (Mensaje Directo). La autorización de grupos es independiente. Aprobar un código de emparejamiento por MD no permite automáticamente que ese remitente ejecute comandos de grupo o controle el bot en los grupos. Para el acceso a grupos, configura las listas de permitidos explícitas de grupos del canal (por ejemplo `groupAllowFrom`, `groups`, o anulaciones por
  grupo o por tema dependiendo del canal).
</Note>

## 2) Emparejamiento de dispositivos de nodo (nodos iOS/Android/macOS/headless)

Los nodos se conectan a la Gateway como **dispositivos** con `role: node`. La Gateway crea una solicitud de emparejamiento de dispositivo que debe ser aprobada.

### Emparejar vía Telegram (recomendado para iOS)

Si usas el complemento `device-pair`, puedes realizar el emparejamiento inicial del dispositivo completamente desde Telegram:

1. En Telegram, envía un mensaje a tu bot: `/pair`
2. El bot responde con dos mensajes: un mensaje de instrucciones y un mensaje separado de **código de configuración** (fácil de copiar/pegar en Telegram).
3. En tu teléfono, abre la aplicación OpenClaw para iOS → Configuración → Gateway.
4. Pega el código de configuración y conéctate.
5. De vuelta en Telegram: `/pair pending` (revisa los IDs de solicitud, el rol y los alcances), luego aprueba.

El código de configuración es una carga útil JSON codificada en base64 que contiene:

- `url`: la URL del WebSocket de la Gateway (`ws://...` o `wss://...`)
- `bootstrapToken`: un token de arranque (bootstrap) de un solo dispositivo de corta duración utilizado para el handshake inicial de emparejamiento

Ese token de arranque lleva el perfil de arranque de emparejamiento integrado:

- el token `node` principal transferido permanece `scopes: []`
- cualquier token `operator` transferido permanece limitado a la lista de permitidos de arranque:
  `operator.approvals`, `operator.read`, `operator.talk.secrets`, `operator.write`
- las comprobaciones de alcance de arranque tienen prefijo de rol, no son un grupo de alcances plano:
  las entradas de alcance de operador solo satisfacen solicitudes de operador, y los roles que no son operadores
  deben seguir solicitando alcances bajo su propio prefijo de rol
- la rotación/revocación posterior de tokens permanece limitada tanto por el contrato de rol aprobado del dispositivo
  como por los alcances de operador de la sesión de la persona que llama

Trate el código de configuración como una contraseña mientras sea válido.

### Aprobar un dispositivo nodo

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Si el mismo dispositivo vuelve a intentar con diferentes detalles de autenticación (por ejemplo, diferente
rol/alcances/clave pública), la solicitud pendiente anterior es reemplazada y se crea un nuevo
`requestId`.

<Note>Un dispositivo ya vinculado no obtiene acceso más amplio silenciosamente. Si se vuelve a conectar solicitando más ámbitos o un rol más amplio, OpenClaw mantiene la aprobación existente tal como está y crea una nueva solicitud de actualización pendiente. Use `openclaw devices list` para comparar el acceso aprobado actualmente con el acceso recién solicitado antes de aprobar.</Note>

### Aprobación automática opcional de nodo de CIDR confiable

El vinculo de dispositivos permanece manual por defecto. Para redes de nodos estrictamente controladas,
puede optar por la aprobación automática de nodo por primera vez con CIDRs explícitos o IPs exactas:

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Esto solo se aplica a solicitudes de vinculo `role: node` nuevas sin
ámbitos solicitados. Los clientes de Operador, navegador, Control UI y WebChat aún requieren aprobación
manual. Los cambios de rol, ámbito, metadatos y clave pública aún requieren aprobación
manual.

### Almacenamiento del estado de vinculo de nodos

Almacenado bajo `~/.openclaw/devices/`:

- `pending.json` (de corta duración; las solicitudes pendientes expiran)
- `paired.json` (dispositivos vinculados + tokens)

### Notas

- La API heredada `node.pair.*` (CLI: `openclaw nodes pending|approve|reject|remove|rename`) es un
  almacén de vinculo separado propiedad de la puerta de enlace. Los nodos WS aún requieren el vinculo de dispositivos.
- El registro de vinculo es la fuente duradera de verdad para los roles aprobados. Los
  tokens de dispositivo activos permanecen limitados a ese conjunto de roles aprobados; una entrada de token extraviada
  fuera de los roles aprobados no crea nuevo acceso.

## Documentos relacionados

- Modelo de seguridad + inyección de avisos: [Seguridad](/es/gateway/security)
- Actualización segura (ejecutar doctor): [Actualización](/es/install/updating)
- Configuraciones de canales:
  - Telegram: [Telegram](/es/channels/telegram)
  - WhatsApp: [WhatsApp](/es/channels/whatsapp)
  - Signal: [Signal](/es/channels/signal)
  - BlueBubbles (iMessage): [BlueBubbles](/es/channels/bluebubbles)
  - iMessage (heredado): [iMessage](/es/channels/imessage)
  - Discord: [Discord](/es/channels/discord)
  - Slack: [Slack](/es/channels/slack)
