---
summary: "Mémoire de suivi déduite pour les points de contrôle qui ne sont pas des rappels exacts"
title: "Engagements déduits"
sidebarTitle: "Engagements"
read_when:
  - You want OpenClaw to remember natural follow-ups
  - You want to understand how inferred check-ins differ from reminders
  - You want to review or dismiss follow-up commitments
---

Les engagements sont des mémoires de suivi à court terme. Lorsqu'ils sont activés, OpenClaw peut
remarquer qu'une conversation a créé une opportunité de point de contrôle futur et se souvenir
de la ramener plus tard.

Exemples :

- Vous mentionnez un entretien demain. OpenClaw peut faire un point par la suite.
- Vous dites que vous êtes épuisé. OpenClaw peut demander plus tard si vous avez dormi.
- L'agent dit qu'il fera un suivi après un changement. OpenClaw peut suivre
  cette boucle ouverte.

Les engagements ne sont pas des faits durables comme `MEMORY.md`, et ce ne sont pas des rappels exacts.
Ils se situent entre la mémoire et l'automatisation : OpenClaw se souvient d'une
obligation liée à la conversation, puis heartbeat la délivre lorsqu'elle est due.

## Activer les engagements

Les engagements sont désactivés par défaut. Activez-les dans la configuration :

```bash
openclaw config set commitments.enabled true
openclaw config set commitments.maxPerDay 3
```

`openclaw.json` équivalent :

```json
{
  "commitments": {
    "enabled": true,
    "maxPerDay": 3
  }
}
```

`commitments.maxPerDay` limite le nombre de suivis déduits qui peuvent être livrés
par session d'agent sur un jour glissant. La valeur par défaut est `3`.

## Fonctionnement

Après une réponse de l'agent, OpenClaw peut exécuter une passe d'extraction en arrière-plan cachée dans un
contexte séparé. Cette passe ne recherche que les engagements de suivi déduits. Elle
n'écrit pas dans la conversation visible et ne demande pas à l'agent principal
de raisonner sur l'extraction.

Lorsqu'il trouve un candidat à haute confiance, OpenClaw stocke un engagement avec :

- l'identifiant de l'agent
- la clé de session
- le channel original et la cible de livraison
- une fenêtre d'échéance
- un court point de contrôle suggéré
- des métadonnées non instructionnelles pour que heartbeat décide de l'envoyer

La livraison se fait par le biais du heartbeat. Lorsqu'un engagement arrive à échéance, le heartbeat
ajoute l'engagement au tour de heartbeat pour le même agent et le même scope de canal.
Le modèle peut envoyer un point de suivi naturel ou une réponse `HEARTBEAT_OK` pour le rejeter.
Si le heartbeat est configuré avec `target: "none"`, les engagements dus restent
internes et n'envoient pas de points de contrôle externes. Les invites de livraison d'engagement ne
rejouent pas le texte de la conversation originale, et les tours de heartbeat pour les engagements dus s'exécutent
sans les outils OpenClaw.

OpenClaw ne livre jamais un engagement inféré immédiatement après l'avoir écrit.
L'heure d'échéance est limitée à au moins un intervalle de heartbeat après la création de l'engagement,
afin que le suivi ne puisse pas faire écho dans le même moment où il a été
inféré.

## Portée

Les engagements sont délimités au contexte exact de l'agent et du canal où ils ont été
créés. Un suivi inféré en parlant à un agent sur Discord n'est pas
livré par un autre agent, un autre canal, ou une session sans rapport.

Cette portée fait partie de la fonctionnalité. Les points de contrôle naturels doivent donner l'impression que la même
conversation se poursuit, et non qu'il s'agit d'un système de rappel global.

## Engagements vs rappels

| Besoin                                               | Utilisation                                   |
| ---------------------------------------------------- | --------------------------------------------- |
| "Rappelle-moi à 15 h"                                | [Tâches planifiées](/fr/automation/cron-jobs) |
| "Contacte-moi dans 20 minutes"                       | [Tâches planifiées](/fr/automation/cron-jobs) |
| "Exécute ce rapport chaque jour de la semaine"       | [Tâches planifiées](/fr/automation/cron-jobs) |
| "J'ai un entretien demain"                           | Engagements                                   |
| "Je n'ai pas dormi de la nuit"                       | Engagements                                   |
| "Fais un suivi si je ne réponds pas à ce fil ouvert" | Engagements                                   |

Les demandes exactes des utilisateurs appartiennent déjà au chemin du planificateur. Les engagements sont uniquement
pour les suivis inférés : les moments où l'utilisateur n'a pas demandé de rappel,
mais où la conversation a clairement créé un point de contrôle futur utile.

## Gérer les engagements

Utilisez le CLI pour inspecter et effacer les engagements stockés :

```bash
openclaw commitments
openclaw commitments --all
openclaw commitments --agent main
openclaw commitments --status snoozed
openclaw commitments dismiss cm_abc123
```

Voir [`openclaw commitments`](/fr/cli/commitments) pour la référence de la commande.

## Confidentialité et coût

L'extraction d'engagement utilise un passage LLM, donc l'activer ajoute une utilisation du modèle en arrière-plan
après les tours éligibles. Le passage est caché de la conversation visible par l'utilisateur,
mais il peut lire l'échange récent nécessaire pour décider si un
suivi existe.

Les engagements stockés sont un état local d'OpenClaw. Ce sont des mémoires opérationnelles, et non
à long terme. Désactivez la fonctionnalité avec :

```bash
openclaw config set commitments.enabled false
```

## Dépannage

Si les suivis attendus n'apparaissent pas :

- Confirmez que `commitments.enabled` est `true`.
- Vérifiez `openclaw commitments --all` pour les enregistrements en attente, rejetés, reportés ou
  expirés.
- Assurez-vous que le heartbeat (battement de cœur) est en cours d'exécution pour l'agent.
- Vérifiez si `commitments.maxPerDay` a déjà été atteint pour cette
  session d'agent.
- Rappelez-vous que les rappels exacts sont ignorés par l'extraction des engagements et doivent
  plutôt apparaître sous les [tâches planifiées](/fr/automation/cron-jobs).

## Connexes

- [Aperçu de la mémoire](/fr/concepts/memory)
- [Mémoire active](/fr/concepts/active-memory)
- [Heartbeat](/fr/gateway/heartbeat)
- [Tâches planifiées](/fr/automation/cron-jobs)
- [`openclaw commitments`](/fr/cli/commitments)
- [Référence de configuration](/fr/gateway/configuration-reference#commitments)
