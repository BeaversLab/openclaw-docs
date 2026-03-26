---
summary: "Captura de cámara (nodos iOS/Android + aplicación macOS) para uso del agente: fotos (jpg) y videoclips cortos (mp4)"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "Captura de cámara"
---

# Captura de cámara (agente)

OpenClaw admite la **captura de cámara** para los flujos de trabajo del agente:

- **Nodo iOS** (emparejado a través de Gateway): capturar una **foto** (`jpg`) o un **videoclip corto** (`mp4`, con audio opcional) a través de `node.invoke`.
- **Nodo Android** (emparejado a través de Gateway): capturar una **foto** (`jpg`) o un **videoclip corto** (`mp4`, con audio opcional) a través de `node.invoke`.
- **Aplicación macOS** (nodo a través de Gateway): capturar una **foto** (`jpg`) o un **videoclip corto** (`mp4`, con audio opcional) a través de `node.invoke`.

Todo el acceso a la cámara está controlado por **configuraciones controladas por el usuario**.

## Nodo iOS

### Configuración de usuario (activada por defecto)

- Pestaña Configuración de iOS → **Cámara** → **Permitir cámara** (`camera.enabled`)
  - Predeterminado: **activado** (la clave faltante se trata como habilitada).
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
  - Carga útil de respuesta:
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### Requisito de primer plano

Al igual que `canvas.*`, el nodo iOS solo permite comandos `camera.*` en **primer plano**. Las invocaciones en segundo plano devuelven `NODE_BACKGROUND_UNAVAILABLE`.

### Auxiliar de CLI (archivos temporales + MEDIA)

La forma más fácil de obtener archivos adjuntos es a través del auxiliar de CLI, que escribe los medios decodificados en un archivo temporal e imprime `MEDIA:<path>`.

Ejemplos:

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

Notas:

- `nodes camera snap` tiene como valor predeterminado **ambas** orientaciones para darle al agente ambas vistas.
- Los archivos de salida son temporales (en el directorio temporal del sistema operativo) a menos que cree su propio contenedor.

## Nodo Android

### Configuración de usuario de Android (activada por defecto)

- Hoja de configuración de Android → **Cámara** → **Permitir cámara** (`camera.enabled`)
  - Predeterminado: **activado** (la clave faltante se trata como habilitada).
  - Cuando está desactivado: los comandos `camera.*` devuelven `CAMERA_DISABLED`.

### Permisos

- Android requiere permisos en tiempo de ejecución:
  - `CAMERA` tanto para `camera.snap` como para `camera.clip`.
  - `RECORD_AUDIO` para `camera.clip` cuando `includeAudio=true`.

Si faltan permisos, la aplicación solicitará cuando sea posible; si se deniegan, las solicitudes `camera.*` fallan con un
error `*_PERMISSION_REQUIRED`.

### Requisito de primer plano de Android

Al igual que `canvas.*`, el nodo Android solo permite comandos `camera.*` en **primer plano**. Las invocaciones en segundo plano devuelven `NODE_BACKGROUND_UNAVAILABLE`.

### Comandos de Android (vía Gateway `node.invoke`)

- `camera.list`
  - Respuesta de carga útil:
    - `devices`: matriz de `{ id, name, position, deviceType }`

### Protección de carga útil

Las fotos se recomprimen para mantener la carga útil base64 por debajo de 5 MB.

## aplicación macOS

### Configuración de usuario (desactivada por defecto)

La aplicación complementaria de macOS expone una casilla de verificación:

- **Configuración → General → Permitir cámara** (`openclaw.cameraEnabled`)
  - Predeterminado: **desactivado**
  - Cuando está desactivado: las solicitudes de cámara devuelven "Cámara desactivada por el usuario".

### Ayudante de CLI (invocación de nodo)

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

- `openclaw nodes camera snap` usa `maxWidth=1600` de forma predeterminada a menos que se anule.
- En macOS, `camera.snap` espera `delayMs` (predeterminado 2000 ms) después del calentamiento/ajuste de exposición antes de capturar.
- Las cargas útiles de las fotos se recomprimen para mantener base64 por debajo de 5 MB.

## Límites de seguridad y prácticos

- El acceso a la cámara y al micrófono activa las indicaciones de permiso habituales del sistema operativo (y requiere cadenas de uso en Info.plist).
- Los clips de video tienen un límite (actualmente `<= 60s`) para evitar cargas útiles de nodo excesivamente grandes (sobrecarga de base64 + límites de mensajes).

## video de pantalla macOS (nivel de sistema operativo)

Para video de _pantalla_ (no de cámara), use el complemento de macOS:

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

Notas:

- Requiere el permiso de **Grabación de pantalla** de macOS (TCC).

import es from "/components/footer/es.mdx";

<es />
