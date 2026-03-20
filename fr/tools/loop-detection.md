---
title: "Tool-loop detection"
description: "Configure optional guardrails for preventing repetitive or stalled tool-call loops"
summary: "How to enable and tune guardrails that detect repetitive tool-call loops"
read_when:
  - A user reports agents getting stuck repeating tool calls
  - You need to tune repetitive-call protection
  - You are editing agent tool/runtime policies
---

# Tool-loop detection

OpenClaw can keep agents from getting stuck in repeated tool-call patterns.
The guard is **disabled by default**.

Enable it only where needed, because it can block legitimate repeated calls with strict settings.

## Why this exists

- Detect repetitive sequences that do not make progress.
- Detect high-frequency no-result loops (same tool, same inputs, repeated errors).
- Detect specific repeated-call patterns for known polling tools.

## Configuration block

Global defaults:

```json5
{
  tools: {
    loopDetection: {
      enabled: false,
      historySize: 30,
      warningThreshold: 10,
      criticalThreshold: 20,
      globalCircuitBreakerThreshold: 30,
      detectors: {
        genericRepeat: true,
        knownPollNoProgress: true,
        pingPong: true,
      },
    },
  },
}
```

Per-agent override (optional):

```json5
{
  agents: {
    list: [
      {
        id: "safe-runner",
        tools: {
          loopDetection: {
            enabled: true,
            warningThreshold: 8,
            criticalThreshold: 16,
          },
        },
      },
    ],
  },
}
```

### Field behavior

- `enabled`: Master switch. `false` means no loop detection is performed.
- `historySize`: number of recent tool calls kept for analysis.
- `warningThreshold`: threshold before classifying a pattern as warning-only.
- `criticalThreshold`: threshold for blocking repetitive loop patterns.
- `globalCircuitBreakerThreshold`: global no-progress breaker threshold.
- `detectors.genericRepeat`: detects repeated same-tool + same-params patterns.
- `detectors.knownPollNoProgress`: detects known polling-like patterns with no state change.
- `detectors.pingPong`: detects alternating ping-pong patterns.

## Recommended setup

- Start with `enabled: true`, defaults unchanged.
- Keep thresholds ordered as `warningThreshold < criticalThreshold < globalCircuitBreakerThreshold`.
- If false positives occur:
  - raise `warningThreshold` and/or `criticalThreshold`
  - (optionally) raise `globalCircuitBreakerThreshold`
  - disable only the detector causing issues
  - reduce `historySize` for less strict historical context

## Logs and expected behavior

Lorsqu'une boucle est détectée, OpenClaw signale un événement de boucle et bloque ou atténue le prochain cycle d'outils en fonction de la gravité.
Cela protège les utilisateurs contre une dépense excessive de jetons et des blocages tout en préservant l'accès normal aux outils.

- Privilégiez d'abord l'avertissement et la suppression temporaire.
- N'intensifiez que lorsque des preuves répétées s'accumulent.

## Remarques

- `tools.loopDetection` est fusionné avec les remplacements au niveau de l'agent.
- La configuration par agent remplace ou étend entièrement les valeurs globales.
- Si aucune configuration n'existe, les garde-fous restent désactivés.

import fr from "/components/footer/fr.mdx";

<fr />
