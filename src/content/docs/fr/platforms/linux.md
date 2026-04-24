---
summary: "Prise en charge Linux + statut de l'application compagnon"
read_when:
  - Looking for Linux companion app status
  - Planning platform coverage or contributions
  - Debugging Linux OOM kills or exit 137 on a VPS or container
title: "Application Linux"
---

# Application Linux

Le Gateway est entièrement pris en charge sur Linux. **Node est l'environnement d'exécution recommandé**.
Bun n'est pas recommandé pour le Gateway (bugs WhatsApp/Telegram).

Des applications compagnons natives Linux sont prévues. Les contributions sont les bienvenues si vous souhaitez aider à en construire une.

## Parcours rapide pour débutants (VPS)

1. Installez Node 24 (recommandé ; Node 22 LTS, actuellement `22.14+`, fonctionne toujours pour la compatibilité)
2. `npm i -g openclaw@latest`
3. `openclaw onboard --install-daemon`
4. Depuis votre ordinateur portable : `ssh -N -L 18789:127.0.0.1:18789 <user>@<host>`
5. Ouvrez `http://127.0.0.1:18789/` et authentifiez-vous avec le secret partagé configuré (jeton par défaut ; mot de passe si vous avez défini `gateway.auth.mode: "password"`)

Guide complet du serveur Linux : [Serveur Linux](/fr/vps). Exemple étape par étape pour VPS : [exe.dev](/fr/install/exe-dev)

## Installer

- [Getting Started](/fr/start/getting-started)
- [Install & updates](/fr/install/updating)
- Flux facultatifs : [Bun (expérimental)](/fr/install/bun), [Nix](/fr/install/nix), [Docker](/fr/install/docker)

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

OpenClaw installe un service utilisateur systemd par défaut. Utilisez un service système pour les serveurs partagés ou toujours actifs. `openclaw gateway install` et `openclaw onboard --install-daemon` génèrent déjà l'unité canonique actuelle pour vous ; n'en écrivez une manuellement que si vous avez besoin d'une configuration personnalisée du système/gestionnaire de services. Les instructions complètes concernant le service se trouvent dans le [Gateway runbook](/fr/gateway).

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

Sous Linux, le noyau choisit une victime OOM lorsqu'un hôte, une VM ou un cgroup de conteneur manque de mémoire. Le Gateway peut être une mauvaise victime car il possède des sessions de longue durée et des connexions de channel. Par conséquent, OpenClaw privilégie l'arrêt des processus enfants transitoires avant celui du Gateway lorsque cela est possible.

Pour les enfants Linux éligibles, OpenClaw démarre l'enfant via un court wrapper `/bin/sh` qui élève le propre `oom_score_adj` de l'enfant à `1000`, puis `exec`s la commande réelle. Il s'agit d'une opération sans privilège car l'enfant augmente uniquement sa propre probabilité d'arrêt OOM.

Les surfaces des processus enfants couvertes incluent :

- les enfants de commande gérés par le superviseur,
- les enfants de shell PTY,
- les enfants du serveur MCP stdio,
- les processus navigateur/Chrome lancés par OpenClaw.

Le wrapper est exclusif à Linux et est ignoré lorsque `/bin/sh` n'est pas disponible. Il est
également ignoré si l'environnement de l'enfant définit `OPENCLAW_CHILD_OOM_SCORE_ADJ=0`, `false`,
`no` ou `off`.

Pour vérifier un processus enfant :

```bash
cat /proc/<child-pid>/oom_score_adj
```

La valeur attendue pour les enfants couverts est `1000`. Le processus Gateway doit conserver
son score normal, généralement `0`.

Cela ne remplace pas le réglage normal de la mémoire. Si un VPS ou un conteneur tue
répétitivement des enfants, augmentez la limite de mémoire, réduisez la concurrence ou ajoutez des
contrôles de ressources plus forts tels que `MemoryMax=` de systemd ou les limites de mémoire au niveau du conteneur.
