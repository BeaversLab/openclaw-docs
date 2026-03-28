---
summary: "Héberger OpenClaw sur le niveau ARM Always Free de Oracle Cloud"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

# Oracle Cloud

Exécutez une passerelle OpenClaw Gateway persistante sur le niveau ARM **Always Free** de Oracle Cloud (jusqu'à 4 OCPU, 24 Go de RAM, 200 Go de stockage) gratuitement.

## Prérequis

- Compte Oracle Cloud ([inscription](https://www.oracle.com/cloud/free/)) -- consultez le [guide d'inscription communautaire](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) si vous rencontrez des problèmes
- Compte Tailscale (gratuit sur [tailscale.com](https://tailscale.com))
- Une paire de clés SSH
- Environ 30 minutes

## Configuration

<Steps>
  <Step title="Créer une instance OCI">
    1. Connectez-vous à la [Console Oracle Cloud](https://cloud.oracle.com/).
    2. Naviguez vers **Compute > Instances > Create Instance**.
    3. Configurez :
       - **Name :** `openclaw`
       - **Image :** Ubuntu 24.04 (aarch64)
       - **Shape :** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs :** 2 (ou jusqu'à 4)
       - **Memory :** 12 Go (ou jusqu'à 24 Go)
       - **Boot volume :** 50 Go (jusqu'à 200 Go gratuits)
       - **SSH key :** Ajoutez votre clé publique
    4. Cliquez sur **Create** et notez l'adresse IP publique.

    <Tip>
    Si la création de l'instance échoue avec "Out of capacity", essayez un domaine de disponibilité différent ou réessayez plus tard. La capacité du niveau gratuit est limitée.
    </Tip>

  </Step>

  <Step title="Connecter et mettre à jour le système">
    ```bash
    ssh ubuntu@YOUR_PUBLIC_IP

    sudo apt update && sudo apt upgrade -y
    sudo apt install -y build-essential
    ```

    `build-essential` est requis pour la compilation ARM de certaines dépendances.

  </Step>

  <Step title="Configurer l'utilisateur et le nom d'hôte">
    ```bash
    sudo hostnamectl set-hostname openclaw
    sudo passwd ubuntu
    sudo loginctl enable-linger ubuntu
    ```

    L'activation de linger permet de maintenir les services utilisateur actifs après la déconnexion.

  </Step>

  <Step title="Installer Tailscale">
    ```bash
    curl -fsSL https://tailscale.com/install.sh | sh
    sudo tailscale up --ssh --hostname=openclaw
    ```

    Désormais, connectez-vous via Tailscale : `ssh ubuntu@openclaw`.

  </Step>

  <Step title="Installer OpenClaw">
    ```bash
    curl -fsSL https://openclaw.ai/install.sh | bash
    source ~/.bashrc
    ```

    Lorsqu'on vous demande "How do you want to hatch your bot?", sélectionnez **Do this later**.

  </Step>

  <Step title="Configurer la passerelle">
    Utilisez l'authentification par jeton avec Tailscale Serve pour un accès distant sécurisé.

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway
    ```

  </Step>

  <Step title="Verrouiller la sécurité du VCN">
    Bloquez tout le trafic sauf Tailscale à la périphérie du réseau :

    1. Allez dans **Networking > Virtual Cloud Networks** dans la console OCI.
    2. Cliquez sur votre VCN, puis sur **Security Lists > Default Security List**.
    3. **Supprimez** toutes les règles d'entrée sauf `0.0.0.0/0 UDP 41641` (Tailscale).
    4. Conservez les règles de sortie par défaut (autoriser tout le trafic sortant).

    Cela bloque le SSH sur le port 22, HTTP, HTTPS et tout le reste à la périphérie du réseau. Vous ne pouvez plus vous connecter que via Tailscale à partir de maintenant.

  </Step>

  <Step title="Vérifier">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway
    tailscale serve status
    curl http://localhost:18789
    ```

    Accédez à l'interface de contrôle depuis n'importe quel appareil de votre tailnet :

    ```
    https://openclaw.<tailnet-name>.ts.net/
    ```

    Remplacez `<tailnet-name>` par le nom de votre tailnet (visible dans `tailscale status`).

  </Step>
</Steps>

## Solution de secours : Tunnel SSH

Si Tailscale Serve ne fonctionne pas, utilisez un tunnel SSH depuis votre machine locale :

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

Ensuite, ouvrez `http://localhost:18789`.

## Dépannage

**La création de l'instance échoue ("Out of capacity")** -- Les instances ARM de la offre gratuite sont très demandées. Essayez un autre domaine de disponibilité ou réessayez aux heures creuses.

**Tailscale ne parvient pas à se connecter** -- Exécutez `sudo tailscale up --ssh --hostname=openclaw --reset` pour vous authentifier à nouveau.

**La Gateway ne démarre pas** -- Exécutez `openclaw doctor --non-interactive` et vérifiez les journaux avec `journalctl --user -u openclaw-gateway -n 50`.

**Problèmes de binaires ARM** -- La plupart des paquets npm fonctionnent sur ARM64. Pour les binaires natifs, recherchez les versions `linux-arm64` ou `aarch64`. Vérifiez l'architecture avec `uname -m`.

## Étapes suivantes

- [Canaux](/fr/channels) -- connectez Telegram, WhatsApp, Discord, et plus encore
- [Configuration de la Gateway](/fr/gateway/configuration) -- toutes les options de configuration
- [Mise à jour](/fr/install/updating) -- garder OpenClaw à jour
