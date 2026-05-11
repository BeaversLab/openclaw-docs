---
summary: "Acceso remoto mediante túneles SSH (Gateway WS) y tailnets"
read_when:
  - Running or troubleshooting remote gateway setups
title: "Acceso remoto"
---

Este repositorio admite "remoto a través de SSH" manteniendo una sola pasarela (el maestro) ejecutándose en un host dedicado (escritorio/servidor) y conectando clientes a ella.

- Para **operadores (usted / la aplicación macOS)**: el túnel SSH es el recurso de reserva universal.
- Para **nodos (iOS/Android y dispositivos futuros)**: conéctese a la **WebSocket** de la pasarela (LAN/tailnet o túnel SSH según sea necesario).

## La idea central

- El WebSocket de la pasarela se vincula a **loopback** en su puerto configurado (por defecto 18789).
- Para uso remoto, reenvía ese puerto de loopback a través de SSH (o usa una tailnet/VPN y reduce el uso de túneles).

## Configuraciones comunes de VPN y tailnet

Piense en el **host de la pasarela** como donde reside el agente. Posee las sesiones, perfiles de autenticación, canales y estado. Su portátil, escritorio y nodos se conectan a ese host.

### Pasarela siempre activa en su tailnet

Ejecute la pasarela en un host persistente (VPS o servidor doméstico) y acceda a ella a través de **Tailscale** o SSH.

- **Mejor UX:** mantenga `gateway.bind: "loopback"` y use **Tailscale Serve** para la interfaz de Control.
- **Alternativa:** mantenga loopback más túnel SSH desde cualquier máquina que necesite acceso.
- **Ejemplos:** [exe.dev](/es/install/exe-dev) (VM fácil) o [Hetzner](/es/install/hetzner) (VPS de producción).

Ideal cuando su portátil se suspende a menudo pero desea que el agente esté siempre activo.

### El escritorio doméstico ejecuta la pasarela

El portátil **no** ejecuta el agente. Se conecta de forma remota:

- Use el modo **Remoto a través de SSH** de la aplicación macOS (Configuración → General → OpenClaw se ejecuta).
- La aplicación abre y gestiona el túnel, por lo que WebChat y las comprobaciones de salud funcionan simplemente.

Manual de procedimientos: [acceso remoto macOS](/es/platforms/mac/remote).

### El portátil ejecuta la pasarela

Mantenga la pasarela local pero expongala de forma segura:

- Túnel SSH al portátil desde otras máquinas, o
- Sirva la interfaz de Control con Tailscale y mantenga la pasarela solo en loopback.

Guías: [Tailscale](/es/gateway/tailscale) y [Descripción general web](/es/web).

## Flujo de comandos (qué se ejecuta dónde)

Un servicio de pasarela posee el estado + los canales. Los nodos son periféricos.

Ejemplo de flujo (Telegram → nodo):

- El mensaje de Telegram llega a la **Pasarela**.
- La pasarela ejecuta el **agente** y decide si llamar a una herramienta de nodo.
- La pasarela llama al **nodo** a través del WebSocket de la pasarela (`node.*` RPC).
- El nodo devuelve el resultado; Gateway responde de vuelta a Telegram.

Notas:

- **Los nodos no ejecutan el servicio de puerta de enlace.** Solo se debe ejecutar una puerta de enlace por host, a menos que ejecute intencionalmente perfiles aislados (consulte [Multiple gateways](/es/gateway/multiple-gateways)).
- El “modo nodo” de la aplicación macOS es solo un cliente de nodo a través del WebSocket de Gateway.

## Túnel SSH (CLI + herramientas)

Cree un túnel local al WS de la puerta de enlace remota:

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Con el túnel activo:

- `openclaw health` y `openclaw status --deep` ahora alcanzan la puerta de enlace remota a través de `ws://127.0.0.1:18789`.
- `openclaw gateway status`, `openclaw gateway health`, `openclaw gateway probe` y `openclaw gateway call` también pueden apuntar a la URL reenviada a través de `--url` cuando sea necesario.

<Note>Reemplace `18789` con su `gateway.port` configurado (o `--port` o `OPENCLAW_GATEWAY_PORT`).</Note>

<Warning>Cuando pasa `--url`, la CLI no recurre a las credenciales de configuración o del entorno. Incluya `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.</Warning>

## Valores predeterminados remotos de la CLI

Puede conservar un destino remoto para que los comandos de la CLI lo usen de forma predeterminada:

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      url: "ws://127.0.0.1:18789",
      token: "your-token",
    },
  },
}
```

Cuando la puerta de enlace es solo de bucle de retorno (loopback), mantenga la URL en `ws://127.0.0.1:18789` y abra el túnel SSH primero.
En el transporte de túnel SSH de la aplicación macOS, los nombres de host de puerta de enlace descubiertos pertenecen a
`gateway.remote.sshTarget`; `gateway.remote.url` sigue siendo la URL del túnel local.

## Precedencia de credenciales

La resolución de credenciales de Gateway sigue un contrato compartido en las rutas de llamada/sondeo/estado y el monitoreo de aprobación de ejecución de Discord. Node-host utiliza el mismo contrato base con una excepción en modo local (ignora intencionalmente `gateway.remote.*`):

- Las credenciales explícitas (`--token`, `--password` o la herramienta `gatewayToken`) siempre tienen prioridad en las rutas de llamada que aceptan autenticación explícita.
- Seguridad de anulación de URL:
  - Las anulaciones de URL de la CLI (`--url`) nunca reutilizan credenciales implícitas de configuración/entorno.
  - Las anulaciones de URL de entorno (`OPENCLAW_GATEWAY_URL`) pueden usar solo credenciales de entorno (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valores predeterminados del modo local:
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (el respaldo remoto solo se aplica cuando la entrada del token de autenticación local no está establecida)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (el respaldo remoto solo se aplica cuando la entrada de la contraseña de autenticación local no está establecida)
- Valores predeterminados del modo remoto:
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Excepción de modo local del host del nodo: `gateway.remote.token` / `gateway.remote.password` se ignoran.
- Las verificaciones de token de sondeo/estado remotas son estrictas de forma predeterminada: usan solo `gateway.remote.token` (sin respaldo de token local) cuando se apunta al modo remoto.
- Las anulaciones de entorno de Gateway usan solo `OPENCLAW_GATEWAY_*`.

## Interfaz de usuario de chat a través de SSH

WebChat ya no utiliza un puerto HTTP separado. La interfaz de usuario de chat SwiftUI se conecta directamente al WebSocket de Gateway.

- Reenvíe `18789` a través de SSH (ver arriba), luego conecte los clientes a `ws://127.0.0.1:18789`.
- En macOS, prefiera el modo "Remoto a través de SSH" de la aplicación, que gestiona el túnel automáticamente.

## App de macOS Remote over SSH

La aplicación de la barra de menús de macOS puede gestionar la misma configuración de extremo a extremo (verificaciones de estado remotas, WebChat y reenvío de activación por voz).

Manual de procedimientos: [acceso remoto de macOS](/es/platforms/mac/remote).

## Reglas de seguridad (remoto/VPN)

Versión corta: **mantenga el Gateway solo en loopback** a menos que esté seguro de que necesita un enlace.

- **Loopback + SSH/Tailscale Serve** es la opción predeterminada más segura (sin exposición pública).
- El texto sin cifrar `ws://` es solo de bucle local (loopback) de forma predeterminada. Para redes privadas de confianza,
  establezca `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el proceso del cliente como
  medida de emergencia. No hay equivalente `openclaw.json`; esto debe ser el entorno de
  proceso para el cliente que realiza la conexión WebSocket.
- Los **enlaces no bucle local** (`lan`/`tailnet`/`custom`, o `auto` cuando el bucle local no está disponible) deben usar autenticación de puerta de enlace: token, contraseña o un proxy inverso con reconocimiento de identidad con `gateway.auth.mode: "trusted-proxy"`.
- `gateway.remote.token` / `.password` son fuentes de credenciales del cliente. Por sí mismos, **no** configuran la autenticación del servidor.
- Las rutas de llamadas locales pueden usar `gateway.remote.*` como respaldo solo cuando `gateway.auth.*` no está establecido.
- Si `gateway.auth.token` / `gateway.auth.password` está configurado explícitamente a través de SecretRef y sin resolver, la resolución falla cerrada (sin enmascaramiento de respaldo remoto).
- `gateway.remote.tlsFingerprint` fija el certificado TLS remoto cuando se usa `wss://`.
- **Tailscale Serve** puede autenticar el tráfico de la Interfaz de usuario de control/WebSocket a través de encabezados de identidad cuando `gateway.auth.allowTailscale: true`; los puntos finales de la API HTTP no usan esa autenticación de encabezado de Tailscale y, en su lugar, siguen el modo de autenticación HTTP normal de la puerta de enlace. Este flujo sin token asume que el host de la puerta de enlace es confiable. Establézcalo en `false` si desea autenticación de secreto compartido en todas partes.
- La autenticación de **proxy de confianza** es solo para configuraciones de proxy con reconocimiento de identidad que no sean de bucle invertido. Los proxies inversos de bucle invertido del mismo host no cumplen con `gateway.auth.mode: "trusted-proxy"`.
- Trate el control del navegador como el acceso del operador: solo tailnet + emparejamiento deliberado de nodos.

Profundización: [Seguridad](/es/gateway/security).

### macOS: túnel SSH persistente mediante LaunchAgent

Para clientes macOS que se conectan a una puerta de enlace remota, la configuración persistente más fácil utiliza una entrada de configuración `LocalForward` de SSH más un LaunchAgent para mantener el túnel activo a través de reinicios y bloqueos.

#### Paso 1: agregar configuración SSH

Edite `~/.ssh/config`:

```ssh
Host remote-gateway
    HostName <REMOTE_IP>
    User <REMOTE_USER>
    LocalForward 18789 127.0.0.1:18789
    IdentityFile ~/.ssh/id_rsa
```

Reemplace `<REMOTE_IP>` y `<REMOTE_USER>` con sus valores.

#### Paso 2: copiar clave SSH (una sola vez)

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### Paso 3: configurar el token de la puerta de enlace

Guarde el token en la configuración para que persista a través de los reinicios:

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### Paso 4: crear el LaunchAgent

Guarde esto como `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>ai.openclaw.ssh-tunnel</string>
    <key>ProgramArguments</key>
    <array>
        <string>/usr/bin/ssh</string>
        <string>-N</string>
        <string>remote-gateway</string>
    </array>
    <key>KeepAlive</key>
    <true/>
    <key>RunAtLoad</key>
    <true/>
</dict>
</plist>
```

#### Paso 5: cargar el LaunchAgent

```bash
launchctl bootstrap gui/$UID ~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist
```

El túnel se iniciará automáticamente al iniciar sesión, se reiniciará en caso de fallo y mantendrá el puerto reenviado activo.

<Note>Si tiene un LaunchAgent `com.openclaw.ssh-tunnel` restante de una configuración anterior, descárguelo y elimínelo.</Note>

#### Solución de problemas

Compruebe si el túnel se está ejecutando:

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

Reiniciar el túnel:

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

Detener el túnel:

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| Entrada de configuración             | Lo que hace                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | Reenvía el puerto local 18789 al puerto remoto 18789             |
| `ssh -N`                             | SSH sin ejecutar comandos remotos (solo reenvío de puerto)       |
| `KeepAlive`                          | Reinicia automáticamente el túnel si falla                       |
| `RunAtLoad`                          | Inicia el túnel cuando el LaunchAgent se carga al iniciar sesión |

## Relacionado

- [Tailscale](/es/gateway/tailscale)
- [Autenticación](/es/gateway/authentication)
- [Configuración de puerta de enlace remota](/es/gateway/remote-gateway-readme)
