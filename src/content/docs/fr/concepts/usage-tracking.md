---
summary: "Surfaces de suivi de l'utilisation et exigences d'identification"
read_when:
  - You are wiring provider usage/quota surfaces
  - You need to explain usage tracking behavior or auth requirements
title: "Suivi de l'utilisation"
---

## Ce que c'est

- Récupère le quota d'utilisation du provider directement depuis leurs points de terminaison d'utilisation.
- Aucun coût estimé ; uniquement les fenêtres signalées par le provider.
- La sortie d'état lisible par l'homme est normalisée vers `X% left`, même lorsqu'une API en amont signale le quota consommé, le quota restant ou uniquement des comptes bruts.
- Les `/status` et `session_status` au niveau de la session peuvent revenir à la dernière entrée d'utilisation de la transcription lorsque l'instantané de la session en direct est clairsemé. Ce retour remplit les compteurs de jetons/cache manquants, peut récupérer l'étiquette du modèle d'exécution actif et préfère le total orienté prompt le plus important lorsque les métadonnées de session sont manquantes ou plus petites. Les valeurs actives non nulles existantes l'emportent toujours.

## Où cela apparaît

- `/status`API dans les chats : carte de statut riche en émojis avec des jetons de session + coût estimé (clé API uniquement). L'utilisation du provider s'affiche pour le **provider de modèle actuel** lorsque disponible sous la forme d'une fenêtre `X% left` normalisée.
- `/usage off|tokens|full` dans les chats : pied de page d'utilisation par réponse (OAuth affiche uniquement les jetons).
- `/usage cost` dans les chats : résumé des coûts locaux agrégé à partir des journaux de session OpenClaw.
- CLI : `openclaw status --usage` imprime une ventilation complète par provider.
- CLI : `openclaw channels list` imprime le même instantané d'utilisation à côté de la configuration du provider (utilisez `--no-usage` pour ignorer).
- Barre de menu macOS : section "Utilisation" sous Contexte (uniquement si disponible).

## Providers + identifiants

- **Anthropic (Claude)** : jetons OAuth dans les profils d'authentification.
- **GitHub Copilot** : jetons OAuth dans les profils d'authentification.
- **Gemini CLI** : jetons OAuth dans les profils d'authentification.
  - L'utilisation JSON revient à `stats` ; `stats.cached` est normalisé dans `cacheRead`.
- **OpenAI Codex** : jetons OAuth dans les profils d'authentification (accountId utilisé si présent).
- **MiniMax** : clé API ou profil d'authentification MiniMax OAuth. OpenClaw traite
  MiniMaxAPIMiniMaxOAuthOpenClaw`minimax`, `minimax-cn` et `minimax-portal`MiniMaxMiniMaxOAuth comme la même surface de quota
  MiniMax, privilégie le MiniMax OAuth stocké lorsqu'il est présent, et sinon revient
  à `MINIMAX_CODE_PLAN_KEY`, `MINIMAX_CODING_API_KEY` ou `MINIMAX_API_KEY`.
  L'interrogation de l'utilisation déduit l'hôte du Coding Plan de `models.providers.minimax-portal.baseUrl`
  ou `models.providers.minimax.baseUrl`MiniMaxMiniMax lorsqu'ils sont configurés, et utilise sinon l'hôte
  MiniMax CN.
  Les champs bruts `usage_percent` / `usagePercent`OpenClaw de MiniMax signifient le quota
  **restant**, donc OpenClaw les inverse avant l'affichage ; les champs basés sur le nombre prévalent lorsqu'ils
  sont présents.
  - Les étiquettes de fenêtre du plan de codage proviennent des champs heures/minutes du provider lorsqu'ils
    sont présents, puis reviennent à la plage `start_time` / `end_time`.
  - Si le endpoint du plan de codage renvoie `model_remains`OpenClaw, OpenClaw privilégie l'entrée
    du modèle de chat, déduit l'étiquette de la fenêtre à partir des horodatages lorsque les champs explicites
    `window_hours` / `window_minutes` sont absents, et inclut le nom du modèle
    dans l'étiquette du plan.
- **Xiaomi MiMo** : clé API via env/config/auth store (XiaomiAPI`XIAOMI_API_KEY`).
- **z.ai** : clé API via env/config/auth store.

L'utilisation est masquée lorsqu'aucune authentification d'utilisation de fournisseur utilisable ne peut être résolue. Les fournisseurs
peuvent fournir une logique d'authentification d'utilisation spécifique au plugin ; sinon OpenClaw revient à
faire correspondre les identifiants OAuth/clé API à partir des profils d'authentification, des variables d'environnement
ou de la configuration.

## Connexes

- [Utilisation et coûts des jetons](/fr/reference/token-use)
- [Utilisation et coûts de l'API](API/en/reference/api-usage-costs)
- [Mise en cache des prompts](/fr/reference/prompt-caching)
