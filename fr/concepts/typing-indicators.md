---
summary: "Quand OpenClaw affiche les indicateurs de frappe et comment les régler"
read_when:
  - Modification du comportement ou des valeurs par défaut des indicateurs de frappe
title: "Indicateurs de frappe"
---

# Indicateurs de frappe

Les indicateurs de frappe sont envoyés au channel de discussion pendant qu'une exécution est active. Utilisez
`agents.defaults.typingMode` pour contrôler **quand** la frappe commence et `typingIntervalSeconds`
pour contrôler **la fréquence** de son actualisation.

## Valeurs par défaut

Lorsque `agents.defaults.typingMode` est **non défini**, OpenClaw conserve le comportement hérité :

- **Discussions directes** : la frappe commence dès que la boucle du modèle démarre.
- **Discussions de groupe avec une mention** : la frappe commence immédiatement.
- **Discussions de groupe sans mention** : la frappe commence uniquement lorsque le flux du texte du message commence.
- **Exécutions de heartbeat** : la frappe est désactivée.

## Modes

Définissez `agents.defaults.typingMode` sur l'une des valeurs suivantes :

- `never` — aucun indicateur de frappe, jamais.
- `instant` — commence la frappe **dès que la boucle du model démarre**, même si l'exécution
  renvoie ensuite uniquement le jeton de réponse silencieuse.
- `thinking` — commence la frappe à la **première delta de raisonnement** (nécessite
  `reasoningLevel: "stream"` pour l'exécution).
- `message` — commence la frappe à la **première delta de texte non silencieuse** (ignore
  le jeton silencieux `NO_REPLY`).

Ordre de « rapidité de déclenchement » :
`never` → `message` → `thinking` → `instant`

## Configuration

```json5
{
  agent: {
    typingMode: "thinking",
    typingIntervalSeconds: 6,
  },
}
```

Vous pouvez remplacer le mode ou la cadence par session :

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## Notes

- Le mode `message` n'affichera pas de frappe pour les réponses entièrement silencieuses (par exemple le jeton
  `NO_REPLY` utilisé pour supprimer la sortie).
- `thinking` ne se déclenche que si l'exécution diffuse le raisonnement (`reasoningLevel: "stream"`).
  Si le model n'émet pas de deltas de raisonnement, la frappe ne démarrera pas.
- Les heartbeats n'affichent jamais la frappe, quel que soit le mode.
- `typingIntervalSeconds` contrôle la **cadence d'actualisation**, et non l'heure de début.
  La valeur par défaut est 6 secondes.

import en from "/components/footer/en.mdx";

<en />
