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
- La sortie de l'état de la session sépare `Execution:` de `Runtime:`. `Execution` est le chemin du bac à sable (`direct`, `docker/*`), tandis que `Runtime` indique si la session utilise `OpenClaw Default`, `OpenAI Codex`, un backend CLI, ou un backend ACP tel que `codex (acp/acpx)`. Voir [Agent runtimes](/fr/concepts/agent-runtimes) pour la distinction fournisseur/modèle/runtime.
- MiniMax's raw `usage_percent` / `usagePercent` fields are remaining quota, so OpenClaw inverts them before display; count-based fields win when present. `model_remains` responses prefer the chat-model entry, derive the window label from timestamps when needed, and include the model name in the plan label.
- Lorsque l'instantané de la session actuelle est clairsemé, `/status` peut remplir les compteurs de jetons et de cache à partir du journal d'utilisation de la transcription le plus récent. Les valeurs actives non nulles existantes priment toujours sur les valeurs de secours de la transcription.
- `/status` inclut le temps de fonctionnement compact du processus Gateway et le temps de fonctionnement du système hôte.
- Le repli sur la transcription peut également récupérer l'étiquette du modèle d'exécution actif lorsque l'entrée de la session active ne la contient pas. Si ce modèle de transcription diffère du modèle sélectionné, le statut résout la fenêtre de contexte par rapport au modèle d'exécution récupéré au lieu du modèle sélectionné.
- Lorsqu'une session est épinglée à un modèle qui diffère du modèle principal configuré, le statut affiche les deux valeurs, la raison (`session override`) et l'indication de suppression (`/model <configured-default>` ou `/reset`). Le modèle principal configuré s'applique aux nouvelles sessions ou sessions non épinglées ; les sessions épinglées existantes conservent leur sélection jusqu'à leur suppression.
- Pour la comptabilité de la taille du prompt, la solution de repli de transcription préfère le total orienté prompt le plus important lorsque les métadonnées de la session sont manquantes ou plus petites, afin que les sessions avec un fournisseur personnalisé ne reviennent pas à des affichages de jetons `0`.
- La sortie inclut les magasins de session par agent lorsque plusieurs agents sont configurés.
- La vue d'ensemble inclut le statut d'installation/d'exécution du service Gateway + de l'hôte de nœud, si disponible.
- La vue d'ensemble inclut le canal de mise à jour + le SHA git (pour les sources extraites).
- Les informations de mise à jour apparaissent dans la vue d'ensemble ; si une mise à jour est disponible, le statut affiche une invite à exécuter `openclaw update` (voir [Updating](/fr/install/updating)).
- Les échecs de rafraîchissement des tarifs de modèle sont affichés comme des avertissements de tarification facultatifs. Cela ne signifie pas que le Gateway ou les canaux sont en mauvaise santé.
- Les surfaces de statut en lecture seule (`status`, `status --json`, `status --all`) résolvent les SecretRefs pris en charge pour leurs chemins de configuration ciblés lorsque cela est possible.
- Si un SecretRef de canal pris en charge est configuré mais indisponible dans le chemin de commande actuel, le statut reste en lecture seule et signale une sortie dégradée au lieu de planter. La sortie humaine affiche des avertissements tels que "configured token unavailable in this command path", et la sortie JSON inclut `secretDiagnostics`.
- Lorsque la résolution locale de commande SecretRef réussit, le statut privilégie l'instantané résolu et efface les marqueurs de channel « secret indisponible » transitoires de la sortie finale.
- `status --all` inclut une ligne de vue d'ensemble des Secrets et une section de diagnostic qui résume les diagnostics des secrets (tronqués pour la lisibilité) sans arrêter la génération du rapport.

## Connexes

- [Référence CLI](/fr/cli)
- [Doctor](/fr/gateway/doctor)
