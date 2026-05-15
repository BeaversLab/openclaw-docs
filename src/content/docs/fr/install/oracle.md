---
summary: "OpenClawHéberger OpenClaw sur le niveau Always Free ARM d'Oracle Cloud"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for free VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud"
---

Exécutez un OpenClaw Gateway persistant sur le niveau ARM **Always Free** de Oracle Cloud (jusqu'à 4 OCPU, 24 Go de RAM, 200 Go de stockage) sans frais.

## Prérequis

- Compte Oracle Cloud ([inscription](https://www.oracle.com/cloud/free/)) -- consultez le [guide d'inscription communautaire](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) si vous rencontrez des problèmes
- Compte Tailscale (gratuit sur [tailscale.com](https://tailscale.com))
- Une paire de clés SSH
- Environ 30 minutes

## Configuration

<Steps>
  <Step title="Créer une instance OCI">
    1. Connectez-vous à la [Console Oracle Cloud](https://cloud.oracle.com/).
    2. Accédez à **Compute > Instances > Create Instance**.
    3. Configurez :
       - **Nom :** `openclaw`
       - **Image :** Ubuntu 24.04 (aarch64)
       - **Shape (Forme) :** `VM.Standard.A1.Flex` (Ampere ARM)
       - **OCPUs :** 2 (jusqu'à 4)
       - **Mémoire :** 12 Go (jusqu'à 24 Go)
       - **Volume de démarrage :** 50 Go (jusqu'à 200 Go gratuits)
       - **Clé SSH :** Ajoutez votre clé publique
    4. Cliquez sur **Create** (Créer) et notez l'adresse IP publique.

    <Tip>
    Si la création de l'instance échoue avec le message "Out of capacity" (capacité insuffisante), essayez un domaine de disponibilité différent ou réessayez plus tard. La capacité du niveau gratuit est limitée.
    </Tip>

  </Step>

  <Step title="Se connecter et mettre à jour le système">
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

    L'activation de linger maintient les services utilisateur en cours d'exécution après la déconnexion.

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

    Lorsqu'on vous demande "How do you want to hatch your bot?" (Comment souhaitez-vous faire éclore votre bot ?), sélectionnez **Do this later** (Faire cela plus tard).

  </Step>

  <Step title="Configurer la passerelle"Tailscale>
    Utilisez l'authentification par jeton avec Tailscale Serve pour un accès distant sécurisé.

    ```bash
    openclaw config set gateway.bind loopback
    openclaw config set gateway.auth.mode token
    openclaw doctor --generate-gateway-token
    openclaw config set gateway.tailscale.mode serve
    openclaw config set gateway.trustedProxies '["127.0.0.1"]'

    systemctl --user restart openclaw-gateway.service
    ```

    `gateway.trustedProxies=["127.0.0.1"]`Tailscale ici est uniquement pour la gestion des IP transmises/clients locaux du proxy Tailscale Serve local. Ce n'est **pas** `gateway.auth.mode: "trusted-proxy"`. Les routes du visualiseur de différences conservent un comportement fermé par défaut dans cette configuration : les requêtes brutes du visualiseur `127.0.0.1` sans en-têtes de proxy transmis peuvent renvoyer `Diff not found`. Utilisez `mode=file` / `mode=both` pour les pièces jointes, ou activez intentionnellement les visualiseurs distants et définissez `plugins.entries.diffs.config.viewerBaseUrl` (ou passez un proxy `baseUrl`) si vous avez besoin de liens de visualiseur partageables.

  </Step>

  <Step title="Verrouiller la sécurité du VCN"Tailscale>
    Bloquez tout le trafic sauf Tailscale à la bordure du réseau :

    1. Allez dans **Networking > Virtual Cloud Networks** dans la console OCI.
    2. Cliquez sur votre VCN, puis sur **Security Lists > Default Security List**.
    3. **Supprimez** toutes les règles d'entrée sauf `0.0.0.0/0 UDP 41641`TailscaleTailscale (Tailscale).
    4. Conservez les règles de sortie par défaut (autoriser tout le trafic sortant).

    Cela bloque le SSH sur le port 22, HTTP, HTTPS et tout autre chose à la bordure du réseau. Vous ne pouvez vous connecter que via Tailscale à partir de maintenant.

  </Step>

  <Step title="Vérifier">
    ```bash
    openclaw --version
    systemctl --user status openclaw-gateway.service
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

## Vérifier la posture de sécurité

Avec le VCN verrouillé (seul l'UDP 41641 est ouvert) et la Gateway liée à loopback, le trafic public est bloqué à la bordure du réseau et l'accès administrateur est limité au tailnet. Cela supprime le besoin de plusieurs étapes traditionnelles de durcissement VPS :

| Étape traditionnelle                    | Nécessaire ?     | Pourquoi                                                                               |
| --------------------------------------- | ---------------- | -------------------------------------------------------------------------------------- |
| Pare-feu UFW                            | Non              | Le VCN bloque le trafic avant qu'il n'atteigne l'instance.                             |
| fail2ban                                | Non              | Le port 22 est bloqué au niveau du VCN ; aucune surface d'attaque par force brute.     |
| Durcissement sshd                       | Non              | Le SSH Tailscale n'utilise pas sshd.                                                   |
| Désactiver la connexion root            | Non              | Tailscale s'authentifie via l'identité du tailnet, et non les utilisateurs système.    |
| Authentification par clé SSH uniquement | Non              | Identique — l'identité du tailnet remplace les clés SSH système.                       |
| Durcissement IPv6                       | Généralement non | Dépend des paramètres VCN/sous-réseau ; vérifiez ce qui est réellement assigné/exposé. |

Toujours recommandé :

- `chmod 700 ~/.openclaw` pour restreindre les permissions des fichiers d'identification.
- `openclaw security audit`OpenClaw pour une vérification de posture spécifique à OpenClaw.
- `sudo apt update && sudo apt upgrade` réguliers pour les correctifs du système d'exploitation.
- Examinez périodiquement les appareils dans la [console d'administration Tailscale](Tailscalehttps://login.tailscale.com/admin).

Commandes de vérification rapide :

```bash
# Confirm no public ports are listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely once Tailscale SSH is confirmed working
sudo systemctl disable --now ssh
```

## Notes ARM

Le niveau Always Free est basé sur ARM (`aarch64`OpenClaw). La plupart des fonctionnalités d'OpenClaw fonctionnent parfaitement ; un petit nombre de binaires natifs nécessitent des builds ARM :

- Node.js, Telegram, WhatsApp (Baileys) : pur JavaScript, aucun problème.
- La plupart des packages npm avec du code natif : artefacts npm`linux-arm64` pré-construits disponibles.
- Assistants CLI facultatifs (ex: binaires Go/Rust fournis par les compétences) : vérifiez la disponibilité d'une version CLI`aarch64` / `linux-arm64` avant l'installation.

Vérifiez l'architecture avec `uname -m` (doit afficher `aarch64`). Pour les binaires sans build ARM, installez depuis les sources ou ignorez-les.

## Persistance et sauvegardes

L'état d'OpenClaw se trouve sous :

- `~/.openclaw/` — `openclaw.json`, `auth-profiles.json` par agent, état du channel/provider, et données de session.
- `~/.openclaw/workspace/` — l'espace de travail de l'agent (SOUL.md, mémoire, artefacts).

Ces éléments survivent aux redémarrages. Pour créer un instantané portable :

```bash
openclaw backup create
```

## Solution de repli : tunnel SSH

Si Tailscale Serve ne fonctionne pas, utilisez un tunnel SSH depuis votre machine locale :

```bash
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

Ensuite, ouvrez `http://localhost:18789`.

## Dépannage

**La création de l'instance échoue ("Out of capacity")** -- Les instances ARM du niveau gratuit sont très populaires. Essayez un autre domaine de disponibilité ou réessayez aux heures creuses.

**Tailscale ne se connectera pas** -- Exécutez `sudo tailscale up --ssh --hostname=openclaw --reset` pour vous réauthentifier.

**Gateway ne démarrera pas** -- Exécutez `openclaw doctor --non-interactive` et vérifiez les journaux avec `journalctl --user -u openclaw-gateway.service -n 50`.

**Problèmes de binaire ARM** -- La plupart des paquets npm fonctionnent sur ARM64. Pour les binaires natifs, recherchez les versions `linux-arm64` ou `aarch64`. Vérifiez l'architecture avec `uname -m`.

## Étapes suivantes

- [Canaux](/fr/channels) -- connectez Telegram, WhatsApp, Discord, et plus
- [Configuration du Gateway](/fr/gateway/configuration) -- toutes les options de configuration
- [Mise à jour](/fr/install/updating) -- garder OpenClaw à jour

## Connexes

- [Vue d'ensemble de l'installation](/fr/install)
- [GCP](/fr/install/gcp)
- [Hébergement VPS](/fr/vps)
