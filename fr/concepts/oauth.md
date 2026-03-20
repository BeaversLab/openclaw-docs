---
summary: "OAuth dans OpenClaw : échange de jetons, stockage et modèles multi-comptes"
read_when:
  - Vous souhaitez comprendre OAuth OpenClaw de bout en bout
  - Vous rencontrez des problèmes d'invalidation de jetons / de déconnexion
  - Vous souhaitez des flux d'authentification setup-token ou OAuth
  - Vous souhaitez plusieurs comptes ou un routage par profil
title: "OAuth"
---

# OAuth

OpenClaw prend en charge « l'authentification par abonnement » via OAuth pour les fournisseurs qui l'offrent (notamment **OpenAI Codex (OAuth ChatGPT)**). Pour les abonnements Anthropic, utilisez le flux **setup-token**. L'utilisation d'abonnements Anthropic en dehors de Claude Code a été restreinte pour certains utilisateurs par le passé, considérez donc cela comme un risque lié au choix de l'utilisateur et vérifiez vous-même la politique actuelle d'Anthropic. OAuth OpenAI Codex est explicitement pris en charge pour une utilisation dans des outils externes tels qu'OpenClaw. Cette page explique :

Pour Anthropic en production, l'authentification par clé API est la voie recommandée et plus sûre que l'authentification setup-token par abonnement.

- comment fonctionne l'**échange de jetons** OAuth (PKCE)
- où les jetons sont **stockés** (et pourquoi)
- comment gérer **plusieurs comptes** (profils + remplacements par session)

OpenClaw prend également en charge les **plugins de fournisseurs** qui incluent leurs propres flux OAuth ou de clé API.
Exécutez-les via :

```bash
openclaw models auth login --provider <id>
```

## Le puits de jetons (pourquoi il existe)

Les fournisseurs OAuth créent généralement un **nouveau jeton d'actualisation** lors des flux de connexion/actualisation. Certains fournisseurs (ou clients OAuth) peuvent invalider les anciens jetons d'actualisation lorsqu'un nouveau est émis pour le même utilisateur/application.

Symptôme pratique :

- vous vous connectez via OpenClaw _et_ via Claude Code / Codex CLI → l'un d'eux se déconnecte aléatoirement plus tard

Pour réduire cela, OpenClaw traite `auth-profiles.json` comme un **puits de jetons** :

- le runtime lit les identifiants depuis **un seul endroit**
- nous pouvons conserver plusieurs profils et les router de manière déterministe

## Stockage (où vivent les jetons)

Les secrets sont stockés **par agent** :

- Profils d'authentification (OAuth + clés API + références au niveau des valeurs facultatives) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Fichier de compatité hérité : `~/.openclaw/agents/<agentId>/agent/auth.json`
  (les entrées statiques `api_key` sont supprimées lorsqu'elles sont découvertes)

Fichier hérité d'importation uniquement (toujours pris en charge, mais pas le stockage principal) :

- `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` à la première utilisation)

Tout ce qui précède respecte également `$OPENCLAW_STATE_DIR` (remplacement du répertoire d'état). Référence complète : [/gateway/configuration](/fr/gateway/configuration#auth-storage-oauth--api-keys)

Pour les références de secrets statiques et le comportement d'activation des instantanés d'exécution, voir [Gestion des secrets](/fr/gateway/secrets).

## Token de configuration Anthropic (authentification par abonnement)

<Warning>
La prise en charge du token de configuration Anthropic est une compatibilité technique, et non une garantie de stratégie.
Anthropic a bloqué certaines utilisations d'abonnement en dehors de Claude Code par le passé.
Décidez par vous-même d'utiliser ou non l'authentification par abonnement, et vérifiez les conditions actuelles de Anthropic.
</Warning>

Exécutez `claude setup-token` sur n'importe quelle machine, puis collez-le dans OpenClaw :

```bash
openclaw models auth setup-token --provider anthropic
```

Si vous avez généré le jeton ailleurs, collez-le manuellement :

```bash
openclaw models auth paste-token --provider anthropic
```

Vérifier :

```bash
openclaw models status
```

## Échange OAuth (fonctionnement de la connexion)

Les flux de connexion interactive de OpenClaw sont implémentés dans `@mariozechner/pi-ai` et intégrés aux assistants/aux commandes.

### Token de configuration Anthropic

Structure du flux :

1. exécuter `claude setup-token`
2. coller le jeton dans OpenClaw
3. stocker en tant que profil d'authentification par jeton (pas d'actualisation)

Le chemin de l'assistant est `openclaw onboard` → choix d'authentification `setup-token` (Anthropic).

### Codex OpenAI (ChatGPT OAuth)

OAuth Codex OpenAI est explicitement pris en charge pour une utilisation en dehors du CLI Codex, y compris dans les flux de travail OAuth.

Structure du flux (PKCE) :

1. générer le vérificateur/défi PKCE + aléatoire `state`
2. ouvrir `https://auth.openai.com/oauth/authorize?...`
3. essayer de capturer le rappel sur `http://127.0.0.1:1455/auth/callback`
4. si le rappel ne peut pas se lier (ou si vous êtes distant/headless), collez l'URL de redirection/le code
5. échanger à `https://auth.openai.com/oauth/token`
6. extraire `accountId` du jeton d'accès et stocker `{ access, refresh, expires, accountId }`

Le chemin de l'assistant est `openclaw onboard` → choix d'authentification `openai-codex`.

## Actualisation + expiration

Les profils stockent un horodatage `expires`.

À l'exécution :

- si `expires` est dans le futur → utiliser le jeton d'accès stocké
- si expiré → actualiser (sous un verrou de fichier) et écraser les informations d'identification stockées

Le flux d'actualisation est automatique ; vous n'avez généralement pas besoin de gérer les jetons manuellement.

## Plusieurs comptes (profils) + routage

Deux modèles :

### 1) Préféré : agents séparés

Si vous ne voulez pas que les comptes « personnel » et « travail » interagissent jamais, utilisez des agents isolés (sessions distinctes + identifiants + espace de travail) :

```bash
openclaw agents add work
openclaw agents add personal
```

Configurez ensuite l'authentification par agent (assistant) et acheminez les discussions vers le bon agent.

### 2) Avancé : plusieurs profils dans un seul agent

`auth-profiles.json` prend en charge plusieurs ID de profil pour le même fournisseur.

Choisissez le profil utilisé :

- globalement via l'ordre de configuration (`auth.order`)
- par session via `/model ...@<profileId>`

Exemple (remplacement au niveau de la session) :

- `/model Opus@anthropic:work`

Comment voir quels ID de profil existent :

- `openclaw channels list --json` (affiche `auth[]`)

Documentation connexe :

- [/concepts/model-failover](/fr/concepts/model-failover) (règles de rotation + délai de récupération)
- [/tools/slash-commands](/fr/tools/slash-commands) (interface de commande)

import en from "/components/footer/en.mdx";

<en />
