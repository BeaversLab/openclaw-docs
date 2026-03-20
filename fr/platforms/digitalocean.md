---
summary: "OpenClaw sur DigitalOcean (option VPS payante simple)"
read_when:
  - Configuration d'OpenClaw sur DigitalOcean
  - Recherche d'un hébergement VPS pas cher pour OpenClaw
title: "DigitalOcean"
---

# OpenClaw sur DigitalOcean

## Objectif

Faire tourner une OpenClaw Gateway persistante sur DigitalOcean pour **6 $/mois** (ou 4 $/mois avec tarification réservée).

Si vous souhaitez une option à 0 $/mois et ne craignez pas ARM + une configuration spécifique au fournisseur, consultez le [guide Oracle Cloud](/fr/platforms/oracle).

## Comparaison des coûts (2026)

| Fournisseur     | Plan            | Spécifications                  | Prix/mois    | Notes                                 |
| ------------ | --------------- | ---------------------- | ----------- | ------------------------------------- |
| Oracle Cloud | Always Free ARM | jusqu'à 4 OCPU, 24 Go de RAM | 0 $          | ARM, capacité limitée / bizarreries d'inscription |
| Hetzner      | CX22            | 2 vCPU, 4 Go de RAM        | 3,79 € (~4 $) | Option payante la moins chère                  |
| DigitalOcean | Basic           | 1 vCPU, 1 Go de RAM        | 6 $          | Interface facile, bonne documentation                    |
| Vultr        | Cloud Compute   | 1 vCPU, 1 Go de RAM        | 6 $          | De nombreux emplacements                        |
| Linode       | Nanode          | 1 vCPU, 1 Go de RAM        | 5 $          | Fait désormais partie d'Akamai                    |

**Choisir un fournisseur :**

- DigitalOcean : UX la plus simple + configuration prévisible (ce guide)
- Hetzner : bon rapport qualité/prix (voir le [guide Hetzner](/fr/install/hetzner))
- Oracle Cloud : peut être gratuit ($0/mois), mais est plus capricieux et uniquement ARM (voir le [guide Oracle](/fr/platforms/oracle))

---

## Prérequis

- Compte DigitalOcean ([inscription avec 200$ de crédit gratuit](https://m.do.co/c/signup))
- Paire de clés SSH (ou volonté d'utiliser l'authentification par mot de passe)
- ~20 minutes

## 1) Créer un Droplet

<Warning>
Utilisez une image de base propre (Ubuntu 24.04 LTS). Évitez les images en 1 clic du Marketplace tiers, sauf si vous avez examiné leurs scripts de démarrage et les paramètres par défaut du pare-feu.
</Warning>

1. Connectez-vous à [DigitalOcean](https://cloud.digitalocean.com/)
2. Cliquez sur **Create → Droplets**
3. Choisissez :
   - **Région :** La plus proche de chez vous (ou de vos utilisateurs)
   - **Image :** Ubuntu 24.04 LTS
   - **Taille :** Basic → Regular → **$6/mois** (1 vCPU, 1Go RAM, 25Go SSD)
   - **Authentification :** clé SSH (recommandée) ou mot de passe
4. Cliquez sur **Create Droplet**
5. Notez l'adresse IP

## 2) Connectez-vous via SSH

```bash
ssh root@YOUR_DROPLET_IP
```

## 3) Installez OpenClaw

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

## 4) Lancez l'intégration

```bash
openclaw onboard --install-daemon
```

L'assistant vous guidera à travers :

- Authentification du modèle (clés API ou OAuth)
- Configuration des canaux (Telegram, WhatsApp, Discord, etc.)
- Jeton Gateway (généré automatiquement)
- Installation du démon (systemd)

## 5) Vérifiez la Gateway

```bash
# Check status
openclaw status

# Check service
systemctl --user status openclaw-gateway.service

# View logs
journalctl --user -u openclaw-gateway.service -f
```

## 6) Accédez au tableau de bord

La passerelle se lie à la boucle locale par défaut. Pour accéder à l'interface de contrôle :

**Option A : Tunnel SSH (recommandé)**

```bash
# From your local machine
ssh -L 18789:localhost:18789 root@YOUR_DROPLET_IP

# Then open: http://localhost:18789
```

**Option B : Tailscale Serve (HTTPS, boucle locale uniquement)**

```bash
# On the droplet
curl -fsSL https://tailscale.com/install.sh | sh
tailscale up

# Configure Gateway to use Tailscale Serve
openclaw config set gateway.tailscale.mode serve
openclaw gateway restart
```

Ouvrez : `https://<magicdns>/`

Remarques :

- Keep maintient la Gateway en boucle locale uniquement et authentifie le trafic de l'interface de contrôle/WebSocket via les en-têtes d'identité Tailscale (l'authentification sans jeton suppose un hôte de passerelle de confiance ; les API HTTP nécessitent toujours un jeton/mot de passe).
- Pour exiger un jeton/mot de passe à la place, définissez `gateway.auth.allowTailscale: false` ou utilisez `gateway.auth.mode: "password"`.

**Option C : Tailnet bind (sans Serve)**

```bash
openclaw config set gateway.bind tailnet
openclaw gateway restart
```

Ouvrir : `http://<tailscale-ip>:18789` (jeton requis).

## 7) Connectez vos canaux

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

Le droplet à 6 $ n'a que 1 Go de RAM. Pour garder le système fluide :

### Ajouter du swap (recommandé)

```bash
fallocate -l 2G /swapfile
chmod 600 /swapfile
mkswap /swapfile
swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

### Utiliser un model plus léger

Si vous rencontrez des erreurs OOM, envisagez :

- Utiliser des models basés sur une API (Claude, GPT) au lieu de models locaux
- Définir `agents.defaults.model.primary` sur un model plus petit

### Surveiller la mémoire

```bash
free -h
htop
```

---

## Persistance

Tout l'état réside dans :

- `~/.openclaw/` — configuration, identifiants, données de session
- `~/.openclaw/workspace/` — espace de travail (SOUL.md, mémoire, etc.)

Ceci survive aux redémarrages. Sauvegardez-les périodiquement :

```bash
tar -czvf openclaw-backup.tar.gz ~/.openclaw ~/.openclaw/workspace
```

---

## Alternative gratuite Oracle Cloud

Oracle Cloud propose des instances ARM **Always Free** (toujours gratuites) significativement plus puissantes que n'importe quelle option payante ici — pour 0 $/mois.

| Ce que vous obtenez      | Spécifications                  |
| ----------------- | ---------------------- |
| **4 OCPUs**       | ARM Ampere A1          |
| **24 Go de RAM**      | Plus que suffisant       |
| **200 Go de stockage** | Volume de blocs           |
| **Gratuit pour toujours**  | Aucuns frais de carte de crédit |

**Mises en garde :**

- L'inscription peut être capricieuse (réessayez en cas d'échec)
- Architecture ARM — la plupart des choses fonctionnent, mais certains binaires nécessitent des versions ARM

Pour le guide d'installation complet, consultez Oracle Cloud](/fr/platforms/oracle). Pour des conseils d'inscription et la résolution des problèmes lors du processus d'inscription, consultez ce guide communautaire](https://gist.github.com/rssnyder/51e3cfedd730e7dd5f4a816143b25dbd).

---

## Dépannage

### Gateway ne démarre pas

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

### Manque de mémoire

```bash
# Check memory
free -h

# Add more swap
# Or upgrade to $12/mo droplet (2GB RAM)
```

---

## Voir aussi

- Hetzner guide](/fr/install/hetzner) — moins cher, plus puissant
- Docker install](/fr/install/docker) — installation conteneurisée
- Tailscale](/fr/gateway/tailscale) — accès à distance sécurisé
- Configuration](/fr/gateway/configuration) — référence complète de la configuration

import en from "/components/footer/en.mdx";

<en />
