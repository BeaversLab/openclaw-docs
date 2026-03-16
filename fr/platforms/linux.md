---
summary: "Prise en charge Linux + statut de l'application compagnon"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
title: "Application Linux"
---

# Application Linux

Le Gateway est entièrement pris en charge sur Linux. **Node est l'environnement d'exécution recommandé**.
Bun n'est pas recommandé pour le Gateway (bugs WhatsApp/Telegram).

Des applications compagnons natives Linux sont prévues. Les contributions sont les bienvenues si vous souhaitez aider à en construire une.

## Parcours rapide pour débutants (VPS)

1. Installez Node 24 (recommandé ; Node 22 LTS, actuellement `22.16+`, fonctionne toujours pour la compatibilité)
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. Depuis votre ordinateur portable : `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. Ouvrez `http://127.0.0.1:18789/` et collez votre jeton

Guide étape par étape pour VPS : [exe.dev](/fr/install/exe-dev)

## Installer

- [Getting Started](/fr/start/getting-started)
- [Installation et mises à jour](/fr/install/updating)
- Méthodes optionnelles : [Bun (expérimental)](/fr/install/bun), [Nix](/fr/install/nix), [Docker](/fr/install/docker)

## Gateway

- [Manuel d'exécution du Gateway](/fr/gateway)
- [Configuration](/fr/gateway/configuration)

## Installation du service Gateway (CLI)

Utilisez l'une de ces options :

```
openclaw onboard --install-daemon
```

Ou :

```
openclaw gateway install
```

Ou :

```
openclaw configure
```

Sélectionnez **Gateway service** lorsqu'on vous le demande.

Réparer/migrer :

```
openclaw doctor
```

## Contrôle système (unité utilisateur systemd)

OpenClaw installe un service systemd **utilisateur** par défaut. Utilisez un service **système**
pour les serveurs partagés ou toujours actifs. L'exemple complet de l'unité et les conseils
se trouvent dans le [Manuel d'exécution du Gateway](/fr/gateway).

Configuration minimale :

Créez `~/.config/systemd/user/openclaw-gateway[-<profile>].service` :

```
[Unit]
Description=OpenClaw Gateway (profile: <profile>, v<version>)
After=network-online.target
Wants=network-online.target

[Service]
ExecStart=/usr/local/bin/openclaw gateway --port 18789
Restart=always
RestartSec=5

[Install]
WantedBy=default.target
```

Activez-le :

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```

import fr from "/components/footer/fr.mdx";

<fr />
