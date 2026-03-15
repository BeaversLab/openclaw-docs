---
summary: "Quand OpenClaw affiche les indicateurs de frappe et comment les régler"
read_when:
  - Changing typing indicator behavior or defaults
title: "Indicateurs de frappe"
---

# Indicateurs de frappe

Les indicateurs de frappe sont envoyés au channel de discussion pendant qu'une exécution est active. Utilisez
`agents.defaults.typingMode` pour contrôler **quand** la frappe commence et `typingIntervalSeconds`
pour contrôler **à quelle fréquence** elle s'actualise.

## Valeurs par défaut

Lorsque `agents.defaults.typingMode` est **non défini**, OpenClaw conserve le comportement hérité :

- **Discussions directes** : la frappe commence dès que la boucle du modèle démarre.
- **Discussions de groupe avec une mention** : la frappe commence immédiatement.
- **Discussions de groupe sans mention** : la frappe commence uniquement lorsque le flux du texte du message commence.
- **Exécutions de heartbeat** : la frappe est désactivée.

## Modes

Définissez `agents.defaults.typingMode` à l'une des valeurs suivantes :

- `never` — aucun indicateur de frappe, jamais.
- `instant` — commencer la frappe **dès que la boucle du modèle démarre**, même si l'exécution
  renvoie ensuite uniquement le jeton de réponse silencieuse.
- `thinking` — commencer la frappe sur la **première delta de raisonnement** (nécessite
  `reasoningLevel: "stream"` pour l'exécution).
- `message` — commencer la frappe sur la **première delta de texte non silencieux** (ignore
  le `NO_REPLY` jeton silencieux).

Ordre de "déclenchement précoce" :
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

- Le mode `message` n'affichera pas la frappe pour les réponses entièrement silencieuses (par ex. le `NO_REPLY`
  jeton utilisé pour supprimer la sortie).
- `thinking` ne se déclenche que si l'exécution diffuse le raisonnement (`reasoningLevel: "stream"`).
  Si le modèle n'émet pas de deltas de raisonnement, la frappe ne commencera pas.
- Les heartbeats n'affichent jamais la frappe, quel que soit le mode.
- `typingIntervalSeconds` contrôle la **cadence de rafraîchissement**, et non l'heure de début.
  La valeur par défaut est de 6 secondes.

import fr from '/components/footer/fr.mdx';

<fr />
