---
summary: "Aplicación complementaria de OpenClaw para macOS (barra de menús + intermediario de puerta de enlace)"
read_when:
  - Implementing macOS app features
  - Changing gateway lifecycle or node bridging on macOS
title: "App de macOS"
---

# OpenClaw macOS Companion (barra de menús + intermediario de puerta de enlace)

La aplicación de macOS es el **complemento de la barra de menús** para OpenClaw. Es dueña de los permisos,
administra/adjunta la Puerta de enlace localmente (launchd o manual) y expone las capacidades de
macOS al agente como un nodo.

## Lo que hace

- Muestra notificaciones nativas y el estado en la barra de menús.
- Es dueña de los avisos de TCC (Notificaciones, Accesibilidad, Grabación de pantalla, Micrófono,
  Reconocimiento de voz, Automatización/AppleScript).
- Ejecuta o se conecta a la Puerta de enlace (local o remota).
- Expone herramientas exclusivas de macOS (Canvas, Cámara, Grabación de pantalla, `system.run`).
- Inicia el servicio host del nodo local en modo **remoto** (launchd) y lo detiene en modo **local**.
- Opcionalmente aloja **PeekabooBridge** para la automatización de la interfaz de usuario.
- Instala la CLI global (`openclaw`) a pedido mediante npm, pnpm o bun (la aplicación prefiere npm, luego pnpm y luego bun; Node sigue siendo el tiempo de ejecución recomendado para Gateway).

## Modo local vs. remoto

- **Local** (predeterminado): la aplicación se adjunta a una Puerta de enlace local en ejecución si está presente;
  de lo contrario, habilita el servicio launchd a través de `openclaw gateway install`.
- **Remoto**: la aplicación se conecta a un Gateway a través de SSH/Tailscale y nunca inicia
  un proceso local.
  La aplicación inicia el **servicio host del nodo** local para que el Gateway remoto pueda alcanzar este Mac.
  La aplicación no genera el Gateway como un proceso secundario.
  El descubrimiento de Gateway ahora prefiere los nombres de MagicDNS de Tailscale sobre las IPs de tailnet sin procesar,
  por lo que la aplicación Mac se recupera de manera más confiable cuando las IPs de tailnet cambian.

## Control de Launchd

La aplicación administra un LaunchAgent por usuario etiquetado como `ai.openclaw.gateway`
(o `ai.openclaw.<profile>` cuando se usa `--profile`/`OPENCLAW_PROFILE`; el `com.openclaw.*` heredado todavía se descarga).

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.gateway
launchctl bootout gui/$UID/ai.openclaw.gateway
```

Reemplace la etiqueta con `ai.openclaw.<profile>` al ejecutar un perfil con nombre.

Si el LaunchAgent no está instalado, habilítelo desde la aplicación o ejecute
`openclaw gateway install`.

## Capacidades del nodo (mac)

La aplicación de macOS se presenta a sí misma como un nodo. Comandos comunes:

- Canvas: `canvas.present`, `canvas.navigate`, `canvas.eval`, `canvas.snapshot`, `canvas.a2ui.*`
- Cámara: `camera.snap`, `camera.clip`
- Pantalla: `screen.snapshot`, `screen.record`
- Sistema: `system.run`, `system.notify`

El nodo reporta un mapa `permissions` para que los agentes puedan decidir qué está permitido.

Servicio de nodo + IPC de la aplicación:

- Cuando se está ejecutando el servicio host del nodo sin interfaz gráfica (modo remoto), se conecta al WebSocket de la puerta de enlace (Gateway WS) como nodo.
- `system.run` se ejecuta en la aplicación de macOS (contexto de IU/TCC) a través de un socket Unix local; las solicitudes y la salida permanecen en la aplicación.

Diagrama (SCI):

```
Gateway -> Node Service (WS)
                 |  IPC (UDS + token + HMAC + TTL)
                 v
             Mac App (UI + TCC + system.run)
```

## Aprobaciones de ejecución (system.run)

`system.run` está controlado por **Aprobaciones de ejecución** en la aplicación de macOS (Configuración → Aprobaciones de ejecución).
Seguridad + preguntar + lista blanca se almacenan localmente en el Mac en:

```
~/.openclaw/exec-approvals.json
```

Ejemplo:

```json
{
  "version": 1,
  "defaults": {
    "security": "deny",
    "ask": "on-miss"
  },
  "agents": {
    "main": {
      "security": "allowlist",
      "ask": "on-miss",
      "allowlist": [{ "pattern": "/opt/homebrew/bin/rg" }]
    }
  }
}
```

Notas:

- Las entradas `allowlist` son patrones glob para rutas binarias resueltas.
- El texto de comando de shell sin procesar que contiene sintaxis de control o expansión de shell (`&&`, `||`, `;`, `|`, `` ` ``, `$`, `<`, `>`, `(`, `)`) se trata como un fallo en la lista blanca y requiere aprobación explícita (o poner el binario de shell en la lista blanca).
- Al elegir "Permitir siempre" en el aviso, se añade ese comando a la lista de permitidos.
- Las anulaciones de entorno de `system.run` se filtran (elimina `PATH`, `DYLD_*`, `LD_*`, `NODE_OPTIONS`, `PYTHON*`, `PERL*`, `RUBYOPT`, `SHELLOPTS`, `PS4`) y luego se fusionan con el entorno de la aplicación.
- Para los contenedores de shell (`bash|sh|zsh ... -c/-lc`), las anulaciones de entorno con alcance de solicitud se reducen a una pequeña lista blanca explícita (`TERM`, `LANG`, `LC_*`, `COLORTERM`, `NO_COLOR`, `FORCE_COLOR`).
- Para decisiones de permitir siempre en modo de lista blanca, los contenedores de envío conocidos (`env`, `nice`, `nohup`, `stdbuf`, `timeout`) persisten las rutas de los ejecutables internos en lugar de las rutas de los contenedores. Si el desenvolver no es seguro, no se persiste ninguna entrada de lista blanca automáticamente.

## Enlaces profundos

La aplicación registra el esquema de URL `openclaw://` para acciones locales.

### `openclaw://agent`

Desencadena una solicitud `agent` del Gateway.

```bash
open 'openclaw://agent?message=Hello%20from%20deep%20link'
```

Parámetros de consulta:

- `message` (obligatorio)
- `sessionKey` (opcional)
- `thinking` (opcional)
- `deliver` / `to` / `channel` (opcional)
- `timeoutSeconds` (opcional)
- `key` (clave de modo desatendido opcional)

Seguridad:

- Sin `key`, la aplicación solicita confirmación.
- Sin `key`, la aplicación aplica un límite breve de mensaje para el mensaje de confirmación e ignora `deliver` / `to` / `channel`.
- Con un `key` válido, la ejecución es desatendida (destinada a automatizaciones personales).

## Flujo de incorporación (típico)

1. Instale e inicie **OpenClaw.app**.
2. Complete la lista de verificación de permisos (indicaciones TCC).
3. Asegúrese de que el modo **Local** esté activo y de que el Gateway se esté ejecutando.
4. Instale la CLI si desea acceso a la terminal.

## Ubicación del directorio de estado (macOS)

Evite colocar su directorio de estado de OpenClaw en iCloud u otras carpetas sincronizadas en la nube.
Las rutas con respaldo de sincronización pueden agregar latencia y ocasionalmente causar bloqueos de archivos / carreras de sincronización para
sesiones y credenciales.

Prefiera una ruta de estado local no sincronizada, como:

```bash
OPENCLAW_STATE_DIR=~/.openclaw
```

Si `openclaw doctor` detecta estado bajo:

- `~/Library/Mobile Documents/com~apple~CloudDocs/...`
- `~/Library/CloudStorage/...`

avisará y recomendará volver a una ruta local.

## Flujo de trabajo de compilación y desarrollo (nativo)

- `cd apps/macos && swift build`
- `swift run OpenClaw` (o Xcode)
- Empaquetar aplicación: `scripts/package-mac-app.sh`

## Depurar la conectividad del Gateway (CLI de macOS)

Use la CLI de depuración para ejecutar el mismo protocolo de enlace WebSocket de Gateway y la lógica de descubrimiento que usa la aplicación de macOS, sin iniciar la aplicación.

```bash
cd apps/macos
swift run openclaw-mac connect --json
swift run openclaw-mac discover --timeout 3000 --json
```

Opciones de conexión:

- `--url <ws://host:port>`: anular configuración
- `--mode <local|remote>`: resolver desde la configuración (predeterminado: configuración o local)
- `--probe`: forzar un nuevo sondeo de estado
- `--timeout <ms>`: tiempo de espera de la solicitud (predeterminado: `15000`)
- `--json`: salida estructurada para comparación

Opciones de descubrimiento:

- `--include-local`: incluir gateways que se filtrarían como "locales"
- `--timeout <ms>`: ventana de descubrimiento general (predeterminado: `2000`)
- `--json`: salida estructurada para comparación

Tip: compare against `openclaw gateway discover --json` to see whether the
macOS app’s discovery pipeline (`local.` plus the configured wide-area domain, with
wide-area and Tailscale Serve fallbacks) differs from
the Node CLI’s `dns-sd` based discovery.

## Plomería de conexión remota (túneles SSH)

Cuando la aplicación de macOS se ejecuta en modo **Remoto**, abre un túnel SSH para que los componentes de la interfaz de usuario local puedan comunicarse con un Gateway remoto como si estuviera en localhost.

### Túnel de control (puerto WebSocket del Gateway)

- **Propósito:** comprobaciones de estado, estado, Web Chat, configuración y otras llamadas al plano de control.
- **Local port:** el puerto del Gateway (por defecto `18789`), siempre estable.
- **Puerto remoto:** el mismo puerto del Gateway en el host remoto.
- **Comportamiento:** sin puerto local aleatorio; la aplicación reutiliza un túnel existente y saludable o lo reinicia si es necesario.
- **SSH shape:** `ssh -N -L <local>:127.0.0.1:<remote>` con las opciones BatchMode +
  ExitOnForwardFailure + keepalive.
- **IP reporting:** el túnel SSH usa loopback, por lo que el gateway verá la IP
  del nodo como `127.0.0.1`. Use el transporte **Direct (ws/wss)** si desea que aparezca la IP real
  del cliente (consulte [macOS remote access](/es/platforms/mac/remote)).

For setup steps, see [macOS remote access](/es/platforms/mac/remote). For protocol
details, see [Gateway protocol](/es/gateway/protocol).

## Documentos relacionados

- [Gateway runbook](/es/gateway)
- [Gateway (macOS)](/es/platforms/mac/bundled-gateway)
- [macOS permissions](/es/platforms/mac/permissions)
- [Canvas](/es/platforms/mac/canvas)
