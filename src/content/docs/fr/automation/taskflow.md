---
summary: "Couche d'orchestration de flux Task Flow au-dessus des tâches d'arrière-plan"
read_when:
  - You want to understand how Task Flow relates to background tasks
  - You encounter Task Flow or openclaw tasks flow in release notes or docs
  - You want to inspect or manage durable flow state
title: "Task Flow"
---

# Task Flow

Task Flow est le substrat d'orchestration de flux qui se situe au-dessus des [tâches d'arrière-plan](/fr/automation/tasks). Il gère des flux multi-étapes durables avec leur propre état, leur suivi de révision et leur sémantique de synchronisation, tandis que les tâches individuelles restent l'unité de travail détaché.

## Quand utiliser Task Flow

Utilisez Task Flow lorsque le travail s'étend sur plusieurs étapes séquentielles ou avec embranchements et que vous avez besoin d'un suivi de progression durable à travers les redémarrages de la passerelle. Pour des opérations d'arrière-plan uniques, une simple [tâche](/fr/automation/tasks) suffit.

| Scénario                                | Utilisation           |
| --------------------------------------- | --------------------- |
| Tâche d'arrière-plan unique             | Tâche simple          |
| Pipeline multi-étapes (A puis B puis C) | Task Flow (géré)      |
| Observer des tâches créées en externe   | Task Flow (en miroir) |
| Rappel ponctuel                         | Tâche Cron            |

## Modes de synchronisation

### Mode géré

Task Flow possède le cycle de vie de bout en bout. Il crée des tâches en tant qu'étapes de flux, les pilote jusqu'à leur achèvement et fait avancer l'état du flux automatiquement.

Exemple : un flux de rapport hebdomadaire qui (1) collecte les données, (2) génère le rapport et (3) le livre. Task Flow crée chaque étape en tant que tâche d'arrière-plan, attend la fin, puis passe à l'étape suivante.

```
Flow: weekly-report
  Step 1: gather-data     → task created → succeeded
  Step 2: generate-report → task created → succeeded
  Step 3: deliver         → task created → running
```

### Mode en miroir

Task Flow observe les tâches créées en externe et maintient l'état du flux synchronisé sans prendre possession de la création des tâches. Cela est utile lorsque les tâches proviennent de tâches Cron, de commandes CLI ou d'autres sources et que vous souhaitez une vue unifiée de leur progression en tant que flux.

Exemple : trois tâches Cron indépendantes qui forment ensemble une routine "opérations du matin". Un flux en miroir suit leur progression collective sans contrôler quand ou comment elles s'exécutent.

## État durable et suivi des révisions

Chaque flux persiste son propre état et suit les révisions afin que la progression survive aux redémarrages de la passerelle. Le suivi des révisions permet la détection de conflits lorsque plusieurs sources tentent de faire avancer le même flux simultanément.

## Comportement d'annulation

`openclaw tasks flow cancel` définit une intention d'annulation persistante sur le flux. Les tâches actives au sein du flux sont annulées et aucune nouvelle étape n'est démarrée. L'intention d'annulation persiste à travers les redémarrages, donc un flux annulé reste annulé même si la passerelle redémarre avant que toutes les tâches enfants ne soient terminées.

## Commandes CLI

```bash
# List active and recent flows
openclaw tasks flow list

# Show details for a specific flow
openclaw tasks flow show <lookup>

# Cancel a running flow and its active tasks
openclaw tasks flow cancel <lookup>
```

| Commande                          | Description                                                            |
| --------------------------------- | ---------------------------------------------------------------------- |
| `openclaw tasks flow list`        | Affiche les flux suivis avec leur état et leur mode de synchronisation |
| `openclaw tasks flow show <id>`   | Inspecter un flux par son ID ou sa clé de recherche                    |
| `openclaw tasks flow cancel <id>` | Annuler un flux en cours d'exécution et ses tâches actives             |

## Relation entre les flux et les tâches

Les flux coordonnent les tâches, ils ne les remplacent pas. Un seul flux peut piloter plusieurs tâches d'arrière-plan au cours de sa vie. Utilisez `openclaw tasks` pour inspecter les enregistrements de tâches individuels et `openclaw tasks flow` pour inspecter le flux d'orchestration.

## Connexes

- [Tâches d'arrière-plan](/fr/automation/tasks) — le registre de travail détaché que coordonnent les flux
- [CLI : tâches](/fr/cli/index#tasks) — référence de commande CLI pour `openclaw tasks flow`
- [Aperçu de l'automatisation](/fr/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches Cron](/fr/automation/cron-jobs) — tâches planifiées qui peuvent alimenter les flux
