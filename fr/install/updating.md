---
summary: "Mise à jour sécurisée d'OpenClaw (installation globale ou source), plus stratégie de retour en arrière"
read_when:
  - Updating OpenClaw
  - Something breaks after an update
title: "Mise à jour"
---

# Mise à jour

OpenClaw évolue rapidement (pré « 1.0 »). Traitez les mises à jour comme une infrastructure de déploiement : mise à jour → exécution des vérifications → redémarrage (ou utilisez `openclaw update`, qui redémarre) → vérification.

## Recommandé : réexécuter le programme d'installation du site Web (mise à niveau sur place)

Le chemin de mise à jour **préféré** consiste à réexécuter le programme d'installation à partir du site Web. Il détecte les installations existantes, effectue une mise à niveau sur place et exécute `openclaw doctor` si nécessaire.

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

Notes :

- Ajoutez `--no-onboard` si vous ne voulez pas que l'assistant de configuration (onboarding) s'exécute à nouveau.
- Pour les **installations à partir des sources**, utilisez :

  ```bash
  curl -fsSL https://openclaw.ai/install.sh | bash -s -- --install-method git --no-onboard
  ```

  Le programme d'installation `git pull --rebase` **uniquement** si le dépôt est propre.

- Pour les **installations globales**, le script utilise `npm install -g openclaw@latest` en arrière-plan.
- Note d'héritage : `clawdbot` reste disponible en tant que shim de compatibilité.

## Avant la mise à jour

- Sachez comment vous avez installé : **global** (npm/pnpm) vs **from source** (git clone).
- Sachez comment votre Gateway fonctionne : **terminal au premier plan** vs **service supervisé** (launchd/systemd).
- Sauvegardez vos adaptations :
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

Nous ne recommandons **pas** Bun pour l'exécution du Gateway (bugs WhatsApp/Telegram).

Pour changer de canaux de mise à jour (installations git + npm) :

```bash
openclaw update --channel beta
openclaw update --channel dev
openclaw update --channel stable
```

Utilisez `--tag <dist-tag|version>` pour une étiquette/version d'installation ponctuelle.

Voir [Canaux de développement](/fr/install/development-channels) pour la sémantique des canaux et les notes de version.

Note : sur les installations npm, la passerelle enregistre un indice de mise à jour au démarrage (vérifie l'étiquette du canal actuel). Désactivez via `update.checkOnStart: false`.

### Mise à jour automatique du cœur (optionnel)

La mise à jour automatique est **désactivée par défaut** et est une fonctionnalité du cœur du Gateway (pas un plugin).

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

- `stable` : lorsqu'une nouvelle version est détectée, OpenClaw attend `stableDelayHours` puis applique une gigue déterministe par installation dans `stableJitterHours` ( déploiement échelonné).
- `beta` : vérifie selon la cadence `betaCheckIntervalHours` (par défaut : horaire) et applique lorsqu'une mise à jour est disponible.
- `dev` : aucune application automatique ; utilisez `openclaw update` manuel.

Utilisez `openclaw update --dry-run` pour prévisualiser les actions de mise à jour avant d'activer l'automatisation.

Ensuite :

```bash
openclaw doctor
openclaw gateway restart
openclaw health
```

Notes :

- Si votre Gateway s'exécute en tant que service, `openclaw gateway restart` est préférable à l'arrêt forcé des PIDs.
- Si vous êtes bloqué sur une version spécifique, consultez « Rollback / pinning » ci-dessous.

## Mise à jour (`openclaw update`)

Pour les **installations depuis les sources** (git checkout), préférez :

```bash
openclaw update
```

Il exécute un processus de mise à jour relativement sûr :

- Nécessite un arbre de travail propre.
- Bascule vers le canal sélectionné (tag ou branche).
- Récupère + effectue un rebase par rapport à l'amont configuré (canal dev).
- Installe les dépendances, compile, construit l'interface de contrôle et exécute `openclaw doctor`.
- Redémarre la passerelle par défaut (utilisez `--no-restart` pour ignorer).

Si vous avez installé via **npm/pnpm** (sans métadonnées git), `openclaw update` essaiera de mettre à jour via votre gestionnaire de paquets. S'il ne peut pas détecter l'installation, utilisez plutôt « Mise à jour (installation globale) ».

## Mise à jour (Interface de contrôle / RPC)

L'interface de contrôle dispose de la fonction **Mettre à jour et redémarrer** (RPC : `update.run`). Elle :

1. Exécute le même processus de mise à jour depuis les sources que `openclaw update` (git checkout uniquement).
2. Écrit un marqueur de redémarrage avec un rapport structuré (queue stdout/stderr).
3. Redémarre la passerelle et envoie le rapport à la dernière session active.

Si le rebase échoue, la passerelle abandonne et redémarre sans appliquer la mise à jour.

## Mise à jour (depuis les sources)

Depuis le checkout du dépôt :

Préféré :

```bash
openclaw update
```

Manuel (à peu près équivalent) :

```bash
git pull
pnpm install
pnpm build
pnpm ui:build # auto-installs UI deps on first run
openclaw doctor
openclaw health
```

Notes :

- `pnpm build` est important lorsque vous exécutez le binaire `openclaw` packagé ([`openclaw.mjs`](https://github.com/openclaw/openclaw/blob/main/openclaw.mjs)) ou utilisez Node pour exécuter `dist/`.
- Si vous exécutez depuis un dépôt sans installation globale, utilisez `pnpm openclaw ...` pour les commandes CLI.
- Si vous exécutez directement depuis TypeScript (`pnpm openclaw ...`), une reconstruction est généralement inutile, mais les **migrations de configuration s'appliquent toujours** → exécutez doctor.
- Passer d'une installation globale à une installation git est facile : installez l'autre variante, puis exécutez `openclaw doctor` pour que le point d'entrée du service gateway soit réécrit vers l'installation actuelle.

## Toujours exécuter : `openclaw doctor`

Doctor est la commande « mise à jour sécurisée ». Elle est volontairement ennuyeuse : réparer + migrer + avertir.

Remarque : si vous êtes sur une **installation source** (git checkout), `openclaw doctor` proposera d'exécuter `openclaw update` d'abord.

Choses typiques qu'il fait :

- Migrer les clés de configuration obsolètes / les emplacements de fichiers de configuration hérités.
- Auditer les politiques DM et avertir en cas de paramètres « ouverts » risqués.
- Vérifier la santé du Gateway et proposer de redémarrer.
- Détecter et migrer les anciens services gateway (launchd/systemd ; schtasks hérité) vers les services OpenClaw actuels.
- Sur Linux, assurer la persistance de l'utilisateur systemd (afin que le Gateway survive à la déconnexion).

Détails : [Doctor](/fr/gateway/doctor)

## Démarrer / arrêter / redémarrer le Gateway

CLI (fonctionne quel que que soit le système d'exploitation) :

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
  - `launchctl`/`systemctl` ne fonctionnent que si le service est installé ; sinon exécutez `openclaw gateway install`.

Runbook + étiquettes de service exactes : [Runbook Gateway](/fr/gateway)

## Retour / épinglage (en cas de problème)

### Épingler (installation globale)

Installez une version connue comme fonctionnelle (remplacez `<version>` par la dernière qui fonctionnait) :

```bash
npm i -g openclaw@<version>
```

```bash
pnpm add -g openclaw@<version>
```

Astuce : pour voir la version publiée actuelle, exécutez `npm view openclaw version`.

Puis redémarrez + relancez le doctor :

```bash
openclaw doctor
openclaw gateway restart
```

### Épingler (source) par date

Choisissez un commit à partir d'une date (exemple : « état de main au 01/01/2026 ») :

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

- Relancez `openclaw doctor` et lisez attentivement la sortie (elle indique souvent la solution).
- Consultez : [Dépannage](/fr/gateway/troubleshooting)
- Demandez sur Discord : [https://discord.gg/clawd](https://discord.gg/clawd)

import fr from '/components/footer/fr.mdx';

<fr />
