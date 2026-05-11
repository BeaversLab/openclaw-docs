---
summary: "Comment l'application mac intègre le WebChat et comment la déboguer"
read_when:
  - Debugging mac WebChat view or loopback port
title: "WebChat (macOS)"
---

L’application de barre de menus macOS intègre l’interface utilisateur WebChat en tant que vue SwiftUI native. Elle se connecte au Gateway et utilise par défaut la **session principale** pour l’agent sélectionné (avec un sélecteur de session pour les autres sessions).

- **Mode local** : se connecte directement au WebSocket local du Gateway.
- **Mode distant** : transfère le port de contrôle du Gateway via SSH et utilise ce tunnel comme plan de données.

## Lancement et débogage

- Manuel : menu Lobster → "Open Chat".
- Ouverture automatique pour les tests :

  ```bash
  dist/OpenClaw.app/Contents/MacOS/OpenClaw --webchat
  ```

- Journaux : `./scripts/clawlog.sh` (sous-système `ai.openclaw`, catégorie `WebChatSwiftUI`).

## Fonctionnement interne

- Plan de données : méthodes WS du Gateway `chat.history`, `chat.send`, `chat.abort`,
  `chat.inject` et événements `chat`, `agent`, `presence`, `tick`, `health`.
- `chat.history` renvoie des lignes de transcription normalisées pour l’affichage : les balises de directive en ligne sont supprimées du texte visible, les charges utiles XML d’appel d’outil en texte brut
  (y compris `<tool_call>...</tool_call>`,
  `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
  `<function_calls>...</function_calls>`, et les blocs d’appel d’outil tronqués) et
  les jetons de contrôle de modèle ASCII/à pleine largeur divulgués sont supprimés, les lignes d’assistant à jeton silencieux pur telles que `NO_REPLY` / `no_reply` exacts sont
  omises, et les lignes trop volumineuses peuvent être remplacées par des espaces réservés.
- Session : utilise par défaut la session principale (`main`, ou `global` lorsque la portée est
  globale). L’interface utilisateur peut basculer entre les sessions.
- L’intégration (Onboarding) utilise une session dédiée pour séparer la configuration de première exécution.

## Surface de sécurité

- Le mode distant ne transfère que le port de contrôle WebSocket du Gateway via SSH.

## Limitations connues

- L’interface utilisateur est optimisée pour les sessions de chat (et non pour un bac à sable de navigateur complet).

## Connexes

- [WebChat](/fr/web/webchat)
- [Application macOS](/fr/platforms/macos)
