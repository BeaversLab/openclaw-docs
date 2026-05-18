---
summary: "Acceso remoto mediante Gateway WS, túneles SSH y tailnets"
read_when:
  - Running or troubleshooting remote gateway setups
title: "Acceso remoto"
---

Este repositorio admite el acceso remoto a la puerta de enlace manteniendo una única puerta de enlace (el maestro) ejecutándose en un host dedicado (escritorio/servidor) y conectando los clientes a ella.

- Para **operadores (usted / la aplicación macOS)**: el WebSocket directo de LAN/Tailnet es el más sencillo cuando la puerta de enlace es accesible; el túnel SSH es la alternativa universal.
- Para **nodos (iOS/Android y dispositivos futuros)**: conéctese a la **WebSocket** de la pasarela (LAN/tailnet o túnel SSH según sea necesario).

## La idea central

- El WebSocket de la puerta de enlace generalmente se vincula a **loopback** en su puerto configurado (por defecto es 18789).
- Para uso remoto, exponga a través de Tailscale Serve o un enlace LAN/Tailnet de confianza, o reenvíe el puerto de loopback a través de SSH.

## Configuraciones comunes de VPN y tailnet

Piense en el **host de la pasarela** como donde reside el agente. Posee las sesiones, perfiles de autenticación, canales y estado. Su portátil, escritorio y nodos se conectan a ese host.

### Pasarela siempre activa en su tailnet

Ejecute la pasarela en un host persistente (VPS o servidor doméstico) y acceda a ella a través de **Tailscale** o SSH.

- **Mejor UX:** mantenga `gateway.bind: "loopback"` y use **Tailscale Serve** para la Interfaz de Control.
- **LAN/Tailnet de confianza:** vincule la puerta de enlace a una interfaz privada y conéctese directamente con `gateway.remote.transport: "direct"`.
- **Alternativa:** mantenga loopback más túnel SSH desde cualquier máquina que necesite acceso.
- **Ejemplos:** [exe.dev](/es/install/exe-dev) (VM fácil) o [Hetzner](/es/install/hetzner) (VPS de producción).

Ideal cuando su portátil se suspende con frecuencia pero desea que el agente esté siempre activo.

### El escritorio de casa ejecuta la puerta de enlace

El portátil **no** ejecuta el agente. Se conecta de forma remota:

- Use el modo remoto de la aplicación macOS (Configuración → General → OpenClaw se ejecuta).
- La aplicación se conecta directamente cuando la puerta de enlace es accesible en LAN/Tailnet, o abre y gestiona un túnel SSH cuando elige SSH.

Manual de procedimientos: [acceso remoto macOS](/es/platforms/mac/remote).

### El portátil ejecuta la puerta de enlace

Mantenga la puerta de enlace local pero exponga de forma segura:

- Túnel SSH al portátil desde otras máquinas, o
- Tailscale Serve la Interfaz de Control y mantenga la puerta de enlace solo en loopback.

Guías: [Tailscale](/es/gateway/tailscale) y [Resumen web](/es/web).

## Flujo de comandos (qué se ejecuta dónde)

Un servicio de puerta de enlace posee el estado + los canales. Los nodos son periféricos.

Ejemplo de flujo (Telegram → nodo):

- El mensaje de Telegram llega a la **puerta de enlace**.
- La puerta de enlace ejecuta el **agente** y decide si llamar a una herramienta de nodo.
- La puerta de enlace llama al **nodo** a través del WebSocket de la puerta de enlace (RPC `node.*`).
- El nodo devuelve el resultado; la puerta de enlace responde de vuelta a Telegram.

Notas:

- **Los nodos no ejecutan el servicio de puerta de enlace.** Solo se debe ejecutar una puerta de enlace por host, a menos que ejecute intencionalmente perfiles aislados (consulte [Múltiples puertas de enlace](/es/gateway/multiple-gateways)).
- El "modo nodo" de la aplicación macOS es solo un cliente de nodo a través del WebSocket de la puerta de enlace.

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

Puede persistir un destino remoto para que los comandos de la CLI lo usen de forma predeterminada:

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

Cuando la puerta de enlace es solo de loopback, mantenga la URL en `ws://127.0.0.1:18789` y abra el túnel SSH primero.
En el transporte de túnel SSH de la aplicación macOS, los nombres de host de puerta de enlace descubiertos pertenecen a
`gateway.remote.sshTarget`; `gateway.remote.url` sigue siendo la URL del túnel local.
Si esos puertos son diferentes, configure `gateway.remote.remotePort` en el puerto de la puerta de enlace en
el host SSH.

Para una puerta de enlace ya accesible en una LAN de confianza o Tailnet, use el modo directo:

```json5
{
  gateway: {
    mode: "remote",
    remote: {
      transport: "direct",
      url: "ws://192.168.0.202:18789",
      token: "your-token",
    },
  },
}
```

## Precedencia de credenciales

La resolución de credenciales de la puerta de enlace sigue un contrato compartido en las rutas de llamada/sondeo/estado y el monitoreo de aprobación de ejecución de Discord. Node-host usa el mismo contrato base con una excepción en modo local (ignora intencionalmente `gateway.remote.*`):

- Las credenciales explícitas (`--token`, `--password` o herramienta `gatewayToken`) siempre tienen prioridad en las rutas de llamada que aceptan autenticación explícita.
- Seguridad de anulación de URL:
  - Las anulaciones de URL de la CLI (`--url`) nunca reutilizan credenciales implícitas de configuración/entorno.
  - Las anulaciones de URL de entorno (`OPENCLAW_GATEWAY_URL`) solo pueden usar credenciales de entorno (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valores predeterminados del modo local:
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (el respaldo remoto solo se aplica cuando la entrada del token de autenticación local no está configurada)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (el respaldo remoto solo se aplica cuando la entrada de contraseña de autenticación local no está configurada)
- Valores predeterminados del modo remoto:
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Excepción del modo local del host del nodo: se ignoran `gateway.remote.token` / `gateway.remote.password`.
- Las comprobaciones de token de sondeo/estado remotas son estrictas de forma predeterminada: usan solo `gateway.remote.token` (sin respaldo de token local) cuando el objetivo es el modo remoto.
- Las anulaciones de entorno del Gateway usan solo `OPENCLAW_GATEWAY_*`.

## Acceso remoto de la interfaz de Chat

WebChat ya no usa un puerto HTTP separado. La interfaz de chat de SwiftUI se conecta directamente al WebSocket del Gateway.

- Reenvíe `18789` a través de SSH (ver arriba) y luego conecte los clientes a `ws://127.0.0.1:18789`.
- Para el modo directo LAN/Tailnet, conecte los clientes a la URL privada `ws://` o segura `wss://` configurada.
- En macOS, prefiera el modo remoto de la aplicación, que gestiona el transporte seleccionado automáticamente.

## Modo remoto de la aplicación macOS

La aplicación de la barra de menús de macOS puede gestionar la misma configuración de extremo a extremo (verificaciones de estado remoto, WebChat y reenvío de Voice Wake).

Manual: [acceso remoto de macOS](/es/platforms/mac/remote).

## Reglas de seguridad (remoto/VPN)

Versión corta: **mantenga el Gateway solo en loopback** a menos que esté seguro de que necesita un enlace (bind).

- **Loopback + SSH/Tailscale Serve** es la opción predeterminada más segura (sin exposición pública).
- Se acepta texto sin formato `ws://` para loopback, LAN, link-local, `.local`, `.ts.net` y hosts CGNAT de Tailscale. Los hosts remotos públicos deben usar `wss://`.
- Los enlaces **no loopback** (`lan`/`tailnet`/`custom`, o `auto` cuando loopback no está disponible) deben usar autenticación de gateway: token, contraseña o un proxy inverso con conciencia de identidad con `gateway.auth.mode: "trusted-proxy"`.
- `gateway.remote.token` / `.password` son fuentes de credenciales del cliente. Por sí mismos **no** configuran la autenticación del servidor.
- Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está configurado.
- Si `gateway.auth.token` / `gateway.auth.password` está configurado explícitamente mediante SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de reserva remoto).
- `gateway.remote.tlsFingerprint` fija el certificado TLS remoto cuando se usa `wss://`, incluyendo el modo directo de macOS. Sin una fija configurada o almacenada previamente, macOS solo fija un certificado de primer uso después de que pase la confianza normal del sistema; los gateways auto-firmados o de CA privada que macOS aún no confía necesitan una huella digital explícita o Acceso remoto por SSH.
- **Tailscale Serve** puede autenticar el tráfico de la UI de control/WebSocket mediante encabezados de identidad cuando `gateway.auth.allowTailscale: true`; los puntos finales de la API HTTP no usan esa autenticación de encabezado de Tailscale y, en su lugar, siguen el modo de autenticación HTTP normal del gateway. Este flujo sin token asume que el host del gateway es confiable. Establézcalo en `false` si desea autenticación de secreto compartido en todas partes.
- La autenticación de **proxy confiable** espera configuraciones de proxy con conciencia de identidad no loopback por defecto.
  Los proxies inversos de loopback en el mismo host requieren `gateway.auth.trustedProxy.allowLoopback = true` explícito.
- Trate el control del navegador como acceso de operador: solo tailnet + emparejamiento deliberado de nodos.

Profundización: [Seguridad](/es/gateway/security).

### macOS: túnel SSH persistente mediante LaunchAgent

Para los clientes de macOS que se conectan a una puerta de enlace remota, la configuración persistente más fácil utiliza una entrada de configuración `LocalForward` de SSH más un LaunchAgent para mantener el túnel activo tras los reinicios y fallos.

#### Paso 1: añadir configuración SSH

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

Guarde el token en la configuración para que persista tras los reinicios:

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

El túnel se iniciará automáticamente al iniciar sesión, se reiniciará si falla y mantendrá el puerto reenviado activo.

<Note>Si tiene un LaunchAgent `com.openclaw.ssh-tunnel` restante de una configuración anterior, descárguelo y elimínelo.</Note>

#### Solución de problemas

Compruebe si el túnel está en funcionamiento:

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
