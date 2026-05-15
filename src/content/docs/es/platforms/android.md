---
summary: "Aplicación de Android (nodo): manual de conexión + superficie de comandos Connect/Chat/Voice/Canvas"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Aplicación de Android"
---

<Note>
  The Android app has not been publicly released yet. The source code is available in the [OpenClaw repository](https://github.com/openclaw/openclaw) under `apps/android`. You can build it yourself using Java 17 and the Android SDK (`./gradlew :app:assemblePlayDebug`). See [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) for build instructions.
</Note>

## Instantánea de soporte

- Rol: aplicación de nodo complementario (Android no aloja el Gateway).
- Gateway requerido: sí (ejecútelo en macOS, Linux o Windows a través de WSL2).
- Install: [Getting Started](/es/start/getting-started) + [Pairing](/es/channels/pairing).
- Gateway: [Runbook](/es/gateway) + [Configuration](/es/gateway/configuration).
  - Protocols: [Gateway protocol](/es/gateway/protocol) (nodes + control plane).

## Control del sistema

System control (launchd/systemd) lives on the Gateway host. See [Gateway](/es/gateway).

## Manual de conexión

Aplicación de nodo de Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se conecta directamente al WebSocket del Gateway y utiliza el emparejamiento de dispositivos (`role: node`).

Para Tailscale o hosts públicos, Android requiere un punto final seguro:

- Preferido: Tailscale Serve / Funnel con `https://<magicdns>` / `wss://<magicdns>`
- También compatible: cualquier otra `wss://` URL de Gateway con un punto final TLS real
- `ws://` en texto sin formato sigue siendo compatible en direcciones LAN privadas / hosts `.local`, además de `localhost`, `127.0.0.1` y el puente del emulador de Android (`10.0.2.2`)

### Requisitos previos

- You can run the Gateway on the "master" machine.
- El dispositivo/emulador de Android puede alcanzar el WebSocket del gateway:
  - Misma LAN con mDNS/NSD, **o**
  - Misma tailnet de Tailscale usando Wide-Area Bonjour / unicast DNS-SD (ver más abajo), **o**
  - Host/puerto del gateway manual (alternativa)
- El emparejamiento móvil de Tailnet/público **no** utiliza puntos finales `ws://` de IP sin procesar de Tailnet. Utilice Tailscale Serve u otra URL `wss://` en su lugar.
- Puede ejecutar la CLI (`openclaw`) en la máquina de puerta de enlace (o a través de SSH).

### 1) Iniciar la puerta de enlace

```bash
openclaw gateway --port 18789 --verbose
```

Confirme en los registros que ve algo como:

- `listening on ws://0.0.0.0:18789`

Para el acceso remoto de Android a través de Tailscale, prefiera Serve/Funnel en lugar de un enlace sin procesar de Tailnet:

```bash
openclaw gateway --tailscale serve
```

Esto proporciona a Android un punto final seguro `wss://` / `https://`. Una configuración `gateway.bind: "tailnet"` simple no es suficiente para el primer emparejamiento remoto de Android a menos que también finalice TLS por separado.

### 2) Verificar el descubrimiento (opcional)

Desde la máquina de puerta de enlace:

```bash
dns-sd -B _openclaw-gw._tcp local.
```

More debugging notes: [Bonjour](/es/gateway/bonjour).

Si también configuró un dominio de descubrimiento de área amplia, compare con:

```bash
openclaw gateway discover --json
```

Eso muestra `local.` más el dominio de área amplia configurado de una sola vez y utiliza el punto final del servicio resuelto en lugar de solo pistas TXT.

#### Descubrimiento de Tailnet (Viena ⇄ Londres) a través de unicast DNS-SD

Android NSD/mDNS discovery won't cross networks. If your Android node and the gateway are on different networks but connected via Tailscale, use Wide-Area Bonjour / unicast DNS-SD instead.

El descubrimiento por sí solo no es suficiente para el emparejamiento de Android de Tailnet/público. La ruta descubierta aún necesita un punto final seguro (`wss://` o Tailscale Serve):

1. Configure una zona DNS-SD (ejemplo `openclaw.internal.`) en el host de la puerta de enlace y publique registros `_openclaw-gw._tcp`.
2. Configure el DNS dividido de Tailscale para su dominio elegido apuntando a ese servidor DNS.

Details and example CoreDNS config: [Bonjour](/es/gateway/bonjour).

### 3) Conectar desde Android

En la aplicación de Android:

- La aplicación mantiene su conexión de puerta de enlace activa a través de un **servicio en primer plano** (notificación persistente).
- Abra la pestaña **Conectar**.
- Utilice el modo **Código de configuración** o **Manual**.
- Si el descubrimiento está bloqueado, utilice el host/puerto manual en **Controles avanzados**. Para hosts de LAN privados, `ws://` todavía funciona. Para hosts públicos de Tailscale, active TLS y utilice un punto final `wss://` / Tailscale Serve.

Tras el primer emparejamiento exitoso, Android se vuelve a conectar automáticamente al iniciar:

- Punto final manual (si está habilitado), de lo contrario
- La última pasarela descubierta (best-effort).

### Presence alive beacons

After the authenticated node session connects, and when the app moves to the background while the
foreground service is still connected, Android calls `node.event` with
`event: "node.presence.alive"`. The gateway records this as `lastSeenAtMs`/`lastSeenReason` on the
paired node/device metadata only after the authenticated node device identity is known.

The app counts the beacon as successfully recorded only when the gateway response includes
`handled: true`. Older gateways may acknowledge `node.event` with `{ "ok": true }`; that response is
compatible but does not count as a durable last-seen update.

### 4) Approve pairing (CLI)

On the gateway machine:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Pairing details: [Pairing](/es/channels/pairing).

Optional: if the Android node always connects from a tightly controlled subnet,
you can opt in to first-time node auto-approval with explicit CIDRs or exact IPs:

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Esto está deshabilitado de forma predeterminada. Se aplica solo al emparejamiento `role: node` nuevo sin
ámbitos solicitados. El emparejamiento de operador/navegador y cualquier cambio en el rol, el ámbito, los metadatos o la
clave pública todavía requieren aprobación manual.

### 5) Verifique que el nodo esté conectado

- A través del estado de los nodos:

  ```bash
  openclaw nodes status
  ```

- A través de Gateway:

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historial

La pestaña Chat de Android admite la selección de sesión (predeterminado `main`, más otras sesiones existentes):

- Historial: `chat.history` (normalizado para visualización; las etiquetas de directivas en línea se eliminan del texto visible, las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` y bloques de llamadas a herramientas truncados) y los tokens de control de modelo ASCII/anco de ancho completo filtrados se eliminan, las filas de asistente de token silencioso puro como `NO_REPLY` / `no_reply` exactas se omiten, y las filas excesivamente grandes se pueden reemplazar con marcadores de posición)
- Enviar: `chat.send`
- Actualizaciones push (best-effort): `chat.subscribe` → `event:"chat"`

### 7) Canvas + cámara

#### Gateway Canvas Host (recomendado para contenido web)

Si quieres que el nodo muestre HTML/CSS/JS real que el agente pueda editar en el disco, apunta el nodo al host de canvas Gateway.

<Note>Los nodos cargan el lienzo desde el servidor HTTP del Gateway (mismo puerto que `gateway.port`, por defecto `18789`).</Note>

1. Cree `~/.openclaw/workspace/canvas/index.html` en el host del gateway.

2. Navegue el nodo hacia él (LAN):

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (opcional): si ambos dispositivos están en Tailscale, use un nombre MagicDNS o una IP de tailnet en lugar de `.local`, p. ej. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Este servidor inyecta un cliente de recarga en vivo en HTML y recarga ante cambios en los archivos.
El host A2UI vive en `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Comandos de Canvas (solo en primer plano):

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (use `{"url":""}` o `{"url":"/"}` para volver al scaffolding predeterminado). `canvas.snapshot` devuelve `{ format, base64 }` (predeterminado `format="jpeg"`).
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` alias heredado)

Comandos de cámara (solo en primer plano; restringidos por permisos):

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Consulte [Nodo de cámara](/es/nodes/camera) para conocer los parámetros y los auxiliares de CLI.

### 8) Voz + superficie de comandos de Android ampliada

- Pestaña Voz: Android tiene dos modos de captura explícitos. **Mic** es una sesión manual de la pestaña Voz que envía cada pausa como un turno de chat y se detiene cuando la aplicación sale del primer plano o el usuario abandona la pestaña Voz. **Talk** es el modo de conversación continuo y sigue escuchando hasta que se desactiva o el nodo se desconecta.
- El modo Talk promueve el servicio en primer plano existente de `dataSync` a `dataSync|microphone` antes de que comience la captura y luego lo degrada cuando se detiene el modo Talk. Android 14+ requiere la declaración `FOREGROUND_SERVICE_MICROPHONE`, el permiso de tiempo de ejecución `RECORD_AUDIO` y el tipo de servicio de micrófono en tiempo de ejecución.
- Las respuestas habladas utilizan `talk.speak` a través del proveedor Talk de la puerta de enlace configurada. El TTS del sistema local solo se usa cuando `talk.speak` no está disponible.
- La activación por voz sigue deshabilitada en la experiencia de usuario/tiempo de ejecución de Android.
- Familias de comandos adicionales de Android (la disponibilidad depende del dispositivo + permisos):
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (ver [Reenvío de notificaciones](#notification-forwarding) más abajo)
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Puntos de entrada del Asistente

Android admite iniciar OpenClaw desde el activador del asistente del sistema (Google
Assistant). Cuando se configura, mantener presionado el botón de inicio o decir "Ok Google, pregúntale a
OpenClaw..." abre la aplicación y pasa el mensaje al compositor de chat.

Esto utiliza los metadatos de **App Actions** de Android declarados en el manifiesto de la aplicación. No
se necesita configuración adicional en el lado de la puerta de enlace -- la intención del asistente es
manejada completamente por la aplicación de Android y reenviada como un mensaje de chat normal.

<Note>La disponibilidad de las App Actions depende del dispositivo, la versión de Google Play Services, y de si el usuario ha establecido OpenClaw como la aplicación de asistente predeterminada.</Note>

## Reenvío de notificaciones

Android puede reenviar las notificaciones del dispositivo a la puerta de enlace como eventos. Varios controles le permiten determinar qué notificaciones se reenvían y cuándo.

| Clave                            | Tipo           | Descripción                                                                                                                  |
| -------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Solo reenviar notificaciones de estos nombres de paquete. Si se establece, se ignoran todos los demás paquetes.              |
| `notifications.denyPackages`     | string[]       | Nunca reenviar notificaciones de estos nombres de paquete. Se aplica después de `allowPackages`.                             |
| `notifications.quietHours.start` | string (HH:mm) | Inicio de la ventana de horas silenciosas (hora local del dispositivo). Las notificaciones se suprimen durante esta ventana. |
| `notifications.quietHours.end`   | string (HH:mm) | Fin de la ventana de horas silenciosas.                                                                                      |
| `notifications.rateLimit`        | number         | Máximo de notificaciones reenviadas por paquete por minuto. Las notificaciones excesivas se descartan.                       |

El selector de notificaciones también utiliza un comportamiento más seguro para los eventos de notificación reenviados, evitando el reenvío accidental de notificaciones confidenciales del sistema.

Configuración de ejemplo:

```json5
{
  notifications: {
    allowPackages: ["com.slack", "com.whatsapp"],
    denyPackages: ["com.android.systemui"],
    quietHours: {
      start: "22:00",
      end: "07:00",
    },
    rateLimit: 5,
  },
}
```

<Note>El reenvío de notificaciones requiere el permiso de Android Notification Listener. La aplicación solicita este permiso durante la configuración.</Note>

## Relacionado

- [Aplicación iOS](/es/platforms/ios)
- [Nodos](/es/nodes)
- [Solución de problemas del nodo Android](/es/nodes/troubleshooting)
