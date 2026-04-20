---
summary: "Étapes de signature pour les versions de débogage macOS générées par les scripts de packaging"
read_when:
  - Building or signing mac debug builds
title: "macOS Signature"
---

# signature mac (versions de débogage)

Cette application est généralement construite à partir de [`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh), qui maintenant :

- définit un identifiant de bundle de débogage stable : `ai.openclaw.mac.debug`
- écrit le Info.plist avec cet identifiant de bundle (remplacer via `BUNDLE_ID=...`)
- appelle [`scripts/codesign-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/codesign-mac-app.sh) pour signer le binaire principal et le bundle de l'application afin que macOS traite chaque reconstruction comme le même bundle signé et conserve les autorisations TCC (notifications, accessibilité, enregistrement d'écran, microphone, reconnaissance vocale). Pour des autorisations stables, utilisez une véritable identité de signature ; la signature ad-hoc est optionnelle et fragile (voir [macOS permissions](/fr/platforms/mac/permissions)).
- utilise `CODESIGN_TIMESTAMP=auto` par défaut ; il active les horodatages de confiance pour les signatures d'ID de développeur. Définissez `CODESIGN_TIMESTAMP=off` pour ignorer l'horodatage (versions de débogage hors ligne).
- injecte les métadonnées de construction dans le Info.plist : `OpenClawBuildTimestamp` (UTC) et `OpenClawGitCommit` (hash court) afin que le panneau À propos puisse afficher la version, git, et le channel de débogage/release.
- **Le packaging utilise par défaut Node 24** : le script exécute les builds TS et le build de l'interface de contrôle. Node 22 LTS, actuellement `22.14+`, reste pris en charge pour la compatibilité.
- lit `SIGN_IDENTITY` depuis l'environnement. Ajoutez `export SIGN_IDENTITY="Apple Development: Your Name (TEAMID)"` (ou votre certificat d'application d'ID de développeur) à votre fichier rc de shell pour toujours signer avec votre certificat. La signature ad-hoc nécessite une adhésion explicite via `ALLOW_ADHOC_SIGNING=1` ou `SIGN_IDENTITY="-"` (non recommandé pour les tests d'autorisations).
- exécute un audit d'ID d'équipe après la signature et échoue si un Mach-O dans le bundle de l'application est signé par un ID d'équipe différent. Définissez `SKIP_TEAM_ID_CHECK=1` pour contourner.

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

Lors de la signature avec `SIGN_IDENTITY="-"` (ad-hoc), le script désactive automatiquement le **Hardened Runtime** (`--options runtime`). Cela est nécessaire pour éviter les plantages lorsque l'application tente de charger des frameworks intégrés (comme Sparkle) qui ne partagent pas le même identifiant d'équipe. Les signatures ad-hoc cassent également la persistance des permissions TCC ; consultez [permissions macOS](/fr/platforms/mac/permissions) pour les étapes de récupération.

## Métadonnées de build pour À propos

`package-mac-app.sh` appose le bundle avec :

- `OpenClawBuildTimestamp` : ISO8601 UTC au moment du package
- `OpenClawGitCommit` : hachage git court (ou `unknown` si indisponible)

L'onglet À propos lit ces clés pour afficher la version, la date de build, le commit git et s'il s'agit d'une build de débogage (via `#if DEBUG`). Exécutez le packageur pour rafraîchir ces valeurs après les modifications de code.

## Pourquoi

Les permissions TCC sont liées à l'identifiant du bundle _et_ à la signature du code. Les builds de débogage non signées avec des UUID changeants faisaient oublier les autorisations par macOS après chaque rebuild. La signature des binaires (ad‑hoc par défaut) et le maintien d'un identifiant/chemin de bundle fixe (`dist/OpenClaw.app`) préservent les autorisations entre les builds, correspondant à l'approche VibeTunnel.
