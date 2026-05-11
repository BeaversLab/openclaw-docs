---
summary: "Questions annexes éphémères avec /btw"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "Questions annexes BTW"
---

`/btw` vous permet de poser une question annexe rapide sur la **session actuelle** sans transformer cette question en historique de conversation normal.

Elle est basée sur le comportement `/btw` de Claude Code, mais adaptée à l'architecture de la OpenClaw et multi-canal de Gateway.

## Ce qu'elle fait

Lorsque vous envoyez :

```text
/btw what changed?
```

OpenClaw :

1. capture le contexte de la session actuelle,
2. exécute un appel de **model** distinct sans outil,
3. répond uniquement à la question annexe,
4. laisse l'exécution principale tranquille,
5. n'écrit **pas** la question ou la réponse BTW dans l'historique de la session,
6. émet la réponse comme un **résultat latéral en direct** plutôt que comme un message d'assistant normal.

Le modèle mental important est :

- même contexte de session
- requête latère unique et distincte
- pas d'appels d'outil
- pas de pollution du contexte futur
- pas de persistance de la transcription

## Ce qu'elle ne fait pas

`/btw` ne fait **pas** :

- créer une nouvelle session durable,
- continuer la tâche principale inachevée,
- exécuter des outils ou des boucles d'outils d'agent,
- écrire les données de question/réponse BTW dans l'historique de la transcription,
- apparaître dans `chat.history`,
- survivre à un rechargement.

Elle est intentionnellement **éphémère**.

## Fonctionnement du contexte

BTW utilise la session actuelle comme **contexte d'arrière-plan uniquement**.

Si l'exécution principale est actuellement active, OpenClaw capture l'état actuel des messages et inclut la requête principale en cours comme contexte d'arrière-plan, tout en disant explicitement au model :

- répondre uniquement à la question annexe,
- ne pas reprendre ou terminer la tâche principale inachevée,
- ne pas émettre d'appels d'outils ou de pseudo-appels d'outils.

Cela permet de garder BTW isolé de l'exécution principale tout en le rendant conscient de ce dont traite la session.

## Modèle de livraison

BTW n'est **pas** livré comme un message de transcription d'assistant normal.

Au niveau du protocole Gateway :

- la discussion normale avec l'assistant utilise l'événement `chat`
- BTW utilise l'événement `chat.side_result`

Cette séparation est intentionnelle. Si BTW réutilisait le chemin d'événement normal `chat`, les clients le traiteraient comme un historique de conversation normal.

Parce que BTW utilise un événement en direct distinct et n'est pas rejoué depuis `chat.history`, il disparaît après rechargement.

## Comportement de surface

### TUI

Dans TUI, BTW est rendu en ligne dans la vue de la session actuelle, mais il reste
éphémère :

- visiblement distinct d'une réponse normale de l'assistant
- révocable avec `Enter` ou `Esc`
- non rejoué lors du rechargement

### Canaux externes

Sur des canaux comme Telegram, WhatsApp et Discord, BTW est délivré sous la forme d'une
réponse ponctuelle clairement étiquetée car ces surfaces n'ont pas de concept
local de superposition éphémère.

La réponse est toujours traitée comme un résultat secondaire, et non comme l'historique normal de la session.

### Interface de contrôle / web

Le Gateway émet BTW correctement sous la forme `chat.side_result`, et BTW n'est pas inclus
dans `chat.history`, le contrat de persistance est donc déjà correct pour le web.

L'interface de contrôle actuelle a toujours besoin d'un consommateur dédié `chat.side_result` pour
afficher BTW en direct dans le navigateur. jusqu'à ce que ce support côté client soit intégré, BTW est une
fonctionnalité de niveau Gateway avec un comportement complet sur TUI et les canaux externes, mais pas encore
une expérience utilisateur complète sur le navigateur.

## Quand utiliser BTW

Utilisez `/btw` lorsque vous souhaitez :

- une clarification rapide sur le travail en cours,
- une réponse factuelle secondaire pendant qu'une exécution longue est toujours en cours,
- une réponse temporaire qui ne doit pas faire partie du futur contexte de la session.

Exemples :

```text
/btw what file are we editing?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## Quand ne pas utiliser BTW

N'utilisez pas `/btw` si vous voulez que la réponse fasse partie du futur
contexte de travail de la session.

Dans ce cas, posez la question normalement dans la session principale au lieu d'utiliser BTW.

## Connexes

- [Commandes slash](/fr/tools/slash-commands)
- [Niveaux de réflexion](/fr/tools/thinking)
- [Session](/fr/concepts/session)
