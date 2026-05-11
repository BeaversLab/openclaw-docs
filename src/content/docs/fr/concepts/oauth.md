---
summary: "OAuth dans OpenClaw : échange de jetons, stockage et modèles multi-comptes"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

OpenClaw prend en charge l'« authentification par abonnement » via OAuth pour les providers qui l'offrent
(notamment **OpenAI Codex (ChatGPT OAuth)**). Pour Anthropic, la division pratique
est désormais :

- **Clé API Anthropic** : facturation API Anthropic normale
- **CLI Claude Anthropic / auth par abonnement dans OpenClaw** : le personnel d'Anthropic
  nous a indiqué que cette utilisation est à nouveau autorisée

OAuth Codex OpenAI est explicitement pris en charge pour une utilisation dans des outils externes comme
OpenClaw. Cette page explique :

Pour Anthropic en production, l'auth par clé API est le chemin recommandé le plus sûr.

- comment fonctionne l'**échange de jetons** OAuth (PKCE)
- où sont **stockés** les jetons (et pourquoi)
- comment gérer **plusieurs comptes** (profils + substitutions par session)

OpenClaw prend également en charge les **plugins de provider** qui fournissent leurs propres flux OAuth ou de clé API.
Exécutez-les via :

```bash
openclaw models auth login --provider <id>
```

## Le puits de jetons (pourquoi il existe)

Les providers OAuth créent généralement un **nouveau jeton d'actualisation** lors des flux de connexion/actualisation. Certains providers (ou clients OAuth) peuvent invalider les anciens jetons d'actualisation lorsqu'un nouveau est émis pour le même utilisateur/application.

Symptôme pratique :

- vous vous connectez via OpenClaw _et_ via Claude Code / CLI Codex → l'un d'eux est « déconnecté » de manière aléatoire plus tard

Pour réduire cela, OpenClaw traite `auth-profiles.json` comme un **puits de jetons** :

- le runtime lit les identifiants à partir d'**un seul endroit**
- nous pouvons conserver plusieurs profils et les router de manière déterministe
- la réutilisation externe de la CLI est spécifique au provider : la CLI Codex peut amorcer un profil
  `openai-codex:default` vide, mais une fois qu'OpenClaw dispose d'un profil OAuth local,
  le jeton d'actualisation local est canonique ; les autres intégrations peuvent rester
  gérées externement et relire leur magasin d'auth CLI

## Stockage (où vivent les jetons)

Les secrets sont stockés **par agent** :

- Profils d'auth (OAuth + clés API + références de niveau de valeur optionnelles) : `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Fichier de compatibilité hérité : `~/.openclaw/agents/<agentId>/agent/auth.json`
  (les entrées `api_key` statiques sont supprimées lorsqu'elles sont découvertes)

Fichier d'importation hérité uniquement (toujours pris en charge, mais pas le magasin principal) :

- `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` à la première utilisation)

Tout ce qui précède respecte également `$OPENCLAW_STATE_DIR` (remplacement du répertoire d'état). Référence complète : [/gateway/configuration](/fr/gateway/configuration-reference#auth-storage)

Pour les références de secrets statiques et le comportement d'activation de l'instantané d'exécution, voir [Gestion des secrets](/fr/gateway/secrets).

## Compatibilité des jetons hérités Anthropic

<Warning>
La documentation publique Claude Code de Anthropic indique que l'utilisation directe de Claude Code reste dans les limites de l'abonnement Claude, et le personnel de Anthropic nous a indiqué que l'utilisation de la Claude OpenClaw de style CLI est à nouveau autorisée. OpenClaw traite donc la réutilisation de la Claude CLI et l'utilisation de `claude -p` comme étant sanctionnées pour cette intégration, sauf si Anthropic publie une nouvelle politique.

Pour la documentation actuelle du plan direct-Claude-Code de Anthropic, voir [Utiliser Claude Code
avec votre plan Pro ou Max
](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
et [Utiliser Claude Code avec votre plan Team ou Enterprise
](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/).

Si vous souhaitez d'autres options de style abonnement dans OpenClaw, voir [OpenAI
Codex](/fr/providers/openai), [Plan de codage cloud Qwen
](/fr/providers/qwen), [Plan de codage MiniMax](/fr/providers/minimax),
et [Plan de codage Z.AI / GLM](/fr/providers/glm).

</Warning>

OpenClaw expose également le setup-token Anthropic comme chemin d'authentification par jeton pris en charge, mais il préfère désormais la réutilisation de la Claude CLI et `claude -p` lorsque disponibles.

## Migration vers la Claude Anthropic CLI

OpenClaw prend à nouveau en charge la réutilisation de la Claude Anthropic CLI. Si vous avez déjà une connexion locale
Claude sur l'hôte, onboarding/configure peut la réutiliser directement.

## Échange OAuth (fonctionnement de la connexion)

Les flux de connexion interactifs de OpenClaw sont implémentés dans `@mariozechner/pi-ai` et intégrés aux assistants/commands.

### Setup-token Anthropic

Forme du flux :

1. démarrer le setup-token ou paste-token Anthropic depuis OpenClaw
2. OpenClaw stocke les informations d'identification Anthropic résultantes dans un profil d'authentification
3. la sélection du modèle reste sur `anthropic/...`
4. les profils d'authentification Anthropic existants restent disponibles pour le contrôle de retour/arrière (rollback/order control)

### Codex OpenAI (ChatGPT OAuth)

Le OpenAI Codex OAuth est explicitement pris en charge pour une utilisation en dehors de la CLI Codex, y compris dans les workflows OpenClaw.

Forme du flux (PKCE) :

1. générer vérificateur/défi PKCE + `state` aléatoire
2. ouvrir `https://auth.openai.com/oauth/authorize?...`
3. essayer de capturer le rappel sur `http://127.0.0.1:1455/auth/callback`
4. si le rappel ne peut pas se lier (ou si vous êtes en mode distant/headless), collez l'URL/code de redirection
5. échange à `https://auth.openai.com/oauth/token`
6. extraire `accountId` du jeton d'accès et stocker `{ access, refresh, expires, accountId }`

Le chemin de l'assistant est `openclaw onboard` → choix d'auth `openai-codex`.

## Actualisation + expiration

Les profils stockent un horodatage `expires`.

À l'exécution :

- si `expires` est dans le futur → utiliser le jeton d'accès stocké
- si expiré → actualiser (sous un verrou de fichier) et écraser les informations d'identification stockées
- exception : certaines informations d'identification externes CLI restent gérées de manière externe ; OpenClaw
  relit ces magasins d'authentification CLI au lieu de dépenser des jetons d'actualisation copiés.
  L'amorçage de l'interface en ligne de commande (CLI) Codex CLI est intentionnellement plus étroit : il initialise un profil
  `openai-codex:default` vide, puis les actualisations détenues par OpenClaw gardent le profil
  local canonique.

Le flux d'actualisation est automatique ; vous n'avez généralement pas besoin de gérer les jetons manuellement.

## Comptes multiples (profils) + routage

Deux modèles :

### 1) Préféré : agents distincts

Si vous voulez que « personnel » et « travail » n'interagissent jamais, utilisez des agents isolés (sessions distinctes + informations d'identification + espace de travail) :

```bash
openclaw agents add work
openclaw agents add personal
```

Ensuite, configurez l'authentification par agent (assistant) et acheminez les discussions vers le bon agent.

### 2) Avancé : plusieurs profils dans un seul agent

`auth-profiles.json` prend en charge plusieurs ID de profil pour le même fournisseur.

Choisir quel profil est utilisé :

- globalement via l'ordre de configuration (`auth.order`)
- par session via `/model ...@<profileId>`

Exemple (remplacement de session) :

- `/model Opus@anthropic:work`

Comment voir quels ID de profil existent :

- `openclaw channels list --json` (affiche `auth[]`)

Documentation connexe :

- [Basculade de modèle](/fr/concepts/model-failover) (règles de rotation + temps de recharge)
- [Commandes slash](/fr/tools/slash-commands) (surface de commande)

## Connexes

- [Authentification](/fr/gateway/authentication) — vue d'ensemble de l'authentification des fournisseurs de modèles
- [Secrets](/fr/gateway/secrets) — stockage des informations d'identification et SecretRef
- [Référence de configuration](/fr/gateway/configuration-reference#auth-storage) — clés de configuration de l'authentification
