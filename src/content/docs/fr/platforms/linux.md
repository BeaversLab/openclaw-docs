---
summary: "Prise en charge Linux + statut de l'application compagnon"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
  - Debugging Linux OOM kills or exit 137 on a VPS or container
title: "Linux app"
---

Le Gateway est entièrement pris en charge sur Linux. **Node est l'environnement d'exécution recommandé**.
Bun n'est pas recommandé pour le Gateway (bugs WhatsApp/Telegram).

Des applications compagnons natives pour Linux sont prévues. Les contributions sont les bienvenues si vous souhaitez aider à en construire une.

## Chemin rapide pour débutants (VPS)

1. Installez Node 24 (recommandé ; Node 22 LTS, actuellement `22.14+`, fonctionne toujours pour la compatibilité)
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. Depuis votre ordinateur portable : `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. Ouvrez `http://127.0.0.1:18789/` et authentifiez-vous avec le secret partagé configuré (jeton par défaut ; mot de passe si vous avez défini `gateway.auth.mode: "password"`)

Guide complet du serveur Linux : [Linux Server](/fr/vps). Exemple étape par étape pour VPS : [exe.dev](/fr/install/exe-dev)

## Installer

- [Getting Started](/fr/start/getting-started)
- [Installation & mises à jour](/fr/install/updating)
- Flux optionnels : [Bun (expérimental)](/fr/install/bun), [Nix](/fr/install/nix), [Docker](/fr/install/docker)

## Gateway

- [Gateway runbook](/fr/gateway)
- [Configuration](/fr/gateway/configuration)

## Gateway service install (CLI)

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

OpenClaw installe par défaut un service **utilisateur** systemd. Utilisez un service **système** pour les serveurs partagés ou permanents. `openclaw gateway install` et `openclaw onboard --install-daemon` génèrent déjà l'unité canonique actuelle pour vous ; n'en rédigez une manuellement que si vous avez besoin d'une configuration personnalisée du système ou du gestionnaire de services. Le guide complet du service se trouve dans le [runbook du Gateway](/fr/gateway).

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

## Pression de la mémoire et arrêts OOM

Sous Linux, le noyau choisit une victime OOM lorsqu'un hôte, une machine virtuelle ou un cgroup de conteneur manque de mémoire. Le Gateway peut être une mauvaise victime car il possède des sessions et des connexions de canal durables. OpenClaw biaise donc les processus enfants transitoires pour qu'ils soient tués avant le Gateway lorsque cela est possible.

Pour les processus enfants Linux éligibles, OpenClaw lance l'enfant via un court
wrapper `/bin/sh` qui élève le propre `oom_score_adj` de l'enfant à `1000`, puis
`exec` la vraie commande. Il s'agit d'une opération sans privilège car l'enfant
n'augmente que la probabilité de sa propre mise à mort OOM.

Les surfaces de processus enfants couvertes incluent :

- les enfants de commande gérés par le superviseur,
- les enfants de shell PTY,
- les enfants de serveur stdio MCP,
- les processus navigateur/Chrome lancés par OpenClaw.

Le wrapper est réservé à Linux et est ignoré si `/bin/sh` n'est pas disponible. Il est
également ignoré si l'environnement de l'enfant définit `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`, `false`,
`no`, ou `off`.

Pour vérifier un processus enfant :

```bash
cat /proc/<child-pid>/oom_score_adj
```

Valeur attendue pour les enfants couverts est `1000`. Le processus Gateway doit conserver
son score normal, généralement `0`.

Cela ne remplace pas le réglage normal de la mémoire. Si un VPS ou un conteneur tue
répétitivement des enfants, augmentez la limite de mémoire, réduisez la concurrence, ou ajoutez des
contrôles de ressources plus forts tels que systemd `MemoryMax=` ou les limites de mémoire au niveau du conteneur.

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Serveur Linux](/fr/vps)
- [Raspberry Pi](/fr/platforms/raspberry-pi)
