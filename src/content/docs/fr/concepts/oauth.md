---
summary: "OAuth dans OpenClaw : échange de jetons, stockage et modèles multi-comptes"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want setup-token or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw prend en charge « l'authentification par abonnement » via OAuth pour les fournisseurs qui l'offrent (notamment **OpenAI Codex (ChatGPT OAuth)**). Pour les abonnements Anthropic, vous pouvez soit utiliser le flux **setup-token**, soit réutiliser une connexion locale **Claude CLI** sur l'hôte de la passerelle. L'utilisation de l'abonnement Anthropic en dehors de Claude Code a été restreinte pour certains utilisateurs par le passé, traitez donc cela comme un risque lié au choix de l'utilisateur et vérifiez vous-même la politique actuelle d'Anthropic. OAuth OpenAI Codex est explicitement pris en charge pour une utilisation dans des outils externes comme OpenClaw. Cette page explique :

Pour Anthropic en production, l'auth par clé API est le chemin recommandé plus sûr par rapport à l'auth par setup-token d'abonnement.

- comment fonctionne l'**échange de jetons** OAuth (PKCE)
- où les jetons sont **stockés** (et pourquoi)
- comment gérer **plusieurs comptes** (profils + substitutions par session)

OpenClaw prend également en charge les **plugins de provider** qui fournissent leurs propres flux OAuth ou de clé API.
Exécutez-les via :

```bash
openclaw models auth login --provider <id>
```

## Le puits de jetons (pourquoi il existe)

Les providers OAuth génèrent généralement un **nouveau jeton d'actualisation** lors des flux de connexion/actualisation. Certains providers (ou clients OAuth) peuvent invalider les anciens jetons d'actualisation lorsqu'un nouveau est émis pour le même utilisateur/application.

Symptôme pratique :

- vous vous connectez via OpenClaw _et_ via Claude Code / Codex CLI → l'un d'eux est « déconnecté » de manière aléatoire plus tard

Pour réduire cela, OpenClaw traite `auth-profiles.json` comme un **« puits de jetons »** :

- le runtime lit les identifiants à partir **d'un seul endroit**
- nous pouvons conserver plusieurs profils et les router de manière déterministe

## Stockage (où vivent les jetons)

Les secrets sont stockés **par agent** :

- Profils d'authentification (OAuth + clés API + références de niveau de valeur optionnelles) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Fichier de compatibilité hérité : `~/.openclaw/agents/<agentId>/agent/auth.json`
  (les entrées `api_key` statiques sont nettoyées lorsqu'elles sont découvertes)

Fichier hérité d'importation uniquement (toujours pris en charge, mais pas le stockage principal) :

- `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` lors de la première utilisation)

Tout ce qui précède respecte également `$OPENCLAW_STATE_DIR` (remplacement du répertoire d'état). Référence complète : [/gateway/configuration](/en/gateway/configuration-reference#auth-storage)

Pour les références de secrets statiques et le comportement d'activation des instantanés d'exécution, voir [Secrets Management](/en/gateway/secrets).

## Anthropic setup-token (auth par abonnement)

<Warning>Le support setup-token Anthropic est une compatibilité technique, et non une garantie de politique. Anthropic a bloqué certaines utilisations d'abonnement en dehors de Claude Code dans le passé. Décidez par vous-même d'utiliser ou non l'authentification par abonnement, et vérifiez les conditions actuelles de Anthropic.</Warning>

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

## Anthropic Claude CLI migration

Si Claude CLI est déjà installé et connecté sur l'hôte de la passerelle, vous pouvez
basculer la sélection du modèle Anthropic vers le backend local CLI :

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

Raccourci d'onboarding :

```bash
openclaw onboard --auth-choice anthropic-cli
```

Cela permet de conserver les profils d'authentification Anthropic existants pour une annulation, mais réécrit le chemin principal
default-model de `anthropic/...` vers `claude-cli/...`.

## Échange OAuth (fonctionnement de la connexion)

Les flux de connexion interactive de OpenClaw sont implémentés dans `@mariozechner/pi-ai` et connectés aux assistants/commandes.

### Anthropic setup-token / Claude CLI

Forme du flux :

Chemin setup-token :

1. exécuter `claude setup-token`
2. coller le jeton dans OpenClaw
3. stocker en tant que profil d'authentification par jeton (pas d'actualisation)

Chemin Claude CLI :

1. se connecter avec `claude auth login` sur l'hôte de la passerelle
2. exécuter `openclaw models auth login --provider anthropic --method cli --set-default`
3. ne pas stocker de nouveau profil d'authentification ; basculer la sélection du modèle sur `claude-cli/...`

Chemins de l'assistant :

- `openclaw onboard` → choix d'authentification `anthropic-cli`
- `openclaw onboard` → choix d'authentification `setup-token` (Anthropic)

### OpenAI Codex (ChatGPT OAuth)

L'OpenAI Codex OAuth est explicitement pris en charge pour une utilisation en dehors de l'interface de ligne de commande Codex, y compris dans les workflows CLI.

Structure du flux (PKCE) :

1. générer le vérificateur/défi PKCE + `state` aléatoire
2. ouvrir `https://auth.openai.com/oauth/authorize?...`
3. essayer de capturer le rappel sur `http://127.0.0.1:1455/auth/callback`
4. si le rappel ne peut pas se lier (ou si vous êtes distant/sans interface), collez l'URL de redirection/le code
5. échanger à `https://auth.openai.com/oauth/token`
6. extraire `accountId` du jeton d'accès et stocker `{ access, refresh, expires, accountId }`

Le chemin de l'assistant est `openclaw onboard` → choix d'auth `openai-codex`.

## Actualisation + expiration

Les profils stockent un horodatage `expires`.

À l'exécution :

- si `expires` est dans le futur → utiliser le jeton d'accès stocké
- si expiré → actualiser (sous un verrou de fichier) et écraser les identifiants stockés

Le flux d'actualisation est automatique ; vous n'avez généralement pas besoin de gérer les jetons manuellement.

## Comptes multiples (profils) + routage

Deux modèles :

### 1) Préféré : agents séparés

Si vous voulez que « personnel » et « travail » n'interagissent jamais, utilisez des agents isolés (sessions + identifiants + espace de travail séparés) :

```bash
openclaw agents add work
openclaw agents add personal
```

Configurez ensuite l'auth par agent (assistant) et acheminez les discussions vers le bon agent.

### 2) Avancé : plusieurs profils dans un seul agent

`auth-profiles.json` prend en charge plusieurs ID de profil pour le même fournisseur.

Choisissez le profil utilisé :

- mondialement via l'ordre de configuration (`auth.order`)
- par session via `/model ...@<profileId>`

Exemple (remplacement de session) :

- `/model Opus@anthropic:work`

Comment voir quels ID de profil existent :

- `openclaw channels list --json` (affiche `auth[]`)

Documentation connexe :

- [/concepts/model-failover](/en/concepts/model-failover) (règles de rotation + refroidissement)
- [/tools/slash-commands](/en/tools/slash-commands) (interface de commande)

## Connexes

- [Authentification](/en/gateway/authentication) — aperçu de l'authentification du provider de model
- [Secrets](/en/gateway/secrets) — stockage des identifiants et SecretRef
- [Référence de configuration](/en/gateway/configuration-reference#auth-storage) — clés de configuration de l'authentification
