---
summary: "OpenClaw sur DigitalOcean (option VPS payante simple)"
read_when:
  - Setting up OpenClaw on DigitalOcean
  - Looking for cheap VPS hosting for OpenClaw
title: "DigitalOcean"
---

# OpenClaw sur DigitalOcean

## Objectif

Exécuter un OpenClaw Gateway persistant sur DigitalOcean pour **6 $/mois** (ou 4 $/mois avec tarification réservée).

Si vous souhaitez une option à 0 $/mois et que vous ne craignez pas ARM + une configuration spécifique au fournisseur, consultez le [guide Oracle Cloud](/fr/platforms/oracle).

## Comparaison des coûts (2026)

| Fournisseur  | Plan            | Spécifications               | Prix/mois     | Notes                                                |
| ------------ | --------------- | ---------------------------- | ------------- | ---------------------------------------------------- |
| Oracle Cloud | Always Free ARM | jusqu'à 4 OCPU, 24 Go de RAM | 0 $           | ARM, capacité limitée / particularités d'inscription |
| Hetzner      | CX22            | 2 vCPU, 4 Go de RAM          | 3,79 € (~4 $) | Option payante la moins chère                        |
| DigitalOcean | Basic           | 1 vCPU, 1 Go de RAM          | 6 $           | Interface simple, bonne documentation                |
| Vultr        | Cloud Compute   | 1 vCPU, 1 Go de RAM          | 6 $           | De nombreux emplacements                             |
| Linode       | Nanode          | 1 vCPU, 1 Go de RAM          | 5 $           | Désormais partie d'Akamai                            |

**Choisir un fournisseur :**

- DigitalOcean : interface UX la plus simple + configuration prévisible (ce guide)
- Hetzner : excellent rapport qualité/prix (voir le [guide Hetzner](/fr/install/hetzner))
- Oracle Cloud : peut être gratuit (0 $/mois), mais est plus capricieux et uniquement ARM (voir le [guide Oracle](/fr/platforms/oracle))

---

## Prérequis

- Compte DigitalOcean ([inscription avec 200 $ de crédit gratuit](https://m.do.co/c/signup))
- Paire de clés SSH (ou volonté d'utiliser l'authentification par mot de passe)
- ~20 minutes

## 1) Créer un Droplet

<Warning>
  Utilisez une image de base propre (Ubuntu 24.04 LTS). Évitez les images en un clic tiers du
  Marketplace, sauf si vous avez examiné leurs scripts de démarrage et les paramètres par défaut du
  pare-feu.
</Warning>

1. Connectez-vous à [DigitalOcean](https://cloud.digitalocean.com/)
2. Cliquez sur **Create → Droplets**
3. Choisissez :
   - **Region :** La plus proche de chez vous (ou de vos utilisateurs)
   - **Image :** Ubuntu 24.04 LTS
   - **Size :** Basic → Regular → **6 $/mois** (1 vCPU, 1 Go de RAM, 25 Go SSD)
   - **Authentication :** Clé SSH (recommandé) ou mot de passe
4. Cliquez sur **Create Droplet**
5. Notez l'adresse IP

## 2) Connectez-vous via SSH

```bash
ssh root@YOUR_DROPLET_IP
```

## 3) Installer OpenClaw

```bash
# Update system
apt update && apt upgrade -y

# Install Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt install -y nodejs

# Install OpenClaw
curl -fsSL https://openclaw.ai/install.sh | bash

# Verify
openclaw --version
```

## 4) Exécuter l'intégration (Onboarding)

```bash
openclaw onboard --install-daemon
```

L'assistant vous guidera à travers :

- Authentification du modèle (clés API ou OAuth)
- Configuration des canaux (Telegram, WhatsApp, Discord, etc.)
- Jeton Gateway (généré automatiquement)
- Installation du démon (systemd)

## 5) Vérifier le Gateway

```bash
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f
```

## 6) Accéder au Tableau de bord

Le gateway se lie à loopback par défaut. Pour accéder à l'interface de contrôle :

**Option A : Tunnel SSH (recommandé)**

```bash
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789
```

**Option B : Tailscale Serve (HTTPS, loopback uniquement)**

```bash
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

Ouvrir : `https://<magicdns>/`

Notes :

- Serve maintient le Gateway en loopback uniquement et authentifie le trafic de l'interface de contrôle/WebSocket via les en-têtes d'identité Tailscale (l'authentification sans jeton suppose un hôte de gateway fiable ; les API HTTP nécessitent toujours un jeton/mot de passe).
- Pour exiger un jeton/mot de passe à la place, définissez `gateway.auth.allowTailscale: false` ou utilisez `gateway.auth.mode: "password"`.

**Option C : Liaison Tailnet (pas de Serve)**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

Ouvrir : `http://<tailscale-ip>:18789` (jeton requis).

## 7) Connecter vos canaux

### Telegram

```bash
openclaw pairing list telegram
openclaw pairing approve telegram <CODE>
```

### WhatsApp

```bash
openclaw channels login whatsapp
# Scan QR code
```

Voir [Canaux](/fr/channels) pour les autres fournisseurs.

---

## Optimisations pour 1 Go de RAM

Le droplet à 6 $ n'a que 1 Go de RAM. Pour garder les choses fluides :

### Ajouter du swap (recommandé)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Utiliser un modèle plus léger

Si vous rencontrez des erreurs OOM, envisagez :

- Utiliser des modèles basés sur l'API (Claude, GPT) au lieu de modèles locaux
- Définir `agents.defaults.model.primary` sur un modèle plus petit

### Surveiller la mémoire

```bash
free -h
htop
```

---

## Persistance

Tout l'état se trouve dans :

- `~/.openclaw/` — configuration, identifiants, données de session
- `~/.openclaw/workspace/` — espace de travail (SOUL.md, mémoire, etc.)

Ces éléments survivent aux redémarrages. Sauvegardez-les périodiquement :

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Alternative gratuite Oracle Cloud

Oracle Cloud propose des instances ARM **Always Free** (toujours gratuites) qui sont significativement plus puissantes que toute option payante ici — pour 0 $/mois.

| Ce que vous obtenez       | Spécifications                  |
| ------------------------- | ------------------------------- |
| **4 OCPU**                | ARM Ampere A1                   |
| **24 Go de RAM**          | Plus que suffisant              |
| **200 Go de stockage**    | Volume de blocs                 |
| **Gratuit pour toujours** | Aucune frais de carte de crédit |

**Mises en garde :**

- L'inscription peut être capricieuse (réessayez en cas d'échec)
- Architecture ARM — la plupart des choses fonctionnent, mais certains binaires nécessitent des versions ARM

Pour le guide de configuration complet, voir [Oracle Cloud](/fr/platforms/oracle). Pour des conseils d'inscription et le dépannage du processus d'inscription, voir ce [guide communautaire](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd).

---

## Dépannage

### Gateway ne démarrera pas

```bash
openclaw gateway status
openclaw doctor --non-interactive
journalctl -u openclaw --no-pager -n 50
```

### Port déjà utilisé

```bash
lsof -i :18789
kill <PID>
```

### Mémoire insuffisante

```bash
# Check memory
free -h

# Add more swap
# Or upgrade to $12/mo droplet (2GB RAM)
```

---

## Voir aussi

- [Guide Hetzner](/fr/install/hetzner) — moins cher, plus puissant
- [Installation de Docker](/fr/install/docker) — configuration conteneurisée
- [Tailscale](/fr/gateway/tailscale) — accès distant sécurisé
- [Configuration](/fr/gateway/configuration) — référence complète de la configuration

import fr from "/components/footer/fr.mdx";

<fr />
