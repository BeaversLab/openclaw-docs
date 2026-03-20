---
summary: "Configuration avancée et workflows de développement pour OpenClaw"
read_when:
  - Configuration d'une nouvelle machine
  - Vous voulez « le dernier + le meilleur » sans casser votre configuration personnelle
title: "Configuration"
---

# Configuration

<Note>
Si vous configurez pour la première fois, commencez par [Getting Started](/fr/start/getting-started).
Pour les détails sur l'intégration, voir [Onboarding (CLI)](/fr/start/wizard).
</Note>

Dernière mise à jour : 2026-01-01

## TL;DR

- **L'adaptation vit en dehors du dépôt :** `~/.openclaw/workspace` (espace de travail) + `~/.openclaw/openclaw.json` (config).
- **Workflow stable :** installez l'application macOS ; laissez-la exécuter le Gateway inclus.
- **Workflow de pointe :** exécutez le Gateway vous-même via `pnpm gateway:watch`, puis laissez l'application macOS se connecter en mode Local.

## Prérequis (depuis la source)

- Node `>=22`
- `pnpm`
- Docker (optionnel ; uniquement pour une configuration/e2e conteneurisée — voir [Docker](/fr/install/docker))

## Stratégie d'adaptation (pour que les mises à jour ne fassent pas mal)

Si vous voulez « 100 % adapté à moi » _et_ des mises à jour faciles, gardez votre personnalisation dans :

- **Configuration :** `~/.openclaw/openclaw.json` (JSON/JSON5-ish)
- **Espace de travail :** `~/.openclaw/workspace` (compétences, prompts, mémoires ; faites-en un dépôt git privé)

Amorçage une fois :

```bash
openclaw setup
```

Depuis l'intérieur de ce dépôt, utilisez l'entrée CLI locale :

```bash
openclaw setup
```

Si vous n'avez pas encore d'installation globale, exécutez-le via `pnpm openclaw setup`.

## Exécuter le Gateway depuis ce dépôt

Après `pnpm build`, vous pouvez exécuter le CLI empaqueté directement :

```bash
node openclaw.mjs gateway --port 18789 --verbose
```

## Workflow stable (application macOS d'abord)

1. Installer + lancer **OpenClaw.app** (barre de menus).
2. Remplir la liste de contrôle d'intégration/autorisations (invites TCC).
3. Assurez-vous que le Gateway est en mode **Local** et en cours d'exécution (l'application le gère).
4. Lier les surfaces (exemple : WhatsApp) :

```bash
openclaw channels login
```

5. Vérification de santé mentale :

```bash
openclaw health
```

Si l'intégration n'est pas disponible dans votre build :

- Exécutez `openclaw setup`, puis `openclaw channels login`, puis démarrez le Gateway manuellement (`openclaw gateway`).

## Workflow de pointe (Gateway dans un terminal)

Objectif : travailler sur le Gateway TypeScript, obtenir le rechargement à chaud, garder l'interface utilisateur de l'application macOS connectée.

### 0) (Optionnel) Exécuter l'application macOS depuis la source aussi

Si vous voulez aussi l'application macOS à la pointe :

```bash
./scripts/restart-mac.sh
```

### 1) Démarrer le Gateway de développement

```bash
pnpm install
pnpm gateway:watch
```

`gateway:watch` exécute la passerelle en mode surveillance et recharge lors des modifications pertinentes de la source,
de la configuration et des métadonnées des plugins groupés.

### 2) Dirigez l'application macOS vers votre Gateway en cours d'exécution

Dans **OpenClaw.app** :

- Mode de connexion : **Local**
  L'application se connectera à la passerelle en cours d'exécution sur le port configuré.

### 3) Vérifier

- Le statut de la Gateway dans l'application doit indiquer **“Using existing gateway …”**
- Ou via CLI :

```bash
openclaw health
```

### Pièges courants

- **Mauvais port :** Le WS Gateway est par défaut `ws://127.0.0.1:18789` ; maintenez l'application et la CLI sur le même port.
- **Emplacement de l'état :**
  - Identifiants : `~/.openclaw/credentials/`
  - Sessions : `~/.openclaw/agents/<agentId>/sessions/`
  - Journaux : `/tmp/openclaw/`

## Carte du stockage des identifiants

Utilisez ceci lors du débogage de l'authentification ou pour décider ce qu'il faut sauvegarder :

- **WhatsApp** : `~/.openclaw/credentials/whatsapp/<accountId>/creds.json`
- **Jeton de bot Telegram** : config/env ou `channels.telegram.tokenFile` (fichier régulier uniquement ; liens symboliques rejetés)
- **Jeton de bot Discord** : config/env ou SecretRef (fournisseurs env/file/exec)
- **Jetons Slack** : config/env (`channels.slack.*`)
- **Listes d'autorisation d'appairage** :
  - `~/.openclaw/credentials/<channel>-allowFrom.json` (compte par défaut)
  - `~/.openclaw/credentials/<channel>-<accountId>-allowFrom.json` (comptes non par défaut)
- **Profils d'authentification de modèle** : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- **Payload de secrets sauvegardés par fichier (optionnel)** : `~/.openclaw/secrets.json`
- **Importation OAuth héritée** : `~/.openclaw/credentials/oauth.json`
  Plus de détails : [Sécurité](/fr/gateway/security#credential-storage-map).

## Mise à jour (sans casser votre configuration)

- Gardez `~/.openclaw/workspace` et `~/.openclaw/` comme « vos affaires » ; ne mettez pas vos invites/configurations personnelles dans le dépôt `openclaw`.
- Mise à jour de la source : `git pull` + `pnpm install` (lorsque le fichier de verrouillage a changé) + continuez à utiliser `pnpm gateway:watch`.

## Linux (service utilisateur systemd)

Les installations Linux utilisent un service systemd **utilisateur**. Par défaut, systemd arrête les services
utilisateur lors de la déconnexion/inactivité, ce qui tue la Gateway. Onboarding tente d'activer
la persistance pour vous (peut demander sudo). S'il est toujours désactivé, exécutez :

```bash
sudo loginctl enable-linger $USER
```

Pour les serveurs toujours actifs ou multi-utilisateurs, envisagez un service **système** au lieu d'un
service utilisateur (pas de persistance nécessaire). Consultez le [Gateway runbook](/fr/gateway) pour les notes systemd.

## Documentation connexe

- [Gateway runbook](/fr/gateway) (drapeaux, supervision, ports)
- [Gateway configuration](/fr/gateway/configuration) (schéma de configuration + exemples)
- [Discord](/fr/channels/discord) et [Telegram](/fr/channels/telegram) (étiquettes de réponse + paramètres replyToMode)
- [OpenClaw assistant setup](/fr/start/openclaw)
- [macOS app](/fr/platforms/macos) (cycle de vie de la passerelle)

import en from "/components/footer/en.mdx";

<en />
