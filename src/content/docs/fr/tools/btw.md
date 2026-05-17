---
summary: "Questions annexes éphémères avec /btw"
read_when:
  - You want to ask a quick side question about the current session
  - You are implementing or debugging BTW behavior across clients
title: "Questions annexes BTW"
---

`/btw` vous permet de poser une question rapide sur la **session actuelle** sans transformer cette question en un historique de conversation normal. `/side` est un alias.

Il est basé sur le comportement `/btw` de Claude Code, mais adapté à l'architecture OpenClaw Gateway et multi-channel.

## Ce qu'elle fait

Lorsque vous envoyez :

```text
/btw what changed?
```

OpenClaw :

1. capture le contexte de la session actuelle,
2. exécute une requête latérale éphémère distincte,
3. répond uniquement à la question annexe,
4. laisse l'exécution principale tranquille,
5. n'écrit **pas** la question ou la réponse BTW dans l'historique de la session,
6. émet la réponse comme un **résultat latéral en direct** plutôt que comme un message d'assistant normal.

Le modèle mental important est :

- même contexte de session
- requête latère unique et distincte
- le même transport de harnais natif lorsque la session utilise un harnais natif
- pas de pollution du contexte futur
- pas de persistance de la transcription

Pour les sessions de harnais Codex, BTW reste à l'intérieur de Codex en forkant le thread
actuel du serveur d'application en tant que thread latéral éphémère. Cela permet de conserver le OAuth Codex
et le comportement du thread natif intacts tout en isolant la réponse latérale de la transcription
parente. Comme le `/side` de Codex, le thread latéral conserve les autorisations Codex
actuelles et la surface de l'outil natif, avec des garde-fous indiquant au modèle de ne pas
considérer le travail hérité du thread parent comme des instructions actives. Les runtimes
non-Codex conservent l'ancien chemin direct à tir unique.

## Ce qu'il ne fait pas

`/btw` ne fait **pas** :

- créer une nouvelle session durable,
- continuer la tâche principale inachevée,
- écrire les données de question/réponse BTW dans l'historique de la transcription,
- apparaître dans `chat.history`,
- survivre à un rechargement.

Elle est intentionnellement **éphémère**.

## Fonctionnement du contexte

BTW utilise la session actuelle comme **contexte d'arrière-plan uniquement**.

Si l'exécution principale est actuellement active, OpenClaw capture l'état actuel des messages et inclut la requête principale en cours comme contexte d'arrière-plan, tout en disant explicitement au model :

- répondre uniquement à la question annexe,
- ne pas reprendre ou terminer la tâche principale inachevée,
- ne font pas dériver la conversation parente.

Cela permet de garder BTW isolé de l'exécution principale tout en le rendant conscient de ce dont traite la session.

## Modèle de livraison

BTW n'est **pas** livré comme un message de transcription d'assistant normal.

Au niveau du protocole Gateway :

- le chat normal de l'assistant utilise l'événement `chat`
- BTW utilise l'événement `chat.side_result`

Cette séparation est intentionnelle. Si BTW réutilisait le chemin normal de l'événement `chat`,
les clients le traiteraient comme l'historique de conversation normal.

Parce que BTW utilise un événement en direct distinct et n'est pas rejoué à partir de
`chat.history`, il disparaît après le rechargement.

## Comportement de surface

### TUI

Dans TUI, BTW est rendu en ligne dans la vue de la session actuelle, mais il reste
éphémère :

- visiblement distinct d'une réponse normale de l'assistant
- peut être rejeté avec `Enter` ou `Esc`
- non rejoué lors du rechargement

### Canaux externes

Sur des canaux comme Telegram, WhatsApp et Discord, BTW est délivré sous la forme d'une
réponse ponctuelle clairement étiquetée car ces surfaces n'ont pas de concept
local de superposition éphémère.

La réponse est toujours traitée comme un résultat secondaire, et non comme l'historique normal de la session.

### Interface de contrôle / web

Le Gateway émet correctement BTW en tant que `chat.side_result`, et BTW n'est pas inclus
dans `chat.history`, le contrat de persistance est donc déjà correct pour le web.

L'interface de contrôle actuelle a toujours besoin d'un consommateur dédié `chat.side_result` pour
afficher BTW en direct dans le navigateur. Jusqu'à ce que ce support côté client soit ajouté, BTW est une
fonctionnalité de niveau Gateway avec un comportement complet de TUI et de canal externe, mais pas encore
une expérience utilisateur navigateur complète.

## Quand utiliser BTW

Utilisez `/btw` lorsque vous voulez :

- une clarification rapide sur le travail en cours,
- une réponse factuelle secondaire pendant qu'une exécution longue est toujours en cours,
- une réponse temporaire qui ne doit pas faire partie du futur contexte de la session.

Exemples :

```text
/btw what file are we editing?
/side what changed while the main run continued?
/btw what does this error mean?
/btw summarize the current task in one sentence
/btw what is 17 * 19?
```

## Quand ne pas utiliser BTW

N'utilisez pas `/btw` lorsque vous voulez que la réponse fasse partie du contexte
de travail futur de la session.

Dans ce cas, posez la question normalement dans la session principale au lieu d'utiliser BTW.

## Connexes

<CardGroup cols={2}>
  <Card title="Commandes slash" href="/fr/tools/slash-commands" icon="terminal">
    Catalogue de commandes natives et directives de chat.
  </Card>
  <Card title="Niveaux de réflexion" href="/fr/tools/thinking" icon="brain">
    Niveaux d'effort de raisonnement pour l'appel au modèle de question secondaire.
  </Card>
  <Card title="Session" href="/fr/concepts/session" icon="comments">
    Clés de session, historique et sémantique de persistance.
  </Card>
  <Card title="Steer command" href="/fr/tools/steer" icon="arrow-right">
    Injecter un message de pilotage dans l'exécution active sans la terminer.
  </Card>
</CardGroup>
