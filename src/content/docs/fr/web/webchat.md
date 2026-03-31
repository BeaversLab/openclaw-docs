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
3. Assurez-vous que l'authentification de la passerelle est configurée (requise par défaut, même en boucle locale).

## Fonctionnement (comportement)

- L'interface utilisateur se connecte au WebSocket Gateway et utilise `chat.history`, `chat.send` et `chat.inject`.
- `chat.history` est limité pour la stabilité : Gateway peut tronquer les champs de texte longs, omettre les métadonnées lourdes et remplacer les entrées trop volumineuses par `[chat.history omitted: message too large]`.
- `chat.inject` ajoute une note d'assistant directement à la transcription et la diffuse à l'interface utilisateur (pas d'exécution d'agent).
- Les exécutions abandonnées peuvent garder la sortie partielle de l'assistant visible dans l'interface utilisateur.
- Gateway enregistre le texte partiel de l'assistant abandonné dans l'historique des transcriptions lorsqu'une sortie tamponnée existe, et marque ces entrées avec des métadonnées d'abandon.
- L'historique est toujours récupéré depuis la passerelle (pas de surveillance de fichiers locaux).
- Si la passerelle est inaccessible, WebChat est en lecture seule.

## Panneau des outils des agents de l'interface de contrôle

- Le panneau Outils de l'`/agents` de l'interface de contrôle présente deux vues distinctes :
  - **Disponible maintenant** utilise `tools.effective(sessionKey=...)` et affiche ce que la session actuelle peut réellement utiliser lors de l'exécution, y compris les outils principaux, les plugins et ceux appartenant au canal.
  - **Configuration des outils** utilise `tools.catalog` et se concentre sur les profils, les remplacements et la sémantique du catalogue.
- La disponibilité lors de l'exécution est limitée à la session. Le changement de session sur le même agent peut modifier la liste **Disponible maintenant**.
- L'éditeur de configuration n'implique pas la disponibilité lors de l'exécution ; l'accès effectif suit toujours la priorité de la stratégie (`allow`/`deny`, remplacements par agent et par fournisseur/canal).

## Utilisation à distance

- Le mode distant tunnellise le WebSocket de la passerelle via SSH/Tailscale.
- Vous n'avez pas besoin d'exécuter un serveur WebChat distinct.

## Référence de configuration (WebChat)

Configuration complète : [Configuration](/en/gateway/configuration)

Options de canal :

- Aucun bloc `webchat.*` dédié. WebChat utilise le point de terminaison de la passerelle et les paramètres d'authentification ci-dessous.

Options globales connexes :

- `gateway.port`, `gateway.bind` : hôte/port WebSocket.
- `gateway.auth.mode`, `gateway.auth.token`, `gateway.auth.password` : authentification WebSocket (jeton/mot de passe).
- `gateway.auth.mode: "trusted-proxy"` : authentification par proxy inverse pour les clients navigateur (voir [Authentification de proxy approuvé](/en/gateway/trusted-proxy-auth)).
- `gateway.remote.url`, `gateway.remote.token`, `gateway.remote.password` : cible de la passerelle distante.
- `session.*` : stockage de session et valeurs par défaut de la clé principale.
