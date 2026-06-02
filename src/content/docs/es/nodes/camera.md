---
summary: "Captura de cámara (nodos iOS/Android + aplicación macOS) para uso del agente: fotos (jpg) y videoclips cortos (mp4)"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "Captura de cámara"
---

OpenClaw admite la **captura de cámara** para los flujos de trabajo de los agentes:

- **Nodo iOS** (emparejado a través de Gateway): capturar una **foto** (`jpg`) o un **clip de video corto** (`mp4`, con audio opcional) a través de `node.invoke`.
- **Nodo Android** (emparejado a través de Gateway): capturar una **foto** (`jpg`) o un **clip de video corto** (`mp4`, con audio opcional) a través de `node.invoke`.
- **Aplicación macOS** (nodo a través de Gateway): capturar una **foto** (`jpg`) o un **clip de video corto** (`mp4`, con audio opcional) a través de `node.invoke`.

Todo el acceso a la cámara está controlado por **ajustes controlados por el usuario**.

## Nodo iOS

### Ajuste de usuario (activado por defecto)

- Pestaña Ajustes de iOS → **Cámara** → **Permitir cámara** (`camera.enabled`)
  - Predeterminado: **activado** (la falta de clave se trata como habilitado).
  - Cuando está desactivado: los comandos `camera.*` devuelven `CAMERA_DISABLED`.

### Comandos (vía Gateway `node.invoke`)

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
  - Protección de carga útil: las fotos se recomprimen para mantener la carga útil base64 por debajo de 5 MB.

- `camera.clip`
  - Parámetros:
    - `facing`: `front|back` (predeterminado: `front`)
    - `durationMs`: número (predeterminado `3000`, limitado a un máximo de `60000`)
    - `includeAudio`: booleano (predeterminado `true`)
    - `format`: actualmente `mp4`
    - `deviceId`: cadena (opcional; de `camera.list`)
  - Respuesta de carga útil:
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### Requisito de primer plano

Al igual que `canvas.*`, el nodo iOS solo permite comandos `camera.*` en **primer plano**. Las invocaciones en segundo plano devuelven `NODE_BACKGROUND_UNAVAILABLE`.

### Auxiliar de CLI

La forma más sencilla de obtener archivos multimedia es a través del auxiliar de CLI, que escribe los medios decodificados en un archivo temporal e imprime la ruta guardada.

Ejemplos:

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

Notas:

- `nodes camera snap` por defecto a **ambas** orientaciones para dar al agente ambas vistas.
- Los archivos de salida son temporales (en el directorio temporal del SO) a menos que cree su propio contenedor.

## Nodo Android

### Configuración de usuario de Android (activado de forma predeterminada)

- Hoja de configuración de Android → **Cámara** → **Permitir cámara** (`camera.enabled`)
  - Predeterminado: **activado** (la clave faltante se trata como habilitada).
  - Cuando está desactivado: los comandos `camera.*` devuelven `CAMERA_DISABLED`.

### Permisos

- Android requiere permisos en tiempo de ejecución:
  - `CAMERA` para ambos `camera.snap` y `camera.clip`.
  - `RECORD_AUDIO` para `camera.clip` cuando `includeAudio=true`.

Si faltan permisos, la aplicación solicitará cuando sea posible; si se deniegan, las solicitudes `camera.*` fallan con un
error `*_PERMISSION_REQUIRED`.

### Requisito de primer plano de Android

Al igual que `canvas.*`, el nodo de Android solo permite comandos `camera.*` en **primer plano**. Las invocaciones en segundo plano devuelven `NODE_BACKGROUND_UNAVAILABLE`.

### Comandos de Android (vía Gateway `node.invoke`)

- `camera.list`
  - Respuesta de carga útil (payload):
    - `devices`: matriz de `{ id, name, position, deviceType }`

### Protección de carga útil (Payload guard)

Las fotos se recomprimen para mantener la carga útil en base64 por debajo de 5 MB.

## Aplicación macOS

### Configuración de usuario (desactivado por defecto)

La aplicación complementaria de macOS expone una casilla de verificación:

- **Configuración → General → Permitir cámara** (`openclaw.cameraEnabled`)
  - Predeterminado: **desactivado**
  - Cuando está desactivado: las solicitudes de la cámara devuelven "Cámara desactivada por el usuario".

### Auxiliar de CLI (invocación de nodo)

Use la CLI principal `openclaw` para invocar comandos de cámara en el nodo macOS.

Ejemplos:

```bash
openclaw nodes camera list --node <id>            # list camera ids
openclaw nodes camera snap --node <id>            # prints saved path
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s          # prints saved path
openclaw nodes camera clip --node <id> --duration-ms 3000      # prints saved path (legacy flag)
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

Notas:

- `openclaw nodes camera snap` por defecto es `maxWidth=1600` a menos que se anule.
- En macOS, `camera.snap` espera `delayMs` (por defecto 2000ms) después del calentamiento/ajuste de exposición antes de capturar.
- Las cargas útiles de las fotos se recomprimen para mantener base64 por debajo de 5 MB.

## Límites de seguridad y prácticos

- El acceso a la cámara y al micrófono activa las solicitudes de permisos habituales del sistema operativo (y requiere cadenas de uso en Info.plist).
- Los videoclips tienen un límite (actualmente `<= 60s`) para evitar cargas de nodos demasiado grandes (sobrecarga de base64 + límites de mensajes).

## Video de pantalla de macOS (nivel de sistema operativo)

Para video de _pantalla_ (no de cámara), use el complemento de macOS:

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints saved path
```

Notas:

- Requiere el permiso de **Grabación de pantalla** de macOS (TCC).

## Relacionado

- [Soporte de imágenes y medios](/es/nodes/images)
- [Comprensión de medios](/es/nodes/media-understanding)
- [Comando de ubicación](/es/nodes/location-command)
