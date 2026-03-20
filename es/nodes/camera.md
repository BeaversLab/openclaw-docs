---
summary: "Captura de cámara (nodos iOS/Android + aplicación macOS) para uso del agente: fotos (jpg) y clips de video cortos (mp4)"
read_when:
  - Agregar o modificar la captura de cámara en nodos iOS/Android o macOS
  - Extender los flujos de trabajo de archivos temporales MEDIA accesibles para el agente
title: "Captura de cámara"
---

# Captura de cámara (agente)

OpenClaw admite **captura de cámara** para flujos de trabajo del agente:

- **Nodo iOS** (emparejado a través de Gateway): capturar una **foto** (`jpg`) o un **clip de video corto** (`mp4`, con audio opcional) a través de `node.invoke`.
- **Nodo Android** (emparejado a través de Gateway): capturar una **foto** (`jpg`) o un **clip de video corto** (`mp4`, con audio opcional) a través de `node.invoke`.
- **Aplicación macOS** (nodo a través de Gateway): capturar una **foto** (`jpg`) o un **clip de video corto** (`mp4`, con audio opcional) a través de `node.invoke`.

Todo el acceso a la cámara está restringido por **configuraciones controladas por el usuario**.

## Nodo iOS

### Configuración de usuario (activado por defecto)

- Pestaña Ajustes de iOS → **Cámara** → **Permitir cámara** (`camera.enabled`)
  - Predeterminado: **activado** (la clave faltante se trata como habilitada).
  - Cuando está desactivado: los comandos `camera.*` devuelven `CAMERA_DISABLED`.

### Comandos (a través de Gateway `node.invoke`)

- `camera.list`
  - Payload de respuesta:
    - `devices`: matriz de `{ id, name, position, deviceType }`

- `camera.snap`
  - Parámetros:
    - `facing`: `front|back` (predeterminado: `front`)
    - `maxWidth`: número (opcional; predeterminado `1600` en el nodo iOS)
    - `quality`: `0..1` (opcional; predeterminado `0.9`)
    - `format`: actualmente `jpg`
    - `delayMs`: número (opcional; predeterminado `0`)
    - `deviceId`: cadena (opcional; de `camera.list`)
  - Payload de respuesta:
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Payload guard: las fotos se recomprimen para mantener el payload base64 por debajo de 5 MB.

- `camera.clip`
  - Params:
    - `facing`: `front|back` (predeterminado: `front`)
    - `durationMs`: número (predeterminado `3000`, limitado a un máximo de `60000`)
    - `includeAudio`: booleano (predeterminado `true`)
    - `format`: actualmente `mp4`
    - `deviceId`: cadena (opcional; de `camera.list`)
  - Response payload:
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### Foreground requirement

Al igual que `canvas.*`, el nodo de iOS solo permite comandos `camera.*` en **primer plano**. Las invocaciones en segundo plano devuelven `NODE_BACKGROUND_UNAVAILABLE`.

### CLI helper (archivos temporales + MEDIA)

La forma más fácil de obtener archivos adjuntos es a través del asistente de CLI, que escribe los medios decodificados en un archivo temporal e imprime `MEDIA:<path>`.

Ejemplos:

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

Notas:

- `nodes camera snap` se predetermina a **ambas** orientaciones para dar al agente ambas vistas.
- Los archivos de salida son temporales (en el directorio temporal del SO) a menos que cree su propio contenedor.

## Nodo de Android

### Configuración de usuario de Android (activado por defecto)

- Hoja de configuración de Android → **Cámara** → **Permitir cámara** (`camera.enabled`)
  - Predeterminado: **activado** (la clave faltante se trata como habilitada).
  - Cuando está desactivado: los comandos `camera.*` devuelven `CAMERA_DISABLED`.

### Permisos

- Android requiere permisos de tiempo de ejecución:
  - `CAMERA` tanto para `camera.snap` como para `camera.clip`.
  - `RECORD_AUDIO` para `camera.clip` cuando `includeAudio=true`.

Si faltan los permisos, la aplicación solicitará cuando sea posible; si se deniega, las solicitudes `camera.*` fallan con un
error `*_PERMISSION_REQUIRED`.

### Requisito de primer plano de Android

Al igual que `canvas.*`, el nodo Android solo permite comandos `camera.*` en **primer plano**. Las invocaciones en segundo plano devuelven `NODE_BACKGROUND_UNAVAILABLE`.

### Comandos de Android (vía Gateway `node.invoke`)

- `camera.list`
  - Payload de respuesta:
    - `devices`: matriz de `{ id, name, position, deviceType }`

### Protección de payload

Las fotos se recomprimen para mantener el payload base64 por debajo de 5 MB.

## Aplicación macOS

### Ajuste de usuario (desactivado por defecto)

La aplicación complementaria de macOS expone una casilla de verificación:

- **Ajustes → General → Permitir cámara** (`openclaw.cameraEnabled`)
  - Por defecto: **desactivado**
  - Cuando está desactivado: las solicitudes de cámara devuelven "Camera disabled by user".

### Auxiliar de CLI (invocación de nodo)

Use la CLI principal `openclaw` para invocar comandos de cámara en el nodo macOS.

Ejemplos:

```bash
openclaw nodes camera list --node <id>            # list camera ids
openclaw nodes camera snap --node <id>            # prints MEDIA:<path>
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s          # prints MEDIA:<path>
openclaw nodes camera clip --node <id> --duration-ms 3000      # prints MEDIA:<path> (legacy flag)
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

Notas:

- `openclaw nodes camera snap` tiene como valor predeterminado `maxWidth=1600` a menos que se anule.
- En macOS, `camera.snap` espera `delayMs` (por defecto 2000ms) después del calentamiento/ajuste de exposición antes de capturar.
- Los payloads de fotos se recomprimen para mantener base64 por debajo de 5 MB.

## Límites de seguridad y prácticos

- El acceso a la cámara y al micrófono activa las indicaciones de permisos habituales del SO (y requiere cadenas de uso en Info.plist).
- Los clips de vídeo están limitados (actualmente `<= 60s`) para evitar payloads de nodo excesivamente grandes (sobrecarga de base64 + límites de mensajes).

## Vídeo de pantalla macOS (nivel de SO)

Para el vídeo de _pantalla_ (no de cámara), use el complemento macOS:

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

Notas:

- Requiere el permiso de **Grabación de pantalla** de macOS (TCC).

import es from "/components/footer/es.mdx";

<es />
