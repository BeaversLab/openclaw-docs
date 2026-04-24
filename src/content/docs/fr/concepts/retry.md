---
summary: "Stratégie de nouvelle tentative pour les appels sortants au provider"
read_when:
  - Updating provider retry behavior or defaults
  - Debugging provider send errors or rate limits
title: "Stratégie de nouvelle tentative"
---

# Stratégie de nouvelle tentative

## Objectifs

- Nouvelle tentative par requête HTTP, et non par flux multi-étapes.
- Préserver l'ordre en réessayant uniquement l'étape actuelle.
- Éviter de dupliquer les opérations non idempotentes.

## Valeurs par défaut

- Tentatives : 3
- Plafond de délai maximum : 30000 ms
- Gigue : 0,1 (10 pour cent)
- Valeurs par défaut du provider :
  - Délai minimum Telegram : 400 ms
  - Délai minimum Discord : 500 ms

## Comportement

### Fournisseurs de modèles

- OpenClaw laisse les SDK des fournisseurs gérer les tentatives de courte durée normales.
- Pour les SDK basés sur Stainless tels qu'Anthropic et OpenAI, les réponses réessayables (`408`, `409`, `429` et `5xx`) peuvent inclure `retry-after-ms` ou `retry-after`. Lorsque cette attente dépasse 60 secondes, OpenClaw injecte `x-should-retry: false` afin que le SDK signale l'erreur immédiatement et que le basculement de modèle puisse passer à un autre profil d'authentification ou à un modèle de repli.
- Remplacez la limite avec `OPENCLAW_SDK_RETRY_MAX_WAIT_SECONDS=<seconds>`.
  Définissez-la sur `0`, `false`, `off`, `none` ou `disabled` pour permettre aux SDK de respecter les longues
  pauses `Retry-After` en interne.

### Discord

- Réessaie uniquement en cas d'erreurs de limite de taux (HTTP 429).
- Utilise le `retry_after` de Discord lorsque disponible, sinon une temporisation exponentielle.

### Telegram

- Réessaie en cas d'erreurs transitoires (429, expiration, connexion/réinitialisation/fermée, indisponible temporairement).
- Utilise `retry_after` lorsque disponible, sinon une temporisation exponentielle.
- Les erreurs d'analyse Markdown ne sont pas réessayées ; elles reviennent au texte brut.

## Configuration

Définissez la stratégie de réessai par fournisseur dans `~/.openclaw/openclaw.json` :

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

- Les tentatives s'appliquent par requête (envoi de message, téléchargement de média, réaction, sondage, autocollant).
- Les flux composites ne réessaient pas les étapes terminées.
