---
summary: "Utilisez Claude Anthropic via des clés API ou le Claude CLI dans OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic développe la famille de modèles **Claude** et fournit un accès via une API et
le Claude CLI. Dans OpenClaw, les clés Anthropic API et la réutilisation du Claude CLI sont tous deux
pris en charge. Les profils de jetons Anthropic existants sont toujours honorés au
moment de l'exécution s'ils sont déjà configurés.

<Warning>
Le personnel de Anthropic nous a informés que l'utilisation du Claude OpenClaw de style CLI est à nouveau autorisée, donc
OpenClaw considère la réutilisation du Claude CLI et l'utilisation de `claude -p` comme étant sanctionnées pour cette
intégration, sauf si Anthropic publie une nouvelle politique.

Pour les hôtes de passerelle à longue durée de vie, les clés Anthropic API constituent toujours le chemin de production
le plus clair et le plus prévisible. Si vous utilisez déjà le Claude CLI sur l'hôte,
OpenClaw peut réutiliser directement cette connexion.

La documentation publique actuelle de Anthropic :

- [Référence du Claude Code CLI](https://code.claude.com/docs/en/cli-reference)
- [Aperçu du SDK Agent Claude](https://platform.claude.com/docs/en/agent-sdk/overview)

- [Utiliser Claude Code avec votre formule Pro ou Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Utiliser Claude Code avec votre formule Team ou Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

Si vous souhaitez le chemin de facturation le plus clair, utilisez plutôt une clé Anthropic API.
OpenClaw prend également en charge d'autres options de type abonnement, notamment [OpenAI
Codex](/en/providers/openai), [Forfait de codage Cloud Qwen](/en/providers/qwen),
[Forfait de codage MiniMax](/en/providers/minimax) et [Forfait de codage
Z.AI / GLM](/en/providers/glm).

</Warning>

## Option A : clé Anthropic API

**Idéal pour :** l'accès standard à l'API et la facturation à l'usage.
Créez votre clé API dans la console Anthropic.

### Configuration CLI

```bash
openclaw onboard
# choose: Anthropic API key

# or non-interactive
openclaw onboard --anthropic-api-key "$ANTHROPIC_API_KEY"
```

### Extrait de configuration Anthropic

```json5
{
  env: { ANTHROPIC_API_KEY: "sk-ant-..." },
  agents: { defaults: { model: { primary: "anthropic/claude-opus-4-6" } } },
}
```

## Valeurs par défaut de réflexion (Claude 4.6)

- Les modèles Claude 4.6 de Anthropic sont réglés par défaut sur `adaptive` de réflexion dans OpenClaw lorsqu'aucun niveau de réflexion explicite n'est défini.
- Vous pouvez remplacer par message (`/think:<level>`) ou dans les paramètres du modèle :
  `agents.defaults.models["anthropic/<model>"].params.thinking`.
- Documentation Anthropic connexe :
  - [Réflexion adaptative](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Réflexion étendue](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Mode rapide (Anthropic API)

Le commutateur partagé `/fast` de OpenClaw prend également en charge le trafic public direct Anthropic, y compris les demandes authentifiées par clé API et OAuth envoyées à `api.anthropic.com`.

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
- Les paramètres de modèle `serviceTier` ou `service_tier` Anthropic explicites remplacent la valeur par défaut `/fast` lorsque les deux sont définis.
- Anthropic indique le niveau effectif dans la réponse sous `usage.service_tier`. Sur les comptes sans capacité Priority Tier, `service_tier: "auto"` peut toujours résoudre à `standard`.

## Mise en cache du prompt (Anthropic API)

OpenClaw prend en charge la fonction de mise en cache du prompt de Anthropic. Il s'agit d'une fonction **API uniquement** ; l'authentification par jeton héritée Anthropic ne respecte pas les paramètres de cache.

### Configuration

Utilisez le paramètre `cacheRetention` dans votre configuration de modèle :

| Valeur  | Durée du cache       | Description                                           |
| ------- | -------------------- | ----------------------------------------------------- |
| `none`  | Pas de mise en cache | Désactiver la mise en cache du prompt                 |
| `short` | 5 minutes            | Valeur par défaut pour l'authentification par clé API |
| `long`  | 1 heure              | Cache étendu                                          |

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

Lorsque vous utilisez l'authentification par clé API Anthropic, OpenClaw applique automatiquement `cacheRetention: "short"` (cache de 5 minutes) pour tous les modèles Anthropic. Vous pouvez remplacer ce paramètre en définissant explicitement `cacheRetention` dans votre configuration.

### Remplacements de cacheRetention par agent

Utilisez les paramètres au niveau du modèle comme base, puis remplacez pour des agents spécifiques via `agents.list[].params`.

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

Cela permet à un agent de conserver un cache à longue durée de vie tandis qu'un autre agent sur le même modèle désactive le cache pour éviter les coûts d'écriture sur le trafic sporadique/à faible réutilisation.

### Notes sur Bedrock Claude

- Les modèles Claude Anthropic sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le passage direct de `cacheRetention` lorsqu'ils sont configurés.
- Les modèles Bedrock non-Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.
- Les valeurs par défaut intelligentes de clé API Anthropic initialisent également `cacheRetention: "short"` pour les références de modèle Claude-on-Bedrock lorsqu'aucune valeur explicite n'est définie.

## Fenêtre de contexte de 1M (bêta Anthropic)

La fenêtre de contexte de 1M d'Anthropic est en accès bêta restreint. Dans OpenClaw, activez-la par modèle
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

OpenClaw mappe ceci à `anthropic-beta: context-1m-2025-08-07` sur les requêtes
Anthropic.

Cela ne s'active que lorsque `params.context1m` est explicitement défini sur `true` pour
ce modèle.

Condition requise : Anthropic doit autoriser l'utilisation du contexte long sur ces identifiants.

Remarque : Anthropic rejette actuellement les requêtes bêta `context-1m-*` lors de l'utilisation de l'authentification par jeton héritée Anthropic (`sk-ant-oat-*`). Si vous configurez `context1m: true` avec ce mode d'authentification hérité, OpenClaw enregistre un avertissement et revient à la fenêtre de contexte standard en ignorant l'en-tête bêta context1m tout en conservant les bêtas OAuth requises.

## Backend Claude CLI

Le backend `claude-cli` Anthropic intégré est pris en charge dans OpenClaw.

- Le personnel de Anthropic nous a informés que cette utilisation est à nouveau autorisée.
- OpenClaw considère donc la réutilisation du CLI Claude et l'utilisation de `claude -p` comme autorisées pour cette intégration, sauf si Anthropic publie une nouvelle politique.
- Les clés Anthropic API restent la voie de production la plus claire pour les passerelles toujours actives et le contrôle explicite de la facturation côté serveur.
- Les détails de configuration et d'exécution se trouvent dans [/gateway/cli-backends](/en/gateway/cli-backends).

## Notes

- La documentation publique de Claude Code de Anthropic documente toujours l'utilisation directe du CLI telle que `claude -p`, et le personnel de Anthropic nous a informés que l'utilisation du OpenClaw Claude style CLI est à nouveau autorisée. Nous considérons cette directive comme définitive, sauf si Anthropic publie un changement de politique.
- Le setup-token Anthropic reste disponible dans OpenClaw en tant que chemin d'authentification par jeton pris en charge, mais OpenClaw préfère désormais la réutilisation du CLI Claude et `claude -p` lorsqu'ils sont disponibles.
- Les détails d'authentification et les règles de réutilisation se trouvent dans [/concepts/oauth](/en/concepts/oauth).

## Troubleshooting

**Erreurs 401 / jeton soudainement invalide**

- L'authentification par jeton Anthropic peut expirer ou être révoquée.
- Pour une nouvelle configuration, migrez vers une clé API Anthropic API.

**Aucune clé API trouvée pour le fournisseur "anthropic"**

- L'authentification est **par agent**. Les nouveaux agents n'héritent pas des clés de l'agent principal.
- Relancez l'onboarding pour cet agent, ou configurez une clé API sur l'hôte de la passerelle, puis vérifiez avec `openclaw models status`.

**Aucune identifiante trouvée pour le profil `anthropic:default`**

- Exécutez `openclaw models status` pour voir quel profil d'authentification est actif.
- Relancez l'onboarding, ou configurez une clé API API pour ce chemin de profil.

**Aucun profil d'authentification disponible (tous en temps de recharge/indisponibles)**

- Vérifiez `openclaw models status --json` pour `auth.unusableProfiles`.
- Les temps de recharge de limite de débit Anthropic peuvent être étendus au modèle, donc un modèle Anthropic
  frère peut encore être utilisable même lorsque celui en cours est en refroidissement.
- Ajoutez un autre profil Anthropic ou attendez la fin du temps de recharge.

En savoir plus : [/gateway/troubleshooting](/en/gateway/troubleshooting) et [/help/faq](/en/help/faq).
