---
summary: "Acceso remoto mediante túneles SSH (Gateway WS) y tailnets"
read_when:
  - Ejecución o resolución de problemas de configuraciones de gateway remoto
title: "Acceso Remoto"
---

# Acceso remoto (SSH, túneles y redes tail)

Este repositorio admite "remoto a través de SSH" manteniendo una única puerta de enlace (Gateway) (el maestro) ejecutándose en un host dedicado (escritorio/servidor) y conectando clientes a ella.

- Para **operadores (tú / la aplicación macOS)**: el túnel SSH es el respaldo universal.
- Para **nodos (iOS/Android y dispositivos futuros)**: conéctese al **WebSocket** de la puerta de enlace (LAN/red tail o túnel SSH según sea necesario).

## La idea central

- El WebSocket de la puerta de enlace se vincula a **loopback** en su puerto configurado (predeterminado: 18789).
- Para uso remoto, reenvíe ese puerto de loopback a través de SSH (o use una red tail/VPN y túneles menos).

## Configuraciones comunes de VPN/red tail (dónde reside el agente)

Piense en el **host del Gateway** como "donde vive el agente". Es propietario de las sesiones, perfiles de autenticación, canales y estado.
Su portátil/escritorio (y nodos) se conectan a ese host.

### 1) Puerta de enlace siempre activa en su red tail (VPS o servidor doméstico)

Ejecute la puerta de enlace en un host persistente y acceda a ella a través de **Tailscale** o SSH.

- **Mejor UX:** mantenga `gateway.bind: "loopback"` y use **Tailscale Serve** para la Interfaz de Control.
- **Respaldo:** mantenga loopback + túnel SSH desde cualquier máquina que necesite acceso.
- **Ejemplos:** [exe.dev](/es/install/exe-dev) (VM fácil) o [Hetzner](/es/install/hetzner) (VPS de producción).

Esto es ideal cuando su portátil se suspende a menudo, pero desea que el agente esté siempre activo.

### 2) El escritorio doméstico ejecuta la puerta de enlace, el portátil es el control remoto

El portátil **no** ejecuta el agente. Se conecta de forma remota:

- Use el modo **Remoto a través de SSH** de la aplicación macOS (Configuración → General → "OpenClaw runs").
- La aplicación abre y gestiona el túnel, por lo que WebChat + verificaciones de salud "simplemente funcionan".

Manual: [acceso remoto macOS](/es/platforms/mac/remote).

### 3) El portátil ejecuta la puerta de enlace, acceso remoto desde otras máquinas

Mantenga la puerta de enlace local pero exponga de forma segura:

- Túnel SSH al portátil desde otras máquinas, o
- Sirva la interfaz de usuario de control con Tailscale Serve y mantenga la puerta de enlace solo loopback.

Guía: [Tailscale](/es/gateway/tailscale) y [visión general web](/es/web).

## Flujo de comandos (qué se ejecuta dónde)

Un servicio de puerta de enlace posee el estado + los canales. Los nodos son periféricos.

Ejemplo de flujo (Telegram → nodo):

- El mensaje de Telegram llega al **Gateway**.
- El Gateway ejecuta el **agente** y decide si llamar a una herramienta del nodo.
- Gateway llama al **nodo** a través del WebSocket de Gateway (`node.*` RPC).
- El nodo devuelve el resultado; el Gateway responde de nuevo a Telegram.

Notas:

- **Los nodos no ejecutan el servicio de gateway.** Solo se debe ejecutar un gateway por host, a menos que ejecute intencionadamente perfiles aislados (ver [Múltiples gateways](/es/gateway/multiple-gateways)).
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
Incluya `--token` o `--password` explícitamente. Faltar credenciales explícitas es un error.

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

Cuando el gateway es solo de loopback, mantenga la URL en `ws://127.0.0.1:18789` y abra primero el túnel SSH.

## Precedencia de credenciales

La resolución de credenciales del Gateway sigue un contrato compartido en las rutas de llamada/sondeo/estado y la supervisión de aprobación de ejecución de Discord. Node-host usa el mismo contrato base con una excepción en modo local (ignora intencionadamente `gateway.remote.*`):

- Las credenciales explícitas (`--token`, `--password`, o herramienta `gatewayToken`) siempre tienen prioridad en las rutas de llamada que aceptan autenticación explícita.
- Seguridad de anulación de URL:
  - Las anulaciones de URL de la CLI (`--url`) nunca reutilizan las credenciales implícitas de configuración/entorno.
  - Las anulaciones de URL de entorno (`OPENCLAW_GATEWAY_URL`) pueden usar solo credenciales de entorno (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valores predeterminados del modo local:
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (el respaldo remoto solo se aplica cuando la entrada del token de autenticación local no está establecida)
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (el respaldo remoto solo se aplica cuando la entrada de la contraseña de autenticación local no está establecida)
- Valores predeterminados del modo remoto:
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - password: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Excepción de modo local para host de nodo: se ignoran `gateway.remote.token` / `gateway.remote.password`.
- Las comprobaciones de token de sondeo/estado remotas son estrictas de forma predeterminada: usan solo `gateway.remote.token` (sin respaldo de token local) cuando se orienta al modo remoto.
- Las variables de entorno heredadas `CLAWDBOT_GATEWAY_*` solo se usan en rutas de llamada de compatibilidad; la resolución de sondeo/estado/autenticación usa solo `OPENCLAW_GATEWAY_*`.

## Interfaz de usuario de chat a través de SSH

WebChat ya no utiliza un puerto HTTP separado. La interfaz de usuario de chat SwiftUI se conecta directamente al WebSocket de Gateway.

- Reenvíe `18789` a través de SSH (ver arriba), luego conecte los clientes a `ws://127.0.0.1:18789`.
- En macOS, prefiera el modo "Remoto a través de SSH" de la aplicación, que gestiona el túnel automáticamente.

## Aplicación de macOS "Remote over SSH"

La aplicación de la barra de menús de macOS puede gestionar la misma configuración de extremo a extremo (verificaciones de estado remotas, WebChat y reenvío de activación por voz).

Manual de operaciones: [acceso remoto de macOS](/es/platforms/mac/remote).

## Reglas de seguridad (remoto/VPN)

Versión corta: **mantenga el Gateway solo en loopback** a menos que esté seguro de que necesita un enlace.

- **Loopback + SSH/Tailscale Serve** es la opción predeterminada más segura (sin exposición pública).
- Plaintext `ws://` es solo de bucle local (loopback) de forma predeterminada. Para redes privadas de confianza,
  establezca `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el proceso del cliente como medida de emergencia.
- Los **enlaces no locales** (`lan`/`tailnet`/`custom`, o `auto` cuando el bucle local no está disponible) deben usar tokens/contraseñas de autenticación.
- `gateway.remote.token` / `.password` son fuentes de credenciales del cliente. Por sí mismos **no** configuran la autenticación del servidor.
- Las rutas de llamada locales pueden usar `gateway.remote.*` como respaldo solo cuando `gateway.auth.*` no está establecido.
- Si `gateway.auth.token` / `gateway.auth.password` están configurados explícitamente mediante SecretRef y no se resuelven, la resolución falla de forma cerrada (sin enmascaramiento de respaldo remoto).
- `gateway.remote.tlsFingerprint` fija el certificado TLS remoto cuando se usa `wss://`.
- **Tailscale Serve** puede autenticar el tráfico de Control UI/WebSocket mediante encabezados de identidad cuando `gateway.auth.allowTailscale: true`; los puntos finales de la API HTTP aún requieren autenticación por token/contraseña. Este flujo sin token asume que el host de la puerta de enlace es confiable. Establézcalo en `false` si desea tokens/contraseñas en todas partes.
- Trate el control del navegador como acceso de operador: solo tailnet + emparejamiento deliberado de nodos.

Profundización: [Seguridad](/es/gateway/security).

import en from "/components/footer/en.mdx";

<en />
