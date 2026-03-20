---
summary: "Aperçu des options et des flux d'onboarding OpenClaw"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "Onboarding Overview"
sidebarTitle: "Onboarding Overview"
---

# Aperçu de l'onboarding

OpenClaw supports multiple onboarding paths depending on where the Gateway runs
and how you prefer to configure providers.

## Choisissez votre parcours d'onboarding

- **CLI onboarding** pour macOS, Linux et Windows (via WSL2).
- **Application macOS** pour une première exécution guidée sur Mac Apple silicon ou Intel.

## CLI onboarding

Exécutez l'onboarding dans un terminal :

```bash
openclaw onboard
```

Use CLI onboarding when you want full control of the Gateway, workspace,
channels, and skills. Docs:

- [Onboarding (CLI)](/fr/start/wizard)
- [`openclaw onboard` command](/fr/cli/onboard)

## Onboarding de l'application macOS

Utilisez l'application OpenClaw lorsque vous souhaitez une configuration entièrement guidée sur macOS. Documentation :

- [Onboarding (macOS App)](/fr/start/onboarding)

## Provider personnalisé

If you need an endpoint that is not listed, including hosted providers that
expose standard OpenAI or Anthropic APIs, choose **Custom Provider** in the
CLI onboarding. You will be asked to:

- Choisir OpenAI-compatible, Anthropic-compatible ou **Inconnu** (détection automatique).
- Entrer une URL de base et une clé API (si requis par le provider).
- Fournir un ID de modèle et un alias facultatif.
- Choisir un ID de point de terminaison afin que plusieurs points de terminaison personnalisés puissent coexister.

Pour les étapes détaillées, suivez la documentation d'onboarding CLI ci-dessus.

import fr from "/components/footer/fr.mdx";

<fr />
