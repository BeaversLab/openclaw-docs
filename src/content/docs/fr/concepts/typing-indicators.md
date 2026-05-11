---
summary: "Quand OpenClaw affiche les indicateurs de frappe et comment les régler"
read_when:
  - Changing typing indicator behavior or defaults
title: "Indicateurs de frappe"
---

Les indicateurs de frappe sont envoyés au channel de discussion pendant qu'une exécution est active. Utilisez
`agents.defaults.typingMode` pour contrôler **quand** la frappe commence et `typingIntervalSeconds`
pour contrôler **la fréquence** de son actualisation.

## Valeurs par défaut

Lorsque `agents.defaults.typingMode` est **non défini**, OpenClaw conserve le comportement hérité :

- **Discussions directes** : la frappe commence immédiatement dès que la boucle du model démarre.
- **Discussions de groupe avec une mention** : la frappe commence immédiatement.
- **Discussions de groupe sans mention** : la frappe commence uniquement lorsque le texte du message commence à être diffusé.
- **Exécutions de heartbeat** : la frappe commence lorsque l'exécution du heartbeat commence si la
  cible de heartbeat résolue est une discussion capable de frappe et si la frappe n'est pas désactivée.

## Modes

Définissez `agents.defaults.typingMode` sur l'une des valeurs suivantes :

- `never` — aucun indicateur de frappe, jamais.
- `instant` — commence à taper **dès que la boucle du model démarre**, même si l'exécution
  renvoie ultérieurement uniquement le jeton de réponse silencieux.
- `thinking` — commence à taper sur la **première différence de raisonnement** (requiert
  `reasoningLevel: "stream"` pour l'exécution).
- `message` — commence à taper sur la **première différence de texte non silencieuse** (ignore
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

- Le mode `message` n'affichera pas la frappe pour les réponses entièrement silencieuses lorsque la
  charge utile entière correspond exactement au jeton silencieux (par exemple `NO_REPLY` / `no_reply`,
  correspondance insensible à la casse).
- `thinking` ne se déclenche que si l'exécution diffuse le raisonnement (`reasoningLevel: "stream"`).
  Si le model n'émet pas de différences de raisonnement, la frappe ne commencera pas.
- La frappe heartbeat est un signal de vivacité pour la cible de livraison résolue. Elle
  commence au démarrage de l'exécution du heartbeat au lieu de suivre le `message` ou le `thinking`
  de diffusion du flux. Définissez `typingMode: "never"` pour la désactiver.
- Les signaux de présence (heartbeats) n'affichent pas la frappe lorsque `target: "none"`, lorsque la cible ne peut pas être résolue, lorsque la livraison du chat est désactivée pour le signal de présence, ou lorsque le channel ne prend pas en charge la frappe.
- `typingIntervalSeconds` contrôle la **cadence de rafraîchissement**, et non l'heure de début. La valeur par défaut est de 6 secondes.

## Connexes

- [Présence](/fr/concepts/presence)
- [Streaming et découpage en morceaux](/fr/concepts/streaming)
