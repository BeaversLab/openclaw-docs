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

- Providers + models : [Models](/fr/providers/models)
- Concepts de sélection de modèle + commande slash `/models` : [Models concept](/fr/concepts/models)
- Configuration de l'authentification du provider : [Getting started](/fr/start/getting-started)

## Commandes courantes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` affiche les valeurs par défaut résolues/secours ainsi qu'une vue d'ensemble de l'authentification.
Lorsque des instantanés d'utilisation du provider sont disponibles, la section de statut OAuth/clé OAuthAPI comprend
les fenêtres d'utilisation du provider et des instantanés de quota.
Providers actuels avec fenêtre d'utilisation : Anthropic, GitHub Copilot, Gemini CLI, OpenAI
Codex, MiniMax, Xiaomi et z.ai. L'authentification d'utilisation provient de hooks spécifiques au provider
lorsqu'ils sont disponibles ; sinon OpenClawOAuth revient à faire correspondre les identifiants
OAuth/clé API à partir des profils d'authentification, de l'environnement ou de la configuration.
Dans la sortie de `--json`, `auth.providers` est la vue d'ensemble du provider
consciente de l'environnement/configuration/stockage, tandis que `auth.oauth` concerne uniquement la santé du profil de stockage d'authentification.
Ajoutez `--probe` pour exécuter des sondages d'authentification en direct sur chaque profil de provider configuré.
Les sondages sont de vraies requêtes (peuvent consommer des jetons et déclencher des limites de taux).
Utilisez `--agent <id>` pour inspecter l'état du modèle/d'authentification d'un agent configuré. Si omis,
la commande utilise `OPENCLAW_AGENT_DIR` si défini, sinon
l'agent par défaut configuré.
Les lignes de sondage peuvent provenir des profils d'authentification, des identifiants de l'environnement ou de `models.json`OAuth.
Pour le dépannage OAuth de Codex, `openclaw models status`,
`openclaw models auth list --provider openai-codex` et
`openclaw config get agents.defaults.model --json` sont le moyen le plus rapide de
confirmer si un agent dispose d'un profil d'authentification `openai-codex` utilisable pour
`openai/*` via le runtime natif Codex. Voir [Configuration du provider OpenAI](/fr/providers/openai#check-and-recover-codex-oauth-routing).

Notes :

- `models set <model-or-alias>` accepte `provider/model` ou un alias.
- `models list` est en lecture seule : il lit la configuration, les profils d'authentification, l'état existant du catalogue et les lignes de catalogue possédées par les providers, mais il ne réécrit pas `models.json`.
- La colonne `Auth` est au niveau du provider et en lecture seule. Elle est calculée à partir des métadonnées du profil d'authentification local, des marqueurs d'environnement, des clés de provider configurées, des marqueurs de provider local, des marqueurs d'environnement/profil AWS Bedrock et des métadonnées d'authentification synthétique des plugins ; elle ne charge pas le runtime du provider, ne lit pas les secrets du trousseau, n'appelle pas les API des providers et ne prouve pas la disponibilité exacte de l'exécution pour chaque modèle.
- `models list --all --provider <id>` peut inclure des lignes de catalogue statique possédées par des provenant de manifestes de plugin ou de métadonnées de catalogue de provider groupées, même si vous ne vous êtes pas encore authentifié auprès de ce provider. Ces lignes s'affichent toujours comme indisponibles jusqu'à ce que l'authentification correspondante soit configurée.
- `models list` garde le plan de contrôle réactif pendant que la découverte du catalogue du provider est lente. Les vues par défaut et configurées reviennent aux lignes de modèle configurées ou synthétiques après une courte attente et laissent la découverte se terminer en arrière-plan. Utilisez `--all` lorsque vous avez besoin du catalogue complet découvert exact et que vous êtes prêt à attendre la découverte du provider.
- Le `models list --all` large fusionne les lignes de catalogue de manifeste par-dessus les lignes de registre sans charger les crochets de complément de runtime du provider. Les chemins rapides de manifeste filtrés par provider utilisent uniquement les providers marqués `static` ; les providers marqués `refreshable` restent basés sur le registre/le cache et ajoutent les lignes de manifeste comme suppléments, tandis que les providers marqués `runtime` restent sur la découverte de registre/runtime.
- `models list` distingue les métadonnées natives des modèles et les limites d'exécution (runtime caps). Dans la sortie de tableau, `Ctx` affiche `contextTokens/contextWindow` lorsqu'une limite d'exécution effective diffère de la fenêtre de contexte native ; les lignes JSON incluent `contextTokens` lorsqu'un provider expose cette limite.
- `models list --provider <id>` filtre par identifiant de provider, tel que `moonshot` ou `openai-codex`. Il n'accepte pas les libellés d'affichage des sélecteurs de provider interactifs, tels que `Moonshot AI`.
- Les références de modèle sont analysées en divisant sur la **première** `/`. Si l'ID du modèle inclut `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le provider, OpenClaw résout d'abord l'entrée comme un alias, puis
  comme une correspondance unique de provider configuré pour cet identifiant de model exact, et ce n'est qu'alors
  qu'il revient au provider par défaut configuré avec un avertissement de dépréciation.
  Si ce provider n'expose plus le model par défaut configuré, OpenClaw
  revient au premier provider/model configuré au lieu d'afficher un
  défaut par défaut obsolète d'un provider supprimé.
- `models status` peut afficher `marker(<value>)` dans la sortie d'authentification pour les espaces réservés non secrets (par exemple `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) au lieu de les masquer comme des secrets.

### Models scan

`models scan` lit le catalogue public `:free` de OpenRouter et classe les candidats pour une utilisation en secours. Le catalogue lui-même est public, les analyses de métadonnées uniquement n'ont donc pas besoin d'une clé OpenRouter.

Par défaut, OpenClaw essaie de sonder la prise en charge des outils et des images avec des appels en direct au modèle. Si aucune clé OpenRouter n'est configurée, la commande revient à une sortie contenant uniquement des métadonnées et explique que les modèles `:free` nécessitent toujours `OPENROUTER_API_KEY` pour les sondages et l'inférence.

Options :

- `--no-probe` (métadonnées uniquement ; aucune recherche de configuration/secrets)
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>` (délai de demande de catalogue et délai par sondage)
- `--concurrency <n>`
- `--yes`
- `--no-input`
- `--set-default`
- `--set-image`
- `--json`

`--set-default` et `--set-image` nécessitent des sondages en direct ; les résultats d'analyse de métadonnées uniquement sont informatifs et ne sont pas appliqués à la configuration.

### État des modèles

Options :

- `--json`
- `--plain`
- `--check` (exit 1=expiré/manquant, 2=en cours d'expiration)
- `--probe` (sondage en direct des profils d'authentification configurés)
- `--probe-provider <name>` (sonder un fournisseur)
- `--probe-profile <id>` (répéter ou ids de profil séparés par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id d'agent configuré ; remplace `OPENCLAW_AGENT_DIR`)

`--json` garde stdout réservé pour la charge utile JSON. Les diagnostics de profil d'auth, de provider et de démarrage sont acheminés vers stderr afin que les scripts peuvent rediriger stdout directement vers des outils tels que `jq`.

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

- `excluded_by_auth_order` : un profil enregistré existe, mais `auth.order.<provider>` explicite l'a omis, donc la sonde signale l'exclusion au lieu de l'essayer.
- `missing_credential` , `invalid_expires` , `expired` , `unresolved_ref` :
  le profil est présent mais n'est pas éligible/résolvable.
- `no_model` : l'auth du provider existe, mais OpenClaw n'a pas pu résoudre de candidat de modèle sondeable pour ce provider.

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
openclaw models auth login --provider openai --profile-id openai:work
openclaw models auth paste-api-key --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` est l'assistant d'auth interactif. Il peut lancer un flux d'auth de provider (OAuth /clé API ) ou vous guider vers un collage manuel de jeton, selon le provider que vous choisissez.

`models auth list` liste les profils d'auth enregistrés pour l'agent sélectionné sans imprimer de jeton, de clé API ou de matériel secret OAuth. Utilisez `--provider <id>` pour filtrer par un provider, tel que `openai-codex` , et `--json` pour les scripts.

`models auth login` exécute le flux d'authentification du plugin de provider (OAuth/clé API). Utilisez
`openclaw plugins list` pour voir quels providers sont installés.
Utilisez `openclaw models auth --agent <id> <subcommand>` pour écrire les résultats d'authentification dans un
magasin d'agent configuré spécifique. L'indicateur parent `--agent` est respecté par
`add`, `list`, `login`, `paste-api-key`, `setup-token`, `paste-token`, et
`login-github-copilot`.

Pour les modèles OpenAI, `--provider openai` utilise par défaut la connexion au compte ChatGPT/Codex.
Utilisez `--method api-key` uniquement lorsque vous souhaitez ajouter un profil de clé OpenAI API,
généralement comme sauvegarde pour les limites d'abonnement Codex. L'orthographe
historique `--provider openai-codex` fonctionne toujours pour les scripts existants.

Exemples :

```bash
openclaw models auth login --provider openai --set-default
openclaw models auth login --provider openai --method api-key
openclaw models auth paste-api-key --provider openai-codex
openclaw models auth list --provider openai
```

Notes :

- `login` accepte `--profile-id <id>` pour les providers qui prennent en charge les
  profils nommés lors de la connexion. Utilisez ceci pour garder plusieurs connexions pour le même
  provider séparées.
- `paste-api-key` accepte les clés API générées ailleurs, demande la valeur
  de la clé et l'écrit dans l'ID de profil par défaut `<provider>:manual`, sauf si vous
  passez `--profile-id`. Dans l'automatisation, envoyez la clé via stdin, par exemple
  `printf "%s\n" "$OPENAI_API_KEY" | openclaw models auth paste-api-key --provider openai-codex`.
- `setup-token` et `paste-token` restent des commandes de token génériques pour les providers
  qui exposent des méthodes d'authentification par token.
- `setup-token` nécessite un TTY interactif et exécute la méthode token-auth
  du provider (par défaut, la méthode `setup-token` de ce provider lorsqu'il en expose
  une).
- `paste-token` accepte une chaîne de token générée ailleurs ou via l'automatisation.
- `paste-token` nécessite `--provider`, demande la valeur du jeton par défaut,
  et l'écrit dans l'ID de profil par défaut `<provider>:manual` à moins que vous ne passiez
  `--profile-id`.
- Dans le cadre de l'automatisation, transmettez le jeton via stdin au lieu de le passer en argument pour que
  les informations d'identification du provider n'apparaissent pas dans l'historique du shell ou les listes de processus.
- `paste-token --expires-in <duration>` stocke une expiration absolue du jeton à partir d'une
  durée relative telle que `365d` ou `12h`.
- Pour `openai-codex`, les clés d'API OpenAIAPI et les éléments de jeton ChatGPT/OAuth sont des formes d'authentification différentes. Utilisez `paste-api-key``sk-...` pour les clés d'API OpenAI API et `paste-token` uniquement pour les éléments d'authentification par jeton.
- Remarque Anthropic : le personnel de Anthropic nous a informés que l'utilisation du OpenClaw Claude de style CLI est à nouveau autorisée, donc OpenClaw considère la réutilisation du CLI Claude et l'utilisation de `claude -p` comme étant sanctionnées pour cette intégration, à moins que Anthropic ne publie une nouvelle politique.
- Anthropic Anthropic`setup-token` / `paste-token`OpenClawOpenClawCLI restent disponibles en tant que chemin de jeton OpenClaw pris en charge, mais OpenClaw préfère désormais la réutilisation du Claude CLI et `claude -p` lorsqu'ils sont disponibles.

## Connexes

- [Référence CLI](CLI/en/cli)
- [Sélection de modèle](/fr/concepts/model-providers)
- [Basculement de modèle](/fr/concepts/model-failover)
