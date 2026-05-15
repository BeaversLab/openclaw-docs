---
summary: "Référence CLI pour `openclaw models` (status/list/set/scan, aliases, fallbacks, auth)"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "Modèles"
---

# `openclaw models`

Découverte, analyse et configuration de modèles (modèle par défaut, replis, profils d'auth).

Connexes :

- Providers + models : [Modèles](/fr/providers/models)
- Concepts de sélection de modèle + commande slash `/models` : [Concept de modèle](/fr/concepts/models)
- Configuration de l'authentification du provider : [Getting started](/fr/start/getting-started)

## Commandes courantes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` affiche le contenu par défaut/fallback résolu ainsi qu'un aperçu de l'authentification.
Lorsque des instantanés d'utilisation des providers sont disponibles, la section de statut OAuth/clé API comprend
les fenêtres d'utilisation des providers et les instantanés de quota.
Providers actuels à fenêtre d'utilisation : Anthropic, GitHub Copilot, Gemini CLI, OpenAI
Codex, MiniMax, Xiaomi et z.ai. L'authentification d'utilisation provient de hooks spécifiques au provider
lorsqu'ils sont disponibles ; sinon OpenClaw revient à faire correspondre les identifiants
de clé OAuth/clé API
à partir des profils d'authentification, des variables d'environnement ou de la configuration.
Dans la sortie de `--json`, `auth.providers` est l'aperçu du provider
conscient de l'environnement/configuration/store, tandis que `auth.oauth` concerne uniquement la santé du profil de store d'authentification.
Ajoutez `--probe` pour exécuter des sondes d'authentification en direct sur chaque profil de provider configuré.
Les sondes sont de vraies requêtes (elles peuvent consommer des jetons et déclencher des limitations de taux).
Utilisez `--agent <id>` pour inspecter l'état du modèle/de l'authentification d'un agent configuré. Si omis,
la commande utilise `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` si défini, sinon
l'agent par défaut configuré.
Les lignes de sonde peuvent provenir des profils d'authentification, des identifiants d'environnement ou de `models.json`.
Pour le troubleshooting de l'authentification OAuth de Codex, `openclaw models status`,
`openclaw models auth list --provider openai-codex` et
`openclaw config get agents.defaults.model --json` sont le moyen le plus rapide de
confirmer si un agent dispose d'un profil d'authentification `openai-codex` utilisable pour
`openai/*` via le runtime natif Codex. Voir [Configuration du provider OpenAI](/fr/providers/openai#check-and-recover-codex-oauth-routing).

Notes :

- `models set <model-or-alias>` accepte `provider/model` ou un alias.
- `models list` est en lecture seule : il lit la configuration, les profils d'authentification, l'état existant du catalogue et les lignes de catalogue détenues par le fournisseur, mais il ne réécrit pas `models.json`.
- La colonne `Auth` est au niveau du fournisseur et en lecture seule. Elle est calculée à partir des métadonnées locales du profil d'authentification, des marqueurs d'environnement, des clés de fournisseur configurées, des marqueurs de fournisseur local, des marqueurs d'environnement/profil AWS Bedrock et des métadonnées d'authentification synthétique des plugins ; elle ne charge pas le runtime du fournisseur, ne lit pas les secrets du trousseau, n'appelle pas les API du fournisseur et ne prouve pas l'exactitude de l'état de préparation à l'exécution pour chaque modèle.
- `models list --all --provider <id>` peut inclure des lignes de catalogue statique détenues par le fournisseur à partir des manifestes de plugin ou des métadonnées de catalogue de fournisseur groupées, même lorsque vous ne vous êtes pas encore authentifié auprès de ce fournisseur. Ces lignes s'affichent toujours comme indisponibles jusqu'à ce que l'authentification correspondante soit configurée.
- `models list` maintient le plan de contrôle réactif lorsque la découverte du catalogue du fournisseur est lente. Les vues par défaut et configurées reviennent aux lignes de modèle configurées ou synthétiques après une courte attente et permettent à la découverte de se terminer en arrière-plan. Utilisez `--all` lorsque vous avez besoin du catalogue complet découvert exact et que vous êtes prêt à attendre la découverte par le fournisseur.
- Le `models list --all` large fusionne les lignes du catalogue de manifeste sur les lignes du registre sans charger les hooks de supplémentation du runtime du fournisseur. Les chemins rapides de manifeste filtrés par fournisseur utilisent uniquement les fournisseurs marqués `static` ; les fournisseurs marqués `refreshable` restent sauvegardés par le registre/le cache et ajoutent les lignes de manifeste comme suppléments, tandis que les fournisseurs marqués `runtime` restent sur la découverte du registre/runtime.
- `models list` maintient distinctes les métadonnées natives du modèle et les limites d'exécution. Dans la sortie du tableau, `Ctx` affiche `contextTokens/contextWindow` lorsqu'une limite d'exécution effective diffère de la fenêtre de contexte native ; les lignes JSON incluent `contextTokens` lorsqu'un fournisseur expose cette limite.
- `models list --provider <id>` filtre par l'identifiant du provider, tel que `moonshot` ou
  `openai-codex`. Il n'accepte pas les étiquettes d'affichage des sélecteurs
  interactifs de provider, tels que `Moonshot AI`.
- Les références de model sont analysées en divisant sur le **premier** `/`. Si l'identifiant du model inclut `/` (style OpenRouter), incluez le préfixe du provider (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le provider, OpenClaw résout d'abord l'entrée comme un alias, puis
  comme une correspondance unique de provider configuré pour cet identifiant de model exact, et ce n'est qu'alors
  qu'il revient au provider par défaut configuré avec un avertissement de dépréciation.
  Si ce provider n'expose plus le model par défaut configuré, OpenClaw
  revient au premier provider/model configuré au lieu d'afficher un
  défaut par défaut obsolète d'un provider supprimé.
- `models status` peut afficher `marker(<value>)` dans la sortie d'auth pour les espaces réservés non secrets (par exemple `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) au lieu de les masquer comme des secrets.

### Models scan

`models scan` lit le catalogue public `:free` de OpenRouter et classe les candidats pour
une utilisation en secours. Le catalogue lui-même est public, donc les analyses de métadonnées uniquement n'ont pas besoin
d'une clé OpenRouter.

Par défaut, OpenClaw essaie de sonder le support des tool et des images avec des appels de model en direct.
Si aucune clé OpenRouter n'est configurée, la commande revient à une sortie
uniquement de métadonnées et explique que les models `:free` nécessitent toujours `OPENROUTER_API_KEY` pour
les sondages et l'inférence.

Options :

- `--no-probe` (métadonnées uniquement ; aucune recherche de config/secrets)
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>` (délai de requête de catalogue et par sondage)
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` et `--set-image` nécessitent des sondages en direct ; les résultats de l'analyse basée uniquement sur les métadonnées sont informatifs et ne sont pas appliqués à la configuration.

### État des modèles

Options :

- `--json`
- `--plain`
- `--check` (sortie 1=expiré/manquant, 2=en cours d'expiration)
- `--probe` (sondage en direct des profils d'authentification configurés)
- `--probe-provider <name>` (sonder un fournisseur)
- `--probe-profile <id>` (répéter ou ids de profil séparés par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id d'agent configuré ; remplace `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

`--json` garde stdout réservé pour la payload JSON. Les diagnostics de profil d'authentification, de fournisseur et de démarrage sont acheminés vers stderr afin que les scripts peuvent rediriger stdout directement vers des outils tels que `jq`.

Compartiments de statut de sondage :

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

Cas de détails/raison-code de sondage à attendre :

- `excluded_by_auth_order` : un profil stocké existe, mais l'omission explicite de `auth.order.<provider>` l'a exclu, le sondage signale donc l'exclusion au lieu de l'essayer.
- `missing_credential`, `invalid_expires`, `expired`, `unresolved_ref` :
  le profil est présent mais n'est pas éligible/résolvable.
- `no_model`OpenClaw : l'authentification du fournisseur existe, mais OpenClaw n'a pas pu résoudre un candidat de modèle sondable pour ce fournisseur.

## Alias + replis

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Profils d'authentification

```bash
openclaw models auth add
openclaw models auth list [--provider <id>] [--json]
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add`OAuthAPI est l'assistant d'authentification interactif. Il peut lancer un flux d'authentification de provider (OAuth/clé d'API) ou vous guider vers le collage manuel d'un jeton, selon le provider que vous choisissez.

`models auth list`APIOAuth répertorie les profils d'authentification enregistrés pour l'agent sélectionné sans imprimer le jeton, la clé d'API ou le secret OAuth. Utilisez `--provider <id>` pour filtrer par un provider, tel que `openai-codex`, et `--json` pour les scripts.

`models auth login`OAuthAPI exécute le flux d'authentification du plugin du provider (OAuth/clé d'API). Utilisez `openclaw plugins list` pour voir quels providers sont installés. Utilisez `openclaw models auth --agent <id> <subcommand>` pour écrire les résultats d'authentification dans un magasin d'agents configuré spécifique. Le drapeau parent `--agent` est respecté par `add`, `list`, `login`, `setup-token`, `paste-token` et `login-github-copilot`.

Exemples :

```bash
openclaw models auth login --provider openai-codex --set-default
openclaw models auth list --provider openai-codex
```

Notes :

- `setup-token` et `paste-token` restent des commandes de jeton génériques pour les providers qui exposent des méthodes d'authentification par jeton.
- `setup-token` nécessite un TTY interactif et exécute la méthode d'authentification par jeton du provider (par défaut, la méthode `setup-token` de ce provider lorsqu'elle en expose une).
- `paste-token` accepte une chaîne de jeton générée ailleurs ou par l'automatisation.
- `paste-token` nécessite `--provider`, demande la valeur du jeton et l'écrit dans l'ID de profil par défaut `<provider>:manual`, sauf si vous passez `--profile-id`.
- `paste-token --expires-in <duration>` stocke une expiration absolue de jeton à partir d'une durée relative telle que `365d` ou `12h`.
- Note Anthropic : Le personnel d'Anthropic nous a informé que l'utilisation du CLI Claude style OpenClaw est à nouveau autorisée, donc OpenClaw considère la réutilisation du CLI Claude et l'utilisation de AnthropicAnthropicOpenClawCLIOpenClawCLI`claude -p`Anthropic comme étant approuvées pour cette intégration, à moins qu'Anthropic ne publie une nouvelle politique.
- Les Anthropic`setup-token` / `paste-token`OpenClawOpenClawCLI d'Anthropic restent disponibles en tant que chemin de jeton OpenClaw pris en charge, mais OpenClaw préfère désormais la réutilisation du CLI Claude et `claude -p` lorsqu'ils sont disponibles.

## Connexes

- [Référence CLI](CLI/en/cli)
- [Sélection de modèle](/fr/concepts/model-providers)
- [Basculement de modèle](/fr/concepts/model-failover)
