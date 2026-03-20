---
summary: "Questions annexes éphémères avec /btw"
read_when:
  - Vous souhaitez poser une question annexe rapide sur la session en cours
  - Vous implémentez ou déboguez le comportement BTW sur différents clients
title: "Questions annexes BTW"
---

# Questions annexes BTW

`/btw` vous permet de poser une question annexe rapide sur la **session en cours** sans
transformer cette question en un historique de conversation normal.

Il est inspiré du comportement `/btw` de Claude Code, mais adapté à l'architecture
OpenClaw et multi-canal de Gateway.

## Ce qu'il fait

Lorsque vous envoyez :

```text
/btw what changed?
```

OpenClaw :

1. capture le contexte de la session en cours,
2. exécute un appel de modèle distinct **sans outil**,
3. répond uniquement à la question annexe,
4. laisse l'exécution principale tranquille,
5. n'écrit **pas** la question ou la réponse BTW dans l'historique de la session,
6. émet la réponse en tant que **résultat latéral en direct** plutôt que comme un message d'assistant normal.

Le modèle mental important est :

- même contexte de session
- requête latérale unique et séparée
- pas d'appels d'outils
- pas de pollution du contexte futur
- pas de persistance de la transcription

## Ce qu'il ne fait pas

`/btw` ne fait **pas** :

- créer une nouvelle session durable,
- continuer la tâche principale inachevée,
- exécuter des outils ou des boucles d'outils d'agent,
- écrire les données de question/réponse BTW dans l'historique de la transcription,
- apparaître dans `chat.history`,
- survivre à un rechargement.

Il est intentionnellement **éphémère**.

## Fonctionnement du contexte

BTW utilise la session en cours comme **contexte d'arrière-plan uniquement**.

Si l'exécution principale est actuellement active, OpenClaw capture l'état actuel du message
et inclut le prompt principal en cours comme contexte d'arrière-plan, tout en
demandant explicitement au modèle :

- répondre uniquement à la question annexe,
- ne pas reprendre ou terminer la tâche principale inachevée,
- ne pas émettre d'appels d'outils ou de pseudo-appels d'outils.

Cela permet de garder BTW isolé de l'exécution principale tout en le gardant conscient de ce
dont traite la session.

## Modèle de livraison

BTW n'est **pas** livré comme un message de transcription d'assistant normal.

Au niveau du protocole Gateway :

- le chat normal de l'assistant utilise l'événement `chat`
- BTW utilise l'événement `chat.side_result`

Cette séparation est intentionnelle. Si BTW réutilisait le chemin d'événement normal `chat`,
les clients le traiteraient comme un historique de conversation normal.

Comme BTW utilise un événement en direct distinct et n'est pas rejoué depuis `chat.history`, il disparaît après rechargement.

## Comportement en surface

### TUI

Dans TUI, BTW est rendu en ligne dans la vue de session actuelle, mais il reste éphémère :

- visiblement distinct d'une réponse normale de l'assistant
- fermable avec `Enter` ou `Esc`
- non rejoué lors du rechargement

### Canaux externes

Sur des canaux comme Telegram, WhatsApp et Discord, BTW est livré sous la forme d'une réponse unique clairement étiquetée car ces surfaces n'ont pas de concept de superposition éphémère locale.

La réponse est toujours traitée comme un résultat secondaire, et non comme l'historique normal de la session.

### Interface de contrôle / web

Le Gateway émet correctement BTW sous la forme `chat.side_result`, et BTW n'est pas inclus dans `chat.history`, donc le contrat de persistance est déjà correct pour le web.

L'interface de contrôle actuelle a encore besoin d'un consommateur dédié `chat.side_result` pour afficher BTW en direct dans le navigateur. Jusqu'à ce que ce support côté client soit implémenté, BTW est une fonctionnalité de niveau Gateway avec un comportement complet sur TUI et les canaux externes, mais pas encore une expérience utilisateur navigateur complète.

## Quand utiliser BTW

Utilisez `/btw` lorsque vous voulez :

- une clarification rapide sur le travail en cours,
- une réponse secondaire factuelle pendant qu'une tâche longue est toujours en cours,
- une réponse temporaire qui ne doit pas faire partie du futur contexte de la session.

Exemples :

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## Quand ne pas utiliser BTW

N'utilisez pas `/btw` lorsque vous voulez que la réponse fasse partie du futur contexte de travail de la session.

Dans ce cas, demandez normalement dans la session principale au lieu d'utiliser BTW.

## Connexes

- [Commandes slash](/fr/tools/slash-commands)
- [Niveaux de réflexion](/fr/tools/thinking)
- [Session](/fr/concepts/session)

import fr from "/components/footer/fr.mdx";

<fr />
