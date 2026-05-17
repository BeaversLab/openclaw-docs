---
summary: "Référence CLI pour `openclaw status` (diagnostics, sondages, instantanés d'utilisation)"
read_when:
  - You want a quick diagnosis of channel health + recent session recipients
  - You want a pasteable "all" status for debugging
title: "openclaw status"
---

Diagnostics for channels + sessions.

```bash
openclaw status
openclaw status --all
openclaw status --deep
openclaw status --usage
```

Notes :

- `--deep` runs live probes (WhatsApp Web + Telegram + Discord + Slack + Signal).
- Plain `openclaw status` stays on the fast read-only path and marks memory as `not checked` instead of unavailable when it skips memory inspection. Heavy security audit, plugin compatibility, and memory-vector probes are left to `openclaw status --all`, `openclaw status --deep`, `openclaw security audit`, and `openclaw memory status --deep`.
- `status --json --all` reports memory details from the active memory plugin runtime selected by `plugins.slots.memory`. Custom memory plugins can leave built-in `agents.defaults.memorySearch.enabled` disabled and still report their own files, chunks, vector, and FTS state.
- `--usage` prints normalized provider usage windows as `X% left`.
- Session status output separates `Execution:` from `Runtime:`. `Execution` is the sandbox path (`direct`, `docker/*`), while `Runtime` tells you whether the session is using `OpenClaw Pi Default`, `OpenAI Codex`, a CLI backend, or an ACP backend such as `codex (acp/acpx)`. See [Agent runtimes](/fr/concepts/agent-runtimes) for the provider/model/runtime distinction.
- MiniMax's raw `usage_percent` / `usagePercent` fields are remaining quota, so OpenClaw inverts them before display; count-based fields win when present. `model_remains` responses prefer the chat-model entry, derive the window label from timestamps when needed, and include the model name in the plan label.
- Lorsque l'instantané de la session actuelle est clairsemé, `/status` peut remplir les compteurs de jetons et de cache à partir du journal d'utilisation de la transcription le plus récent. Les valeurs actives non nulles existantes priment toujours sur les valeurs de secours de la transcription.
- `/status` inclut le temps de fonctionnement compact du processus Gateway et le temps de fonctionnement du système hôte.
- Le repli sur la transcription peut également récupérer l'étiquette du modèle d'exécution actif lorsque l'entrée de la session active ne la contient pas. Si ce modèle de transcription diffère du modèle sélectionné, le statut résout la fenêtre de contexte par rapport au modèle d'exécution récupéré au lieu du modèle sélectionné.
- Pour la comptabilisation de la taille du prompt, le repli sur la transcription préfère le total orienté prompt le plus élevé lorsque les métadonnées de la session sont manquantes ou plus petites, afin que les sessions des fournisseurs personnalisés ne s'effondrent pas dans des affichages de jetons `0`.
- La sortie inclut les magasins de sessions par agent lorsque plusieurs agents sont configurés.
- La vue d'ensemble inclut le statut d'installation/d'exécution du service Gateway + de l'hôte du nœud lorsque disponible.
- La vue d'ensemble inclut le canal de mise à jour + le SHA git (pour les extraits source).
- Les informations de mise à jour apparaissent dans la vue d'ensemble ; si une mise à jour est disponible, le statut affiche un conseil pour exécuter `openclaw update` (voir [Mise à jour](/fr/install/updating)).
- Les échecs de mise à jour des tarifs du modèle sont affichés sous forme d'avertissements de tarification optionnels. Ils ne signifient pas que le Gateway ou les channels sont en mauvaise santé.
- Les surfaces d'état en lecture seule (`status`, `status --json`, `status --all`) résolvent les SecretRefs pris en charge pour leurs chemins de configuration ciblés lorsque cela est possible.
- Si un SecretRef de channel pris en charge est configuré mais indisponible dans le chemin de commande actuel, l'état reste en lecture seule et signale une sortie dégradée au lieu de planter. La sortie humaine affiche des avertissements tels que "configured token unavailable in this command path", et la sortie JSON inclut `secretDiagnostics`.
- Lorsque la résolution locale de la commande SecretRef réussit, l'état préfère l'instantané résolu et efface les marqueurs de channel transitoires "secret unavailable" de la sortie finale.
- `status --all` inclut une ligne de vue d'ensemble des Secrets et une section de diagnostic qui résume les diagnostics de secrets (tronqués pour la lisibilité) sans arrêter la génération du rapport.

## Connexes

- [Référence CLI](/fr/cli)
- [Doctor](/fr/gateway/doctor)
