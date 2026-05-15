---
summary: "Agent bootstrapping ritual that seeds the workspace and identity files"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Initialisation de l'agent"
sidebarTitle: "Initialisation"
---

L'amorçage est le rituel de **première exécution** qui prépare un espace de travail pour l'agent et collecte les détails d'identité. Il se produit après l'onboarding, lorsque l'agent démarre pour la première fois.

## Ce que fait l'initialisation

Lors de la première exécution de l'agent, OpenClaw initialise l'espace de travail (par défaut
`~/.openclaw/workspace`) :

- Crée les graines (seeds) `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`.
- Lance un rituel court de questions-réponses (une question à la fois).
- Écrit l'identité et les préférences dans `IDENTITY.md`, `USER.md`, `SOUL.md`.
- Supprime `BOOTSTRAP.md` une fois terminé pour qu'il ne s'exécute qu'une seule fois.

Pour les exécutions avec des modèles intégrés/locaux, OpenClaw maintient `BOOTSTRAP.md` en dehors du contexte système privilégié. Lors de la première exécution interactive principale, il transmet toujours le contenu du fichier dans l'invite utilisateur afin que les modèles qui n'appellent pas de manière fiable l'outil `read` puissent accomplir le rituel. Si l'exécution actuelle ne peut pas accéder en toute sécurité à l'espace de travail, l'agent reçoit une note d'amorçage limitée au lieu d'une salutation générique.

## Ignorer l'amorçage

Pour ignorer cette étape pour un espace de travail prérempli, exécutez `openclaw onboard --skip-bootstrap`.

## Où il s'exécute

L'amorçage s'exécute toujours sur l'**hôte de passerelle**. Si l'application macOS se connecte à une passerelle distante (Gateway), l'espace de travail et les fichiers d'amorçage résident sur cette machine distante.

<Note>Lorsque la Gateway s'exécute sur une autre machine, modifiez les fichiers de l'espace de travail sur l'hôte de passerelle (par exemple, `user@gateway-host:~/.openclaw/workspace`).</Note>

## Documentation connexe

- Onboarding de l'application macOS : [Onboarding](/fr/start/onboarding)
- Disposition de l'espace de travail : [Espace de travail de l'agent](/fr/concepts/agent-workspace)
