---
summary: "Surfaces de suivi d'utilisation et exigences d'identification"
read_when:
  - Vous câblez les surfaces de quota/utilisation des providers
  - Vous devez expliquer le comportement du suivi d'utilisation ou les exigences d'authentification
title: "Suivi d'utilisation"
---

# Suivi d'utilisation

## Ce que c'est

- Récupère directement l'utilisation/le quota des providers via leurs points de terminaison d'utilisation.
- Aucun coût estimé ; uniquement les fenêtres déclarées par les providers.

## Où cela apparaît

- `/status` dans les chats : carte de statut riche en emojis avec les jetons de session + coût estimé (clé API uniquement). L'utilisation du provider s'affiche pour le **provider de modèle actuel** si disponible.
- `/usage off|tokens|full` dans les chats : pied de page d'utilisation par réponse (OAuth affiche uniquement les jetons).
- `/usage cost` dans les chats : résumé des coûts locaux agrégé à partir des journaux de session OpenClaw.
- CLI : `openclaw status --usage` affiche une répartition complète par provider.
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

L'utilisation est masquée si aucune information d'identification OAuth/API correspondante n'existe.

import fr from "/components/footer/fr.mdx";

<fr />
