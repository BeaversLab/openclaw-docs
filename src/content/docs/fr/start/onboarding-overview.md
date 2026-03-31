---
summary: "Aperçu des options et flux d'onboarding OpenClaw"
read_when:
  - Choosing an onboarding path
  - Setting up a new environment
title: "Aperçu de l'onboarding"
sidebarTitle: "Aperçu de l'onboarding"
---

# Aperçu de l'onboarding

OpenClaw a deux parcours d'onboarding. Les deux configurent l'auth, le Gateway et
les canaux optionnels — ils diffèrent simplement par la façon dont vous interagissez avec la configuration.

## Quel parcours dois-je utiliser ?

|                    | CLI onboarding                                                | macOS app onboarding                  |
| ------------------ | ------------------------------------------------------------- | ------------------------------------- |
| **Plateformes**    | macOS, Linux, Windows (natif ou WSL2)                         | macOS uniquement                      |
| **Interface**      | Assistant terminal                                            | Interface guidée dans l'application   |
| **Idéal pour**     | Serveurs, sans interface graphique (headless), contrôle total | Mac de bureau, configuration visuelle |
| **Automatisation** | `--non-interactive` pour les scripts                          | Manuel uniquement                     |
| **Commande**       | `openclaw onboard`                                            | Lancer l'application                  |

La plupart des utilisateurs devraient commencer par **l'onboarding CLI** — cela fonctionne partout et vous
offre le plus de contrôle.

## Ce que l'onboarding configure

Quel que soit le parcours que vous choisissez, l'onboarding configure :

1. **Fournisseur de modèle et auth** — clé API, OAuth, ou jeton de configuration pour votre fournisseur choisi
2. **Espace de travail** — répertoire pour les fichiers de l'agent, les modèles d'amorçage, et la mémoire
3. **Gateway** — port, adresse de liaison, mode d'auth
4. **Canaux** (optionnel) — WhatsApp, Telegram, Discord, et plus
5. **Démon** (optionnel) — service en arrière-plan pour que le Gateway démarre automatiquement

## CLI onboarding

Exécutez dans n'importe quel terminal :

```bash
openclaw onboard
```

Ajoutez `--install-daemon` pour également installer le service en arrière-plan en une seule étape.

Référence complète : [Onboarding (CLI)](/en/start/wizard)
Docs de la commande CLI : [`openclaw onboard`](/en/cli/onboard)

## macOS app onboarding

Ouvrez l'application OpenClaw. L'assistant de premier démarrage vous guide à travers les mêmes étapes
avec une interface visuelle.

Référence complète : [Onboarding (macOS App)](/en/start/onboarding)

## Fournisseurs personnalisés ou non répertoriés

Si votre fournisseur n'est pas répertorié dans l'onboarding, choisissez **Fournisseur personnalisé** et
entrez :

- Mode de compatibilité API (compatible OpenAI, compatible Anthropic, ou détection automatique)
- URL de base et clé API
- ID du modèle et alias optionnel

Plusieurs points de terminaison personnalisés peuvent coexister — chacun obtient son propre ID de point de terminaison.
