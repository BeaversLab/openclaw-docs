---
summary: "Acceso remoto mediante túneles SSH (Gateway WS) y redes tail"
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

- **Mejor UX:** mantenga `gateway.bind: "loopback"` y use **Tailscale Serve** para la interfaz de usuario de control.
- **Respaldo:** mantenga loopback + túnel SSH desde cualquier máquina que necesite acceso.
- **Ejemplos:** [exe.dev](/es/install/exe-dev) (VM fácil) o [Hetzner](/es/install/hetzner) (VPS de producción).

Esto es ideal cuando su portátil se suspende a menudo, pero desea que el agente esté siempre activo.

### 2) El escritorio doméstico ejecuta la puerta de enlace, el portátil es el control remoto

El portátil **no** ejecuta el agente. Se conecta de forma remota:

- Use el modo **Remoto a través de SSH** de la aplicación macOS (Configuración → General → "OpenClaw runs").
- La aplicación abre y gestiona el túnel, por lo que WebChat + verificaciones de salud "simplemente funcionan".

Manual de operaciones: [acceso remoto macOS](/es/platforms/mac/remote).

### 3) El portátil ejecuta la puerta de enlace, acceso remoto desde otras máquinas

Mantenga la puerta de enlace local pero exponga de forma segura:

- Túnel SSH al portátil desde otras máquinas, o
- Sirva la interfaz de usuario de control con Tailscale Serve y mantenga la puerta de enlace solo loopback.

Guía: [Tailscale](/es/gateway/tailscale) y [descripción general web](/es/web).

## Flujo de comandos (qué se ejecuta dónde)

Un servicio de puerta de enlace posee el estado + los canales. Los nodos son periféricos.

Ejemplo de flujo (Telegram → nodo):

- El mensaje de Telegram llega al **Gateway**.
- El Gateway ejecuta el **agente** y decide si llamar a una herramienta del nodo.
- El Gateway llama al **nodo** a través del WebSocket del Gateway (`node.*` RPC).
- El nodo devuelve el resultado; el Gateway responde de nuevo a Telegram.

Notas:

- **Los nodos no ejecutan el servicio de puerta de enlace.** Solo se debe ejecutar una puerta de enlace por host a menos que ejecute intencionadamente perfiles aislados (consulte [Multiple gateways](/es/gateway/multiple-gateways)).
- El "modo nodo" de la aplicación macOS es solo un cliente de nodo a través del WebSocket del Gateway.

## Túnel SSH (CLI + herramientas)

Cree un túnel local al WS del Gateway remoto:

```bash
ssh -N -L 18789:127.0.0.1:18789 user@host
```

Con el túnel activo:

- `openclaw health` y `openclaw status --deep` ahora alcanzan la puerta de enlace remota a través de `ws://127.0.0.1:18789`.
- `openclaw gateway {status,health,send,agent,call}` también puede apuntar a la URL reenviada a través de `--url` cuando sea necesario.

Nota: reemplace `18789` con su `gateway.port` configurado (o `--port`/`OPENCLAW_GATEWAY_PORT`).
Nota: cuando pasa `--url`, la CLI no recurre a credenciales de configuración o de entorno.
Incluya `--token` o `--password` explícitamente. Faltan credenciales explícitas es un error.

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

Cuando la puerta de enlace es solo de loopback, mantenga la URL en `ws://127.0.0.1:18789` y abra primero el túnel SSH.

## Precedencia de credenciales

La resolución de credenciales del Gateway sigue un contrato compartido en las rutas de llamada/sondeo/estado y el monitoreo de aprobación de ejecución de Discord. El host de nodos usa el mismo contrato base con una excepción en modo local (ignora intencionadamente `gateway.remote.*`):

- Las credenciales explícitas (`--token`, `--password` o herramienta `gatewayToken`) siempre ganan en las rutas de llamada que aceptan autenticación explícita.
- Seguridad de anulación de URL:
  - Las anulaciones de URL de la CLI (`--url`) nunca reutilizan credenciales implícitas de configuración/entorno.
  - Las anulaciones de URL de entorno (`OPENCLAW_GATEWAY_URL`) pueden usar solo credenciales de entorno (`OPENCLAW_GATEWAY_TOKEN` / `OPENCLAW_GATEWAY_PASSWORD`).
- Valores predeterminados del modo local:
  - token: `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token` -> `gateway.remote.token` (el respaldo remoto solo se aplica cuando la entrada del token de autenticación local no está establecida)
  - contraseña: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.auth.password` -> `gateway.remote.password` (el respaldo remoto solo se aplica cuando la entrada de contraseña de autenticación local no está establecida)
- Valores predeterminados del modo remoto:
  - token: `gateway.remote.token` -> `OPENCLAW_GATEWAY_TOKEN` -> `gateway.auth.token`
  - contraseña: `OPENCLAW_GATEWAY_PASSWORD` -> `gateway.remote.password` -> `gateway.auth.password`
- Excepción del modo local del host del nodo: se ignoran `gateway.remote.token` / `gateway.remote.password`.
- Las verificaciones de token de sondeo/estado remotas son estrictas de forma predeterminada: usan solo `gateway.remote.token` (sin respaldo de token local) cuando el objetivo es el modo remoto.
- Las variables de entorno `CLAWDBOT_GATEWAY_*` heredadas solo se usan en rutas de llamada de compatibilidad; la resolución de sondeo/estado/auth usa solo `OPENCLAW_GATEWAY_*`.

## Interfaz de usuario de chat a través de SSH

WebChat ya no utiliza un puerto HTTP separado. La interfaz de usuario de chat SwiftUI se conecta directamente al WebSocket de Gateway.

- Reenvíe `18789` a través de SSH (ver arriba) y luego conecte los clientes a `ws://127.0.0.1:18789`.
- En macOS, prefiera el modo "Remoto a través de SSH" de la aplicación, que gestiona el túnel automáticamente.

## Aplicación macOS "Remoto a través de SSH"

La aplicación de la barra de menús de macOS puede gestionar la misma configuración de extremo a extremo (verificaciones de estado remotas, WebChat y reenvío de activación por voz).

Manual de procedimientos: [acceso remoto macOS](/es/platforms/mac/remote).

## Reglas de seguridad (remoto/VPN)

Versión corta: **mantenga el Gateway solo en loopback** a menos que esté seguro de que necesita un enlace.

- **Loopback + SSH/Tailscale Serve** es la opción predeterminada más segura (sin exposición pública).
- El `ws://` en texto plano es solo de loopback de forma predeterminada. Para redes privadas de confianza,
  configure `OPENCLAW_ALLOW_INSECURE_PRIVATE_WS=1` en el proceso del cliente como medida de emergencia.
- **Enlaces que no son de loopback** (`lan`/`tailnet`/`custom`, o `auto` cuando loopback no está disponible) deben usar tokens de autenticación/contraseñas.
- `gateway.remote.token` / `.password` son fuentes de credenciales del cliente. **No** configuran la autenticación del servidor por sí mismos.
- Las rutas de llamadas locales pueden usar `gateway.remote.*` como alternativa solo cuando `gateway.auth.*` no está configurado.
- Si `gateway.auth.token` / `gateway.auth.password` está configurado explícitamente mediante SecretRef y no se resuelve, la resolución falla de forma cerrada (sin enmascaramiento de alternativa remota).
- `gateway.remote.tlsFingerprint` fija el certificado TLS remoto al usar `wss://`.
- **Tailscale Serve** puede autenticar el tráfico de la interfaz de usuario de control/WebSocket a través de encabezados de identidad cuando `gateway.auth.allowTailscale: true`; los puntos finales de la API HTTP aún requieren autenticación por token/contraseña. Este flujo sin token asume que el host de la puerta de enlace es confiable. Establézcalo en `false` si desea tokens/contraseñas en todas partes.
- Trate el control del navegador como acceso de operador: solo tailnet + emparejamiento deliberado de nodos.

Profundización: [Seguridad](/es/gateway/security).

import es from "/components/footer/es.mdx";

<es />
