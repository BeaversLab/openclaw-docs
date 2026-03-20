---
summary: "Aperçu du support de plateformes (Gateway + Companion apps)"
read_when:
  - Recherche du support de l'OS ou des chemins d'installation
  - Décider où exécuter la Gateway
title: "Platforms"
---

# Platforms

Le cœur d'OpenClaw est écrit en TypeScript. **Node est le runtime recommandé**.
Bun n'est pas recommandé pour le Gateway (bugs WhatsApp/Telegram).

Des Companion apps existent pour macOS (application de barre de menus) et les nœuds mobiles (iOS/Android). Les Companion apps pour Windows et
Linux sont prévues, mais le Gateway est entièrement pris en charge aujourd'hui.
Les Companion apps natives pour Windows sont également prévues ; le Gateway est recommandé via WSL2.

## Choose your OS

- macOS : [macOS](/fr/platforms/macos)
- iOS : [iOS](/fr/platforms/ios)
- Android : [Android](/fr/platforms/android)
- Windows : [Windows](/fr/platforms/windows)
- Linux : [Linux](/fr/platforms/linux)

## VPS & hosting

- VPS hub : [VPS hosting](/fr/vps)
- Fly.io : [Fly.io](/fr/install/fly)
- Hetzner (Docker) : [Hetzner](/fr/install/hetzner)
- GCP (Compute Engine) : [GCP](/fr/install/gcp)
- exe.dev (VM + proxy HTTPS) : [exe.dev](/fr/install/exe-dev)

## Common links

- Guide d'installation : [Getting Started](/fr/start/getting-started)
- Manuel Gateway : [Gateway](/fr/gateway)
- Configuration du Gateway : [Configuration](/fr/gateway/configuration)
- État du service : `openclaw gateway status`

## Installation du service Gateway (CLI)

Utilisez l'une de ces options (toutes prises en charge) :

- Assistant (recommandé) : `openclaw onboard --install-daemon`
- Direct : `openclaw gateway install`
- Flux de configuration : `openclaw configure` → sélectionnez **Gateway service**
- Réparer/migrer : `openclaw doctor` (propose d'installer ou de réparer le service)

La cible du service dépend de l'OS :

- macOS : LaunchAgent (`ai.openclaw.gateway` ou `ai.openclaw.<profile>` ; ancien `com.openclaw.*`)
- Linux/WSL2 : service utilisateur systemd (`openclaw-gateway[-<profile>].service`)

import fr from "/components/footer/fr.mdx";

<fr />
