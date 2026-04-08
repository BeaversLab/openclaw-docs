---
summary: "Format d'automatisation QA privée pour qa-lab, qa-channel, des scénarios amorcés et des rapports de protocole"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "Automatisation E2E QA"
---

# Automatisation E2E QA

La pile QA privée est destinée à exercer OpenClaw de manière plus réaliste,
sous la forme d'un channel, qu'un test unitaire unique ne le peut.

Éléments actuels :

- `extensions/qa-channel` : channel de messages synthétique avec DM, channel, fil,
  réaction, modification et surfaces de suppression.
- `extensions/qa-lab` : UI de débogueur et bus QA pour observer la transcription,
  injecter des messages entrants et exporter un rapport Markdown.
- `qa/` : ressources d'amorçage (seed) soutenues par le repo pour la tâche de démarrage et les scénarios QA
  de base.

L'objectif à long terme est un site QA à deux volets :

- Gauche : tableau de bord Gateway (Interface de contrôle) avec l'agent.
- Droite : QA Lab, affichant la transcription de type Slack et le plan de scénario.

Cela permet à un opérateur ou à une boucle d'automatisation de donner à l'agent une mission QA, d'observer
le comportement réel du channel et d'enregistrer ce qui a fonctionné, échoué ou est resté bloqué.

## Amorçages soutenus par le repo

Les ressources d'amorçage (seed assets) résident dans `qa/` :

- `qa/QA_KICKOFF_TASK.md`
- `qa/seed-scenarios.json`

Ils sont intentionnellement dans git pour que le plan QA soit visible à la fois par les humains et par
l'agent. La liste de base doit rester suffisamment large pour couvrir :

- Chat par DM et channel
- comportement du fil (thread)
- cycle de vie des actions de message
- rappels cron
- rappel de mémoire
- changement de modèle
- transfert à un sous-agent
- lecture de repo et lecture de docs
- une petite tâche de construction telle que Lobster Invaders

## Rapports

`qa-lab` exporte un rapport de protocole Markdown à partir de la chronologie du bus observée.
Le rapport doit répondre :

- Ce qui a fonctionné
- Ce qui a échoué
- Ce qui est resté bloqué
- Quels scénarios de suivi valent la peine d'être ajoutés

## Docs connexes

- [Tests](/en/help/testing)
- [QA Channel](/en/channels/qa-channel)
- [Tableau de bord](/en/web/dashboard)
