---
summary: "Agent bootstrapping ritual that seeds the workspace and identity files"
read_when:
  - Understanding what happens on the first agent run
  - Explaining where bootstrapping files live
  - Debugging onboarding identity setup
title: "Initialisation de l'agent"
sidebarTitle: "Initialisation"
---

# Initialisation de l'agent

L'initialisation est le rituel du **premier démarrage** qui prépare un espace de travail pour l'agent et collecte les détails d'identité. Cela se produit après l'onboarding, lorsque l'agent démarre pour la première fois.

## Rôle de l'initialisation

Lors de la première exécution de l'agent, OpenClaw initialise l'espace de travail (défaut `~/.openclaw/workspace`) :

- Crée les graines pour `AGENTS.md`, `BOOTSTRAP.md`, `IDENTITY.md`, `USER.md`.
- Exécute un rituel de questions-réponses court (une question à la fois).
- Écrit l'identité et les préférences dans `IDENTITY.md`, `USER.md`, `SOUL.md`.
- Supprime `BOOTSTRAP.md` une fois terminé afin qu'il ne s'exécute qu'une seule fois.

## Lieu d'exécution

L'initialisation s'exécute toujours sur l'**hôte de passerelle**. Si l'application macOS se connecte à une Gateway distante, l'espace de travail et les fichiers d'initialisation résident sur cette machine distante.

<Note>
  Lorsque la Gateway s'exécute sur une autre machine, modifiez les fichiers de l'espace de travail
  sur l'hôte de la passerelle (par exemple, `user@gateway-host:~/.openclaw/workspace`).
</Note>

## Documentation connexe

- Onboarding de l'application macOS : [Onboarding](/fr/start/onboarding)
- Disposition de l'espace de travail : [Espace de travail de l'agent](/fr/concepts/agent-workspace)

import fr from '/components/footer/fr.mdx';

<fr />
