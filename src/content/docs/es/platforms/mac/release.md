---
summary: "Lista de verificación de lanzamiento de OpenClaw para macOS (fuente Sparkle, empaquetado, firma)"
read_when:
  - Cutting or validating a OpenClaw macOS release
  - Updating the Sparkle appcast or feed assets
title: "Lanzamiento de macOS"
---

# Lanzamiento de OpenClaw para macOS (Sparkle)

Esta aplicación ahora incluye actualizaciones automáticas de Sparkle. Las compilaciones de lanzamiento deben estar firmadas con el ID de desarrollador, comprimidas y publicadas con una entrada de appcast firmada.

## Requisitos previos

- Certificado de ID de desarrollador de aplicación instalado (ejemplo: `Developer ID Application: <Developer Name> (<TEAMID>)`).
- Ruta de la clave privada de Sparkle establecida en el entorno como `SPARKLE_PRIVATE_KEY_FILE` (ruta a tu clave privada ed25519 de Sparkle; clave pública integrada en Info.plist). Si falta, verifica `~/.profile`.
- Credenciales de notaría (perfil de llavero o clave API) para `xcrun notarytool` si deseas distribución DMG/zip segura para Gatekeeper.
  - Usamos un perfil de llavero llamado `openclaw-notary`, creado a partir de variables de entorno de clave API de App Store Connect en tu perfil de shell:
    - `APP_STORE_CONNECT_API_KEY_P8`, `APP_STORE_CONNECT_KEY_ID`, `APP_STORE_CONNECT_ISSUER_ID`
    - `echo "$APP_STORE_CONNECT_API_KEY_P8" | sed 's/\\n/\n/g' > /tmp/openclaw-notary.p8`
    - `xcrun notarytool store-credentials "openclaw-notary" --key /tmp/openclaw-notary.p8 --key-id "$APP_STORE_CONNECT_KEY_ID" --issuer "$APP_STORE_CONNECT_ISSUER_ID"`
- Dependencias de `pnpm` instaladas (`pnpm install --config.node-linker=hoisted`).
- Las herramientas de Sparkle se obtienen automáticamente a través de SwiftPM en `apps/macos/.build/artifacts/sparkle/Sparkle/bin/` (`sign_update`, `generate_appcast`, etc.).

## Compilar y empaquetar

Notas:

- `APP_BUILD` se asigna a `CFBundleVersion`/`sparkle:version`; manténlo numérico y monótono (sin `-beta`), o Sparkle lo comparará como igual.
- Si se omite `APP_BUILD`, `scripts/package-mac-app.sh` deriva un valor predeterminado seguro para Sparkle a partir de `APP_VERSION` (`YYYYMMDDNN`: estable usa por defecto `90`, las versiones preliminares usan un canal derivado del sufijo) y usa el valor más alto entre ese y el recuento de confirmaciones de git.
- Aún puedes anular `APP_BUILD` explícitamente cuando la ingeniería de lanzamientos necesita un valor monótono específico.
- Para `BUILD_CONFIG=release`, `scripts/package-mac-app.sh` ahora se predetermina a universal (`arm64 x86_64`) automáticamente. Aún puedes anular esto con `BUILD_ARCHS=arm64` o `BUILD_ARCHS=x86_64`. Para las compilaciones locales/de desarrollo (`BUILD_CONFIG=debug`), se predetermina a la arquitectura actual (`$(uname -m)`).
- Usa `scripts/package-mac-dist.sh` para los artefactos de lanzamiento (zip + DMG + notarización). Usa `scripts/package-mac-app.sh` para el empaquetado local/de desarrollo.

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

## Entrada de Appcast

Usa el generador de notas de lanzamiento para que Sparkle renderice notas HTML con formato:

```bash
SPARKLE_PRIVATE_KEY_FILE=/path/to/ed25519-private-key scripts/make_appcast.sh dist/OpenClaw-2026.3.13.zip https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml
```

Genera notas de lanzamiento HTML desde `CHANGELOG.md` (vía [`scripts/changelog-to-html.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/changelog-to-html.sh)) y las incrusta en la entrada del appcast.
Confirma el `appcast.xml` actualizado junto con los activos de lanzamiento (zip + dSYM) al publicar.

## Publicar y verificar

- Sube `OpenClaw-2026.3.13.zip` (y `OpenClaw-2026.3.13.dSYM.zip`) al lanzamiento de GitHub para la etiqueta `v2026.3.13`.
- Asegúrate de que la URL del appcast sin procesar coincida con el feed preparado: `https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml`.
- Comprobaciones de cordura:
  - `curl -I https://raw.githubusercontent.com/openclaw/openclaw/main/appcast.xml` devuelve 200.
  - `curl -I <enclosure url>` devuelve 200 después de subir los activos.
  - En una compilación pública anterior, ejecuta "Buscar actualizaciones…" desde la pestaña Acerca de y verifica que Sparkle instale la nueva compilación correctamente.

Definición de terminado: la aplicación firmada + el appcast están publicados, el flujo de actualización funciona desde una versión instalada anterior y los activos de lanzamiento están adjuntos al lanzamiento de GitHub.
