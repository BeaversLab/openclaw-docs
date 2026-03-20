---
summary: "Aplicación de Android (nodo): manual de conexión + superficie de comandos Connect/Chat/Voice/Canvas"
read_when:
  - Emparejamiento o reconexión del nodo de Android
  - Depuración del descubrimiento o autenticación de la puerta de enlace de Android
  - Verificar la paridad del historial de chat entre clientes
title: "Aplicación de Android"
---

# Aplicación de Android (Nodo)

> **Nota:** La aplicación de Android aún no se ha lanzado públicamente. El código fuente está disponible en el [repositorio OpenClaw](https://github.com/openclaw/openclaw) bajo `apps/android`. Puedes compilarla tú mismo usando Java 17 y el Android SDK (`./gradlew :app:assembleDebug`). Consulta [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) para obtener instrucciones de compilación.

## Resumen de soporte

- Rol: aplicación de nodo complementaria (Android no aloja la puerta de enlace).
- Puerta de enlace requerida: sí (ejecútala en macOS, Linux o Windows a través de WSL2).
- Instalación: [Introducción](/es/start/getting-started) + [Emparejamiento](/es/channels/pairing).
- Puerta de enlace: [Manual](/es/gateway) + [Configuración](/es/gateway/configuration).
  - Protocolos: [Protocolo de puerta de enlace](/es/gateway/protocol) (nodos + plano de control).

## Control del sistema

El control del sistema (launchd/systemd) reside en el host de la puerta de enlace. Consulta [Puerta de enlace](/es/gateway).

## Manual de conexión

Aplicación de nodo Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Puerta de enlace**

Android se conecta directamente al WebSocket de la puerta de enlace (por defecto `ws://<host>:18789`) y usa el emparejamiento de dispositivos (`role: node`).

### Requisitos previos

- Puedes ejecutar la puerta de enlace en la máquina "maestra".
- El dispositivo/emulador de Android puede alcanzar el WebSocket de la puerta de enlace:
  - Misma LAN con mDNS/NSD, **o**
  - Misma tailnet de Tailscale usando Wide-Area Bonjour / DNS-SD unicast (ver más abajo), **o**
  - Host/puerto de puerta de enlace manual (alternativo)
- Puedes ejecutar la CLI (`openclaw`) en la máquina de la puerta de enlace (o a través de SSH).

### 1) Iniciar la puerta de enlace

```bash
openclaw gateway --port 18789 --verbose
```

Confirma en los registros que ves algo como:

- `listening on ws://0.0.0.0:18789`

Para configuraciones solo de tailnet (recomendado para Viena ⇄ Londres), vincula la puerta de enlace a la IP de la tailnet:

- Establece `gateway.bind: "tailnet"` en `~/.openclaw/openclaw.json` en el host de la puerta de enlace.
- Reinicia la puerta de enlace / la aplicación de la barra de menús de macOS.

### 2) Verificar el descubrimiento (opcional)

Desde la máquina de la puerta de enlace:

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Más notas de depuración: [Bonjour](/es/gateway/bonjour).

#### Descubrimiento de Tailnet (Viena ⇄ Londres) mediante DNS-SD unicast

El descubrimiento NSD/mDNS de Android no cruzará las redes. Si el nodo de Android y la puerta de enlace están en diferentes redes pero conectados a través de Tailscale, utilice en su lugar Bonjour de área amplia / DNS-SD unicast:

1. Configure una zona DNS-SD (ejemplo `openclaw.internal.`) en el host de la puerta de enlace y publique registros `_openclaw-gw._tcp`.
2. Configure el DNS dividido de Tailscale para su dominio elegido apuntando a ese servidor DNS.

Detalles y configuración de ejemplo de CoreDNS: [Bonjour](/es/gateway/bonjour).

### 3) Conectar desde Android

En la aplicación de Android:

- La aplicación mantiene su conexión con la puerta de enlace activa a través de un **servicio en primer plano** (notificación persistente).
- Abra la pestaña **Conectar**.
- Use el modo **Código de configuración** o **Manual**.
- Si el descubrimiento está bloqueado, use host/puerto manual (y TLS/token/contraseña cuando sea necesario) en **Controles avanzados**.

Después del primer emparejamiento exitoso, Android se vuelve a conectar automáticamente al iniciar:

- Punto final manual (si está habilitado), de lo contrario
- La última puerta de enlace descubierta (mejor esfuerzo).

### 4) Aprobar emparejamiento (CLI)

En la máquina de puerta de enlace:

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Detalles del emparejamiento: [Emparejamiento](/es/channels/pairing).

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

La pestaña Chat de Android admite la selección de sesión (por defecto `main`, más otras sesiones existentes):

- Historial: `chat.history`
- Enviar: `chat.send`
- Actualizaciones push (mejor esfuerzo): `chat.subscribe` → `event:"chat"`

### 7) Canvas + cámara

#### Host de Canvas de puerta de enlace (recomendado para contenido web)

Si desea que el nodo muestre HTML/CSS/JS real que el agente pueda editar en el disco, dirija el nodo al host de canvas de la puerta de enlace.

Nota: los nodos cargan el canvas desde el servidor HTTP de la puerta de enlace (mismo puerto que `gateway.port`, por defecto `18789`).

1. Cree `~/.openclaw/workspace/canvas/index.html` en el host de la puerta de enlace.

2. Navegue el nodo hacia él (LAN):

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (opcional): si ambos dispositivos están en Tailscale, use un nombre MagicDNS o una IP de tailnet en lugar de `.local`, p. ej. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Este servidor inyecta un cliente de recarga en vivo en el HTML y recarga cuando se cambian los archivos.
El host A2UI se encuentra en `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Comandos de Canvas (solo en primer plano):

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (use `{"url":""}` o `{"url":"/"}` para volver al andamio predeterminado). `canvas.snapshot` devuelve `{ format, base64 }` (`format="jpeg"` predeterminado).
- A2UI: `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` alias heredado)

Comandos de cámara (solo en primer plano; restringidos por permisos):

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Consulte [Camera node](/es/nodes/camera) para ver los parámetros y los asistentes de CLI.

### 8) Voz + superficie de comandos de Android ampliada

- Voz: Android usa un único flujo de encendido/apagado del micrófono en la pestaña Voz con captura de transcripciones y reproducción TTS (ElevenLabs cuando está configurado, TTS del sistema como alternativa). La voz se detiene cuando la aplicación sale del primer plano.
- Los interruptores de modo de activación/hablar por voz se han eliminado actualmente de la experiencia de usuario/tiempo de ejecución de Android.
- Familias de comandos adicionales de Android (la disponibilidad depende del dispositivo + permisos):
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions`
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `motion.activity`, `motion.pedometer`

import es from "/components/footer/es.mdx";

<es />
