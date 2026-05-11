---
summary: "Signification des indicateurs expérimentaux dans OpenClaw et ceux qui sont actuellement documentés"
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

| Surface                           | Clé                                                       | À utiliser quand                                                                                                                                                              | En savoir plus                                                                                             |
| --------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Exécution de modèle local         | `agents.defaults.experimental.localModelLean`             | Un backend local plus petit ou plus strict échoue avec la surface d'outil par défaut complète de OpenClaw                                                                     | [Modèles locaux](/fr/gateway/local-models)                                                                 |
| Recherche mémoire                 | `agents.defaults.memorySearch.experimental.sessionMemory` | Vous voulez que `memory_search` indexe les transcriptions de session précédentes et acceptez le coût supplémentaire de stockage et d'indexation                               | [Référence de configuration de la mémoire](/fr/reference/memory-config#session-memory-search-experimental) |
| Outil de planification structurée | `tools.experimental.planTool`                             | Vous souhaitez que l'outil structuré `update_plan` soit exposé pour le suivi du travail en plusieurs étapes dans les environnements d'exécution et les interfaces compatibles | [Référence de configuration du Gateway](/fr/gateway/config-tools#toolsexperimental)                        |

## Mode allégé de modèle local

`agents.defaults.experimental.localModelLean: true` est une soupape de sécurité
pour les configurations de modèles locaux plus faibles. Il supprime les outils par défaut lourds comme
`browser`, `cron` et `message` afin que la forme du prompt soit plus petite et moins fragile
pour les backends compatibles OpenAI avec un petit contexte ou plus stricts.

Cela n'est volontairement **pas** le chemin normal. Si votre backend gère l'exécution complète proprement, laissez ceci désactivé.

## Expérimental ne signifie pas caché

Si une fonctionnalité est expérimentale, OpenClaw doit l'indiquer clairement dans la documentation et dans le chemin de configuration lui-même. Ce qu'il ne doit **pas** faire, c'est introduire discrètement un comportement de prévisualisation dans un réglage par défaut semblant stable et prétendre que c'est normal. C'est ainsi que les surfaces de configuration deviennent confuses.

## Connexes

- [Fonctionnalités](/fr/concepts/features)
- [Canaux de publication](/fr/install/development-channels)
