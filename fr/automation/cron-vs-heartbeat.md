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

## Guide de décision rapide

| Cas d'usage                                          | Recommandé               | Pourquoi                                                    |
| ---------------------------------------------------- | ------------------------ | ----------------------------------------------------------- |
| Vérifier la boîte de réception toutes les 30 min     | Heartbeat                | Regroupe avec d'autres vérifications, conscient du contexte |
| Envoyer un rapport quotidien à 9h précises           | Cron (isolé)             | Timing exact nécessaire                                     |
| Surveiller le calendrier pour les événements à venir | Heartbeat                | Adapté naturellement à la conscience périodique             |
| Exécuter une analyse approfondie hebdomadaire        | Cron (isolé)             | Tâche autonome, peut utiliser un modèle différent           |
| Me le rappeler dans 20 minutes                       | Cron (principal, `--at`) | Tâche unique avec un timing précis                          |
| Vérification de l'état du projet en arrière-plan     | Heartbeat                | S'appuie sur le cycle existant                              |

## Heartbeat : Conscience périodique

Les heartbeats s'exécutent dans la **session principale** à intervalle régulier (par défaut : 30 min). Ils sont conçus pour que l'agent vérifie certaines choses et signale tout ce qui est important.

### Quand utiliser heartbeat

- **Plusieurs vérifications périodiques** : Au lieu de 5 tâches cron distinctes vérifiant la boîte de réception, le calendrier, la météo, les notifications et l'état du projet, un seul heartbeat peut tout regrouper.
- **Décisions conscientes du contexte** : L'agent dispose du contexte complet de la session principale, il peut donc prendre des décisions intelligentes sur ce qui est urgent et ce qui peut attendre.
- **Continuité conversationnelle** : Les exécutions d'heartbeat partagent la même session, l'agent se souvient donc des conversations récentes et peut faire des suivis naturellement.
- **Surveillance à faible charge** : Un heartbeat remplace de nombreuses petites tâches d'interrogation (polling).

### Avantages d'Heartbeat

- **Regroupe plusieurs vérifications** : Un tour d'agent peut examiner la boîte de réception, le calendrier et les notifications ensemble.
- **Réduit les appels API** : Un seul heartbeat est moins coûteux que 5 tâches cron isolées.
- **Conscient du contexte** : L'agent sait sur quoi vous travailliez et peut prioriser en conséquence.
- **Suppression intelligente** : Si rien ne requiert d'attention, l'agent répond `HEARTBEAT_OK` et aucun message n'est envoyé.
- **Minutage naturel** : Dérive légèrement en fonction de la charge de la file d'attente, ce qui convient à la plupart des surveillances.

### Exemple de heartbeat : liste de contrôle HEARTBEAT.md

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

L'agent lit cela à chaque heartbeat et gère tous les éléments en un seul tour.

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

Voir [Heartbeat](/fr/gateway/heartbeat) pour la configuration complète.

## Cron : Planification précise

Les tâches Cron s'exécutent à des heures précises et peuvent fonctionner dans des sessions isolées sans affecter le contexte principal.
Les planifications récurrentes en haut de l'heure sont automatiquement réparties par un décalage
déterministe par tâche dans une fenêtre de 0 à 5 minutes.

### Quand utiliser cron

- **Minuterie exacte requise** : « Envoyez ceci à 9h00 tous les lundis » (et non « vers 9h »).
- **Tâches autonomes** : Tâches qui n'ont pas besoin de contexte conversationnel.
- **Modèle/pensée différent** : Analyse lourde justifiant un modèle plus puissant.
- **Rappels ponctuels** : « Rappelez-moi dans 20 minutes » avec `--at`.
- **Tâches bruyantes/fréquentes** : Tâches qui encombreraient l'historique de la session principale.
- **Déclencheurs externes** : Tâches qui doivent s'exécuter indépendamment de l'activité de l'agent.

### Avantages de Cron

- **Minutage précis** : Expressions cron à 5 ou 6 champs (secondes) avec support du fuseau horaire.
- **Répartition de charge intégrée** : les planifications récurrentes en haut de l'heure sont échelonnées jusqu'à 5 minutes par défaut.
- **Contrôle par tâche** : remplacer l'échelonnement avec `--stagger <duration>` ou forcer la minuterie exacte avec `--exact`.
- **Isolation de session** : S'exécute dans `cron:<jobId>` sans polluer l'historique principal.
- **Surcharges de modèle** : Utiliser un modèle moins cher ou plus puissant par tâche.
- **Contrôle de livraison** : Les tâches isolées par défaut sont `announce` (résumé) ; choisissez `none` au besoin.
- **Livraison immédiate** : Le mode annonce publie directement sans attendre le heartbeat.
- **Pas besoin de contexte d'agent** : S'exécute même si la session principale est inactive ou compactée.
- **Prise en charge unique** : `--at` pour des horodatages futurs précis.

### Exemple Cron : Briefing quotidien du matin

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

Voir [Tâches Cron](/fr/automation/cron-jobs) pour la référence complète de la CLI.

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

1. **Heartbeat** gère la surveillance de routine (boîte de réception, calendrier, notifications) en un seul tour groupé toutes les 30 minutes.
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

**Tâches Cron** (chronométrage précis) :

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster : Workflows déterministes avec approbations

Lobster est le moteur d'exécution de workflow pour **pipelines d'outils multi-étapes** qui nécessitent une exécution déterministe et des approbations explicites.
Utilisez-le lorsque la tâche dépasse un seul tour d'agent, et que vous souhaitez un workflow reproductible avec des points de contrôle humains.

### Quand Lobster convient

- **Automatisation multi-étapes** : Vous avez besoin d'un pipeline fixe d'appels d'outils, et non d'une invite ponctuelle.
- **Portes d'approbation** : Les effets secondaires doivent mettre en pause jusqu'à votre approbation, puis reprendre.
- **Exécutions reprises** : Continuer un workflow en pause sans relancer les étapes précédentes.

### Comment il s'associe avec heartbeat et cron

- **Heartbeat/cron** décident _quand_ une exécution a lieu.
- **Lobster** définit _quelles étapes_ ont lieu une fois l'exécution commencée.

Pour les workflows planifiés, utilisez cron ou heartbeat pour déclencher un tour d'agent qui appelle Lobster.
Pour les workflows ponctuels, appelez Lobster directement.

### Notes opérationnelles (depuis le code)

- Lobster s'exécute en tant que **sous-processus local** (`lobster` CLI) en mode outil et renvoie une **enveloppe JSON**.
- Si l'outil renvoie `needs_approval`, vous reprenez avec un `resumeToken` et le drapeau `approve`.
- L'outil est un **plugin optionnel** ; activez-le de manière additive via `tools.alsoAllow: ["lobster"]` (recommandé).
- Lobster s'attend à ce que le `lobster` Lobster soit disponible sur `PATH`.

Voir [Lobster](/fr/tools/lobster) pour l'utilisation complète et les exemples.

## Session principale vs Session isolée

Le heartbeat et le cron peuvent tous deux interagir avec la session principale, mais de manière différente :

|            | Heartbeat                      | Cron (main)                  | Cron (isolated)                                                   |
| ---------- | ------------------------------ | ---------------------------- | ----------------------------------------------------------------- |
| Session    | Main                           | Main (via system event)      | `cron:<jobId>` ou session personnalisée                           |
| Historique | Shared                         | Shared                       | Fraîche à chaque exécution (isolée) / Persistante (personnalisée) |
| Contexte   | Full                           | Full                         | Aucune (isolée) / Cumulative (personnalisée)                      |
| Modèle     | Modèle de session principale   | Modèle de session principale | Peut être remplacé                                                |
| Sortie     | Délivrée si non `HEARTBEAT_OK` | Heartbeat prompt + event     | Résumé de l'annonce (par défaut)                                  |

### Quand utiliser le cron de session principale

Utilisez `--session main` avec `--system-event` lorsque vous souhaitez :

- Que le rappel/événement apparaisse dans le contexte de la session principale
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

- Une page blanche sans contexte préalable
- Un modèle ou des paramètres de réflexion différents
- Annoncer des résumés directement à un channel
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

## Considérations de coût

| Mécanisme       | Profil de coût                                                         |
| --------------- | ---------------------------------------------------------------------- |
| Heartbeat       | Un tour toutes les N minutes ; évolue avec la taille de HEARTBEAT.md   |
| Cron (main)     | Ajoute un événement au prochain heartbeat (pas de tour isolé)          |
| Cron (isolated) | Tour complet d'agent par tâche ; peut utiliser un modèle moins coûteux |

**Conseils** :

- Gardez `HEARTBEAT.md` petit pour minimiser la surcharge de tokens.
- Regroupez les vérifications similaires dans le heartbeat au lieu de plusieurs tâches cron.
- Utilisez `target: "none"` sur le heartbeat si vous ne voulez qu'un traitement interne.
- Utilisez le cron isolé avec un modèle moins coûteux pour les tâches de routine.

## Connexes

- [Heartbeat](/fr/gateway/heartbeat) - configuration complète du heartbeat
- [Tâches cron](/fr/automation/cron-jobs) - référence complète de la CLI et de l'API cron
- [Système](/fr/cli/system) - événements système + contrôles heartbeat

import fr from "/components/footer/fr.mdx";

<fr />
