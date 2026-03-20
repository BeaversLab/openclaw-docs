---
title: "Prompt Caching"
summary: "Prompt caching knobs, merge order, provider behavior, and tuning patterns"
read_when:
  - You want to reduce prompt token costs with cache retention
  - You need per-agent cache behavior in multi-agent setups
  - You are tuning heartbeat and cache-ttl pruning together
---

# Prompt caching

Prompt caching means the model provider can reuse unchanged prompt prefixes (usually system/developer instructions and other stable context) across turns instead of re-processing them every time. The first matching request writes cache tokens (`cacheWrite`), and later matching requests can read them back (`cacheRead`).

Why this matters: lower token cost, faster responses, and more predictable performance for long-running sessions. Without caching, repeated prompts pay the full prompt cost on every turn even when most input did not change.

This page covers all cache-related knobs that affect prompt reuse and token cost.

For Anthropic pricing details, see:
[https://docs.anthropic.com/docs/build-with-claude/prompt-caching](https://docs.anthropic.com/docs/build-with-claude/prompt-caching)

## Primary knobs

### `cacheRetention` (model and per-agent)

Set cache retention on model params:

```yaml
agents:
  defaults:
    models:
      "anthropic/claude-opus-4-6":
        params:
          cacheRetention: "short" # none | short | long
```

Per-agent override:

```yaml
agents:
  list:
    - id: "alerts"
      params:
        cacheRetention: "none"
```

Config merge order:

1. `agents.defaults.models["provider/model"].params`
2. `agents.list[].params` (matching agent id; overrides by key)

### Legacy `cacheControlTtl`

Legacy values are still accepted and mapped:

- `5m` -> `short`
- `1h` -> `long`

Prefer `cacheRetention` for new config.

### `contextPruning.mode: "cache-ttl"`

Prunes old tool-result context after cache TTL windows so post-idle requests do not re-cache oversized history.

```yaml
agents:
  defaults:
    contextPruning:
      mode: "cache-ttl"
      ttl: "1h"
```

See [Session Pruning](/fr/concepts/session-pruning) for full behavior.

### Heartbeat keep-warm

Heartbeat can keep cache windows warm and reduce repeated cache writes after idle gaps.

```yaml
agents:
  defaults:
    heartbeat:
      every: "55m"
```

Per-agent heartbeat is supported at `agents.list[].heartbeat`.

## Provider behavior

### Anthropic (direct API)

- `cacheRetention` is supported.
- With Anthropic API-key auth profiles, OpenClaw seeds `cacheRetention: "short"` for Anthropic model refs when unset.

### Amazon Bedrock

- Les références de modèle Anthropic Claude (`amazon-bedrock/*anthropic.claude*`) prennent en charge le passage explicite `cacheRetention`.
- Les modèles Bedrock non-Anthropic sont forcés de `cacheRetention: "none"` lors de l'exécution.

### Modèles Anthropic OpenRouter

Pour les références de modèle `openrouter/anthropic/*`, OpenClaw injecte Anthropic `cache_control` sur les blocs de prompt système/développeur pour améliorer la réutilisation du cache de prompt.

### Autres fournisseurs

Si le fournisseur ne prend pas en charge ce mode de cache, `cacheRetention` n'a aucun effet.

## Modèles de réglage

### Trafic mixte (par défaut recommandé)

Conservez une ligne de base à long terme sur votre agent principal, désactivez la mise en cache sur les agents de notification par pics :

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

### Ligne de base orientée coût

- Définissez la ligne de base `cacheRetention: "short"`.
- Activez `contextPruning.mode: "cache-ttl"`.
- Gardez le rythme cardiaque sous votre TTL uniquement pour les agents qui bénéficient de caches chauds.

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

### Bascules d'environnement (dépannage ponctuel)

- `OPENCLAW_CACHE_TRACE=1` active le traçage du cache.
- `OPENCLAW_CACHE_TRACE_FILE=/path/to/cache-trace.jsonl` remplace le chemin de sortie.
- `OPENCLAW_CACHE_TRACE_MESSAGES=0|1` bascule la capture complète de la charge utile du message.
- `OPENCLAW_CACHE_TRACE_PROMPT=0|1` bascule la capture du texte du prompt.
- `OPENCLAW_CACHE_TRACE_SYSTEM=0|1` bascule la capture du prompt système.

### Ce qu'il faut inspecter

- Les événements de trace de cache sont au format JSONL et incluent des instantanés intermédiaires comme `session:loaded`, `prompt:before`, `stream:context` et `session:after`.
- L'impact des jetons de cache par tour est visible dans les surfaces d'utilisation normales via `cacheRead` et `cacheWrite` (par exemple `/usage full` et les résumés d'utilisation de session).

## Dépannage rapide

- `cacheWrite` élevé sur la plupart des tours : vérifiez la présence d'entrées de prompt système volatiles et confirmez que le modèle/le fournisseur prend en charge vos paramètres de cache.
- Aucun effet de `cacheRetention` : confirmez que la clé du modèle correspond à `agents.defaults.models["provider/model"]`.
- Requêtes Bedrock Nova/Mistral avec des paramètres de cache : force d'exécution attendue pour `none`.

Documentation associée :

- [Anthropic](/fr/providers/anthropic)
- [Utilisation et coûts des jetons](/fr/reference/token-use)
- [Nettoyage de session](/fr/concepts/session-pruning)
- [Référence de configuration du Gateway](/fr/gateway/configuration-reference)

import fr from "/components/footer/fr.mdx";

<fr />
