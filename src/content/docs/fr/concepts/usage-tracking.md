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
- La sortie d'état lisible par l'homme est normalisée à `X% left`, même lorsqu'une API en amont signale le quota consommé, le quota restant ou uniquement des nombres bruts.
- Les `/status` et `session_status` au niveau de la session peuvent revenir à la dernière entrée d'utilisation de la transcription lorsque l'instantané de session en direct est clairsemé. Ce retour remplit les compteurs de jetons/cache manquants, peut récupérer l'étiquette de modèle d'exécution active et préfère le total orienté prompt le plus important lorsque les métadonnées de session sont manquantes ou plus petites. Les valeurs live non nulles existantes l'emportent toujours.

## Où cela apparaît

- `/status` dans les chats : carte d'état riche en émojis avec les jetons de session + coût estimé (clé API uniquement). L'utilisation du fournisseur s'affiche pour le **fournisseur de modèle actuel** si disponible sous la forme d'une fenêtre normalisée `X% left`.
- `/usage off|tokens|full` dans les chats : pied de page d'utilisation par réponse (OAuth affiche uniquement les jetons).
- `/usage cost` dans les chats : résumé des coûts locaux agrégé à partir des journaux de session OpenClaw.
- CLI : `openclaw status --usage` imprime une ventilation complète par fournisseur.
- CLI : `openclaw channels list` imprime le même instantané d'utilisation à côté de la configuration du fournisseur (utilisez `--no-usage` pour ignorer).
- Barre de menu macOS : section « Utilisation » sous Contexte (uniquement si disponible).

## Fournisseurs + identifiants

- **Anthropic (Claude)** : jetons OAuth dans les profils d'authentification.
- **GitHub Copilot** : jetons OAuth dans les profils d'authentification.
- **Gemini CLI** : jetons OAuth dans les profils d'authentification.
  - L'utilisation JSON revient à `stats` ; `stats.cached` est normalisé en
    `cacheRead`.
- **OpenAI Codex** : jetons OAuth dans les profils d'authentification (accountId utilisé si présent).
- **MiniMax** : clé API ou profil d'authentification MiniMax OAuth. OpenClaw traite
  `minimax`, `minimax-cn` et `minimax-portal` comme la même surface de quota
  MiniMax, préfère le MiniMax OAuth stocké lorsqu'il est présent, et sinon revient
  à `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY` ou `MINIMAX_API_KEY`.
  Les champs bruts `usage_percent` / `usagePercent` de MiniMax signifient le quota **restant**,
  OpenClaw les inverse donc avant l'affichage ; les champs basés sur le nombre l'emportent lorsqu'ils
  sont présents.
  - Les étiquettes de fenêtre du plan de codage proviennent des champs heures/minutes du provider lorsqu'ils
    sont présents, puis reviennent à la plage `start_time` / `end_time`.
  - Si le point de terminaison du plan de codage renvoie `model_remains`, OpenClaw préfère
    l'entrée de modèle de chat, dérive l'étiquette de fenêtre à partir des horodatages lorsque les champs explicites
    `window_hours` / `window_minutes` sont absents, et inclut le nom du modèle
    dans l'étiquette du plan.
- **Xiaomi MiMo** : clé API via env/config/auth store (`XIAOMI_API_KEY`).
- **z.ai** : clé API via env/config/auth store.

L'utilisation est masquée lorsqu'aucune authentification d'utilisation de provider utilisable ne peut être résolue. Les providers
peuvent fournir une logique d'authentification d'utilisation spécifique au plugin ; sinon OpenClaw revient
à la correspondance des identifiants OAuth/clé API à partir des profils d'authentification, des variables d'environnement
ou de la configuration.
