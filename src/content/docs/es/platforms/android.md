---
summary: "Aplicación de Android (nodo): manual de conexión + superficie de comandos Connect/Chat/Voice/Canvas"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Aplicación de Android"
---

<Note>
  La aplicación de Android aún no se ha lanzado públicamente. El código fuente está disponible en el [repositorio OpenClaw](https://github.com/openclaw/openclaw) bajo `apps/android`. Puedes compilarla tú mismo usando Java 17 y el SDK de Android (`./gradlew :app:assemblePlayDebug`). Consulta [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) para obtener
  instrucciones de compilación.
</Note>

## Instantánea de soporte

- Rol: aplicación de nodo complementario (Android no aloja el Gateway).
- Gateway requerido: sí (ejecútelo en macOS, Linux o Windows a través de WSL2).
- Instalación: [Cómo empezar](/es/start/getting-started) + [Emparejamiento](/es/channels/pairing).
- Gateway: [Manual](/es/gateway) + [Configuración](/es/gateway/configuration).
  - Protocolos: [Protocolo Gateway](/es/gateway/protocol) (nodos + plano de control).

## Control del sistema

El control del sistema (launchd/systemd) reside en el host del Gateway. Consulte [Gateway](/es/gateway).

## Manual de conexión

Aplicación de nodo de Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se conecta directamente al WebSocket del Gateway y utiliza el emparejamiento de dispositivos (`role: node`).

Para Tailscale o hosts públicos, Android requiere un punto final seguro:

- Preferido: Tailscale Serve / Funnel con `https://<magicdns>` / `wss://<magicdns>`
- También compatible: cualquier otra `wss://` URL de Gateway con un punto final TLS real
- `ws://` en texto sin formato sigue siendo compatible en direcciones LAN privadas / hosts `.local`, además de `localhost`, `127.0.0.1` y el puente del emulador de Android (`10.0.2.2`)

### Requisitos previos

- Puede ejecutar el Gateway en la máquina "maestra".
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

Más notas de depuración: [Bonjour](/es/gateway/bonjour).

Si también configuró un dominio de descubrimiento de área amplia, compare con:

```bash
openclaw gateway discover --json
```

Eso muestra `local.` más el dominio de área amplia configurado de una sola vez y utiliza el punto final del servicio resuelto en lugar de solo pistas TXT.

#### Descubrimiento de Tailnet (Viena ⇄ Londres) a través de unicast DNS-SD

El descubrimiento NSD/mDNS de Android no cruzará las redes. Si su nodo de Android y la puerta de enlace están en redes diferentes pero conectados a través de Tailscale, utilice Wide-Area Bonjour / unicast DNS-SD en su lugar.

El descubrimiento por sí solo no es suficiente para el emparejamiento de Android de Tailnet/público. La ruta descubierta aún necesita un punto final seguro (`wss://` o Tailscale Serve):

1. Configure una zona DNS-SD (ejemplo `openclaw.internal.`) en el host de la puerta de enlace y publique registros `_openclaw-gw._tcp`.
2. Configure el DNS dividido de Tailscale para su dominio elegido apuntando a ese servidor DNS.

Detalles y configuración de ejemplo de CoreDNS: [Bonjour](/es/gateway/bonjour).

### 3) Conectar desde Android

En la aplicación de Android:

- La aplicación mantiene su conexión de puerta de enlace activa a través de un **servicio en primer plano** (notificación persistente).
- Abra la pestaña **Conectar**.
- Utilice el modo **Código de configuración** o **Manual**.
- Si el descubrimiento está bloqueado, utilice el host/puerto manual en **Controles avanzados**. Para hosts de LAN privados, `ws://` todavía funciona. Para hosts públicos de Tailscale, active TLS y utilice un punto final `wss://` / Tailscale Serve.

Tras el primer emparejamiento exitoso, Android se vuelve a conectar automáticamente al iniciar:

- Punto final manual (si está habilitado), de lo contrario
- La última pasarela descubierta (best-effort).

### 4) Aprobar emparejamiento (CLI)

En la máquina de la pasarela:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Detalles del emparejamiento: [Emparejamiento](/es/channels/pairing).

Opcional: si el nodo Android siempre se conecta desde una subred estrictamente controlada,
puedes optar por la autoaprobación de nodos por primera vez con CIDRs explícitos o IPs exactas:

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

Esto está deshabilitado por defecto. Solo se aplica al emparejamiento `role: node` nuevo con
ningún ámbito solicitado. El emparejamiento de operador/navegador y cualquier cambio de rol, ámbito, metadatos o
clave pública todavía requieren aprobación manual.

### 5) Verificar que el nodo esté conectado

- A través del estado de nodos:

  ```bash
  openclaw nodes status
  ```

- A través de la pasarela:

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historial

La pestaña Chat de Android admite la selección de sesión (por defecto `main`, más otras sesiones existentes):

- Historial: `chat.history` (normalizado para visualización; las etiquetas de directivas en línea se
  eliminan del texto visible, las cargas útiles XML de llamadas a herramientas de texto sin formato (incluyendo
  `<tool_call>...</tool_call>`, `<function_call>...</function_call>`,
  `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, y
  bloques de llamadas a herramientas truncados) y los tokens de control de modelo ASCII/de ancho completo filtrados
  se eliminan, las filas de asistente de tokens silenciosos puros como `NO_REPLY` /
  `no_reply` exactos se omiten, y las filas demasiado grandes pueden ser reemplazadas por marcadores de posición)
- Enviar: `chat.send`
- Actualizaciones push (best-effort): `chat.subscribe` → `event:"chat"`

### 7) Canvas + cámara

#### Gateway Canvas Host (recomendado para contenido web)

Si deseas que el nodo muestre HTML/CSS/JS real que el agente pueda editar en el disco, apunta el nodo al host de canvas de la pasarela.

<Note>Los nodos cargan el canvas desde el servidor HTTP de la pasarela (mismo puerto que `gateway.port`, por defecto `18789`).</Note>

1. Crea `~/.openclaw/workspace/canvas/index.html` en el host de la pasarela.

2. Navega el nodo hacia él (LAN):

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (opcional): si ambos dispositivos están en Tailscale, usa un nombre MagicDNS o una IP de tailnet en lugar de `.local`, por ej. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Este servidor inyecta un cliente de recarga en vivo (live-reload) en el HTML y recarga cuando hay cambios en los archivos.
El host de A2UI se encuentra en `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Comandos de Canvas (solo en primer plano):

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (use `{"url":""}` o `{"url":"/"}` para volver al andamio (scaffold) predeterminado). `canvas.snapshot` devuelve `{ format, base64 }` (predeterminado `format="jpeg"`).
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` alias heredado)

Comandos de cámara (solo en primer plano; sujetos a permisos):

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Consulte [Camera node](/es/nodes/camera) para obtener parámetros y ayudantes de CLI.

### 8) Voz + superficie de comandos de Android ampliada

- Pestaña Voice: Android tiene dos modos de captura explícitos. **Mic** es una sesión manual de la pestaña Voice que envía cada pausa como un turno de chat y se detiene cuando la aplicación sale del primer plano o el usuario abandona la pestaña Voice. **Talk** es el Modo Talk continuo y sigue escuchando hasta que se desactiva o el nodo se desconecta.
- El Modo Talk promueve el servicio en primer plano existente de `dataSync` a `dataSync|microphone` antes de que comience la captura y luego lo degrada cuando se detiene el Modo Talk. Android 14+ requiere la declaración `FOREGROUND_SERVICE_MICROPHONE`, la concesión en tiempo de ejecución `RECORD_AUDIO` y el tipo de servicio de micrófono en tiempo de ejecución.
- Las respuestas habladas utilizan `talk.speak` a través del proveedor Talk de la puerta de enlace configurada. El TTS del sistema local solo se usa cuando `talk.speak` no está disponible.
- La activación por voz (voice wake) permanece deshabilitada en el entorno de ejecución/UX de Android.
- Familias de comandos adicionales de Android (la disponibilidad depende del dispositivo + permisos):
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (consulte [Reenvío de notificaciones](#notification-forwarding) a continuación)
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Puntos de entrada del asistente

Android admite el inicio de OpenClaw desde el activador del asistente del sistema (Google
Assistant). Cuando se configura, mantener presionado el botón de inicio o decir "Ok Google, pregúntale a
OpenClaw..." abre la aplicación y pasa el mensaje al compositor de chat.

Esto utiliza los metadatos de **App Actions** de Android declarados en el manifiesto de la aplicación. No
se necesita configuración adicional en el lado de la puerta de enlace -- el intent del asistente se
maneja completamente por la aplicación de Android y se reenvía como un mensaje de chat normal.

<Note>La disponibilidad de App Actions depende del dispositivo, la versión de Google Play Services, y de si el usuario ha establecido OpenClaw como la aplicación de asistente predeterminada.</Note>

## Reenvío de notificaciones

Android puede reenviar las notificaciones del dispositivo a la puerta de enlace como eventos. Varios controles le permiten delimitar qué notificaciones se reenvían y cuándo.

| Clave                            | Tipo           | Descripción                                                                                                                  |
| -------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Solo reenviar notificaciones de estos nombres de paquete. Si se establece, se ignoran todos los demás paquetes.              |
| `notifications.denyPackages`     | string[]       | Nunca reenviar notificaciones de estos nombres de paquete. Se aplica después de `allowPackages`.                             |
| `notifications.quietHours.start` | cadena (HH:mm) | Inicio de la ventana de horas de silencio (hora local del dispositivo). Las notificaciones se suprimen durante esta ventana. |
| `notifications.quietHours.end`   | string (HH:mm) | Fin de la ventana de horas de silencio.                                                                                      |
| `notifications.rateLimit`        | number         | Máximo de notificaciones reenviadas por paquete por minuto. Las notificaciones excesivas se descartan.                       |

El selector de notificaciones también utiliza un comportamiento más seguro para los eventos de notificación reenviados, evitando el reenvío accidental de notificaciones confidenciales del sistema.

Ejemplo de configuración:

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

- [iOS app](/es/platforms/ios)
- [Nodos](/es/nodes)
- [Solución de problemas del nodo Android](/es/nodes/troubleshooting)
