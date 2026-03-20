---
summary: "Cómo OpenClaw provee identificadores de modelos de dispositivos de Apple para nombres descriptivos en la aplicación macOS."
read_when:
  - Actualizando las asignaciones de identificadores de modelos de dispositivo o los archivos NOTICE/licencia
  - Cambiar cómo la interfaz de usuario de Instances muestra los nombres de los dispositivos
title: "Base de datos de modelos de dispositivos"
---

# Base de datos de modelos de dispositivos (nombres descriptivos)

La aplicación complementaria de macOS muestra nombres descriptivos de modelos de dispositivos de Apple en la interfaz de usuario de **Instances** asignando identificadores de modelos de Apple (p. ej. `iPad16,6`, `Mac16,6`) a nombres legibles.

La asignación se provee como JSON en:

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## Fuente de datos

Actualmente proveemos la asignación desde el repositorio con licencia MIT:

- `kyle-seongwoo-jun/apple-device-identifiers`

Para mantener las compilaciones deterministas, los archivos JSON están fijados a confirmaciones (commits) específicas del repositorio original (registradas en `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`).

## Actualización de la base de datos

1. Elija las confirmaciones (commits) del repositorio original a las que desea fijar (una para iOS, otra para macOS).
2. Actualice los hashes de las confirmaciones en `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`.
3. Vuelva a descargar los archivos JSON, fijados a esas confirmaciones:

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. Asegúrese de que `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` todavía coincida con el repositorio original (reemplácelo si la licencia del repositorio original cambia).
5. Verifique que la aplicación macOS se compile limpiamente (sin advertencias):

```bash
swift build --package-path apps/macos
```

import en from "/components/footer/en.mdx";

<en />
