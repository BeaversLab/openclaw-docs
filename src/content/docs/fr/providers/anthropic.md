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

Le bouton partagé `/fast` de OpenClaw prend également en charge le trafic direct avec clé Anthropic de l'API.

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

- Ceci est **uniquement avec une clé API**. L'authentification par setup-token Anthropic / OAuth ne respecte pas l'injection de niveau rapide de OpenClaw.
- OpenClaw n'injecte les niveaux de service Anthropic que pour les demandes `api.anthropic.com` directes. Si vous acheminez `anthropic/*` via un proxy ou une passerelle, `/fast` laisse `service_tier` intact.
- Anthropic indique le niveau effectif dans la réponse sous `usage.service_tier`. Sur les comptes sans capacité de niveau prioritaire, `service_tier: "auto"` peut tout de même résoudre à `standard`.

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

Lors de l'utilisation de l'authentification par clé Anthropic API, OpenClaw applique automatiquement `cacheRetention: "short"` (cache de 5 minutes) pour tous les modèles Anthropic. Vous pouvez remplacer ce paramètre en définissant explicitement `cacheRetention` dans votre configuration.

### Remplacements de cacheRetention par agent

Utilisez les paramètres au niveau du modèle comme base de référence, puis substituez les agents spécifiques via `agents.list[].params`.

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
2. `agents.list[].params` (correspondant à `id`, remplacements par clé)

Cela permet à un agent de conserver un cache à long terme tandis qu'un autre agent sur le même modèle désactive la mise en cache pour éviter les coûts d'écriture sur le trafic sporadique/peu réutilisé.

### Notes sur Bedrock Claude

- Les modèles Claude Anthropic sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le transfert `cacheRetention` lorsqu'ils sont configurés.
- Les modèles Bedrock non Anthropic sont forcés à `cacheRetention: "none"` à l'exécution.
- Les valeurs par défaut intelligentes de la clé API Anthropic amorcent également `cacheRetention: "short"` pour les références de modèle Claude-on-Bedrock lorsqu aucune valeur explicite n'est définie.

### Paramètre hérité

Le paramètre plus ancien `cacheControlTtl` est toujours pris en charge pour la compatibilité descendante :

- `"5m"` correspond à `short`
- `"1h"` correspond à `long`

Nous recommandons de migrer vers le nouveau paramètre `cacheRetention`.

OpenClaw inclut l'indicateur bêta `extended-cache-ttl-2025-04-11` pour les requêtes de l'API Anthropic ; conservez-le si vous remplacez les en-têtes du fournisseur (voir [/gateway/configuration](/en/gateway/configuration)).

## Fenêtre de contexte de 1M (bêta Anthropic)

La fenêtre de contexte de 1M d'Anthropic est en version bêta fermée. Dans OpenClaw, activez-la par modèle
avec `params.context1m: true` pour les modèles Opus/Sonnet pris en charge.

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

OpenClaw mappe ceci à `anthropic-beta: context-1m-2025-08-07` sur les requêtes Anthropic.

Cela ne s'active que lorsque `params.context1m` est explicitement défini sur `true` pour ce modèle.

Condition requise : Anthropic doit autoriser l'utilisation de contexte long sur ces informations d'identification
(généralement la facturation par clé API, ou un compte d'abonnement avec l'Extra Usage
activé). Sinon, Anthropic renvoie :
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Remarque : Anthropic rejette actuellement les requêtes bêta `context-1m-*` lors de l'utilisation de jetons d'abonnement OAuth (`sk-ant-oat-*`). OpenClaw ignore automatiquement l'en-tête bêta context1m pour l'authentification OAuth et conserve les versions bêta OAuth requises.

## Option B : Claude CLI en tant que fournisseur de messages

**Idéal pour :** un hôte de passerelle à utilisateur unique qui dispose déjà du Claude CLI installé
et connecté avec un abonnement Claude.

Ce chemin utilise le binaire local `claude` pour l'inférence de modèle au lieu d'appeler
l'Anthropic API directement. OpenClaw le traite comme un **fournisseur de backend CLI**
avec des références de modèle telles que :

- `claude-cli/claude-sonnet-4-6`
- `claude-cli/claude-opus-4-6`

Fonctionnement :

1. OpenClaw lance `claude -p --output-format json ...` sur l'hôte **passerelle**.
2. Le premier tour envoie `--session-id <uuid>`.
3. Les tours de suite réutilisent la session Claude stockée via `--resume <sessionId>`.
4. Vos messages de chat passent toujours par le pipeline de messages normal d'OpenClaw, mais
   la réponse réelle du model est produite par le CLI de Claude.

### Prérequis

- Claude CLI installé sur l'hôte de la passerelle et disponible dans PATH, ou configuré
  avec un chemin de commande absolu.
- Claude CLI déjà authentifié sur ce même hôte :

```bash
claude auth status
```

- OpenClaw charge automatiquement le plugin Anthropic inclus au démarrage de la passerelle lorsque votre configuration fait explicitement référence à la configuration principale `claude-cli/...` ou `claude-cli`.

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

Si le binaire `claude` n'est pas dans le PATH de l'hôte de passerelle :

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
basculer le même hôte de passerelle vers le CLI de Claude :

```bash
openclaw models auth login --provider anthropic --method cli --set-default
```

Ou dans l'intégration :

```bash
openclaw onboard --auth-choice anthropic-cli
```

Ce que cela fait :

- vérifie que Claude CLI est déjà connecté sur l'hôte de la passerelle
- change le modèle par défaut pour `claude-cli/...`
- réécrit les valeurs de repli du default-model Anthropic comme `anthropic/claude-opus-4-6`
  vers `claude-cli/claude-opus-4-6`
- ajoute des entrées `claude-cli/...` correspondantes à `agents.defaults.models`

Ce qu'il **ne** fait pas :

- supprimez vos profils d'authentification Anthropic existants
- supprimez toute ancienne référence de configuration `anthropic/...` en dehors du chemin principal par défaut
  model/allowlist

Cela simplifie le retour en arrière : remettez le modèle par défaut sur `anthropic/...` si
nécessaire.

### Limites importantes

- Ceci n'est **pas** le fournisseur de l'Anthropic API. C'est le runtime CLI local.
- Les outils sont désactivés du côté d'OpenClaw pour les exécutions backend CLI.
- Texte en entrée, texte en sortie. Pas de transfert de streaming OpenClaw.
- Idéal pour un hôte de passerelle personnel, non pour les configurations de facturation multi-utilisateurs partagées.

Plus de détails : [/gateway/cli-backends](/en/gateway/cli-backends)

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
- Si vous voyez « Échec de l'actualisation du jeton OAuth … » sur un abonnement Claude, réauthentifiez-vous avec un jeton de configuration. Voir [/gateway/troubleshooting](/en/gateway/troubleshooting).
- Les détails d'authentification et les règles de réutilisation se trouvent dans [/concepts/oauth](/en/concepts/oauth).

## Dépannage

**Erreurs 401 / jeton soudainement invalide**

- L'authentification par abonnement Claude peut expirer ou être révoquée. Réexécutez `claude setup-token`
  et collez-le dans l'**hôte de passerelle**.
- Si la connexion Claude CLI se trouve sur une machine différente, utilisez
  `openclaw models auth paste-token --provider anthropic` sur l'hôte de la passerelle.

**Aucune clé API trouvée pour le fournisseur "anthropic"**

- L'authentification est **par agent**. Les nouveaux agents n'héritent pas des clés de l'agent principal.
- Réexécutez l'onboarding pour cet agent, ou collez un setup-token / clé API sur l'hôte de la passerelle, puis vérifiez avec `openclaw models status`.

**Aucune information d'identification trouvée pour le profil `anthropic:default`**

- Exécutez `openclaw models status` pour voir quel profil d'authentification est actif.
- Réexécutez l'onboarding, ou collez un setup-token / clé API pour ce profil.

**Aucun profil d'authentification disponible (tous en période de refroidissement/indisponibles)**

- Vérifiez `openclaw models status --json` pour `auth.unusableProfiles`.
- Ajoutez un autre profil Anthropic ou attendez la fin de la période de refroidissement.

En savoir plus : [/gateway/troubleshooting](/en/gateway/troubleshooting) et [/help/faq](/en/help/faq).
