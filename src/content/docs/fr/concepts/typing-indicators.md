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
- **Exécutions de heartbeat** : la saisie commence lorsque l'exécution du heartbeat commence si la cible de heartbeat résolue est un chat capable de saisie et que la saisie n'est pas désactivée.

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

- Le mode `message` n'affichera pas la saisie pour les réponses silencieuses lorsque la
  charge utile entière est le jeton silencieux exact (par exemple `NO_REPLY` / `no_reply`,
  correspondance insensible à la casse).
- `thinking` ne se déclenche que si l'exécution diffuse le raisonnement (`reasoningLevel: "stream"`).
  Si le modèle n'émet pas de deltas de raisonnement, la saisie ne démarrera pas.
- La saisie de heartbeat est un signal de présence pour la cible de livraison résolue. Elle commence au début de l'exécution du heartbeat au lieu de suivre le `message` ou la durée du flux `thinking`. Définissez `typingMode: "never"` pour la désactiver.
- Les heartbeats n'affichent pas de saisie lorsque `target: "none"`, lorsque la cible ne peut pas être résolue, lorsque la livraison par chat est désactivée pour le heartbeat, ou lorsque le channel ne prend pas en charge la saisie.
- `typingIntervalSeconds` contrôle la **cadence de rafraîchissement**, et non l'heure de début. La valeur par défaut est 6 secondes.
