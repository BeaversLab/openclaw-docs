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

La surveillance de l'authentification est traitée dans [Authentification](/en/gateway/authentication). Les scripts sous `scripts/` sont des suppléments optionnels pour les flux de travail systemd/Termux sur téléphone.

## Assistant de lecture GitHub

Utilisez `scripts/gh-read` lorsque vous voulez que `gh` utilise un jeton d'installation d'application GitHub pour les appels de lecture limités au dépôt, tout en laissant le `gh` normal sur votre connexion personnelle pour les actions d'écriture.

Variables d'environnement requises :

- `OPENCLAW_GH_READ_APP_ID`
- `OPENCLAW_GH_READ_PRIVATE_KEY_FILE`

Variables d'environnement optionnelles :

- `OPENCLAW_GH_READ_INSTALLATION_ID` lorsque vous souhaitez ignorer la recherche d'installation basée sur le dépôt
- `OPENCLAW_GH_READ_PERMISSIONS` comme une substitution séparée par des virgules pour le sous-ensemble de permissions de lecture à demander

Ordre de résolution du dépôt :

- `gh ... -R owner/repo`
- `GH_REPO`
- `git remote origin`

Exemples :

- `scripts/gh-read pr view 123`
- `scripts/gh-read run list -R openclaw/openclaw`
- `scripts/gh-read api repos/openclaw/openclaw/pulls/123`

## Lors de l'ajout de scripts

- Gardez les scripts ciblés et documentés.
- Ajoutez une courte entrée dans la documentation appropriée (ou créez-en une si elle manque).
