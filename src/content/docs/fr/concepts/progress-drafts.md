---
summary: "Progress drafts : un message de travail en cours visible qui se met à jour pendant qu'un agent s'exécute"
read_when:
  - Configuring visible progress updates for long-running chat turns
  - Choosing between partial, block, and progress streaming modes
  - Explaining how OpenClaw updates one channel message while work is in progress
  - Troubleshooting progress drafts, standalone progress messages, or finalization fallback
title: "Progress drafts"
---

Les brouillons de progression (progress drafts) donnent vie aux tours d'agent longs dans le chat sans transformer la conversation en une pile de réponses de statut temporaires.

Lorsque les brouillons de progression sont activés, OpenClaw crée un seul message de travail en cours visible seulement après que le tour a prouvé qu'il effectuait un vrai travail, le met à jour pendant que l'agent lit, planifie, appelle des outils ou attend une approbation, puis transforme ce brouillon en la réponse finale lorsque le channel peut le faire en toute sécurité.

```text
Shelling...
📖 from docs/concepts/progress-drafts.md
🔎 Web Search: for "discord edit message"
🛠️ Bash: run tests
```

Utilisez les brouillons de progression lorsque vous voulez un message de statut soigné pendant un travail intensif en outils et la réponse finale lorsque le tour est terminé.

## Quick start

Activez les brouillons de progression par channel avec `streaming.mode: "progress"` :

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
      },
    },
  },
}
```

C'est généralement suffisant. OpenClaw choisira une étiquette automatique d'un mot, attendra que le travail dure au moins cinq secondes ou émette un deuxième événement de travail, ajoutera des lignes de progression compactes pendant qu'un travail utile se produit, et supprimera les bavardages de progression autonomes en double pour ce tour.

## Ce que voient les utilisateurs

Un brouillon de progression comprend deux parties :

| Partie                | Objectif                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Étiquette             | Une courte ligne de démarrage/statut telle que `Thinking...` ou `Shelling...`.                                                |
| Lignes de progression | Mises à jour d'exécution compactes utilisant les mêmes icônes d'outils et le même formateur de détail que la sortie verbeuse. |

L'étiquette apparaît après que l'agent a commencé un travail significatif et soit reste occupé pendant cinq secondes, soit émet un deuxième événement de travail. Elle fait partie de la liste déroulante des lignes de progression, donc l'état de démarrage disparaît une fois que suffisamment de travail concret apparaît. Les réponses en texte brut n'affichent pas de brouillon de progression. Les lignes de progression sont ajoutées uniquement lorsque l'agent émet des mises à jour de travail utiles, par exemple `🛠️ Bash: run tests`, `🔎 Web Search: for "discord edit message"` ou `✍️ Write: to /tmp/file`. Par défaut, ils utilisent le même mode d'explication compact que `/verbose` ; définissez `agents.defaults.toolProgressDetail: "raw"` lors du débogage si vous souhaitez également que les commandes/détails bruts soient ajoutés. La réponse finale remplace le brouillon lorsque c'est possible ; sinon, OpenClaw envoie la réponse finale normalement et nettoie ou arrête de mettre à jour le brouillon en fonction du transport du channel.

## Choisir un mode

`channels.<channel>.streaming.mode` contrôle le comportement visible en cours de progression :

| Mode       | Idéal pour                                   | Ce qui apparaît dans le chat                              |
| ---------- | -------------------------------------------- | --------------------------------------------------------- |
| `off`      | Channels calmes                              | Uniquement la réponse finale.                             |
| `partial`  | Regarder le texte de la réponse apparaître   | Un brouillon édité avec le dernier texte de la réponse.   |
| `block`    | Grands blocs d'aperçu de réponse             | Un aperçu mis à jour ou ajouté par blocs plus importants. |
| `progress` | Tours intensifs en outils ou de longue durée | Un brouillon d'état, puis la réponse finale.              |

Choisissez `progress` lorsque les utilisateurs se soucient davantage de "ce qui se passe" que de regarder le texte de la réponse s'afficher jeton par jeton.

Choisissez `partial` lorsque la réponse elle-même est le signal de progression.

Choisissez `block` lorsque vous souhaitez des mises à jour d'aperçu de brouillon en blocs de texte plus volumineux. Sur Discord et Telegram, `streaming.mode: "block"` est toujours un flux d'aperçu (preview streaming), et non une livraison de bloc normale. Utilisez `streaming.block.enabled` ou l'ancien `blockStreaming` lorsque vous souhaitez des réponses en bloc normales.

## Configurer les étiquettes

Les étiquettes de progression se trouvent sous `channels.<channel>.streaming.progress`.

L'étiquette par défaut est `auto`, qui choisit parmi le pool d'étiquettes intégré de OpenClaw composé d'un seul mot avec des points de suspension :

```text
Thinking...
Shelling...
Scuttling...
Clawing...
Pinching...
Molting...
Bubbling...
Tiding...
Reefing...
Cracking...
Sifting...
Brining...
Nautiling...
Krilling...
Barnacling...
Lobstering...
Tidepooling...
Pearling...
Snapping...
Surfacing...
```

Utiliser une étiquette fixe :

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "Investigating",
        },
      },
    },
  },
}
```

Utilisez votre propre pool d'étiquettes automatiques :

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: "auto",
          labels: ["Checking", "Reading", "Testing", "Finishing"],
        },
      },
    },
  },
}
```

Masquer l'étiquette et afficher uniquement les lignes de progression :

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          label: false,
        },
      },
    },
  },
}
```

## Contrôler les lignes de progression

Les lignes de progression sont activées par défaut en mode progression. Elles proviennent d'événements d'exécution réels : démarrages d'outils, mises à jour d'éléments, plans de tâches, approbations, sorties de commandes, résumés de correctifs et d'autres activités similaires de l'agent.

OpenClaw utilise le même formateur pour les brouillons de progression et `/verbose` :

```json5
{
  agents: {
    defaults: {
      toolProgressDetail: "explain", // explain | raw
    },
  },
}
```

`"explain"` est la valeur par défaut et maintient les brouillons stables avec des étiquettes concises comme `🛠️ check JS syntax for /tmp/app.js`. `"raw"` ajoute la commande/détail sous-jacente lorsqu'elle est disponible, ce qui est utile lors du débogage mais plus bruyant dans le chat.

Par exemple, la même commande apparaît différemment selon le mode de détail :

| Mode      | Ligne de progression                                           |
| --------- | -------------------------------------------------------------- |
| `explain` | `🛠️ check JS syntax for /tmp/app.js`                           |
| `raw`     | `🛠️ check JS syntax for /tmp/app.js, node --check /tmp/app.js` |

Limiter le nombre de lignes visibles :

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          maxLines: 4,
        },
      },
    },
  },
}
```

Les lignes de progression sont compactées automatiquement pour réduire le reflow des bulles de chat pendant que le brouillon est édité.

OpenClaw tronque les longues lignes de progression par défaut afin que les modifications répétées du brouillon ne reviennent pas à la ligne différemment à chaque mise à jour. Le préfixe reste lisible et les détails longs tels que les chemins ou les commandes brutes sont raccourcis par des points de suspension.

Slack peut afficher les lignes de progression sous forme de champs structurés Block Kit au lieu d'un corps de texte unique :

```json5
{
  channels: {
    slack: {
      streaming: {
        mode: "progress",
        progress: {
          render: "rich",
        },
      },
    },
  },
}
```

Le rendu riche conserve le même texte de repli en clair, de sorte que les canaux et clients qui ne prennent pas en charge la forme enrichie peuvent toujours afficher le texte de progression compact.

Garder le brouillon de progression unique mais masquer les lignes d'outils et de tâches :

```json5
{
  channels: {
    discord: {
      streaming: {
        mode: "progress",
        progress: {
          toolProgress: false,
        },
      },
    },
  },
}
```

Avec `toolProgress: false`, OpenClaw supprime toujours les anciens messages de progression d'outils autonomes pour ce tour. Le canal reste visuellement calme jusqu'à la réponse finale, à l'exception de l'étiquette si une est configurée.

## Comportement du channel

Chaque channel utilise le transport le plus propre qu'il prend en charge :

| Channel         | Transport de progression                                  | Notes                                                                                                                      |
| --------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Discord         | Envoyer un message, puis l'éditer.                        | Les modifications finales du texte sont effectuées sur place lorsqu'elles tiennent dans un seul message d'aperçu sécurisé. |
| Matrix          | Envoyer un événement, puis l'éditer.                      | La configuration du streaming au niveau du compte contrôle les brouillons au niveau du compte.                             |
| Microsoft Teams | Le flux natif Teams fonctionne dans les chats personnels. | `streaming.mode: "block"` correspond à la livraison par bloc Teams.                                                        |
| Slack           | Flux natif ou message de brouillon modifiable.            | La disponibilité des fils affecte la possibilité d'utiliser le flux natif.                                                 |
| Telegram        | Envoyer un message, puis le modifier.                     | Les brouillons visibles plus anciens peuvent être remplacés pour que les horodatages finaux restent utiles.                |
| Mattermost      | Message de brouillon modifiable.                          | L'activité des outils est intégrée dans le même message de type brouillon.                                                 |

Les channels sans support d'édition sûr retombent généralement sur les indicateurs de frappe ou une livraison finale uniquement.

## Finalisation

Lorsque la réponse finale est prête, OpenClaw essaie de garder le chat propre :

- Si le brouillon peut devenir sans danger la réponse finale, OpenClaw le modifie sur place.
- Si le channel utilise le flux de progrès natif, OpenClaw finalise ce flux lorsque le transport natif accepte le texte final.
- Si la réponse finale contient des médias, une invite d'approbation, une cible de réponse explicite, trop de fragments, ou si une modification ou un envoi a échoué, OpenClaw envoie la réponse finale via le chemin de livraison normal du channel.

Le chemin de repli est intentionnel. Il vaut mieux envoyer une réponse finale fraîche que de perdre du texte, mal placer une réponse dans un fil, ou écraser un brouillon avec une charge utile que le channel ne peut pas représenter en toute sécurité.

## Dépannage

**Je vois seulement la réponse finale.**

Vérifiez que `channels.<channel>.streaming.mode` est défini sur `progress` pour le compte ou le channel qui a géré le message. Certains chemins de groupe ou de réponse en citation peuvent désactiver les aperçus de brouillon pour un tour lorsque le channel ne peut pas modifier en toute sécurité le bon message.

**Je vois l'étiquette mais pas les lignes d'outil.**

Vérifiez `streaming.progress.toolProgress`. S'il est défini sur `false`, OpenClaw conserve le comportement de brouillon unique mais masque les lignes de progression des outils et des tâches.

**Je vois un message final frais au lieu d'un brouillon modifié.**

C'est un repli de sécurité. Cela peut arriver pour les réponses contenant des médias, les réponses longues, les cibles de réponse explicites, les anciens brouillons Telegram, les cibles de fil Slack manquantes, les messages d'aperçu supprimés, ou une finalisation de flux natif échouée.

**Je vois toujours des messages de progrès autonomes.**

Le mode de progression supprime les messages de progression d'outil autonomes par défaut lorsqu'un brouillon est actif. Si des messages autonomes apparaissent toujours, vérifiez que le tour utilise réellement le mode de progression et non `streaming.mode: "off"` ou un chemin de canal qui ne peut pas créer de brouillon pour ce message.

**Teams se comporte différemment de Discord ou Telegram.**

Microsoft Teams utilise un flux natif dans les chats personnels au lieu du transport de prévisualisation générique d'envoi et de modification. Teams traite également `streaming.mode: "block"` comme une livraison par bloc Teams car il ne dispose pas du même mode de bloc de prévisualisation de brouillon utilisé par Discord et Telegram.

## Connexes

- [Streaming et chunking](/fr/concepts/streaming)
- [Messages](/fr/concepts/messages)
- [Configuration du channel](/fr/gateway/config-channels)
- [Discord](/fr/channels/discord)
- [Matrix](/fr/channels/matrix)
- [Microsoft Teams](/fr/channels/msteams)
- [Slack](/fr/channels/slack)
- [Telegram](/fr/channels/telegram)
