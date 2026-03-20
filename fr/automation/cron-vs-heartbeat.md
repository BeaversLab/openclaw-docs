---
summary: "Conseils pour choisir entre les tâches heartbeat et cron pour l'automatisation"
read_when:
  - Décider comment planifier des tâches récurrentes
  - Configuration de la surveillance en arrière-plan ou des notifications
  - Optimisation de l'utilisation des jetons pour les vérifications périodiques
title: "Cron vs Heartbeat"
---

# Cron vs Heartbeat : quand utiliser chacun

Les heartbeats et les tâches cron permettent tous deux d'exécuter des tâches selon un calendrier. Ce guide vous aide à choisir le bon mécanisme pour votre cas d'usage.

## Guide de décision rapide

| Cas d'usage                             | Recommandé         | Pourquoi                                      |
| ------------------------------------ | ------------------- | ---------------------------------------- |
| Vérifier la boîte de réception toutes les 30 min             | Heartbeat           | Regroupe avec d'autres vérifications, conscient du contexte |
| Envoyer le rapport quotidien à 9h précises       | Cron (isolé)     | Timing exact nécessaire                      |
| Surveiller le calendrier pour les événements à venir | Heartbeat           | Adapté naturel à la conscience périodique       |
| Exécuter une analyse approfondie hebdomadaire             | Cron (isolé)     | Tâche autonome, peut utiliser un model différent |
| Me rappeler dans 20 minutes              | Cron (main, `--at`) | Tâche unique avec un timing précis             |
| Vérification de l'état du projet en arrière-plan      | Heartbeat           | S'appuie sur le cycle existant             |

## Heartbeat : conscience périodique

Les heartbeats s'exécutent dans la **session principale** à intervalles réguliers (par défaut : 30 min). Ils sont conçus pour que l'agent vérifie certaines choses et signale tout ce qui est important.

### Quand utiliser le heartbeat

- **Plusieurs vérifications périodiques** : Au lieu de 5 tâches cron distinctes vérifiant la boîte de réception, le calendrier, la météo, les notifications et l'état du projet, un seul heartbeat peut tout regrouper.
- **Décisions contextuelles** : L'agent dispose du contexte complet de la session principale, il peut donc prendre des décisions intelligentes sur ce qui est urgent ou ce qui peut attendre.
- **Continuité conversationnelle** : Les exécutions de heartbeat partagent la même session, l'agent se souvient donc des conversations récentes et peut faire des suivis de manière naturelle.
- **Surveillance à faible charge** : Un seul heartbeat remplace de nombreuses petites tâches de sondage.

### Avantages du Heartbeat

- **Regroupe plusieurs vérifications** : Un tour d'agent peut examiner la boîte de réception, le calendrier et les notifications ensemble.
- **Réduit les appels API** : Un seul heartbeat est moins cher que 5 tâches cron isolées.
- **Conscient du contexte** : L'agent sait ce que vous avez fait et peut prioriser en conséquence.
- **Suppression intelligente** : Si rien ne nécessite d'attention, l'agent répond `HEARTBEAT_OK` et aucun message n'est délivré.
- **Timing naturel** : Dérive légèrement en fonction de la charge de la file d'attente, ce qui convient à la plupart des surveillances.

### Exemple de Heartbeat : liste de contrôle HEARTBEAT.md

```md
# Heartbeat checklist

- Check email for urgent messages
- Review calendar for events in next 2 hours
- If a background task finished, summarize results
- If idle for 8+ hours, send a brief check-in
```

L'agent lit cela à chaque battement et traite tous les éléments en un seul tour.

### Configuration du battement

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

Les tâches cron s'exécutent à des moments précis et peuvent fonctionner dans des sessions isolées sans affecter le contexte principal.
Les planifications récurrentes en haut de l'heure sont automatiquement réparties par un
décalage déterministe par tâche dans une fenêtre de 0 à 5 minutes.

### Quand utiliser cron

- **Horodatage exact requis** : « Envoyez ceci à 9h00 tous les lundis » (pas « vers 9h »).
- **Tâches autonomes** : Tâches qui n'ont pas besoin de contexte conversationnel.
- **Modèle/pensée différent** : Analyse lourde qui justifie un modèle plus puissant.
- **Rappels ponctuels** : « Rappelez-moi dans 20 minutes » avec `--at`.
- **Tâches bruyantes/fréquentes** : Tâches qui encombreraient l'historique de la session principale.
- **Déclencheurs externes** : Tâches qui doivent s'exécuter indépendamment du fait que l'agent soit par ailleurs actif.

### Avantages de Cron

- **Minuterie précise** : expressions cron à 5 ou 6 champs (secondes) avec prise en charge du fuseau horaire.
- **Répartition de charge intégrée** : les planifications récurrentes en haut de l'heure sont échelonnées jusqu'à 5 minutes par défaut.
- **Contrôle par tâche** : remplacer l'échelonnement avec `--stagger <duration>` ou forcer le minutage exact avec `--exact`.
- **Isolation de session** : S'exécute dans `cron:<jobId>` sans polluer l'historique principal.
- **Remplacements de modèle** : Utiliser un modèle moins coûteux ou plus puissant par tâche.
- **Contrôle de livraison** : Les tâches isolées utilisent par défaut `announce` (résumé) ; choisissez `none` si nécessaire.
- **Livraison immédiate** : Le mode annonce publie directement sans attendre le battement.
- **Aucun contexte d'agent requis** : Fonctionne même si la session principale est inactive ou compactée.
- **Support ponctuel** : `--at` pour des horodatages futurs précis.

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

Cela s'exécute exactement à 7h00 heure de New York, utilise Opus pour la qualité et annonce un résumé directement sur WhatsApp.

### Exemple Cron : Rappel ponctuel

```bash
openclaw cron add \
  --name "Meeting reminder" \
  --at "20m" \
  --session main \
  --system-event "Reminder: standup meeting starts in 10 minutes." \
  --wake now \
  --delete-after-run
```

Voir [Cron jobs](/fr/automation/cron-jobs) pour la référence complète de la CLI.

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

1. **Heartbeat** gère la surveillance de routine (boîte de réception, calendrier, notifications) en un seul lot toutes les 30 minutes.
2. **Cron** gère les planifications précises (rapports quotidiens, revues hebdomadaires) et les rappels ponctuels.

### Exemple : Configuration d'une automatisation efficace

**HEARTBEAT.md** (vérifié toutes les 30 min) :

```md
# Heartbeat checklist

- Scan inbox for urgent emails
- Check calendar for events in next 2h
- Review any pending tasks
- Light check-in if quiet for 8+ hours
```

**Tâches Cron** (synchronisation précise) :

```bash
# Daily morning briefing at 7am
openclaw cron add --name "Morning brief" --cron "0 7 * * *" --session isolated --message "..." --announce

# Weekly project review on Mondays at 9am
openclaw cron add --name "Weekly review" --cron "0 9 * * 1" --session isolated --message "..." --model opus

# One-shot reminder
openclaw cron add --name "Call back" --at "2h" --session main --system-event "Call back the client" --wake now
```

## Lobster : Workflows déterministes avec approbations

Lobster est le moteur d'exécution de workflow pour les **pipelines d'outils multi-étapes** qui nécessitent une exécution déterministe et des approbations explicites.
Utilisez-le lorsque la tâche dépasse un simple tour d'agent et que vous souhaitez un workflow reproductible avec des points de contrôle humains.

### Quand Lobster convient

- **Automatisation multi-étapes** : Vous avez besoin d'un pipeline fixe d'appels d'outils, et non d'une invite unique.
- **Portes d'approbation** : Les effets secondaires doivent se mettre en pause jusqu'à ce que vous approuviez, puis reprendre.
- **Exécutions reprises** : Continuer un workflow en pause sans réexécuter les étapes précédentes.

### Comment cela s'associe avec heartbeat et cron

- **Heartbeat/cron** décident _quand_ une exécution a lieu.
- **Lobster** définit _les étapes_ qui se produisent une fois l'exécution commencée.

Pour les workflows planifiés, utilisez cron ou heartbeat pour déclencher un tour d'agent qui appelle Lobster.
Pour les workflows ponctuels, appelez Lobster directement.

### Notes opérationnelles (issues du code)

- Lobster s'exécute en tant que **sous-processus local** (`lobster` CLI) en mode outil et renvoie une **enveloppe JSON**.
- Si l'outil renvoie `needs_approval`, vous reprenez avec un `resumeToken` et le drapeau `approve`.
- L'outil est un **plugin optionnel** ; activez-le de manière additive via `tools.alsoAllow: ["lobster"]` (recommandé).
- Lobster s'attend à ce que le `lobster` CLI soit disponible sur `PATH`.

Voir [Lobster](/fr/tools/lobster) pour l'utilisation complète et les exemples.

## Session principale vs Session isolée

À la fois heartbeat et cron peuvent interagir avec la session principale, mais différemment :

|         | Heartbeat                       | Cron (principal)              | Cron (isolé)                                 |
| ------- | ------------------------------- | ------------------------ | ----------------------------------------------- |
| Session | Principale                            | Principale (via événement système)  | `cron:<jobId>` ou session personnalisée                |
| Historique | Partagé                          | Partagé                   | Nouveau à chaque exécution (isolé) / Persistant (personnalisé) |
| Contexte | Complet                            | Complet                     | Aucun (isolé) / Cumulatif (personnalisé)           |
| Modèle   | Modèle de session principal              | Modèle de session principal       | Peut être remplacé                                    |
| Sortie  | Délivrée si pas `HEARTBEAT_OK` | Invite Heartbeat + événement | Annoncer le résumé (par défaut)                      |

### Quand utiliser le cron de session principale

Utilisez `--session main` avec `--system-event` quand vous voulez :

- Que le rappel/l'événement apparaisse dans le contexte de la session principale
- Que l'agent le gère lors du prochain battement de cœur avec le contexte complet
- Aucune exécution isolée séparée

```bash
openclaw cron add \
  --name "Check project" \
  --every "4h" \
  --session main \
  --system-event "Time for a project health check" \
  --wake now
```

### Quand utiliser le cron isolé

Utilisez `--session isolated` quand vous voulez :

- Un nouveau départ sans contexte antérieur
- Un modèle ou des paramètres de réflexion différents
- Annoncer les résumés directement sur un channel
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

## Consérations de coût

| Mécanisme       | Profil de coût                                            |
| --------------- | ------------------------------------------------------- |
| Battement de cœur       | Un tour toutes les N minutes ; évolue avec la taille de HEARTBEAT.md |
| Cron (principal)     | Ajoute l'événement au prochain battement de cœur (pas de tour isolé)         |
| Cron (isolé) | Tour complet de l'agent par tâche ; peut utiliser un modèle moins coûteux          |

**Conseils** :

- Gardez `HEARTBEAT.md` petit pour minimiser la surcharge de jetons.
- Regroupez les vérifications similaires dans le battement de cœur au lieu de plusieurs tâches cron.
- Utilisez `target: "none"` sur le battement de cœur si vous ne voulez qu'un traitement interne.
- Utilisez le cron isolé avec un modèle moins coûteux pour les tâches de routine.

## Connexes

- [Battement de cœur](/fr/gateway/heartbeat) - configuration complète du battement de cœur
- [Tâches cron](/fr/automation/cron-jobs) - référence complète de la CLI et de l'CLI du API
- [Système](/fr/cli/system) - événements système + contrôles du battement de cœur

import en from "/components/footer/en.mdx";

<en />
