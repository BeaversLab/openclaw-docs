---
summary: "Héberger OpenClaw sur un Droplet DigitalOcean"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for a simple paid VPS for OpenClaw
title: "DigitalOcean"
---

Exécutez un OpenClaw Gateway persistant sur un Droplet DigitalOcean (environ 6 $/mois pour le plan Basic de 1 Go).

DigitalOcean est le chemin VPS payant le plus simple. Si vous préférez des options moins chères ou gratuites :

- [Hetzner](/fr/install/hetzner) — 3,79 €/mois, plus de cœurs/RAM par dollar.
- [Oracle Cloud](/fr/install/oracle) — Always Free ARM (jusqu'à 4 OCPU, 24 Go de RAM), mais l'inscription peut être capricieuse et limitée à ARM.

## Prérequis

- Compte DigitalOcean ([inscription](https://cloud.digitalocean.com/registrations/new))
- Paire de clés SSH (ou volonté d'utiliser l'authentification par mot de passe)
- Environ 20 minutes

## Configuration

<Steps>
  <Step title="Créer un Droplet">
    <Warning>
    Utilisez une image de base propre (Ubuntu 24.04 LTS). Évitez les images en un clic du Marketplace tiers, sauf si vous avez examiné leurs scripts de démarrage et les paramètres par défaut du pare-feu.
    </Warning>

    1. Connectez-vous à [DigitalOcean](https://cloud.digitalocean.com/).
    2. Cliquez sur **Create > Droplets**.
    3. Choisissez :
       - **Region :** La plus proche de chez vous
       - **Image :** Ubuntu 24.04 LTS
       - **Size :** Basic, Regular, 1 vCPU / 1 Go de RAM / 25 Go SSD
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

    # Create the non-root user that will own OpenClaw state and services.
    adduser openclaw
    usermod -aG sudo openclaw
    loginctl enable-linger openclaw

    su - openclaw
    openclaw --version
    ```

    N'utilisez le shell root que pour l'amorçage du système. Exécutez les commandes OpenClaw en tant qu'utilisateur `openclaw` non root afin que l'état soit stocké sous `/home/openclaw/.openclaw/` et que le Gateway s'installe en tant que service systemd de cet utilisateur.

  </Step>

  <Step title="Exécuter l'intégration">
    ```bash
    openclaw onboard --install-daemon
    ```

    L'assistant vous guide à travers l'authentification du modèle, la configuration du canal, la génération de jetons de passerelle et l'installation du démon (systemd).

  </Step>

  <Step title="Ajouter du swap (recommandé pour les Droplets de 1 Go)">
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
    Par défaut, la passerelle est liée à l'adresse locale (loopback). Choisissez l'une de ces options.

    **Option A : Tunnel SSH (le plus simple)**

    ```bash
    # From your local machine
    ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP
    ```

    Puis ouvrez `http://localhost:18789`Tailscale.

    **Option B : Tailscale Serve**

    ```bash
    curl -fsSL https://tailscale.com/install.sh | sudo sh
    sudo tailscale up
    openclaw config set gateway.tailscale.mode serve
    openclaw gateway restart
    ```

    Puis ouvrez `https://<magicdns>/`TailscaleAPI depuis n'importe quel appareil de votre tailnet.

    Tailscale Serve authentifie le trafic de l'interface de contrôle et des WebSockets via les en-têtes d'identité du tailnet, ce qui suppose que l'hôte de la passerelle lui-même est fiable. Les points de terminaison de l'HTTP API suivent le mode d'authentification normal de la passerelle (jeton/mot de passe) quoi qu'il en soit. Pour exiger des identifiants de secret partagé explicites via Serve, définissez `gateway.auth.allowTailscale: false` et utilisez `gateway.auth.mode: "token"` ou `"password"`.

    **Option C : Liaison Tailnet (sans Serve)**

    ```bash
    openclaw config set gateway.bind tailnet
    openclaw gateway restart
    ```

    Puis ouvrez `http://<tailscale-ip>:18789` (jeton requis).

  </Step>
</Steps>

## Persistance et sauvegardes

L'état d'OpenClaw se trouve sous :

- `~/.openclaw/` — `openclaw.json`, `auth-profiles.json` par agent, état du channel/fournisseur, et données de session.
- `~/.openclaw/workspace/` — l'espace de travail de l'agent (SOUL.md, mémoire, artefacts).

Ces éléments survivent aux redémarrages du Droplet. Pour créer un instantané portable :

```bash
openclaw backup create
```

Les instantanés DigitalOcean sauvegardent l'intégralité du Droplet ; DigitalOcean`openclaw backup create` est portable entre les hôtes.

## Conseils pour 1 Go de RAM

Le Droplet à 6 $ n'a que 1 Go de RAM. Pour garder le système fluide :

- Assurez-vous que l'étape de swap ci-dessus est dans `/etc/fstab` afin qu'elle survive aux redémarrages.
- Préférez les modèles basés sur une API (Claude, GPT) aux modèles locaux — l'inférence locale de LLM ne tient pas dans 1 Go.
- Réglez `agents.defaults.model.primary` sur un modèle plus petit si vous rencontrez des erreurs de mémoire (OOM) sur de grandes invites.
- Surveillez avec `free -h` et `htop`.

## Dépannage

**Le Gateway ne démarre pas** -- Exécutez `openclaw doctor --non-interactive` et vérifiez les journaux avec `journalctl --user -u openclaw-gateway.service -n 50`.

**Port déjà utilisé** -- Exécutez `lsof -i :18789` pour trouver le processus, puis arrêtez-le.

**Mémoire insuffisante** -- Vérifiez que le swap est actif avec `free -h`. Si vous rencontrez toujours des erreurs OOM, utilisez des modèles basés sur une API (Claude, GPT) plutôt que des modèles locaux, ou passez à un Droplet de 2 Go.

## Étapes suivantes

- [Canaux](/fr/channels) -- connectez Telegram, WhatsApp, Discord, et plus
- [Configuration du Gateway](/fr/gateway/configuration) -- toutes les options de configuration
- [Mise à jour](/fr/install/updating) -- garder OpenClaw à jour

## Connexes

- [Aperçu de l'installation](/fr/install)
- [Fly.io](/fr/install/fly)
- [Hetzner](/fr/install/hetzner)
- [Hébergement VPS](/fr/vps)
