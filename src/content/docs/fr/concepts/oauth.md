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
- **Authentification par abonnement Anthropic au sein d'OpenClaw** : Anthropic a informé les utilisateurs d'OpenClaw
  le **4 avril 2026 à 12:00 PM PT / 8:00 PM BST** que cela nécessite désormais
  **Extra Usage**

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

Tout ce qui précède respecte également `$OPENCLAW_STATE_DIR` (remplacement du répertoire d'état). Référence complète : [/gateway/configuration](/en/gateway/configuration-reference#auth-storage)

Pour les références de secrets statiques et le comportement d'activation des instantanés d'exécution, consultez [Gestion des secrets](/en/gateway/secrets).

## Compatibilité des jetons hérités Anthropic

<Warning>
La documentation publique de Anthropic sur Claude Code indique que l'utilisation directe de Claude Code reste dans les limites de l'abonnement Claude. Par ailleurs, Anthropic a indiqué aux utilisateurs de OpenClaw le
**4 avril 2026 à 12 h 00 PT / 20 h 00 BST** que OpenClaw est considéré comme un
harnais tiers. Les profils de jetons Anthropic existants restent techniquement
utilisables dans OpenClaw, mais Anthropic indique que le chemin OpenClaw nécessite désormais une **Utilisation
supplémentaire** (facturation à l'usage facturée séparément de l'abonnement) pour ce
trafic.

Pour la documentation actuelle du plan direct Claude Code de Anthropic, consultez [Utilisation de Claude Code
avec votre plan Pro ou Max
](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
et [Utilisation de Claude Code avec votre plan d'équipe ou d'entreprise
](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/).

Si vous souhaitez d'autres options de style abonnement dans OpenClaw, consultez [OpenAI
Codex](/en/providers/openai), [Plan de codage cloud Qwen
](/en/providers/qwen), [Plan de codage MiniMax](/en/providers/minimax),
et [Plan de codage Z.AI / GLM](/en/providers/glm).

</Warning>

OpenClaw expose désormais à nouveau le jeton de configuration Anthropic en tant que chemin hérité/manuel.
L'avis de facturation spécifique à Anthropic de OpenClaw s'applique toujours à ce chemin, donc
utilisez-le en sachant que Anthropic exige une **Utilisation supplémentaire** pour
le trafic de connexion Claude piloté par OpenClaw.

## Migration de la Anthropic Claude CLI

Anthropic n'a plus de chemin de migration pris en charge pour la CLI Claude locale dans
OpenClaw. Utilisez les clés Anthropic de l'API pour le trafic Anthropic, ou conservez l'authentification
basée sur des jetons hérités uniquement là où elle est déjà configurée et avec l'attente
que Anthropic considère ce chemin OpenClaw comme une **Utilisation supplémentaire**.

## Échange OAuth (fonctionnement de la connexion)

Les flux de connexion interactifs de OpenClaw sont implémentés dans `@mariozechner/pi-ai` et intégrés aux assistants/ commandes.

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
3. essayer de capturer le callback sur `http://127.0.0.1:1455/auth/callback`
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

- globalement via l'ordre de configuration (`auth.order`)
- par session via `/model ...@<profileId>`

Exemple (remplacement de session) :

- `/model Opus@anthropic:work`

Comment voir quels ID de profil existent :

- `openclaw channels list --json` (affiche `auth[]`)

Documentation connexe :

- [/concepts/model-failover](/en/concepts/model-failover) (règles de rotation + refroidissement)
- [/tools/slash-commands](/en/tools/slash-commands) (surface de commande)

## Connexes

- [Authentification](/en/gateway/authentication) — aperçu de l'auth du fournisseur de modèle
- [Secrets](/en/gateway/secrets) — stockage des informations d'identification et SecretRef
- [Référence de configuration](/en/gateway/configuration-reference#auth-storage) — clés de configuration d'auth
