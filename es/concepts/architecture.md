---
summary: "Arquitectura de puerta de enlace WebSocket, componentes y flujos de cliente"
read_when:
  - Trabajar en el protocolo de puerta de enlace, clientes o transportes
title: "Arquitectura de puerta de enlace"
---

# Arquitectura del Gateway

Última actualización: 2026-01-22

## Resumen

- Un único **Gateway** de larga duración posee todas las superficies de mensajería (WhatsApp a través de
  Baileys, Telegram a través de grammY, Slack, Discord, Signal, iMessage, WebChat).
- Los clientes del plano de control (aplicación macOS, CLI, interfaz web UI, automatizaciones) se conectan a la
  Gateway a través de **WebSocket** en el host de enlace configurado (por defecto
  `127.0.0.1:18789`).
- Los **Nodos** (macOS/iOS/Android/headless) también se conectan a través de **WebSocket**, pero
  declaran `role: node` con capacidades/comandos explícitos.
- Un Gateway por host; es el único lugar que abre una sesión de WhatsApp.
- El **canvas host** es servido por el servidor HTTP del Gateway en:
  - `/__openclaw__/canvas/` (host HTML/CSS/JS editable por agente)
  - `/__openclaw__/a2ui/` (host A2UI)
    Utiliza el mismo puerto que la Gateway (por defecto `18789`).

## Componentes y flujos

### Gateway (demonio)

- Mantiene las conexiones de los proveedores.
- Expone una API WS tipada (solicitudes, respuestas, eventos de envío de servidor).
- Valida los tramas entrantes contra JSON Schema.
- Emite eventos como `agent`, `chat`, `presence`, `health`, `heartbeat`, `cron`.

### Clientes (app mac / CLI / administrador web)

- Una conexión WS por cliente.
- Envía solicitudes (`health`, `status`, `send`, `agent`, `system-presence`).
- Se suscribe a eventos (`tick`, `agent`, `presence`, `shutdown`).

### Nodos (macOS / iOS / Android / headless)

- Conectarse al **mismo servidor WS** con `role: node`.
- Proporciona una identidad de dispositivo en `connect`; el emparejamiento es **basado en dispositivo** (rol `node`) y
  la aprobación reside en el almacén de emparejamiento de dispositivos.
- Expone comandos como `canvas.*`, `camera.*`, `screen.record`, `location.get`.

Detalles del protocolo:

- [Gateway protocol](/es/gateway/protocol)

### WebChat

- Interfaz de usuario estática que utiliza la API de WebSocket del Gateway para el historial de chat y los envíos.
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

## Protocolo de cable (resumen)

- Transporte: WebSocket, tramas de texto con cargas JSON.
- El primer frame **debe** ser `connect`.
- Después del protocolo de enlace:
  - Solicitudes: `{type:"req", id, method, params}` → `{type:"res", id, ok, payload|error}`
  - Eventos: `{type:"event", event, payload, seq?, stateVersion?}`
- Si se establece `OPENCLAW_GATEWAY_TOKEN` (o `--token`), `connect.params.auth.token`
  debe coincidir o se cierra el socket.
- Las claves de idempotencia son obligatorias para los métodos con efectos secundarios (`send`, `agent`) para
  reintentar de forma segura; el servidor mantiene un caché de deduplicación de corta duración.
- Los nodos deben incluir `role: "node"` más caps/commands/permissions en `connect`.

## Emparejamiento + confianza local

- Todos los clientes WS (operadores + nodos) incluyen una **identidad de dispositivo** en `connect`.
- Los nuevos ID de dispositivo requieren aprobación de emparejamiento; el Gateway emite un **token de dispositivo**
  para las conexiones posteriores.
- Las conexiones **locales** (bucle o la dirección tailnet propia del host del gateway) pueden ser
  aprobadas automáticamente para mantener la experiencia de usuario en el mismo host fluida.
- Todas las conexiones deben firmar el nonce `connect.challenge`.
- El payload de la firma `v3` también vincula `platform` + `deviceFamily`; el gateway
  fija los metadatos emparejados al reconectar y requiere un emparejamiento de reparación para los cambios
  de metadatos.
- Las conexiones **no locales** aún requieren aprobación explícita.
- La autenticación del Gateway (`gateway.auth.*`) todavía se aplica a **todas** las conexiones, locales o
  remotas.

Detalles: [Gateway protocol](/es/gateway/protocol), [Pairing](/es/channels/pairing),
[Security](/es/gateway/security).

## Escritura de tipos y generación de código del protocolo

- Los esquemas de TypeBox definen el protocolo.
- JSON Schema se genera a partir de esos esquemas.
- Los modelos de Swift se generan a partir del esquema JSON.

## Acceso remoto

- Preferido: Tailscale o VPN.
- Alternativa: túnel SSH

  ```bash
  ssh -N -L 18789:127.0.0.1:18789 user@host
  ```

- El mismo handshake + token de autenticación se aplican a través del túnel.
- TLS + pinning opcional se pueden habilitar para WS en configuraciones remotas.

## Instantánea de operaciones

- Inicio: `openclaw gateway` (en primer plano, registros en stdout).
- Salud: `health` a través de WS (también incluido en `hello-ok`).
- Supervisión: launchd/systemd para auto-reinicio.

## Invariantes

- Exactamente un Gateway controla una única sesión de Baileys por host.
- El handshake es obligatorio; cualquier primer trama que no sea JSON o no sea de conexión es un cierre forzado.
- Los eventos no se reproducen; los clientes deben actualizar ante lagunas.

import es from "/components/footer/es.mdx";

<es />
