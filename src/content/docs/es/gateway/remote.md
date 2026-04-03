---
summary: "Acceso remoto mediante túneles SSH (Gateway WS) y tailnets"
read_when:
  - Running or troubleshooting remote gateway setups
title: "Acceso remoto"
---

# Acceso remoto (SSH, túneles y redes tail)

Este repositorio admite "remoto a través de SSH" manteniendo una única puerta de enlace (Gateway) (el maestro) ejecutándose en un host dedicado (escritorio/servidor) y conectando clientes a ella.

- Para **operadores (tú / la aplicación macOS)**: el túnel SSH es el respaldo universal.
- Para **nodos (iOS/Android y dispositivos futuros)**: conéctese al **WebSocket** de la puerta de enlace (LAN/red tail o túnel SSH según sea necesario).

## La idea central

- El WebSocket de la puerta de enlace se vincula a **loopback** en su puerto configurado (predeterminado: 18789).
- Para uso remoto, reenvíe ese puerto de loopback a través de SSH (o use una red tail/VPN y túneles menos).

## Configuraciones comunes de VPN/red tail (dónde reside el agente)

Piense en el **host de la puerta de enlace** como "donde reside el agente". Es propietario de las sesiones, perfiles de autenticación, canales y estado.
Su portátil/escritorio (y nodos) se conectan a ese host.

### 1) Puerta de enlace siempre activa en su red tail (VPS o servidor doméstico)

Ejecute la puerta de enlace en un host persistente y acceda a ella a través de **Tailscale** o SSH.

- **Mejor UX:** mantenga `gateway.bind: "loopback"` y use **Tailscale Serve** para la interfaz de control.
- **Respaldo:** mantenga loopback + túnel SSH desde cualquier máquina que necesite acceso.
- **Ejemplos:** [exe.dev](/en/install/exe-dev) (VM fácil) o [Hetzner](/en/install/hetzner) (VPS de producción).

Esto es ideal cuando su portátil se suspende a menudo, pero desea que el agente esté siempre activo.

### 2) El escritorio doméstico ejecuta la puerta de enlace, el portátil es el control remoto

El portátil **no** ejecuta el agente. Se conecta de forma remota:

- Use el modo **Remoto a través de SSH** de la aplicación macOS (Configuración → General → "OpenClaw runs").
- La aplicación abre y gestiona el túnel, por lo que WebChat + verificaciones de salud "simplemente funcionan".

Manual de operaciones: [acceso remoto de macOS](/en/platforms/mac/remote).

### 3) El portátil ejecuta la puerta de enlace, acceso remoto desde otras máquinas

Mantenga la puerta de enlace local pero exponga de forma segura:

- Túnel SSH al portátil desde otras máquinas, o
- Sirva la interfaz de usuario de control con Tailscale Serve y mantenga la puerta de enlace solo loopback.

Guía: [Tailscale](/en/gateway/tailscale) y [visión general web](/en/web).

## Flujo de comandos (qué se ejecuta dónde)

Un servicio de puerta de enlace posee el estado + los canales. Los nodos son periféricos.

Ejemplo de flujo (Telegram → nodo):

- El mensaje de Telegram llega al **Gateway**.
- El Gateway ejecuta el **agente** y decide si llamar a una herramienta del nodo.
- Gateway llama al **nodo** a través del Gateway WebSocket (`node.*` RPC).
- El nodo devuelve el resultado; el Gateway responde de nuevo a Telegram.

Notas:

- **Los nodos no ejecutan el servicio gateway.** Solo se debe ejecutar un gateway por host, a menos que intencionalmente ejecute perfiles aislados (consulte [Múltiples gateways](/en/gateway/multiple-gateways)).
- El "modo nodo" de la aplicación macOS es solo un cliente de nodo a través del WebSocket del Gateway.

## Túnel SSH (CLI + herramientas)

Cree un túnel local al WS del Gateway remoto:

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Con el túnel activo:

- `openclaw health` y `openclaw status --deep` ahora alcanzan el gateway remoto a través de `ws://127.0.0.1:18789`.
- `openclaw gateway {status,health,send,agent,call}` también puede apuntar a la URL reenviada a través de `--url` cuando sea necesario.

Nota: reemplace `18789` con su `gateway.port` configurado (o `--port`/`OPENCLAW_GATEWAY_PORT`).
Nota: cuando pasa `--url`, la CLI no recurre a credenciales de configuración o de entorno.
Incluya `--token` o `--password` explícitamente. La falta de credenciales explícitas es un error.

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

Cuando el gateway es solo loopback, mantenga la URL en `ws://127.0.0.1:18789` y abra primero el túnel SSH.

## Precedencia de credenciales

La resolución de credenciales del Gateway sigue un contrato compartido en las rutas de llamada/sondeo/estado y el monitoreo de aprobación de ejecución de Discord. Node-host utiliza el mismo contrato base con una excepción en modo local (ignora intencionalmente `gateway.remote.*`):

- Las credenciales explícitas (`--token`, `--password` o herramienta `gatewayToken`) siempre tienen prioridad en las rutas de llamada que aceptan autenticación explícita.
- Seguridad de anulación de URL:
  - Las anulaciones de URL de la CLI (`--url`) nunca reutilizan credenciales implícitas de configuración/entorno.
  - Las anulaciones de URL de entorno (`OPENCLAW_GATEWAY_URL`) pueden usar solo credenciales de entorno (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valores predeterminados del modo local:
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (el respaldo remoto se aplica solo cuando la entrada del token de autenticación local no está establecida)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (el respaldo remoto se aplica solo cuando la entrada de la contraseña de autenticación local no está establecida)
- Valores predeterminados del modo remoto:
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Excepción de modo local en el nodo host: `gateway.remote.token` / `gateway.remote.password` se ignoran.
- Las verificaciones de token de sondeo/estado remotas son estrictas de forma predeterminada: usan `gateway.remote.token` únicamente (sin respaldo de token local) cuando se apunta al modo remoto.
- Las anulaciones de entorno del Gateway usan solo `OPENCLAW_GATEWAY_*`.

## Interfaz de usuario de chat a través de SSH

WebChat ya no utiliza un puerto HTTP separado. La interfaz de usuario de chat SwiftUI se conecta directamente al WebSocket de Gateway.

- Reenvíe `18789` a través de SSH (ver arriba) y luego conecte los clientes a `ws://127.0.0.1:18789`.
- En macOS, prefiera el modo "Remoto a través de SSH" de la aplicación, que gestiona el túnel automáticamente.

## aplicación macOS "Acceso remoto por SSH"

La aplicación de la barra de menús de macOS puede gestionar la misma configuración de extremo a extremo (verificaciones de estado remotas, WebChat y reenvío de activación por voz).

Manual de procedimientos: [acceso remoto de macOS](/en/platforms/mac/remote).

## Reglas de seguridad (remoto/VPN)

Versión corta: **mantenga el Gateway solo en loopback** a menos que esté seguro de que necesita un enlace.

- **Loopback + SSH/Tailscale Serve** es la opción predeterminada más segura (sin exposición pública).
- El texto sin formato `ws://` es solo de bucle local de forma predeterminada. Para redes privadas de confianza,
  configure `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el proceso del cliente como medida de emergencia.
- Los enlaces que no son de bucle local (`lan`/`tailnet`/`custom`, o `auto` cuando el bucle local no está disponible) deben usar tokens/contraseñas de autenticación.
- `gateway.remote.token` / `.password` son fuentes de credenciales del cliente. Por sí mismos **no** configuran la autenticación del servidor.
- Las rutas de llamadas locales pueden usar `gateway.remote.*` como respaldo solo cuando `gateway.auth.*` no está establecido.
- Si `gateway.auth.token` / `gateway.auth.password` se configura explícitamente mediante SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de respaldo remoto).
- `gateway.remote.tlsFingerprint` fija el certificado TLS remoto al usar `wss://`.
- **Tailscale Serve** puede autenticar el tráfico de Control UI/WebSocket mediante encabezados de identidad cuando `gateway.auth.allowTailscale: true`; los puntos finales de la API HTTP todavía requieren autenticación por token/contraseña. Este flujo sin token asume que el host de la puerta de enlace es confiable. Establézcalo en `false` si desea tokens/contraseñas en todas partes.
- Trate el control del navegador como acceso de operador: solo tailnet + emparejamiento deliberado de nodos.

Profundización: [Seguridad](/en/gateway/security).

### macOS: túnel SSH persistente mediante LaunchAgent

Para clientes de macOS que se conectan a una puerta de enlace remota, la configuración persistente más fácil utiliza una entrada de configuración `LocalForward` de SSH más un LaunchAgent para mantener el túnel activo a través de reinicios y fallos.

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

#### Paso 2: copiar la clave SSH (una vez)

```bash
ssh-copy-id -i ~/.ssh/id_rsa <REMOTE_USER>@<REMOTE_IP>
```

#### Paso 3: configurar el token de la puerta de enlace

Guarde el token en la configuración para que persista tras los reinicios:

```bash
openclaw config set gateway.remote.token "<your-token>"
```

#### Paso 4: crear el LaunchAgent

Guárdelo como `~/Library/LaunchAgents/ai.openclaw.ssh-tunnel.plist`:

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

Nota: si tiene un LaunchAgent `com.openclaw.ssh-tunnel` restante de una configuración anterior, descárguelo y elimínelo.

#### Solución de problemas

Compruebe si el túnel se está ejecutando:

```bash
ps aux | grep "ssh -N remote-gateway" | grep -v grep
lsof -i :18789
```

Reinicie el túnel:

```bash
launchctl kickstart -k gui/$UID/ai.openclaw.ssh-tunnel
```

Detenga el túnel:

```bash
launchctl bootout gui/$UID/ai.openclaw.ssh-tunnel
```

| Entrada de configuración             | Lo que hace                                                      |
| ------------------------------------ | ---------------------------------------------------------------- |
| `LocalForward 18789 127.0.0.1:18789` | Reenvía el puerto local 18789 al puerto remoto 18789             |
| `ssh -N`                             | SSH sin ejecutar comandos remotos (solo reenvío de puerto)       |
| `KeepAlive`                          | Reinicia automáticamente el túnel si falla                       |
| `RunAtLoad`                          | Inicia el túnel cuando el LaunchAgent se carga al iniciar sesión |
