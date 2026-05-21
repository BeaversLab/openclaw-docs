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

| Surface                           | Clé                                                                                        | À utiliser quand                                                                                                                                                    | En savoir plus                                                                                             |
| --------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Exécution de modèle local         | `agents.defaults.experimental.localModelLean`, `agents.list[].experimental.localModelLean` | Un backend local plus petit ou plus strict échoue avec la surface d'outil par défaut complète de OpenClaw                                                           | [Modèles locaux](/fr/gateway/local-models)                                                                 |
| Recherche mémoire                 | `agents.defaults.memorySearch.experimental.sessionMemory`                                  | Vous voulez que `memory_search` indexe les transcriptions de session précédentes et acceptez le coût de stockage et d'indexation supplémentaire                     | [Référence de configuration de la mémoire](/fr/reference/memory-config#session-memory-search-experimental) |
| Outil de planification structurée | `tools.experimental.planTool`                                                              | Vous souhaitez que l'outil structuré `update_plan` soit exposé pour le suivi du travail en plusieurs étapes dans les runtimes et interfaces utilisateur compatibles | [Référence de configuration du Gateway](Gateway/en/gateway/config-tools#toolsexperimental)                 |

## Mode allégé de modèle local

`agents.defaults.experimental.localModelLean: true`OpenClaw est une soupape de sécurité pour les configurations de modèles locaux plus faibles. Lorsqu'il est activé, OpenClaw supprime trois outils par défaut — `browser`, `cron` et `message` — de la surface d'outils de l'agent à chaque tour. Rien d'autre ne change. Utilisez `agents.list[].experimental.localModelLean` pour activer ou désactiver le même comportement pour un agent configuré.

### Pourquoi ces trois outils

Ces trois outils ont les plus grandes descriptions et le plus de formes de paramètres dans le runtime OpenClaw par défaut. Sur un backend à petit contexte ou plus strict compatible avec OpenAI, cela fait la différence entre :

- Les schémas d'outils s'intégrant proprement dans l'invite vs. l'évincement de l'historique de la conversation.
- Le modèle choisissant le bon outil vs. l'émission d'appels d'outils malformés car il y a trop de schémas similaires.
- L'adaptateur Chat Completions restant dans les limites de sortie structurée du serveur vs. déclenchant une erreur 400 sur la taille de la charge utile de l'appel d'outil.

Les supprimer ne reconfigure pas silencieusement OpenClaw — cela raccourcit simplement la liste des outils. Le modèle dispose toujours de OpenClaw`read`, `write`, `edit`, `exec`, `apply_patch`, de la recherche/récupération web (lorsque configuré), de la mémoire, et des outils de session/agent.

### Quand l'activer

Activez le mode lean lorsque vous avez déjà prouvé que le modèle peut parler au Gateway mais que les tours complets de l'agent se comportent mal. La chaîne de signal typique est :

1. `openclaw infer model run --gateway --model <ref> --prompt "Reply with exactly: pong"` réussit.
2. Un tour d'agent normal échoue avec des appels d'outil malformés, des invites trop volumineuses, ou le modèle ignorant ses outils.
3. Basculer `localModelLean: true` efface l'échec.

### Quand le désactiver

Si votre backend gère proprement l'exécution par défaut complète, laissez ceci désactivé. Le mode lean est une solution de contournement, pas une valeur par défaut. Il existe car certaines piles locales ont besoin d'une surface d'outil plus petite pour bien fonctionner ; les modèles hébergés et les configurations locales bien dotées en ressources n'en ont pas besoin.

Le mode lean ne remplace pas non plus `tools.profile`, `tools.allow`/`tools.deny`, ou la porte de sortie `compat.supportsTools: false` du modèle. Si vous avez besoin d'une surface d'outils plus restreinte de manière permanente pour un agent spécifique, préférez ces contrôles stables à l'indicateur expérimental.

### Activer

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

Pour un seul agent uniquement :

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

Redémarrez le Gateway après avoir modifié l'indicateur, puis confirmez la liste d'outils réduite avec :

```bash
openclaw status --deep
```

La sortie de l'état détaillé répertorie les outils de l'agent actifs ; `browser`, `cron` et `message` doivent être absents lorsque le mode lean est activé.

## Expérimental ne signifie pas caché

Si une fonctionnalité est expérimentale, OpenClaw doit l'indiquer clairement dans la documentation et dans le chemin de configuration lui-même. Ce qu'il ne doit **pas** faire, c'est introduire subrepticement un comportement de prévisualisation dans un paramètre par défaut à l'allure stable et faire semblant que c'est normal. C'est ainsi que les surfaces de configuration deviennent désordonnées.

## Connexes

- [Fonctionnalités](/fr/concepts/features)
- [Canaux de publication](/fr/install/development-channels)
