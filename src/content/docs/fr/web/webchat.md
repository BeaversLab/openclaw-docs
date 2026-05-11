---
summary: "Hôte statique Loopback WebChat et utilisation WS Gateway pour l'interface de chat"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

État : l'interface utilisateur de chat SwiftUI macOS/iOS communique directement avec le WebSocket du macOS.

## Qu'est-ce que c'est

- Une interface utilisateur de chat native pour la passerelle (pas de navigateur intégré et pas de serveur statique local).
- Utilise les mêmes sessions et règles de routage que les autres channels.
- Routage déterministe : les réponses reviennent toujours au WebChat.

## Quick start

1. Démarrez la passerelle.
2. Ouvrez l'interface utilisateur du WebChat (application macOS/iOS) ou l'onglet de chat de l'interface utilisateur de contrôle.
3. Assurez-vous qu'un chemin d'authentification de passerelle valide est configuré (secret partagé par défaut, même en boucle locale).

## Fonctionnement (comportement)

- L'interface utilisateur se connecte au WebSocket du Gateway et utilise `chat.history`, `chat.send` et `chat.inject`.
- `chat.history` est limité pour la stabilité : le Gateway peut tronquer les champs de texte longs, omettre les métadonnées volumineuses et remplacer les entrées trop grandes par `[chat.history omitted: message too large]`.
- `chat.history` est également normalisé pour l'affichage : contexte d'exécution uniquement OpenClaw, enveloppes de messages entrants, balises de directive de livraison en ligne telles que `[[reply_to_*]]` et `[[audio_as_voice]]`, payloads XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et blocs d'appel d'outil tronqués), et les jetons de contrôle de modèle ASCII/pleine largeur divulgués sont supprimés du texte visible, et les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply` sont omises.
- Les payloads de réponse marqués comme raisonnement (`isReasoning: true`) sont exclus du contenu de l'assistant WebChat, du texte de relecture de la transcription et des blocs de contenu audio, de sorte que les payloads de réflexion uniquement n'apparaissent pas comme des messages d'assistant visibles ou de l'audio jouable.
- `chat.inject` ajoute une note d'assistant directement à la transcription et la diffuse à l'interface utilisateur (pas d'exécution d'agent).
- Les exécutions abandonnées peuvent garder la sortie partielle de l'assistant visible dans l'interface utilisateur.
- Gateway persiste le texte partiel de l'assistant abandonné dans l'historique des transcriptions lorsqu'une sortie tamponnée existe, et marque ces entrées avec des métadonnées d'abandon.
- L'historique est toujours récupéré auprès de la passerelle (pas de surveillance de fichiers locale).
- Si la passerelle est inaccessible, WebChat est en lecture seule.

## Panneau des outils des agents de l'interface utilisateur de contrôle

- Le panneau Outils `/agents` de l'interface utilisateur de contrôle comporte deux vues distinctes :
  - **Disponible maintenant** utilise `tools.effective(sessionKey=...)` et affiche ce que la session actuelle peut réellement utiliser au moment de l'exécution, y compris les outils principaux, de plugin et détenus par le canal.
  - **Configuration de l'outil** utilise `tools.catalog` et reste concentré sur les profils, les substitutions et
    la sémantique du catalogue.
- La disponibilité lors de l'exécution est limitée à la session. Le changement de session sur le même agent peut modifier la liste **Disponible immédiatement**.
- L'éditeur de configuration n'implique pas la disponibilité à l'exécution ; l'accès effectif suit toujours la priorité de la stratégie
  (`allow`/`deny`, substitutions par agent et provider/channel).

## Utilisation à distance

- Le mode distant tunnellise le WebSocket de la passerelle via SSH/Tailscale.
- Vous n'avez pas besoin d'exécuter un serveur WebChat séparé.

## Référence de configuration (WebChat)

Configuration complète : [Configuration](/fr/gateway/configuration)

Options WebChat :

- `gateway.webchat.chatHistoryMaxChars` : nombre maximum de caractères pour les champs de texte dans les réponses `chat.history`. Lorsqu'une entrée de transcript dépasse cette limite, Gateway tronque les champs de texte longs et peut remplacer les messages trop volumineux par un substitut. Un `maxChars` par requête peut également être envoyé par le client pour remplacer cette valeur par défaut pour un seul appel `chat.history`.

Options globales connexes :

- `gateway.port`, `gateway.bind` : hôte/port WebSocket.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password` :
  authentification WebSocket par secret partagé.
- `gateway.auth.allowTailscale` : l'onglet de chat de l'interface de contrôle du navigateur peut utiliser les en-têtes d'identité Tailscale
  Serve lorsqu'ils sont activés.
- `gateway.auth.mode: "trusted-proxy"` : authentification par reverse proxy pour les clients du navigateur derrière une source proxy **non bouclage** (non-loopback) consciente de l'identité (voir [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password` : passerelle distante cible.
- `session.*` : stockage de session et valeurs par défaut de la clé principale.

## Connexes

- [Interface de contrôle](/fr/web/control-ui)
- [Tableau de bord](/fr/web/dashboard)
