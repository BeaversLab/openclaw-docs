---
summary: "Stratégie de nouvelle tentative pour les appels sortants au provider"
read_when:
  - Updating provider retry behavior or defaults
  - Debugging provider send errors or rate limits
title: "Politique de réessai"
---

## Objectifs

- Réessai par requête HTTP, et non par flux multi-étapes.
- Préserver l'ordre en réessayant uniquement l'étape actuelle.
- Éviter de dupliquer les opérations non idempotentes.

## Valeurs par défaut

- Tentatives : 3
- Plafond de délai maximal : 30000 ms
- Gigue : 0,1 (10 pour cent)
- Valeurs par défaut des providers :
  - Délai min Telegram : 400 ms
  - Délai min Discord : 500 ms

## Comportement

### Providers de modèles

- OpenClaw permet aux SDK des providers de gérer les réessais courts normaux.
- Pour les SDK basés sur Stainless tels que Anthropic et OpenAI, les réponses réessayables
  (`408`, `409`, `429` et `5xx`) peuvent inclure `retry-after-ms` ou
  `retry-after`. Lorsque cette attente dépasse 60 secondes, OpenClaw injecte
  `x-should-retry: false` afin que le SDK signale l'erreur immédiatement et que le basculement de modèle (model failover) puisse passer à un autre profil d'authentification ou à un modèle de repli.
- Remplacez le plafond avec `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS=<seconds>`.
  Définissez-le sur `0`, `false`, `off`, `none` ou `disabled` pour permettre aux SDK de respecter les longues
  pauses `Retry-After` en interne.

### Discord

- Nouvelles tentatives en cas d'erreurs de limite de débit (HTTP 429), de délais d'attente de requête, de réponses HTTP 5xx, et de pannes de transport temporaires telles que des échecs de recherche DNS, des réinitialisations de connexion, des fermetures de socket et des échecs de récupération.
- Utilise le `retry_after` de Discord lorsque disponible, sinon un exponentiel backoff.

### Telegram

- Réessaie sur les erreurs transitoires (429, timeout, connect/reset/closed, temporairement indisponible).
- Utilise `retry_after` lorsque disponible, sinon un exponentiel backoff.
- Les erreurs d'analyse Markdown ne sont pas réessayées ; elles retombent sur du texte brut.

## Configuration

Définir la politique de réessai par provider dans `~/.openclaw/openclaw.json` :

```json5
{
  channels: {
    telegram: {
      retry: {
        attempts: 3,
        minDelayMs: 400,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
    discord: {
      retry: {
        attempts: 3,
        minDelayMs: 500,
        maxDelayMs: 30000,
        jitter: 0.1,
      },
    },
  },
}
```

## Notes

- Les réessais s'appliquent par requête (envoi de message, téléchargement de média, réaction, sondage, sticker).
- Les flux composites ne réessaient pas les étapes terminées.

## Connexes

- [Basculement de modèle (Model failover)](/fr/concepts/model-failover)
- [File de commandes](/fr/concepts/queue)
