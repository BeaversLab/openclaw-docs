---
summary: "How the mac app embeds the gateway WebChat and how to debug it"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

# WebChat (application macOS)

The macOS menu bar app embeds the WebChat UI as a native SwiftUI view. It
connects to the Gateway and defaults to the **main session** for the selected
agent (with a session switcher for other sessions).

- **Mode local** : se connecte directement au WebSocket du Gateway local.
- **Remote mode**: forwards the Gateway control port over SSH and uses that
  tunnel as the data plane.

## Lancement et débogage

- Manuel : menu Lobster → « Open Chat ».
- Ouverture automatique pour les tests :

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- Logs: `./scripts/clawlog.sh` (subsystem `ai.openclaw`, category `WebChatSwiftUI`).

## How it is wired

- Data plane: Gateway WS methods `chat.history`, `chat.send`, `chat.abort`,
  `chat.inject` and events `chat`, `agent`, `presence`, `tick`, `health`.
- Session: defaults to the primary session (`main`, or `global` when scope is
  global). The UI can switch between sessions.
- L'intégration utilise une session dédiée pour séparer la configuration du premier lancement.

## Surface de sécurité

- Le mode distant transfère uniquement le port de contrôle WebSocket du Gateway via SSH.

## Limitations connues

- L'interface utilisateur est optimisée pour les sessions de chat (et non pour un bac à sable de navigateur complet).

import en from "/components/footer/en.mdx";

<en />
