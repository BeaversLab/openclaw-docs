---
summary: "Cómo OpenClaw incluye los identificadores de modelos de dispositivos de Apple para nombres descriptivos en la aplicación macOS."
read_when:
  - Updating device model identifier mappings or NOTICE/license files
  - Changing how Instances UI displays device names
title: "Base de datos de modelos de dispositivos"
---

La aplicación complementaria de macOS muestra nombres de modelos de dispositivos de Apple legibles en la interfaz de usuario de **Instancias** mapeando los identificadores de modelo de Apple (p. ej., `iPad16,6`, `Mac16,6`) a nombres legibles por humanos.

El mapeo se incluye como JSON en:

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## Fuente de datos

Actualmente incluimos el mapeo desde el repositorio con licencia MIT:

- `kyle-seongwoo-jun/apple-device-identifiers`

Para mantener las compilaciones deterministas, los archivos JSON se fijan a confirmaciones (commits) ascendentes específicas (registradas en `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`).

## Actualizar la base de datos

1. Elija las confirmaciones ascendentes a las que desea fijar (una para iOS, una para macOS).
2. Actualice los hashes de confirmación en `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`.
3. Vuelva a descargar los archivos JSON, fijados a esas confirmaciones:

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. Asegúrese de que `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` siga coincidiendo con el ascendente (reemplácelo si la licencia ascendente cambia).
5. Verifique que la aplicación de macOS se compile correctamente (sin advertencias):

```bash
swift build --package-path apps/macos
```

## Relacionado

- [Nodos](/es/nodes)
- [Solución de problemas de nodos](/es/nodes/troubleshooting)
