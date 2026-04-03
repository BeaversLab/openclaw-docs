---
summary: "Aplicación de Android (nodo): manual de conexión + superficie de comandos Conectar/Chat/Voz/Lienzo"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Aplicación de Android"
---

# Aplicación de Android (Nodo)

> **Nota:** La aplicación de Android aún no se ha lanzado públicamente. El código fuente está disponible en el [repositorio OpenClaw](https://github.com/openclaw/openclaw) bajo `apps/android`. Puedes compilarla tú mismo usando Java 17 y el Android SDK (`./gradlew :app:assemblePlayDebug`). Consulta [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) para obtener instrucciones de compilación.

## Instantánea de compatibilidad

- Rol: aplicación de nodo complementario (Android no aloja el Gateway).
- Gateway requerido: sí (ejecútelo en macOS, Linux o Windows a través de WSL2).
- Instalación: [Introducción](/en/start/getting-started) + [Emparejamiento](/en/channels/pairing).
- Gateway: [Manual](/en/gateway) + [Configuración](/en/gateway/configuration).
  - Protocolos: [Protocolo de Gateway](/en/gateway/protocol) (nodos + plano de control).

## Control del sistema

El control del sistema (launchd/systemd) se encuentra en el host Gateway. Consulte [Gateway](/en/gateway).

## Manual de conexión

Aplicación de nodo Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se conecta directamente al WebSocket del Gateway (por defecto `ws://<host>:18789`) y usa emparejamiento de dispositivos (`role: node`).

### Requisitos previos

- Puede ejecutar el Gateway en la máquina "maestra".
- El dispositivo/emulador de Android puede alcanzar el WebSocket del gateway:
  - Misma LAN con mDNS/NSD, **o**
  - Misma red tailnet de Tailscale usando Wide-Area Bonjour / DNS-SD unicast (ver abajo), **o**
  - Host/puerto del gateway manual (alternativo)
- Puede ejecutar la CLI (`openclaw`) en la máquina gateway (o vía SSH).

### 1) Iniciar el Gateway

```bash
openclaw gateway --port 18789 --verbose
```

Confirme en los registros que ve algo como:

- `listening on ws://0.0.0.0:18789`

Para configuraciones solo tailnet (recomendado para Viena ⇄ Londres), vincule el gateway a la IP de tailnet:

- Configure `gateway.bind: "tailnet"` en `~/.openclaw/openclaw.json` en el host gateway.
- Reinicie el Gateway / la aplicación de la barra de menús de macOS.

### 2) Verificar el descubrimiento (opcional)

Desde la máquina del gateway:

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Más notas de depuración: [Bonjour](/en/gateway/bonjour).

#### Descubrimiento de Tailnet (Viena ⇄ Londres) mediante DNS-SD unicast

El descubrimiento de NSD/mDNS de Android no cruzará redes. Si su nodo de Android y la puerta de enlace están en redes diferentes pero conectados a través de Tailscale, use Wide-Area Bonjour / DNS-SD unicast en su lugar:

1. Configure una zona DNS-SD (ejemplo `openclaw.internal.`) en el host gateway y publique registros `_openclaw-gw._tcp`.
2. Configure el DNS dividido de Tailscale para su dominio elegido apuntando a ese servidor DNS.

Detalles y configuración de ejemplo de CoreDNS: [Bonjour](/en/gateway/bonjour).

### 3) Conectar desde Android

En la aplicación de Android:

- La aplicación mantiene su conexión de puerta de enlace activa a través de un **servicio en primer plano** (notificación persistente).
- Abra la pestaña **Conectar**.
- Use el modo **Código de configuración** o **Manual**.
- Si el descubrimiento está bloqueado, use host/puerto manual (y TLS/token/contraseña cuando sea necesario) en **Controles avanzados**.

Después del primer emparejamiento exitoso, Android se vuelve a conectar automáticamente al inicio:

- Endpoint manual (si está habilitado), de lo contrario,
- La última puerta de enlace descubierta (best-effort).

### 4) Aprobar emparejamiento (CLI)

En la máquina de la puerta de enlace:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Detalles del emparejamiento: [Emparejamiento](/en/channels/pairing).

### 5) Verificar que el nodo está conectado

- A través del estado de los nodos:

  ```bash
  openclaw nodes status
  ```

- A través de la puerta de enlace:

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historial

La pestaña Chat de Android admite la selección de sesión (por defecto `main`, más otras sesiones existentes):

- Historial: `chat.history`
- Enviar: `chat.send`
- Actualizaciones automáticas (best-effort): `chat.subscribe` → `event:"chat"`

### 7) Canvas + cámara

#### Host de Canvas de puerta de enlace (recomendado para contenido web)

Si desea que el nodo muestre HTML/CSS/JS real que el agente pueda editar en el disco, dirija el nodo al host de canvas de la puerta de enlace.

Nota: los nodos cargan el lienzo desde el servidor HTTP del Gateway (mismo puerto que `gateway.port`, por defecto `18789`).

1. Cree `~/.openclaw/workspace/canvas/index.html` en el host de la puerta de enlace.

2. Navegue el nodo hacia él (LAN):

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (opcional): si ambos dispositivos están en Tailscale, utilice un nombre MagicDNS o una IP de tailnet en lugar de `.local`, por ejemplo `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Este servidor inyecta un cliente de recarga en vivo en el HTML y se recarga cuando se cambian los archivos.
El host A2UI vive en `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Comandos de Canvas (solo en primer plano):

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (use `{"url":""}` o `{"url":"/"}` para volver al andamio predeterminado). `canvas.snapshot` devuelve `{ format, base64 }` (por defecto `format="jpeg"`).
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` alias heredado)

Comandos de cámara (solo en primer plano; restringidos por permisos):

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Consulte [Nodo de cámara](/en/nodes/camera) para conocer los parámetros y las herramientas de la CLI.

### 8) Voz + superficie de comandos de Android ampliada

- Voz: Android utiliza un único flujo de activación/desactivación del micrófono en la pestaña Voz con captura de transcripciones y reproducción TTS (ElevenLabs cuando está configurado, TTS del sistema como alternativa). La voz se detiene cuando la aplicación sale del primer plano.
- Los interruptores de modo de activación/conversación de voz se han eliminado actualmente de la experiencia de usuario/tiempo de ejecución de Android.
- Familias de comandos adicionales de Android (la disponibilidad depende del dispositivo + permisos):
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (consulte [Reenvío de notificaciones](#notification-forwarding) a continuación)
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Reenvío de notificaciones

Android puede reenviar las notificaciones del dispositivo a la puerta de enlace como eventos. Varios controles le permiten determinar qué notificaciones se reenvían y cuándo.

| Clave                            | Tipo           | Descripción                                                                                                                  |
| -------------------------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Solo reenviar notificaciones de estos nombres de paquetes. Si se establece, se ignoran todos los demás paquetes.             |
| `notifications.denyPackages`     | string[]       | Nunca reenviar notificaciones de estos nombres de paquetes. Se aplica después de `allowPackages`.                            |
| `notifications.quietHours.start` | cadena (HH:mm) | Inicio de la ventana de horas silenciosas (hora local del dispositivo). Las notificaciones se suprimen durante esta ventana. |
| `notifications.quietHours.end`   | cadena (HH:mm) | Fin de la ventana de horas silenciosas.                                                                                      |
| `notifications.rateLimit`        | número         | Máximo de notificaciones reenviadas por paquete por minuto. Las notificaciones en exceso se descartan.                       |

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
