---
summary: "Exécuter OpenClaw sur un serveur Linux ou un VPS cloud — choix du provider, architecture et réglage"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Linux Server"
sidebarTitle: "Linux Server"
---

# Linux Server

Exécutez le OpenClaw Gateway sur n'importe quel serveur Linux ou VPS cloud. Cette page vous aide
à choisir un provider, explique comment fonctionnent les déploiements cloud et couvre le réglage générique Linux
qui s'applique partout.

## Pick a provider

<CardGroup cols={2}>
  <Card title="Railway" href="/en/install/railway">
    Configuration en un clic depuis le navigateur
  </Card>
  <Card title="Northflank" href="/en/install/northflank">
    Configuration en un clic via le navigateur
  </Card>
  <Card title="DigitalOcean" href="/en/install/digitalocean">
    Simple VPS payant
  </Card>
  <Card title="Oracle Cloud" href="/en/install/oracle">
    Niveau ARM Always Free
  </Card>
  <Card title="Fly.io" href="/en/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/en/install/hetzner">
    Docker sur un VPS Hetzner
  </Card>
  <Card title="GCP" href="/en/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/en/install/azure">
    Linux VM
  </Card>
  <Card title="exe.dev" href="/en/install/exe-dev">
    VM avec proxy HTTPS
  </Card>
  <Card title="Raspberry Pi" href="/en/install/raspberry-pi">
    ARM auto-hébergé
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / offre gratuite)** fonctionne également très bien.
Un tutoriel vidéo communautaire est disponible sur
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(ressource communautaire -- risque d'indisponibilité).

## How cloud setups work

- Le **Gateway tourne sur le VPS** et possède l'état + l'espace de travail.
- Vous vous connectez depuis votre ordinateur portable ou téléphone via l'**interface de contrôle (Control UI)** ou **Tailscale/SSH**.
- Considérez le VPS comme la source de vérité et **sauvegardez** régulièrement l'état + l'espace de travail.
- Par défaut sécurisé : gardez le Gateway en boucle locale (loopback) et accédez-y via un tunnel SSH ou Tailscale Serve.
  Si vous vous liez à `lan` ou `tailnet`, exigez `gateway.auth.token` ou `gateway.auth.password`.

Pages connexes : [Gateway accès à distance](/en/gateway/remote), [Hub Plateformes](/en/platforms).

## Agent d'entreprise partagé sur un VPS

Faire fonctionner un seul agent pour une équipe est une configuration valide lorsque chaque utilisateur est dans la même limite de confiance et que l'agent est réservé à un usage professionnel.

- Gardez-le sur un environnement d'exécution dédié (VPS/VM/conteneur + utilisateur système/comptes dédiés).
- Ne connectez pas cet environnement d'exécution à des comptes personnels Apple/Google ou à des profils personnels de navigateur/gestionnaire de mots de passe.
- Si les utilisateurs sont adversaires les uns envers les autres, séparez par passerelle/hôte/utilisateur OS.

Détails du modèle de sécurité : [Sécurité](/en/gateway/security).

## Utilisation des nœuds avec un VPS

Vous pouvez conserver le Gateway dans le cloud et jumeler des **nœuds** sur vos périphériques locaux
(Mac/iOS/Android/sans tête). Les nœuds fournissent des capacités d'écran/caméra/canvas locales et `system.run`
tandis que le Gateway reste dans le cloud.

Documentation : [Nœuds](/en/nodes), [CLI des nœuds](/en/cli/nodes).

## Réglage du démarrage pour les petits VM et hôtes ARM

Si les commandes CLI semblent lentes sur les VM de faible puissance (ou hôtes ARM), activez le cache de compilation des modules de Node :

```bash
grep -q 'NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache' ~/.bashrc || cat >> ~/.bashrc <<'EOF'
export NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
mkdir -p /var/tmp/openclaw-compile-cache
export OPENCLAW_NO_RESPAWN=1
EOF
source ~/.bashrc
```

- `NODE_COMPILE_CACHE` améliore les temps de démarrage des commandes répétées.
- `OPENCLAW_NO_RESPAWN=1` évite la surcharge de démarrage supplémentaire d'un chemin de redémarrage automatique.
- La première exécution de commande réchauffe le cache ; les exécutions suivantes sont plus rapides.
- Pour les spécificités du Raspberry Pi, voir [Raspberry Pi](/en/install/raspberry-pi).

### Liste de contrôle du réglage systemd (facultatif)

Pour les hôtes VM utilisant `systemd`, envisagez :

- Ajoutez des variables d'environnement de service pour un chemin de démarrage stable :
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Gardez le comportement de redémarrage explicite :
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Préférez les disques SSD pour les chemins d'état/cache afin de réduire les pénalités de démarrage à froid liées aux E/S aléatoires.

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
[systemd peut automatiser la récupération des services](https://www.redhat.com/en/blog/systemd-automate-recovery).
