---
summary: "Déplacer (migrer) une installation OpenClaw d'une machine à une autre"
read_when:
  - You are moving OpenClaw to a new laptop/server
  - You want to preserve sessions, auth, and channel logins (WhatsApp, etc.)
title: "Guide de migration"
---

# Migration de OpenClaw vers une nouvelle machine

Ce guide migre un OpenClaw Gateway d'une machine à une autre **sans refaire l'intégration**.

La migration est simple sur le plan conceptuel :

- Copiez le **répertoire d'état** (`$OPENCLAW_STATE_DIR`, par défaut : `~/.openclaw/`) — cela inclut la configuration, l'authentification, les sessions et l'état du canal.
- Copiez votre **espace de travail** (`~/.openclaw/workspace/` par défaut) — cela inclut vos fichiers d'agent (mémoire, invites, etc.).

Mais il existe des pièges courants liés aux **profils**, aux **autorisations** et aux **copies partielles**.

## Avant de commencer (ce que vous migratez)

### 1) Identifier votre répertoire d'état

La plupart des installations utilisent la valeur par défaut :

- **Répertoire d'état :** `~/.openclaw/`

Mais il peut être différent si vous utilisez :

- `--profile <name>` (devient souvent `~/.openclaw-<profile>/`)
- `OPENCLAW_STATE_DIR=/some/path`

Si vous n'êtes pas sûr, exécutez la commande sur l'**ancienne** machine :

```bash
openclaw status
```

Recherchez les mentions de `OPENCLAW_STATE_DIR` / profil dans la sortie. Si vous exécutez plusieurs passerelles, répétez l'opération pour chaque profil.

### 2) Identifier votre espace de travail

Valeurs par défaut courantes :

- `~/.openclaw/workspace/` (espace de travail recommandé)
- un dossier personnalisé que vous avez créé

Votre espace de travail est l'endroit où résident des fichiers tels que `MEMORY.md`, `USER.md` et `memory/*.md`.

### 3) Comprendre ce que vous allez conserver

Si vous copiez **les deux** (le répertoire d'état et l'espace de travail), vous conservez :

- Configuration du Gateway (`openclaw.json`)
- Profils d'authentification / clés API / jetons OAuth
- Historique des sessions + état de l'agent
- État du canal (par exemple, connexion/session WhatsApp)
- Vos fichiers d'espace de travail (mémoire, notes de compétences, etc.)

Si vous copiez **uniquement** l'espace de travail (par exemple, via Git), vous ne conservez **pas** :

- les sessions
- les identifiants
- les connexions aux canaux

Ceux-ci se trouvent sous `$OPENCLAW_STATE_DIR`.

## Étapes de migration (recommandées)

### Étape 0 — Effectuer une sauvegarde (ancienne machine)

Sur l'**ancienne** machine, arrêtez d'abord la passerelle afin que les fichiers ne changent pas pendant la copie :

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

Si vous avez plusieurs profils/répertoires d'état (par ex. `~/.openclaw-main`, `~/.openclaw-work`), archivez chacun d'eux.

### Étape 1 — Installer OpenClaw sur la nouvelle machine

Sur la **nouvelle** machine, installez le CLI (et Node si nécessaire) :

- Voir : [Install](/fr/install)

À ce stade, il est normal que l'onboarding crée un nouveau `~/.openclaw/` — vous le remplacerez à l'étape suivante.

### Étape 2 — Copier le répertoire d'état + l'espace de travail vers la nouvelle machine

Copiez **les deux** :

- `$OPENCLAW_STATE_DIR` (par défaut `~/.openclaw/`)
- votre espace de travail (par défaut `~/.openclaw/workspace/`)

Approches courantes :

- `scp` les archives tar et extrayez-les
- `rsync -a` via SSH
- disque externe

Après la copie, assurez-vous que :

- Les répertoires cachés ont été inclus (par ex. `.openclaw/`)
- La propriété des fichiers est correcte pour l'utilisateur exécutant la passerelle

### Étape 3 — Exécuter Doctor (migrations + réparation de service)

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

### Piège : inadéquation profil / répertoire d'état

Si vous avez exécuté l'ancienne passerelle avec un profil (ou `OPENCLAW_STATE_DIR`) et que la nouvelle passerelle en utilise un différent, vous verrez des symptômes tels que :

- les modifications de configuration ne prennent pas effet
- canaux manquants / déconnectés
- historique de session vide

Correction : exécutez la passerelle/le service en utilisant le **même** profil/répertoire d'état que celui que vous avez migré, puis relancez :

```bash
openclaw doctor
```

### Piège : copier uniquement `openclaw.json`

`openclaw.json` ne suffit pas. De nombreux fournisseurs stockent l'état sous :

- `$OPENCLAW_STATE_DIR/credentials/`
- `$OPENCLAW_STATE_DIR/agents/<agentId>/...`

Migrez toujours l'intégralité du dossier `$OPENCLAW_STATE_DIR`.

### Piège : autorisations / propriété

Si vous avez copié en tant que root ou changé d'utilisateur, le gateway peut échouer à lire les identifiants/sessions.

Solution : assurez-vous que le répertoire d'état + l'espace de travail appartiennent à l'utilisateur exécutant le gateway.

### Piège : migration entre les modes distant/local

- Si votre interface utilisateur (WebUI/TUI) pointe vers un gateway **distant**, l'hôte distant possède le magasin de sessions + l'espace de travail.
- Migrer votre ordinateur portable ne déplacera pas l'état du gateway distant.

Si vous êtes en mode distant, migrez l'**hôte du gateway**.

### Piège : secrets dans les sauvegardes

`$OPENCLAW_STATE_DIR` contient des secrets (clés API, jetons OAuth, identifiants WhatsApp). Traitez les sauvegardes comme des secrets de production :

- stocker chiffré
- éviter de partager via des canaux non sécurisés
- faire pivoter les clés si vous soupçonnez une exposition

## Liste de vérification

Sur la nouvelle machine, confirmez :

- `openclaw status` affiche le gateway en cours d'exécution
- Vos canaux sont toujours connectés (ex. WhatsApp ne nécessite pas de nouveau couplage)
- Le tableau de bord s'ouvre et affiche les sessions existantes
- Vos fichiers d'espace de travail (mémoire, configs) sont présents

## Connexes

- [Doctor](/fr/gateway/doctor)
- [Dépannage du Gateway](/fr/gateway/troubleshooting)
- [Où OpenClaw stocke-t-il ses données ?](/fr/help/faq#where-does-openclaw-store-its-data)

import fr from "/components/footer/fr.mdx";

<fr />
