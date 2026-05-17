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

- `never` - aucun indicateur de frappe, jamais.
- `instant` - commencer à taper **dès que la boucle du modèle commence**, même si l'exécution
  renvoie ultérieurement uniquement le jeton de réponse silencieux.
- `thinking` - commencer à taper lors de la **première différence de raisonnement** (requiert
  `reasoningLevel: "stream"` pour l'exécution).
- `message` - commencer à taper lors de la **première différence de texte non silencieuse** (ignore
  le jeton silencieux `NO_REPLY`).

Ordre de « rapidité de déclenchement » :
`never` → `message` → `thinking` → `instant`

## Configuration

Définir la valeur par défaut au niveau de l'agent :

```json5
{
  agents: {
    defaults: {
      typingMode: "thinking",
      typingIntervalSeconds: 6,
    },
  },
}
```

Remplacer le mode ou la cadence par session :

```json5
{
  session: {
    typingMode: "message",
    typingIntervalSeconds: 4,
  },
}
```

## Notes

- Le mode `message` n'affichera pas la saisie pour les réponses entièrement silencieuses lorsque la charge utile entière est le jeton silencieux exact (par exemple `NO_REPLY` / `no_reply`, correspondance insensible à la casse).
- `thinking` ne se déclenche que si l'exécution diffuse le raisonnement (`reasoningLevel: "stream"`). Si le modèle n'émet pas de deltas de raisonnement, la saisie ne commencera pas.
- La saisie par pulsation (heartbeat) est un signal de vivacité pour la cible de livraison résolue. Elle commence au démarrage de l'exécution de la pulsation au lieu de suivre le calendrier de diffusion de `message` ou `thinking`. Définissez `typingMode: "never"` pour la désactiver.
- Les pulsations n'affichent pas la saisie lors de `target: "none"`, lorsque la cible ne peut pas être résolue, lorsque la livraison par chat est désactivée pour la pulsation, ou lorsque le channel ne prend pas en charge la saisie.
- `typingIntervalSeconds` contrôle la **cadence de rafraîchissement**, et non l'heure de début. La valeur par défaut est de 6 secondes.

## Connexes

<CardGroup cols={2}>
  <Card title="Présence" href="/fr/concepts/presence" icon="signal">
    Comment le Gateway suit les clients connectés et les affiche dans l'onglet Instances de macOS.
  </Card>
  <Card title="Streaming et découpage" href="/fr/concepts/streaming" icon="bars-staggered">
    Comportement de diffusion sortant, limites des blocs et livraison spécifique au channel.
  </Card>
</CardGroup>
