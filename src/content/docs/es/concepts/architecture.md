---
summary: "Arquitectura del gateway WebSocket, componentes y flujos de clientes"
read_when:
  - Working on gateway protocol, clients, or transports
title: "Arquitectura del Gateway"
---

## Descripción general

- Un único **Gateway** de larga duración posee todas las superficies de mensajería (WhatsApp a través de
  Baileys, Telegram a través de grammY, Slack, Discord, Signal, iMessage, WebChat).
- Los clientes del plano de control (aplicación macOS, CLI, interfaz web, automatizaciones) se conectan al
  Gateway a través de **WebSocket** en el host de enlace configurado (por defecto
  `127.0.0.1:18789`).
- Los **Nodos** (macOS/iOS/Android/headless) también se conectan a través de **WebSocket**, pero
  declaran `role: node` con capacidades/comandos explícitos.
- Un Gateway por host; es el único lugar que abre una sesión de WhatsApp.
- El **canvas host** es servido por el servidor HTTP del Gateway en:
  - `/__openclaw__/canvas/` (host editable por el agente HTML/CSS/JS)
  - `/__openclaw__/a2ui/` (host A2UI)
    Utiliza el mismo puerto que el Gateway (por defecto `18789`).

## Componentes y flujos

### Gateway (demonio)

- Mantiene las conexiones de los proveedores.
- Expone una API WS tipada (solicitudes, respuestas, eventos de inserción del servidor).
- Valida las tramas entrantes contra JSON Schema.
- Emite eventos como `agent`, `chat`, `presence`, `health`, `heartbeat`, `cron`.

### Clientes (aplicación Mac / CLI / administrador web)

- Una conexión WS por cliente.
- Envían solicitudes (`health`, `status`, `send`, `agent`, `system-presence`).
- Se suscriben a eventos (`tick`, `agent`, `presence`, `shutdown`).

### Nodos (macOS / iOS / Android / headless)

- Se conectan al **mismo servidor WS** con `role: node`.
- Proporcionan una identidad de dispositivo en `connect`; el emparejamiento es **basado en dispositivos** (rol `node`) y
  la aprobación reside en el almacén de emparejamiento de dispositivos.
- Exponen comandos como `canvas.*`, `camera.*`, `screen.record`, `location.get`.

Detalles del protocolo:

- [Protocolo del Gateway](/es/gateway/protocol)

### WebChat

- Interfaz de usuario estática que utiliza la API de WS del Gateway para el historial de chat y envíos.
- En configuraciones remotas, se conecta a través del mismo túnel SSH/Tailscale que otros
  clientes.

## Ciclo de vida de la conexión (cliente único)

```mermaid
sequenceDiagram
    participant Client
    participant Gateway

    Client->>Gateway: req:connect
    Gateway-->>Client: res (ok)
    Note right of Gateway: or res error + close
    Note left of Client: payload=hello-ok<br>snapshot: presence + health

    Gateway-->>Client: event:presence
    Gateway-->>Client: event:tick

    Client->>Gateway: req:agent
    Gateway-->>Client: res:agent<br>ack {runId, status:"accepted"}
    Gateway-->>Client: event:agent<br>(streaming)
    Gateway-->>Client: res:agent<br>final {runId, status, summary}
```

## Protocolo cable (resumen)

- Transporte: WebSocket, tramas de texto con cargas útiles JSON.
- La primera trama **debe** ser `connect`.
- Después del apretón de manos (handshake):
  - Solicitudes: `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Eventos: `{type:"event", event, payload, seq?, stateVersion?}`
- `hello-ok.features.methods` / `events` son metadatos de descubrimiento, no un
  volcado generado de cada ruta auxiliar invocable.
- La autenticación de secreto compartido utiliza `connect.params.auth.token` o
  `connect.params.auth.password`, dependiendo del modo de autenticación del gateway configurado.
- Los modos con identidad, como Tailscale Serve
  (`gateway.auth.allowTailscale: true`) o `gateway.auth.mode: "trusted-proxy"` que no sea de bucle local (loopback)
  satisfacen la autenticación desde los encabezados de solicitud
  en lugar de `connect.params.auth.*`.
- El `gateway.auth.mode: "none"` de ingreso privado (private-ingress) deshabilita la autenticación de secreto compartido
  por completo; mantenga ese modo fuera del ingreso público/no confiable.
- Las claves de idempotencia son obligatorias para los métodos con efectos secundarios (`send`, `agent`) para
  reintentar de manera segura; el servidor mantiene un caché de deduplicación de corta duración.
- Los nodos deben incluir `role: "node"` además de capacidades/comandos/permisos en `connect`.

## Emparejamiento + confianza local

- Todos los clientes WS (operadores + nodos) incluyen una **identidad de dispositivo** en `connect`.
- Los nuevos ID de dispositivo requieren aprobación de emparejamiento; el Gateway emite un **token de dispositivo**
  para las conexiones posteriores.
- Las conexiones directas de bucle local (loopback) pueden ser aprobadas automáticamente para mantener la UX del mismo host
  fluida.
- OpenClaw también tiene una ruta estrecha de autoconexión local de backend/contenedor para
  flujos auxiliares de secreto compartido de confianza.
- Las conexiones de Tailnet y LAN, incluidos los enlaces de Tailnet del mismo host, aún requieren
  aprobación de emparejamiento explícita.
- Todas las conexiones deben firmar el nonce `connect.challenge`.
- La carga útil de la firma `v3` también vincula `platform` + `deviceFamily`; el gateway
  fija los metadatos emparejados al reconectar y requiere un emparejamiento de reparación para los cambios
  en los metadatos.
- **Las conexiones no locales** todavía requieren aprobación explícita.
- La autenticación del Gateway (`gateway.auth.*`) todavía se aplica a **todas** las conexiones, locales o
  remotas.

Detalles: [Gateway protocol](/es/gateway/protocol), [Pairing](/es/channels/pairing),
[Security](/es/gateway/security).

## Tipado del protocolo y generación de código

- Los esquemas TypeBox definen el protocolo.
- JSON Schema se genera a partir de esos esquemas.
- Los modelos Swift se generan a partir del JSON Schema.

## Acceso remoto

- Preferido: Tailscale o VPN.
- Alternativa: túnel SSH

  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```

- El mismo handshake + token de autenticación se aplican a través del túnel.
- TLS + pinning opcional se pueden habilitar para WS en configuraciones remotas.

## Instantánea de operaciones

- Inicio: `openclaw gateway` (primer plano, registros a stdout).
- Salud: `health` sobre WS (también incluido en `hello-ok`).
- Supervisión: launchd/systemd para reinicio automático.

## Invariantes

- Exactamente un Gateway controla una sola sesión de Baileys por host.
- El handshake es obligatorio; cualquier primer marco que no sea JSON o no sea de conexión es un cierre abrupto.
- Los eventos no se reproducen; los clientes deben actualizar en caso de brechas.

## Relacionado

- [Agent Loop](/es/concepts/agent-loop) — ciclo de ejecución detallado del agente
- [Gateway Protocol](/es/gateway/protocol) — contrato del protocolo WebSocket
- [Queue](/es/concepts/queue) — cola de comandos y concurrencia
- [Security](/es/gateway/security) — modelo de confianza y endurecimiento
