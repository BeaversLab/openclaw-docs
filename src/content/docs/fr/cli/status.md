---
summary: "Référence CLI pour `openclaw status` (diagnostics, sondages, instantanés d'utilisation)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "status"
---

# `openclaw status`

Diagnostics pour les channels + sessions.

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

Notes :

- `--deep` exécute des sondes en direct (WhatsApp Web + Telegram + Discord + Slack + Signal).
- `--usage` affiche les fenêtres d'utilisation normalisées du fournisseur sous la forme `X% left`.
- Les champs bruts `usage_percent` / `usagePercent` de MiniMax correspondent au quota restant, donc OpenClaw les inverse avant l'affichage ; les champs basés sur le nombre sont prioritaires lorsqu'ils sont présents. Les réponses `model_remains` privilégient l'entrée du modèle de chat, dérivent l'étiquette de la fenêtre à partir des horodatages si nécessaire, et incluent le nom du modèle dans l'étiquette du plan.
- Lorsque l'instantané de la session actuelle est clairsemé, `/status` peut reconstituer les compteurs de jetons et de cache à partir du journal d'utilisation de la transcription le plus récent. Les valeurs actuelles non nulles prévalent toujours sur les valeurs de secours de la transcription.
- Le recours à la transcription peut également récupérer l'étiquette du modèle d'exécution actif lorsque l'entrée de session en direct ne la contient pas. Si ce modèle de transcription diffère du modèle sélectionné, le status résout la fenêtre de contexte par rapport au modèle d'exécution récupéré plutôt qu'au modèle sélectionné.
- Pour la comptabilité de la taille du prompt, le recours à la transcription privilégie le total orienté prompt le plus élevé lorsque les métadonnées de la session sont manquantes ou plus petites, afin que les sessions de fournisseurs personnalisés ne s'effondrent pas dans des affichages de jetons `0`.
- La sortie inclut les magasins de session par agent lorsque plusieurs agents sont configurés.
- La vue d'ensemble inclut le statut d'installation/exécution du service Gateway + hôte de nœud, si disponible.
- La vue d'ensemble inclut le canal de mise à jour + le SHA git (pour les extraits de code source).
- Les informations de mise à jour apparaissent dans la vue d'ensemble ; si une mise à jour est disponible, status affiche un conseil pour exécuter `openclaw update` (voir [Mise à jour](/en/install/updating)).
- Les surfaces de status en lecture seule (`status`, `status --json`, `status --all`) résolvent les SecretRefs pris en charge pour leurs chemins de configuration ciblés lorsque cela est possible.
- Si un SecretRef de canal pris en charge est configuré mais indisponible dans le chemin de commande actuel, status reste en lecture seule et signale une sortie dégradée au lieu de planter. La sortie humaine affiche des avertissements tels que « configured token unavailable in this command path », et la sortie JSON inclut `secretDiagnostics`.
- Lorsque la résolution locale de la commande SecretRef réussit, status privilégie l'instantané résolu et efface les marqueurs de canal transitoires « secret indisponible » de la sortie finale.
- `status --all` comprend une ligne d'aperçu des Secrets et une section de diagnostic qui résume les diagnostics de secrets (tronqués pour la lisibilité) sans interrompre la génération du rapport.
