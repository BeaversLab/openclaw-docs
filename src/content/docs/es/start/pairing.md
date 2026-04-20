---
summary: "Resumen del emparejamiento: aprobar quién puede enviarte MD + qué nodos pueden unirse"
read_when:
  - Setting up DM access control
  - Pairing a new iOS/Android node
  - Reviewing OpenClaw security posture
title: "Emparejamiento"
---

# Emparejamiento

El "Emparejamiento" es el paso de **aprobación explícita del propietario** de OpenClaw.
Se utiliza en dos lugares:

1. **Emparejamiento de MD** (quién tiene permiso para hablar con el bot)
2. **Emparejamiento de nodos** (qué dispositivos/nodos tienen permiso para unirse a la red de puerta de enlace)

Contexto de seguridad: [Seguridad](/es/gateway/security)

## 1) Emparejamiento de MD (acceso de chat entrante)

Cuando un canal está configurado con la política de MD `pairing`, los remitentes desconocidos reciben un código corto y su mensaje **no se procesa** hasta que usted lo aprueba.

Las políticas de MD predeterminadas están documentadas en: [Seguridad](/es/gateway/security)

Códigos de emparejamiento:

- 8 caracteres, mayúsculas, sin caracteres ambiguos (`0O1I`).
- **Expiran después de 1 hora**. El bot solo envía el mensaje de emparejamiento cuando se crea una nueva solicitud (aproximadamente una vez por hora por remitente).
- Las solicitudes de emparejamiento de MD pendientes están limitadas a **3 por canal** de forma predeterminada; las solicitudes adicionales se ignoran hasta que una expira o se aprueba.

### Aprobar un remitente

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

Canales compatibles: `telegram`, `whatsapp`, `signal`, `imessage`, `discord`, `slack`.

### Dónde se encuentra el estado

Almacenado bajo `~/.openclaw/credentials/`:

- Solicitudes pendientes: `<channel>-pairing.json`
- Almacén de lista de permitidos aprobados: `<channel>-allowFrom.json`

Trate estos como confidenciales (controlan el acceso a su asistente).

## 2) Emparejamiento de dispositivos de nodo (nodos iOS/Android/macOS/headless)

Los nodos se conectan a la Puerta de enlace como **dispositivos** con `role: node`. La Puerta de enlace
crea una solicitud de emparejamiento de dispositivo que debe ser aprobada.

### Aprobar un dispositivo de nodo

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

### Dónde se encuentra el estado

Almacenado bajo `~/.openclaw/devices/`:

- `pending.json` (de corta duración; las solicitudes pendientes expiran)
- `paired.json` (dispositivos emparejados + tokens)

### Notas

- La API heredada `node.pair.*` (CLI: `openclaw nodes pending/approve`) es un
  almacén de emparejamiento propiedad separado de la puerta de enlace. Los nodos WS aún requieren emparejamiento de dispositivos.

## Documentos relacionados

- Modelo de seguridad + inyección de prompts: [Seguridad](/es/gateway/security)
- Actualización segura (ejecutar doctor): [Actualización](/es/install/updating)
- Configuraciones de canales:
  - Telegram: [Telegram](/es/channels/telegram)
  - WhatsApp: [WhatsApp](/es/channels/whatsapp)
  - Signal: [Signal](/es/channels/signal)
  - BlueBubbles (iMessage): [BlueBubbles](/es/channels/bluebubbles)
  - iMessage (heredado): [iMessage](/es/channels/imessage)
  - Discord: [Discord](/es/channels/discord)
  - Slack: [Slack](/es/channels/slack)
