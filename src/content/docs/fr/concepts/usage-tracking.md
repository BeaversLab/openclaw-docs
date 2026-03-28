---
summary: "Surfaces de suivi de l'utilisation et exigences d'identification"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Suivi de l'utilisation"
---

# Suivi de l'utilisation

## Ce que c'est

- Récupère l'utilisation/le quota du provider directement depuis leurs points de terminaison d'utilisation.
- Aucun coût estimé ; uniquement les fenêtres déclarées par le provider.

## Où cela s'affiche

- `/status` dans les chats : carte d'état riche en émojis avec les jetons de session + coût estimé (clé API uniquement). L'utilisation du provider s'affiche pour le **provider de modèle actuel** lorsque disponible.
- `/usage off|tokens|full` dans les chats : pied de page d'utilisation par réponse (OAuth affiche uniquement les jetons).
- `/usage cost` dans les chats : résumé des coûts locaux agrégé à partir des journaux de session OpenClaw.
- CLI : `openclaw status --usage` affiche une ventilation complète par provider.
- CLI : `openclaw channels list` affiche le même instantané d'utilisation à côté de la configuration du provider (utilisez `--no-usage` pour ignorer).
- Barre de menu macOS : section « Utilisation » sous Contexte (uniquement si disponible).

## Providers + identifiants

- **Anthropic (Claude)** : jetons OAuth dans les profils d'authentification.
- **GitHub Copilot** : jetons OAuth dans les profils d'authentification.
- **Gemini CLI** : jetons OAuth dans les profils d'authentification.
- **Antigravity** : jetons OAuth dans les profils d'authentification.
- **OpenAI Codex** : jetons OAuth dans les profils d'authentification (accountId utilisé si présent).
- **MiniMax** : clé API (clé de plan de codage ; `MINIMAX_CODE_PLAN_KEY` ou `MINIMAX_API_KEY`) ; utilise la fenêtre du plan de codage de 5 heures.
- **z.ai** : clé API via env/config/auth store.

L'utilisation est masquée si aucune identification OAuth/API correspondante n'existe.
