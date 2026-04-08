---
summary: "Utilisez Anthropic Claude via des clés API dans OpenClaw"
read_when:
  - You want to use Anthropic models in OpenClaw
title: "Anthropic"
---

# Anthropic (Claude)

Anthropic développe la famille de modèles **Claude** et fournit un accès via une API.
Dans OpenClaw, la nouvelle configuration Anthropic doit utiliser une clé API. Les profils de jeton Anthropic hérités existants sont toujours honorés lors de l'exécution s'ils sont déjà
configurés.

<Warning>
Pour Anthropic dans OpenClaw, la répartition de la facturation est la suivante :

- **Clé Anthropic API** : facturation normale de l'Anthropic API.
- **Authentification par abonnement Claude dans OpenClaw** : Anthropic a indiqué aux utilisateurs de OpenClaw le
  **4 avril 2026 à 12h00 PT / 20h00 BST** que cela compte comme
  une utilisation de tierce partie et nécessite **Extra Usage** (paiement à l'usage,
  facturé séparément de l'abonnement).

Nos reprod. locales correspondent à cette répartition :

- `claude -p` direct peut encore fonctionner
- `claude -p --append-system-prompt ...` peut déclencher la garde Extra Usage lorsque
  le prompt identifie OpenClaw
- le même prompt système de type OpenClaw **ne reproduit pas** le blocage sur le chemin
  du SDK Anthropic + `ANTHROPIC_API_KEY`

Ainsi, la règle pratique est : **clé Anthropic API, ou abonnement Claude avec
Extra Usage**. Si vous souhaitez le chemin de production le plus clair, utilisez une clé Anthropic API.

Documentation publique actuelle de Anthropic :

- [Référence de la CLI Claude Code](https://code.claude.com/docs/en/cli-reference)
- [Aperçu du SDK Claude Agent](https://platform.claude.com/docs/en/agent-sdk/overview)

- [Utilisation de Claude Code avec votre plan Pro ou Max](https://support.claude.com/en/articles/11145838-using-claude-code-with-your-pro-or-max-plan)
- [Utilisation de Claude Code avec votre plan Team ou Enterprise](https://support.anthropic.com/en/articles/11845131-using-claude-code-with-your-team-or-enterprise-plan/)

Si vous souhaitez le chemin de facturation le plus clair, utilisez plutôt une clé Anthropic API.
OpenClaw prend également en charge d'autres options de type abonnement, notamment [OpenAI
Codex](/en/providers/openai), [Plan de codage Cloud Qwen](/en/providers/qwen),
[Plan de codage MiniMax](/en/providers/minimax) et [Plan de codage
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

- Les modèles Claude 4.6 Anthropic sont réglés par défaut sur la réflexion `adaptive` dans OpenClaw lorsqu'aucun niveau de réflexion explicite n'est défini.
- Vous pouvez remplacer `/think:<level>` par message ou dans les paramètres du modèle :
  `agents.defaults.models["anthropic/<model>"].params.thinking`.
- Documentation Anthropic connexe :
  - [Adaptive thinking](https://platform.claude.com/docs/en/build-with-claude/adaptive-thinking)
  - [Extended thinking](https://platform.claude.com/docs/en/build-with-claude/extended-thinking)

## Mode rapide (Anthropic API)

L'interrupteur partagé `/fast` de OpenClaw prend également en charge le trafic public direct de Anthropic, y compris les demandes authentifiées par clé API ou OAuth envoyées à `api.anthropic.com`.

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

- OpenClaw n'injecte les niveaux de service Anthropic que pour les demandes directes `api.anthropic.com`. Si vous acheminez `anthropic/*` via un proxy ou une passerelle, `/fast` laisse `service_tier` intact.
- Les paramètres de modèle explicites Anthropic `serviceTier` ou `service_tier` remplacent la valeur par défaut de `/fast` lorsque les deux sont définis.
- Anthropic signale le niveau effectif dans la réponse sous `usage.service_tier`. Sur les comptes sans capacité de niveau prioritaire, `service_tier: "auto"` peut toujours résoudre à `standard`.

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

Lors de l'utilisation de l'authentification par clé Anthropic API, OpenClaw applique automatiquement `cacheRetention: "short"` (cache de 5 minutes) pour tous les modèles Anthropic. Vous pouvez remplacer cela en définissant explicitement `cacheRetention` dans votre configuration.

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

Cela permet à un agent de conserver un cache à longue durée de vie tandis qu'un autre agent sur le même modèle désactive le cache pour éviter les coûts d'écriture sur le trafic sporadique/à faible réutilisation.

### Notes sur Bedrock Claude

- Les modèles Claude Anthropic sur Bedrock (`amazon-bedrock/*anthropic.claude*`) acceptent le transfert `cacheRetention` lorsqu'ils sont configurés.
- Les modèles Bedrock non-Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.
- Les valeurs par défaut intelligentes de la clé Anthropic API initialisent également `cacheRetention: "short"` pour les références de modèles Claude-on-Bedrock lorsqu aucune valeur explicite n'est définie.

## Fenêtre de contexte de 1M (bêta Anthropic)

La fenêtre de contexte de 1M de Anthropic est en accès restreint (bêta). Dans OpenClaw, activez-la par modèle
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

Cela ne s'active que lorsque `params.context1m` est explicitement défini à `true` pour
ce modèle.

Condition requise : Anthropic doit autoriser l'utilisation de contexte long sur ces informations d'identification
(généralement facturation par clé API, ou chemin de connexion Claude de OpenClaw / authentification par jeton hérité
avec Extra Usage activé). Sinon, Anthropic renvoie :
`HTTP 429: rate_limit_error: Extra usage is required for long context requests`.

Remarque : Anthropic rejette actuellement les requêtes bêta `context-1m-*` lors de l'utilisation
de l'authentification par jeton Anthropic héritée (`sk-ant-oat-*`). Si vous configurez
`context1m: true` avec ce mode d'authentification hérité, OpenClaw enregistre un avertissement et
revient à la fenêtre de contexte standard en ignorant l'en-tête bêta context1m
tout en conservant les bêtas OAuth requises.

## Supprimé : backend Claude CLI

Le backend `claude-cli` Anthropic inclus a été supprimé.

- L'avis du 4 avril 2026 de Anthropic indique que le trafic de connexion Claude alimenté par OpenClaw est
  une utilisation par un harnais tiers et nécessite **Extra Usage**.
- Nos reproductions locales montrent également que le
  `claude -p --append-system-prompt ...` direct peut déclencher la même garde lorsque le
  prompt ajouté identifie OpenClaw.
- Le même prompt système de type OpenClaw ne déclenche pas cette garde sur le
  chemin SDK Anthropic + `ANTHROPIC_API_KEY`.
- Utilisez les clés API Anthropic pour le trafic API dans Anthropic.

## Notes

- La documentation publique de Claude Code de Anthropic documente toujours l'utilisation directe de la CLI telle que
  `claude -p`, mais un avis distinct de Anthropic aux utilisateurs de OpenClaw indique que le chemin de connexion Claude de
  **OpenClaw** constitue une utilisation via un harnais tiers et nécessite
  **l'utilisation supplémentaire** (paiement à l'utilisation facturé séparément de l'abonnement).
  Nos reproductions locales montrent également que l'utilisation directe de
  `claude -p --append-system-prompt ...` peut rencontrer la même barrière lorsque le
  prompt ajouté identifie OpenClaw, alors que la même forme de prompt ne se
  reproduit pas sur le chemin du SDK Anthropic + `ANTHROPIC_API_KEY`. Pour la production, nous
  recommandons plutôt les clés API Anthropic API.
- Le jeton de configuration Anthropic est à nouveau disponible dans OpenClaw en tant que chemin legacy/manuel. L'avis de facturation spécifique à Anthropic de OpenClaw s'applique toujours, utilisez-le donc en sachant que Anthropic exige une **utilisation supplémentaire** pour ce chemin.
- Les détails d'authentification + les règles de réutilisation se trouvent dans [/concepts/oauth](/en/concepts/oauth).

## Troubleshooting

**Erreurs 401 / jeton soudainement invalide**

- L'authentification par jeton Anthropic legacy peut expirer ou être révoquée.
- Pour une nouvelle configuration, migrez vers une clé API Anthropic API.

**Aucune clé API trouvée pour le fournisseur "anthropic"**

- L'authentification est **par agent**. Les nouveaux agents n'héritent pas des clés de l'agent principal.
- Relancez l'onboarding pour cet agent, ou configurez une clé API API sur l'hôte de la passerelle,
  puis vérifiez avec `openclaw models status`.

**Aucune information d'identification trouvée pour le profil `anthropic:default`**

- Exécutez `openclaw models status` pour voir quel profil d'authentification est actif.
- Relancez l'onboarding, ou configurez une clé API API pour ce chemin de profil.

**Aucun profil d'authentification disponible (tous en temps de recharge/indisponibles)**

- Vérifiez `openclaw models status --json` pour `auth.unusableProfiles`.
- Les temps de recharge de limite de débit Anthropic peuvent être étendus au modèle, donc un modèle Anthropic
  frère peut encore être utilisable même lorsque celui en cours est en refroidissement.
- Ajoutez un autre profil Anthropic ou attendez la fin du temps de recharge.

Plus d'informations : [/gateway/troubleshooting](/en/gateway/troubleshooting) et [/help/faq](/en/help/faq).
