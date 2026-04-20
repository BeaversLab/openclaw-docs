---
title: "Fonctionnalités expérimentales"
summary: "Signification des indicateurs expérimentaux dans OpenClaw et ceux qui sont actuellement documentés"
read_when:
  - You see an `.experimental` config key and want to know whether it is stable
  - You want to try preview runtime features without confusing them with normal defaults
  - You want one place to find the currently documented experimental flags
---

# Fonctionnalités expérimentales

Les fonctionnalités expérimentales dans OpenClaw sont des **surfaces d'aperçu optionnelles**. Elles sont
protégées par des indicateurs explicites car elles ont encore besoin de recul réel avant de
mériter une valeur par défaut stable ou un contrat public durable.

Traitez-les différemment de la configuration normale :

- Gardez-les **désactivées par défaut** sauf si la documentation associée vous invite à en essayer une.
- Attendez-vous à ce que la **forme et le comportement changent** plus vite que pour la configuration stable.
- Privilégiez d'abord le chemin stable lorsqu'il en existe déjà un.
- Si vous déployez OpenClaw à grande échelle, testez les indicateurs expérimentaux dans un
  environnement plus restreint avant de les intégrer à une base commune.

## Indicateurs actuellement documentés

| Surface                           | Clé                                                       | À utiliser quand                                                                                                                                   | Plus                                                                                                       |
| --------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| Runtime du modèle local           | `agents.defaults.experimental.localModelLean`             | Un backend local plus petit ou plus strict s'étouffe avec la surface d'outils par défaut complète de OpenClaw                                      | [Modèles locaux](/en/gateway/local-models)                                                                 |
| Recherche mémoire                 | `agents.defaults.memorySearch.experimental.sessionMemory` | Vous souhaitez que `memory_search` indexe les transcriptions de session précédentes et acceptez le coût de stockage et d'indexation supplémentaire | [Référence de configuration de la mémoire](/en/reference/memory-config#session-memory-search-experimental) |
| Outil de planification structurée | `tools.experimental.planTool`                             | Vous souhaitez que l'outil `update_plan` structuré soit exposé pour le suivi du travail en plusieurs étapes dans les runtimes et UI compatibles    | [Référence de configuration du Gateway](/en/gateway/configuration-reference#toolsexperimental)             |

## Mode léger du modèle local

`agents.defaults.experimental.localModelLean: true` est une soupape de sécurité
pour les configurations de modèles locaux plus faibles. Il supprime les outils par défaut lourds comme
`browser`, `cron` et `message` afin que la forme du prompt soit plus petite et moins fragile
pour les backends compatibles OpenAI à contexte réduit ou plus stricts.

C'est intentionnellement **pas** le chemin normal. Si votre backend gère le runtime complet
proprement, laissez ceci désactivé.

## Expérimental ne signifie pas caché

Si une fonctionnalité est expérimentale, OpenClaw doit l'indiquer clairement dans la documentation et dans le chemin de configuration lui-même. Ce qu'il ne faut **pas** faire, c'est introduire subrepticement un comportement de prévisualisation dans un bouton de réglage par défaut semblant stable et prétendre que c'est normal. C'est ainsi que les surfaces de configuration deviennent désordonnées.
