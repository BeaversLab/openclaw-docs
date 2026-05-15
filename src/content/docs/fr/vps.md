---
summary: "Exécuter OpenClaw sur un serveur Linux ou un VPS cloud — choix du provider, architecture et réglage"
read_when:
  - You want to run the Gateway on a Linux server or cloud VPS
  - You need a quick map of hosting guides
  - You want generic Linux server tuning for OpenClaw
title: "Serveur Linux"
sidebarTitle: "Linux Server"
---

Exécutez la passerelle OpenClaw sur n'importe quel serveur Linux ou VPS cloud. Cette page vous aide à choisir un provider, explique comment fonctionnent les déploiements cloud et couvre le réglage générique de Linux qui s'applique partout.

## Choisir un provider

<CardGroup cols={2}>
  <Card title="Railway" href="/fr/install/railway">
    Configuration en un clic via le navigateur
  </Card>
  <Card title="Northflank" href="/fr/install/northflank">
    Configuration en un clic via le navigateur
  </Card>
  <Card title="DigitalOcean" href="/fr/install/digitalocean">
    VPS payant simple
  </Card>
  <Card title="Oracle Cloud" href="/fr/install/oracle">
    Offre ARM Always Free
  </Card>
  <Card title="Fly.io" href="/fr/install/fly">
    Fly Machines
  </Card>
  <Card title="Hetzner" href="/fr/install/hetzner">
    Docker sur VPS Hetzner
  </Card>
  <Card title="Hostinger" href="/fr/install/hostinger">
    VPS avec configuration en un clic
  </Card>
  <Card title="GCP" href="/fr/install/gcp">
    Compute Engine
  </Card>
  <Card title="Azure" href="/fr/install/azure">
    VM Linux
  </Card>
  <Card title="exe.dev" href="/fr/install/exe-dev">
    VM avec proxy HTTPS
  </Card>
  <Card title="Raspberry Pi" href="/fr/install/raspberry-pi">
    ARM auto-hébergé
  </Card>
</CardGroup>

**AWS (EC2 / Lightsail / free tier)** fonctionne également très bien.
Une visite guidée vidéo communautaire est disponible sur
[x.com/techfrenAJ/status/2014934471095812547](https://x.com/techfrenAJ/status/2014934471095812547)
(ressource communautaire -- risque de devenir indisponible).

## How cloud setups work

- Le **Gateway tourne sur le VPS** et possède l'état + l'espace de travail.
- Vous vous connectez depuis votre ordinateur portable ou téléphone via l'**interface de contrôle (Control UI)** ou **Tailscale/SSH**.
- Considérez le VPS comme la source de vérité et **sauvegardez** régulièrement l'état + l'espace de travail.
- Par défaut sécurisé : gardez la passerelle sur le bouclage (loopback) et accédez-y via un tunnel SSH ou Tailscale Serve.
  Si vous effectuez une liaison (bind) sur `lan` ou `tailnet`, exigez `gateway.auth.token` ou `gateway.auth.password`.

Pages connexes : [Accès distant Gateway](/fr/gateway/remote), [Centre plateformes](/fr/platforms).

## Sécuriser d'abord l'accès administrateur

Avant d'installer OpenClaw sur un VPS public, décidez de la manière dont vous souhaitez administrer
la machine elle-même.

- Si vous souhaitez un accès administrateur uniquement via Tailnet, installez d'abord Tailscale, rejoignez le VPS
  à votre tailnet, vérifiez une seconde session SSH via l'IP Tailscale ou
  le nom MagicDNS, puis restreignez l'accès SSH public.
- Si vous n'utilisez pas Tailscale, appliquez le durcissement équivalent pour votre
  chemin SSH avant d'exposer d'autres services.
- Ceci est distinct de l'accès Gateway. Vous pouvez toujours garder OpenClaw lié
  au loopback et utiliser un tunnel SSH ou Tailscale Serve pour le tableau de bord.

Les options spécifiques à Tailscale pour le Gateway se trouvent dans [Tailscale](/fr/gateway/tailscale).

## Agent d'entreprise partagé sur un VPS

L'exécution d'un seul agent pour une équipe est une configuration valide lorsque chaque utilisateur se trouve dans la même limite de confiance et que l'agent est uniquement à usage professionnel.

- Gardez-le sur un runtime dédié (VPS/VM/conteneur + utilisateur/comptes OS dédiés).
- Ne connectez pas ce runtime à des comptes personnels Apple/Google ou à des profils personnels de navigateur/gestionnaire de mots de passe.
- Si les utilisateurs sont adversaires les uns envers les autres, séparez-les par passerelle/hôte/utilisateur OS.

Détails du modèle de sécurité : [Sécurité](/fr/gateway/security).

## Utilisation des nœuds avec un VPS

Vous pouvez conserver le Gateway dans le cloud et associer des **nœuds** sur vos appareils locaux
(Mac/iOS/Android/headless). Les nœuds fournissent des capacités d'écran/caméra/canvas local et `system.run`
tandis que le Gateway reste dans le cloud.

Documentation : [Nœuds](/fr/nodes), [CLI des nœuds](/fr/cli/nodes).

## Réglages de démarrage pour les petits VM et hôtes ARM

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
- La première exécution de la commande réchauffe le cache ; les exécutions suivantes sont plus rapides.
- Pour les spécificités du Raspberry Pi, voir [Raspberry Pi](/fr/install/raspberry-pi).

### Liste de contrôle pour le réglage systemd (optionnel)

Pour les hôtes VM utilisant `systemd`, considérez :

- Ajoutez une variable d'environnement de service pour un chemin de démarrage stable :
  - `OPENCLAW_NO_RESPAWN=1`
  - `NODE_COMPILE_CACHE=/var/tmp/openclaw-compile-cache`
- Gardez le comportement de redémarrage explicite :
  - `Restart=always`
  - `RestartSec=2`
  - `TimeoutStartSec=90`
- Privilégiez les disques sauvegardés par SSD pour les chemins d'état/de cache afin de réduire les pénalités de démarrage à froid liées aux E/S aléatoires.

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
[systemd peut automatiser la récupération de service](https://www.redhat.com/en/blog/systemd-automate-recovery).

Pour le comportement OOM Linux, la sélection des processus enfants victimes et les diagnostics `exit 137`,
voir [Linux memory pressure and OOM kills](/fr/platforms/linux#memory-pressure-and-oom-kills).

## Connexes

- [Aperçu de l'installation](/fr/install)
- [DigitalOcean](/fr/install/digitalocean)
- [Fly.io](/fr/install/fly)
- [Hetzner](/fr/install/hetzner)
