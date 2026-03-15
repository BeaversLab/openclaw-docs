---
summary: "Scripts de dépôt : objectif, portée et notes de sécurité"
read_when:
  - Running scripts from the repo
  - Adding or changing scripts under ./scripts
title: "Scripts"
---

# Scripts

Le répertoire `scripts/` contient des scripts d'aide pour les flux de travail locaux et les tâches d'exploitation.
Utilisez-les lorsqu'une tâche est clairement liée à un script ; sinon, privilégiez le CLI.

## Conventions

- Les scripts sont **facultatifs**, sauf s'ils sont mentionnés dans la documentation ou les listes de contrôle de version.
- Privilégiez les interfaces CLI lorsqu'elles existent (exemple : la surveillance de l'authentification utilise `openclaw models status --check`).
- Supposez que les scripts sont spécifiques à l'hôte ; lisez-les avant de les exécuter sur une nouvelle machine.

## Scripts de surveillance de l'authentification

Les scripts de surveillance de l'authentification sont documentés ici :
[/automation/auth-monitoring](/fr/automation/auth-monitoring)

## Lors de l'ajout de scripts

- Gardez les scripts ciblés et documentés.
- Ajoutez une courte entrée dans la documentation appropriée (ou créez-en une si elle manque).

import fr from '/components/footer/fr.mdx';

<fr />
