---
summary: "Prise en charge Windows (WSL2) + statut de l'application compagnon"
read_when:
  - Installing OpenClaw on Windows
  - Looking for Windows companion app status
title: "Windows (WSL2)"
---

# Windows (WSL2)

OpenClaw sur OpenClaw est recommandé **via Windows** (Ubuntu recommandé). Le
WSL2 + la CLI s'exécutent à l'intérieur de Gateway, ce qui maintient l'exécution cohérente et rend
les outils beaucoup plus compatibles (Node/Linux/pnpm, binaires Bun, compétences). Le
Linux natif pourrait être plus délicat. Windows vous offre l'expérience complète de WSL2 — une seule commande
pour installer : `wsl --install`.

Les applications compagnons natives Windows sont prévues.

## Installer (WSL2)

- [Getting Started](/fr/start/getting-started) (à utiliser dans WSL)
- [Install & updates](/fr/install/updating)
- Guide officiel WSL2 (Microsoft) : [https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Statut Windows natif

Les flux du Windows natif CLI s'améliorent, mais WSL2 reste le chemin recommandé.

Ce qui fonctionne bien sur le Windows natif aujourd'hui :

- installateur du site web via `install.ps1`
- utilisation locale du CLI telle que `openclaw --version`, `openclaw doctor` et `openclaw plugins list --json`
- test de local-agent/provider intégré tel que :

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

Avertissements actuels :

- `openclaw onboard --non-interactive` s'attend toujours à une passerelle locale accessible sauf si vous passez `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` et `openclaw gateway install` essaient d'abord les Tâches planifiées Windows
- si la création de Tâche planifiée est refusée, OpenClaw revient à un élément de connexion de dossier Démarrage par utilisateur et démarre la passerelle immédiatement
- si `schtasks` lui-même se bloque ou cesse de répondre, OpenClaw abandonne désormais rapidement ce chemin et revient au lieu de bloquer indéfiniment
- Les Tâches planifiées sont toujours préférées lorsqu'elles sont disponibles car elles offrent un meilleur statut de superviseur

Si vous ne voulez que le CLI natif, sans installation du service de passerelle, utilisez l'un de ceux-ci :

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

Si vous souhaitez un démarrage géré sur le Windows natif :

```powershell
openclaw gateway install
openclaw gateway status --json
```

Si la création de tâche planifiée est bloquée, le mode service de secours se lance tout de même automatiquement après la connexion via le dossier Démarrage de l'utilisateur actuel.

## Gateway

- [Gateway runbook](/fr/gateway)
- [Configuration](/fr/gateway/configuration)

## Installation du service Gateway (CLI)

À l'intérieur de WSL2 :

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

Sélectionnez **service Gateway** lorsqu'on vous le demande.

Réparer/migrer :

```
openclaw doctor
```

## Démarrage automatique du Gateway avant la connexion Windows

Pour les configurations sans écran, assurez-vous que la chaîne de démarrage complète s'exécute même lorsque personne ne se connecte à Windows.

### 1) Garder les services utilisateur en cours d'exécution sans connexion

À l'intérieur de WSL :

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) Installer le service utilisateur de passerelle OpenClaw

À l'intérieur de WSL :

```bash
openclaw gateway install
```

### 3) Démarrer WSL automatiquement au démarrage de Windows

Dans PowerShell en tant qu'Administrateur :

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

Remplacez `Ubuntu` par le nom de votre distribution via :

```powershell
wsl --list --verbose
```

### Vérifier la chaîne de démarrage

Après un redémarrage (avant la connexion Windows), vérifiez depuis WSL :

```bash
systemctl --user is-enabled openclaw-gateway
systemctl --user status openclaw-gateway --no-pager
```

## Avancé : exposer les services WSL sur le réseau local (portproxy)

WSL possède son propre réseau virtuel. Si une autre machine doit accéder à un service
exécuté **à l'intérieur de WSL** (SSH, un serveur TTS local, ou le Gateway), vous devez
rediriger un port Windows vers l'IP actuelle de WSL. L'IP de WSL change après les redémarrages,
vous devrez donc peut-être actualiser la règle de redirection.

Exemple (PowerShell **en tant qu'Administrateur**) :

```powershell
$Distro = "Ubuntu-24.04"
$ListenPort = 2222
$TargetPort = 22

$WslIp = (wsl -d $Distro -- hostname -I).Trim().Split(" ")[0]
if (-not $WslIp) { throw "WSL IP not found." }

netsh interface portproxy add v4tov4 listenaddress=0.0.0.0 listenport=$ListenPort `
  connectaddress=$WslIp connectport=$TargetPort
```

Autoriser le port à travers le pare-feu Windows (une fois) :

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

Notes :

- Le SSH depuis une autre machine cible l'**IP de l'hôte Windows** (exemple : `ssh user@windows-host -p 2222`).
- Les nœuds distants doivent pointer vers une URL de Gateway **accessible** (pas `127.0.0.1`) ; utilisez
  `openclaw status --all` pour confirmer.
- Utilisez `listenaddress=0.0.0.0` pour l'accès réseau local ; `127.0.0.1` le garde uniquement en local.
- Si vous souhaitez que cela soit automatique, enregistrez une tâche planifiée pour exécuter l'étape
  d'actualisation à la connexion.

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

Rouvrez Ubuntu, puis vérifiez :

```bash
systemctl --user status
```

### 3) Installer OpenClaw (à l'intérieur de WSL)

Suivez le flux Getting Started de Linux à l'intérieur de WSL :

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
pnpm install
pnpm ui:build # auto-installs UI deps on first run
pnpm build
openclaw onboard
```

Guide complet : [Getting Started](/fr/start/getting-started)

## Application compagnon Windows

Nous n'avons pas encore d'application compagnon Windows. Les contributions sont les bienvenues si vous souhaitez
contribuer à sa réalisation.

import fr from "/components/footer/fr.mdx";

<fr />
