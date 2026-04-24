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
  <Card title="Railway" href="/fr/install/railway">
    Configuration en un clic depuis le navigateur
  </Card>
  <Card title="Northflank" href="/fr/install/northflank">
    Configuration en un clic via le navigateur
  </Card>
  <Card title="DigitalOcean" href="/fr/install/digitalocean">
    Simple VPS payant
  </Card>
  <Card title="Oracle Cloud" href="/fr/install/oracle">
    Niveau ARM Always Free
  </Card>
  <Card title="Fly.io" href="/fr/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/fr/install/hetzner">
    Docker sur un VPS Hetzner
  </Card>
  <Card title="Hostinger" href="/fr/install/hostinger">
    VPS avec configuration en un clic
  </Card>
  <Card title="GCP" href="/fr/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/fr/install/azure">
    Linux VM
  </Card>
  <Card title="exe.dev" href="/fr/install/exe-dev">
    VM avec proxy HTTPS
  </Card>
  <Card title="Raspberry Pi" href="/fr/install/raspberry-pi">
    ARM auto-hébergé
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / free tier)** fonctionne également très bien.
Un guide vidéo communautaire est disponible sur
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(ressource communautaire -- susceptible de devenir indisponible).

## Fonctionnement des configurations cloud

- Le **Gateway s'exécute sur le VPS** et possède l'état + l'espace de travail.
- Vous vous connectez depuis votre ordinateur portable ou votre téléphone via l'**Interface de contrôle** ou **Tailscale/SSH**.
- Traitez le VPS comme source de vérité et **sauvegardez** régulièrement l'état + l'espace de travail.
- Sécurité par défaut : gardez le Gateway en boucle locale (loopback) et accédez-y via un tunnel SSH ou Tailscale Serve.
  Si vous vous liez à `lan` ou `tailnet`, exigez `gateway.auth.token` ou `gateway.auth.password`.

Pages connexes : [Gateway remote access](/fr/gateway/remote), [Platforms hub](/fr/platforms).

## Agent d'entreprise partagé sur un VPS

L'exécution d'un seul agent pour une équipe est une configuration valide lorsque chaque utilisateur se trouve dans la même limite de confiance et que l'agent est réservé à un usage professionnel.

- Gardez-le sur un environnement d'exécution dédié (VPS/VM/conteneur + utilisateur/comptes OS dédiés).
- Ne connectez pas cet environnement d'exécution à des comptes personnels Apple/Google ou à des profils personnels de navigateur/gestionnaire de mots de passe.
- Si les utilisateurs sont antagonistes les uns envers les autres, séparez-les par passerelle/hôte/utilisateur OS.

Détails du modèle de sécurité : [Security](/fr/gateway/security).

## Utilisation des nœuds avec un VPS

Vous pouvez conserver le Gateway dans le cloud et associer des **nœuds** sur vos appareils locaux
(Mac/iOS/Android/sans tête). Les nœuds fournissent des capacités d'écran/camera/canvas locales et `system.run`
tandis que le Gateway reste dans le cloud.

Documentation : [Nodes](/fr/nodes), [Nodes CLI](/fr/cli/nodes).

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
- `OPENCLAW_NO_RESPAWN=1` évite la surcharge de démarrage supplémentaire due à un chemin de redémarrage automatique.
- La première exécution de la commande réchauffe le cache ; les exécutions suivantes sont plus rapides.
- Pour les spécificités du Raspberry Pi, voir [Raspberry Pi](/fr/install/raspberry-pi).

### Liste de contrôle du réglage systemd (facultatif)

Pour les hôtes VM utilisant `systemd`, envisagez :

- Ajoutez une variable d'environnement de service pour un chemin de démarrage stable :
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Gardez le comportement de redémarrage explicite :
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Préférez les disques SSD pour les chemins d'état/de cache afin de réduire les pénalités de démarrage à froid des E/S aléatoires.

Pour le chemin standard `openclaw onboard --install-daemon`, modifiez l'unité utilisateur :

```bash
systemctl --user edit openclaw-gateway.service
```

```ini
[Service]
Environment=OPENCLAW_NO_RESPAWN=1
Environment=NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache
Restart=always
RestartSec=2
TimeoutStartSec=90
```

Si vous avez délibérément installé une unité système à la place, modifiez
`openclaw-gateway.service` via `sudo systemctl edit openclaw-gateway.service`.

Comment les stratégies `Restart=` aident à la récupération automatisée :
[systemd peut automatiser la récupération des services](https://www.redhat.com/en/blog/systemd-automate-recovery).

Pour le comportement OOM de Linux, la sélection des processus enfants victimes et les diagnostics `exit 137`,
voir [Linux memory pressure and OOM kills](/fr/platforms/linux#memory-pressure-and-oom-kills).
