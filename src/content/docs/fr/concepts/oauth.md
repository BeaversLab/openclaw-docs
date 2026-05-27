---
summary: "OAuth dans OpenClaw : échange de jetons, stockage et modèles multi-comptes"
read_when:
  - You want to understand OpenClaw OAuth end-to-end
  - You hit token invalidation / logout issues
  - You want Claude CLI or OAuth auth flows
  - You want multiple accounts or profile routing
title: "OAuth"
---

OpenClaw prend en charge « subscription auth » via OAuth pour les providers qui l'offrent
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

OpenClaw prend également en charge les **provider plugins** qui incluent leurs propres flux OAuth ou
clés API. Exécutez-les via :

```bash
openclaw models auth login --provider <id>
```

## Le puits de jetons (pourquoi il existe)

Les providers OAuth créent généralement un **nouveau jeton d'actualisation** lors des flux de connexion/actualisation. Certains providers (ou clients OAuth) peuvent invalider les anciens jetons d'actualisation lorsqu'un nouveau est émis pour le même utilisateur/application.

Symptôme pratique :

- vous vous connectez via OpenClaw _et_ via Claude Code / Codex CLI → l'un d'eux est « déconnecté »
  aléatoirement plus tard

Pour réduire cela, OpenClaw traite `auth-profiles.json` comme un **puits de jetons** :

- le runtime lit les identifiants à partir d'**un seul endroit**
- nous pouvons conserver plusieurs profils et les router de manière déterministe
- la réutilisation externe du CLI est spécifique au provider : le CLI Codex peut amorcer un profil `openai-codex:default` vide, mais une fois que OpenClaw possède un profil OAuth local, le jeton d'actualisation local est canonique. Si ce jeton d'actualisation local est rejeté, OpenClaw peut utiliser un jeton CLI Codex du même compte utilisable comme solution de repli uniquement au moment de l'exécution ; les autres intégrations peuvent rester gérées externement et relire leur magasin d'auth CLI
- les chemins de statut et de démarrage qui connaissent déjà l'ensemble de providers configurés limitent
  la découverte CLI externe à cet ensemble, afin qu'un magasin de connexion CLI non lié ne soit pas
  sondé pour une configuration à fournisseur unique

## Stockage (où vivent les jetons)

Les secrets sont stockés dans les magasins d'authentification des agents :

- Profils d'authentification (OAuth + clés API + références au niveau des valeurs optionnelles) : OAuthAPI`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`
- Fichier de compatibilité hérité : `~/.openclaw/agents/<agentId>/agent/auth.json`
  (les entrées `api_key` statiques sont supprimées lorsqu'elles sont découvertes)

Fichier d'importation hérité uniquement (toujours pris en charge, mais pas le stockage principal) :

- `~/.openclaw/credentials/oauth.json` (importé dans `auth-profiles.json` lors de la première utilisation)

Tout ce qui précède respecte également `$OPENCLAW_STATE_DIR` (remplacement du répertoire d'état). Référence complète : [/gateway/configuration](/fr/gateway/configuration-reference#auth-storage)

Pour les références de secrets statiques et le comportement d'activation des instantanés d'exécution, voir [Gestion des secrets](/fr/gateway/secrets).

Lorsqu'un agent secondaire n'a pas de profil d'authentification local, OpenClaw utilise l'héritage
par lecture à partir du magasin de l'agent par défaut/principal. Il ne clone pas le OpenClaw`auth-profiles.json`OAuthOAuth
de l'agent principal lors de la lecture. Les jetons d'actualisation OAuth sont particulièrement
sensibles : les flux de copie normaux les ignorent par défaut car certains providers font pivoter
ou invalident les jetons d'actualisation après utilisation. Configurez une connexion OAuth séparée pour un
agent lorsqu'il a besoin d'un compte indépendant.

## Compatibilité des jetons hérités Anthropic

<Warning>
Les documents publics de Anthropic concernant Claude Code indiquent que l'utilisation directe de Claude Code reste dans les limites de l'abonnement Claude, et le personnel de Anthropic nous a informés que l'utilisation de Claude OpenClaw de type CLI est à nouveau autorisée. OpenClaw considère donc la réutilisation de Claude CLI et l'utilisation de `claude -p` comme étant autorisées pour cette intégration, à moins que Anthropic ne publie une nouvelle politique.

Pour les documents actuels de Anthropic concernant les plans d'accès direct à Claude Code, consultez [Utiliser Claude Code
avec votre formule Pro ou Max
](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
et [Utiliser Claude Code avec votre formule Team ou Enterprise
](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/).

Si vous souhaitez d'autres options de type abonnement dans OpenClaw, consultez [OpenAI
Codex](/fr/providers/openai), [Forfait de codage cloud Qwen
](/fr/providers/qwen), [Forfait de codage MiniMax](/fr/providers/minimax),
et [Forfait de codage Z.AI / GLM](/fr/providers/zai).

</Warning>

OpenClaw expose également le setup-token de Anthropic en tant que chemin d'authentification par jeton pris en charge, mais il préfère désormais la réutilisation de Claude CLI et `claude -p` lorsqu'elles sont disponibles.

## Migration vers Claude Anthropic de CLI

OpenClaw prend à nouveau en charge la réutilisation de Claude Anthropic de CLI. Si vous disposez déjà d'une connexion
Claude locale sur l'hôte, onboarding/configure peut la réutiliser directement.

## Échange OAuth (fonctionnement de la connexion)

Les flux de connexion interactifs d'OpenClaw sont implémentés dans `@earendil-works/pi-ai` et connectés aux assistants/commandes.

### Setup-token Anthropic

Forme du flux :

1. démarrer le setup-token Anthropic ou coller le jeton depuis OpenClaw
2. OpenClaw stocke les informations d'identification Anthropic résultantes dans un profil d'authentification
3. la sélection du modèle reste sur `anthropic/...`
4. les profils d'authentification Anthropic existants restent disponibles pour le retour en arrière/le contrôle de l'ordre

### OpenAI Codex (ChatGPT OAuth)

OpenAI Codex OAuth est explicitement pris en charge pour une utilisation en dehors du CLI Codex, y compris dans les workflows OpenClaw.

Forme du flux (PKCE) :

1. générer le vérificateur/défi PKCE + un `state` aléatoire
2. ouvrir `https://auth.openai.com/oauth/authorize?...`
3. tenter de capturer le rappel sur `http://127.0.0.1:1455/auth/callback`
4. si le rappel ne peut pas être lié (ou si vous êtes distant/sans tête), coller l'URL/code de redirection
5. échanger à `https://auth.openai.com/oauth/token`
6. extraire `accountId` du jeton d'accès et stocker `{ access, refresh, expires, accountId }`

Le chemin de l'assistant est `openclaw onboard` → choix d'auth `openai-codex`.

## Actualisation + expiration

Les profils stockent un horodatage `expires`.

À l'exécution :

- si `expires` est dans le futur → utiliser le jeton d'accès stocké
- si expiré → actualiser (sous un verrou de fichier) et écraser les identifiants stockés
- si un agent secondaire lit un profil OAuth hérité d'un agent principal, l'actualisation
  réécrit dans le stock de l'agent principal au lieu de copier le jeton d'actualisation dans
  le stock de l'agent secondaire
- exception : certaines identifiants CLI externes restent gérés de manière externe ; CLIOpenClawCLICLI
  relit ces magasins d'auth CLI au lieu de dépenser des jetons d'actualisation copiés.
  L'amorçage de la CLI Codex est intentionnellement plus étroit : il initialise un profil
  `openai-codex:default` vide, puis les actualisations appartenant à OpenClawCLI maintiennent le profil
  local comme canonique. Si l'actualisation Codex locale échoue et que la CLI Codex possède un
  jeton utilisable pour le même compte, OpenClaw peut utiliser ce jeton pour la requête
  d'exécution actuelle sans le réécrire dans `auth-profiles.json`.

Le flux d'actualisation est automatique ; vous n'avez généralement pas besoin de gérer les jetons manuellement.

## Comptes multiples (profils) + routage

Deux modèles :

### 1) Préféré : agents séparés

Si vous souhaitez que « personnel » et « travail » n'interagissent jamais, utilisez des agents isolés (sessions séparées + identifiants + espace de travail) :

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

Exemple (remplacement par session) :

- `/model Opus@anthropic:work`

Comment voir quels ID de profil existent :

- `openclaw channels list --json` (affiche `auth[]`)

Documentation connexe :

- [Basculement de modèle](/fr/concepts/model-failover) (règles de rotation + temps de recharge)
- [Commandes slash](/fr/tools/slash-commands) (surface de commande)

## Connexes

- [Authentification](/fr/gateway/authentication) - aperçu de l'authentification du fournisseur de modèles
- [Secrets](/fr/gateway/secrets) - stockage des identifiants et SecretRef
- [Référence de configuration](/fr/gateway/configuration-reference#auth-storage) - clés de configuration d'authentification
