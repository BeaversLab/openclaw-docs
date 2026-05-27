---
summary: "OpenClawSignification des indicateurs expérimentaux dans OpenClaw et ceux qui sont actuellement documentés"
title: "Fonctionnalités expérimentales"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

Les fonctionnalités expérimentales dans OpenClaw sont des **surfaces d'aperçu en option (opt-in)**. Elles se trouvent derrière des indicateurs explicites car elles ont encore besoin d'être testées en conditions réelles avant de mériter un paramètre par défaut stable ou un contrat public durable.

Traitez-les différemment de la configuration normale :

- Gardez-les **désactivées par défaut**, sauf si la documentation associée vous invite à en essayer une.
- Attendez-vous à ce que la **forme et le comportement changent** plus rapidement que pour la configuration stable.
- Privilégiez d'abord le chemin stable lorsqu'il en existe déjà un.
- Si vous déployez OpenClaw à grande échelle, testez les indicateurs expérimentaux dans un environnement plus restreint avant de les intégrer à une base de référence partagée.

## Indicateurs actuellement documentés

| Surface                           | Clé                                                                                        | À utiliser quand                                                                                                                                                                          | En savoir plus                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Exécution de modèle local         | `agents.defaults.experimental.localModelLean`, `agents.list[].experimental.localModelLean` | Un backend local plus petit ou plus strict échoue avec la surface d'outil par défaut complète de OpenClaw                                                                                 | [Modèles locaux](/fr/gateway/local-models)                                                                 |
| Recherche mémoire                 | `agents.defaults.memorySearch.experimental.sessionMemory`                                  | Vous voulez que `memory_search` indexe les transcriptions de session précédentes et acceptez le coût de stockage et d'indexation supplémentaire                                           | [Référence de configuration de la mémoire](/fr/reference/memory-config#session-memory-search-experimental) |
| Harnais Codex                     | `plugins.entries.codex.config.appServer.experimental.sandboxExecServer`                    | Vous disposez d'un serveur d'application natif Codex 0.132.0 ou plus récent pour cibler un exec-server prenant en charge un bac à sable OpenClaw au lieu de désactiver le mode Code       | [Référence du harnais Codex](/fr/plugins/codex-harness-reference#sandboxed-native-execution)               |
| Outil de planification structurée | `tools.experimental.planTool`                                                              | Vous souhaitez que l'outil structuré `update_plan` soit exposé pour le suivi du travail en plusieurs étapes dans les environnements d'exécution et les interfaces utilisateur compatibles | [Référence de configuration de la Gateway](/fr/gateway/config-tools#toolsexperimental)                     |

## Mode lean de modèle local

`agents.defaults.experimental.localModelLean: true` est une soupape de sécurité pour les configurations de modèles locaux plus faibles. Lorsqu'il est activé, OpenClaw supprime trois outils par défaut — `browser`, `cron` et `message` — de la surface d'outils de l'agent à chaque tour. Rien d'autre ne change. Utilisez `agents.list[].experimental.localModelLean` pour activer ou désactiver le même comportement pour un agent configuré.

### Pourquoi ces trois outils

Ces trois outils ont les descriptions les plus longues et le plus de formes de paramètres dans l'environnement d'exécution par défaut de OpenClaw. Sur un backend à petit contexte ou plus strict compatible avec OpenAI, c'est la différence entre :

- Les schémas d'outils s'insérant proprement dans l'invite vs l'évincement de l'historique de la conversation.
- Le modèle choisissant le bon outil vs émettant des appels d'outils malformés car il y a trop de schémas similaires.
- L'adaptateur Chat Completions restant dans les limites de sortie structurée du serveur vs déclenchant une erreur 400 sur la taille de la charge utile de l'appel d'outil.

Les supprimer ne recâble pas silencieusement OpenClaw — cela raccourcit simplement la liste des outils. Le modèle dispose toujours de `read`, `write`, `edit`, `exec`, `apply_patch`, de la recherche/récupération Web (lorsqu'elle est configurée), de la mémoire et des outils de session/agent.

### Quand l'activer

Activez le mode lean lorsque vous avez déjà prouvé que le model peut parler au Gateway mais que les tours complets de l'agent se comportent mal. La chaîne de signal typique est :

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` réussit.
2. Un tour d'agent normal échoue avec des appels de tool malformés, des invites trop volumineuses, ou le model ignorant ses tools.
3. Activer `localModelLean: true` résout l'échec.

### Quand le laisser désactivé

Si votre backend gère proprement l'exécution par défaut complète, laissez ceci désactivé. Le mode lean est une solution de contournement, pas un paramètre par défaut. Il existe parce que certaines piles locales ont besoin d'une surface de tool plus petite pour bien fonctionner ; les modèles hébergés et les configurations locales bien dotées non.

Le mode lean ne remplace pas non plus `tools.profile`, `tools.allow`/`tools.deny`, ou la soupape de sécurité `compat.supportsTools: false` du model. Si vous avez besoin d'une surface de tool plus restreinte de manière permanente pour un agent spécifique, préférez ces boutons stables plutôt que l'indicateur expérimental.

### Activation

```json5
{
  agents: {
    defaults: {
      experimental: {
        localModelLean: true,
      },
    },
  },
}
```

Pour un seul agent :

```json5
{
  agents: {
    list: [
      {
        id: "local",
        model: "lmstudio/gemma-4-e4b-it",
        experimental: {
          localModelLean: true,
        },
      },
    ],
  },
}
```

Redémarrez le Gateway après avoir modifié l'indicateur, puis confirmez la liste des tools réduite avec :

```bash
openclaw status --deep
```

La sortie de statut détaillé répertorie les tools de l'agent actifs ; `browser`, `cron` et `message` doivent être absents lorsque le mode lean est activé.

## Expérimental ne signifie pas caché

Si une fonctionnalité est expérimentale, OpenClaw doit le dire clairement dans la documentation et dans le chemin de configuration lui-même. Ce qu'il ne doit **pas** faire, c'est introduire subrepticement un comportement de prévisualisation dans un bouton par défaut d'apparence stable et faire semblant que c'est normal. C'est ainsi que les surfaces de configuration deviennent désordonnées.

## Connexes

- [Fonctionnalités](/fr/concepts/features)
- [Canaux de publication](/fr/install/development-channels)
