---
summary: "Prise en charge Windows : chemins d'installation natifs et WSL2, démon et avertissements actuels"
read_when:
  - Installing OpenClaw on Windows
  - Choosing between native Windows and WSL2
  - Looking for Windows companion app status
title: "Windows"
---

OpenClaw prend en charge à la fois le **Windows natif** et **WSL2**. WSL2 est la solution la plus stable et recommandée pour une expérience complète — l'interface en ligne de commande (CLI), le Gateway et les outils s'exécutent à l'intérieur de Linux avec une compatibilité totale. Le Windows natif fonctionne pour une utilisation de base de l'CLI et du GatewayGateway, avec quelques réserves notées ci-dessous.

Les applications compagnes natives pour Windows sont prévues.

## WSL2 (recommandé)

- [Getting Started](/fr/start/getting-started) (à utiliser dans WSL)
- [Install & updates](/fr/install/updating)
- Guide officiel WSL2 (Microsoft) : [https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Statut du Windows natif

Les flux de l'Windows natif CLI s'améliorent, mais WSL2 reste tout de même le chemin recommandé.

Ce qui fonctionne bien sur le Windows natif aujourd'hui :

- programme d'installation du site Web via `install.ps1`
- utilisation locale de la CLI telle que `openclaw --version`, `openclaw doctor` et `openclaw plugins list --json`
- test de fumée local-agent/provider intégré, tel que :

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

Avertissements actuels :

- `openclaw onboard --non-interactive` s'attend toujours à une passerelle locale accessible, sauf si vous passez `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` et `openclaw gateway install` essaient d'abord les tâches planifiées Windows
- si la création de tâche planifiée est refusée, OpenClaw revient à un élément de connexion dans le dossier de démarrage par utilisateur et démarre la passerelle immédiatement
- si `schtasks` lui-même se bloque ou cesse de répondre, OpenClaw abandonne maintenant rapidement cette voie et bascule au lieu de rester bloqué indéfiniment
- Les tâches planifiées sont toujours préférées lorsqu'elles sont disponibles car elles offrent un meilleur statut de superviseur

Si vous ne voulez que le CLI natif, sans installation du service de passerelle, utilisez l'un de ceux-ci :

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

Si vous souhaitez un démarrage géré sur Windows natif :

```powershell
openclaw gateway install
openclaw gateway status --json
```

Si la création de tâche planifiée est bloquée, le mode de service de secours démarre automatiquement après la connexion via le dossier Démarrage de l'utilisateur actuel.

## Gateway

- [Gateway runbook](/fr/gateway)
- [Configuration](/fr/gateway/configuration)

## Gateway service install (CLI)

Inside WSL2 :

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

Sélectionnez **Gateway service** lorsque vous y êtes invité.

Réparer/migrer :

```
openclaw doctor
```

## Gateway auto-start before Windows login

Pour les configurations sans tête, assurez-vous que la chaîne de démarrage complète s'exécute même lorsque personne ne se connecte à Windows.

### 1) Keep user services running without login

Inside WSL :

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) Install the OpenClaw gateway user service

Inside WSL :

```bash
openclaw gateway install
```

### 3) Start WSL automatically at Windows boot

In PowerShell as Administrator :

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

Remplacez `Ubuntu` par le nom de votre distribution depuis :

```powershell
wsl --list --verbose
```

### Verify startup chain

After a reboot (before Windows sign-in), check from WSL :

```bash
systemctl --user is-enabled openclaw-gateway.service
systemctl --user status openclaw-gateway.service --no-pager
```

## Advanced: expose WSL services over LAN (portproxy)

WSL possède son propre réseau virtuel. Si une autre machine doit accéder à un service
exécuté **à l'intérieur de WSL** (SSH, un serveur TTS local, ou le Gateway), vous devez
transférer un port Windows vers l'adresse IP WSL actuelle. L'adresse IP WSL change après les redémarrages,
vous devrez donc peut-être actualiser la règle de transfert.

Exemple (PowerShell **en tant qu'administrateur**) :

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

Autoriser le port via le pare-feu Windows (une seule fois) :

```powershell
New-NetFirewallRule -DisplayName "WSL SSH $ListenPort" -Direction Inbound `
  -Protocol TCP -LocalPort $ListenPort -Action Allow
```

Actualiser le portproxy après les redémarrages WSL :

```powershell
netsh interface portproxy delete v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 | Out-Null
netsh interface portproxy add v4tov4 listenport=$ListenPort listenaddress=0.0.0.0 `
  connectaddress=$WslIp connectport=$TargetPort | Out-Null
```

Remarques :

- Le SSH depuis une autre machine cible l'IP de l'hôte **Windows** (exemple : `ssh user@windows-host -p 2222`).
- Les nœuds distants doivent pointer vers une URL de Gateway **accessible** (pas `127.0.0.1`) ; utilisez
  `openclaw status --all` pour confirmer.
- Utilisez `listenaddress=0.0.0.0` pour l'accès LAN ; `127.0.0.1` le garde uniquement en local.
- Si vous souhaitez que ce soit automatique, enregistrez une tâche planifiée pour exécuter l'étape d'actualisation
  à la connexion.

## Installation étape par étape de WSL2

### 1) Installer WSL2 + Ubuntu

Ouvrez PowerShell (Admin) :

```powershell
wsl --install
# Or pick a distro explicitly:
wsl --list --online
wsl --install -d Ubuntu-24.04
```

Redémarrez si Windows le demande.

### 2) Activer systemd (requis pour l'installation de la passerelle)

Dans votre terminal WSL :

```bash
sudo tee /etc/wsl.conf >/dev/null <<'EOF'
[boot]
systemd=true
EOF
```

Puis depuis PowerShell :

```powershell
wsl --shutdown
```

Rouvez Ubuntu, puis vérifiez :

```bash
systemctl --user status
```

### 3) Installer OpenClaw (à l'intérieur de WSL)

Pour une première configuration normale dans WSL, suivez le flux de démarrage Linux Getting Started :

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm build
pnpm ui:build
pnpm openclaw onboard --install-daemon
```

Si vous développez à partir du code source au lieu de faire une intégration pour la première fois, utilisez la
boucle de développement source depuis [Setup](/fr/start/setup) :

```bash
pnpm install
# First run only (or after resetting local OpenClaw config/workspace)
pnpm openclaw setup
pnpm gateway:watch
```

Guide complet : [Getting Started](/fr/start/getting-started)

## Application compagnon Windows

Nous n'avons pas encore d'application compagnon Windows. Les contributions sont les bienvenues si vous souhaitez
aider à sa réalisation.

## Connectivité Git et GitHub (contributeurs)

Certains réseaux bloquent ou limitent le HTTPS vers GitHub. Si GitHub`git clone` échoue avec des expirations de délai (timeouts) ou des réinitialisations de connexion, essayez un autre réseau, un VPN ou un proxy HTTP/HTTPS fourni par votre organisation.

Si `gh auth login` échoue lors du flux de périphérique du navigateur (par exemple une expiration de délai pour atteindre `github.com:443`), authentifiez-vous plutôt avec un jeton d'accès personnel (PAT) :

1. Créez un jeton avec au moins la portée (scope) `repo` (PAT classique) ou un accès granulaire équivalent.
2. Dans PowerShell pour la session actuelle :

```powershell
$env:GH_TOKEN="<your-token>"
gh auth status
gh auth setup-git
```

3. Si `gh auth status` avertit concernant l'absence de `read:org`, créez un jeton incluant cette portée et réassignez la variable :

```powershell
$env:GH_TOKEN="<your-token-with-repo-and-read:org>"
gh auth status
```

`gh auth refresh -s read:org` s'applique uniquement lorsque vous vous êtes authentifié via `gh auth login` et que vous avez stocké des informations d'identification pour actualiser (pas lors de l'utilisation de `GH_TOKEN`).

Ne commettez jamais de jetons ou ne les collez pas dans des tickets de suivi (issues) ou des demandes de tirage (pull requests).

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Plateformes](/fr/platforms)
