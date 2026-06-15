---
summary: "Créer et mettre à jour les compétences de l'espace de travail via la révision de Skill Workshop"
read_when:
  - You want the agent to create or update a skill from chat
  - You need to review, apply, reject, or quarantine a generated skill draft
  - You are configuring Skill Workshop approval, autonomy, storage, or limits
title: "Skill Workshop"
sidebarTitle: "Skill Workshop"
---

Skill Workshop est la voie gouvernée de OpenClaw pour créer et mettre à jour les compétences de l'espace de travail.

Les agents et les opérateurs n'écrivent pas directement de fichiers `SKILL.md` actifs via cette voie. Ils créent d'abord une **proposition**. Une proposition est un brouillon en attente contenant le contenu de la compétence proposée, la liaison cible, l'état du scanner, les hachages, les métadonnées des fichiers de support et les métadonnées de restauration. Elle ne devient une compétence active que lorsqu'elle est appliquée.

Skill Workshop n'écrit que les compétences de l'espace de travail. Il ne modifie pas les compétences groupées, de plugin, ClawHub, extra-root, gérées, d'agent personnel ou système.

## Fonctionnement

- **Proposition d'abord :** le contenu de la compétence générée est stocké sous forme de `PROPOSAL.md`, et non de `SKILL.md`.
- **Appliquer est la seule écriture active :** créer, mettre à jour et réviser ne changent pas les compétences actives.
- **Délimité à l'espace de travail :** les créations ciblent la racine `skills/` de l'espace de travail. Les mises à jour ne sont autorisées que pour les compétences inscriptibles de l'espace de travail.
- **Pas d'écrasement :** la création échoue si la compétence cible existe déjà.
- **Lié par hachage :** les propositions de mise à jour se lient au hachage cible actuel et deviennent obsolètes si la compétence active change avant l'application.
- **Contrôlé par le scanner :** l'application relance l'analyse avant d'écrire.
- **Récupérable :** l'application écrit les métadonnées de restauration avant de modifier les fichiers actifs.
- **Surfaces cohérentes :** le chat, la CLI et la Gateway appellent tous le même service Skill Workshop.

## Cycle de vie

```text
create/update -> pending
revise        -> pending
apply         -> applied
reject        -> rejected
quarantine    -> quarantined
target change -> stale
```

Seules les propositions `pending` peuvent être révisées, appliquées, rejetées ou mises en quarantaine.

## Chat

Demandez à l'agent la compétence que vous souhaitez. L'agent appelle `skill_workshop` et renvoie un identifiant de proposition.

Créer :

```text
Make a skill called morning-catchup that runs my Monday inbox routine.
```

Mettre à jour une compétence d'espace de travail existante :

```text
Update trip-planning to also check seat maps before booking.
```

Itérer sur une proposition en attente :

```text
Show me the morning-catchup proposal.
Revise it to also flag anything marked urgent.
Apply the morning-catchup proposal.
```

Par défaut, les `apply`, `reject` et `quarantine` initiés par l'agent affichent
une invite d'approbation avant leur exécution. Définissez `skills.workshop.approvalPolicy` sur
`"auto"` pour ignorer l'invite dans les environnements de confiance.

## CLI

Créer une nouvelle proposition de compétence :

```bash
openclaw skills workshop propose-create \
  --name morning-catchup \
  --description "Daily inbox catch-up: triage, archive, surface, draft, plan" \
  --proposal ./PROPOSAL.md
```

Créer une proposition de mise à jour pour une compétence d'espace de travail existante :

```bash
openclaw skills workshop propose-update trip-planning --proposal ./PROPOSAL.md
```

Lister et inspecter :

```bash
openclaw skills workshop list
openclaw skills workshop inspect <proposal-id>
```

Réviser avant approbation :

```bash
openclaw skills workshop revise <proposal-id> --proposal ./PROPOSAL.md
```

Clôturer la proposition :

```bash
openclaw skills workshop apply <proposal-id>
openclaw skills workshop reject <proposal-id> --reason "Duplicate"
openclaw skills workshop quarantine <proposal-id> --reason "Needs security review"
```

## Contenu de la proposition

Pendant qu'elle est en attente, la proposition est stockée sous forme de `PROPOSAL.md` avec des
frontmatter spécifiques à la proposition :

```markdown
---
name: "morning-catchup"
description: "Daily inbox catch-up: triage, archive, surface, draft, plan"
status: proposal
version: "v1"
date: "2026-05-30T00:00:00.000Z"
---
```

Lors de l'application, Skill Workshop écrit le `SKILL.md` actif et supprime les champs
spécifiques à la proposition : `status`, proposition `version` et proposition `date`.

## Fichiers de support

Utilisez `--proposal-dir` lorsque la compétence proposée a besoin de fichiers à côté de `PROPOSAL.md` :

```bash
openclaw skills workshop propose-create \
  --name weekly-update \
  --description "Friday wrap-up: stats, highlights, next week's top three" \
  --proposal-dir ./weekly-update-proposal
```

Le répertoire doit contenir `PROPOSAL.md`. Les fichiers de support doivent se trouver sous :

- `assets/`
- `examples/`
- `references/`
- `scripts/`
- `templates/`

Skill Workshop analyse, hache et stocke les fichiers de support avec la proposition. Ils
sont écrits à côté du `SKILL.md` actif uniquement lors de l'application.

Les chemins de fichiers de support rejetés incluent les chemins absolus, les segments de chemin masqués,
la traversée de chemins, les chemins qui se chevauchent, les fichiers exécutables des répertoires de proposition,
le texte non UTF-8, les octets nuls et les fichiers situés en dehors des dossiers de support standard.

## Outil de l'agent

Le modèle utilise `skill_workshop` :

```text
action: create | update | revise | list | inspect | apply | reject | quarantine
```

Les agents doivent utiliser `skill_workshop` pour le travail de compétence généré. Ils ne doivent pas créer
ou modifier les fichiers de proposition via `write`, `edit`, `exec`, des commandes shell ou
des opérations directes sur le système de fichiers.

## Approbation et autonomie

```json5
{
  skills: {
    workshop: {
      autonomous: {
        enabled: false,
      },
      approvalPolicy: "pending",
      maxPending: 50,
      maxSkillBytes: 40000,
    },
  },
}
```

- `autonomous.enabled` : permet à OpenClaw de créer des propositions en attente à partir de signaux
  durables de conversation après des tours réussis. Par défaut : `false`.
- `approvalPolicy: "pending"` : nécessite une invite d'approbation avant
  une `apply`, une `reject` ou une `quarantine` initiées par l'agent.
- `approvalPolicy: "auto"` : ignore cette invite d'approbation. L'agent doit toujours
  appeler l'action.
- `maxPending` : limite les propositions en attente et en quarantaine par espace de travail.
- `maxSkillBytes` : limite la taille du corps de la proposition. Par défaut : `40000`.

Les descriptions des propositions sont toujours limitées à 160 octets.

## Méthodes de Gateway

```text
skills.proposals.list
skills.proposals.inspect
skills.proposals.create
skills.proposals.update
skills.proposals.revise
skills.proposals.apply
skills.proposals.reject
skills.proposals.quarantine
```

Les méthodes en lecture seule nécessitent `operator.read`. Les méthodes de modification nécessitent
`operator.admin`.

## Stockage

```text
<OPENCLAW_STATE_DIR>/skill-workshop/
  proposals.json
  proposals/<proposal-id>/
    proposal.json
    PROPOSAL.md
    rollback.json
    assets/
    examples/
    references/
    scripts/
    templates/
```

Répertoire d'état par défaut : `~/.openclaw`.

- `proposal.json` : enregistrement canonique de la proposition.
- `proposals.json` : index de liste rapide, reconstructible à partir des dossiers de propositions.
- `PROPOSAL.md` : proposition de compétence en attente.
- `rollback.json` : métadonnées de récupération écrites avant que l'application ne modifie les fichiers actifs.

## Limites

- Description : 160 octets.
- Corps de la proposition : `skills.workshop.maxSkillBytes` (par défaut 40 000).
- Fichiers de support : 64 par proposition.
- Taille des fichiers de support : 256 Ko chacun, 2 Mo au total.
- Propositions en attente et en quarantaine : `skills.workshop.maxPending` par espace de travail
  (par défaut 50).

## Dépannage

| Problème                                       | Résolution                                                                                               |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `Skill proposal description is too large`      | Raccourcir `description` à 160 octets ou moins.                                                          |
| `Skill proposal content is too large`          | Raccourcir le corps de la proposition ou augmenter `skills.workshop.maxSkillBytes`.                      |
| `Target skill changed after proposal creation` | Réviser la proposition par rapport à la cible actuelle, ou créer une nouvelle proposition.               |
| `Proposal scan failed`                         | Inspecter les résultats de l'analyse, puis réviser ou mettre en quarantaine la proposition.              |
| `Support file paths must be under one of...`   | Déplacer les fichiers de support sous `assets/`, `examples/`, `references/`, `scripts/` ou `templates/`. |
| La proposition n'apparaît pas dans la liste    | Vérifier l'espace de travail `--agent` sélectionné et `OPENCLAW_STATE_DIR`.                              |

## Connexes

- [Skills](/fr/tools/skills) pour l'ordre de chargement, la priorité et la visibilité
- [Creating skills](/fr/tools/creating-skills) pour les bases `SKILL.md`
  écrites à la main
- [Skills config](/fr/tools/skills-config) pour le schéma `skills.workshop` complet
- [Skills CLI](CLI/en/cli/skills) pour les commandes `openclaw skills`
