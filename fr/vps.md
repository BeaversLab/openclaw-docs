---
summary: "Hub d'hébergement VPS pour OpenClaw (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - You want to run the Gateway in the cloud
  - You need a quick map of VPS/hosting guides
title: "Hébergement VPS"
---

# Hébergement VPS

Ce hub pointe vers les guides d'hébergement VPS pris en charge et explique le fonctionnement des déploiements cloud dans les grandes lignes.

## Choisir un provider

- **Railway** (configuration en un clic + navigateur) : [Railway](/fr/install/railway)
- **Northflank** (configuration en un clic + navigateur) : [Northflank](/fr/install/northflank)
- **Oracle Cloud (Always Free)** : [Oracle](/fr/platforms/oracle) — 0 $/mois (Always Free, ARM ; la capacité/l'inscription peuvent être capricieuses)
- **Fly.io** : [Fly.io](/fr/install/fly)
- **Hetzner (Docker)** : [Hetzner](/fr/install/hetzner)
- **GCP (Compute Engine)** : [GCP](/fr/install/gcp)
- **exe.dev** (VM + proxy HTTPS) : [exe.dev](/fr/install/exe-dev)
- **AWS (EC2/Lightsail/free tier)** : fonctionne également très bien. Guide vidéo :
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## Fonctionnement des configurations cloud

- Le **Gateway s'exécute sur le VPS** et gère l'état + l'espace de travail.
- Vous vous connectez depuis votre ordinateur/téléphone via l'**Interface de contrôle** ou **Tailscale/SSH**.
- Considérez le VPS comme la source de vérité et **sauvegardez** l'état + l'espace de travail.
- Sécurité par défaut : gardez le Gateway en loopback et accédez-y via un tunnel SSH ou Tailscale Serve.
  Si vous vous liez à `lan`/`tailnet`, exigez `gateway.auth.token` ou `gateway.auth.password`.

Accès à distance : [Gateway remote](/fr/gateway/remote)  
Hub des plateformes : [Platforms](/fr/platforms)

## Agent partagé d'entreprise sur un VPS

C'est une configuration valide lorsque les utilisateurs se trouvent dans une même limite de confiance (par exemple une équipe d'entreprise) et que l'agent est uniquement destiné à un usage professionnel.

- Gardez-le sur un environnement d'exécution dédié (VPS/VM/conteneur + utilisateur/comptes OS dédiés).
- Ne connectez pas cet environnement d'exécution à des comptes personnels Apple/Google ou à des profils personnels de navigateur/gestionnaire de mots de passe.
- Si les utilisateurs sont antagonistes entre eux, séparez-les par passerelle/hôte/utilisateur OS.

Détails du modèle de sécurité : [Security](/fr/gateway/security)

## Utiliser des nœuds avec un VPS

Vous pouvez conserver la Gateway dans le cloud et jumeler des **nœuds** sur vos appareils locaux
(Mac/iOS/Android/headless). Les nœuds fournissent des capacités d'écran/caméra/canvas locales et `system.run`
tandis que la Gateway reste dans le cloud.

Documentation : [Nodes](/fr/nodes), [Nodes CLI](/fr/cli/nodes)

## Réglages de démarrage pour les petits VM et les hôtes ARM

Si les commandes CLI semblent lentes sur les VM faibles (ou hôtes ARM), activez le cache de compilation des modules de Node :

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` améliore les temps de démarrage des commandes répétées.
- `OPENCLAW_NO_RESPAWN=1` évite la surcharge de démarrage supplémentaire d'un chemin de auto-redémarrage.
- La première exécution de la commande réchauffe le cache ; les exécutions suivantes sont plus rapides.
- Pour les spécificités Raspberry Pi, voir [Raspberry Pi](/fr/platforms/raspberry-pi).

### Liste de contrôle du réglage systemd (facultatif)

Pour les hôtes VM utilisant `systemd`, envisagez :

- Ajoutez une variable d'environnement de service pour un chemin de démarrage stable :
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Gardez le comportement de redémarrage explicite :
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Privilégiez les disques SSD pour les chemins d'état/de cache afin de réduire les pénalités de démarrage à froid liées aux E/S aléatoires.

Exemple :

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

Comment les stratégies `Restart=` aident à la récupération automatisée :
[systemd peut automatiser la récupération de service](https://www.redhat.com/en/blog/systemd-automate-recovery).

import fr from '/components/footer/fr.mdx';

<fr />
