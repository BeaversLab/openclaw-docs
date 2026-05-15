---
summary: "Aperçu des options et flux d'onboarding OpenClaw"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "Vue d'ensemble de l'onboarding"
sidebarTitle: "Aperçu de l'onboarding"
---

OpenClaw propose deux parcours d'onboarding. Les deux configurent l'authentification, le Gateway et les canaux de chat optionnels — ils diffèrent simplement par la façon dont vous interagissez avec la configuration.

## Quel parcours dois-je utiliser ?

|                    | Onboarding CLI                                     | Onboarding de l'application macOS     |
| ------------------ | -------------------------------------------------- | ------------------------------------- |
| **Plateformes**    | macOS, Linux, Windows (natif ou WSL2)              | macOS uniquement                      |
| **Interface**      | Assistant terminal                                 | Interface guidée dans l'application   |
| **Idéal pour**     | Serveurs, sans interface graphique, contrôle total | Mac de bureau, configuration visuelle |
| **Automatisation** | `--non-interactive` pour les scripts               | Manuel uniquement                     |
| **Commande**       | `openclaw onboard`                                 | Lancer l'application                  |

La plupart des utilisateurs devraient commencer par l'**onboarding CLI** — il fonctionne partout et vous offre le plus de contrôle.

## Ce que configure l'onboarding

Quel que soit le parcours que vous choisissez, l'onboarding configure :

1. **Fournisseur de modèles et authentification** — clé API, OAuth ou jeton de configuration pour votre fournisseur choisi
2. **Espace de travail** — répertoire pour les fichiers des agents, les modèles d'amorçage et la mémoire
3. **Gateway** — port, adresse de liaison, mode d'authentification
4. **Canaux** (optionnels) — canaux de chat intégrés et regroupés tels que
   iMessage, Discord, Feishu, Google Chat, Mattermost, Microsoft Teams,
   Telegram, WhatsApp, et plus encore
5. **Démon** (optionnel) — service en arrière-plan pour que le Gateway démarre automatiquement

## Onboarding CLI

Exécutez dans n'importe quel terminal :

```bash
openclaw onboard
```

Ajoutez `--install-daemon` pour également installer le service en arrière-plan en une seule étape.

Référence complète : [Onboarding (CLI)](/fr/start/wizard)
Documentation de commande CLI : [`openclaw onboard`](/fr/cli/onboard)

## Onboarding de l'application macOS

Ouvrez l'application OpenClaw. L'assistant de premier lancement vous guide à travers les mêmes étapes avec une interface visuelle.

Référence complète : [Onboarding (Application macOS)](/fr/start/onboarding)

## Fournisseurs personnalisés ou non répertoriés

Si votre fournisseur n'est pas répertorié dans l'onboarding, choisissez **Fournisseur personnalisé** et entrez :

- Mode de compatibilité API (compatible OpenAI, compatible Anthropic ou détection automatique)
- URL de base et clé API
- ID de modèle et alias optionnel

Plusieurs points de terminaison personnalisés peuvent coexister — chacun obtient son propre ID de point de terminaison.

## Connexes

- [Getting started](/fr/start/getting-started)
- [Référence de configuration CLI](/fr/start/wizard-cli-reference)
