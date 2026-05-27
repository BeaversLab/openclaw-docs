---
summary: "Couche d'orchestration de flux de tâches au-dessus des tâches d'arrière-plan"
read_when:
  - You want to understand how Task Flow relates to background tasks
  - You encounter Task Flow or openclaw tasks flow in release notes or docs
  - You want to inspect or manage durable flow state
title: "Flux de tâches"
---

Task Flow est le substrat d'orchestration de flux qui se situe au-dessus des [tâches d'arrière-plan](/fr/automation/tasks). Il gère des flux multi-étapes durables avec leur propre état, leur suivi de révision et leur sémantique de synchronisation, tandis que les tâches individuelles restent l'unité de travail détaché.

## Quand utiliser Task Flow

Utilisez Task Flow lorsque le travail s'étend sur plusieurs étapes séquentielles ou avec embranchement et que vous avez besoin d'un suivi durable des progrès à travers les redémarrages de la passerelle. Pour les opérations d'arrière-plan uniques, une [tâche](/fr/automation/tasks) simple suffit.

| Scénario                                | Utiliser              |
| --------------------------------------- | --------------------- |
| Tâche d'arrière-plan unique             | Tâche simple          |
| Pipeline multi-étapes (A puis B puis C) | Task Flow (géré)      |
| Observer les tâches créées en externe   | Task Flow (en miroir) |
| Rappel ponctuel                         | Tâche cron            |

## Modèle de workflow planifié fiable

Pour les workflows récurrents tels que les briefings de veille concurrentielle, traitez la planification, l'orchestration et les contrôles de fiabilité comme des couches distinctes :

1. Utilisez les [Tâches planifiées](/fr/automation/cron-jobs) pour la synchronisation.
2. Utilisez une session cron persistante lorsque le workflow doit s'appuyer sur le contexte précédent.
3. Utilisez [Lobster](/fr/tools/lobster) pour les étapes déterministes, les portes d'approbation et les jetons de reprise.
4. Utilisez Task Flow pour suivre l'exécution multi-étapes à travers les tâches enfants, les attentes, les nouvelles tentatives et les redémarrages de la passerelle.

Exemple de forme cron :

```bash
openclaw cron add \
  --name "Market intelligence brief" \
  --cron "0 7 * * 1-5" \
  --tz "America/New_York" \
  --session session:market-intel \
  --message "Run the market-intel Lobster workflow. Verify source freshness before summarizing." \
  --announce \
  --channel slack \
  --to "channel:C1234567890"
```

Utilisez `session:<id>` au lieu de `isolated` lorsque le workflow récurrent nécessite un historique délibéré, des résumés des exécutions précédentes ou un contexte permanent. Utilisez `isolated` lorsque chaque exécution doit recommencer à zéro et que tout l'état requis est explicite dans le workflow.

Dans le workflow, placez les contrôles de fiabilité avant l'étape de résumé LLM :

```yaml
name: market-intel-brief
steps:
  - id: preflight
    command: market-intel check --json
  - id: collect
    command: market-intel collect --json
    stdin: $preflight.json
  - id: summarize
    command: market-intel summarize --json
    stdin: $collect.json
  - id: approve
    command: market-intel deliver --preview
    stdin: $summarize.json
    approval: required
  - id: deliver
    command: market-intel deliver --execute
    stdin: $summarize.json
    condition: $approve.approved
```

Contrôles préalables recommandés :

- Disponibilité du navigateur et choix du profil, par exemple `openclaw` pour l'état géré ou `user` lorsqu'une session Chrome connectée est requise. Voir [Navigateur](/fr/tools/browser).
- Identifiants API et quota pour chaque source.
- Accessibilité réseau pour les points de terminaison requis.
- Outils requis activés pour l'agent, tels que `lobster`, `browser` et `llm-task`.
- Destination d'échec configurée pour cron afin que les échecs de pré-vol soient visibles. Voir [Scheduled Tasks](/fr/automation/cron-jobs#delivery-and-output).

Champs de provenance des données recommandés pour chaque élément collecté :

```json
{
  "sourceUrl": "https://example.com/report",
  "retrievedAt": "2026-04-24T12:00:00Z",
  "asOf": "2026-04-24",
  "title": "Example report",
  "content": "..."
}
```

Faites en sorte que le workflow rejette ou marque les éléments obsolètes avant la synthèse. L'étape LLM ne doit recevoir que du JSON structuré et on doit lui demander de préserver `sourceUrl`, `retrievedAt` et `asOf` dans sa sortie. Utilisez [LLM Task](/fr/tools/llm-task) lorsque vous avez besoin d'une étape de modèle validée par schéma dans le workflow.

Pour les flux de travail réutilisables par une équipe ou la communauté, packagez le CLI, les fichiers `.lobster` et toutes les notes de configuration sous forme de compétence ou de plugin, et publiez-le via [ClawHub](/fr/clawhub). Conservez les garde-fous spécifiques au flux de travail dans ce package, sauf si l'API de plugin API manque d'une capacité générique nécessaire.

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

### Mode miroir

Task Flow observe les tâches créées en externe et maintient l'état du flux synchronisé sans prendre possession de la création des tâches. C'est utile lorsque les tâches proviennent de travaux cron, de commandes CLI ou d'autres sources et que vous souhaitez une vue unifiée de leur progression en tant que flux.

Exemple : trois travaux cron indépendants qui forment ensemble une routine "morning ops". Un flux miroir suit leur progression collective sans contrôler quand ni comment ils s'exécutent.

## État durable et suivi des révisions

Chaque flux conserve son propre état et suit les révisions afin que la progression survive aux redémarrages de la passerelle. Le suivi des révisions permet la détection des conflits lorsque plusieurs sources tentent d'avancer le même flux simultanément.
Le registre de flux utilise SQLite avec une maintenance limitée du journal d'écriture (write-ahead-log), y compris
des points de contrôle périodiques et à l'arrêt, afin que les passerelles à longue exécution ne conservent pas
de fichiers `registry.sqlite-wal` sidecar illimités.

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

| Commande                          | Description                                                              |
| --------------------------------- | ------------------------------------------------------------------------ |
| `openclaw tasks flow list`        | Affiche les flux suivis avec leur statut et leur mode de synchronisation |
| `openclaw tasks flow show <id>`   | Inspecte un flux par son ID ou sa clé de recherche                       |
| `openclaw tasks flow cancel <id>` | Annule un flux en cours d'exécution et ses tâches actives                |

## Relation entre les flux et les tâches

Les flux coordonnent les tâches, ils ne les remplacent pas. Un seul flux peut piloter plusieurs tâches d'arrière-plan au cours de sa durée de vie. Utilisez `openclaw tasks` pour inspecter les enregistrements de tâches individuels et `openclaw tasks flow` pour inspecter le flux d'orchestration.

## Connexes

- [Tâches d'arrière-plan](/fr/automation/tasks) — le registre de travail détaché que coordonnent les flux
- [CLI : tâches](/fr/cli/tasks) — référence de commande CLI pour `openclaw tasks flow`
- [Aperçu de l'automatisation](/fr/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Tâches Cron](/fr/automation/cron-jobs) — tâches planifiées qui peuvent alimenter les flux
