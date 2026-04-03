---
summary: "Utilisez Anthropic Claude via des clés API, un setup-token ou le Claude CLI dans OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
  - You want setup-token instead of API keys
  - You want to reuse Claude CLI subscription auth on the gateway host
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic développe la famille de modèles **Claude** et fournit un accès via une API.
Dans OpenClaw, vous pouvez vous authentifier avec une clé API ou un **setup-token**.

## Option A : Clé Anthropic API

**Idéal pour :** un accès standard à l'API et une facturation à l'utilisation.
Créez votre clé API dans la console Anthropic.

### Configuration CLI

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Extrait de configuration du Claude CLI

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Valeurs par défaut de réflexion (Claude 4.6)

- Les modèles Anthropic Claude 4.6 sont par défaut en `adaptive` thinking dans OpenClaw si aucun niveau de thinking explicite n'est défini.
- Vous pouvez remplacer par message (`/think:<level>`) ou dans les paramètres du modèle :
  `agents.defaults.models["anthropic/<model>"].params.thinking`.
- Documentation Anthropic connexe :
  - [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Mode rapide (Anthropic API)

Le bouton partagé `/fast` d'OpenClaw prend également en charge le trafic public direct d'Anthropic, y compris les requêtes authentifiées par clé OpenClaw ou Anthropic envoyées à `api.anthropic.com`.

- `/fast on` correspond à `service_tier: "auto"`
- `/fast off` correspond à `service_tier: "standard_only"`
- Par défaut de la configuration :

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-6": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

Limites importantes :

- OpenClaw n'injecte les niveaux de service Anthropic que pour les requêtes `api.anthropic.com` directes. Si vous acheminez `anthropic/*` via un proxy ou une passerelle, `/fast` laisse `service_tier` intact.
- Les paramètres de modèle Anthropic explicites `serviceTier` ou `service_tier` remplacent la valeur par défaut de `/fast` lorsque les deux sont définis.
- Anthropic signale le niveau effectif dans la réponse sous `usage.service_tier`. Sur les comptes sans capacité de niveau prioritaire, `service_tier: "auto"` peut encore correspondre à `standard`.

## Mise en cache des invites (Anthropic API)

OpenClaw prend en charge la fonctionnalité de mise en cache des invites de Anthropic. Ceci est **uniquement API** ; l'authentification par abonnement ne respecte pas les paramètres de cache.

### Configuration

Utilisez le paramètre `cacheRetention` dans votre configuration de modèle :

| Valeur  | Durée du cache | Description                                           |
| ------- | -------------- | ----------------------------------------------------- |
| `none`  | Pas de cache   | Désactiver la mise en cache du prompt                 |
| `short` | 5 minutes      | Valeur par défaut pour l'authentification par clé API |
| `long`  | 1 heure        | Cache étendu (nécessite le marqueur bêta)             |

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" },
        },
      },
    },
  },
}
```

### Valeurs par défaut

Lors de l'utilisation de l'authentification par clé API Anthropic, OpenClaw applique automatiquement `cacheRetention: "short"` (cache de 5 minutes) pour tous les modèles Anthropic. Vous pouvez remplacer cela en définissant explicitement `cacheRetention` dans votre configuration.

### Remplacements de cacheRetention par agent

Utilisez les paramètres au niveau du modèle comme base, puis remplacez pour les agents spécifiques via `agents.list[].params`.

```json5
{
  agents: {
    defaults: {
      model: { primary: "anthropic/claude-opus-4-6" },
      models: {
        "anthropic/claude-opus-4-6": {
          params: { cacheRetention: "long" }, // baseline for most agents
        },
      },
    },
    list: [
      { id: "research", default: true },
      { id: "alerts", params: { cacheRetention: "none" } }, // override for this agent only
    ],
  },
}
```

Ordre de fusion de la configuration pour les paramètres liés au cache :

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (correspondance `id`, remplacement par clé)

Cela permet à un agent de conserver un cache à long terme tandis qu'un autre agent sur le même modèle désactive la mise en cache pour éviter les coûts d'écriture sur le trafic sporadique/peu réutilisé.

### Notes sur Bedrock Claude

- Les modèles Claude d'Anthropic sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le transfert `cacheRetention` lorsqu'ils sont configurés.
- Les modèles Bedrock non-Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.
- Les valeurs par défaut intelligentes de la clé API Anthropic initialisent également `cacheRetention: "short"` pour les références de modèle Claude-on-Bedrock lorsqu'aucune valeur explicite n'est définie.

### Paramètre hérité

L'ancien paramètre `cacheControlTtl` est toujours pris en charge pour la rétrocompatibilité :

- `"5m"` correspond à `short`
- `"1h"` correspond à `long`

Nous recommandons de migrer vers le nouveau paramètre `cacheRetention`.

OpenClaw inclut l'indicateur bêta `extended-cache-ttl-2025-04-11` pour les requêtes Anthropic API ; gardez-le si vous remplacez les en-têtes du fournisseur (voir [/gateway/configuration](/en/gateway/configuration)).

## Fenêtre de contexte de 1M (bêta Anthropic)

La fenêtre de contexte de 1 million de Anthropic est en accès restreint bêta. Dans OpenClaw, activez-la par modèle avec `params.context1m: true` pour les modèles Opus/Sonnet pris en charge.

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-opus-4-6": {
          params: { context1m: true },
        },
      },
    },
  },
}
```

OpenClaw mappe ceci vers `anthropic-beta: context-1m-2025-08-07` dans les requêtes Anthropic.

Ceci ne s'active que lorsque `params.context1m` est explicitement défini sur `true` pour ce modèle.

Condition requise : Anthropic doit autoriser l'utilisation de contexte long pour ces identifiants (généralement la facturation par clé API, ou un compte d'abonnement avec Extra Usage activé). Sinon, Anthropic renvoie : `HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Remarque : Anthropic rejette actuellement les requêtes bêta `context-1m-*` lors de l'utilisation de setup-tokens d'abonnement (`sk-ant-oat-*`). Si vous configurez `context1m: true` avec une authentification par abonnement, OpenClaw enregistre un avertissement et revient à la fenêtre de contexte standard en omettant l'en-tête bêta context1m tout en conservant les versions bêta OAuth requises.

## Option B : Claude CLI en tant que fournisseur de messages

**Idéal pour :** un hôte de passerelle à utilisateur unique qui dispose déjà du Claude CLI installé
et connecté avec un abonnement Claude.

Ce chemin utilise le binaire local `claude` pour l'inférence de modèle au lieu d'appeler directement l'Anthropic API. OpenClaw le traite comme un **fournisseur backend CLI** avec des références de modèle telles que :

- `claude-cli/claude-sonnet-4-6`
- `claude-cli/claude-opus-4-6`

Fonctionnement :

1. OpenClaw lance `claude -p --output-format json ...` sur l'**hôte
   de passerelle**.
2. Le premier tour envoie `--session-id <uuid>`.
3. Les tours suivants réutilisent la session Claude stockée via `--resume <sessionId>`.
4. Vos messages de chat passent toujours par le pipeline de messages normal d'OpenClaw, mais
   la réponse réelle du model est produite par le CLI de Claude.

### Prérequis

- Claude CLI installé sur l'hôte de la passerelle et disponible dans PATH, ou configuré
  avec un chemin de commande absolu.
- Claude CLI déjà authentifié sur ce même hôte :

```bash
claude auth status
```

- OpenClaw charge automatiquement le plugin Anthropic fourni au démarrage de la passerelle lorsque votre configuration fait référence explicitement à `claude-cli/...` ou à la configuration backend `claude-cli`.

### Extrait de configuration

```json5
{
  agents: {
    defaults: {
      model: {
        primary: "claude-cli/claude-sonnet-4-6",
      },
      models: {
        "claude-cli/claude-sonnet-4-6": {},
      },
      sandbox: { mode: "off" },
    },
  },
}
```

Si le binaire `claude` n'est pas dans le PATH de l'hôte de la passerelle :

```json5
{
  agents: {
    defaults: {
      cliBackends: {
        "claude-cli": {
          command: "/opt/homebrew/bin/claude",
        },
      },
    },
  },
}
```

### Ce que vous obtenez

- Authentification par abonnement Claude réutilisée depuis le CLI local
- Routage normal des messages/sessions OpenClaw
- Continuité de session CLI CLI entre les tours

### Migrer depuis l'authentification Anthropic vers le CLI Claude

Si vous utilisez actuellement `anthropic/...` avec un setup-token ou une clé API et que vous souhaitez
basculer le même hôte de passerelle vers le Claude CLI :

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

Ou dans l'intégration :

```bash
openclaw onboard --auth-choice anthropic-cli
```

Ce que cela fait :

- vérifie que Claude CLI est déjà connecté sur l'hôte de la passerelle
- modifie le modèle par défaut pour `claude-cli/...`
- réécrit les valeurs de repli du modèle par défaut Anthropic telles que `anthropic/claude-opus-4-6`
  en `claude-cli/claude-opus-4-6`
- ajoute des entrées `claude-cli/...` correspondantes à `agents.defaults.models`

Ce qu'il **ne** fait pas :

- supprimez vos profils d'authentification Anthropic existants
- supprimez chaque ancienne référence de configuration `anthropic/...` en dehors du chemin principal par défaut
  du modèle/de la liste d'autorisation

Cela simplifie le retour en arrière : remodifiez le modèle par défaut `anthropic/...` si
vous en avez besoin.

### Limites importantes

- Ceci n'est **pas** le fournisseur de l'Anthropic API. C'est le runtime CLI local.
- Les outils sont désactivés du côté d'OpenClaw pour les exécutions backend CLI.
- Texte en entrée, texte en sortie. Pas de transfert de streaming OpenClaw.
- Idéal pour un hôte de passerelle personnel, non pour les configurations de facturation multi-utilisateurs partagées.

Plus de détails : [/gateway/cli-backends](/en/gateway/cli-backends)

## Option C : jeton de configuration Claude

**Idéal pour :** utiliser votre abonnement Claude.

### Où obtenir un jeton de configuration

Les jetons de configuration sont créés par le **Claude Code CLI**, et non par la console Anthropic. Vous pouvez exécuter ceci sur **n'importe quelle machine** :

```bash
claude setup-token
```

Collez le jeton dans OpenClaw (assistant : **jeton Anthropic (paste setup-token)**), ou exécutez-le sur l'hôte de la passerelle :

```bash
openclaw models auth setup-token --provider anthropic
```

Si vous avez généré le jeton sur une autre machine, collez-le :

```bash
openclaw models auth paste-token --provider anthropic
```

### Configuration CLI (setup-token)

```bash
# Paste a setup-token during setup
openclaw onboard --auth-choice setup-token
```

### Extrait de configuration (setup-token)

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Remarques

- Générez le setup-token avec `claude setup-token` et collez-le, ou exécutez `openclaw models auth setup-token` sur l'hôte de la passerelle.
- Si vous voyez « OAuth token refresh failed … » sur un abonnement Claude, réauthentifiez-vous avec un setup-token. Voir [/gateway/troubleshooting](/en/gateway/troubleshooting).
- Les détails de l'authentification + les règles de réutilisation se trouvent dans [/concepts/oauth](/en/concepts/oauth).

## Dépannage

**Erreurs 401 / jeton soudainement invalide**

- L'authentification par abonnement Claude peut expirer ou être révoquée. Réexécutez `claude setup-token`
  et collez-le dans l'**hôte de la passerelle**.
- Si la connexion du Claude CLI se trouve sur une machine différente, utilisez
  `openclaw models auth paste-token --provider anthropic` sur l'hôte de la passerelle.

**Aucune clé API trouvée pour le fournisseur "anthropic"**

- L'authentification est **par agent**. Les nouveaux agents n'héritent pas des clés de l'agent principal.
- Réexécutez l'intégration pour cet agent, ou collez un setup-token / une clé API sur
  l'hôte de la passerelle, puis vérifiez avec `openclaw models status`.

**Aucune information d'identification trouvée pour le profil `anthropic:default`**

- Exécutez `openclaw models status` pour voir quel profil d'authentification est actif.
- Réexécutez l'onboarding, ou collez un setup-token / clé API pour ce profil.

**Aucun profil d'authentification disponible (tous en période de refroidissement/indisponibles)**

- Vérifiez `openclaw models status --json` pour `auth.unusableProfiles`.
- Ajoutez un autre profil Anthropic ou attendez la fin de la période de refroidissement.

Plus : [/gateway/troubleshooting](/en/gateway/troubleshooting) et [/help/faq](/en/help/faq).
