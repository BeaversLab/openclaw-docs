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

Las políticas de MD predeterminadas están documentadas en: [Seguridad](/es/gateway/security)

Códigos de emparejamiento:

- 8 caracteres, mayúsculas, sin caracteres ambiguos (`0O1I`).
- **Caducan después de 1 hora**. El bot solo envía el mensaje de emparejamiento cuando se crea una nueva solicitud (aproximadamente una vez por hora por remitente).
- Las solicitudes de emparejamiento MD pendientes tienen un límite de **3 por canal** de forma predeterminada; las solicitudes adicionales se ignoran hasta que una caduca o se aprueba.

### Aprobar un remitente

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canales compatibles: `telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`, `feishu`.

### Dónde reside el estado

Almacenado bajo `~/.openclaw/credentials/`:

- Solicitudes pendientes: `<channel>-pairing.json`
- Almacén de lista de permitidos aprobados:
  - Cuenta predeterminada: `<channel>-allowFrom.json`
  - Cuenta no predeterminada: `<channel>-<accountId>-allowFrom.json`

Comportamiento del ámbito de la cuenta:

- Las cuentas no predeterminadas solo leen/escriben su archivo de lista de permitidos con ámbito.
- La cuenta predeterminada utiliza el archivo de lista de permitidos sin ámbito con ámbito de canal.

Trátelos como confidenciales (controlan el acceso a su asistente).

## 2) Emparejamiento de dispositivos de nodo (nodos iOS/Android/macOS/headless)

Los nodos se conectan a la Pasarela como **dispositivos** con `role: node`. La Pasarela
crea una solicitud de emparejamiento de dispositivo que debe ser aprobada.

### Emparejar vía Telegram (recomendado para iOS)

Si utiliza el complemento `device-pair`, puede realizar el emparejamiento de dispositivos por primera vez completamente desde Telegram:

1. En Telegram, envía un mensaje a tu bot: `/pair`
2. El bot responde con dos mensajes: un mensaje de instrucciones y un mensaje separado de **código de configuración** (fácil de copiar/pegar en Telegram).
3. En tu teléfono, abre la aplicación OpenClaw para iOS → Configuración → Gateway.
4. Pega el código de configuración y conéctate.
5. De vuelta en Telegram: `/pair approve`

El código de configuración es una carga útil JSON codificada en base64 que contiene:

- `url`: la URL del WebSocket de Gateway (`ws://...` o `wss://...`)
- `bootstrapToken`: un token de arranque de un solo dispositivo de corta duración que se utiliza para el protocolo de enlace de emparejamiento inicial

Trata el código de configuración como una contraseña mientras sea válido.

### Aprobar un dispositivo nodo

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### Almacenamiento del estado de emparejamiento de nodos

Almacenado en `~/.openclaw/devices/`:

- `pending.json` (de corta duración; las solicitudes pendientes caducan)
- `paired.json` (dispositivos emparejados + tokens)

### Notas

- La API heredada `node.pair.*` (CLI: `openclaw nodes pending/approve`) es un almacén de emparejamiento propiedad separado del gateway. Los nodos WS aún requieren emparejamiento de dispositivo.

## Documentos relacionados

- Modelo de seguridad + inyección de avisos: [Seguridad](/es/gateway/security)
- Actualización segura (ejecutar doctor): [Actualizando](/es/install/updating)
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
