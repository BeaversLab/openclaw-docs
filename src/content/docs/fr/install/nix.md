---
summary: "Installer OpenClaw de manière déclarative avec Nix"
read_when:
  - You want reproducible, rollback-able installs
  - You're already using Nix/NixOS/Home Manager
  - You want everything pinned and managed declaratively
title: "Nix"
---

Installez OpenClaw de manière déclarative avec **[nix-openclaw](https://github.com/openclaw/nix-openclaw)** - le module Home Manager de première partie, complet et prêt à l'emploi.

<Info>Le dépôt [nix-openclaw](https://github.com/openclaw/nix-openclaw) est la source de vérité pour l'installation Nix. Cette page est un aperçu rapide.</Info>

## Ce que vous obtenez

- Gateway + application macOS + outils (whisper, spotify, cameras) -- tous épinglés
- Service launchd qui survit aux redémarrages
- Système de plugins avec configuration déclarative
- Retour instantané (rollback) : `home-manager switch --rollback`

## Quick start

<Steps>
  <Step title="Installer Determinate Nix">Si Nix n'est pas encore installé, suivez les instructions de l'[installateur Determinate Nix](https://github.com/DeterminateSystems/nix-installer).</Step>
  <Step title="Créer un flake local">Utilisez le modèle agent-first depuis le dépôt nix-openclaw : ```bash mkdir -p ~/code/openclaw-local # Copy templates/agent-first/flake.nix from the nix-openclaw repo ```</Step>
  <Step title="Configurer les secrets">Configurez le jeton de votre bot de messagerie et la clé API du fournisseur de modèle. Les fichiers simples à `~/.secrets/` fonctionnent parfaitement.</Step>
  <Step title="Remplir les espaces réservés du modèle et basculer">```bash home-manager switch ```</Step>
  <Step title="Vérifier">Confirmez que le service launchd est en cours d'exécution et que votre bot répond aux messages.</Step>
</Steps>

Consultez le [README nix-openclaw](https://github.com/openclaw/nix-openclaw) pour les options complètes du module et des exemples.

## Comportement d'exécution en mode Nix

Lorsque `OPENCLAW_NIX_MODE=1` est défini (automatique avec nix-openclaw), OpenClaw entre dans un mode déterministe pour les installations gérées par Nix. D'autres paquets Nix peuvent définir le même mode ; nix-openclaw est la référence de première partie.

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
- `openclaw.json` est traité comme immuable. Les valeurs par défaut dérivées du démarrage restent uniquement à l'exécution, et les rédacteurs de configuration tels que setup, onboarding, la modification de `openclaw update`, l'installation/mise à jour/désactivation/suppression de plugins, `doctor --fix`, `doctor --generate-gateway-token` et `openclaw config set` refusent de modifier le fichier.
- Les agents doivent modifier la source Nix à la place. Pour nix-openclaw, utilisez le [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) axé sur l'agent et définissez la configuration sous `programs.openclaw.config` ou `instances.<name>.config`.
- Les dépendances manquantes affichent des messages de correction spécifiques à Nix
- L'interface utilisateur affiche une bannière de mode Nix en lecture seule

### Chemins de configuration et d'état

OpenClaw lit la configuration JSON5 depuis `OPENCLAW_CONFIG_PATH` et stocke les données modifiables dans `OPENCLAW_STATE_DIR`. Lorsqu'il fonctionne sous Nix, définissez-les explicitement sur des emplacements gérés par Nix afin que l'état d'exécution et la configuration restent hors du stockage immuable.

| Variable               | Par défaut                              |
| ---------------------- | --------------------------------------- |
| `OPENCLAW_HOME`        | `HOME` / `USERPROFILE` / `os.homedir()` |
| `OPENCLAW_STATE_DIR`   | `~/.openclaw`                           |
| `OPENCLAW_CONFIG_PATH` | `$OPENCLAW_STATE_DIR/openclaw.json`     |

### Découverte du PATH des services

Le service de passerelle launchd/systemd découvre automatiquement les binaires du profil Nix afin que les plug-ins et les outils qui appellent des exécutables installés via `nix` fonctionnent sans configuration manuelle du PATH :

- Lorsque `NIX_PROFILES` est défini, chaque entrée est ajoutée au PATH du service par ordre de priorité de droite à gauche (correspond à la priorité du shell Nix - le plus à droite l'emporte).
- Lorsque `NIX_PROFILES` n'est pas défini, `~/.nix-profile/bin` est ajouté en guise de solution de repli.

Cela s'applique aux environnements de service launchd macOS et systemd Linux.

## Connexes

<CardGroup cols={2}>
  <Card title="nix-openclaw" href="https://github.com/openclaw/nix-openclaw" icon="arrow-up-right-from-square">
    Module Home Manager de référence et guide complet d'installation.
  </Card>
  <Card title="Assistant de configuration" href="/fr/start/wizard" icon="wand-magic-sparkles">
    Procédure pas à pas de configuration Nix sans CLI.
  </Card>
  <Card title="Docker" href="/fr/install/docker" icon="docker">
    Configuration conteneurisée en alternative à Nix.
  </Card>
  <Card title="Mise à jour" href="/fr/install/updating" icon="arrow-up-right-from-square">
    Mise à jour des installations gérées par Home Manager en même temps que le paquet.
  </Card>
</CardGroup>
