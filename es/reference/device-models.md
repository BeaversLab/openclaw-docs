---
summary: "Cómo OpenClaw incluye los identificadores de modelos de dispositivos de Apple para nombres descriptivos en la aplicación macOS."
read_when:
  - Updating device model identifier mappings or NOTICE/license files
  - Changing how Instances UI displays device names
title: "Base de datos de modelos de dispositivos"
---

# Base de datos de modelos de dispositivos (nombres descriptivos)

La aplicación complementaria de macOS muestra nombres de modelos de dispositivos de Apple descriptivos en la interfaz de usuario de **Instancias** al asignar identificadores de modelos de Apple (p. ej. `iPad16,6`, `Mac16,6`) a nombres legibles.

La asignación se incluye como JSON en:

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## Fuente de datos

Actualmente incluimos la asignación desde el repositorio con licencia MIT:

- `kyle-seongwoo-jun/apple-device-identifiers`

Para mantener las compilaciones deterministas, los archivos JSON se fijan a confirmaciones (commits) específicas de origen (registradas en `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`).

## Actualización de la base de datos

1. Elija las confirmaciones (commits) de origen a las que desea fijar (una para iOS, una para macOS).
2. Actualice los hashes de confirmación en `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`.
3. Vuelva a descargar los archivos JSON, fijos a esas confirmaciones:

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. Asegúrese de que `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` todavía coincida con el origen (reemplácelo si cambia la licencia del origen).
5. Verifique que la aplicación macOS se compile limpiamente (sin advertencias):

```bash
swift build --package-path apps/macos
```

import es from "/components/footer/es.mdx";

<es />
