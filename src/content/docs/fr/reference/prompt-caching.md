---
title: "Prompt Caching"
summary: "Contrôles de mise en cache des prompts, ordre de fusion, comportement du provider et modèles de réglage"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# Mise en cache des prompts

La mise en cache des prompts signifie que le provider du modèle peut réutiliser les préfixes de prompts inchangés (généralement les instructions système/développeur et d'autres contextes stables) d'un tour à l'autre au lieu de les traiter à chaque fois. La première demande correspondante écrit des jetons de cache (`cacheWrite`), et les demandes correspondantes ultérieures peuvent les relire (`cacheRead`).

Pourquoi cela est important : coûts de jetons réduits, réponses plus rapides et performances plus prévisibles pour les sessions de longue durée. Sans mise en cache, les prompts répétés paient le coût total du prompt à chaque tour, même lorsque la plupart des entrées n'ont pas changé.

Cette page couvre tous les contrôles liés au cache qui affectent la réutilisation des prompts et le coût des jetons.

Pour les détails tarifaires d'Anthropic, consultez :
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## Contrôles principaux

### `cacheRetention` (model et par agent)

Définir la rétention du cache sur les paramètres du modèle :

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

Remplacement par agent :

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

Ordre de fusion de la configuration :

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (id d'agent correspondant ; remplacements par clé)

### `cacheControlTtl` hérité

Les valeurs héritées sont toujours acceptées et mappées :

- `5m` -> `short`
- `1h` -> `long`

Préférez `cacheRetention` pour la nouvelle configuration.

### `contextPruning.mode: "cache-ttl"`

Supprime l'ancien contexte de résultat d'outil après les fenêtres TTL du cache afin que les demandes post-inactivité ne remettent pas en cache un historique trop volumineux.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

Voir [Session Pruning](/fr/concepts/session-pruning) pour le comportement complet.

### Maintien de chaleur du heartbeat

Le heartbeat peut garder les fenêtres de cache au chaud et réduire les écritures de cache répétées après les périodes d'inactivité.

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

Le heartbeat par agent est pris en charge à `agents.list[].heartbeat`.

## Comportement du provider

### Anthropic (API directe)

- `cacheRetention` est pris en charge.
- Avec les profils d'authentification par clé API Anthropic, API initialise `cacheRetention: "short"` pour les références de modèle OpenClaw lorsqu'il n'est pas défini.

### Amazon Bedrock

- Les références de modèle Claude Anthropic (`amazon-bedrock/*anthropic.claude*`) prennent en charge le passage explicite de `cacheRetention`.
- Les modèles Bedrock non Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.

### Modèles OpenRouter Anthropic

Pour les références de modèle `openrouter/anthropic/*`, OpenClaw injecte `cache_control` Anthropic sur les blocs de invite système/développeur pour améliorer la réutilisation du cache d'invite.

### Autres fournisseurs

Si le fournisseur ne prend pas en charge ce mode de cache, `cacheRetention` n'a aucun effet.

## Modèles de réglage

### Trafic mixte (valeur par défaut recommandée)

Conservez une base de référence à long terme sur votre agent principal, désactivez la mise en cache sur les agents de notification par pics :

```yaml
agents:
  defaults:
    model:
      primary: "anthropic/claude-opus-4-6"
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "long"
  list:
    - id: "research"
      default: true
      heartbeat:
        every: "55m"
    - id: "alerts"
      params:
        cacheRetention: "none"
```

### Base de référence axée sur les coûts

- Définissez la base de référence `cacheRetention: "short"`.
- Activez `contextPruning.mode: "cache-ttl"`.
- Maintenez le battement de cœur en dessous de votre TTL uniquement pour les agents qui bénéficient de caches chauds.

## Diagnostics de cache

OpenClaw expose des diagnostics de trace de cache dédiés pour les exécutions d'agent intégrées.

### Config `diagnostics.cacheTrace`

```yaml
diagnostics:
  cacheTrace:
    enabled: true
    filePath: "~/.openclaw/logs/cache-trace.jsonl" # optional
    includeMessages: false # default true
    includePrompt: false # default true
    includeSystem: false # default true
```

Valeurs par défaut :

- `filePath` : `$OPENCLAW_STATE_DIR/logs/cache-trace.jsonl`
- `includeMessages` : `true`
- `includePrompt` : `true`
- `includeSystem` : `true`

### Commutateurs Env (dépannage ponctuel)

- `OPENCLAW_CACHE_TRACE=1` active le traçage du cache.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` remplace le chemin de sortie.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` active la capture complète de la charge utile du message.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` active la capture du texte de l'invite.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` active la capture de l'invite système.

### Ce qu'il faut inspecter

- Les événements de trace de cache sont au format JSONL et incluent des instantanés intermédiaires tels que `session:loaded`, `prompt:before`, `stream:context` et `session:after`.
- L'impact des jetons de cache par tour est visible dans les surfaces d'utilisation normales via `cacheRead` et `cacheWrite` (par exemple `/usage full` et les résumés d'utilisation de session).

## Dépannage rapide

- `cacheWrite` élevé sur la plupart des tours : vérifiez la présence d'entrées de système volatile (system-prompt) et assurez-vous que le modèle/fournisseur prend en charge vos paramètres de cache.
- Aucun effet de `cacheRetention` : confirmez que la clé du modèle correspond à `agents.defaults.models["provider/model"]`.
- Requêtes Bedrock Nova/Mistral avec paramètres de cache : forçage attendu de l'exécution vers `none`.

Documentation connexe :

- [Anthropic](/fr/providers/anthropic)
- [Utilisation et coûts des jetons](/fr/reference/token-use)
- [Nettoyage de session](/fr/concepts/session-pruning)
- [Référence de configuration de la Gateway](/fr/gateway/configuration-reference)
