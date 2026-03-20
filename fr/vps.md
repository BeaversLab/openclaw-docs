---
summary: "Centre d'hébergement VPS pour OpenClaw (Oracle/Fly/Hetzner/GCP/exe.dev)"
read_when:
  - Vous souhaitez exécuter la Gateway dans le cloud
  - Vous avez besoin d'une cartographie rapide des guides VPS/hébergement
title: "Hébergement VPS"
---

# Hébergement VPS

Ce centre relie les guides d'hébergement VPS pris en charge et explique le fonctionnement des déploiements dans le cloud à un niveau élevé.

## Choisir un fournisseur

- **Railway** (configuration en un clic + navigateur) : [Railway](/fr/install/railway)
- **Northflank** (configuration en un clic + navigateur) : [Northflank](/fr/install/northflank)
- **Oracle Cloud (Always Free)** : [Oracle](/fr/platforms/oracle) — 0 $/mois (Always Free, ARM ; la capacité/l'inscription peuvent être capricieuses)
- **Fly.io** : [Fly.io](/fr/install/fly)
- **Hetzner (Docker)** : [Hetzner](/fr/install/hetzner)
- **GCP (Compute Engine)** : [GCP](/fr/install/gcp)
- **exe.dev** (VM + proxy HTTPS) : [exe.dev](/fr/install/exe-dev)
- **AWS (EC2/Lightsail/offre gratuite)** : fonctionne également très bien. Guide vidéo :
  [https://x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)

## Fonctionnement des configurations cloud

- La **Gateway s'exécute sur le VPS** et gère l'état + l'espace de travail.
- Vous vous connectez depuis votre ordinateur portable/téléphone via l'**interface de contrôle** ou **Tailscale/SSH**.
- Considérez le VPS comme la source de vérité et **sauvegardez** l'état + l'espace de travail.
- Sécurité par défaut : gardez la Gateway sur le bouclage (loopback) et accédez-y via un tunnel SSH ou Tailscale Serve.
  Si vous vous liez à `lan`/`tailnet`, exigez `gateway.auth.token` ou `gateway.auth.password`.

Accès à distance : [Gateway distant](/fr/gateway/remote)  
Centre des plateformes : [Plateformes](/fr/platforms)

## Agent d'entreprise partagé sur un VPS

Il s'agit d'une configuration valide lorsque les utilisateurs se trouvent dans une même limite de confiance (par exemple, une équipe d'entreprise) et que l'agent est exclusivement professionnel.

- Gardez-le sur un environnement d'exécution dédié (VPS/VM/conteneur + utilisateur OS/comptes dédiés).
- Ne connectez pas cet environnement d'exécution à des comptes personnels Apple/Google ou à des profils personnels de navigateur/gestionnaire de mots de passe.
- Si les utilisateurs sont adversaires les uns envers les autres, séparez-les par passerelle/hôte/utilisateur OS.

Détails du modèle de sécurité : [Sécurité](/fr/gateway/security)

## Utilisation des nœuds avec un VPS

Vous pouvez conserver le Gateway dans le cloud et associer des **nœuds** sur vos appareils locaux
(Mac/iOS/Android/headless). Les nœuds fournissent des capacités d'écran/caméra/canevas local et `system.run`
pendant que le Gateway reste dans le cloud.

Docs : [Nodes](/fr/nodes), [Nodes CLI](/fr/cli/nodes)

## Réglage du démarrage pour les petits VM et les hôtes ARM

Si les commandes CLI semblent lentes sur les VM de faible puissance (ou les hôtes ARM), activez le cache de compilation des modules de Node :

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
- Pour les spécificités du Raspberry Pi, voir [Raspberry Pi](/fr/platforms/raspberry-pi).

### Liste de contrôle du réglage systemd (optionnel)

Pour les hôtes VM utilisant `systemd`, envisagez :

- Ajoutez une variable d'environnement de service pour un chemin de démarrage stable :
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Gardez le comportement de redémarrage explicite :
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Préférez les disques sauvegardés par SSD pour les chemins d'état/de cache afin de réduire les pénalités de démarrage à froid liées aux E/S aléatoires.

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

Comment les politiques `Restart=` aident à la récupération automatisée :
[systemd peut automatiser la récupération de service](https://www.redhat.com/en/blog/systemd-automate-recovery).

import en from "/components/footer/en.mdx";

<en />
