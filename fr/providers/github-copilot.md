---
summary: "Connectez-vous à GitHub Copilot depuis OpenClaw à l'aide du flux d'appareil"
read_when:
  - Vous souhaitez utiliser GitHub Copilot en tant que fournisseur de modèle
  - Vous avez besoin du flux `openclaw models auth login-github-copilot`
title: "GitHub Copilot"
---

# GitHub Copilot

## Qu'est-ce que GitHub Copilot ?

GitHub Copilot est l'assistant de codage IA de GitHub. Il fournit un accès aux modèles
Copilot pour votre compte et votre plan GitHub. OpenClaw peut utiliser Copilot en tant que fournisseur
de modèle de deux manières différentes.

## Deux méthodes pour utiliser Copilot dans OpenClaw

### 1) Fournisseur intégré GitHub Copilot (`github-copilot`)

Utilisez le flux natif de connexion par appareil pour obtenir un jeton GitHub, puis échangez-le contre
des jetons API Copilot lors de l'exécution de OpenClaw. C'est le chemin par **défaut** et le plus simple
car il ne nécessite pas VS Code.

### 2) Plugin Copilot Proxy (`copilot-proxy`)

Utilisez l'extension VS Code **Copilot Proxy** comme pont local. OpenClaw communique avec
le point de terminaison `/v1` du proxy et utilise la liste de modèles que vous y configurez. Choisissez
cette option si vous exécutez déjà Copilot Proxy dans VS Code ou si vous devez router via celui-ci.
Vous devez activer le plugin et garder l'extension VS Code en cours d'exécution.

Utilisez GitHub Copilot comme fournisseur de modèle (`github-copilot`). La commande de connexion exécute
le flux d'appareil GitHub, enregistre un profil d'authentification et met à jour votre configuration pour utiliser
celui-ci.

## Configuration CLI

```bash
openclaw models auth login-github-copilot
```

Il vous sera demandé de visiter une URL et d'entrer un code à usage unique. Gardez le terminal
ouvert jusqu'à ce qu'il se termine.

### Indicateurs facultatifs

```bash
openclaw models auth login-github-copilot --profile-id github-copilot:work
openclaw models auth login-github-copilot --yes
```

## Définir un modèle par défaut

```bash
openclaw models set github-copilot/gpt-4o
```

### Extrait de configuration

```json5
{
  agents: { defaults: { model: { primary: "github-copilot/gpt-4o" } } },
}
```

## Remarques

- Nécessite un TTY interactif ; exécutez-le directement dans un terminal.
- La disponibilité du modèle Copilot dépend de votre plan ; si un modèle est rejeté, essayez
  un autre ID (par exemple `github-copilot/gpt-4.1`).
- La connexion stocke un jeton GitHub dans le magasin de profils d'authentification et l'échange contre
  un jeton API Copilot lorsque OpenClaw s'exécute.

import en from "/components/footer/en.mdx";

<en />
