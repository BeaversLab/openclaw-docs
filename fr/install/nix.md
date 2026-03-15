---
summary: "Installer OpenClaw de manière déclarative avec Nix"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

# Installation Nix

La méthode recommandée pour exécuter OpenClaw avec Nix est via **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** — un module Home Manager complet.

## Démarrage rapide

Collez ceci dans votre agent IA (Claude, Cursor, etc.) :

```text
I want to set up nix-openclaw on my Mac.
Repository: github:openclaw/nix-openclaw

What I need you to do:
1. Check if Determinate Nix is installed (if not, install it)
2. Create a local flake at ~/code/openclaw-local using templates/agent-first/flake.nix
3. Help me create a Telegram bot (@BotFather) and get my chat ID (@userinfobot)
4. Set up secrets (bot token, model provider API key) - plain files at ~/.secrets/ is fine
5. Fill in the template placeholders and run home-manager switch
6. Verify: launchd running, bot responds to messages

Reference the nix-openclaw README for module options.
```

> **📦 Guide complet : [github.com/openclaw/nix-openclaw](https://github.com/openclaw/nix-openclaw)**
>
> Le dépôt nix-openclaw est la source de vérité pour l'installation Nix. Cette page n'est qu'un aperçu rapide.

## Ce que vous obtenez

- Passerelle + application macOS + outils (whisper, spotify, caméras) — tous épinglés
- Service Launchd qui survit aux redémarrages
- Système de plugins avec configuration déclarative
- Retour immédiat (rollback) : `home-manager switch --rollback`

---

## Comportement d'exécution en mode Nix

Lorsque `OPENCLAW_NIX_MODE=1` est défini (automatique avec nix-openclaw) :

OpenClaw prend en charge un **mode Nix** qui rend la configuration déterministe et désactive les flux d'installation automatique.
Activez-le en exportant :

```bash
OPENCLAW_NIX_MODE=1
```

Sur macOS, l'application GUI n'hérite pas automatiquement des variables d'environnement du shell. Vous pouvez
également activer le mode Nix via les valeurs par défaut :

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Chemins de configuration + d'état

OpenClaw lit la configuration JSON5 depuis `OPENCLAW_CONFIG_PATH` et stocke les données mutables dans `OPENCLAW_STATE_DIR`.
Si nécessaire, vous pouvez également définir `OPENCLAW_HOME` pour contrôler le répertoire base personnel utilisé pour la résolution des chemins internes.

- `OPENCLAW_HOME` (priorité par défaut : `HOME` / `USERPROFILE` / `os.homedir()`)
- `OPENCLAW_STATE_DIR` (par défaut : `~/.openclaw`)
- `OPENCLAW_CONFIG_PATH` (par défaut : `$OPENCLAW_STATE_DIR/openclaw.json`)

Lorsqu'il est exécuté sous Nix, définissez-les explicitement sur des emplacements gérés par Nix afin que l'état d'exécution et la configuration
restent en dehors du magasin immuable.

### Comportement d'exécution en mode Nix

- Les flux d'installation automatique et d'auto-mutation sont désactivés
- Les dépendances manquantes affichent des messages de correction spécifiques à Nix
- L'interface affiche une bannière de mode Nix en lecture seule lorsqu'elle est présente

## Note de packaging (macOS)

Le flux de packaging macOS s'attend à un modèle Info.plist stable à :

```
apps/macos/Sources/OpenClaw/Resources/Info.plist
```

[`scripts/package-mac-app.sh`](https://github.com/openclaw/openclaw/blob/main/scripts/package-mac-app.sh) copie ce modèle dans le bundle de l'application et corrige les champs dynamiques
(bundle ID, version/build, Git SHA, clés Sparkle). Cela permet de garder le plist déterministe pour le packaging SwiftPM
et les builds Nix (qui ne reposent pas sur une chaîne d'outils Xcode complète).

## Connexes

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) — guide de configuration complet
- [Wizard](/fr/start/wizard) — configuration Nix sans CLI
- [Docker](/fr/install/docker) — configuration conteneurisée

import fr from '/components/footer/fr.mdx';

<fr />
