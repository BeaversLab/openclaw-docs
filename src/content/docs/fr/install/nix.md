---
summary: "Installer OpenClaw de manière déclarative avec Nix"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

Installez OpenClaw de manière déclarative avec **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** — un module Home Manager complet.

<Info>Le dépôt [nix-openclaw](https://github.com/openclaw/nix-openclaw) est la source de vérité pour l'installation Nix. Cette page est un aperçu rapide.</Info>

## Ce que vous obtenez

- Gateway + application macOS + outils (whisper, spotify, cameras) -- tous épinglés
- Service launchd qui survit aux redémarrages
- Système de plugins avec configuration déclarative
- Retour immédiat (rollback) : `home-manager switch --rollback`

## Quick start

<Steps>
  <Step title="Installer Determinate Nix">Si Nix n'est pas déjà installé, suivez les instructions de l'[installeur Determinate Nix](https://github.com/DeterminateSystems/nix-installer).</Step>
  <Step title="Créer un flake local">Utilisez le modèle agent-first depuis le dépôt nix-openclaw : ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="Configurer les secrets">Configurez le jeton de votre bot de messagerie et la clé API du fournisseur de modèle. Les fichiers simples à `~/.secrets/` fonctionnent parfaitement.</Step>
  <Step title="Remplir les espaces réservés du modèle et basculer">```bash home-manager switch ```</Step>
  <Step title="Vérifier">Confirmez que le service launchd est en cours d'exécution et que votre bot répond aux messages.</Step>
</Steps>

Consultez le [README nix-openclaw](https://github.com/openclaw/nix-openclaw) pour les options complètes du module et des exemples.

## Comportement d'exécution en mode Nix

Lorsque `OPENCLAW_NIX_MODE=1` est défini (automatique avec nix-openclaw), OpenClaw entre dans un mode déterministe qui désactive les flux d'auto-installation.

Vous pouvez également le définir manuellement :

```bash
export OPENCLAW_NIX_MODE=1
```

Sur macOS, l'application GUI n'hérite pas automatiquement des variables d'environnement du shell. Activez le mode Nix via les defaults à la place :

```bash
defaults write ai.openclaw.mac openclaw.nixMode -bool true
```

### Ce qui change en mode Nix

- Les flux d'auto-installation et d'auto-mutation sont désactivés
- Les dépendances manquantes affichent des messages de correction spécifiques à Nix
- L'interface affiche une bannière en lecture seule pour le mode Nix

### Chemins de configuration et d'état

OpenClaw lit la configuration JSON5 depuis `OPENCLAW_CONFIG_PATH` et stocke les données mutables dans `OPENCLAW_STATE_DIR`. Lorsqu'il est exécuté sous Nix, définissez-les explicitement sur des emplacements gérés par Nix afin que l'état d'exécution et la configuration ne se trouvent pas dans le stockage immuable.

| Variable               | Par défaut                              |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### Découverte du PATH de service

Le service de passerelle launchd/systemd découvre automatiquement les binaires du profil Nix afin que les plugins et outils qui font appel à des exécutables installés par `nix` fonctionnent sans configuration manuelle du PATH :

- Lorsque `NIX_PROFILES` est défini, chaque entrée est ajoutée au PATH du service avec une priorité de droite à gauche (correspond à la priorité du shell Nix — celui le plus à droite l'emporte).
- Lorsque `NIX_PROFILES` n'est pas défini, `~/.nix-profile/bin` est ajouté en tant que solution de repli.

Cela s'applique aux environnements de service launchd macOS et systemd Linux.

## Connexes

- [nix-openclaw](https://github.com/openclaw/nix-openclaw) -- guide complet d'installation
- [Assistant](/fr/start/wizard) -- configuration Nix sans CLI
- [Docker](/fr/install/docker) -- configuration conteneurisée
