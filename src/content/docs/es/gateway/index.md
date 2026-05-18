---
summary: "Manual de operaciones para el servicio Gateway, ciclo de vida y operaciones"
read_when:
  - Running or debugging the gateway process
title: "Manual de operaciones del Gateway"
---

Use esta página para el inicio del día 1 y las operaciones del día 2 del servicio Gateway.

<CardGroup cols={2}>
  <Card title="Solución profunda de problemas" icon="siren" href="/es/gateway/troubleshooting">
    Diagnóstico basado en síntomas con escalas de comandos exactas y firmas de registros.
  </Card>
  <Card title="Configuración" icon="sliders" href="/es/gateway/configuration">
    Guía de configuración orientada a tareas + referencia de configuración completa.
  </Card>
  <Card title="Gestión de secretos" icon="key-round" href="/es/gateway/secrets">
    Contrato SecretRef, comportamiento de instantánea en tiempo de ejecución y operaciones de migración/recarga.
  </Card>
  <Card title="Contrato del plan de secretos" icon="shield-check" href="/es/gateway/secrets-plan-contract">
    Reglas exactas de `secrets apply` destino/ruta y comportamiento del perfil de autenticación de solo referencia.
  </Card>
</CardGroup>

## Inicio local en 5 minutos

<Steps>
  <Step title="Iniciar el Gateway">

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

Línea base saludable: `Runtime: running`, `Connectivity probe: ok` y `Capability: ...` que coincidan con lo que espera. Use `openclaw gateway status --require-rpc` cuando necesite una prueba de RPC con ámbito de lectura, no solo accesibilidad.

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
  La recarga de la configuración del Gateway observa la ruta del archivo de configuración activo (resuelta a partir de los valores predeterminados de perfil/estado, o `OPENCLAW_CONFIG_PATH` cuando se establece). El modo predeterminado es `gateway.reload.mode="hybrid"`. Después de la primera carga exitosa, el proceso en ejecución sirve la instantánea de configuración activa en memoria; una recarga
  exitosa intercambia esa instantánea atómicamente.
</Note>

## Modelo de tiempo de ejecución

- Un proceso siempre activo para el enrutamiento, el plano de control y las conexiones del canal.
- Un puerto multiplexado único para:
  - Control/RPC de WebSocket
  - APIs HTTP (`/v1/models`, `/v1/embeddings`, `/v1/chat/completions`, `/v1/responses`, `/tools/invoke`)
  - Rutas HTTP de complementos, como el opcional `/api/v1/admin/rpc`
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

- La mayoría de las integraciones de Open WebUI, LobeChat y LibreChat prueban `/v1/models` primero.
- Muchos pipelines de RAG y memoria esperan `/v1/embeddings`.
- Los clientes nativos de agentes cada vez prefieren más `/v1/responses`.

Nota de planificación:

- `/v1/models` está optimizado para agentes: devuelve `openclaw`, `openclaw/default` y `openclaw/<agentId>`.
- `openclaw/default` es el alias estable que siempre se asigna al agente predeterminado configurado.
- Use `x-openclaw-model` cuando desee una anulación de proveedor/modelo de backend; de lo contrario, la configuración normal de modelo e incrustación del agente seleccionado mantiene el control.

Todos estos se ejecutan en el puerto principal de Gateway y usan el mismo límite de autenticación de operador de confianza que el resto de la API HTTP de Gateway.

Admin HTTP RPC (`POST /api/v1/admin/rpc`) es una ruta de complemento separada, desactivada de forma predeterminada, para herramientas de host que no pueden usar WebSocket RPC. Consulte [Admin HTTP RPC](/es/plugins/admin-http-rpc).

### Puerto y precedencia de enlace

| Configuración     | Orden de resolución                                           |
| ----------------- | ------------------------------------------------------------- |
| Puerto de Gateway | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Modo de enlace    | CLI/anulación → `gateway.bind` → `loopback`                   |

Los servicios de gateway instalados registran el `--port` resuelto en los metadatos del supervisor. Después de cambiar `gateway.port`, ejecute `openclaw doctor --fix` o `openclaw gateway install --force` para que launchd/systemd/schtasks inicie el proceso en el nuevo puerto.

El inicio del gateway utiliza el mismo puerto y enlace efectivos cuando inicializa los orígenes locales de la Interfaz de usuario de control (Control UI) para enlaces que no son de bucle local (loopback). Por ejemplo, `--bind lan --port 3000` inicializa `http://localhost:3000` y `http://127.0.0.1:3000` antes de que se ejecute la validación en tiempo de ejecución. Agregue cualquier origen de navegador remoto, como URL de proxy HTTPS, a `gateway.controlUi.allowedOrigins` explícitamente.

### Modos de recarga en caliente

| `gateway.reload.mode`     | Comportamiento                                                        |
| ------------------------- | --------------------------------------------------------------------- |
| `off`                     | Sin recarga de configuración                                          |
| `hot`                     | Aplicar solo cambios seguros en caliente                              |
| `restart`                 | Reiniciar ante cambios que requieran recarga                          |
| `hybrid` (predeterminado) | Aplicar en caliente cuando sea seguro, reiniciar cuando sea necesario |

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

`gateway status --deep` sirve para el descubrimiento de servicios adicional (LaunchDaemons/unidades de sistema systemd/schtasks), no para una sonda de estado RPC más profunda.

## Múltiples gateways (mismo host)

La mayoría de las instalaciones deberían ejecutar un gateway por máquina. Un solo gateway puede alojar múltiples agentes y canales.

Solo necesita múltiples gateways cuando desea intencionalmente aislamiento o un bot de rescate.

Verificaciones útiles:

```bash
openclaw gateway status --deep
openclaw gateway probe
```

Qué esperar:

- `gateway status --deep` puede informar `Other gateway-like services detected (best effort)`
  e imprimir sugerencias de limpieza cuando las instalaciones obsoletas de launchd/systemd/schtasks todavía están presentes.
- `gateway probe` puede advertir sobre `multiple reachable gateways` cuando más de un objetivo
  responde.
- Si eso es intencional, aisle los puertos, la configuración/estado y las raíces del espacio de trabajo por cada gateway.

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

Configuración detallada: [/gateway/multiple-gateways](/es/gateway/multiple-gateways).

## Acceso remoto

Preferido: Tailscale/VPN.
Alternativa: Túnel SSH.

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Luego conecte los clientes localmente a `ws://127.0.0.1:18789`.

<Warning>Los túneles SSH no evitan la autenticación de la puerta de enlace. Para la autenticación de secreto compartido, los clientes aún deben enviar `token`/`password` incluso a través del túnel. Para los modos con identidad, la solicitud aún debe satisfacer esa ruta de autenticación.</Warning>

Consulte: [Remote Gateway](/es/gateway/remote), [Authentication](/es/gateway/authentication), [Tailscale](/es/gateway/tailscale).

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

Use `openclaw gateway restart` para los reinicios. No encadene `openclaw gateway stop` y `openclaw gateway start` como un sustituto de reinicio.

En macOS, `gateway stop` usa `launchctl bootout` de manera predeterminada; esto elimina el LaunchAgent de la sesión de arranque actual sin persistir una desactivación, por lo que la recuperación automática de KeepAlive aún funciona después de bloqueos inesperados y `gateway start` se vuelve a habilitar limpiamente. Para suprimir persistentemente el reinicio automático entre reinicios, pase `--disable`: `openclaw gateway stop --disable`.

Las etiquetas de LaunchAgent son `ai.openclaw.gateway` (predeterminado) o `ai.openclaw.<profile>` (perfil con nombre). `openclaw doctor` audita y repara la deriva de la configuración del servicio.

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

Ejemplo manual de unidad de usuario cuando necesita una ruta de instalación personalizada:

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

El inicio administrado nativo de Windows usa una Tarea Programada llamada `OpenClaw Gateway`
(o `OpenClaw Gateway (<profile>)` para perfiles con nombre). Si se deniega la creación de la Tarea Programada,
OpenClaw recurre a un iniciador de carpeta de Inicio por usuario
que apunta a `gateway.cmd` dentro del directorio de estado.

  </Tab>

  <Tab title="Linux (system service)">

Use una unidad de sistema para hosts multiusuario/siempre activos.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

Use el mismo cuerpo de servicio que la unidad de usuario, pero instálelo bajo
`/etc/systemd/system/openclaw-gateway[-<profile>].service` y ajuste
`ExecStart=` si su binario `openclaw` se encuentra en otro lugar.

No permita tampoco que `openclaw doctor --fix` instale un servicio de puerta de enlace a nivel de usuario para el mismo perfil/puerto. Doctor rechaza esa instalación automática cuando encuentra un servicio de puerta de enlace OpenClaw a nivel de sistema; use `OPENCLAW_SERVICE_REPAIR_POLICY=external` cuando la unidad del sistema sea propietaria del ciclo de vida.

  </Tab>
</Tabs>

## Ruta rápida del perfil de desarrollo

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Los valores predeterminados incluyen estado/configuración aislados y puerto base de puerta de enlace `19001`.

## Referencia rápida del protocolo (vista del operador)

- El primer tramo del cliente debe ser `connect`.
- La puerta de enlace devuelve una instantánea `hello-ok` (`presence`, `health`, `stateVersion`, `uptimeMs`, límites/política).
- `hello-ok.features.methods` / `events` son una lista de descubrimiento conservadora, no
  un volcado generado de cada ruta auxiliar invocable.
- Solicitudes: `req(method, params)` → `res(ok/payload|error)`.
- Los eventos comunes incluyen `connect.challenge`, `agent`, `chat`,
  `session.message`, `session.operation`, `session.tool`, `sessions.changed`,
  `presence`, `tick`, `health`, `heartbeat`, eventos del ciclo de vida de emparejamiento/aprobación,
  y `shutdown`.

Las ejecuciones del agente son de dos etapas:

1. Reconocimiento de aceptación inmediata (`status:"accepted"`)
2. Respuesta de finalización final (`status:"ok"|"error"`), con eventos `agent` transmitidos en el medio.

Consulte la documentación completa del protocolo: [Gateway Protocol](/es/gateway/protocol).

## Verificaciones operativas

### Vitalidad

- Abra WS y envíe `connect`.
- Espere respuesta `hello-ok` con instantánea.

### Disponibilidad

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Recuperación de brechas

Los eventos no se repiten. En caso de brechas en la secuencia, actualice el estado (`health`, `system-presence`) antes de continuar.

## Firmas comunes de fallos

| Firma                                                          | Problema probable                                                                                   |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `refusing to bind gateway ... without auth`                    | Enlace no local sin una ruta de autenticación válida para la puerta de enlace                       |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflicto de puerto                                                                                 |
| `Gateway start blocked: set gateway.mode=local`                | Configuración establecida en modo remoto o falta la marca de modo local en una configuración dañada |
| `unauthorized` durante la conexión                             | Discrepancia de autenticación entre el cliente y la puerta de enlace                                |

Para obtener escaleras de diagnóstico completas, utilice [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting).

## Garantías de seguridad

- Los clientes del protocolo de la puerta de enlace fallan rápidamente cuando la puerta de enlace no está disponible (no hay retorno implícito al canal directo).
- Los primeros marcos no válidos o de no conexión se rechazan y cierran.
- El cierre ordenado emite el evento `shutdown` antes de cerrar el socket.

---

Relacionado:

- [Solución de problemas](/es/gateway/troubleshooting)
- [Proceso en segundo plano](/es/gateway/background-process)
- [Configuración](/es/gateway/configuration)
- [Salud](/es/gateway/health)
- [Doctor](/es/gateway/doctor)
- [Autenticación](/es/gateway/authentication)

## Relacionado

- [Configuración](/es/gateway/configuration)
- [Solución de problemas de la puerta de enlace](/es/gateway/troubleshooting)
- [Acceso remoto](/es/gateway/remote)
- [Gestión de secretos](/es/gateway/secrets)
