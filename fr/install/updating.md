---
summary: "Mise à jour sécurisée d'OpenClaw (installation globale ou depuis les sources), plus stratégie de retour en arrière"
read_when:
  - Mise à jour d'OpenClaw
  - Quelque chose casse après une mise à jour
title: "Mise à jour"
---

# Mise à jour

OpenClaw évolue rapidement (pré « 1.0 »). Traitez les mises à jour comme une infrastructure d'expédition : mettre à jour → exécuter les vérifications → redémarrer (ou utiliser `openclaw update`, qui redémarre) → vérifier.

## Recommandé : réexécuter le programme d'installation du site Web (mise à niveau sur place)

La méthode de mise à jour **préférée** consiste à réexécuter le programme d'installation à partir du site Web. Il détecte les installations existantes, effectue la mise à niveau sur place et exécute `openclaw doctor` si nécessaire.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Remarques :

- Ajoutez `--no-onboard` si vous ne voulez pas que l'onboarding s'exécute à nouveau.
- Pour les **installations depuis les sources**, utilisez :

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  Le programme d'installation `git pull --rebase` **uniquement** si le dépôt est propre.

- Pour les **installations globales**, le script utilise `npm install -g openclaw@latest` en interne.
- Note d'héritage : `clawdbot` reste disponible en tant que shim de compatibilité.

## Avant de mettre à jour

- Sachez comment vous avez installé : **global** (npm/pnpm) vs **depuis la source** (git clone).
- Sachez comment votre Gateway fonctionne : **terminal au premier plan** vs **service supervisé** (launchd/systemd).
- Sauvegardez vos personnalisations :
  - Configuration : `~/.openclaw/openclaw.json`
  - Identifiants : `~/.openclaw/credentials/`
  - Espace de travail : `~/.openclaw/workspace`

## Mise à jour (installation globale)

Installation globale (choisissez-en une) :

```bash
npm i -g openclaw@latest
```

```bash
pnpm add -g openclaw@latest
```

Nous ne recommandons **pas** Bun pour le runtime Gateway (bugs WhatsApp/Telegram).

Pour changer de canaux de mise à jour (installations git + npm) :

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

Utilisez `--tag <dist-tag|version|spec>` pour une substitution ponctuelle de la cible du package.

Pour la tête actuelle `main` de GitHub via une installation par gestionnaire de packages :

```bash
openclaw update --tag main
```

Équivalents manuels :

```bash
npm i -g github:openclaw/openclaw#main
```

```bash
pnpm add -g github:openclaw/openclaw#main
```

Vous pouvez également passer une spécification de package explicite à `--tag` pour des mises à jour ponctuelles (par exemple une référence GitHub ou une URL d'archive tar).

Voir [Canaux de développement](/fr/install/development-channels) pour la sémantique des canaux et les notes de version.

Remarque : sur les installations npm, la passerelle consigne un indice de mise à jour au démarrage (vérifie la balise du canal actuel). Désactivez via `update.checkOnStart: false`.

### Mise à jour automatique du cœur (facultatif)

La mise à jour automatique est **désactivée par défaut** et est une fonctionnalité principale du Gateway (pas un plugin).

```json
{
  "update": {
    "channel": "stable",
    "auto": {
      "enabled": true,
      "stableDelayHours": 6,
      "stableJitterHours": 12,
      "betaCheckIntervalHours": 1
    }
  }
}
```

Comportement :

- `stable` : lorsqu'une nouvelle version est détectée, OpenClaw attend `stableDelayHours` puis applique une gigue déterministe par installation dans `stableJitterHours` (étalement du déploiement).
- `beta` : vérifie selon la cadence `betaCheckIntervalHours` (par défaut : horaire) et applique lorsqu'une mise à jour est disponible.
- `dev` : pas d'application automatique ; utilisez `openclaw update` manuel.

Utilisez `openclaw update --dry-run` pour prévisualiser les actions de mise à jour avant d'activer l'automatisation.

Ensuite :

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

Notes :

- Si votre Gateway s'exécute en tant que service, `openclaw gateway restart` est préférable à l'arrêt des PIDs.
- Si vous êtes bloqué sur une version spécifique, voir « Rollback / pinning » ci-dessous.

## Mise à jour (`openclaw update`)

Pour les **installations depuis les sources** (git checkout), préférez :

```bash
openclaw update
```

Il exécute un flux de mise à jour relativement sûr :

- Nécessite un arbre de travail propre.
- Bascule vers le canal sélectionné (tag ou branche).
- Récupère + rebase sur l'amont configuré (canal dev).
- Installe les dépendances, compile, compile l'interface de contrôle, et exécute `openclaw doctor`.
- Redémarre la passerelle par défaut (utilisez `--no-restart` pour ignorer).

Si vous avez installé via **npm/pnpm** (pas de métadonnées git), `openclaw update` essaiera de mettre à jour via votre gestionnaire de paquets. S'il ne peut pas détecter l'installation, utilisez plutôt « Mise à jour (installation globale) ».

## Mise à jour (Interface de contrôle / RPC)

L'interface de contrôle dispose de **Mise à jour & Redémarrage** (RPC : `update.run`). Il :

1. Exécute le même flux de mise à jour depuis la source que `openclaw update` (git checkout uniquement).
2. Écrit un marqueur de redémarrage avec un rapport structuré (queue stdout/stderr).
3. Redémarre la passerelle et envoie le rapport (ping) à la dernière session active.

Si le rebase échoue, la passerelle abandonne et redémarre sans appliquer la mise à jour.

## Mise à jour (à partir de la source)

Depuis l'extraction du dépôt :

Préféré :

```bash
openclaw update
```

Manuel (équivalent approximatif) :

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health
```

Remarques :

- `pnpm build` est important lorsque vous exécutez le binaire `openclaw` empaqueté ([`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)) ou que vous utilisez Node pour exécuter `dist/`.
- Si vous exécutez à partir d'un checkout de dépôt sans installation globale, utilisez `pnpm openclaw ...` pour les commandes CLI.
- Si vous exécutez directement à partir de TypeScript (`pnpm openclaw ...`), une reconstruction est généralement inutile, mais **les migrations de configuration s'appliquent toujours** → exécutez doctor.
- Passer d'une installation globale à une installation git est facile : installez l'autre variante, puis exécutez `openclaw doctor` afin que le point d'entrée du service de passerelle soit réécrit pour l'installation actuelle.

## Toujours exécuter : `openclaw doctor`

Doctor est la commande de « mise à jour sécurisée ». Elle est volontairement ennuyeuse : réparer + migrer + avertir.

Remarque : si vous êtes sur une **installation source** (git checkout), `openclaw doctor` proposera d'exécuter `openclaw update` d'abord.

Choses typiques qu'il fait :

- Migrer les clés de configuration obsolètes / les anciens emplacements de fichiers de configuration.
- Auditer les stratégies DM et avertir sur les paramètres « ouverts » risqués.
- Vérifier l'état du Gateway et proposer de redémarrer.
- Détecter et migrer les anciens services de passerelle (launchd/systemd ; schtasks hérité) vers les services OpenClaw actuels.
- Sur Linux, assurer la persistance de l'utilisateur systemd (afin que le Gateway survive à la déconnexion).

Détails : [Doctor](/fr/gateway/doctor)

## Démarrer / arrêter / redémarrer le Gateway

CLI (fonctionne quel que soit le système d'exploitation) :

```bash
openclaw gateway status
openclaw gateway stop
openclaw gateway restart
openclaw gateway --port 18789
openclaw logs --follow
```

Si vous êtes supervisé :

- macOS launchd (LaunchAgent groupé dans l'application) : `launchctl kickstart -k gui/$UID/ai.openclaw.gateway` (utilisez `ai.openclaw.<profile>` ; l'ancien `com.openclaw.*` fonctionne toujours)
- Service utilisateur systemd Linux : `systemctl --user restart openclaw-gateway[-<profile>].service`
- Windows (WSL2) : `systemctl --user restart openclaw-gateway[-<profile>].service`
  - `launchctl`/`systemctl` ne fonctionnent que si le service est installé ; sinon, exécutez `openclaw gateway install`.

Runbook + étiquettes exactes du service : [Runbook Gateway](/fr/gateway)

## Retour en arrière / épinglage (en cas de problème)

### Épingler (installation globale)

Installez une version connue pour fonctionner (remplacez `<version>` par la dernière qui fonctionnait) :

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

Astuce : pour voir la version publiée actuelle, exécutez `npm view openclaw version`.

Puis redémarrez + relancez le docteur :

```bash
openclaw doctor
openclaw gateway restart
```

### Épingler (source) par date

Choisissez un commit à partir d'une date (exemple : « état de main au 2026-01-01 ») :

```bash
git fetch origin
git checkout "$(git rev-list -n 1 --before=\"2026-01-01\" origin/main)"
```

Puis réinstallez les dépendances + redémarrez :

```bash
pnpm install
pnpm build
openclaw gateway restart
```

Si vous souhaitez revenir à la dernière version plus tard :

```bash
git checkout main
git pull
```

## Si vous êtes bloqué

- Exécutez `openclaw doctor` à nouveau et lisez attentivement la sortie (elle vous indique souvent la solution).
- Vérifiez : [Dépannage](/fr/gateway/troubleshooting)
- Demandez sur Discord : [https://discord.gg/clawd](https://discord.gg/clawd)

import en from "/components/footer/en.mdx";

<en />
