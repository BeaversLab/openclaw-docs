---
summary: "Utilisez Claude Anthropic via des clés API ou un setup-token dans OpenClaw"
read_when:
  - Vous souhaitez utiliser des modèles Anthropic dans OpenClaw
  - Vous souhaitez un setup-token au lieu de clés API
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic développe la famille de modèles **Claude** et fournit un accès via une API.
Dans OpenClaw, vous pouvez vous authentifier avec une clé API ou un **setup-token**.

## Option A : Clé Anthropic API

**Idéal pour :** l'accès standard API et la facturation à l'utilisation.
Créez votre clé API dans la console Anthropic.

### Configuration CLI

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Extrait de configuration

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Valeurs par défaut de réflexion (Claude 4.6)

- Les modèles Claude 4.6 de Anthropic utilisent par défaut la réflexion `adaptive` dans OpenClaw lorsqu'aucun niveau de réflexion explicite n'est défini.
- Vous pouvez remplacer par message (`/think:<level>`) ou dans les paramètres du modèle :
  `agents.defaults.models["anthropic/<model>"].params.thinking`.
- Documentation Anthropic connexe :
  - [Réflexion adaptative](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Réflexion étendue](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Mode rapide (Anthropic API)

Le bouton partagé `/fast` de OpenClaw prend également en charge le trafic direct par clé Anthropic API.

- `/fast on` correspond à `service_tier: "auto"`
- `/fast off` correspond à `service_tier: "standard_only"`
- Par défaut de la configuration :

```json5
{
  agents: {
    defaults: {
      models: {
        "anthropic/claude-sonnet-4-5": {
          params: { fastMode: true },
        },
      },
    },
  },
}
```

Limites importantes :

- Ceci est **uniquement pour clé API**. L'authentification par setup-token / Anthropic OAuth ne respecte pas l'injection de niveau mode rapide de OpenClaw.
- OpenClaw n'injecte les niveaux de service Anthropic que pour les requêtes `api.anthropic.com` directes. Si vous acheminez `anthropic/*` via un proxy ou une passerelle, `/fast` laisse `service_tier` intact.
- Anthropic signale le niveau effectif dans la réponse sous `usage.service_tier`. Sur les comptes sans capacité Priority Tier, `service_tier: "auto"` peut toujours résoudre à `standard`.

## Mise en cache du prompt (Anthropic API)

OpenClaw prend en charge la fonction de mise en cache du prompt de Anthropic. Il s'agit d'une fonctionnalité **API uniquement** ; l'authentification par abonnement ne respecte pas les paramètres de cache.

### Configuration

Utilisez le paramètre `cacheRetention` dans votre configuration de modèle :

| Valeur   | Durée du cache | Description                         |
| ------- | -------------- | ----------------------------------- |
| `none`  | Aucun cache     | Désactiver la mise en cache du prompt              |
| `short` | 5 minutes      | Par défaut pour l'authentification par clé API            |
| `long`  | 1 heure         | Cache étendu (nécessite un indicateur bêta) |

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

Lorsque vous utilisez l'authentification par clé Anthropic API, OpenClaw applique automatiquement `cacheRetention: "short"` (cache de 5 minutes) pour tous les modèles Anthropic. Vous pouvez remplacer ce paramètre en définissant explicitement `cacheRetention` dans votre configuration.

### Remplacements de cacheRetention par agent

Utilisez les paramètres au niveau du modèle comme base de référence, puis remplacez les agents spécifiques via `agents.list[].params`.

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
2. `agents.list[].params` (correspondance `id`, remplacements par clé)

Cela permet à un agent de conserver un cache à long terme tandis qu'un autre agent sur le même modèle désactive la mise en cache pour éviter les coûts d'écriture sur le trafic par rafales/à faible réutilisation.

### Notes Bedrock Claude

- Les modèles Claude Anthropic sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le transfert `cacheRetention` lorsqu'ils sont configurés.
- Les modèles Bedrock non-Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.
- Les valeurs par défaut intelligentes de clé Anthropic API définissent également `cacheRetention: "short"` pour les références de modèle Claude-on-Bedrock lorsqu'aucune valeur explicite n'est définie.

### Paramètre hérité

L'ancien paramètre `cacheControlTtl` est toujours pris en charge pour la rétrocompatibilité :

- `"5m"` correspond à `short`
- `"1h"` correspond à `long`

Nous recommandons de migrer vers le nouveau paramètre `cacheRetention`.

OpenClaw inclut l'indicateur bêta `extended-cache-ttl-2025-04-11` pour les requêtes Anthropic API ; conservez-le si vous remplacez les en-têtes du fournisseur (voir [/gateway/configuration](/fr/gateway/configuration)).

## Fenêtre de contexte de 1 M (bêta Anthropic)

La fenêtre de contexte de 1 M de Anthropic est en accès restreint bêta. Dans OpenClaw, activez-la par modèle avec `params.context1m: true` pour les modèles Opus/Sonnet pris en charge.

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

OpenClaw mappe ceci vers `anthropic-beta: context-1m-2025-08-07` sur les requêtes Anthropic.

Cela ne s'active que lorsque `params.context1m` est explicitement défini sur `true` pour ce modèle.

Exigence : Anthropic doit autoriser l'utilisation de long contexte sur ces informations d'identification
(généralement la facturation par clé API, ou un compte abonné avec Extra Usage
activé). Sinon, Anthropic renvoie :
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Remarque : Anthropic rejette actuellement les requêtes bêta `context-1m-*` lors de l'utilisation
de jetons d'abonnement OAuth (`sk-ant-oat-*`). OpenClaw ignore automatiquement
l'en-tête bêta context1m pour l'auth OAuth et conserve les bêtas OAuth requises.

## Option B : Jeton de configuration Claude

**Idéal pour :** utiliser votre abonnement Claude.

### Où obtenir un jeton de configuration

Les jetons de configuration sont créés par la **Claude Code CLI**, et non la console Anthropic. Vous pouvez exécuter ceci sur **n'importe quelle machine** :

```bash
claude setup-token
```

Collez le jeton dans OpenClaw (assistant : **Jeton Anthropic (coller le jeton de configuration)**), ou exécutez-le sur l'hôte de la passerelle :

```bash
openclaw models auth setup-token --provider anthropic
```

Si vous avez généré le jeton sur une autre machine, collez-le :

```bash
openclaw models auth paste-token --provider anthropic
```

### Configuration CLI (jeton de configuration)

```bash
# Paste a setup-token during setup
openclaw onboard --auth-choice setup-token
```

### Extrait de configuration (jeton de configuration)

```json5
{
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Notes

- Générez le jeton de configuration avec `claude setup-token` et collez-le, ou exécutez `openclaw models auth setup-token` sur l'hôte de la passerelle.
- Si vous voyez « Échec de l'actualisation du jeton OAuth … » sur un abonnement Claude, authentifiez-vous à nouveau avec un jeton de configuration. Voir [/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription](/fr/gateway/troubleshooting#oauth-token-refresh-failed-anthropic-claude-subscription).
- Les détails d'authentification et les règles de réutilisation se trouvent dans [/concepts/oauth](/fr/concepts/oauth).

## Dépannage

**Erreurs 401 / jeton soudainement invalide**

- L'authentification par abonnement Claude peut expirer ou être révoquée. Réexécutez `claude setup-token`
  et collez-le dans l'**hôte de la passerelle**.
- Si la connexion Claude CLI réside sur une autre machine, utilisez
  `openclaw models auth paste-token --provider anthropic` sur l'hôte de la passerelle.

**Aucune clé API trouvée pour le fournisseur "anthropic"**

- L'authentification est **par agent**. Les nouveaux agents n'héritent pas des clés de l'agent principal.
- Réexécutez l'intégration pour cet agent, ou collez un jeton de configuration / clé API sur l'
  hôte de la passerelle, puis vérifiez avec `openclaw models status`.

**Aucune information d'identification trouvée pour le profil `anthropic:default`**

- Exécutez `openclaw models status` pour voir quel profil d'authentification est actif.
- Réexécutez l'intégration, ou collez un jeton de configuration / clé API pour ce profil.

**Aucun profil d'authentification disponible (tous en refroidissement/indisponible)**

- Vérifiez `openclaw models status --json` pour `auth.unusableProfiles`.
- Ajoutez un autre profil Anthropic ou attendez la fin du refroidissement.

Plus : [/gateway/troubleshooting](/fr/gateway/troubleshooting) et [/help/faq](/fr/help/faq).

import en from "/components/footer/en.mdx";

<en />
