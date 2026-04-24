---
summary: "Référence CLI pour `openclaw models` (status/list/set/scan, aliases, fallbacks, auth)"
read_when:
  - You want to change default models or view provider auth status
  - You want to scan available models/providers and debug auth profiles
title: "models"
---

# `openclaw models`

Découverte, analyse et configuration de modèles (modèle par défaut, replis, profils d'auth).

Connexes :

- Providers + models : [Modèles](/fr/providers/models)
- Concepts de sélection de modèle + commande slash `/models` : [Concepts de modèles](/fr/concepts/models)
- Configuration de l'authentification du provider : [Getting started](/fr/start/getting-started)

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
- `models list --all` inclut les lignes de catalogue statique appartenant au provider et groupées même
  lorsque vous ne vous êtes pas encore authentifié auprès de ce provider. Ces lignes s'affichent
  toujours comme indisponibles jusqu'à ce qu'une authentification correspondante soit configurée.
- `models list --provider <id>` filtre par l'id du provider, tel que `moonshot` ou
  `openai-codex`. Il n'accepte pas les étiquettes d'affichage des sélecteurs de provider
  interactifs, telles que `Moonshot AI`.
- Les références de modèle sont analysées en divisant sur le **premier** `/`. Si l'ID du modèle inclut `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw résout d'abord l'entrée comme un alias, puis
  comme une correspondance unique de fournisseur configuré pour cet ID de modèle exact, et ensuite seulement
  revient au fournisseur par défaut configuré avec un avertissement d'obsolescence.
  Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw
  revient au premier fournisseur/modèle configuré au lieu d'afficher un
  défaut obsolète de fournisseur supprimé.
- `models status` peut afficher `marker(<value>)` dans la sortie d'authentification pour les espaces réservés non secrets (par exemple `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) au lieu de les masquer comme des secrets.

### `models status`

Options :

- `--json`
- `--plain`
- `--check` (exit 1=expired/missing, 2=expiring)
- `--probe` (sonde en direct des profils d'authentification configurés)
- `--probe-provider <name>` (sonder un fournisseur)
- `--probe-profile <id>` (répéter ou ids de profil séparés par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id d'agent configuré ; remplace `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

Compartiments de statut de sonde :

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

Cas de détail/code de raison de sonde à attendre :

- `excluded_by_auth_order` : un profil stocké existe, mais `auth.order.<provider>` explicite l'a omis, donc la sonde signale l'exclusion au lieu de
  l'essayer.
- `missing_credential`, `invalid_expires`, `expired`, `unresolved_ref`:
  le profil est présent mais n'est pas éligible ou résolvable.
- `no_model` : l'auth du provider existe, mais OpenClaw n'a pas pu résoudre de candidat de model
  testable pour ce provider.

## Alias + solutions de repli

```bash
openclaw models aliases list
openclaw models fallbacks list
```

## Profils d'auth

```bash
openclaw models auth add
openclaw models auth login --provider <id>
openclaw models auth setup-token --provider <id>
openclaw models auth paste-token
```

`models auth add` est l'assistant d'auth interactif. Il peut lancer un flux d'auth de
provider (OAuth/clé API) ou vous guider vers le collage manuel d'un jeton, selon le
provider que vous choisissez.

`models auth login` exécute le flux d'auth du plugin de provider (OAuth/clé
API). Utilisez `openclaw plugins list` pour voir quels providers sont installés.

Exemples :

```bash
openclaw models auth login --provider openai-codex --set-default
```

Notes :

- `setup-token` et `paste-token` restent des commandes génériques de jeton pour les providers
  qui exposent des méthodes d'auth par jeton.
- `setup-token` nécessite un TTY interactif et exécute la méthode d'auth par jeton
  du provider (par défaut, la méthode `setup-token` de ce provider lorsqu'il en
  expose une).
- `paste-token` accepte une chaîne de jeton générée ailleurs ou par l'automatisation.
- `paste-token` nécessite `--provider`, demande la valeur du jeton et l'écrit
  dans l'id de profil par défaut `<provider>:manual` sauf si vous passez
  `--profile-id`.
- `paste-token --expires-in <duration>` stocke une expiration absolue de jeton à partir d'une
  durée relative telle que `365d` ou `12h`.
- Note Anthropic : le personnel de Anthropic nous a indiqué que l'utilisation du Claude OpenClaw de type CLI est à nouveau autorisée, donc OpenClaw considère la réutilisation du Claude CLI et l'utilisation de `claude -p` comme approuvées pour cette intégration, sauf si Anthropic publie une nouvelle politique.
- Les `setup-token` / `paste-token` de Anthropic restent disponibles en tant que chemin de jeton pris en charge par OpenClaw, mais OpenClaw privilégie désormais la réutilisation du Claude CLI et `claude -p` lorsqu'ils sont disponibles.
