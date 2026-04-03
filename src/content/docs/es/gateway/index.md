---
summary: "Manual de procedimientos del servicio Gateway, ciclo de vida y operaciones"
read_when:
  - Running or debugging the gateway process
title: "Manual de procedimientos de Gateway"
---

# Manual de procedimientos de Gateway

Utilice esta página para el inicio inicial (día-1) y las operaciones posteriores (día-2) del servicio Gateway.

<CardGroup cols={2}>
  <Card title="Solución de problemas profundos" icon="siren" href="/en/gateway/troubleshooting">
    Diagnóstico basado en síntomas con escalas de comandos exactas y firmas de registro.
  </Card>
  <Card title="Configuración" icon="sliders" href="/en/gateway/configuration">
    Guía de configuración orientada a tareas + referencia de configuración completa.
  </Card>
  <Card title="Gestión de secretos" icon="key-round" href="/en/gateway/secrets">
    Contrato SecretRef, comportamiento de la instantánea en tiempo de ejecución y operaciones de migración/recarga.
  </Card>
  <Card title="Contrato del plan de secretos" icon="shield-check" href="/en/gateway/secrets-plan-contract">
    Reglas exactas de `secrets apply` objetivo/ruta y comportamiento del perfil de autenticación de solo referencia.
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
  La recarga de la configuración de Gateway observa la ruta del archivo de configuración activo (resuelta desde los valores predeterminados de perfil/estado, o `OPENCLAW_CONFIG_PATH` cuando está establecido). El modo predeterminado es `gateway.reload.mode="hybrid"`. Después de la primera carga exitosa, el proceso en ejecución sirve la instantánea de configuración activa en memoria; la recarga
  exitosa intercambia esa instantánea atómicamente.
</Note>

## Modelo de tiempo de ejecución

- Un proceso siempre activo para el enrutamiento, el plano de control y las conexiones del canal.
- Un puerto multiplexado único para:
  - Control/RPC de WebSocket
  - APIs HTTP, compatibles con OpenAI (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - Interfaz de usuario de control y enlaces (hooks)
- Modo de vinculación predeterminado: `loopback`.
- Se requiere autenticación de forma predeterminada (`gateway.auth.token` / `gateway.auth.password`, o `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).

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

- `/v1/models` está orientado primero a agentes: devuelve `openclaw`, `openclaw/default` y `openclaw/<agentId>`.
- `openclaw/default` es el alias estable que siempre se asigna al agente predeterminado configurado.
- Use `x-openclaw-model` cuando desee una anulación de proveedor/modelo de backend; de lo contrario, la configuración normal de modelo y incrustación del agente seleccionado mantiene el control.

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

Luego conecte los clientes localmente a `ws://127.0.0.1:18789`.

<Warning>Si la autenticación de la puerta de enlace está configurada, los clientes aún deben enviar autenticación (`token`/`password`) incluso a través de túneles SSH.</Warning>

Consulte: [Remote Gateway](/en/gateway/remote), [Authentication](/en/gateway/authentication), [Tailscale](/en/gateway/tailscale).

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

Las etiquetas de LaunchAgent son `ai.openclaw.gateway` (predeterminado) o `ai.openclaw.<profile>` (perfil con nombre). `openclaw doctor` audita y repara la derivación de la configuración del servicio.

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

Use a system unit for multi-user/always-on hosts.

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

- Unique `gateway.port`
- Unique `OPENCLAW_CONFIG_PATH`
- Unique `OPENCLAW_STATE_DIR`
- Unique `agents.defaults.workspace`

Ejemplo:

```bash
OPENCLAW_CONFIG_PATH=~/.openclaw/a.json OPENCLAW_STATE_DIR=~/.openclaw-a openclaw gateway --port 19001
OPENCLAW_CONFIG_PATH=~/.openclaw/b.json OPENCLAW_STATE_DIR=~/.openclaw-b openclaw gateway --port 19002
```

See: [Multiple gateways](/en/gateway/multiple-gateways).

### Ruta rápida de perfil de desarrollo

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Defaults include isolated state/config and base gateway port `19001`.

## Referencia rápida del protocolo (vista de operador)

- First client frame must be `connect`.
- Gateway returns `hello-ok` snapshot (`presence`, `health`, `stateVersion`, `uptimeMs`, limits/policy).
- Requests: `req(method, params)` → `res(ok/payload|error)`.
- Common events: `connect.challenge`, `agent`, `chat`, `presence`, `tick`, `health`, `heartbeat`, `shutdown`.

Las ejecuciones del agente tienen dos etapas:

1. Immediate accepted ack (`status:"accepted"`)
2. Final completion response (`status:"ok"|"error"`), with streamed `agent` events in between.

See full protocol docs: [Gateway Protocol](/en/gateway/protocol).

## Comprobaciones operativas

### Vitalidad

- Open WS and send `connect`.
- Expect `hello-ok` response with snapshot.

### Disponibilidad

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Recuperación de brechas

Events are not replayed. On sequence gaps, refresh state (`health`, `system-presence`) before continuing.

## Firmas comunes de fallos

| Firma                                                          | Problema probable                                                    |
| -------------------------------------------------------------- | -------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | Vinculación no local (non-loopback) sin token/contraseña             |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflicto de puerto                                                  |
| `Gateway start blocked: set gateway.mode=local`                | Configuración establecida en modo remoto                             |
| `unauthorized` during connect                                  | Discrepancia de autenticación entre el cliente y la puerta de enlace |

For full diagnosis ladders, use [Gateway Troubleshooting](/en/gateway/troubleshooting).

## Garantías de seguridad

- Los clientes del protocolo de la puerta de enlace fallan rápido cuando la puerta de enlace no está disponible (sin respaldo implícito de canal directo).
- Los primeros marcos no válidos o no de conexión se rechazan y cierran.
- Graceful shutdown emits `shutdown` event before socket close.

---

Relacionado:

- [Troubleshooting](/en/gateway/troubleshooting)
- [Background Process](/en/gateway/background-process)
- [Configuración](/en/gateway/configuration)
- [Estado de salud](/en/gateway/health)
- [Doctor](/en/gateway/doctor)
- [Autenticación](/en/gateway/authentication)
