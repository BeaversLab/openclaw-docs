---
title: Refactorisation de la mise en miroir de session sortante (Problème #1520)
description: Suivre les notes, décisions, tests et éléments ouverts de la refactorisation de la mise en miroir de session sortante.
summary: "Notes de refactorisation pour la mise en miroir des envois sortants dans les sessions du channel cible"
read_when:
  - Travailler sur le comportement de mise en miroir de la transcription/session sortante
  - Débogage de la dérivation de sessionKey pour les chemins d'outil d'envoi/message
---

# Refactorisation de la mise en miroir de session sortante (Problème #1520)

## Statut

- En cours.
- Le routage de canal Core + plugin a été mis à jour pour la mise en miroir sortante.
- Gateway send dérive désormais la session cible lorsque sessionKey est omis.

## Contexte

Les envois sortants étaient mis en miroir dans la session de l'agent _actuel_ (clé de session de l'outil) plutôt que dans la session du canal cible. Le routage entrant utilise des clés de session canal/pair, donc les réponses sortantes atterrissaient dans la mauvaise session et les cibles de premier contact manquaient souvent d'entrées de session.

## Objectifs

- Mettre en miroir les messages sortants dans la clé de session du canal cible.
- Créer des entrées de session à la sortie lorsqu'elles sont manquantes.
- Garder la portée des fils de discussion/sujets alignée avec les clés de session entrantes.
- Couvrir les canaux principaux ainsi que les extensions groupées.

## Résumé de la mise en œuvre

- Nouvel assistant de routage de session sortante :
  - `src/infra/outbound/outbound-session.ts`
  - `resolveOutboundSessionRoute` construit le sessionKey cible en utilisant `buildAgentSessionKey` (dmScope + identityLinks).
  - `ensureOutboundSessionEntry` écrit un `MsgContext` minimal via `recordSessionMetaFromInbound`.
- `runMessageAction` (send) dérive le sessionKey cible et le transmet à `executeSendAction` pour la mise en miroir.
- `message-tool` ne met plus directement en miroir ; il ne résout que l'agentId à partir de la clé de session actuelle.
- Le chemin d'envoi du plugin met en miroir via `appendAssistantMessageToSessionTranscript` en utilisant le sessionKey dérivé.
- L'envoi Gateway dérive une clé de session cible lorsqu'aucune n'est fournie (agent par défaut) et assure une entrée de session.

## Gestion des fils de discussion/sujets

- Slack : replyTo/threadId -> `resolveThreadSessionKeys` (suffixe).
- Discord : threadId/replyTo -> `resolveThreadSessionKeys` avec `useSuffix=false` pour correspondre à l'entrant (l'id du channel de thread définit déjà la portée de la session).
- Telegram : les ID de sujet correspondent à `chatId:topic:<id>` via `buildTelegramGroupPeerId`.

## Extensions couvertes

- Matrix, MS Teams, Mattermost, BlueBubbles, Nextcloud Talk, Zalo, Zalo Personal, Nostr, Tlon.
- Notes :
  - Les cibles Mattermost suppriment désormais `@` pour le routage des clés de session DM.
  - Zalo Personnel utilise le type de pair DM pour les cibles 1:1 (groupe uniquement lorsque `group:` est présent).
  - Les cibles de groupe BlueBubbles suppriment les préfixes `chat_*` pour correspondre aux clés de session entrantes.
  - La mise en miroir automatique des fils de discussion Slack fait correspondre les identifiants de canal sans tenir compte de la casse.
  - L'envoi Gateway passe en minuscules les clés de session fournies avant la mise en miroir.

## Décisions

- **Dérivation de session d'envoi Gateway** : si `sessionKey` est fourni, utilisez-le. Si omis, dérivez un sessionKey à partir de la cible + l'agent par défaut et mettez en miroir à cet endroit.
- **Création d'entrée de session** : utilisez toujours `recordSessionMetaFromInbound` avec `Provider/From/To/ChatType/AccountId/Originating*` aligné sur les formats entrants.
- **Normalisation de la cible** : le routage sortant utilise les cibles résolues (post `resolveChannelTarget`) lorsqu'elles sont disponibles.
- **Casse des clés de session** : canonisez les clés de session en minuscules lors de l'écriture et des migrations.

## Tests ajoutés/mis à jour

- `src/infra/outbound/outbound.test.ts`
  - Clé de session de fil Slack.
  - Clé de session de sujet Telegram.
  - dmScope identityLinks avec Discord.
- `src/agents/tools/message-tool.test.ts`
  - Déduit l'agentId de la clé de session (aucune sessionKey transmise).
- `src/gateway/server-methods/send.test.ts`
  - Déduit la clé de session lorsqu'elle est omise et crée une entrée de session.

## Points ouverts / Suivis

- Le plugin d'appel vocal utilise des clés de session personnalisées `voice:<phone>`. La mapping outbound n'est pas standardisée ici ; si le message-tool doit prendre en charge les envois d'appels vocaux, ajoutez un mapping explicite.
- Confirmez si un plugin externe utilise des formats non standard `From/To` au-delà de l'ensemble groupé.

## Fichiers modifiés

- `src/infra/outbound/outbound-session.ts`
- `src/infra/outbound/outbound-send-service.ts`
- `src/infra/outbound/message-action-runner.ts`
- `src/agents/tools/message-tool.ts`
- `src/gateway/server-methods/send.ts`
- Tests dans :
  - `src/infra/outbound/outbound.test.ts`
  - `src/agents/tools/message-tool.test.ts`
  - `src/gateway/server-methods/send.test.ts`

import fr from "/components/footer/fr.mdx";

<fr />
