---
summary: "Héberger OpenClaw sur un Droplet DigitalOcean"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

Exécuter une passerelle OpenClaw persistante sur un Droplet DigitalOcean.

## Prérequis

- Compte DigitalOcean ([inscription](https://cloud.digitalocean.com/registrations/new))
- Paire de clés SSH (ou volonté d'utiliser l'authentification par mot de passe)
- Environ 20 minutes

## Configuration

<Steps>
  <Step title="Créer un Droplet">
    <Warning>
    Utilisez une image de base propre (Ubuntu 24.04 LTS). Évitez les images en un clic du Marketplace tiers, sauf si vous avez examiné leurs scripts de démarrage et leurs paramètres de pare-feu par défaut.
    </Warning>

    1. Connectez-vous à [DigitalOcean](https://cloud.digitalocean.com/).
    2. Cliquez sur **Create > Droplets**.
    3. Choisissez :
       - **Region :** La plus proche de chez vous
       - **Image :** Ubuntu 24.04 LTS
       - **Size :** Basic, Regular, 1 vCPU / 1 Go RAM / 25 Go SSD
       - **Authentication :** Clé SSH (recommandé) ou mot de passe
    4. Cliquez sur **Create Droplet** et notez l'adresse IP.

  </Step>

  <Step title="Se connecter et installer">
    ```bash
    ssh root@YOUR_DROPLET_IP

    apt update && apt upgrade -y

    # Install Node.js 24
    curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
    apt install -y nodejs

    # Install OpenClaw
    curl -fsSL https://openclaw.ai/install.sh | bash
    openclaw --version
    ```

  </Step>

  <Step title="Exécuter l'intégration">
    ```bash
    openclaw onboard --install-daemon
    ```

    L'assistant vous guide à travers l'authentification du modèle, la configuration du canal, la génération du jeton de la passerelle et l'installation du démon (systemd).

  </Step>

  <Step title="Ajouter de la swap (recommandé pour les Droplets de 1 Go)">
    ```bash
    fallocate -l 2G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    ```
  </Step>

<Step title="Vérifier la passerelle">```bash openclaw status systemctl --user status openclaw-gateway.service journalctl --user -u openclaw-gateway.service -f ```</Step>

  <Step title="Accéder à l'interface de contrôle">
    La passerelle se lie à l'interface de bouclage par défaut. Choisissez l'une de ces options.

    **Option A : Tunnel SSH (le plus simple)**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    Ensuite, ouvrez `http://localhost:18789`.

    **Option B : Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    Ensuite, ouvrez `https://<magicdns>/` depuis n'importe quel appareil de votre tailnet.

    **Option C : Tailnet bind (sans Serve)**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    Ensuite, ouvrez `http://<tailscale-ip>:18789` (jeton requis).

  </Step>
</Steps>

## Dépannage

**La passerelle ne démarre pas** -- Exécutez `openclaw doctor --non-interactive` et vérifiez les journaux avec `journalctl --user -u openclaw-gateway.service -n 50`.

**Port déjà utilisé** -- Exécutez `lsof -i :18789` pour trouver le processus, puis arrêtez-le.

**Manque de mémoire** -- Vérifiez que le swap est actif avec `free -h`. Si vous rencontrez toujours des erreurs OOM, utilisez des modèles basés sur l'API (Claude, GPT) plutôt que des modèles locaux, ou passez à un Droplet de 2 Go.

## Étapes suivantes

- [Canaux](/fr/channels) -- connectez Telegram, WhatsApp, Discord, et plus
- [Configuration de la Gateway](/fr/gateway/configuration) -- toutes les options de configuration
- [Mises à jour](/fr/install/updating) -- garder OpenClaw à jour

## Connexes

- [Aperçu de l'installation](/fr/install)
- [Fly.io](/fr/install/fly)
- [Hetzner](/fr/install/hetzner)
- [Hébergement VPS](/fr/vps)
