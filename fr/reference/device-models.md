---
summary: "Comment OpenClaw fournit les identifiants de modèle d'appareil Apple pour les noms conviviaux dans l'application OpenClaw."
read_when:
  - Updating device model identifier mappings or NOTICE/license files
  - Changing how Instances UI displays device names
title: "Base de données de modèles d'appareil"
---

# Base de données de modèles d'appareil (noms conviviaux)

L'application compagnon macOS affiche les noms conviviaux des modèles d'appareil Apple dans l'interface utilisateur **Instances** en mappant les identifiants de modèle Apple (par exemple, `iPad16,6`, `Mac16,6`) à des noms lisibles par l'homme.

Le mappage fourni au format JSON se trouve sous :

- `apps/macos/Sources/OpenClaw/Resources/DeviceModels/`

## Source des données

Nous fournissons actuellement le mappage à partir du dépôt sous licence MIT :

- `kyle-seongwoo-jun/apple-device-identifiers`

Pour garder les constructions déterministes, les fichiers JSON sont épinglés à des commits amont spécifiques (enregistrés dans `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`).

## Mise à jour de la base de données

1. Choisissez les commits amont auxquels vous souhaitez vous épingler (un pour iOS, un pour macOS).
2. Mettez à jour les hachages de commit dans `apps/macos/Sources/OpenClaw/Resources/DeviceModels/NOTICE.md`.
3. Téléchargez à nouveau les fichiers JSON, épinglés à ces commits :

```bash
IOS_COMMIT="<commit sha for ios-device-identifiers.json>"
MAC_COMMIT="<commit sha for mac-device-identifiers.json>"

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${IOS_COMMIT}/ios-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/ios-device-identifiers.json

curl -fsSL "https://raw.githubusercontent.com/kyle-seongwoo-jun/apple-device-identifiers/${MAC_COMMIT}/mac-device-identifiers.json" \
  -o apps/macos/Sources/OpenClaw/Resources/DeviceModels/mac-device-identifiers.json
```

4. Assurez-vous que `apps/macos/Sources/OpenClaw/Resources/DeviceModels/LICENSE.apple-device-identifiers.txt` correspond toujours à l'amont (remplacez-le si la licence amont change).
5. Vérifiez que l'application macOS se construit proprement (sans avertissements) :

```bash
swift build --package-path apps/macos
```

import fr from '/components/footer/fr.mdx';

<fr />
