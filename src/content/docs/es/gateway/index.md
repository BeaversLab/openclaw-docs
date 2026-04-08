---
summary: "Manual de operaciones para el servicio Gateway, ciclo de vida y operaciones"
read_when:
  - Running or debugging the gateway process
title: "Manual de operaciones de Gateway"
---

# Manual de procedimientos de Gateway

Utilice esta página para el inicio inicial (día-1) y las operaciones posteriores (día-2) del servicio Gateway.

<CardGroup cols={2}>
  <Card title="Solución profunda de problemas" icon="siren" href="/en/gateway/troubleshooting">
    Diagnóstico basado en síntomas con escalas de comandos exactas y firmas de registro.
  </Card>
  <Card title="Configuración" icon="sliders" href="/en/gateway/configuration">
    Guía de configuración orientada a tareas + referencia de configuración completa.
  </Card>
  <Card title="Gestión de secretos" icon="key-round" href="/en/gateway/secrets">
    Contrato SecretRef, comportamiento de la instantánea en tiempo de ejecución y operaciones de migración/recarga.
  </Card>
  <Card title="Contrato del plan de secretos" icon="shield-check" href="/en/gateway/secrets-plan-contract">
    Reglas exactas de `secrets apply` objetivo/ruta y comportamiento de auth-profile de solo referencia.
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

Línea de base saludable: `Runtime: running` y `RPC probe: ok`.

  </Step>

  <Step title="Validar la preparación del canal">

```bash
openclaw channels status --probe
```

Con un gateway accesible, esto ejecuta sondeos de canal en vivo por cuenta y auditorías opcionales.
Si el gateway es inaccesible, la CLI recurre a resúmenes de canal solo de configuración en lugar de
la salida del sondeo en vivo.

  </Step>
</Steps>

<Note>
  La recarga de configuración del Gateway vigila la ruta del archivo de configuración activo (resuelto desde los valores predeterminados de perfil/estado, o `OPENCLAW_CONFIG_PATH` cuando está establecido). El modo predeterminado es `gateway.reload.mode="hybrid"`. Después de la primera carga exitosa, el proceso en ejecución sirve la instantánea de configuración activa en memoria; una recarga
  exitosa intercambia esa instantánea de forma atómica.
</Note>

## Modelo de tiempo de ejecución

- Un proceso siempre activo para el enrutamiento, el plano de control y las conexiones del canal.
- Un puerto multiplexado único para:
  - Control/RPC de WebSocket
  - APIs HTTP, compatibles con OpenAI (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - Interfaz de usuario de control y enlaces (hooks)
- Modo de enlace predeterminado: `loopback`.
- Se requiere autenticación de forma predeterminada. Las configuraciones de secreto compartido usan
  `gateway.auth.token` / `gateway.auth.password` (o
  `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`), y las configuraciones de proxy inverso que no son de bucle local
  pueden usar `gateway.auth.mode: "trusted-proxy"`.

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

- `/v1/models` está optimizado para agentes: devuelve `openclaw`, `openclaw/default` y `openclaw/<agentId>`.
- `openclaw/default` es el alias estable que siempre se asigna al agente predeterminado configurado.
- Use `x-openclaw-model` cuando desee una anulación de proveedor/modelo de backend; de lo contrario, la configuración normal de modelo e incrustación del agente seleccionado mantiene el control.

Todos estos se ejecutan en el puerto principal de Gateway y usan el mismo límite de autenticación de operador de confianza que el resto de la API HTTP de Gateway.

### Puerto y precedencia de enlace

| Configuración     | Orden de resolución                                           |
| ----------------- | ------------------------------------------------------------- |
| Puerto de Gateway | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Modo de enlace    | CLI/sobrescritura → `gateway.bind` → `loopback`               |

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
openclaw gateway status --deep   # adds a system-level service scan
openclaw gateway status --json
openclaw gateway install
openclaw gateway restart
openclaw gateway stop
openclaw secrets reload
openclaw logs --follow
openclaw doctor
```

`gateway status --deep` es para el descubrimiento de servicios adicional (LaunchDaemons/unidades de sistema systemd/schtasks),
no para un sondeo de salud RPC más profundo.

## Múltiples gateways (mismo host)

La mayoría de las instalaciones deben ejecutar una puerta de enlace por máquina. Una sola puerta de enlace puede alojar múltiples
agentes y canales.

Solo necesita múltiples puertas de enlace cuando intencionalmente desea aislamiento o un bot de rescate.

Verificaciones útiles:

```bash
openclaw gateway status --deep
openclaw gateway probe
```

Qué esperar:

- `gateway status --deep` puede reportar `Other gateway-like services detected (best effort)`
  e imprimir sugerencias de limpieza cuando aún existen instalaciones obsoletas de launchd/systemd/schtasks.
- `gateway probe` puede advertir sobre `multiple reachable gateways` cuando más de un destino
  responde.
- Si es intencional, aisle los puertos, la configuración/estado y las raíces del espacio de trabajo para cada puerta de enlace.

Configuración detallada: [/gateway/multiple-gateways](/en/gateway/multiple-gateways).

## Acceso remoto

Preferido: Tailscale/VPN.
Alternativa: Túnel SSH.

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Luego conecte los clientes a `ws://127.0.0.1:18789` localmente.

<Warning>Los túneles SSH no omiten la autenticación de la puerta de enlace. Para la autenticación de secreto compartido, los clientes aún deben enviar `token`/`password` incluso a través del túnel. Para los modos con identidad, la solicitud aún debe satisfacer esa ruta de autenticación.</Warning>

Vea: [Remote Gateway](/en/gateway/remote), [Authentication](/en/gateway/authentication), [Tailscale](/en/gateway/tailscale).

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

Las etiquetas de LaunchAgent son `ai.openclaw.gateway` (predeterminado) o `ai.openclaw.<profile>` (perfil con nombre). `openclaw doctor` audita y repara la deriva de la configuración del servicio.

  </Tab>

  <Tab title="Linux (systemd user)">

```bash
openclaw gateway install
systemctl --user enable --now openclaw-gateway[-<profile>].service
openclaw gateway status
```

Para la persistencia después de cerrar sesión, habilite el lingering:

```bash
sudo loginctl enable-linger <user>
```

Ejemplo manual de unidad de usuario cuando necesite una ruta de instalación personalizada:

```ini
[Unit]
Description=OpenClaw Gateway
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

  </Tab>

  <Tab title="Windows (native)">

```powershell
openclaw gateway install
openclaw gateway status --json
openclaw gateway restart
openclaw gateway stop
```

El inicio administrado nativo de Windows utiliza una Tarea Programada llamada `OpenClaw Gateway`
(o `OpenClaw Gateway (<profile>)` para perfiles con nombre). Si se deniega la creación de la Tarea Programada,
OpenClaw recurre a un iniciador en la carpeta de Inicio por usuario
que apunta a `gateway.cmd` dentro del directorio de estado.

  </Tab>

  <Tab title="Linux (system service)">

Utilice una unidad de sistema para hosts multiusuario/siempre activos.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

Utilice el mismo cuerpo de servicio que la unidad de usuario, pero instálelo en
`/etc/systemd/system/openclaw-gateway[-<profile>].service` y ajuste
`ExecStart=` si su binario `openclaw` se encuentra en otro lugar.

  </Tab>
</Tabs>

## Múltiples gateways en un solo host

La mayoría de las configuraciones deben ejecutar **un** solo Gateway.
Utilice varios solo para un aislamiento/redundancia estrictos (por ejemplo, un perfil de rescate).

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

Consulte: [Múltiples gateways](/en/gateway/multiple-gateways).

### Ruta rápida del perfil de desarrollo

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Los valores predeterminados incluyen estado/configuración aislados y el puerto base del gateway `19001`.

## Referencia rápida del protocolo (vista del operador)

- El primer marco del cliente debe ser `connect`.
- El Gateway devuelve una instantánea `hello-ok` (`presence`, `health`, `stateVersion`, `uptimeMs`, límites/política).
- `hello-ok.features.methods` / `events` son una lista de descubrimiento conservadora, no
  un volcado generado de cada ruta de ayuda invocable.
- Solicitudes: `req(method, params)` → `res(ok/payload|error)`.
- Los eventos comunes incluyen `connect.challenge`, `agent`, `chat`,
  `session.message`, `session.tool`, `sessions.changed`, `presence`, `tick`,
  `health`, `heartbeat`, eventos del ciclo de vida de emparejamiento/aprobación y `shutdown`.

Las ejecuciones del agente constan de dos etapas:

1. Ack de aceptación inmediata (`status:"accepted"`)
2. Respuesta de finalización final (`status:"ok"|"error"`), con eventos `agent` transmitidos en el medio.

Consulte la documentación completa del protocolo: [Gateway Protocol](/en/gateway/protocol).

## Verificaciones operativas

### Vigencia

- Abra WS y envíe `connect`.
- Espere una respuesta `hello-ok` con una instantánea.

### Preparación

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Recuperación de huecos

Los eventos no se reproducen. Ante huecos en la secuencia, actualice el estado (`health`, `system-presence`) antes de continuar.

## Firmas de fallos comunes

| Firma                                                          | Problema probable                                                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | Vinculación no de retorno sin una ruta de autenticación de puerta de enlace válida                  |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflicto de puerto                                                                                 |
| `Gateway start blocked: set gateway.mode=local`                | Configuración establecida en modo remoto o falta la marca de modo local en una configuración dañada |
| `unauthorized` durante la conexión                             | Discrepancia de autenticación entre el cliente y la puerta de enlace                                |

Para obtener escaleras de diagnóstico completas, use [Gateway Troubleshooting](/en/gateway/troubleshooting).

## Garantías de seguridad

- Los clientes del protocolo de Gateway fallan rápidamente cuando Gateway no está disponible (sin retorno implícito al canal directo).
- Los primeros fotogramas no válidos o que no son de conexión se rechazan y cierran.
- El cierre graceful emite el evento `shutdown` antes de cerrar el socket.

---

Relacionado:

- [Troubleshooting](/en/gateway/troubleshooting)
- [Background Process](/en/gateway/background-process)
- [Configuration](/en/gateway/configuration)
- [Health](/en/gateway/health)
- [Doctor](/en/gateway/doctor)
- [Authentication](/en/gateway/authentication)
