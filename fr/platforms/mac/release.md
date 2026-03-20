---
summary: "OpenClaw macOS release checklist (Sparkle feed, packaging, signing)"
read_when:
  - Couper ou valider une version OpenClaw macOS
  - Mise à jour des ressources de l'appcast ou du flux Sparkle
title: "macOS Release"
---

# OpenClaw macOS release (Sparkle)

Cette application fournit désormais des mises à jour automatiques via Sparkle. Les versions de release doivent être signées avec un identifiant développeur, zippées et publiées avec une entrée d'appcast signée.

## Prereqs

- Certificat d'application d'ID développeur installé (exemple : `Developer ID Application: <Developer Name> (<TEAMID>)`).
- Chemin de la clé privée Sparkle défini dans l'environnement comme `SPARKLE_PRIVATE_KEY_FILE` (chemin vers votre clé privée ed25519 Sparkle ; clé publique intégrée dans Info.plist). Si elle est manquante, vérifiez `~/.profile`.
- Identifiants de notarisation (profil de trousseau ou clé API) pour `xcrun notarytool` si vous voulez une distribution DMG/zip sûre pour Gatekeeper.
  - Nous utilisons un profil de trousseau nommé `openclaw-notary`, créé à partir des variables d'environnement de clé API App Store Connect dans votre profil de shell :
    - `APP_STORE_CONNECT_API_KEY_P8`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/openclaw-notary.p8`
    - `xcrun notarytool store-credentials "openclaw-notary" --key /tmp/openclaw-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- Dépendances `pnpm` installées (`pnpm install --config.node-linker=hoisted`).
- Les outils Sparkle sont récupérés automatiquement via SwiftPM à `apps/macos/.build/artifacts/sparkle/Sparkle/bin/` (`sign_update`, `generate_appcast`, etc.).

## Build & package

Notes :

- `APP_BUILD` correspond à `CFBundleVersion`/`sparkle:version` ; gardez-le numérique et monotone (pas de `-beta`), sinon Sparkle le considère comme égal.
- Si `APP_BUILD` est omis, `scripts/package-mac-app.sh` déduit une valeur par défaut compatible Sparkle à partir de `APP_VERSION` (`YYYYMMDDNN` : stable par défaut à `90`, les préversions utilisent une voie dérivée d'un suffixe) et utilise la plus élevée de cette valeur et du nombre de commits git.
- Vous pouvez toujours remplacer `APP_BUILD` explicitement lorsque l'ingénierie de release nécessite une valeur monotone spécifique.
- Pour `BUILD_CONFIG=release`, `scripts/package-mac-app.sh` est maintenant par défaut universel (`arm64 x86_64`) automatiquement. Vous pouvez toujours forcer avec `BUILD_ARCHS=arm64` ou `BUILD_ARCHS=x86_64`. Pour les builds locales/dev (`BUILD_CONFIG=debug`), la valeur par défaut est l'architecture actuelle (`$(uname -m)`).
- Utilisez `scripts/package-mac-dist.sh` pour les artefacts de version (zip + DMG + notarisation). Utilisez `scripts/package-mac-app.sh` pour le packaging local/dev.

```bash
# From repo root; set release IDs so Sparkle feed is enabled.
# This command builds release artifacts without notarization.
# APP_BUILD must be numeric + monotonic for Sparkle compare.
# Default is auto-derived from APP_VERSION when omitted.
SKIP_NOTARIZE=1 \
BUNDLE_ID=ai.openclaw.mac \
APP_VERSION=2026.3.13 \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-dist.sh

# `package-mac-dist.sh` already creates the zip + DMG.
# If you used `package-mac-app.sh` directly instead, create them manually:
# If you want notarization/stapling in this step, use the NOTARIZE command below.
ditto -c -k --sequesterRsrc --keepParent dist/OpenClaw.app dist/OpenClaw-2026.3.13.zip

# Optional: build a styled DMG for humans (drag to /Applications)
scripts/create-dmg.sh dist/OpenClaw.app dist/OpenClaw-2026.3.13.dmg

# Recommended: build + notarize/staple zip + DMG
# First, create a keychain profile once:
#   xcrun notarytool store-credentials "openclaw-notary" \
#     --apple-id "<apple-id>" --team-id "<team-id>" --password "<app-specific-password>"
NOTARIZE=1 NOTARYTOOL_PROFILE=openclaw-notary \
BUNDLE_ID=ai.openclaw.mac \
APP_VERSION=2026.3.13 \
BUILD_CONFIG=release \
SIGN_IDENTITY="Developer ID Application: <Developer Name> (<TEAMID>)" \
scripts/package-mac-dist.sh

# Optional: ship dSYM alongside the release
ditto -c -k --keepParent apps/macos/.build/release/OpenClaw.app.dSYM dist/OpenClaw-2026.3.13.dSYM.zip
```

## Entrée Appcast

Utilisez le générateur de notes de version pour que Sparkle affiche des notes HTML formatées :

```bash
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.3.13.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
```

Génère des notes de version HTML à partir de `CHANGELOG.md` (via [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)) et les intègre dans l'entrée de l'appcast.
Validez le `appcast.xml` mis à jour avec les assets de version (zip + dSYM) lors de la publication.

## Publier et vérifier

- Téléchargez `OpenClaw-2026.3.13.zip` (et `OpenClaw-2026.3.13.dSYM.zip`) vers la version GitHub pour le tag `v2026.3.13`.
- Assurez-vous que l'URL brute de l'appcast correspond au flux traité : `https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`.
- Vérifications de base :
  - `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` renvoie 200.
  - `curl -I <enclosure url>` renvoie 200 après le téléchargement des assets.
  - Sur une build publique précédente, lancez "Vérifier les mises à jour…" depuis l'onglet À propos et vérifiez que Sparkle installe proprement la nouvelle build.

Définition de terminé : l'application signée + l'appcast sont publiés, le flux de mise à jour fonctionne depuis une version installée plus ancienne, et les assets de version sont attachés à la version GitHub.

import fr from "/components/footer/fr.mdx";

<fr />
