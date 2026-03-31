---
summary: "OpenClaw sur Oracle Cloud (Always Free ARM)"
read_when:
  - Setting up OpenClaw on Oracle Cloud
  - Looking for low-cost VPS hosting for OpenClaw
  - Want 24/7 OpenClaw on a small server
title: "Oracle Cloud (Plateforme)"
---

# OpenClaw sur Oracle Cloud (OCI)

## Objectif

Exécuter une passerelle OpenClaw persistante sur le niveau ARM **Always Free** d'Oracle Cloud.

Le niveau gratuit d'Oracle peut être un bon choix pour OpenClaw (surtout si vous avez déjà un compte OCI), mais il présente des compromis :

- Architecture ARM (la plupart des choses fonctionnent, mais certains binaires peuvent être uniquement x86)
- La capacité et l'inscription peuvent être capricieuses

## Comparaison des coûts (2026)

| Fournisseur  | Plan            | Spécifications               | Prix/mois | Notes                                 |
| ------------ | --------------- | ---------------------------- | --------- | ------------------------------------- |
| Oracle Cloud | Always Free ARM | jusqu'à 4 OCPU, 24 Go de RAM | 0 $       | ARM, capacité limitée                 |
| Hetzner      | CX22            | 2 vCPU, 4 Go de RAM          | ~ 4 $     | Option payante la moins chère         |
| DigitalOcean | Basic           | 1 vCPU, 1 Go de RAM          | 6 $       | Interface simple, bonne documentation |
| Vultr        | Cloud Compute   | 1 vCPU, 1 Go de RAM          | 6 $       | De nombreux emplacements              |
| Linode       | Nanode          | 1 vCPU, 1 Go de RAM          | 5 $       | Fait désormais partie d'Akamai        |

---

## Prérequis

- Compte Oracle Cloud ([inscription](https://www.oracle.com/cloud/free/)) — consultez le [guide d'inscription communautaire](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd) en cas de problème
- Compte Tailscale (gratuit sur [tailscale.com](https://tailscale.com))
- ~30 minutes

## 1) Créer une instance OCI

1. Connectez-vous à la [Console Oracle Cloud](https://cloud.oracle.com/)
2. Accédez à **Compute → Instances → Create Instance**
3. Configurez :
   - **Nom :** `openclaw`
   - **Image :** Ubuntu 24.04 (aarch64)
   - **Forme (Shape) :** `VM.Standard.A1.Flex` (Ampere ARM)
   - **OCPUs :** 2 (ou jusqu'à 4)
   - **Mémoire :** 12 Go (ou jusqu'à 24 Go)
   - **Volume de démarrage :** 50 Go (jusqu'à 200 Go gratuits)
   - **Clé SSH :** Ajoutez votre clé publique
4. Cliquez sur **Create**
5. Notez l'adresse IP publique

**Conseil :** Si la création de l'instance échoue avec "Out of capacity", essayez un domaine de disponibilité différent ou réessayez plus tard. La capacité du niveau gratuit est limitée.

## 2) Se connecter et mettre à jour

```bash
# Connect via public IP
ssh ubuntu@YOUR_PUBLIC_IP

# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential
```

**Remarque :** `build-essential` est requis pour la compilation ARM de certaines dépendances.

## 3) Configurer l'utilisateur et le nom d'hôte

```bash
# Set hostname
sudo hostnamectl set-hostname openclaw

# Set password for ubuntu user
sudo passwd ubuntu

# Enable lingering (keeps user services running after logout)
sudo loginctl enable-linger ubuntu
```

## 4) Installer Tailscale

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up --ssh --hostname=openclaw
```

Cela active le SSH Tailscale, vous permettant ainsi de vous connecter via `ssh openclaw` depuis n'importe quel appareil de votre tailnet — aucune adresse IP publique n'est nécessaire.

Vérifier :

```bash
tailscale status
```

**Désormais, connectez-vous via Tailscale :** `ssh ubuntu@openclaw` (ou utilisez l'IP Tailscale).

## 5) Installer OpenClaw

```bash
curl -fsSL https://openclaw.ai/install.sh | bash
source ~/.bashrc
```

Lorsqu'on vous demande « How do you want to hatch your bot? », sélectionnez **« Do this later »**.

> Remarque : Si vous rencontrez des problèmes de compilation natifs ARM, commencez par les paquets système (ex. `sudo apt install -y build-essential`) avant d'utiliser Homebrew.

## 6) Configurer Gateway (loopback + auth par token) et activer Tailscale Serve

Utilisez l'authentification par token par défaut. Elle est prévisible et évite d'avoir besoin de drapeaux « insecure auth » dans l'interface de contrôle.

```bash
# Keep the Gateway private on the VM
openclaw config set gateway.bind loopback

# Require auth for the Gateway + Control UI
openclaw config set gateway.auth.mode token
openclaw doctor --generate-gateway-token

# Expose over Tailscale Serve (HTTPS + tailnet access)
openclaw config set gateway.tailscale.mode serve
openclaw config set gateway.trustedProxies '["127.0.0.1"]'

systemctl --user restart openclaw-gateway
```

## 7) Vérifier

```bash
# Check version
openclaw --version

# Check daemon status
systemctl --user status openclaw-gateway

# Check Tailscale Serve
tailscale serve status

# Test local response
curl http://localhost:18789
```

## 8) Verrouiller la sécurité du VCN

Maintenant que tout fonctionne, verrouillez le VCN pour bloquer tout le trafic sauf Tailscale. Le réseau cloud virtuel (VCN) d'OCI agit comme un pare-feu à la périphérie du réseau — le trafic est bloqué avant d'atteindre votre instance.

1. Allez dans **Networking → Virtual Cloud Networks** dans la console OCI
2. Cliquez sur votre VCN → **Security Lists** → Default Security List
3. **Supprimez** toutes les règles d'ingress sauf :
   - `0.0.0.0/0 UDP 41641` (Tailscale)
4. Conservez les règles d'egress par défaut (autoriser tout le trafic sortant)

Cela bloque le SSH sur le port 22, HTTP, HTTPS et tout autre chose à la périphérie du réseau. Désormais, vous ne pouvez vous connecter que via Tailscale.

---

## Accéder à l'interface de contrôle

Depuis n'importe quel appareil sur votre réseau Tailscale :

```
https://openclaw.<tailnet-name>.ts.net/
```

Remplacez `<tailnet-name>` par le nom de votre tailnet (visible dans `tailscale status`).

Aucun tunnel SSH nécessaire. Tailscale fournit :

- Chiffrement HTTPS (certificats automatiques)
- Authentification via l'identité Tailscale
- Accès depuis n'importe quel appareil de votre tailnet (ordinateur portable, téléphone, etc.)

---

## Sécurité : VCN + Tailscale (ligne de base recommandée)

Avec le VCN verrouillé (seul le port UDP 41641 ouvert) et le Gateway lié au loopback, vous bénéficiez d'une défense en profondeur robuste : le trafic public est bloqué à la périphérie du réseau et l'accès administrateur s'effectue via votre tailnet.

Cette configuration élimine souvent le _besoin_ de règles de pare-feu basées sur l'hôte supplémentaires uniquement pour arrêter les attaques par force brute SSH sur tout Internet — mais vous devez quand même garder le système à jour, exécuter `openclaw security audit`, et vérifier que vous n'écoutez pas accidentellement sur des interfaces publiques.

### Already protected

| Étape traditionnelle                    | Nécessaire ?       | Pourquoi                                                                                 |
| --------------------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| Pare-feu UFW                            | Non                | Le VCN bloque avant que le trafic n'atteigne l'instance                                  |
| fail2ban                                | Non                | Pas de force brute si le port 22 est bloqué au niveau du VCN                             |
| Durcissement sshd                       | Non                | Le SSH Tailscale n'utilise pas sshd                                                      |
| Désactiver la connexion root            | Non                | Tailscale utilise l'identité Tailscale, pas les utilisateurs système                     |
| Authentification par clé SSH uniquement | Non                | Tailscale s'authentifie via votre tailnet                                                |
| Durcissement IPv6                       | Habituellement non | Dépend de vos paramètres VCN/sous-réseau ; vérifiez ce qui est réellement assigné/exposé |

### Toujours recommandé

- **Autorisations des informations d'identification :** `chmod 700 ~/.openclaw`
- **Audit de sécurité :** `openclaw security audit`
- **Mises à jour système :** `sudo apt update && sudo apt upgrade` régulièrement
- **Surveiller Tailscale :** Consultez les appareils dans la [console d'administration Tailscale](https://login.tailscale.com/admin)

### Vérifier la posture de sécurité

```bash
# Confirm no public ports listening
sudo ss -tlnp | grep -v '127.0.0.1\|::1'

# Verify Tailscale SSH is active
tailscale status | grep -q 'offers: ssh' && echo "Tailscale SSH active"

# Optional: disable sshd entirely
sudo systemctl disable --now ssh
```

---

## Solution de secours : Tunnel SSH

Si Tailscale Serve ne fonctionne pas, utilisez un tunnel SSH :

```bash
# From your local machine (via Tailscale)
ssh -L 18789:127.0.0.1:18789 ubuntu@openclaw
```

Ensuite, ouvrez `http://localhost:18789`.

---

## Dépannage

### Échec de la création de l'instance ("Out of capacity")

Les instances ARM de niveau gratuit sont populaires. Essayez :

- Un domaine de disponibilité différent
- Réessayez hors des heures de pointe (tôt le matin)
- Utilisez le filtre "Always Free" lors de la sélection de la forme

### Tailscale ne se connectera pas

```bash
# Check status
sudo tailscale status

# Re-authenticate
sudo tailscale up --ssh --hostname=openclaw --reset
```

### Gateway ne démarrera pas

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl --user -u openclaw-gateway -n 50
```

### Impossible d'atteindre l'interface de contrôle

```bash
# Verify Tailscale Serve is running
tailscale serve status

# Check gateway is listening
curl http://localhost:18789

# Restart if needed
systemctl --user restart openclaw-gateway
```

### Problèmes de binaire ARM

Certains outils n'ont peut-être pas de versions ARM. Vérifiez :

```bash
uname -m  # Should show aarch64
```

La plupart des paquets npm fonctionnent bien. Pour les binaires, recherchez les versions `linux-arm64` ou `aarch64`.

---

## Persistance

Tout l'état réside dans :

- `~/.openclaw/` — config, informations d'identification, données de session
- `~/.openclaw/workspace/` — espace de travail (SOUL.md, mémoire, artefacts)

Sauvegardez périodiquement :

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Voir aussi

- [Accès distant Gateway](/en/gateway/remote) — autres modèles d'accès distant
- [intégration Tailscale](/en/gateway/tailscale) — documentation complète Tailscale
- [configuration Gateway](/en/gateway/configuration) — toutes les options de configuration
- [guide DigitalOcean](/en/platforms/digitalocean) — si vous souhaitez une solution payante + inscription plus facile
- [guide Hetzner](/en/install/hetzner) — alternative basée sur Docker
