---
title: "Fonctionnalités expérimentales"
summary: "Ce que signifient les indicateurs expérimentaux dans OpenClaw et lesquels sont actuellement documentés"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

# Fonctionnalités expérimentales

Les fonctionnalités expérimentales dans OpenClaw sont des **surfaces d'aperçu à adhésion volontaire**. Elles se trouvent derrière des indicateurs explicites car elles ont encore besoin d'être éprouvées en conditions réelles avant de mériter un comportement par défaut stable ou un contrat public durable.

Traitez-les différemment de la configuration normale :

- Gardez-les **désactivées par défaut** sauf si la documentation associée vous invite à les essayer.
- Attendez-vous à ce que **leur forme et leur comportement changent** plus rapidement que la configuration stable.
- Privilégiez d'abord le chemin stable lorsqu'il existe déjà.
- Si vous déployez OpenClaw à grande échelle, testez les indicateurs expérimentaux dans un environnement plus restreint avant de les intégrer dans une base de référence partagée.

## Indicateurs actuellement documentés

| Surface                          | Clé                                                       | Quand l'utiliser                                                                                                                                | En savoir plus                                                                                       |
| -------------------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Runtime de modèle local          | `agents.defaults.experimental.localModelLean`             | Un backend local plus petit ou plus strict ne supporte pas la surface d'outils par défaut complète d'OpenClaw                                   | [Modèles locaux](/en/gateway/local-models)                                                           |
| Recherche en mémoire             | `agents.defaults.memorySearch.experimental.sessionMemory` | Vous souhaitez que `memory_search` indexe les transcriptions des sessions précédentes et acceptez le coût de stockage/indexation supplémentaire | [Référence de configuration mémoire](/en/reference/memory-config#session-memory-search-experimental) |
| Outil de planification structuré | `tools.experimental.planTool`                             | Vous souhaitez que l'outil structuré `update_plan` soit exposé pour le suivi du travail multi-étapes dans les runtimes et UI compatibles        | [Référence de configuration de la passerelle](/en/gateway/configuration-reference#toolsexperimental) |

## Mode lean pour modèle local

`agents.defaults.experimental.localModelLean: true` est une soupape de décompression pour les configurations de modèles locaux plus faibles. Il supprime les outils par défaut lourds comme `browser`, `cron` et `message` afin que la forme du prompt soit plus petite et moins fragile pour les backends compatibles OpenAI à contexte réduit ou plus stricts.

Ce n'est intentionnellement **pas** le chemin normal. Si votre backend gère proprement le runtime complet, laissez cette option désactivée.

## Expérimental ne signifie pas caché

Si une fonctionnalité est expérimentale, OpenClaw doit l'indiquer clairement dans la documentation et dans le chemin de configuration lui-même. Ce qu'il ne doit **pas** faire, c'est glisser subrepticement un comportement d'aperçu dans un paramètre par défaut d'apparence stable et prétendre que c'est normal. C'est ainsi que les surfaces de configuration deviennent confuses.
