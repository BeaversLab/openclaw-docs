---
summary: "OpenClaw on Raspberry Pi (budget self-hosted setup)"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# OpenClaw on Raspberry Pi

## Goal

Run a persistent, always-on OpenClaw Gateway on a Raspberry Pi for **~$35-80** one-time cost (no monthly fees).

Perfect for:

- 24/7 personal AI assistant
- Home automation hub
- Low-power, always-available Telegram/WhatsApp bot

## Hardware Requirements

| Pi Model        | RAM     | Works?   | Notes                              |
| --------------- | ------- | -------- | ---------------------------------- |
| **Pi 5**        | 4GB/8GB | ✅ Best  | Fastest, recommended               |
| **Pi 4**        | 4GB     | ✅ Good  | Sweet spot for most users          |
| **Pi 4**        | 2GB     | ✅ OK    | Works, add swap                    |
| **Pi 4**        | 1GB     | ⚠️ Tight | Possible with swap, minimal config |
| **Pi 3B+**      | 1GB     | ⚠️ Slow  | Works but sluggish                 |
| **Pi Zero 2 W** | 512MB   | ❌       | Not recommended                    |

**Minimum specs:** 1GB RAM, 1 core, 500MB disk  
**Recommended:** 2GB+ RAM, 64-bit OS, 16GB+ SD card (or USB SSD)

## What you need

- Raspberry Pi 4 or 5 (2GB+ recommended)
- MicroSD card (16GB+) or USB SSD (better performance)
- Power supply (official Pi PSU recommended)
- Network connection (Ethernet or WiFi)
- ~30 minutes

## 1) Flash the OS

Use **Raspberry Pi OS Lite (64-bit)** — no desktop needed for a headless server.

1. Download [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Choose OS: **Raspberry Pi OS Lite (64-bit)**
3. Click the gear icon (⚙️) to pre-configure:
   - Set hostname: `gateway-host`
   - Enable SSH
   - Set username/password
   - Configure WiFi (if not using Ethernet)
4. Flash to your SD card / USB drive
5. Insert and boot the Pi

## 2) Connect via SSH

```bash
ssh user@gateway-host
# or use the IP address
ssh user@192.168.x.x
```

## 3) System Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y git curl build-essential

# Set timezone (important for cron/reminders)
sudo timedatectl set-timezone America/Chicago  # Change to your timezone
```

## 4) Install Node.js 24 (ARM64)

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v24.x.x
npm --version
```

## 5) Add Swap (Important for 2GB or less)

Swap prevents out-of-memory crashes:

```bash
# Create 2GB swap file
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Make permanent
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# Optimize for low RAM (reduce swappiness)
echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

## 6) Install OpenClaw

### Option A: Standard Install (Recommended)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### Option B: Hackable Install (For tinkering)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

The hackable install gives you direct access to logs and code — useful for debugging ARM-specific issues.

## 7) Run Onboarding

```bash
openclaw onboard --install-daemon
```

Follow the wizard:

1. **Gateway mode:** Local
2. **Auth:** API keys recommended (OAuth can be finicky on headless Pi)
3. **Channels:** Telegram is easiest to start with
4. **Daemon:** Yes (systemd)

## 8) Verify Installation

```bash
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f
```

## 9) Access the OpenClaw Dashboard

Replace `user@gateway-host` with your Pi username and hostname or IP address.

Sur votre ordinateur, demandez au Pi d'afficher une nouvelle URL de tableau de bord :

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

La commande affiche `Dashboard URL:`. Selon la façon dont `gateway.auth.token`
est configuré, l'URL peut être un lien `http://127.0.0.1:18789/` simple ou un
qui inclut `#token=...`.

Dans un autre terminal sur votre ordinateur, créez le tunnel SSH :

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

Ouvrez ensuite l'URL du tableau de bord affichée dans votre navigateur local.

Si l'interface utilisateur demande une authentification, collez le jeton de `gateway.auth.token`
(ou `OPENCLAW_GATEWAY_TOKEN`) dans les paramètres de l'interface de contrôle.

Pour un accès à distance permanent, voir [Tailscale](/fr/gateway/tailscale).

---

## Optimisations des performances

### Utiliser un SSD USB (Amélioration considérable)

Les cartes SD sont lentes et s'usent. Un SSD USB améliore considérablement les performances :

```bash
# Check if booting from USB
lsblk
```

Voir le [guide de démarrage USB Pi](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot) pour la configuration.

### Accélérer le démarrage du CLI (cache de compilation des modules)

Sur les hôtes Pi moins puissants, activez le cache de compilation des modules de Node afin que les exécutions répétées du CLI soient plus rapides :

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

Notes :

- `NODE_COMPILE_CACHE` accélère les exécutions suivantes (`status`, `health`, `--help`).
- `/var/tmp` survit mieux aux redémarrages que `/tmp`.
- `OPENCLAW_NO_RESPAWN=1` évite le coût de démarrage supplémentaire dû au redémarrage automatique du CLI.
- La première exécution réchauffe le cache ; les exécutions ultérieures en profitent le plus.

### réglage du démarrage systemd (optionnel)

Si ce Pi exécute principalement OpenClaw, ajoutez une instruction de service pour réduire la gigue de redémarrage
et garder l'environnement de démarrage stable :

```bash
sudo systemctl edit openclaw
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

Appliquez ensuite :

```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw
```

Si possible, gardez l'état/le cache de OpenClaw sur un stockage SSD pour éviter les goulots d'étranglement des E/S aléatoires de la carte SD
lors des démarrages à froid.

Comment les stratégies `Restart=` aident à la récupération automatisée :
[systemd peut automatiser la récupération de service](https://www.redhat.com/en/blog/systemd-automate-recovery).

### Réduire l'utilisation de la mémoire

```bash
# Disable GPU memory allocation (headless)
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt

# Disable Bluetooth if not needed
sudo systemctl disable bluetooth
```

### Surveiller les ressources

```bash
# Check memory
free -h

# Check CPU temperature
vcgencmd measure_temp

# Live monitoring
htop
```

---

## Notes spécifiques à l'ARM

### Compatibilité binaire

La plupart des fonctionnalités de OpenClaw fonctionnent sur ARM64, mais certains binaires externes peuvent nécessiter des builds ARM :

| Outil                 | Statut ARM64 | Notes                                       |
| --------------------- | ------------ | ------------------------------------------- |
| Node.js               | ✅           | Fonctionne parfaitement                     |
| WhatsApp (Baileys)    | ✅           | JS pur, aucun problème                      |
| Telegram              | ✅           | JS pur, aucun problème                      |
| gog (Gmail CLI)       | ⚠️           | Vérifier la disponibilité d'une version ARM |
| Chromium (navigateur) | ✅           | `sudo apt install chromium-browser`         |

Si une compétence échoue, vérifiez si son binaire possède une version ARM. Beaucoup d'outils Go/Rust en ont ; certains non.

### 32 bits vs 64 bits

**Utilisez toujours un OS 64 bits.** Node.js et de nombreux outils modernes l'exigent. Vérifiez avec :

```bash
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)
```

---

## Configuration de modèle recommandée

Puisque le Pi n'est que la Gateway (les modèles s'exécutent dans le cloud), utilisez des modèles basés sur API :

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-20250514",
        "fallbacks": ["openai/gpt-4o-mini"]
      }
    }
  }
}
```

**N'essayez pas d'exécuter des LLM locaux sur un Pi** — même les petits modèles sont trop lents. Laissez Claude/GPT faire le gros du travail.

---

## Démarrage automatique au boot

L'onboarding configure cela, mais pour vérifier :

```bash
# Check service is enabled
sudo systemctl is-enabled openclaw

# Enable if not
sudo systemctl enable openclaw

# Start on boot
sudo systemctl start openclaw
```

---

## Dépannage

### Manque de mémoire (OOM)

```bash
# Check memory
free -h

# Add more swap (see Step 5)
# Or reduce services running on the Pi
```

### Performances lentes

- Utilisez un SSD USB au lieu d'une carte SD
- Désactivez les services inutilisés : `sudo systemctl disable cups bluetooth avahi-daemon`
- Vérifiez le throttling du CPU : `vcgencmd get_throttled` (devrait retourner `0x0`)

### Le service ne démarre pas

```bash
# Check logs
journalctl -u openclaw --no-pager -n 100

# Common fix: rebuild
cd ~/openclaw  # if using hackable install
npm run build
sudo systemctl restart openclaw
```

### Problèmes de binaire ARM

Si une compétence échoue avec l'erreur "exec format error" :

1. Vérifiez si le binaire dispose d'une version ARM64
2. Essayez de compiler à partir du code source
3. Ou utilisez un conteneur Docker avec support ARM

### Déconnexions WiFi

Pour les Pi sans écran en WiFi :

```bash
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## Comparaison des coûts

| Installation   | Coût unique | Coût mensuel | Notes                         |
| -------------- | ----------- | ------------ | ----------------------------- |
| **Pi 4 (2GB)** | ~$45        | $0           | + électricité (~$5/an)        |
| **Pi 4 (4GB)** | ~$55        | $0           | Recommandé                    |
| **Pi 5 (4GB)** | ~$60        | $0           | Meilleures performances       |
| **Pi 5 (8GB)** | ~$80        | $0           | Surdimensionné mais futuriste |
| DigitalOcean   | $0          | $6/mois      | $72/an                        |
| Hetzner        | $0          | €3.79/mois   | ~$50/an                       |

**Rentabilité :** Un Pi se rentabilise en ~6-12 mois par rapport à un VPS cloud.

---

## Voir aussi

- [Guide Linux](/fr/platforms/linux) — configuration Linux générale
- [Guide DigitalOcean](/fr/platforms/digitalocean) — alternative cloud
- [Guide Hetzner](/fr/install/hetzner) — configuration Docker
- [Tailscale](/fr/gateway/tailscale) — accès à distance
- [Nœuds](/fr/nodes) — couplez votre ordinateur portable/téléphone avec la passerelle Pi

import fr from "/components/footer/fr.mdx";

<fr />
