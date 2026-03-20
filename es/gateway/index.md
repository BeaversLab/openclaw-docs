---
summary: "Manual del servicio Gateway, ciclo de vida y operaciones"
read_when:
  - Ejecución o depuración del proceso gateway
title: "Manual del Gateway"
---

# Manual de procedimientos de Gateway

Utilice esta página para el inicio inicial (día-1) y las operaciones posteriores (día-2) del servicio Gateway.

<CardGroup cols={2}>
  <Card title="Solución de problemas profunda" icon="siren" href="/es/gateway/troubleshooting">
    Diagnóstico basado en síntomas con escalas de comandos exactas y firmas de registro.
  </Card>
  <Card title="Configuración" icon="sliders" href="/es/gateway/configuration">
    Guía de configuración orientada a tareas + referencia de configuración completa.
  </Card>
  <Card title="Gestión de secretos" icon="key-round" href="/es/gateway/secrets">
    Contrato SecretRef, comportamiento de la instantánea en tiempo de ejecución y operaciones de migración/recarga.
  </Card>
  <Card title="Contrato del plan de secretos" icon="shield-check" href="/es/gateway/secrets-plan-contract">
    Reglas exactas de `secrets apply` objetivo/ruta y comportamiento de perfil de autenticación solo de referencia.
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

  </Step>
</Steps>

<Note>
La recarga de la configuración del Gateway observa la ruta del archivo de configuración activo (resuelta desde los valores predeterminados de perfil/estado, o `OPENCLAW_CONFIG_PATH` cuando se establece).
El modo predeterminado es `gateway.reload.mode="hybrid"`.
</Note>

## Modelo de tiempo de ejecución

- Un proceso siempre activo para el enrutamiento, el plano de control y las conexiones del canal.
- Un puerto multiplexado único para:
  - Control/RPC de WebSocket
  - APIs HTTP (compatibles con OpenAI, Responses, invocación de herramientas)
  - Interfaz de usuario de control y enlaces (hooks)
- Modo de vinculación predeterminado: `loopback`.
- La autenticación es requerida de manera predeterminada (`gateway.auth.token` / `gateway.auth.password`, o `OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).

### Puerto y precedencia de enlace

| Configuración      | Orden de resolución                                              |
| ------------ | ------------------------------------------------------------- |
| Puerto de Gateway | `--port` → `OPENCLAW_GATEWAY_PORT` → `gateway.port` → `18789` |
| Modo de enlace    | CLI/sobrescritura → `gateway.bind` → `loopback`                    |

### Modos de recarga en caliente

| `gateway.reload.mode` | Comportamiento                                   |
| --------------------- | ------------------------------------------ |
| `off`                 | Sin recarga de configuración                           |
| `hot`                 | Aplicar solo cambios seguros en caliente                |
| `restart`             | Reiniciar ante cambios que requieran recarga         |
| `hybrid` (predeterminado)    | Aplicación en caliente cuando sea seguro, reinicio cuando sea necesario |

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
Si la autenticación de la puerta de enlace está configurada, los clientes aún deben enviar autenticación (`token`/`password`) incluso a través de túneles SSH.
</Warning>

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

Use una unidad del sistema para hosts multiusuario/siempre activos.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now openclaw-gateway[-<profile>].service
```

  </Tab>
</Tabs>

## Múltiples gateways en un solo host

La mayoría de las configuraciones deberían ejecutar **una** sola puerta de enlace (Gateway).
Use múltiples solo para aislamiento estricto/redundancia (por ejemplo, un perfil de rescate).

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

Consulte: [Multiple gateways](/es/gateway/multiple-gateways).

### Ruta rápida del perfil de desarrollo

```bash
openclaw --dev setup
openclaw --dev gateway --allow-unconfigured
openclaw --dev status
```

Los valores predeterminados incluyen estado/configuración aislados y el puerto base de la puerta de enlace `19001`.

## Referencia rápida del protocolo (vista de operador)

- El primer trama del cliente debe ser `connect`.
- La puerta de enlace devuelve una instantánea `hello-ok` (`presence`, `health`, `stateVersion`, `uptimeMs`, límites/políticas).
- Solicitudes: `req(method, params)` → `res(ok/payload|error)`.
- Eventos comunes: `connect.challenge`, `agent`, `chat`, `presence`, `tick`, `health`, `heartbeat`, `shutdown`.

Las ejecuciones del agente son de dos etapas:

1. Reconocimiento inmediato aceptado (`status:"accepted"`)
2. Respuesta de finalización completa (`status:"ok"|"error"`), con eventos `agent` transmitidos en medio.

Ver documentación completa del protocolo: [Gateway Protocol](/es/gateway/protocol).

## Verificaciones operativas

### Vitalidad

- Abrir WS y enviar `connect`.
- Esperar respuesta `hello-ok` con instantánea.

### Disponibilidad

```bash
openclaw gateway status
openclaw channels status --probe
openclaw health
```

### Recuperación de brechas

Los eventos no se reproducen. Ante lagunas en la secuencia, actualizar el estado (`health`, `system-presence`) antes de continuar.

## Firmas de fallos comunes

| Firma                                                      | Problema probable                             |
| -------------------------------------------------------------- | ---------------------------------------- |
| `refusing to bind gateway ... without auth`                    | Enlace sin bucle invertido sin token/contraseña |
| `another gateway instance is already listening` / `EADDRINUSE` | Conflicto de puerto                            |
| `Gateway start blocked: set gateway.mode=local`                | Configuración establecida en modo remoto                |
| `unauthorized` durante la conexión                                  | Discrepancia de autenticación entre el cliente y el gateway |

Para escaleras de diagnóstico completas, use [Gateway Troubleshooting](/es/gateway/troubleshooting).

## Garantías de seguridad

- Los clientes del protocolo Gateway fallan rápido cuando el Gateway no está disponible (no hay retorno implícito al canal directo).
- Los primeros frames no válidos o que no son de conexión se rechazan y se cierran.
- El apagado elegante emite el evento `shutdown` antes de cerrar el socket.

---

Relacionado:

- [Solución de problemas](/es/gateway/troubleshooting)
- [Proceso en segundo plano](/es/gateway/background-process)
- [Configuración](/es/gateway/configuration)
- [Salud](/es/gateway/health)
- [Doctor](/es/gateway/doctor)
- [Autenticación](/es/gateway/authentication)

import en from "/components/footer/en.mdx";

<en />
