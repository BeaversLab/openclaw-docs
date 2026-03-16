---
summary: "Scripts de dépôt : objectif, portée et notes de sécurité"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "Scripts"
---

# Scripts

Le répertoire `scripts/` contient des scripts d'assistance pour les flux de travail locaux et les tâches d'exploitation.
Utilisez-les lorsqu'une tâche est clairement liée à un script ; sinon, préférez la CLI.

## Conventions

- Les scripts sont **facultatifs**, sauf s'ils sont mentionnés dans la documentation ou les listes de contrôle de version.
- Privilégiez les interfaces de CLI lorsqu'elles existent (exemple : la surveillance d'authentification utilise `openclaw models status --check`).
- Supposez que les scripts sont spécifiques à l'hôte ; lisez-les avant de les exécuter sur une nouvelle machine.

## Scripts de surveillance d'authentification

Les scripts de surveillance d'authentification sont documentés ici :
[/automation/auth-monitoring](/fr/automation/auth-monitoring)

## Lors de l'ajout de scripts

- Gardez les scripts concentrés et documentés.
- Ajoutez une courte entrée dans la documentation pertinente (ou créez-en une si elle manque).

import fr from "/components/footer/fr.mdx";

<fr />
