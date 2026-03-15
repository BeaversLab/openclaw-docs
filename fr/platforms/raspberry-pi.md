---
summary: "OpenClaw sur Raspberry Pi (configuration auto-hébergée économique)"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

# OpenClaw sur Raspberry Pi

## Objectif

Exécuter une passerelle OpenClaw Gateway persistante et toujours active sur un Raspberry Pi pour un coût unique d'environ **35-80 $** (sans frais mensuels).

Parfait pour :

- Assistant IA personnel 24/7
- Centre de domotique
- Bot Telegram/WhatsApp à faible consommation et toujours disponible

## Configuration matérielle requise

| Modèle de Pi    | RAM       | Fonctionne ?   | Notes                                         |
| --------------- | --------- | -------------- | --------------------------------------------- |
| **Pi 5**        | 4 Go/8 Go | ✅ Le meilleur | Le plus rapide, recommandé                    |
| **Pi 4**        | 4 Go      | ✅ Bon         | Idéal pour la plupart des utilisateurs        |
| **Pi 4**        | 2 Go      | ✅ OK          | Fonctionne, ajoutez un swap                   |
| **Pi 4**        | 1 Go      | ⚠️ Juste       | Possible avec un swap, configuration minimale |
| **Pi 3B+**      | 1 Go      | ⚠️ Lent        | Fonctionne mais est lent                      |
| **Pi Zero 2 W** | 512 Mo    | ❌             | Non recommandé                                |

**Configuration minimale :** 1 Go de RAM, 1 cœur, 500 Mo d'espace disque  
**Recommandé :** 2 Go+ de RAM, OS 64 bits, carte SD de 16 Go+ (ou SSD USB)

## Ce dont vous aurez besoin

- Raspberry Pi 4 ou 5 (2 Go+ recommandés)
- Carte MicroSD (16 Go+) ou SSD USB (meilleures performances)
- Alimentation (bloc d'alimentation officiel Pi recommandé)
- Connexion réseau (Ethernet ou WiFi)
- ~30 minutes

## 1) Flasher le système d'exploitation

Utilisez **Raspberry Pi OS Lite (64 bits)** — aucun bureau n'est nécessaire pour un serveur sans tête.

1. Téléchargez [Raspberry Pi Imager](https://www.raspberrypi.com/software/)
2. Choisir le système d'exploitation : **Raspberry Pi OS Lite (64 bits)**
3. Cliquez sur l'icône d'engrenage (⚙️) pour pré-configurer :
   - Définir le nom d'hôte : `gateway-host`
   - Activer SSH
   - Définir le nom d'utilisateur/mot de passe
   - Configurer le WiFi (si vous n'utilisez pas Ethernet)
4. Flasher sur votre carte SD / lecteur USB
5. Insérer et démarrer le Pi

## 2) Se connecter via SSH

```bash
ssh user@gateway-host
# or use the IP address
ssh user@192.168.x.x
```

## 3) Configuration du système

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y git curl build-essential

# Set timezone (important for cron/reminders)
sudo timedatectl set-timezone America/Chicago  # Change to your timezone
```

## 4) Installer Node.js 24 (ARM64)

```bash
# Install Node.js via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version  # Should show v24.x.x
npm --version
```

## 5) Ajouter du swap (Important pour 2 Go ou moins)

Le swap empêche les plantages dus à un manque de mémoire :

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

## 6) Installer OpenClaw

### Option A : Installation standard (Recommandée)

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
```

### Option B : Installation modifiable (Pour le bricolage)

```bash
git clone https://github.com/openclaw/openclaw.git
cd openclaw
npm install
npm run build
npm link
```

L'installation modifiable vous donne un accès direct aux journaux et au code — utile pour le débogage des problèmes spécifiques à l'ARM.

## 7) Exécuter Onboarding

```bash
openclaw onboard --install-daemon
```

Suivez l'assistant :

1. **Mode passerelle :** Local
2. **Authentification :** Clés API recommandées (OAuth peut être capricieux sur un Pi sans tête)
3. **Canaux :** Telegram est le plus simple pour commencer
4. **Démon :** Oui (systemd)

## 8) Vérifier l'installation

```bash
# Check status
openclaw status

# Check service
sudo systemctl status openclaw

# View logs
journalctl -u openclaw -f
```

## 9) Accéder au tableau de bord OpenClaw

Remplacez `user@gateway-host` par votre nom d'utilisateur Pi et votre nom d'hôte ou adresse IP.

Sur votre ordinateur, demandez au Pi d'afficher une nouvelle URL de tableau de bord :

```bash
ssh user@gateway-host 'openclaw dashboard --no-open'
```

La commande affiche `Dashboard URL:`. Selon la manière dont `gateway.auth.token`
est configuré, l'URL peut être un lien `http://127.0.0.1:18789/` brut ou un
qui inclut `#token=...`.

Dans un autre terminal sur votre ordinateur, créez le tunnel SSH :

```bash
ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
```

Ensuite, ouvrez l'URL du tableau de bord affichée dans votre navigateur local.

Si l'interface utilisateur demande une authentification, collez le jeton de `gateway.auth.token`
(ou `OPENCLAW_GATEWAY_TOKEN`) dans les paramètres de l'interface de contrôle.

Pour un accès à distance permanent, voir [Tailscale](/fr/gateway/tailscale).

---

## Optimisations des performances

### Utiliser un SSD USB (Amélioration majeure)

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

Remarques :

- `NODE_COMPILE_CACHE` accélère les exécutions ultérieures (`status`, `health`, `--help`).
- `/var/tmp` survit mieux aux redémarrages que `/tmp`.
- `OPENCLAW_NO_RESPAWN=1` évite le coût de démarrage supplémentaire du redémarrage automatique du CLI.
- La première exécution réchauffe le cache ; les exécutions ultérieures en profitent le plus.

### réglage du démarrage systemd (optionnel)

Si ce Pi exécute principalement OpenClaw, ajoutez un drop-in de service pour réduire la gigue
de redémarrage et garder l'environnement de démarrage stable :

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

Puis appliquez :

```bash
sudo systemctl daemon-reload
sudo systemctl restart openclaw
```

Si possible, conservez l'état/le cache de OpenClaw sur un stockage SSD pour éviter les goulots d'étranglement
E/S aléatoires de la carte SD lors des démarrages à froid.

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

La plupart des fonctionnalités d'OpenClaw fonctionnent sur ARM64, mais certains binaires externes peuvent nécessiter des versions ARM :

| Outil                 | État ARM64 | Notes                                       |
| --------------------- | ---------- | ------------------------------------------- |
| Node.js               | ✅         | Fonctionne très bien                        |
| WhatsApp (Baileys)    | ✅         | JS pur, aucun problème                      |
| Telegram              | ✅         | JS pur, aucun problème                      |
| gog (Gmail CLI)       | ⚠️         | Vérifier la disponibilité d'une version ARM |
| Chromium (navigateur) | ✅         | `sudo apt install chromium-browser`         |

Si une compétence échoue, vérifiez si son binaire dispose d'une version ARM. De nombreux outils Go/Rust en ont ; certains non.

### 32 bits contre 64 bits

**Utilisez toujours un OS 64 bits.** Node.js et de nombreux outils modernes l'exigent. Vérifiez avec :

```bash
uname -m
# Should show: aarch64 (64-bit) not armv7l (32-bit)
```

---

## Configuration de modèle recommandée

Puisque le Pi n'est que le Gateway (les modèles tournent dans le cloud), utilisez des modèles basés sur l'API :

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

## Démarrage automatique au démarrage

L'assistant de configuration (onboarding) configure cela, mais pour vérifier :

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

- Utiliser un SSD USB au lieu d'une carte SD
- Désactiver les services inutilisés : `sudo systemctl disable cups bluetooth avahi-daemon`
- Vérifier le bridage du CPU : `vcgencmd get_throttled` (devrait renvoyer `0x0`)

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

Pour les Pi sans écran (headless) sur WiFi :

```bash
# Disable WiFi power management
sudo iwconfig wlan0 power off

# Make permanent
echo 'wireless-power off' | sudo tee -a /etc/network/interfaces
```

---

## Comparaison des coûts

| Configuration   | Coût unique | Coût mensuel | Notes                         |
| --------------- | ----------- | ------------ | ----------------------------- |
| **Pi 4 (2 Go)** | ~45 $       | 0 $          | + électricité (~5 $/an)       |
| **Pi 4 (4 Go)** | ~55 $       | 0 $          | Recommandé                    |
| **Pi 5 (4 Go)** | ~60 $       | 0 $          | Meilleures performances       |
| **Pi 5 (8 Go)** | ~80 $       | 0 $          | Surdimensionné mais futuriste |
| DigitalOcean    | 0 $         | 6 $/mois     | 72 $/an                       |
| Hetzner         | 0 $         | 3,79 €/mois  | ~50 $/an                      |

**Seuil de rentabilité :** Un Pi s'autofinance en ~6 à 12 mois par rapport à un VPS cloud.

---

## Voir aussi

- [Guide Linux](/fr/platforms/linux) — configuration générale Linux
- [Guide DigitalOcean](/fr/platforms/digitalocean) — alternative cloud
- [Guide Hetzner](/fr/install/hetzner) — configuration Docker
- [Tailscale](/fr/gateway/tailscale) — accès à distance
- [Nœuds](/fr/nodes) — associez votre ordinateur portable/téléphone à la passerelle Pi

import fr from '/components/footer/fr.mdx';

<fr />
