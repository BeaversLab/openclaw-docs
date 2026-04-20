---
summary: "Hôte statique Loopback WebChat et utilisation WS Gateway pour l'interface de chat"
read_when:
  - Debugging or configuring WebChat access
title: "WebChat"
---

# WebChat (Interface utilisateur WebSocket Gateway)

Statut : l'interface de conversation SwiftUI macOS/iOS communique directement avec le WebSocket Gateway.

## Présentation

- Une interface de conversation native pour la passerelle (pas de navigateur intégré et pas de serveur statique local).
- Utilise les mêmes sessions et règles de routage que les autres canaux.
- Routage déterministe : les réponses reviennent toujours à WebChat.

## Démarrage rapide

1. Démarrez la passerelle.
2. Ouvrez l'interface utilisateur WebChat (application macOS/iOS) ou l'onglet de conversation de l'interface de contrôle.
3. Assurez-vous qu'un chemin d'authentification de passerelle valide est configuré (secret partagé par défaut, même en boucle locale).

## Fonctionnement (comportement)

- L'interface utilisateur se connecte au WebSocket Gateway et utilise `chat.history`, `chat.send` et `chat.inject`.
- `chat.history` est limité pour la stabilité : Gateway peut tronquer les champs de texte longs, omettre les métadonnées lourdes et remplacer les entrées trop volumineuses par `[chat.history omitted: message too large]`.
- `chat.history` est également normalisé pour l'affichage : les balises de directive de livraison en ligne telles que `[[reply_to_*]]` et `[[audio_as_voice]]`, les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>` et les blocs d'appel d'outil tronqués) et les jetons de contrôle de modèle ASCII/pleine largeur fuités sont supprimés du texte visible, et les entrées de l'assistant dont tout le texte visible n'est que le jeton silencieux exact `NO_REPLY` / `no_reply` sont omises.
- `chat.inject` ajoute une note d'assistant directement à la transcription et la diffuse à l'interface utilisateur (pas d'exécution d'agent).
- Les exécutions abandonnées peuvent garder la sortie partielle de l'assistant visible dans l'interface utilisateur.
- Gateway persiste le texte partiel de l'assistant abandonné dans l'historique des transcriptions lorsqu'une sortie tamponnée existe, et marque ces entrées avec des métadonnées d'abandon.
- L'historique est toujours récupéré auprès de la passerelle (pas de surveillance de fichiers locale).
- Si la passerelle est inaccessible, WebChat est en lecture seule.

## Panneau des outils des agents de l'interface utilisateur de contrôle

- Le panneau d'outils `/agents` de l'interface utilisateur de contrôle possède deux vues distinctes :
  - **Disponible immédiatement** utilise `tools.effective(sessionKey=...)` et affiche ce que la session actuelle peut réellement utiliser au moment de l'exécution, y compris les outils principaux, de plugin et détenus par le canal.
  - **Configuration des outils** utilise `tools.catalog` et reste concentré sur les profils, les remplacements et la sémantique du catalogue.
- La disponibilité lors de l'exécution est limitée à la session. Le changement de session sur le même agent peut modifier la liste **Disponible immédiatement**.
- L'éditeur de configuration n'implique pas la disponibilité lors de l'exécution ; l'accès effectif suit toujours la priorité de la stratégie (`allow`/`deny`, remplacements par agent et fournisseur/canal).

## Utilisation à distance

- Le mode distant tunnellise le WebSocket de la passerelle via SSH/Tailscale.
- Vous n'avez pas besoin d'exécuter un serveur WebChat séparé.

## Référence de configuration (WebChat)

Configuration complète : [Configuration](/fr/gateway/configuration)

Options WebChat :

- `gateway.webchat.chatHistoryMaxChars` : nombre maximal de caractères pour les champs de texte dans les réponses `chat.history`. Lorsqu'une entrée de transcription dépasse cette limite, Gateway tronque les champs de texte longs et peut remplacer les messages trop volumineux par un espace réservé. Un `maxChars` par requête peut également être envoyé par le client pour remplacer cette valeur par défaut pour un seul appel `chat.history`.

Options globales connexes :

- `gateway.port`, `gateway.bind` : hôte/port WebSocket.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password` :
  authentification WebSocket par secret partagé.
- `gateway.auth.allowTailscale` : l'onglet de chat de l'interface de contrôle du navigateur peut utiliser les en-têtes d'identité Tailscale
  Serve lorsqu'il est activé.
- `gateway.auth.mode: "trusted-proxy"` : authentification par proxy inverse pour les clients navigateurs situés derrière une source proxy **non bouclage** (non-loopback) consciente de l'identité (voir [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password` : cible de passerelle distante.
- `session.*` : stockage de session et valeurs par défaut de la clé principale.
