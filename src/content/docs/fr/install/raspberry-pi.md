---
summary: "Héberger OpenClaw sur un Raspberry Pi pour un auto-hébergement permanent"
read_when:
  - Setting up OpenClaw on a Raspberry Pi
  - Running OpenClaw on ARM devices
  - Building a cheap always-on personal AI
title: "Raspberry Pi"
---

Faites fonctionner une passerelle OpenClaw Gateway persistante et toujours active sur un Raspberry Pi. Puisque le Pi n'est que la passerelle (les modèles s'exécutent dans le cloud via API), même un Pi modeste gère bien la charge de travail — le coût typique du matériel est de **35–80 $ une seule fois**, sans frais mensuels.

## Compatibilité matérielle

| Modèle Pi   | RAM    | Fonctionne ? | Notes                                                 |
| ----------- | ------ | ------------ | ----------------------------------------------------- |
| Pi 5        | 4/8 Go | Idéal        | Le plus rapide, recommandé.                           |
| Pi 4        | 4 Go   | Bon          | Excellent compromis pour la plupart des utilisateurs. |
| Pi 4        | 2 Go   | OK           | Ajoutez un swap.                                      |
| Pi 4        | 1 Go   | Juste        | Possible avec swap, configuration minimale.           |
| Pi 3B+      | 1 Go   | Lent         | Fonctionne mais est lent.                             |
| Pi Zero 2 W | 512 Mo | Non          | Non recommandé.                                       |

**Minimum :** 1 Go de RAM, 1 cœur, 500 Mo d'espace disque libre, OS 64 bits.
**Recommandé :** 2 Go+ de RAM, carte SD de 16 Go+ (ou SSD USB), Ethernet.

## Prérequis

- Raspberry Pi 4 ou 5 avec 2 Go+ de RAM (4 Go recommandés)
- Carte MicroSD (16 Go+) ou SSD USB (meilleures performances)
- Alimentation Pi officielle
- Connexion réseau (Ethernet ou WiFi)
- OS Raspberry Pi 64 bits (requis -- n'utilisez pas 32 bits)
- Environ 30 minutes

## Configuration

<Steps>
  <Step title="Flash the OS">
    Utilisez **Raspberry PiRaspberry Pi OS Lite (64-bit)** -- aucun bureau n'est nécessaire pour un serveur sans tête.

    1. Téléchargez [Raspberry Pi Imager](https://www.raspberrypi.com/software/).
    2. Choisissez l'OS : **Raspberry Pi OS Lite (64-bit)**.
    3. Dans la boîte de dialogue des paramètres, préconfigurez :
       - Nom d'hôte : `gateway-host`
       - Activer SSH
       - Définir le nom d'utilisateur et le mot de passe
       - Configurer le WiFi (si vous n'utilisez pas Ethernet)
    4. Flash sur votre carte SD ou clé USB, insérez-la et démarrez le Pi.

  </Step>

<Step title="Connectez-vous via SSH">```bash ssh user@gateway-host ```</Step>

  <Step title="Mettez à jour le système">
    ```bash
    sudo apt update && sudo apt upgrade -y
    sudo apt install -y git curl build-essential

    # Set timezone (important for cron and reminders)
    sudo timedatectl set-timezone America/Chicago
    ```

  </Step>

<Step title="Installez Node.js 24">```bash curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash - sudo apt install -y nodejs node --version ```</Step>

  <Step title="Ajouter de la mémoire d'échange (important pour 2 Go ou moins)">
    ```bash
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

    # Reduce swappiness for low-RAM devices
    echo 'vm.swappiness=10' | sudo tee -a /etc/sysctl.conf
    sudo sysctl -p
    ```

  </Step>

<Step title="Installer OpenClaw">```bash curl -fsSL https://openclaw.ai/install.sh | bash ```</Step>

  <Step title="Exécuter l'intégration (onboarding)">
    ```bash
    openclaw onboard --install-daemon
    ```

    Suivez l'assistant. Les clés API sont recommandées plutôt que OAuth pour les appareils sans écran. Telegram est le canal le plus simple pour commencer.

  </Step>

<Step title="Vérifier">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="Access the Control UI">
    Sur votre ordinateur, obtenez une URL de tableau de bord à partir du Pi :

    ```bash
    ssh user@gateway-host 'openclaw dashboard --no-open'
    ```

    Créez ensuite un tunnel SSH dans un autre terminal :

    ```bash
    ssh -N -L 18789:127.0.0.1:18789 user@gateway-host
    ```

    Ouvrez l URL imprimée dans votre navigateur local. Pour un accès distant permanent, voir [Intégration Tailscale](/fr/gateway/tailscale).

  </Step>
</Steps>

## Conseils de performance

**Utilisez un SSD USB** -- les cartes SD sont lentes et s'usent. Un SSD USB améliore considérablement les performances. Consultez le [Guide de démarrage USB Pi](https://www.raspberrypi.com/documentation/computers/raspberry-pi.html#usb-mass-storage-boot).

**Activer le cache de compilation des modules** -- Accélère les invocations répétées de la CLI sur les Pi de faible puissance :

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF' # pragma: allowlist secret
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

`OPENCLAW_NO_RESPAWN=1` maintient les redémarrages de routine du Gateway en cours de processus, ce qui évite les transferts de processus supplémentaires et garde le suivi des PID simple sur les petits hôtes.

**Réduire l'utilisation de la mémoire** -- Pour les configurations sans tête, libérez la mémoire du GPU et désactivez les services inutilisés :

```bash
echo 'gpu_mem=16' | sudo tee -a /boot/config.txt
sudo systemctl disable bluetooth
```

**Drop-in systemd pour des redémarrages stables** -- Si ce Pi exécute principalement OpenClaw, ajoutez un drop-in de service :

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

Ensuite `systemctl --user daemon-reload && systemctl --user restart openclaw-gateway.service`. Sur un Pi sans tête, activez également la persistance une fois pour que le service utilisateur survive à la déconnexion : `sudo loginctl enable-linger "$(whoami)"`.

## Configuration de modèle recommandée

Comme le Pi n'exécute que la passerelle, utilisez des modèles API hébergés dans le cloud :

```json
{
  "agents": {
    "defaults": {
      "model": {
        "primary": "anthropic/claude-sonnet-4-6",
        "fallbacks": ["openai/gpt-5.4-mini"]
      }
    }
  }
}
```

N'exécutez pas de LLM locaux sur un Pi — même les petits modèles sont trop lents pour être utiles. Laissez Claude ou GPT faire le travail de modèle.

## Notes sur les binaires ARM

La plupart des fonctionnalités d'OpenClaw fonctionnent sur ARM64 sans modification (Node.js, Telegram, WhatsApp/BaileysCLI, Chromium). Les binaires qui manquent occasionnellement de builds ARM sont généralement des outils CLI optionnels en Go/Rust fournis par les compétences. Vérifiez la page de publication d'un binaire manquant pour les artefacts `linux-arm64` / `aarch64` avant de revenir à la compilation à partir des sources.

## Persistance et sauvegardes

L'état d'OpenClaw réside sous :

- `~/.openclaw/` — `openclaw.json`, `auth-profiles.json` par agent, état du canal/fournisseur, sessions.
- `~/.openclaw/workspace/` — espace de travail de l'agent (SOUL.md, mémoire, artefacts).

Ces éléments survivent aux redémarrages. Prenez un instantané portable avec :

```bash
openclaw backup create
```

Si vous les conservez sur un SSD, les performances et la longévité sont améliorées par rapport à la carte SD.

## Dépannage

**Manque de mémoire** -- Vérifiez que le swap est actif avec `free -h`. Désactivez les services inutilisés (`sudo systemctl disable cups bluetooth avahi-daemon`). Utilisez uniquement des modèles basés sur l'API.

**Performances lentes** -- Utilisez un SSD USB au lieu d'une carte SD. Vérifiez le étranglement de l'UC avec `vcgencmd get_throttled` (devrait retourner `0x0`).

**Le service ne démarre pas** -- Consultez les journaux avec `journalctl --user -u openclaw-gateway.service --no-pager -n 100` et exécutez `openclaw doctor --non-interactive`. S'il s'agit d'un Pi sans tête, vérifiez également que la persistance est activée : `sudo loginctl enable-linger "$(whoami)"`.

**Problèmes de binaire ARM** -- Si une compétence échoue avec « exec format error », vérifiez si le binaire dispose d'une version ARM64. Vérifiez l'architecture avec `uname -m` (devrait afficher `aarch64`).

**Déconnexions WiFi** -- Désactivez la gestion de l'alimentation WiFi : `sudo iwconfig wlan0 power off`.

## Étapes suivantes

- [Canaux](/fr/channels) -- connectez Telegram, WhatsApp, Discord, et plus
- [Configuration de la Gateway](/fr/gateway/configuration) -- toutes les options de configuration
- [Mise à jour](/fr/install/updating) -- garder OpenClaw à jour

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [Serveur Linux](/fr/vps)
- [Plateformes](/fr/platforms)
