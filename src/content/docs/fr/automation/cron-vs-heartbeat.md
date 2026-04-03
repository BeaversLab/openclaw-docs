---
summary: "Conseils pour choisir entre les battements de cœur (heartbeat) et les tâches cron pour l'automatisation"
read_when:
  - Deciding how to schedule recurring tasks
  - Setting up background monitoring or notifications
  - Optimizing token usage for periodic checks
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat : quand utiliser chacun d'eux

Les battements de cœur (heartbeats) et les tâches cron vous permettent tous deux d'exécuter des tâches selon un planning. Ce guide vous aide à choisir le bon mécanisme pour votre cas d'usage.

Une distinction importante :

- **Heartbeat** est un **tour de session principale** planifié — aucun enregistrement de tâche n'est créé.
- **Cron (main)** est un **événement système dans la session principale** planifié — crée un enregistrement de tâche avec la politique de notification `silent`.
- **Cron (isolated)** est une **exécution en arrière-plan** planifiée — crée un enregistrement de tâche suivi dans `openclaw tasks`.

Toutes les exécutions de tâches cron (principales et isolées) créent des [enregistrements de tâches](/en/automation/tasks). Les tours Heartbeat non. Les tâches cron de session principale utilisent la politique de notification `silent` par défaut, elles ne génèrent donc pas de notifications.

## Guide de décision rapide

| Cas d'usage                                          | Recommandé          | Pourquoi                                                    |
| ---------------------------------------------------- | ------------------- | ----------------------------------------------------------- |
| Vérifier la boîte de réception toutes les 30 min     | Heartbeat           | Regroupé avec d'autres vérifications, conscient du contexte |
| Envoyer un rapport quotidien à 9h précises           | Cron (isolated)     | Timing exact nécessaire                                     |
| Surveiller le calendrier pour les événements à venir | Heartbeat           | Choix naturel pour une conscience périodique                |
| Exécuter une analyse approfondie hebdomadaire        | Cron (isolated)     | Tâche autonome, peut utiliser un model différent            |
| Me le rappeler dans 20 minutes                       | Cron (main, `--at`) | Exécution unique avec un timing précis                      |
| Vérification de l'état du projet en arrière-plan     | Heartbeat           | S'appuie sur le cycle existant                              |

## Heartbeat : Conscience périodique

Les Heartbeats s'exécutent dans la **session principale** à intervalle régulier (par défaut : 30 min). Ils sont conçus pour que l'agent vérifie certains éléments et signale tout ce qui est important.

### Quand utiliser heartbeat

- **Plusieurs vérifications périodiques** : Au lieu de 5 tâches cron distinctes vérifiant la boîte de réception, le calendrier, la météo, les notifications et l'état du projet, un seul heartbeat peut regrouper tout cela.
- **Décisions contextuelles** : L'agent dispose du contexte complet de la session principale, il peut donc prendre des décisions intelligentes sur ce qui est urgent par rapport à ce qui peut attendre.
- **Continuité conversationnelle** : Les exécutions Heartbeat partagent la même session, donc l'agent se souvient des conversations récentes et peut faire des suivis naturellement.
- **Surveillance à faible charge** : Un seul heartbeat remplace de nombreuses petites tâches d'interrogation (polling).

### Avantages du Heartbeat

- **Regroupe plusieurs vérifications** : Un tour d'agent peut examiner la boîte de réception, le calendrier et les notifications ensemble.
- **Réduit les appels API** : Un seul heartbeat est moins coûteux que 5 tâches cron isolées.
- **Conscient du contexte** : L'agent sait sur quoi vous travailliez et peut prioriser en conséquence.
- **Suppression intelligente** : Si rien ne nécessite d'attention, l'agent répond `HEARTBEAT_OK` et aucun message n'est délivré.
- **Timing naturel** : Dérive légèrement en fonction de la charge de la file d'attente, ce qui convient à la plupart des surveillances.
- **Aucun enregistrement de tâche** : les tours heartbeat restent dans l'historique de la session principale (voir [Tâches d'arrière-plan](/en/automation/tasks)).

### Exemple de heartbeat : liste de contrôle HEARTBEAT.md

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

L'agent lit ceci à chaque heartbeat et gère tous les éléments en un seul tour.

### Configuration du heartbeat

```json5
{
  agents: {
    defaults: {
      heartbeat: {
        every: "30m", // interval
        target: "last", // explicit alert delivery target (default is "none")
        activeHours: { start: "08:00", end: "22:00" }, // optional
      },
    },
  },
}
```

Voir [Heartbeat](/en/gateway/heartbeat) pour la configuration complète.

## Cron : Planification précise

Les tâches cron s'exécutent à des moments précis et peuvent fonctionner dans des sessions isolées sans affecter le contexte principal.
Les planifications récurrentes en haut de l'heure sont automatiquement réparties par un décalage
déterministe par tâche dans une fenêtre de 0 à 5 minutes.

### Quand utiliser cron

- **Timing exact requis** : « Envoyez ceci à 9h00 tous les lundis » (et non « vers 9h »).
- **Tâches autonomes** : Tâches qui n'ont pas besoin de contexte conversationnel.
- **Modèle/pensée différent** : Analyse lourde qui justifie un modèle plus puissant.
- **Rappels ponctuels** : « Rappelez-moi dans 20 minutes » avec `--at`.
- **Tâches bruyantes/fréquentes** : Tâches qui encombreraient l'historique de la session principale.
- **Déclencheurs externes** : Tâches qui doivent s'exécuter indépendamment du fait que l'agent est par ailleurs actif ou non.

### Avantages de Cron

- **Timing précis** : expressions cron à 5 ou 6 champs (secondes) avec prise en charge du fuseau horaire.
- **Répartition de charge intégrée** : les planifications récurrentes en haut de l'heure sont échelonnées jusqu'à 5 minutes par défaut.
- **Contrôle par tâche** : remplacer l'échelonnement avec `--stagger <duration>` ou forcer le timing exact avec `--exact`.
- **Isolement de session** : S'exécute dans `cron:<jobId>` sans polluer l'historique principal.
- **Remplacements de modèle** : Utiliser un modèle moins coûteux ou plus puissant par tâche.
- **Contrôle de livraison** : Les tâches isolées sont par défaut réglées sur `announce` (résumé) ; choisissez `none` si nécessaire.
- **Livraison immédiate** : Le mode Annonce publie directement sans attendre le heartbeat.
- **Pas besoin de contexte d'agent** : S'exécute même si la session principale est inactive ou compactée.
- **Support ponctuel** : `--at` pour des horodatages futurs précis.
- **Suivi des tâches** : les tâches isolées créent des enregistrements de [tâche d'arrière-plan](/en/automation/tasks) visibles dans `openclaw tasks` et `openclaw tasks audit`.

### Exemple Cron : Briefing matinal quotidien

```bash
openclaw cron add \
  --name "Morning briefing" \
  --cron "0 7 * * *" \
  --tz "America/New_York" \
  --session isolated \
  --message "Generate today's briefing: weather, calendar, top emails, news summary." \
  --model opus \
  --announce \
  --channel whatsapp \
  --to "+15551234567"
```

Cela s'exécute exactement à 7h00 heure de New York, utilise Opus pour la qualité, et annonce un résumé directement sur WhatsApp.

### Exemple Cron : Rappel unique

```bash
openclaw cron add \
  --name "Meeting reminder" \
  --at "20m" \
  --session main \
  --system-event "Reminder: standup meeting starts in 10 minutes." \
  --wake now \
  --delete-after-run
```

Voir [Tâches Cron](/en/automation/cron-jobs) pour la référence complète de la CLI.

## Organigramme de décision

```
Does the task need to run at an EXACT time?
  YES -> Use cron
  NO  -> Continue...

Does the task need isolation from main session?
  YES -> Use cron (isolated)
  NO  -> Continue...

Can this task be batched with other periodic checks?
  YES -> Use heartbeat (add to HEARTBEAT.md)
  NO  -> Use cron

Is this a one-shot reminder?
  YES -> Use cron with --at
  NO  -> Continue...

Does it need a different model or thinking level?
  YES -> Use cron (isolated) with --model/--thinking
  NO  -> Use heartbeat
```

## Combiner les deux

La configuration la plus efficace utilise **les deux** :

1. **Heartbeat** gère la surveillance de routine (boîte de réception, calendrier, notifications) en un seul traitement groupé toutes les 30 minutes.
2. **Cron** gère les planifications précises (rapports quotidiens, revues hebdomadaires) et les rappels uniques.

### Exemple : Configuration d'automatisation efficace

**HEARTBEAT.md** (vérifié toutes les 30 min) :

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Tâches Cron** (timing précis) :

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster : Flux de travail déterministes avec approbations

Lobster est le moteur d'exécution de flux de travail pour les **pipelines d'outils multi-étapes** qui nécessitent une exécution déterministe et des approbations explicites.
Utilisez-le lorsque la tâche dépasse un seul tour d'agent et que vous souhaitez un flux de travail reproductible avec des points de contrôle humains.

### Quand Lobster convient

- **Automatisation multi-étapes** : Vous avez besoin d'un pipeline fixe d'appels d'outils, et non d'une invite unique.
- **Portes d'approbation** : Les effets secondaires doivent être mis en pause jusqu'à ce que vous approuviez, puis reprendre.
- **Exécutions reprises** : Continuez un flux de travail en pause sans relancer les étapes précédentes.

### Comment cela s'associe avec heartbeat et cron

- **Heartbeat/cron** décide _quand_ une exécution a lieu.
- **Lobster** définit _quelles étapes_ se produisent une fois l'exécution commencée.

Pour les flux de travail planifiés, utilisez cron ou heartbeat pour déclencher un tour d'agent qui appelle Lobster.
Pour les flux de travail ad-hoc, appelez Lobster directement.

### Notes opérationnelles (issues du code)

- Lobster s'exécute en tant que **sous-processus local** (`lobster` CLI) en mode outil et renvoie une **enveloppe JSON**.
- Si l'outil renvoie `needs_approval`, vous reprenez avec un `resumeToken` et le drapeau `approve`.
- L'outil est un **plugin optionnel** ; activez-le de manière additive via `tools.alsoAllow: ["lobster"]` (recommandé).
- Lobster s'attend à ce que la CLI `lobster` soit disponible sur `PATH`.

Voir [Lobster](/en/tools/lobster) pour l'utilisation complète et les exemples.

## Session principale vs Session isolée

Le heartbeat et le cron peuvent tous deux interagir avec la session principale, mais de manière différente :

|                                | Heartbeat                       | Cron (principal)                     | Cron (isolé)                                                   |
| ------------------------------ | ------------------------------- | ------------------------------------ | -------------------------------------------------------------- |
| Session                        | Principale                      | Principale (via événement système)   | `cron:<jobId>` ou session personnalisée                        |
| Historique                     | Partagé                         | Partagé                              | Nouveau à chaque exécution (isolé) / Persistant (personnalisé) |
| Contexte                       | Complet                         | Complet                              | Aucun (isolé) / Cumulatif (personnalisé)                       |
| Modèle                         | Modèle de la session principale | Modèle de la session principale      | Peut être remplacé                                             |
| Sortie                         | Délivrée si non `HEARTBEAT_OK`  | Invite heartbeat + événement         | Résumé de l'annonce (par défaut)                               |
| [Tâches](/en/automation/tasks) | Aucun enregistrement de tâche   | Enregistrement de tâche (silencieux) | Enregistrement de tâche (visible dans `openclaw tasks`)        |

### Quand utiliser le cron de session principale

Utilisez `--session main` avec `--system-event` lorsque vous souhaitez :

- Que le rappel/l'événement apparaisse dans le contexte de la session principale
- Que l'agent le gère lors du prochain heartbeat avec le contexte complet
- Aucune exécution isolée distincte

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### Quand utiliser le cron isolé

Utilisez `--session isolated` lorsque vous souhaitez :

- Un nouveau départ sans contexte préalable
- Un modèle ou des paramètres de réflexion différents
- Envoyer des résumés directement à un channel
- Un historique qui n'encombre pas la session principale

```bash
openclaw cron add \
  --name "Deep analysis" \
  --cron "0 6 * * 0" \
  --session isolated \
  --message "Weekly codebase analysis..." \
  --model opus \
  --thinking high \
  --announce
```

## Considérations de coûts

| Mécanisme        | Profil de coûts                                                              |
| ---------------- | ---------------------------------------------------------------------------- |
| Heartbeat        | Un tour toutes les N minutes ; évolue avec la taille du fichier HEARTBEAT.md |
| Cron (principal) | Ajoute un événement au prochain heartbeat (pas de tour isolé)                |
| Cron (isolé)     | Tour complet de l'agent par tâche ; peut utiliser un modèle moins coûteux    |

**Conseils** :

- Gardez `HEARTBEAT.md` petit pour minimiser la surcharge de jetons.
- Regroupez les vérifications similaires dans le heartbeat plutôt que dans plusieurs tâches cron.
- Utilisez `target: "none"` sur le heartbeat si vous voulez uniquement un traitement interne.
- Utilisez le cron isolé avec un modèle moins coûteux pour les tâches de routine.

## Connexes

- [Aperçu de l'automatisation](/en/automation) — tous les mécanismes d'automatisation en un coup d'œil
- [Heartbeat](/en/gateway/heartbeat) — configuration complète du heartbeat
- [Tâches cron](/en/automation/cron-jobs) — référence complète de la CLI et de l'API cron
- [Tâches d'arrière-plan](/en/automation/tasks) — registre des tâches, audit et cycle de vie
- [Système](/en/cli/system) — événements système + contrôles heartbeat
