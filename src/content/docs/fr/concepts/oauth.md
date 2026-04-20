---
summary: "OAuth dans OpenClaw : échange de jetons, stockage et modèles multi-comptes"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

# OAuth

OpenClaw prend en charge « l'authentification par abonnement » via OAuth pour les providers qui l'offrent
(notamment **OpenAI Codex (ChatGPT OAuth)**). Pour Anthropic, la répartition pratique
est désormais :

- **Clé API Anthropic** : facturation API Anthropic normale
- **Anthropic Claude CLI / auth par abonnement dans OpenClaw** : le personnel d'Anthropic nous a informé que cette utilisation est à nouveau autorisée

OAuth OpenAI Codex est explicitement pris en charge pour une utilisation dans des outils externes comme
OpenClaw. Cette page explique :

Pour Anthropic en production, l'authentification par clé API est le chemin recommandé le plus sûr.

- comment fonctionne l'**échange de jetons** OAuth (PKCE)
- où les jetons sont **stockés** (et pourquoi)
- comment gérer **plusieurs comptes** (profils + remplacements par session)

OpenClaw prend également en charge les **plugins de provider** qui embarquent leurs propres flux OAuth ou de clé
API. Exécutez-les via :

```bash
openclaw models auth login --provider <id>
```

## Le puits de jetons (pourquoi il existe)

Les providers OAuth génèrent souvent un **nouveau jeton d'actualisation** lors des flux de connexion/actualisation. Certains providers (ou clients OAuth) peuvent invalider les anciens jetons d'actualisation lorsqu'un nouveau est émis pour le même utilisateur/application.

Symptôme pratique :

- vous vous connectez via OpenClaw _et_ via Claude Code / Codex CLI → l'un d'eux se déconnecte « » aléatoirement plus tard

Pour réduire cela, OpenClaw traite `auth-profiles.json` comme un **puits de jetons** :

- le runtime lit les identifiants à partir d'**un seul endroit**
- nous pouvons conserver plusieurs profils et les router de manière déterministe
- lorsque les identifiants sont réutilisés depuis un CLI externe comme Codex CLI, OpenClaw
  les met en miroir avec leur provenance et relit cette source externe au lieu de
  faire tourner le jeton d'actualisation lui-même

## Stockage (où vivent les jetons)

Les secrets sont stockés **par agent** :

- Profils d'authentification (OAuth + clés API + références optionnelles au niveau des valeurs) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Fichier de compatibilité héritée : `~/.openclaw/agents/<agentId>/agent/auth.json`
  (les entrées statiques `api_key` sont nettoyées lors de leur découverte)

Fichier d'importation hérité uniquement (toujours pris en charge, mais pas le stockage principal) :

- `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` à la première utilisation)

Tout ce qui précède respecte également `$OPENCLAW_STATE_DIR` (remplacement du répertoire d'état). Référence complète : [/gateway/configuration](/fr/gateway/configuration-reference#auth-storage)

Pour les références de secrets statiques et le comportement d'activation des instantanés d'exécution, consultez la section [Gestion des secrets](/fr/gateway/secrets).

## Compatibilité des jetons hérités Anthropic

<Warning>
La documentation publique de Claude Code d'Anthropic indique que l'utilisation directe de Claude Code reste dans les limites de l'abonnement Claude, et le personnel d'Anthropic nous a informé que l'utilisation de la CLI Claude de style OpenClaw est à nouveau autorisée. OpenClaw considère donc la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme sanctionnées pour cette intégration, sauf si Anthropic publie une nouvelle politique.

Pour la documentation actuelle du plan direct-Claude-Code d'Anthropic, consultez [Utiliser Claude Code avec votre plan Pro ou Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan) et [Utiliser Claude Code avec votre plan Team ou Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/).

Si vous souhaitez d'autres options de style abonnement dans OpenClaw, consultez [OpenAI Codex](/fr/providers/openai), [Plan de codage cloud Qwen](/fr/providers/qwen), [Plan de codage MiniMax](/fr/providers/minimax) et [Plan de codage Z.AI / GLM](/fr/providers/glm).

</Warning>

OpenClaw expose également le setup-token Anthropic comme chemin d'auth par jeton pris en charge, mais il préfère désormais la réutilisation de la CLI Claude et `claude -p` lorsqu'elles sont disponibles.

## Migration de la Anthropic Claude CLI

OpenClaw prend à nouveau en charge la réutilisation de la CLI Claude Anthropic. Si vous avez déjà une connexion Claude locale sur l'hôte, l'intégration/configuration peut la réutiliser directement.

## Échange OAuth (fonctionnement de la connexion)

Les flux de connexion interactive d'OpenClaw sont implémentés dans `@mariozechner/pi-ai` et intégrés aux assistants/commands.

### Jeton de configuration Anthropic

Forme du flux :

1. démarrer le jeton de configuration Anthropic ou coller le jeton depuis OpenClaw
2. OpenClaw stocke les informations d'identification Anthropic résultantes dans un profil d'authentification
3. la sélection du modèle reste sur `anthropic/...`
4. les profils d'authentification Anthropic existants restent disponibles pour le contrôle de la restauration/de l'ordre

### OpenAI Codex (ChatGPT OAuth)

OAuth OpenAI Codex est explicitement pris en charge pour une utilisation en dehors de la CLI Codex, y compris dans les workflows OpenClaw.

Forme du flux (PKCE) :

1. générer le vérificateur/défi PKCE + `state` aléatoire
2. ouvrir `https://auth.openai.com/oauth/authorize?...`
3. essayer de capturer le rappel sur `http://127.0.0.1:1455/auth/callback`
4. si le callback ne peut pas se lier (ou si vous êtes distant/headless), collez l'URL/code de redirection
5. échanger à `https://auth.openai.com/oauth/token`
6. extraire `accountId` du jeton d'accès et stocker `{ access, refresh, expires, accountId }`

Le chemin de l'assistant est `openclaw onboard` → choix d'auth `openai-codex`.

## Actualisation + expiration

Les profils stockent un horodatage `expires`.

À l'exécution :

- si `expires` est dans le futur → utiliser le jeton d'accès stocké
- si expiré → actualiser (sous un verrou de fichier) et écraser les informations d'identification stockées
- exception : les informations d'identification CLI externes réutilisées restent gérées externement ; OpenClaw
  relit le stock d'auth CLI et ne dépense jamais lui-même le jeton d'actualisation copié

Le flux d'actualisation est automatique ; vous n'avez généralement pas besoin de gérer les jetons manuellement.

## Comptes multiples (profils) + routage

Deux modèles :

### 1) Préféré : agents séparés

Si vous ne voulez pas que « personnel » et « travail » interagissent, utilisez des agents isolés (sessions + informations d'identification + espace de travail séparés) :

```bash
openclaw agents add work
openclaw agents add personal
```

Configurez ensuite l'auth par agent (assistant) et acheminez les discussions vers le bon agent.

### 2) Avancé : plusieurs profils dans un seul agent

`auth-profiles.json` prend en charge plusieurs ID de profil pour le même fournisseur.

Choisir le profil utilisé :

- mondialement via l'ordre de configuration (`auth.order`)
- par session via `/model ...@<profileId>`

Exemple (remplacement de session) :

- `/model Opus@anthropic:work`

Comment voir quels ID de profil existent :

- `openclaw channels list --json` (affiche `auth[]`)

Documentation connexe :

- [/concepts/model-failover](/fr/concepts/model-failover) (règles de rotation + temps de recharge)
- [/tools/slash-commands](/fr/tools/slash-commands) (interface de commande)

## Connexes

- [Authentication](/fr/gateway/authentication) — aperçu de l'authentification du fournisseur de modèle
- [Secrets](/fr/gateway/secrets) — stockage des informations d'identification et SecretRef
- [Configuration Reference](/fr/gateway/configuration-reference#auth-storage) — clés de configuration d'authentification
