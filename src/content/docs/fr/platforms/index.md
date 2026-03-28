---
summary: "Aperçu du support des plateformes (Gateway + applications compagnons)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "Plateformes"
---

# Plateformes

Le cœur d'OpenClaw est écrit en TypeScript. **Node est le runtime recommandé**.
Bun n'est pas recommandé pour le Gateway (bugs WhatsApp/Telegram).

Des applications compagnons existent pour macOS (application de barre de menu) et les nœuds mobiles (iOS/Android). Les applications compagnons pour Windows et
Linux sont prévues, mais le Gateway est entièrement pris en charge aujourd'hui.
Les applications compagnons natives pour Windows sont également prévues ; le Gateway est recommandé via WSL2.

## Choisissez votre système d'exploitation

- macOS : [macOS](/fr/platforms/macos)
- iOS : [iOS](/fr/platforms/ios)
- Android : [Android](/fr/platforms/android)
- Windows : [Windows](/fr/platforms/windows)
- Linux : [Linux](/fr/platforms/linux)

## VPS & hébergement

- Hub VPS : [Hébergement VPS](/fr/vps)
- Fly.io : [Fly.io](/fr/install/fly)
- Hetzner (Docker) : [Hetzner](/fr/install/hetzner)
- GCP (Compute Engine) : [GCP](/fr/install/gcp)
- Azure (Linux VM) : [Azure](/fr/install/azure)
- exe.dev (VM + proxy HTTPS) : [exe.dev](/fr/install/exe-dev)

## Liens courants

- Guide d'installation : [Getting Started](/fr/start/getting-started)
- Manuel d'exécution du Gateway : [Gateway](/fr/gateway)
- Configuration du Gateway : [Configuration](/fr/gateway/configuration)
- État du service : `openclaw gateway status`

## Installation du service Gateway (CLI)

Utilisez l'une de ces options (toutes prises en charge) :

- Assistant (recommandé) : `openclaw onboard --install-daemon`
- Direct : `openclaw gateway install`
- Flux de configuration : `openclaw configure` → sélectionnez **service Gateway**
- Réparation/migration : `openclaw doctor` (propose d'installer ou de réparer le service)

La cible du service dépend du système d'exploitation :

- macOS : LaunchAgent (`ai.openclaw.gateway` ou `ai.openclaw.<profile>` ; ancien `com.openclaw.*`)
- Linux/WSL2 : service utilisateur systemd (`openclaw-gateway[-<profile>].service`)
