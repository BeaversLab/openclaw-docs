---
summary: "Manual de procedimientos del servicio Gateway, ciclo de vida y operaciones"
read_when:
  - Running or debugging the gateway process
title: "Manual de procedimientos de Gateway"
---

# Manual de procedimientos de Gateway

Utilice esta página para el inicio inicial (día-1) y las operaciones posteriores (día-2) del servicio Gateway.

<CardGroup cols={2}>
  <Card title="Solución de problemas profunda" icon="siren" href="/es/gateway/troubleshooting">
    Diagnósticos basados en síntomas con escalas de comandos exactas y firmas de registros.
  </Card>
  <Card title="Configuración" icon="sliders" href="/es/gateway/configuration">
    Guía de configuración orientada a tareas + referencia de configuración completa.
  </Card>
  <Card title="Gestión de secretos" icon="key-round" href="/es/gateway/secrets">
    Contrato SecretRef, comportamiento de instantánea en tiempo de ejecución y operaciones de
    migración/recarga.
  </Card>
  <Card
    title="Contrato del plan de secretos"
    icon="shield-check"
    href="/es/gateway/secrets-plan-contract"
  >
    Reglas exactas de `secrets apply` ruta/destino y comportamiento del perfil de autenticación de
    solo referencia.
  </Card>
</CardGroup>

## Inicio local en 5 minutos

<Steps>
  <Step title="Start the Gateway">

```bash
openclaw gateway --port 18789
# debug/trace mirrored to stdio
openclaw gateway --port 18789 --verbose
# force-kill listener on selected port, then start
openclaw gateway --force
```

  </Step>

  <Step title="Verificar el estado del servicio">

```bash
openclaw gateway status
openclaw status
openclaw logs --follow
```

Línea base saludable: `Runtime: running` y `RPC probe: ok`.

  </Step>

  <Step title="Validar la preparación del canal">

```bash
openclaw channels status --probe
```

  </Step>
</Steps>

<Note>
  La recarga de la configuración de Gateway supervisa la ruta del archivo de configuración activo
  (resuelta desde los valores predeterminados de perfil/estado, o `OPENCLAW_CONFIG_PATH` cuando se
  establece). El modo predeterminado es `gateway.reload.mode="hybrid"`.
</Note>

## Modelo de tiempo de ejecución

- Un proceso siempre activo para el enrutamiento, el plano de control y las conexiones del canal.
- Un puerto multiplexado único para:
  - Control/RPC de WebSocket
  - APIs HTTP, compatibles con OpenAI (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - Interfaz de usuario de control y enlaces (hooks)
- Modo de enlace predeterminado: `loopback`.
- Se requiere autenticación de manera predeterminada (`gateway.auth.token` / `gateway.auth.password`, o `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).

## Endpoints compatibles con OpenAI

La superficie de compatibilidad de mayor impacto de OpenClaw es ahora:

- `GET /v1/models`
- `GET /v1/models/{id}`
- `POST /v1/embeddings`
- `POST /v1/chat/completions`
- `POST /v1/responses`

Por qué es importante este conjunto:

- La mayoría de las integraciones de Open WebUI, LobeChat y LibreChat sondean primero `/v1/models`.
- Muchas canalizaciones de RAG y memoria esperan `/v1/embeddings`.
- Los clientes nativos de agentes prefieren cada vez más `/v1/responses`.

Nota de planificación:

- `/v1/models` es prioridad para agentes: devuelve `openclaw`, `openclaw/default` y `openclaw/<agentId>`.
- `openclaw/default` es el alias estable que siempre se asigna al agente predeterminado configurado.
- Use `x-openclaw-model` cuando desee una invalidación del proveedor/modelo de backend; de lo contrario, la configuración normal de modelo y embedding del agente seleccionado permanece bajo control.

Todos estos se ejecutan en el puerto principal de Gateway y usan el mismo límite de autenticación de operador de confianza que el resto de la API HTTP de Gateway.

### Puerto y precedencia de enlace

| Configuración     | Orden de resolución                                           |
| ----------------- | ------------------------------------------------------------- |
| Puerto de Gateway | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Modo de enlace    | CLI/override → `gateway.bind` → `loopback`                    |

### Modos de recarga en caliente

| `gateway.reload.mode`     | Comportamiento                                                           |
| ------------------------- | ------------------------------------------------------------------------ |
| `off`                     | Sin recarga de configuración                                             |
| `hot`                     | Aplicar solo cambios seguros para recarga en caliente                    |
| `restart`                 | Reiniciar en cambios que requieran recarga                               |
| `hybrid` (predeterminado) | Aplicación en caliente cuando sea seguro, reiniciar cuando sea necesario |

## Conjunto de comandos del operador

```bash
openclaw gateway status
openclaw gateway status --deep
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

## Acceso remoto

Preferido: Tailscale/VPN.
Alternativa: túnel SSH.

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Luego conecte los clientes a `ws://127.0.0.1:18789` localmente.

<Warning>
  Si la autenticación de la pasarela está configurada, los clientes aún deben enviar autenticación
  (`token`/`password`) incluso a través de túneles SSH.
</Warning>

Consulte: [Pasarela remota](/es/gateway/remote), [Autenticación](/es/gateway/authentication), [Tailscale](/es/gateway/tailscale).

## Supervisión y ciclo de vida del servicio

Use ejecuciones supervisadas para una confiabilidad similar a la de producción.

<Tabs>
  <Tab title="macOS (launchd)">

```bash
openclaw gateway install
openclaw gateway status
openclaw gateway restart
openclaw gateway stop
```

Las etiquetas de LaunchAgent son `ai.openclaw.gateway` (predeterminado) o `ai.openclaw.<profile>` (perfil con nombre). `openclaw doctor` audita y repara la deriva de configuración del servicio.

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

Para la persistencia después de cerrar sesión, habilite el modo persistente (lingering):

```bash
sudo loginctl enable-linger <user>
```

  </Tab>

  <Tab title="Linux (system service)">

Use una unidad de sistema para hosts multiusuario/siempre activos.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## Múltiples pasarelas en un solo host

La mayoría de las configuraciones deberían ejecutar **una** sola Pasarela.
Use múltiples solo para un aislamiento/redundancia estricta (por ejemplo, un perfil de rescate).

Lista de verificación por instancia:

- `gateway.port` único
- `OPENCLAW_CONFIG_PATH` único
- `OPENCLAW_STATE_DIR` único
- `agents.defaults.workspace` único

Ejemplo:

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

Consulte: [Múltiples pasarelas](/es/gateway/multiple-gateways).

### Ruta rápida de perfil de desarrollo

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Los valores predeterminados incluyen estado/configuración aislados y el puerto base de la pasarela `19001`.

## Referencia rápida del protocolo (vista de operador)

- El primer tramo del cliente debe ser `connect`.
- La pasarela devuelve una instantánea `hello-ok` (`presence`, `health`, `stateVersion`, `uptimeMs`, límites/política).
- Solicitudes: `req(method, params)` → `res(ok/payload|error)`.
- Eventos comunes: `connect.challenge`, `agent`, `chat`, `presence`, `tick`, `health`, `heartbeat`, `shutdown`.

Las ejecuciones del agente tienen dos etapas:

1. Ack de aceptación inmediata (`status:"accepted"`)
2. Respuesta de finalización completa (`status:"ok"|"error"`), con eventos `agent` transmitidos en medio.

Consulte la documentación completa del protocolo: [Gateway Protocol](/es/gateway/protocol).

## Comprobaciones operativas

### Vitalidad

- Abra WS y envíe `connect`.
- Espere una respuesta `hello-ok` con una instantánea.

### Disponibilidad

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Recuperación de brechas

Los eventos no se reproducen. Ante brechas en la secuencia, actualice el estado (`health`, `system-presence`) antes de continuar.

## Firmas comunes de fallos

| Firma                                                          | Problema probable                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | Vinculación no local (non-loopback) sin token/contraseña             |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflicto de puerto                                                  |
| `Gateway start blocked: set gateway.mode=local`                | Configuración establecida en modo remoto                             |
| `unauthorized` durante la conexión                             | Discrepancia de autenticación entre el cliente y la puerta de enlace |

Para obtener escaleras de diagnóstico completas, use [Gateway Troubleshooting](/es/gateway/troubleshooting).

## Garantías de seguridad

- Los clientes del protocolo de la puerta de enlace fallan rápido cuando la puerta de enlace no está disponible (sin respaldo implícito de canal directo).
- Los primeros marcos no válidos o no de conexión se rechazan y cierran.
- El cierre ordenado emite el evento `shutdown` antes de cerrar el socket.

---

Relacionado:

- [Solución de problemas](/es/gateway/troubleshooting)
- [Proceso en segundo plano](/es/gateway/background-process)
- [Configuración](/es/gateway/configuration)
- [Estado de salud](/es/gateway/health)
- [Doctor](/es/gateway/doctor)
- [Autenticación](/es/gateway/authentication)

import es from "/components/footer/es.mdx";

<es />
