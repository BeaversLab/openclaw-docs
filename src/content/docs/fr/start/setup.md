---
summary: "Configuration avancée et flux de travail de développement pour OpenClaw"
read_when:
  - Setting up a new machine
  - You want “latest + greatest” without breaking your personal setup
title: "Configuration"
---

# Configuration

<Note>Si vous configurez pour la première fois, commencez par [Getting Started](/en/start/getting-started). Pour les détails sur l'intégration, voir [Onboarding (CLI)](/en/start/wizard).</Note>

## TL;DR

- **La personnalisation réside hors du dépôt :** `~/.openclaw/workspace` (espace de travail) + `~/.openclaw/openclaw.json` (config).
- **Flux de travail stable :** installez l'application macOS ; laissez-la exécuter le Gateway intégré.
- **Flux de travail « bleeding edge » :** exécutez le Gateway vous-même via `pnpm gateway:watch`, puis laissez l'application macOS se connecter en mode Local.

## Prérequis (à partir du code source)

- Node 24 recommandé (Node 22 LTS, actuellement `22.14+`, toujours pris en charge)
- `pnpm` préféré (ou Bun si vous utilisez intentionnellement le [flux de travail Bun](/en/install/bun))
- Docker (optionnel ; uniquement pour la configuration/e2e conteneurisés — voir [Docker](/en/install/docker))

## Stratégie d'adaptation (pour que les mises à jour ne fassent pas mal)

Si vous souhaitez une configuration « 100 % adaptée à moi » _et_ des mises à jour faciles, gardez votre personnalisation dans :

- **Config :** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **Espace de travail :** `~/.openclaw/workspace` (compétences, invites, mémoires ; faites-en un dépôt git privé)

Amorçage une seule fois :

```bash
openclaw setup
```

Depuis l'intérieur de ce dépôt, utilisez l'entrée locale CLI :

```bash
openclaw setup
```

Si vous n'avez pas encore d'installation globale, exécutez-le via `pnpm openclaw setup` (ou `bun run openclaw setup` si vous utilisez le flux de travail Bun).

## Exécuter le Gateway depuis ce dépôt

Après `pnpm build`, vous pouvez exécuter le CLI packagé directement :

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## Flux de travail stable (application macOS d'abord)

1. Installez et lancez **OpenClaw.app** (barre de menus).
2. Remplissez la liste de contrôle d'onboarding/autorisations (invites TCC).
3. Assurez-vous que le Gateway est en mode **Local** et en cours d'exécution (l'application le gère).
4. Liez les surfaces (exemple : WhatsApp) :

```bash
openclaw channels login
```

5. Vérification de bon sens :

```bash
openclaw health
```

Si l'onboarding n'est pas disponible dans votre version :

- Exécutez `openclaw setup`, puis `openclaw channels login`, puis démarrez le Gateway manuellement (`openclaw gateway`).

## Flux de travail « bleeding edge » (Gateway dans un terminal)

Objectif : travailler sur le Gateway TypeScript, obtenir le rechargement à chaud (hot reload), garder l'interface de l'application macOS connectée.

### 0) (Optionnel) Exécuter l'application macOS depuis le code source également

Si vous voulez aussi l'application macOS à la pointe :

```bash
./scripts/restart-mac.sh
```

### 1) Démarrer le Gateway de développement

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` exécute la passerelle en mode watch et recharge lors des modifications pertinentes de la source,
de la config et des métadonnées des plugins groupés.

Si vous utilisez intentionnellement le flux de travail Bun, les commandes équivalentes sont :

```bash
bun install
bun run gateway:watch
```

### 2) Dirigez l'application macOS vers votre Gateway en cours d'exécution

Dans **OpenClaw.app** :

- Mode de connexion : **Local**
  L'application se connectera à la passerelle en cours d'exécution sur le port configuré.

### 3) Vérifier

- Le statut du Gateway dans l'application devrait indiquer **“Using existing gateway …”**
- Ou via CLI :

```bash
openclaw health
```

### Pièges courants

- **Mauvais port :** Le WS du Gateway est par défaut sur `ws://127.0.0.1:18789` ; gardez l'application + le CLI sur le même port.
- **Où réside l'état :**
  - État du canal/fournisseur : `~/.openclaw/credentials/`
  - Profils d'auth modèle : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
  - Sessions : `~/.openclaw/agents/<agentId>/sessions/`
  - Journaux : `/tmp/openclaw/`

## Carte du stockage des identifiants

Utilisez ceci lors du débogage de l'authentification ou pour décider quoi sauvegarder :

- **WhatsApp** : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Jeton de bot Telegram** : config/env ou `channels.telegram.tokenFile` (fichier régulier uniquement ; les liens symboliques sont rejetés)
- **Jeton de bot Discord** : config/env ou SecretRef (fournisseurs env/file/exec)
- **Jetons Slack** : config/env (`channels.slack.*`)
- **Listes d'autorisation d'appairage** :
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (compte par défaut)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (comptes non par défaut)
- **Profils d'authentification de modèle** : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Charge utile de secrets sauvegardés dans un fichier (optionnel)** : `~/.openclaw/secrets.json`
- **Import OAuth hérité** : `~/.openclaw/credentials/oauth.json`
  Plus de détails : [Sécurité](/en/gateway/security#credential-storage-map).

## Mise à jour (sans casser votre configuration)

- Gardez `~/.openclaw/workspace` et `~/.openclaw/` comme « vos affaires » ; ne mettez pas de invites/config personnels dans le dépôt `openclaw`.
- Mise à jour de la source : `git pull` + étape d'installation de votre gestionnaire de paquets choisi (`pnpm install` par défaut ; `bun install` pour le flux de travail Bun) + continuez à utiliser la commande `gateway:watch` correspondante.

## Linux (service utilisateur systemd)

Les installations Linux utilisent un service systemd **utilisateur**. Par défaut, systemd arrête les
services utilisateur lors de la déconnexion/inactivité, ce qui tue le Gateway. L'intégration tente d'activer
la persistance pour vous (peut demander sudo). Si elle est toujours désactivée, exécutez :

```bash
sudo loginctl enable-linger $USER
```

Pour les serveurs toujours actifs ou multi-utilisateurs, envisagez un service **système** au lieu d'un
service utilisateur (pas de persistance nécessaire). Voir le [manuel de procédures Gateway](/en/gateway) pour les notes systemd.

## Documentation connexe

- [Manuel de procédures Gateway](/en/gateway) (drapeaux, supervision, ports)
- [Configuration Gateway](/en/gateway/configuration) (schéma de config + exemples)
- [Discord](/en/channels/discord) et [Telegram](/en/channels/telegram) (balises de réponse + paramètres replyToMode)
- [Configuration de l'assistant OpenClaw](/en/start/openclaw)
- [Application macOS](/en/platforms/macos) (cycle de vie de la passerelle)
