---
summary: "Aperçu des mécanismes d'automatisation : tâches, cron, hooks, ordres permanents et Task Flow"
read_when:
  - Deciding how to automate work with OpenClaw
  - Choosing between heartbeat, cron, hooks, and standing orders
  - Looking for the right automation entry point
title: "Automation & tâches"
---

OpenClaw exécute des travaux en arrière-plan via des tâches, des travaux planifiés, des hooks d'événements et des instructions permanentes. Cette page vous aide à choisir le bon mécanisme et à comprendre comment ils s'articulent.

## Guide de décision rapide

```mermaid
flowchart TD
    START([What do you need?]) --> Q1{Schedule work?}
    START --> Q2{Track detached work?}
    START --> Q3{Orchestrate multi-step flows?}
    START --> Q4{React to lifecycle events?}
    START --> Q5{Give the agent persistent instructions?}

    Q1 -->|Yes| Q1a{Exact timing or flexible?}
    Q1a -->|Exact| CRON["Scheduled Tasks (Cron)"]
    Q1a -->|Flexible| HEARTBEAT[Heartbeat]

    Q2 -->|Yes| TASKS[Background Tasks]
    Q3 -->|Yes| FLOW[Task Flow]
    Q4 -->|Yes| HOOKS[Hooks]
    Q5 -->|Yes| SO[Standing Orders]
```

| Cas d'usage                                                  | Recommandé               | Pourquoi                                                                   |
| ------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------- |
| Envoyer le rapport quotidien à 9h00 précises                 | Tâches planifiées (Cron) | Timing exact, exécution isolée                                             |
| Me rappeler dans 20 minutes                                  | Tâches planifiées (Cron) | Une seule fois avec un timing précis (`--at`)                              |
| Exécuter une analyse approfondie hebdomadaire                | Tâches planifiées (Cron) | Tâche autonome, peut utiliser un modèle différent                          |
| Vérifier la boîte de réception toutes les 30 min             | Heartbeat                | Traité par lots avec d'autres vérifications, conscient du contexte         |
| Surveiller le calendrier pour les événements à venir         | Heartbeat                | Adapté naturellement à la surveillance périodique                          |
| Inspecter l'état d'un sous-agent ou d'une exécution ACP      | Tâches d'arrière-plan    | Le registre des tâches suit tout le travail détaché                        |
| Auditer ce qui a été exécuté et quand                        | Tâches d'arrière-plan    | `openclaw tasks list` et `openclaw tasks audit`                            |
| Recherche en plusieurs étapes puis résumer                   | Flux de tâches           | Orchestration durable avec suivi des révisions                             |
| Exécuter un script lors de la réinitialisation de la session | Hooks                    | Piloté par les événements, se déclenche sur les événements du cycle de vie |
| Exécuter du code à chaque appel d'outil                      | Hooks de plugin          | Les hooks in-process peuvent intercepter les appels d'outil                |
| Toujours vérifier la conformité avant de répondre            | Standing Orders          | Injecté automatiquement dans chaque session                                |

### Tâches planifiées (Cron) vs Heartbeat

| Dimension                 | Tâches planifiées (Cron)                  | Heartbeat                                                      |
| ------------------------- | ----------------------------------------- | -------------------------------------------------------------- |
| Timing                    | Exact (expressions cron, one-shot)        | Approximatif (par défaut toutes les 30 min)                    |
| Contexte de session       | Nouveau (isolé) ou partagé                | Contexte complet de la session principale                      |
| Enregistrements de tâches | Toujours créés                            | Jamais créés                                                   |
| Livraison                 | Canal, webhook ou silencieux              | En ligne dans la session principale                            |
| Idéal pour                | Rapports, rappels, travaux d'arrière-plan | Vérifications de boîte de réception, calendrier, notifications |

Utilisez les Tâches planifiées (Cron) lorsque vous avez besoin d'un timing précis ou d'une exécution isolée. Utilisez Heartbeat lorsque le travail bénéficie du contexte complet de la session et qu'un timing approximatif convient.

## Concepts clés

### Tâches planifiées (cron)

Cron est le planificateur intégré du Gateway pour un timing précis. Il persiste les travaux, réveille l'agent au bon moment et peut livrer la sortie à un canal de chat ou à un point de terminaison webhook. Prend en charge les rappels uniques, les expressions récurrentes et les déclencheurs de webhook entrants.

Voir [Tâches planifiées](/fr/automation/cron-jobs).

### Tâches

Le registre des tâches en arrière-plan suit tout le travail détaché : exécutions ACP, générations de sous-agents, exécutions cron isolées et opérations CLI. Les tâches sont des enregistrements, pas des planificateurs. Utilisez `openclaw tasks list` et `openclaw tasks audit` pour les inspecter.

Voir [Tâches en arrière-plan](/fr/automation/tasks).

### Flux de tâches

Le Flux de tâches est le substrat d'orchestration des flux au-dessus des tâches en arrière-plan. Il gère les flux durables en plusieurs étapes avec des modes de synchronisation gérés et miroir, le suivi des révisions et `openclaw tasks flow list|show|cancel` pour l'inspection.

Voir [Flux de tâches](/fr/automation/taskflow).

### Ordres permanents

Les ordres permanents accordent à l'agent une autorité opérationnelle permanente pour les programmes définis. Ils résident dans les fichiers de l'espace de travail (généralement `AGENTS.md`) et sont injectés dans chaque session. Combinez-les avec cron pour une application basée sur le temps.

Voir [Ordres permanents](/fr/automation/standing-orders).

### Crochets (Hooks)

Les hooks internes sont des scripts pilotés par les événements déclenchés par les événements du cycle de vie de l'agent (`/new`, `/reset`, `/stop`), la compactage de session, le démarrage de la passerelle et le flux de messages. Ils sont automatiquement découverts à partir des répertoires et peuvent être gérés avec `openclaw hooks`. Pour l'interception des appels d'outils en cours de processus, utilisez les [Plugin hooks](/fr/plugins/hooks).

Voir [Crochets](/fr/automation/hooks).

### Heartbeat

Heartbeat est un tour de session principal périodique (par défaut toutes les 30 minutes). Il regroupe plusieurs vérifications (boîte de réception, calendrier, notifications) en un tour d'agent avec le contexte complet de la session. Les tours Heartbeat ne créent pas d'enregistrements de tâches et n'étendent pas la fraîcheur de la réinitialisation quotidiale/inactive de la session. Utilisez `HEARTBEAT.md` pour une petite liste de contrôle, ou un bloc `tasks:` lorsque vous souhaitez des vérifications périodiques dues uniquement à l'intérieur du heartbeat lui-même. Les fichiers heartbeat vides sont ignorés en tant que `empty-heartbeat-file` ; le mode de tâche dû uniquement est ignoré en tant que `no-tasks-due`.

Voir [Heartbeat](/fr/gateway/heartbeat).

## Fonctionnement conjoint

- **Cron** gère les horaires précis (rapports quotidiens, revues hebdomadaires) et les rappels ponctuels. Toutes les exécutions cron créent des enregistrements de tâches.
- **Heartbeat** gère la surveillance de routine (boîte de réception, calendrier, notifications) en un seul traitement groupé toutes les 30 minutes.
- **Hooks** réagissent à des événements spécifiques (réinitialisations de session, compactage, flux de messages) avec des scripts personnalisés. Les hooks de plug-in couvrent les appels d'outils.
- **Standing orders** donnent à l'agent un contexte persistant et des limites d'autorité.
- **Task Flow** coordonne les flux multi-étapes au-dessus des tâches individuelles.
- **Tasks** suivent automatiquement tout le travail détaché afin que vous puissiez l'inspecter et l'auditer.

## Connexes

- [Scheduled Tasks](/fr/automation/cron-jobs) — planification précise et rappels ponctuels
- [Background Tasks](/fr/automation/tasks) — registre des tâches pour tout le travail détaché
- [Task Flow](/fr/automation/taskflow) — orchestration de flux durable en plusieurs étapes
- [Hooks](/fr/automation/hooks) — scripts de cycle de vie pilotés par les événements
- [Plugin hooks](/fr/plugins/hooks) — hooks d'outils, de invites, de messages et de cycle de vie in-process
- [Standing Orders](/fr/automation/standing-orders) — instructions persistantes pour l'agent
- [Heartbeat](/fr/gateway/heartbeat) — tours périodiques de la session principale
- [Configuration Reference](/fr/gateway/configuration-reference) — toutes les clés de configuration
