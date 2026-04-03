---
title: "Mise en cache des invites"
summary: "Contrôles de mise en cache des invites, ordre de fusion, comportement du fournisseur et modèles de réglage"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# Mise en cache des prompts

La mise en cache des invites signifie que le fournisseur de modèles peut réutiliser les préfixes d'invites inchangés (généralement les instructions système/développeur et d'autres contextes stables) d'un tour à l'autre au lieu de les retraiter à chaque fois. La première demande correspondante écrit des jetons de cache (`cacheWrite`), et les demandes correspondantes ultérieures peuvent les relire (`cacheRead`).

Pourquoi cela est important : coûts de jetons réduits, réponses plus rapides et performances plus prévisibles pour les sessions de longue durée. Sans mise en cache, les prompts répétés paient le coût total du prompt à chaque tour, même lorsque la plupart des entrées n'ont pas changé.

Cette page couvre tous les contrôles liés au cache qui affectent la réutilisation des prompts et le coût des jetons.

Pour plus de détails sur la tarification Anthropic, voir :
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## Contrôles principaux

### `cacheRetention` (par défaut global, modèle et par agent)

Définir la rétention du cache comme valeur par défaut globale pour tous les modèles :

```yaml
agents:
  defaults:
    params:
      cacheRetention: "long" # none | short | long
```

Remplacer par modèle :

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

1. `agents.defaults.params` (par défaut global — s'applique à tous les modèles)
2. `agents.defaults.models["provider/model"].params` (remplacement par modèle)
3. `agents.list[].params` (id d'agent correspondant ; remplace par clé)

### `cacheControlTtl` hérité

Les valeurs héritées sont toujours acceptées et mappées :

- `5m` -> `short`
- `1h` -> `long`

Préférez `cacheRetention` pour la nouvelle configuration.

### `contextPruning.mode: "cache-ttl"`

Supprime l'ancien contexte des résultats d'outils après les fenêtres TTL du cache afin que les demandes post-inactivité ne remettent pas en cache un historique trop volumineux.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

Voir [Session Pruning](/en/concepts/session-pruning) pour le comportement complet.

### Maintien de la chaleur par pulsation (Heartbeat keep-warm)

La pulsation peut garder les fenêtres de cache au chaud et réduire les écritures de cache répétées après les périodes d'inactivité.

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

La pulsation par agent est prise en charge au niveau `agents.list[].heartbeat`.

## Comportement du fournisseur

### Anthropic (API directe)

- `cacheRetention` est pris en charge.
- Avec les profils d'authentification par clé Anthropic API, OpenClaw amorce `cacheRetention: "short"` pour les références de modèles Anthropic lorsqu'il n'est pas défini.

### Amazon Bedrock

- Les références de modèles Claude Anthropic (`amazon-bedrock/*anthropic.claude*`) prennent en charge le passage explicite de `cacheRetention`.
- Les modèles Bedrock non-Anthropic sont forcés à `cacheRetention: "none"` lors de l'exécution.

### Modèles OpenRouter Anthropic

Pour les références de modèle `openrouter/anthropic/*`, OpenClaw injecte Anthropic `cache_control` sur les blocs de invites système/développeur pour améliorer la réutilisation du cache d'invites.

### Autres providers

Si le provider ne prend pas en charge ce mode de cache, `cacheRetention` n'a aucun effet.

## Motifs de réglage

### Trafic mixte (recommandé par défaut)

Conservez une ligne de base à long terme sur votre agent principal, désactivez la mise en cache sur les agents de notification par salves :

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

### Ligne de base priorisant les coûts

- Définissez la ligne de base `cacheRetention: "short"`.
- Activez `contextPruning.mode: "cache-ttl"`.
- Maintenez le heartbeat en dessous de votre TTL uniquement pour les agents qui bénéficient de caches chauds.

## Diagnostics de cache

OpenClaw expose des diagnostics de trace de cache dédiés pour les exécutions d'agents intégrés.

### Configuration `diagnostics.cacheTrace`

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

### Commutateurs d'environnement (dépannage ponctuel)

- `OPENCLAW_CACHE_TRACE=1` active le traçage du cache.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` remplace le chemin de sortie.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` active la capture complète de la charge utile du message.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` active la capture du texte de l'invite.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` active la capture de l'invite système.

### Ce qu'il faut inspecter

- Les événements de trace de cache sont au format JSONL et incluent des instantanés intermédiaires tels que `session:loaded`, `prompt:before`, `stream:context` et `session:after`.
- L'impact des jetons de cache par tour est visible dans les surfaces d'utilisation normales via `cacheRead` et `cacheWrite` (par exemple `/usage full` et les résumés d'utilisation de session).

## Dépannage rapide

- `cacheWrite` élevés sur la plupart des tours : vérifiez les entrées volatiles de l'invite système et confirmez que le modèle/le provider prend en charge vos paramètres de cache.
- Aucun effet de `cacheRetention` : confirmez que la clé du modèle correspond à `agents.defaults.models["provider/model"]`.
- Requêtes Bedrock Nova/Mistral avec des paramètres de cache : forçage de l'exécution attendu vers `none`.

Documentation connexe :

- [Anthropic](/en/providers/anthropic)
- [Utilisation des jetons et coûts](/en/reference/token-use)
- [Élagage de session](/en/concepts/session-pruning)
- [Référence de configuration de la passerelle](/en/gateway/configuration-reference)
