---
summary: "Politique de nouvelle tentative pour les appels sortants du fournisseur"
read_when:
  - Mise à jour du comportement de nouvelle tentative du fournisseur ou des valeurs par défaut
  - Débogage des erreurs d'envoi du fournisseur ou des limites de taux
title: "Politique de nouvelle tentative"
---

# Politique de nouvelle tentative

## Objectifs

- Nouvelle tentative par requête HTTP, et non par flux multi-étapes.
- Conserver l'ordre en réessayant uniquement l'étape actuelle.
- Éviter de dupliquer les opérations non idempotentes.

## Valeurs par défaut

- Tentatives : 3
- Plafond de délai maximal : 30 000 ms
- Gigue : 0,1 (10 %)
- Valeurs par défaut du fournisseur :
  - Telegram délai min : 400 ms
  - Discord délai min : 500 ms

## Comportement

### Discord

- Réessaie uniquement en cas d'erreurs de limitation de débit (HTTP 429).
- Utilise Discord `retry_after` lorsqu'il est disponible, sinon un temps d'attente exponentiel.

### Telegram

- Réessaie en cas d'erreurs transitoires (429, expiration du délai, connexion/réinitialisation/fermeture, temporairement indisponible).
- Utilise `retry_after` lorsqu'il est disponible, sinon un temps d'attente exponentiel.
- Les erreurs d'analyse Markdown ne sont pas réessayées ; elles reviennent au texte brut.

## Configuration

Définir la politique de nouvelle tentative par fournisseur dans `~/.openclaw/openclaw.json` :

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

- Les nouvelles tentatives s'appliquent par requête (envoi de message, téléchargement de média, réaction, sondage, autocollant).
- Les flux composites ne réessayent pas les étapes terminées.

import en from "/components/footer/en.mdx";

<en />
