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

1. Installer Node 24 (recommandé ; Node 22 LTS, actuellement `22.14+`, fonctionne toujours pour la compatibilité)
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. Depuis votre ordinateur portable : `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. Ouvrez `http://127.0.0.1:18789/` et authentifiez-vous avec le secret partagé configuré (token par défaut ; mot de passe si vous avez défini `gateway.auth.mode: "password"`)

Guide complet du serveur Linux : [Linux Server](/fr/vps). Exemple étape par étape pour VPS : [exe.dev](/fr/install/exe-dev)

## Installer

- [Getting Started](/fr/start/getting-started)
- [Install & updates](/fr/install/updating)
- Flux optionnels : [Bun (expérimental)](/fr/install/bun), [Nix](/fr/install/nix), [Docker](/fr/install/docker)

## Gateway

- [Gateway runbook](/fr/gateway)
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

OpenClaw installe un service systemd **utilisateur** par défaut. Utilisez un service **système** pour les serveurs partagés ou toujours actifs. `openclaw gateway install` et `openclaw onboard --install-daemon` génèrent déjà l'unité canonique actuelle pour vous ; n'en écrivez une manuellement que si vous avez besoin d'une configuration système/gestionnaire de service personnalisée. Les instructions complètes sur le service se trouvent dans le [Gateway runbook](/fr/gateway).

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
TimeoutStopSec=30
TimeoutStartSec=30
SuccessExitStatus=0 143
KillMode=control-group

[Install]
WantedBy=default.target
```

Activez-le :

```
systemctl --user enable --now openclaw-gateway[-<profile>].service
```
