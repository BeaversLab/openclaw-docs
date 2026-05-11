---
summary: "Agent bootstrapping ritual that seeds the workspace and identity files"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Initialisation de l'agent"
sidebarTitle: "Initialisation"
---

L'initialisation est le rituel du **premier démarrage** qui prépare un espace de travail pour l'agent et collecte les détails d'identité. Elle a lieu après l'intégration (onboarding), lorsque l'agent démarre pour la première fois.

## Ce que fait l'initialisation

Lors de la première exécution de l'agent, OpenClaw initialise l'espace de travail (par défaut
`~/.openclaw/workspace`) :

- Crée les graines (seeds) `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`.
- Lance un rituel court de questions-réponses (une question à la fois).
- Écrit l'identité et les préférences dans `IDENTITY.md`, `USER.md`, `SOUL.md`.
- Supprime `BOOTSTRAP.md` une fois terminé pour qu'il ne s'exécute qu'une seule fois.

## Ignorer l'initialisation

Pour ignorer cette étape pour un espace de travail pré-initialisé, exécutez `openclaw onboard --skip-bootstrap`.

## Où elle s'exécute

L'initialisation s'exécute toujours sur l'**hôte de la passerelle**. Si l'application macOS se connecte à une passerelle (Gateway) distante, l'espace de travail et les fichiers d'initialisation résident sur cette machine distante.

<Note>Lorsque la Gateway s'exécute sur une autre machine, modifiez les fichiers de l'espace de travail sur l'hôte de la passerelle (par exemple, `user@gateway-host:~/.openclaw/workspace`).</Note>

## Documentation connexe

- Intégration de l'application macOS : [Onboarding](/fr/start/onboarding)
- Structure de l'espace de travail : [Espace de travail de l'agent](/fr/concepts/agent-workspace)
