---
summary: "Move (migrate) an OpenClaw install from one machine to another"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "Migration Guide"
---

# Migrating OpenClaw to a new machine

This guide migrates an OpenClaw Gateway from one machine to another **without redoing onboarding**.

The migration is simple conceptually:

- Copy the **state directory** (`$OPENCLAW_STATE_DIR`, default: `~/.openclaw/`) — this includes config, auth, sessions, and channel state.
- Copy your **workspace** (`~/.openclaw/workspace/` by default) — this includes your agent files (memory, prompts, etc.).

But there are common footguns around **profiles**, **permissions**, and **partial copies**.

## Before you start (what you are migrating)

### 1) Identify your state directory

Most installs use the default:

- **Répertoire d'état :** `~/.openclaw/`

Mais il peut être différent si vous utilisez :

- `--profile <name>` (devient souvent `~/.openclaw-<profile>/`)
- `OPENCLAW_STATE_DIR=/some/path`

Si vous n'êtes pas sûr, exécutez sur l'**ancienne** machine :

```bash
openclaw status
```

Recherchez les mentions de `OPENCLAW_STATE_DIR` / profil dans la sortie. Si vous exécutez plusieurs passerelles, répétez l'opération pour chaque profil.

### 2) Identifiez votre espace de travail

Valeurs par défaut courantes :

- `~/.openclaw/workspace/` (espace de travail recommandé)
- un dossier personnalisé que vous avez créé

Votre espace de travail est l'endroit où résident des fichiers comme `MEMORY.md`, `USER.md` et `memory/*.md`.

### 3) Comprendre ce que vous allez préserver

Si vous copiez **le deux** le répertoire d'état et l'espace de travail, vous conservez :

- Configuration de Gateway (`openclaw.json`)
- Profils d'authentification / clés API / jetons OAuth
- Historique des sessions + état de l'agent
- État du channel (p. ex. connexion/session WhatsApp)
- Vos fichiers d'espace de travail (mémoire, notes de compétences, etc.)

Si vous copiez **uniquement** l'espace de travail (p. ex., via Git), vous ne conservez **pas** :

- sessions
- identifiants
- connexions channel

Ils se trouvent sous `$OPENCLAW_STATE_DIR`.

## Étapes de migration (recommandées)

### Étape 0 - Effectuer une sauvegarde (ancienne machine)

Sur l'**ancienne** machine, arrêtez d'abord la passerelle afin que les fichiers ne changent pas en cours de copie :

```bash
openclaw gateway stop
```

(Facultatif mais recommandé) archivez le répertoire d'état et l'espace de travail :

```bash
# Adjust paths if you use a profile or custom locations
cd ~
tar -czf openclaw-state.tgz .openclaw

tar -czf openclaw-workspace.tgz .openclaw/workspace
```

Si vous avez plusieurs profils/répertoires d'état (p. ex. `~/.openclaw-main`, `~/.openclaw-work`), archivez chacun d'eux.

### Étape 1 - Installer OpenClaw sur la nouvelle machine

Sur la **nouvelle** machine, installez le CLI (et Node si nécessaire) :

- Voir : [Installer](/fr/install)

À ce stade, il est acceptable que l'onboarding crée un nouveau `~/.openclaw/` — vous l'écraserez à l'étape suivante.

### Étape 2 - Copier le répertoire d'état et l'espace de travail vers la nouvelle machine

Copiez **les deux** :

- `$OPENCLAW_STATE_DIR` (par défaut `~/.openclaw/`)
- votre espace de travail (par défaut `~/.openclaw/workspace/`)

Approches courantes :

- `scp` les archives tar et extraire
- `rsync -a` via SSH
- disque externe

Après la copie, assurez-vous que :

- Les répertoires cachés ont été inclus (ex. `.openclaw/`)
- La propriété des fichiers est correcte pour l'utilisateur exécutant la passerelle

### Étape 3 - Exécuter Doctor (migrations + réparation de service)

Sur la **nouvelle** machine :

```bash
openclaw doctor
```

Doctor est la commande « sûre et ennuyeuse ». Elle répare les services, applique les migrations de configuration et avertit des incohérences.

Ensuite :

```bash
openclaw gateway restart
openclaw status
```

## Pièges courants (et comment les éviter)

### Piège : inadéquation entre le profil et le répertoire d'état

Si vous avez exécuté l'ancienne passerelle avec un profil (ou `OPENCLAW_STATE_DIR`) et que la nouvelle passerelle en utilise un différent, vous verrez des symptômes tels que :

- les modifications de configuration ne prennent pas effet
- canaux manquants / déconnectés
- historique de session vide

Correctif : exécutez la passerelle/le service en utilisant le **même** profil/répertoire d'état que celui que vous avez migré, puis réexécutez :

```bash
openclaw doctor
```

### Piège : copier uniquement `openclaw.json`

`openclaw.json` ne suffit pas. De nombreux fournisseurs stockent l'état sous :

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

Migrez toujours l'intégralité du dossier `$OPENCLAW_STATE_DIR`.

### Piège : permissions / propriété

Si vous avez copié en tant que root ou changé d'utilisateurs, la passerelle risque de ne pas pouvoir lire les informations d'identification/sessions.

Correctif : assurez-vous que le répertoire d'état + l'espace de travail appartiennent à l'utilisateur exécutant la passerelle.

### Piège : migration entre les modes distant/local

- Si votre interface utilisateur (WebUI/TUI) pointe vers une passerelle **distante**, l'hôte distant possède le magasin de sessions + l'espace de travail.
- Migrer votre ordinateur portable ne déplacera pas l'état de la passerelle distante.

Si vous êtes en mode distant, migrez l'**hôte de la passerelle**.

### Pied-de-biche : secrets dans les sauvegardes

`$OPENCLAW_STATE_DIR` contient des secrets (clés API, jetons OAuth, identifiants WhatsApp). Traitez les sauvegardes comme des secrets de production :

- stocker de manière chiffrée
- éviter de partager via des canaux non sécurisés
- faire pivoter les clés si vous soupçonnez une exposition

## Liste de vérification

Sur la nouvelle machine, confirmez :

- `openclaw status` affiche la passerelle en cours d'exécution
- Vos canaux sont toujours connectés (par exemple, WhatsApp ne nécessite pas de nouvel appairage)
- Le tableau de bord s'ouvre et affiche les sessions existantes
- Vos fichiers d'espace de travail (mémoire, configurations) sont présents

## Connexes

- [Doctor](/fr/gateway/doctor)
- [Dépannage de la Gateway](/fr/gateway/troubleshooting)
- [Où OpenClaw stocke-t-il ses données ?](/fr/help/faq#where-does-openclaw-store-its-data)

import en from "/components/footer/en.mdx";

<en />
