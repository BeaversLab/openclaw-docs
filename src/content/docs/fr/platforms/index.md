---
summary: "Aperçu du support des plateformes (Gateway + applications compagnons)"
read_when:
  - Looking for OS support or install paths
  - Deciding where to run the Gateway
title: "Plateformes"
---

Le cœur d'OpenClaw est écrit en TypeScript. **Node est l'environnement d'exécution recommandé**.
Bun n'est pas recommandé pour le Gateway — problèmes connus avec les canaux WhatsApp et
Telegram ; voir [Bun (expérimental)](/fr/install/bun) pour plus de détails.

Les Companion apps existent pour macOS (application de barre de menus) et les nœuds mobiles (iOS/Android). Les Companion apps pour Windows et
Linux sont prévues, mais le Gateway est entièrement pris en charge aujourd'hui.
Les Companion apps natives pour Windows sont également prévues ; le Gateway est recommandé via WSL2.

## Choisissez votre OS

- macOS : [macOS](/fr/platforms/macos)
- iOS : [iOS](/fr/platforms/ios)
- Android : [Android](/fr/platforms/android)
- Windows : [Windows](/fr/platforms/windows)
- Linux : [Linux](/fr/platforms/linux)

## VPS et hébergement

- Hub VPS : [Hébergement VPS](/fr/vps)
- Fly.io : [Fly.io](/fr/install/fly)
- Hetzner (Docker) : [Hetzner](/fr/install/hetzner)
- GCP (Compute Engine) : [GCP](/fr/install/gcp)
- Azure (VM Linux) : [Azure](/fr/install/azure)
- exe.dev (VM + proxy HTTPS) : [exe.dev](/fr/install/exe-dev)

## Liens communs

- Guide d'installation : [Getting Started](/fr/start/getting-started)
- Runbook du Gateway : [Gateway](/fr/gateway)
- Configuration du Gateway : [Configuration](/fr/gateway/configuration)
- État du service : `openclaw gateway status`

## Installation du service Gateway (CLI)

Utilisez l'une de ces options (toutes prises en charge) :

- Assistant (recommandé) : `openclaw onboard --install-daemon`
- Direct : `openclaw gateway install`
- Flux de configuration : `openclaw configure` → sélectionner **service Gateway**
- Réparer/migrer : `openclaw doctor` (propose d'installer ou de réparer le service)

La cible du service dépend du système d'exploitation :

- macOS : LaunchAgent (`ai.openclaw.gateway` ou `ai.openclaw.<profile>` ; macOS `com.openclaw.*`)
- Linux/WSL2 : service utilisateur systemd (`openclaw-gateway[-<profile>].service`)
- Windows natif : Tâche planifiée (`OpenClaw Gateway` ou `OpenClaw Gateway (<profile>)`), avec un élément de connexion de dossier de démarrage par utilisateur en repli si la création de la tâche est refusée

## Connexes

- [Aperçu de l'installation](/fr/install)
- [Application macOS](/fr/platforms/macos)
- [Application iOS](/fr/platforms/ios)
