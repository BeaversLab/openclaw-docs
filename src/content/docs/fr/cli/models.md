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

- Fournisseurs + modèles : [Modèles](/en/providers/models)
- Configuration de l'authentification du fournisseur : [Getting started](/en/start/getting-started)

## Commandes courantes

```bash
openclaw models status
openclaw models list
openclaw models set <model-or-alias>
openclaw models scan
```

`openclaw models status` affiche les valeurs par défaut résolues/les replis ainsi qu'un aperçu de l'auth.
Lorsque des instantanés d'utilisation du fournisseur sont disponibles, la section de statut OAuth/clé API inclut
les fenêtres d'utilisation du fournisseur et des instantanés de quota.
Fournisseurs de fenêtres d'utilisation actuels : Anthropic, GitHub Copilot, Gemini CLI, OpenAI
Codex, MiniMax, Xiaomi et z.ai. L'auth d'utilisation provient de hooks spécifiques au fournisseur
lorsqu'ils sont disponibles ; sinon OpenClaw revient à la correspondance des identifiants OAuth/clé API
à partir des profils d'auth, de l'env ou de la config.
Dans la sortie `--json`, `auth.providers` est l'aperçu du fournisseur conscient de l'env/config/store,
tandis que `auth.oauth` est uniquement la santé du profil du magasin d'auth.
Ajoutez `--probe` pour exécuter des sondes d'auth en direct sur chaque profil de fournisseur configuré.
Les sondes sont de vraies requêtes (peuvent consommer des jetons et déclencher des limitations de débit).
Utilisez `--agent <id>` pour inspecter l'état du modèle/auth d'un agent configuré. S'il est omis,
la commande utilise `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR` si défini, sinon l'agent
défaut configuré.
Les lignes de sonde peuvent provenir des profils d'auth, des identifiants d'env ou de `models.json`.

Remarques :

- `models set <model-or-alias>` accepte `provider/model` ou un alias.
- Les références de modèle sont analysées en séparant sur le **premier** `/`. Si l'ID du modèle inclut `/` (style OpenRouter), incluez le préfixe du fournisseur (exemple : `openrouter/moonshotai/kimi-k2`).
- Si vous omettez le fournisseur, OpenClaw résout d'abord l'entrée comme un alias, puis
  comme une correspondance unique de fournisseur configuré pour cet ID de modèle exact, et seulement ensuite
  revient au fournisseur par défaut configuré avec un avertissement de dépréciation.
  Si ce fournisseur n'expose plus le modèle par défaut configuré, OpenClaw
  revient au premier fournisseur/modèle configuré au lieu d'afficher un
  défaut de fournisseur obsolète.
- `models status` peut afficher `marker(<value>)` dans la sortie d'auth pour les espaces réservés non secrets (par exemple `OPENAI_API_KEY`, `secretref-managed`, `minimax-oauth`, `oauth:chutes`, `ollama-local`) au lieu de les masquer comme des secrets.

### `models status`

Options :

- `--json`
- `--plain`
- `--check` (exit 1=expiré/manquant, 2=expirant)
- `--probe` (sonde en direct des profils d'auth configurés)
- `--probe-provider <name>` (sonder un provider)
- `--probe-profile <id>` (répéter ou ids de profil séparés par des virgules)
- `--probe-timeout <ms>`
- `--probe-concurrency <n>`
- `--probe-max-tokens <n>`
- `--agent <id>` (id d'agent configuré ; remplace `OPENCLAW_AGENT_DIR`/`PI_CODING_AGENT_DIR`)

Catégories de statut de sonde :

- `ok`
- `auth`
- `rate_limit`
- `billing`
- `timeout`
- `format`
- `unknown`
- `no_model`

Cas de détails/codes de raison de sonde à attendre :

- `excluded_by_auth_order` : un profil stocké existe, mais l'exclusion explicite
  `auth.order.<provider>` l'a omis, donc la sonde signale l'exclusion au lieu de
  l'essayer.
- `missing_credential`, `invalid_expires`, `expired`, `unresolved_ref` :
  le profil est présent mais n'est pas éligible/résolvable.
- `no_model` : l'auth du provider existe, mais OpenClaw n'a pas pu résoudre un candidat de model sondeable
  pour ce provider.

## Alias + replis

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

`models auth add` est l'assistant d'auth interactif. Il peut lancer un flux d'auth de provider
(OAuth/clé API) ou vous guider vers le collage manuel de jeton, selon le
provider que vous choisissez.

`models auth login` exécute le flux d'auth d'un plugin de provider (OAuth/clé API). Utilisez
`openclaw plugins list` pour voir quels providers sont installés.

Exemples :

```bash
openclaw models auth login --provider openai-codex --set-default
```

Notes :

- `setup-token` et `paste-token` restent des commandes de token génériques pour les providers
  qui exposent des méthodes d'auth par token.
- `setup-token` nécessite un TTY interactif et exécute la méthode token-auth
  du provider (par défaut, la méthode `setup-token` de ce provider lorsqu'il en expose
  une).
- `paste-token` accepte une chaîne de token générée ailleurs ou par automatisation.
- `paste-token` nécessite `--provider`, demande la valeur du token et l'écrit
  dans l'id de profil par défaut `<provider>:manual`, sauf si vous passez
  `--profile-id`.
- `paste-token --expires-in <duration>` stocke une expiration absolue du token à partir d'une
  durée relative telle que `365d` ou `12h`.
- Remarque d'Anthropic : Le personnel d'Anthropic nous a informé que l'utilisation de la CLI Claude de style OpenClaw est à nouveau autorisée, donc OpenClaw considère la réutilisation de la CLI Claude et l'utilisation de `claude -p` comme étant approuvées pour cette intégration, sauf si Anthropic publie une nouvelle politique.
- Les `setup-token` / `paste-token` d'Anthropic restent disponibles en tant que chemin de jeton OpenClaw pris en charge, mais OpenClaw privilégie désormais la réutilisation de la CLI Claude et `claude -p` lorsqu'ils sont disponibles.
