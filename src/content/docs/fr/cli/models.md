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

- Fournisseurs + models : [Modèles](/fr/providers/models)
- Concepts de sélection de model + commande slash `/models` : [Concept de Modèles](/fr/concepts/models)
- Configuration de l'auth du provider : [Getting started](/fr/start/getting-started)

## Commandes courantes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` affiche les valeurs par défaut résolues/les replis ainsi qu'un aperçu de l'authentification.
Lorsque des instantanés d'utilisation du provider sont disponibles, la section de statut OAuth/clé API inclut
les fenêtres d'utilisation du provider et des instantanés de quota.
Providers actuels de la fenêtre d'utilisation : Anthropic, GitHub Copilot, Gemini CLI, OpenAI
Codex, MiniMax, Xiaomi et z.ai. L'authentification d'utilisation provient de hooks spécifiques au provider
lorsqu'ils sont disponibles ; sinon OpenClaw se replie sur les identifiants OAuth/clé API
correspondants provenant des profils d'authentification, de l'environnement ou de la configuration.
Dans la sortie de `--json`, `auth.providers` est l'aperçu du provider
conscient de l'environnement/configuration/stockage, tandis que `auth.oauth` concerne uniquement la santé des profils du stockage d'authentification.
Ajoutez `--probe` pour exécuter des sondes d'authentification en direct sur chaque profil de provider configuré.
Les sondes sont de vraies requêtes (elles peuvent consommer des jetons et déclencher des limites de taux).
Utilisez `--agent <id>` pour inspecter l'état du modèle/de l'authentification d'un agent configuré. S'il est omis,
la commande utilise `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` s'il est défini, sinon l'agent par défaut configuré.
Les lignes de sonde peuvent provenir des profils d'authentification, des identifiants de l'environnement ou de `models.json`.

Notes :

- `models set <model-or-alias>` accepte `provider/model` ou un alias.
- `models list` est en lecture seule : il lit la configuration, les profils d'auth, l'état
  existant du catalogue et les lignes de catalogue détenues par le provider, mais il ne réécrit
  pas `models.json`.
- `models list --all --provider <id>` peut inclure des lignes de catalogue statiques détenues par le provider
  depuis les manifestes de plugin ou les métadonnées de catalogue de provider groupées même lorsque vous
  ne vous êtes pas encore authentifié auprès de ce provider. Ces lignes s'affichent toujours comme
  indisponibles jusqu'à ce que l'auth correspondante soit configurée.
- `models list` distingue les métadonnées natives de model et les plafonds d'exécution. Dans la sortie
  tabulaire, `Ctx` affiche `contextTokens/contextWindow` lorsqu'un plafond d'exécution
  efficace diffère de la fenêtre de contexte native ; les lignes JSON incluent `contextTokens`
  lorsqu'un provider expose ce plafond.
- `models list --provider <id>` filtre par id de provider, tel que `moonshot` ou
  `openai-codex`. Il n'accepte pas les étiquettes d'affichage des sélecteurs de provider
  interactifs, telles que `Moonshot AI`.
- Les références de model sont analysées en séparant sur la **première** `/`. Si l'ID du model inclut `/` (style OpenRouter), incluez le préfixe de provider (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le provider, OpenClaw résout d'abord l'entrée comme un alias, puis
  comme une correspondance unique de provider configuré pour cet id de model exact, et seulement ensuite
  revient au provider par défaut configuré avec un avertissement de dépréciation.
  Si ce provider n'expose plus le model par défaut configuré, OpenClaw
  revient au premier provider/model configuré au lieu de présenter un
  défaut par défaut de provider obsolète.
- `models status` peut afficher `marker(<value>)` dans la sortie d'authentification pour les espaces réservés non secrets (par exemple `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) au lieu de les masquer comme des secrets.

### Analyse des modèles

`models scan` lit le catalogue public de `:free` d'OpenRouter et classe les candidats pour une utilisation en secours. Le catalogue lui-même est public, donc les analyses de métadonnées uniquement ne nécessitent pas de clé OpenRouter.

Par défaut, OpenClaw essaie de sonder la prise en charge des outils et des images avec des appels en direct au modèle. Si aucune clé OpenRouter n'est configurée, la commande revient à une sortie de métadonnées uniquement et explique que les modèles `:free` nécessitent toujours `OPENROUTER_API_KEY` pour les sondages et l'inférence.

Options :

- `--no-probe` (métadonnées uniquement ; aucune recherche de configuration/secrets)
- `--min-params <b>`
- `--max-age-days <days>`
- `--provider <name>`
- `--max-candidates <n>`
- `--timeout <ms>` (délai de demande de catalogue et par sondage)
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
- `--check` (exit 1=expired/missing, 2=expiring)
- `--probe` (sondage en direct des profils d'authentification configurés)
- `--probe-provider <name>` (sonder un fournisseur)
- `--probe-profile <id>` (répéter ou ids de profil séparés par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id d'agent configuré ; remplace `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

Catégories d'état des sondages :

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

Cas de détails/code de raison de sonde à attendre :

- `excluded_by_auth_order` : un profil stocké existe, mais `auth.order.<provider>` l'a omis explicitement,
  donc la sonde signale l'exclusion au lieu de l'essayer.
- `missing_credential`, `invalid_expires`, `expired`, `unresolved_ref` :
  le profil est présent mais n'est pas éligible/résoluble.
- `no_model` : l'authentification du provider existe, mais OpenClaw n'a pas pu résoudre de candidat de
  model sondable pour ce provider.

## Alias + replis

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Profils d'authentification

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` est l'assistant d'authentification interactif. Il peut lancer un flux d'authentification
de provider (OAuth/clé API) ou vous guider vers le collage manuel d'un jeton, selon le
provider que vous choisissez.

`models auth login` exécute le flux d'authentification d'un plugin de provider (OAuth/clé API). Utilisez
`openclaw plugins list` pour voir quels providers sont installés.
Utilisez `openclaw models auth --agent <id> <subcommand>` pour écrire les résultats d'authentification dans un
magasin d'agent configuré spécifique. L'indicateur parent `--agent` est respecté par
`add`, `login`, `setup-token`, `paste-token` et `login-github-copilot`.

Exemples :

```bash
openclaw models auth login --provider openai-codex --set-default
```

Notes :

- `setup-token` et `paste-token` restent des commandes génériques de jeton pour les providers
  qui exposent des méthodes d'authentification par jeton.
- `setup-token` nécessite un TTY interactif et exécute la méthode d'authentification par jeton
  du provider (par défaut, la méthode `setup-token` de ce provider lorsqu'il en expose
  une).
- `paste-token` accepte une chaîne de jeton générée ailleurs ou par l'automatisation.
- `paste-token` nécessite `--provider`, demande la valeur du jeton et l'écrit
  dans l'ID de profil par défaut `<provider>:manual` sauf si vous passez
  `--profile-id`.
- `paste-token --expires-in <duration>` stocke une date d'expiration absolue du jeton à partir d'une durée relative telle que `365d` ou `12h`.
- Remarque d'Anthropic : Le personnel d'Anthropic nous a indiqué que l'utilisation de Claude Anthropic de style OpenClaw est à nouveau autorisée, donc OpenClaw considère la réutilisation de Claude Anthropic et l'utilisation de `claude -p` comme étant approuvées pour cette intégration, sauf si Anthropic publie une nouvelle politique.
- Anthropic `setup-token` / `paste-token` reste disponible en tant que chemin de jeton OpenClaw pris en charge, mais OpenClaw privilégie désormais la réutilisation de Claude Anthropic et `claude -p` lorsqu'ils sont disponibles.

## Connexes

- [Référence CLI](/fr/cli)
- [Sélection de modèle](/fr/concepts/model-providers)
- [Basculement de modèle](/fr/concepts/model-failover)
