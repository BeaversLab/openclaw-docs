---
summary: "Resumen del emparejamiento: aprobar quién puede enviarte un MD y qué nodos pueden unirse"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Emparejamiento"
---

"Emparejamiento" es el paso de aprobación de acceso explícito de OpenClaw.
Se utiliza en dos lugares:

1. **Emparejamiento por MD** (quién tiene permiso para hablar con el bot)
2. **Emparejamiento de nodos** (qué dispositivos/nodos tienen permiso para unirse a la red de puerta de enlace)

Contexto de seguridad: [Seguridad](/es/gateway/security)

## 1) Emparejamiento por MD (acceso de chat entrante)

Cuando un canal está configurado con la política de MD `pairing`, los remitentes desconocidos reciben un código corto y su mensaje **no se procesa** hasta que usted lo apruebe.

Las políticas de DM predeterminadas están documentadas en: [Seguridad](/es/gateway/security)

`dmPolicy: "open"` es público solo cuando la lista de permitidos de MD efectiva incluye `"*"`.
La configuración y validación requieren ese comodín para configuraciones abiertas al público. Si el estado
existente contiene `open` con entradas concretas de `allowFrom`, el tiempo de ejecución aún admite
solo esos remitentes, y las aprobaciones del almacén de emparejamiento no amplían el acceso de `open`.

Códigos de emparejamiento:

- 8 caracteres, mayúsculas, sin caracteres ambiguos (`0O1I`).
- **Caducan después de 1 hora**. El bot solo envía el mensaje de emparejamiento cuando se crea una nueva solicitud (aproximadamente una vez por hora por remitente).
- Las solicitudes de emparejamiento MD pendientes tienen un límite de **3 por canal** de forma predeterminada; las solicitudes adicionales se ignoran hasta que una caduca o se aprueba.

### Aprobar un remitente

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Si aún no se ha configurado ningún propietario de comandos, aprobar un código de emparejamiento de MD también inicializa
`commands.ownerAllowFrom` para el remitente aprobado, tal como `telegram:123456789`.
Esto da a las configuraciones de primera vez un propietario explícito para los comandos privilegiados y las solicitudes de aprobación
de ejecución. Después de que existe un propietario, las aprobaciones de emparejamiento posteriores solo otorgan acceso
por MD; no añaden más propietarios.

Canales compatibles: `discord`, `feishu`, `googlechat`, `imessage`, `irc`, `line`, `matrix`, `mattermost`, `msteams`, `nextcloud-talk`, `nostr`, `openclaw-weixin`, `signal`, `slack`, `synology-chat`, `telegram`, `twitch`, `whatsapp`, `zalo`, `zalouser`.

### Grupos de remitentes reutilizables

Use `accessGroups` de nivel superior cuando el mismo conjunto de remitentes de confianza deba aplicarse a
múltiples canales de mensajes o tanto a listas permitidas de MD como de grupos.

Los grupos estáticos usan `type: "message.senders"` y se referencian con
`accessGroup:<name>` desde las listas permitidas del canal:

```json5
{
  accessGroups: {
    operators: {
      type: "message.senders",
      members: {
        discord: ["discord:123456789012345678"],
        telegram: ["987654321"],
        whatsapp: ["+15551234567"],
      },
    },
  },
  channels: {
    telegram: { dmPolicy: "allowlist", allowFrom: ["accessGroup:operators"] },
    whatsapp: { groupPolicy: "allowlist", groupAllowFrom: ["accessGroup:operators"] },
  },
}
```

Los grupos de acceso están documentados en detalle aquí: [Grupos de acceso](/es/channels/access-groups)

### Dónde se almacena el estado

Almacenado bajo `~/.openclaw/credentials/`:

- Solicitudes pendientes: `<channel>-pairing.json`
- Almacén de lista permitida aprobada:
  - Cuenta predeterminada: `<channel>-allowFrom.json`
  - Cuenta no predeterminada: `<channel>-<accountId>-allowFrom.json`

Comportamiento de ámbito de cuenta:

- Las cuentas no predeterminadas leen/escriben solo su archivo de lista permitida con ámbito.
- La cuenta predeterminada utiliza el archivo de lista permitida sin ámbito con ámbito de canal.

Trátelos como información confidencial (controlan el acceso a su asistente).

<Note>
  El almacén de lista permitida de emparejamiento es para el acceso por MD. La autorización de grupo es separada. Aprobar un código de emparejamiento de MD no permite automáticamente que ese remitente ejecute comandos de grupo o controle el bot en los grupos. El arranque del primer propietario es un estado de configuración separado en `commands.ownerAllowFrom`, y la entrega de chat de grupo
  todavía sigue las listas permitidas de grupo del canal (por ejemplo `groupAllowFrom`, `groups`, o anulaciones por grupo o por tema dependiendo del canal).
</Note>

## 2) Emparejamiento de dispositivos de nodo (nodos iOS/Android/macOS/headless)

Los nodos se conectan a la Gateway como **dispositivos** con `role: node`. La Gateway
crea una solicitud de emparejamiento de dispositivo que debe ser aprobada.

### Emparejar a través de Telegram (recomendado para iOS)

Si usa el complemento `device-pair`, puede realizar el emparejamiento de dispositivos por primera vez completamente desde Telegram:

1. En Telegram, envíe un mensaje a su bot: `/pair`
2. El bot responde con dos mensajes: un mensaje de instrucción y un mensaje de **código de configuración** separado (fácil de copiar/pegar en Telegram).
3. En su teléfono, abra la aplicación OpenClaw para iOS → Configuración → Gateway.
4. Escanee el código QR o pegue el código de configuración y conéctese.
5. De vuelta en Telegram: `/pair pending` (revise los IDs de solicitud, rol y alcances), luego apruebe.

El código de configuración es una carga útil JSON codificada en base64 que contiene:

- `url`: la URL de WebSocket de la Gateway (`ws://...` o `wss://...`)
- `bootstrapToken`: un token de arranque de dispositivo único de corta duración utilizado para el protocolo de enlace de emparejamiento inicial

Ese token de arranque lleva el perfil de arranque de emparejamiento integrado:

- el perfil de configuración integrado solo permite el rol `node`
- después de la aprobación, el token `node` entregado se mantiene `scopes: []`
- el flujo de código de configuración integrado no entrega un token `operator`
- el acceso de operador requiere un emparejamiento de operador aprobado por separado o un flujo de token
- la rotación/revocación posterior del token permanece limitada tanto por el contrato de rol aprobado del dispositivo como por los ámbitos de operador de la sesión de quien realiza la llamada

Trate el código de configuración como una contraseña mientras sea válido.

Para el emparejamiento móvil remoto de Tailscale, público u otro, utilice Tailscale Serve/Funnel
u otra URL de Gateway `wss://`. Los códigos de configuración `ws://` en texto plano se aceptan solo
para loopback, direcciones LAN privadas, hosts Bonjour `.local` y el host del emulador
Android. Las direcciones CGNAT de Tailnet, los nombres `.ts.net` y los hosts públicos aún
fallan de forma segura antes de la emisión de QR/código de configuración.

### Aprobar un dispositivo nodo

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Cuando se deniega una aprobación explícita porque la sesión del dispositivo emparejado que aprueba
se abrió con un ámbito de solo emparejamiento, la CLI reintenta la misma solicitud con
`operator.admin`. Esto permite que un dispositivo emparejado con capacidades de administración recupere un nuevo
emparejamiento de Interfaz de Control/navegador sin editar `devices/paired.json` manualmente. El
Gateway sigue validando la conexión reintentada; los tokens que no pueden autenticarse
con `operator.admin` permanecen bloqueados.

Si el mismo dispositivo reintenta con diferentes detalles de autenticación (por ejemplo, diferentes
rol/ámbitos/clave pública), la solicitud pendiente anterior es reemplazada y se crea un nuevo
`requestId`.

<Note>Un dispositivo ya emparejado no obtiene acceso más amplio silenciosamente. Si se vuelve a conectar solicitando más ámbitos o un rol más amplio, OpenClaw mantiene la aprobación existente tal como está y crea una nueva solicitud de actualización pendiente. Use `openclaw devices list` para comparar el acceso aprobado actualmente con el acceso recién solicitado antes de aprobar.</Note>

### Aprobación automática opcional de nodos de CIDR de confianza

De forma predeterminada, el emparejamiento de dispositivos sigue siendo manual. Para redes de nodos controladas estrictamente,
puede optar por la aprobación automática de nodos por primera vez con CIDR explícitos o IPs exactas:

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

Esto solo se aplica a solicitudes de emparejamiento `role: node` nuevas sin ámbitos solicitados.
Los clientes de Operador, navegador, Interfaz de usuario de control y WebChat aún requieren aprobación manual. Los cambios de rol, ámbito, metadatos y clave pública aún requieren aprobación manual.

### Almacenamiento del estado de emparejamiento de nodos

Almacenado bajo `~/.openclaw/devices/`:

- `pending.json` (de corta duración; las solicitudes pendientes caducan)
- `paired.json` (dispositivos emparejados + tokens)

### Notas

- La API heredada `node.pair.*` (CLI: `openclaw nodes pending|approve|reject|remove|rename`) es un
  almacén de emparejamiento propiedad de la puerta de enlace separado. Los nodos WS aún requieren emparejamiento de dispositivos.
- El registro de emparejamiento es la fuente duradera de verdad para los roles aprobados. Los tokens
  de dispositivo activos permanecen limitados a ese conjunto de roles aprobados; una entrada de token extraviada
  fuera de los roles aprobados no crea nuevo acceso.

## Documentos relacionados

- Modelo de seguridad + inyección de avisos: [Seguridad](/es/gateway/security)
- Actualización segura (ejecutar doctor): [Actualización](/es/install/updating)
- Configuraciones de canales:
  - Telegram: [Telegram](/es/channels/telegram)
  - WhatsApp: [WhatsApp](/es/channels/whatsapp)
  - Signal: [Signal](/es/channels/signal)
  - iMessage: [iMessage](/es/channels/imessage)
  - Discord: [Discord](/es/channels/discord)
  - Slack: [Slack](/es/channels/slack)
