---
summary: "Comment l'application mac intègre le WebChat et comment la déboguer"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

# WebChat (application macOS)

L'application de la barre de menus macOS intègre l'interface utilisateur WebChat en tant que vue native SwiftUI. Elle se connecte au Gateway et utilise par défaut la **session principale** pour l'agent sélectionné (avec un sélecteur de session pour les autres sessions).

- **Mode local** : se connecte directement au WebSocket du Gateway local.
- **Mode distant** : transfère le port de contrôle du Gateway via SSH et utilise ce tunnel comme plan de données.

## Lancement et débogage

- Manuel : menu Lobster → « Open Chat ».
- Ouverture automatique pour les tests :

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- Journaux : `./scripts/clawlog.sh` (sous-système `ai.openclaw`, catégorie `WebChatSwiftUI`).

## Comment il est connecté

- Plan de données : méthodes WS du Gateway `chat.history`, `chat.send`, `chat.abort`,
  `chat.inject` et événements `chat`, `agent`, `presence`, `tick`, `health`.
- Session : utilise par défaut la session principale (`main`, ou `global` lorsque la portée est
  globale). L'interface utilisateur peut basculer entre les sessions.
- L'intégration utilise une session dédiée pour séparer la configuration du premier lancement.

## Surface de sécurité

- Le mode distant transfère uniquement le port de contrôle WebSocket du Gateway via SSH.

## Limitations connues

- L'interface utilisateur est optimisée pour les sessions de chat (et non pour un bac à sable de navigateur complet).
