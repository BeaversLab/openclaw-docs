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

### Discord

- Nouvelle tentative uniquement en cas d'erreurs de limitation de débit (HTTP 429).
- Utilise le Discord `retry_after` de Discord lorsqu'il est disponible, sinon un délai exponentiel.

### Telegram

- Nouvelle tentative en cas d'erreurs transitoires (429, expiration de délai, connexion/réinitialisation/fermeture, indisponible temporairement).
- Utilise `retry_after` si disponible, sinon un backoff exponentiel.
- Les erreurs d'analyse Markdown ne sont pas réessayées ; elles reviennent au texte brut.

## Configuration

Définissez la stratégie de réessai par provider dans `~/.openclaw/openclaw.json` :

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

- Les tentatives s'appliquent par requête (envoi de message, téléchargement de média, réaction, sondage, sticker).
- Les flux composites ne réessayent pas les étapes terminées.

import fr from '/components/footer/fr.mdx';

<fr />
