---
summary: "Installer OpenClaw de manière déclarative avec Nix"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

# Installation Nix

Installez OpenClaw de manière déclarative avec **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** -- un module Home Manager tout-en-un.

<Info>The [nix-openclaw](https://github.com/openclaw/nix-openclaw) repo is the source of truth for Nix installation. This page is a quick overview.</Info>

## Ce que vous obtenez

- Gateway + application macOS + outils (whisper, spotify, cameras) -- tous épinglés
- Service launchd qui survive aux redémarrages
- Système de plugins avec configuration déclarative
- Retour immédiat (rollback) : `home-manager switch --rollback`

## Démarrage rapide

<Steps>
  <Step title="Install Determinate Nix">If Nix is not already installed, follow the [Determinate Nix installer](https://github.com/DeterminateSystems/nix-installer) instructions.</Step>
  <Step title="Create a local flake">Use the agent-first template from the nix-openclaw repo: ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="Configure secrets">Set up your messaging bot token and model provider API key. Plain files at `~/.secrets/` work fine.</Step>
  <Step title="Fill in template placeholders and switch">```bash home-manager switch ```</Step>
  <Step title="Vérifier">Confirmez que le service launchd est en cours d'exécution et que votre bot répond aux messages.</Step>
</Steps>

Voir le [README nix-openclaw](https://github.com/openclaw/nix-openclaw) pour les options complètes du module et des exemples.

## Comportement d'exécution en mode Nix

Lorsque `OPENCLAW_NIX_MODE=1` est défini (automatique avec nix-openclaw), OpenClaw entre dans un mode déterministe qui désactive les flux d'installation automatique.

Vous pouvez également le définir manuellement :

```bash
export OPENCLAW_NIX_MODE=1
```

Sur macOS, l'application graphique n'hérite pas automatiquement des variables d'environnement du shell. Activez plutôt le mode Nix via les valeurs par défaut :

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Ce qui change en mode Nix

- Les flux d'auto-installation et d'auto-mutation sont désactivés
- Les dépendances manquantes affichent des messages de correction spécifiques à Nix
- L'interface utilisateur affiche une bannière en lecture seule du mode Nix

### Chemins de configuration et d'état

OpenClaw lit la configuration JSON5 depuis `OPENCLAW_CONFIG_PATH` et stocke les données modifiables dans `OPENCLAW_STATE_DIR`. Lorsqu'il fonctionne sous OpenClaw, définissez-les explicitement sur des emplacements gérés par Nix afin que l'état d'exécution et la configuration restent en dehors du stockage immuable.

| Variable               | Par défaut                              |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

## Connexes

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- guide complet d'installation
- [Assistant](/en/start/wizard) -- configuration Nix sans CLI
- [Docker](/en/install/docker) -- configuration conteneurisée
