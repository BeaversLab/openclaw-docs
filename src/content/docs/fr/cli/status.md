---
summary: "Référence CLI pour `openclaw status` (diagnostics, sondages, instantanés d'utilisation)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable “all” status for debugging
title: "Status"
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
- La sortie de l'état de la session sépare `Execution:` de `Runtime:`. `Execution` est le chemin du bac à sable (`direct`, `docker/*`), tandis que `Runtime` vous indique si la session utilise `OpenClaw Pi Default`, `OpenAI Codex`, un backend CLI, ou un backend ACP tel que `codex (acp/acpx)`. Voir [Runtimes de l'agent](/fr/concepts/agent-runtimes) pour la distinction fournisseur/modèle/runtime.
- Les champs bruts `usage_percent` / `usagePercent` de MiniMax correspondent au quota restant, donc OpenClaw les inverse avant l'affichage ; les champs basés sur le nombre prévalent lorsqu'ils sont présents. Les réponses `model_remains` privilégient l'entrée du modèle de chat, déduisent l'étiquette de la fenêtre à partir des horodatages si nécessaire, et incluent le nom du modèle dans l'étiquette du plan.
- Lorsque l'instantané de la session actuelle est fragmenté, `/status` peut reconstituer les compteurs de jetons et de cache à partir du journal d'utilisation de la transcription le plus récent. Les valeurs actuelles non nulles existantes prévalent toujours sur les valeurs de secours de la transcription.
- Le mécanisme de secours de la transcription peut également récupérer l'étiquette du modèle d'exécution actif lorsque l'entrée de la session en direct ne la contient pas. Si ce modèle de transcription diffère du modèle sélectionné, l'état résout la fenêtre de contexte par rapport au modèle d'exécution récupéré plutôt qu'au modèle sélectionné.
- Pour la comptabilisation de la taille du prompt, le mécanisme de secours de la transcription privilégie le total orienté prompt le plus important lorsque les métadonnées de la session sont manquantes ou plus petites, afin que les sessions de fournisseurs personnalisés ne se réduisent pas à des affichages de jetons `0`.
- La sortie inclut les magasins de session par agent lorsque plusieurs agents sont configurés.
- La vue d'ensemble inclut l'état d'installation/d'exécution du service hôte du Gateway et du nœud, le cas échéant.
- La vue d'ensemble inclut le canal de mise à jour + le SHA de git (pour les extraits source).
- Les informations de mise à jour apparaissent dans la vue d'ensemble ; si une mise à jour est disponible, l'état affiche un conseil pour exécuter `openclaw update` (voir [Mise à jour](/fr/install/updating)).
- Les surfaces d'état en lecture seule (`status`, `status --json`, `status --all`) résolvent les SecretRefs pris en charge pour leurs chemins de configuration ciblés lorsque cela est possible.
- Si un SecretRef de channel pris en charge est configuré mais indisponible dans le chemin de commande actuel, l'état reste en lecture seule et signale une sortie dégradée au lieu de planter. La sortie humaine affiche des avertissements tels que « configured token unavailable in this command path », et la sortie JSON inclut `secretDiagnostics`.
- Lorsque la résolution de SecretRef locale à la commande réussit, l'état privilégie l'instantané résolu et efface les marqueurs de channel transitoires « secret unavailable » de la sortie finale.
- `status --all` inclut une ligne de vue d'ensemble des Secrets et une section de diagnostic qui résume les diagnostics des secrets (tronqués pour la lisibilité) sans arrêter la génération du rapport.

## Connexes

- [Référence CLI](/fr/cli)
- [Doctor](/fr/gateway/doctor)
