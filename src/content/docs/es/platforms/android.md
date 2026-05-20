---
summary: "Aplicación de Android (nodo): manual de conexión + superficie de comandos Connect/Chat/Voice/Canvas"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Aplicación de Android"
---

<Note>
  La aplicación oficial de Android está disponible en [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN). Es un nodo complementario y requiere un OpenClaw Gateway en ejecución. El código fuente también está disponible en el [repositorio de OpenClaw](https://github.com/openclaw/openclaw) bajo `apps/android`; consulte
  [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) para las instrucciones de compilación.
</Note>

## Instantánea de soporte

- Rol: aplicación de nodo complementario (Android no aloja el Gateway).
- Se requiere Gateway: sí (ejecútelo en macOS, Linux o Windows a través de WSL2).
- Instalación: [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) para la aplicación, [Introducción](/es/start/getting-started) para el Gateway y luego [Emparejamiento](/es/channels/pairing).
- Gateway: [Manual](/es/gateway) + [Configuración](/es/gateway/configuration).
  - Protocolos: [Protocolo de Gateway](/es/gateway/protocol) (nodos + plano de control).

## Control del sistema

El control del sistema (launchd/systemd) se encuentra en el host del Gateway. Consulte [Gateway](/es/gateway).

## Manual de conexión

Aplicación de nodo Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se conecta directamente al WebSocket del Gateway y utiliza el emparejamiento de dispositivos (`role: node`).

Para Tailscale o hosts públicos, Android requiere un punto de conexión seguro:

- Preferido: Tailscale Serve / Funnel con `https://<magicdns>` / `wss://<magicdns>`
- También compatible: cualquier otra URL de Gateway `wss://` con un punto de conexión TLS real
- El texto sin cifrar `ws://` sigue siendo compatible en direcciones LAN privadas / hosts `.local`, además de `localhost`, `127.0.0.1` y el puente del emulador de Android (`10.0.2.2`)

### Requisitos previos

- Puede ejecutar el Gateway en la máquina "maestra".
- El dispositivo/emulador de Android puede alcanzar el WebSocket del Gateway:
  - Misma LAN con mDNS/NSD, **o**
  - Misma tailnet de Tailscale usando Wide-Area Bonjour / unicast DNS-SD (ver abajo), **o**
  - Host/puerto de puerta de enlace manual (alternativa)
- El emparejamiento móvil de Tailnet/público **no** utiliza puntos finales de IP `ws://` sin procesar de Tailnet. Utilice Tailscale Serve u otra URL `wss://` en su lugar.
- Puede ejecutar la CLI (`openclaw`) en la máquina de la puerta de enlace (o a través de SSH).

### 1) Iniciar la puerta de enlace

```bash
openclaw gateway --port 18789 --verbose
```

Confirme en los registros que ve algo como:

- `listening on ws://0.0.0.0:18789`

Para el acceso remoto de Android a través de Tailscale, prefiera Serve/Funnel en lugar de un enlace de Tailnet sin procesar:

```bash
openclaw gateway --tailscale serve
```

Esto proporciona a Android un punto final seguro `wss://` / `https://`. Una configuración `gateway.bind: "tailnet"` simple no es suficiente para el primer emparejamiento remoto de Android a menos que también finalice TLS por separado.

### 2) Verificar el descubrimiento (opcional)

Desde la máquina de la puerta de enlace:

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Más notas de depuración: [Bonjour](/es/gateway/bonjour).

Si también configuró un dominio de descubrimiento de área amplia, compare con:

```bash
openclaw gateway discover --json
```

Eso muestra `local.` más el dominio de área amplia configurado en una sola pasada y utiliza el punto final del servicio resuelto en lugar de solo pistas TXT.

#### Descubrimiento de Tailnet (Viena ⇄ Londres) a través de DNS-SD unicast

El descubrimiento NSD/mDNS de Android no cruzará redes. Si su nodo Android y la puerta de enlace están en redes diferentes pero conectados a través de Tailscale, utilice Wide-Area Bonjour / unicast DNS-SD en su lugar.

El descubrimiento por sí solo no es suficiente para el emparejamiento de Android de Tailnet/público. La ruta descubierta aún necesita un punto final seguro (`wss://` o Tailscale Serve):

1. Configure una zona DNS-SD (ejemplo `openclaw.internal.`) en el host de la puerta de enlace y publique registros `_openclaw-gw._tcp`.
2. Configure el DNS dividido de Tailscale para su dominio elegido apuntando a ese servidor DNS.

Detalles y configuración de ejemplo de CoreDNS: [Bonjour](/es/gateway/bonjour).

### 3) Conectar desde Android

En la aplicación de Android:

- La aplicación mantiene su conexión con la puerta de enlace activa a través de un **servicio en primer plano** (notificación persistente).
- Abra la pestaña **Conectar**.
- Use el modo **Código de configuración** o **Manual**.
- Si el descubrimiento está bloqueado, use el host/puerto manual en **Controles avanzados**. Para hosts de LAN privados, `ws://` todavía funciona. Para hosts de Tailscale/públicos, active TLS y use un punto final `wss://` / Tailscale Serve.

Después del primer emparejamiento exitoso, Android se reconecta automáticamente al inicio:

- Punto final manual (si está habilitado), de lo contrario,
- La última puerta de enlace descubierta (mejor esfuerzo).

### Balizas de presencia activas

Después de que se conecte la sesión del nodo autenticado y cuando la aplicación pase a segundo plano mientras el servicio en primer plano todavía está conectado, Android llama a `node.event` con `event: "node.presence.alive"`. La puerta de enlace registra esto como `lastSeenAtMs`/`lastSeenReason` en los metadatos del nodo/dispositivo emparejado solo después de que se conoce la identidad del dispositivo del nodo autenticado.

La aplicación cuenta la baliza como registrada exitosamente solo cuando la respuesta de la puerta de enlace incluye `handled: true`. Las puertas de enlace antiguas pueden reconocer `node.event` con `{ "ok": true }`; esa respuesta es compatible pero no cuenta como una actualización duradera de la última vez visto.

### 4) Aprobar el emparejamiento (CLI)

En la máquina de la puerta de enlace:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Detalles del emparejamiento: [Emparejamiento](/es/channels/pairing).

Opcional: si el nodo de Android siempre se conecta desde una subred estrictamente controlada, puede optar por la autoaprobación de nodo por primera vez con CIDR explícitos o IPs exactas:

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

Esto está deshabilitado de forma predeterminada. Solo se aplica al emparejamiento `role: node` nuevo sin alcances solicitados. El emparejamiento del operador/navegador y cualquier cambio de rol, alcance, metadatos o clave pública aún requieren aprobación manual.

### 5) Verificar que el nodo esté conectado

- A través del estado de los nodos:

  ```bash
  openclaw nodes status
  ```

- A través de la puerta de enlace:

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historial

La pestaña Chat de Android admite la selección de sesión (predeterminado `main`, más otras sesiones existentes):

- Historial: `chat.history` (normalizado para visualización; las etiquetas de directivas en línea se eliminan del texto visible, las cargas útiles XML de llamadas a herramientas en texto plano (incluyendo `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, y bloques de llamadas a herramientas truncados) y los tokens de control de modelo ASCII/anchura completa filtrados se eliminan, las filas del asistente de tokens silenciosos puros como `NO_REPLY` / `no_reply` exactos se omiten, y las filas demasiado grandes pueden ser reemplazadas por marcadores de posición)
- Enviar: `chat.send`
- Actualizaciones push (mejor esfuerzo): `chat.subscribe` → `event:"chat"`

### 7) Canvas + cámara

#### Host de Canvas del Gateway (recomendado para contenido web)

Si desea que el nodo muestre HTML/CSS/JS real que el agente pueda editar en el disco, apunte el nodo al host de canvas del Gateway.

<Note>Los nodos cargan el canvas desde el servidor HTTP del Gateway (mismo puerto que `gateway.port`, por defecto `18789`).</Note>

1. Cree `~/.openclaw/workspace/canvas/index.html` en el host del gateway.

2. Navegue el nodo hacia él (LAN):

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (opcional): si ambos dispositivos están en Tailscale, use un nombre MagicDNS o una IP de tailnet en lugar de `.local`, p. ej. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Este servidor inyecta un cliente de recarga en vivo en el HTML y recarga ante cambios en los archivos.
El host A2UI se encuentra en `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Comandos de Canvas (solo en primer plano):

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (use `{"url":""}` o `{"url":"/"}` para volver al andamio predeterminado). `canvas.snapshot` devuelve `{ format, base64 }` (por defecto `format="jpeg"`).
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` alias heredado)

Comandos de cámara (solo en primer plano; restringidos por permisos):

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Consulte [Nodo de cámara](/es/nodes/camera) para conocer los parámetros y los auxiliares de CLI.

### 8) Voz + superficie de comandos Android ampliada

- Pestaña de voz: Android tiene dos modos de captura explícitos. **Mic** es una sesión manual de la pestaña de voz que envía cada pausa como un turno de chat y se detiene cuando la aplicación sale del primer plano o el usuario sale de la pestaña de voz. **Talk** es el Modo de conversación continuo y sigue escuchando hasta que se desactiva o el nodo se desconecta.
- El Modo de conversación promueve el servicio en primer plano existente de `dataSync` a `dataSync|microphone` antes de que comience la captura, y luego lo degrada cuando se detiene el Modo de conversación. Android 14+ requiere la declaración `FOREGROUND_SERVICE_MICROPHONE`, la concesión de tiempo de ejecución `RECORD_AUDIO` y el tipo de servicio de micrófono en tiempo de ejecución.
- De forma predeterminada, Android Talk usa el reconocimiento de voz nativo, el chat de la puerta de enlace y `talk.speak` a través del proveedor Talk de la puerta de enlace configurada. El TTS del sistema local se usa solo cuando `talk.speak` no está disponible.
- Android Talk usa el relé de puerta de enlace en tiempo real solo cuando `talk.realtime.mode` es `realtime` y `talk.realtime.transport` es `gateway-relay`.
- La activación por voz permanece deshabilitada en la experiencia de usuario/tiempo de ejecución de Android.
- Familias de comandos adicionales de Android (la disponibilidad depende del dispositivo + permisos):
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (ver [Reenvío de notificaciones](#notification-forwarding) a continuación)
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Puntos de entrada del asistente

Android admite el inicio de OpenClaw desde el disparador del asistente del sistema (Google
Assistant). Cuando está configurado, mantener presionado el botón de inicio o decir "Hey Google, pregúntale a
OpenClaw..." abre la aplicación y pasa el mensaje al compositor de chat.

Esto utiliza los metadatos de **App Actions** de Android declarados en el manifiesto de la aplicación. No se necesita ninguna configuración adicional en el lado de la puerta de enlace; la intención del asistente se maneja completamente por la aplicación de Android y se reenvía como un mensaje de chat normal.

<Note>La disponibilidad de las App Actions depende del dispositivo, la versión de Google Play Services y si el usuario ha establecido OpenClaw como la aplicación de asistente predeterminada.</Note>

## Reenvío de notificaciones

Android puede reenviar las notificaciones del dispositivo a la puerta de enlace como eventos. Varios controles le permiten limitar qué notificaciones se reenvían y cuándo.

| Clave                            | Tipo           | Descripción                                                                                                                  |
| -------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Reenviar solo las notificaciones de estos nombres de paquete. Si se establece, se ignoran todos los demás paquetes.          |
| `notifications.denyPackages`     | string[]       | Nunca reenviar notificaciones de estos nombres de paquete. Se aplica después de `allowPackages`.                             |
| `notifications.quietHours.start` | cadena (HH:mm) | Inicio de la ventana de horas silenciosas (hora local del dispositivo). Las notificaciones se suprimen durante esta ventana. |
| `notifications.quietHours.end`   | cadena (HH:mm) | Fin de la ventana de horas silenciosas.                                                                                      |
| `notifications.rateLimit`        | número         | Máximo de notificaciones reenviadas por paquete por minuto. Las notificaciones excesivas se descartan.                       |

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

<Note>El reenvío de notificaciones requiere el permiso de Android Notification Listener. La aplicación solicita esto durante la configuración.</Note>

## Relacionado

- [app de iOS](/es/platforms/ios)
- [Nodos](/es/nodes)
- [Solución de problemas del nodo Android](/es/nodes/troubleshooting)
