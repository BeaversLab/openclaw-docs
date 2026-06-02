---
doc-schema-version: 1
summary: "TUIObjectifs de session : objectifs durables par session, commandes /goal, outils d'objectifs du modèle, budgets de jetons et statut TUI"
read_when:
  - You want OpenClaw to keep one objective visible across a long session
  - You need to pause, resume, block, complete, or clear a session goal
  - You want to understand the get_goal, create_goal, and update_goal tools
  - You want to see how goals appear in the TUI
title: "Goal"
---

# Goal

Un **goal** est un objectif durable attaché à la session OpenClaw actuelle.
Il donne à l'agent et à l'opérateur une cible commune pour le travail de longue durée,
sans transformer cette cible en tâche d'arrière-plan, rappel, tâche cron ou
ordre permanent.

Les objectifs sont des états de session. Ils se déplacent avec la clé de session, survivent aux redémarrages de processus,
apparaissent dans `/goal`, sont disponibles pour le modèle via les outils
d'objectif, et apparaissent dans le pied de page de la TUI lorsque la session active en possède un.

## Quick start

Définir un objectif :

```text
/goal start get CI green for PR 87469 and push the fix
```

Vérifier :

```text
/goal
```

Mettre en pause lorsque le travail est délibérément en attente :

```text
/goal pause waiting for CI
```

Reprendre :

```text
/goal resume
```

Marquer comme terminé :

```text
/goal complete pushed and verified
```

Effacer :

```text
/goal clear
```

## À quoi servent les objectifs

Utilisez un objectif lorsqu'une session a un résultat concret qui doit rester visible
sur plusieurs tours :

- Une clôture de PR : corriger, vérifier, auto-réviser, pousser, et ouvrir ou mettre à jour la PR.
- Une exécution de débogage : reproduire le bogue, identifier la surface propriétaire, corriger et prouver
  le correctif.
- Une révision de docs : lire les docs pertinents, écrire la nouvelle page, créer des liens croisés et
  vérifier la construction des docs.
- Une tâche de maintenance : inspecter l'état actuel, apporter des modifications délimitées, exécuter les bonnes
  vérifications et signaler ce qui a changé.

Un objectif n'est pas une file d'attente de tâches. Utilisez [Task Flow](/fr/automation/taskflow),
[tâches](/fr/automation/tasks), [cron jobs](/fr/automation/cron-jobs) ou
[ordres permanents](/fr/automation/standing-orders) lorsque le travail doit être exécuté en détachement,
se répéter selon un calendrier, se diviser en sous-travaux gérés ou persister sous forme de stratégie.

## Référence des commandes

`/goal` sans arguments affiche le résumé de l'objectif actuel :

```text
Goal
Status: active
Objective: get CI green for PR 87469 and push the fix
Tokens used: 12k
Token budget: 12k/50k

Commands: /goal pause, /goal complete, /goal clear
```

Commandes :

- `/goal` ou `/goal status` affiche l'objectif actuel.
- `/goal start <objective>` crée un nouvel objectif pour la session actuelle.
- `/goal set <objective>` et `/goal create <objective>` sont des alias pour
  `start`.
- `/goal pause [note]` met en pause un objectif actif.
- `/goal resume [note]` reprend un objectif en pause, bloqué, limité par l'utilisation ou
  limité par le budget.
- `/goal complete [note]` marque l'objectif comme atteint.
- `/goal done [note]` est un alias pour `complete`.
- `/goal block [note]` marque l'objectif comme bloqué.
- `/goal blocked [note]` est un alias pour `block`.
- `/goal clear` supprime l'objectif de la session.

Un seul objectif peut exister dans une session à la fois. Le démarrage d'un deuxième objectif échoue
jusqu'à ce que l'actuel soit effacé.

## Statuts

Les objectifs utilisent un petit ensemble de statuts :

- `active` : la session poursuit l'objectif.
- `paused` : l'opérateur a mis l'objectif en pause ; `/goal resume` le rend actif à nouveau.
- `blocked` : l'agent ou l'opérateur a signalé un véritable blocage ; `/goal resume`
  le rend actif à nouveau lorsque de nouvelles informations ou un nouvel état sont disponibles.
- `budget_limited` : le budget de jetons configuré a été atteint ; `/goal resume`
  relance la poursuite à partir du même objectif.
- `usage_limited` : réservé aux états d'arrêt limités par l'utilisation ; `/goal resume`
  relance la poursuite lorsque cela est autorisé.
- `complete` : l'objectif a été atteint. Les objectifs terminés sont finaux ; utilisez
  `/goal clear` avant de commencer un autre objectif.

`/new` et `/reset` effacent l'objectif de session actuel car ils lancent intentionnellement
un contexte de session frais.

## Budgets de jetons

Les objectifs peuvent avoir un budget de jetons positif facultatif. Le budget est stocké avec l'objectif
et mesuré à partir du nombre de jetons frais de la session au moment de la création. Si la session actuelle
ne dispose que de jetons périmés ou d'une utilisation inconnue au démarrage de l'objectif,
OpenClaw attend la prochaine instantanée de jetons de session frais et l'utilise comme
de base, de sorte que les jetons dépensés avant l'existence de l'objectif ne sont pas imputés à ce dernier.

Lorsque l'utilisation des jetons atteint le budget, l'objectif passe à `budget_limited`. Cela
ne supprime pas l'objectif ni n'efface l'objectif visé. Cela indique à l'opérateur et à
l'agent que l'objectif n'est plus activement poursuivi jusqu'à ce qu'il soit repris ou
effacé.

Les budgets de jetons sont un garde-fou pour les objectifs de session, et non une limite de facturation. Les quotas de fournisseur, les rapports de coûts et le comportement de la fenêtre contextuelle utilisent toujours les contrôles d'utilisation et de modèle normaux d'OpenClaw.

## Outils du modèle

OpenClaw expose trois outils principaux d'objectif aux harnais d'agents :

- `get_goal` : lire l'objectif de la session actuelle, y compris le statut, l'objectif, l'utilisation des jetons et le budget de jetons.
- `create_goal` : créer un objectif uniquement lorsque l'utilisateur, le système ou les instructions du développeur en demandent un explicitement. Cela échoue si la session a déjà un objectif.
- `update_goal` : marquer l'objectif `complete` ou `blocked`.

Le modèle ne peut pas mettre en pause, reprendre, effacer ou remplacer silencieusement un objectif. Ce sont des contrôles de l'opérateur/session via `/goal` et les commandes de réinitialisation. Cela empêche l'agent de déplacer silencieusement la cible tout en préservant un chemin propre pour que l'agent puisse signaler une réalisation ou un véritable blocage.

L'outil `update_goal` doit marquer un objectif `complete` uniquement lorsque l'objectif est réellement atteint. Il doit marquer un objectif `blocked` uniquement lorsque la même condition bloquante s'est répétée et que l'agent ne peut pas progresser de manière significative sans une nouvelle entrée de l'utilisateur ou un changement d'état externe.

## TUI

Le TUI maintient l'objectif de la session active visible dans le pied de page, à côté de l'agent, de la session, du modèle, des contrôles d'exécution et des compteurs de jetons.

Exemples de pied de page :

- `Pursuing goal (12k/50k)` pour un objectif actif avec un budget de jetons.
- `Goal paused (/goal resume)` pour un objectif en pause.
- `Goal blocked (/goal resume)` pour un objectif bloqué.
- `Goal hit usage limits (/goal resume)` pour un objectif limité par l'utilisation.
- `Goal unmet (50k/50k)` pour un objectif limité par le budget.
- `Goal achieved (42k)` pour un objectif terminé.

Le pied de page est intentionnellement compact. Utilisez `/goal` pour voir l'objectif complet, la note, le budget de jetons et les commandes disponibles.

## Comportement du canal

La commande `/goal` fonctionne dans les sessions OpenClaw compatibles avec les commandes, y compris les interfaces TUI et les surfaces de chat qui permettent les commandes texte. L'état de l'objectif est attaché à la clé de session, et non au transport. Si deux surfaces utilisent la même session, elles voient le même objectif.

L'état de l'objectif n'est pas une directive de livraison. Il ne force pas les réponses via un canal, ne modifie pas le comportement de la file d'attente, n'approuve pas les outils, ni ne planifie le travail.

## Dépannage

`Goal error: goal already exists` signifie que la session a déjà un objectif. Utilisez `/goal` pour l'inspecter, `/goal complete` s'il est terminé, ou `/goal clear` avant de commencer un autre objectif.

`Goal error: goal not found` signifie que la session n'a pas encore d'objectif. Commencez-en un avec `/goal start <objective>`.

`Goal error: goal is already complete` signifie que l'objectif est terminal. Effacez-le avant de commencer ou de reprendre un autre objectif.

Si l'utilisation des jetons semble `0` ou obsolète, la session active peut ne pas avoir encore d'instantané de jetons frais. L'utilisation s'actualise à mesure que OpenClaw enregistre l'utilisation de la session et les totaux dérivés de la transcription.

## Connexes

- [Commandes slash](/fr/tools/slash-commands)
- [TUI](/fr/web/tui)
- [Outil Session](/fr/concepts/session-tool)
- [Compactage](/fr/concepts/compaction)
- [Flux de tâches](/fr/automation/taskflow)
- [Ordres permanents](/fr/automation/standing-orders)
