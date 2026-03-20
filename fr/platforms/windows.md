---
summary: "Prise en charge Windows (WSL2) + statut de l'application compagnon"
read_when:
  - Installation de OpenClaw sur Windows
  - Recherche du statut de l'application compagnon Windows
title: "Windows (WSL2)"
---

# Windows (WSL2)

Il est recommandé d'utiliser OpenClaw sur Windows **via WSL2** (Ubuntu recommandé). La
CLI + le Gateway s'exécutent à l'intérieur de Linux, ce qui maintient l'exécution cohérente et rend
les outils beaucoup plus compatibles (Node/Bun/pnpm, binaires Linux, compétences). Le Windows natif
pourrait être plus délicat. WSL2 vous offre l'expérience complète de Linux — une seule commande
pour installer : `wsl --install`.

Les applications compagnons natives pour Windows sont prévues.

## Installer (WSL2)

- [Getting Started](/fr/start/getting-started) (à utiliser à l'intérieur de WSL)
- [Install & updates](/fr/install/updating)
- Guide officiel WSL2 (Microsoft) : [https://learn.microsoft.com/windows/wsl/install](https://learn.microsoft.com/windows/wsl/install)

## Statut du Windows natif

Les flux de la Windows native CLI s'améliorent, mais WSL2 reste le chemin recommandé.

Ce qui fonctionne bien sur le Windows natif aujourd'hui :

- installateur du site web via `install.ps1`
- utilisation locale de la CLI telle que `openclaw --version`, `openclaw doctor` et `openclaw plugins list --json`
- test intégré local-agent/provider tel que :

```powershell
openclaw agent --local --agent main --thinking low -m "Reply with exactly WINDOWS-HATCH-OK."
```

Mises en garde actuelles :

- `openclaw onboard --non-interactive` attend toujours une passerelle locale accessible, sauf si vous passez `--skip-health`
- `openclaw onboard --non-interactive --install-daemon` et `openclaw gateway install` essaient d'abord les Tâches planifiées Windows
- si la création de Tâche planifiée est refusée, OpenClaw revient à un élément de connexion de dossier Démarrage par utilisateur et démarre la passerelle immédiatement
- si `schtasks` lui-même se bloque ou cesse de répondre, OpenClaw abandonne désormais ce chemin rapidement et revient à une autre solution au lieu de rester bloqué indéfiniment
- Les Tâches planifiées sont toujours préférées lorsqu'elles sont disponibles car elles offrent un meilleur statut de superviseur

Si vous voulez uniquement la CLI native, sans installation du service de passerelle, utilisez l'une de ces options :

```powershell
openclaw onboard --non-interactive --skip-health
openclaw gateway run
```

Si vous voulez un démarrage géré sur le Windows natif :

```powershell
openclaw gateway install
openclaw gateway status --json
```

Si la création de Tâche planifiée est bloquée, le mode service de secours démarre automatiquement après la connexion via le dossier Démarrage de l'utilisateur actuel.

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

Sélectionnez **Service Gateway** lorsqu'on vous le demande.

Réparer/migrer :

```
openclaw doctor
```

## Démarrage automatique de la passerelle avant la connexion Gateway

Pour les configurations sans écran, assurez-vous que la chaîne de démarrage complète s'exécute même lorsque personne ne se connecte à Windows.

### 1) Garder les services utilisateur actifs sans connexion

Dans WSL :

```bash
sudo loginctl enable-linger "$(whoami)"
```

### 2) Installer le service utilisateur de la passerelle OpenClaw

Dans WSL :

```bash
openclaw gateway install
```

### 3) Démarrer WSL automatiquement au démarrage de Windows

Dans PowerShell en tant qu'administrateur :

```powershell
schtasks /create /tn "WSL Boot" /tr "wsl.exe -d Ubuntu --exec /bin/true" /sc onstart /ru SYSTEM
```

Remplacez `Ubuntu` par le nom de votre distribution provenant de :

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

WSL possède son propre réseau virtuel. Si une autre machine doit atteindre un service s'exécutant **à l'intérieur de WSL** (SSH, un serveur TTS local ou la passerelle Gateway), vous devez transférer un port Windows vers l'adresse IP actuelle de WSL. L'adresse IP de WSL change après les redémarrages, vous devrez donc peut-être actualiser la règle de transfert.

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

- Le SSH à partir d'une autre machine cible l'adresse IP de l'**hôte Windows** (exemple : `ssh user@windows-host -p 2222`).
- Les nœuds distants doivent pointer vers une URL de **passerelle Gateway accessible** (pas `127.0.0.1`) ; utilisez `openclaw status --all` pour confirmer.
- Utilisez `listenaddress=0.0.0.0` pour l'accès réseau local ; `127.0.0.1` le garde uniquement en local.
- Si vous souhaitez que cela soit automatique, enregistrez une tâche planifiée pour exécuter l'étape d'actualisation à la connexion.

## Installation de WSL2 étape par étape

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

### 3) Installer OpenClaw (dans WSL)

Suivez le flux Getting Started Linux à l'intérieur de WSL :

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

Nous n'avons pas encore d'application compagnon Windows. Les contributions sont les bienvenues si vous souhaitez que des contributions permettent sa réalisation.

import fr from "/components/footer/fr.mdx";

<fr />
