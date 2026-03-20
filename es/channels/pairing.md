---
summary: "Resumen del emparejamiento: aprobar quién puede enviarte MD + qué nodos pueden unirse"
read_when:
  - Configuración del control de acceso de MD
  - Emparejar un nuevo nodo iOS/Android
  - Revisando la postura de seguridad de OpenClaw
title: "Emparejamiento"
---

# Emparejamiento

El "Emparejamiento" es el paso explícito de **aprobación del propietario** de OpenClaw.
Se utiliza en dos lugares:

1. **Emparejamiento de MD** (quién tiene permiso para hablar con el bot)
2. **Emparejamiento de nodos** (qué dispositivos/nodos tienen permiso para unirse a la red de puerta de enlace)

Contexto de seguridad: [Seguridad](/es/gateway/security)

## 1) Emparejamiento de MD (acceso de chat entrante)

Cuando un canal está configurado con la política de MD `pairing`, los remitentes desconocidos reciben un código corto y su mensaje **no se procesa** hasta que lo apruebe.

Las políticas de MD predeterminadas están documentadas en: [Seguridad](/es/gateway/security)

Códigos de emparejamiento:

- 8 caracteres, mayúsculas, sin caracteres ambiguos (`0O1I`).
- **Caducan después de 1 hora**. El bot solo envía el mensaje de emparejamiento cuando se crea una nueva solicitud (aproximadamente una vez por hora por remitente).
- Las solicitudes pendientes de emparejamiento de MD están limitadas a **3 por canal** de forma predeterminada; las solicitudes adicionales se ignoran hasta que una caduca o se aprueba.

### Aprobar un remitente

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canales compatibles: `telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`, `feishu`.

### Dónde se encuentra el estado

Almacenado bajo `~/.openclaw/credentials/`:

- Solicitudes pendientes: `<channel>-pairing.json`
- Almacenamiento de lista blanca aprobada:
  - Cuenta predeterminada: `<channel>-allowFrom.json`
  - Cuenta no predeterminada: `<channel>-<accountId>-allowFrom.json`

Comportamiento del alcance de la cuenta:

- Las cuentas no predeterminadas leen/escriben solo su archivo de lista blanca con alcance.
- La cuenta predeterminada utiliza el archivo de lista blanca sin alcance con alcance de canal.

Trate estos como confidenciales (controlan el acceso a su asistente).

## 2) Emparejamiento de dispositivos de nodo (nodos iOS/Android/macOS/headless)

Los nodos se conectan a la puerta de enlace como **dispositivos** con `role: node`. La puerta de enlace
crea una solicitud de emparejamiento de dispositivo que debe ser aprobada.

### Emparejar a través de Telegram (recomendado para iOS)

Si utiliza el complemento `device-pair`, puede realizar el emparejamiento de dispositivos por primera vez completamente desde Telegram:

1. En Telegram, envíe un mensaje a su bot: `/pair`
2. El bot responde con dos mensajes: un mensaje de instrucción y un mensaje de **código de configuración** separado (fácil de copiar/pegar en Telegram).
3. En su teléfono, abra la aplicación OpenClaw para iOS → Configuración → Gateway.
4. Pegue el código de configuración y conéctese.
5. De vuelta en Telegram: `/pair approve`

El código de configuración es una carga útil JSON codificada en base64 que contiene:

- `url`: la URL de WebSocket de Gateway (`ws://...` o `wss://...`)
- `bootstrapToken`: un token de arranque de dispositivo único de corta duración utilizado para el protocolo de enlace de vinculación inicial

Trate el código de configuración como una contraseña mientras sea válido.

### Aprobar un dispositivo nodo

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### Almacenamiento del estado de vinculación del nodo

Almacenado en `~/.openclaw/devices/`:

- `pending.json` (de corta duración; las solicitudes pendientes caducan)
- `paired.json` (dispositivos vinculados + tokens)

### Notas

- La API heredada `node.pair.*` (CLI: `openclaw nodes pending/approve`) es un
  almacén de vinculación propiedad del gateway. Los nodos WS aún requieren vinculación de dispositivos.

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

import es from "/components/footer/es.mdx";

<es />
