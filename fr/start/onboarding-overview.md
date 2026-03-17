---
summary: "Aperçu des options et flux d'onboarding OpenClaw"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "Aperçu de l'onboarding"
sidebarTitle: "Aperçu de l'onboarding"
---

# Aperçu de l'onboarding

OpenClaw prend en charge plusieurs parcours d'onboarding selon l'emplacement d'exécution du Gateway
et la manière dont vous préférez configurer les providers.

## Choisissez votre parcours d'onboarding

- **CLI onboarding** pour macOS, Linux et Windows (via WSL2).
- **Application macOS** pour une première exécution guidée sur Mac Apple silicon ou Intel.

## CLI onboarding

Exécutez l'onboarding dans un terminal :

```bash
openclaw onboard
```

Utilisez l'onboarding CLI lorsque vous souhaitez un contrôle total du Gateway, de l'espace de travail,
des canaux et des compétences. Documentation :

- [Onboarding (CLI)](/fr/start/wizard)
- [commande `openclaw onboard`](/fr/cli/onboard)

## Onboarding de l'application macOS

Utilisez l'application OpenClaw lorsque vous souhaitez une configuration entièrement guidée sur macOS. Documentation :

- [Onboarding (application macOS)](/fr/start/onboarding)

## Provider personnalisé

Si vous avez besoin d'un point de terminaison qui n'est pas répertorié, y compris les fournisseurs hébergés qui
exposent des API standard OpenAI ou Anthropic, choisissez **Fournisseur personnalisé** dans l'
CLI onboarding. Il vous sera demandé de :

- Choisir OpenAI-compatible, Anthropic-compatible ou **Inconnu** (détection automatique).
- Entrer une URL de base et une clé API (si requis par le provider).
- Fournir un ID de modèle et un alias facultatif.
- Choisir un ID de point de terminaison afin que plusieurs points de terminaison personnalisés puissent coexister.

Pour les étapes détaillées, suivez la documentation d'onboarding CLI ci-dessus.

import fr from "/components/footer/fr.mdx";

<fr />
