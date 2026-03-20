---
summary: "Étapes de signature pour les versions de débogage macOS générées par les scripts de packaging"
read_when:
  - Building or signing mac debug builds
title: "macOS Signing"
---

# signature mac (versions de débogage)

This app is usually built from [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh), which now:

- sets a stable debug bundle identifier: `ai.openclaw.mac.debug`
- writes the Info.plist with that bundle id (override via `BUNDLE_ID=...`)
- calls [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) to sign the main binary and app bundle so macOS treats each rebuild as the same signed bundle and keeps TCC permissions (notifications, accessibility, screen recording, mic, speech). For stable permissions, use a real signing identity; ad-hoc is opt-in and fragile (see [macOS permissions](/fr/platforms/mac/permissions)).
- uses `CODESIGN_TIMESTAMP=auto` by default; it enables trusted timestamps for Developer ID signatures. Set `CODESIGN_TIMESTAMP=off` to skip timestamping (offline debug builds).
- inject build metadata into Info.plist: `OpenClawBuildTimestamp` (UTC) and `OpenClawGitCommit` (short hash) so the About pane can show build, git, and debug/release channel.
- **Packaging defaults to Node 24**: the script runs TS builds and the Control UI build. Node 22 LTS, currently `22.16+`, remains supported for compatibility.
- reads `SIGN_IDENTITY` from the environment. Add `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"` (or your Developer ID Application cert) to your shell rc to always sign with your cert. Ad-hoc signing requires explicit opt-in via `ALLOW_ADHOC_SIGNING=1` or `SIGN_IDENTITY="-"` (not recommended for permission testing).
- runs a Team ID audit after signing and fails if any Mach-O inside the app bundle is signed by a different Team ID. Set `SKIP_TEAM_ID_CHECK=1` to bypass.

## Utilisation

```bash
# from repo root
scripts/package-mac-app.sh               # auto-selects identity; errors if none found
SIGN_IDENTITY="Developer ID Application: Your Name" scripts/package-mac-app.sh   # real cert
ALLOW_ADHOC_SIGNING=1 scripts/package-mac-app.sh    # ad-hoc (permissions will not stick)
SIGN_IDENTITY="-" scripts/package-mac-app.sh        # explicit ad-hoc (same caveat)
DISABLE_LIBRARY_VALIDATION=1 scripts/package-mac-app.sh   # dev-only Sparkle Team ID mismatch workaround
```

### Note sur la signature ad-hoc

Lors de la signature avec `SIGN_IDENTITY="-"` (ad-hoc), le script désactive automatiquement le **Hardened Runtime** (`--options runtime`). Cela est nécessaire pour éviter les plantages lorsque l'application tente de charger des frameworks intégrés (comme Sparkle) qui ne partagent pas le même Team ID. Les signatures ad-hoc brisent également la persistance des permissions TCC ; consultez [permissions macOS](/fr/platforms/mac/permissions) pour les étapes de récupération.

## Métadonnées de build pour À propos

`package-mac-app.sh` appose le tampon suivant sur le bundle :

- `OpenClawBuildTimestamp` : ISO8601 UTC au moment de la création du package
- `OpenClawGitCommit` : court hash git (ou `unknown` si indisponible)

L'onglet À propos lit ces clés pour afficher la version, la date de build, le commit git, et s'il s'agit d'une version de débogage (via `#if DEBUG`). Exécutez le packager pour actualiser ces valeurs après des modifications de code.

## Pourquoi

Les permissions TCC sont liées à l'identifiant du bundle _et_ à la signature du code. Les versions de débogage non signées avec des UUID changeantes faisaient oublier les autorisations par macOS après chaque reconstruction. La signature des binaires (ad‑hoc par défaut) et le maintien d'un identifiant/chemin de bundle fixe (`dist/OpenClaw.app`) préservent les autorisations entre les builds, correspondant à l'approche VibeTunnel.

import fr from "/components/footer/fr.mdx";

<fr />
