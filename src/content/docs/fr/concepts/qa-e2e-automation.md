---
summary: "Forme d'automatisation QA privée pour qa-lab, qa-channel, scénarios amorcés et rapports de protocole"
read_when:
  - Extending qa-lab or qa-channel
  - Adding repo-backed QA scenarios
  - Building higher-realism QA automation around the Gateway dashboard
title: "QA E2E Automation"
---

# Automatisation E2E QA

La pile QA privée est destinée à exercer OpenClaw de manière plus réaliste,
sous la forme d'un channel, qu'un test unitaire unique ne le peut.

Éléments actuels :

- `extensions/qa-channel` : canal de messages synthétique avec DM, channel, thread,
  réaction, modification et surfaces de suppression.
- `extensions/qa-lab` : interface utilisateur de débogage et bus QA pour observer la transcription,
  injecter des messages entrants et exporter un rapport Markdown.
- `qa/` : ressources d'amorçage (seed) soutenues par le repo pour la tâche de lancement et les scénarios QA
  de référence.

Le flux actuel de l'opérateur QA est un site QA à deux volets :

- Gauche : tableau de bord Gateway (Interface de contrôle) avec l'agent.
- Droite : QA Lab, affichant la transcription de type Slack et le plan de scénario.

Lancez-le avec :

```bash
pnpm qa:lab:up
```

Cela construit le site QA, démarre la voie de passerelle (gateway lane) soutenue par Docker et expose la
page QA Lab où un opérateur ou une boucle d'automatisation peut donner à l'agent une mission QA,
observer le comportement réel du channel, et enregistrer ce qui a fonctionné, échoué, ou
resté bloqué.

Pour une itération plus rapide de l'interface utilisateur de QA Lab sans reconstruire l'image Docker à chaque fois,
démarrez la pile avec un bundle QA Lab monté en liaison (bind-mounted) :

```bash
pnpm openclaw qa docker-build-image
pnpm qa:lab:build
pnpm qa:lab:up:fast
pnpm qa:lab:watch
```

`qa:lab:up:fast` maintient les services Docker sur une image préconstruite et monte en liaison
`extensions/qa-lab/web/dist` dans le conteneur `qa-lab`. `qa:lab:watch`
reconstruit ce bundle lors des modifications, et le navigateur se recharge automatiquement lorsque le hachage
des ressources QA Lab change.

## Graines (Seeds) soutenues par le repo

Les ressources d'amorçage (seed assets) résident dans `qa/` :

- `qa/scenarios/index.md`
- `qa/scenarios/*.md`

Ils sont intentionnellement dans git afin que le plan QA soit visible à la fois par les humains et par
l'agent. La liste de référence doit rester suffisamment large pour couvrir :

- Chat DM et channel
- comportement des fils de discussion (threads)
- cycle de vie des actions de message
- rappels cron
- rappel de mémoire
- changement de model
- transfert vers un sous-agent (subagent handoff)
- lecture de repo et lecture de docs
- une petite tâche de construction telle que Lobster Invaders

## Rapports

`qa-lab` exporte un rapport de protocole Markdown à partir de la chronologie du bus observée.
Le rapport doit répondre :

- Ce qui a fonctionné
- Ce qui a échoué
- Ce qui est resté bloqué
- Quels scénarios de suivi valent la peine d'être ajoutés

## Documentation connexe

- [Tests](/en/help/testing)
- [QA Channel](/en/channels/qa-channel)
- [Tableau de bord](/en/web/dashboard)
