---
summary: "Exécuter le OpenClaw Gateway sur EasyRunner avec Podman et Caddy"
read_when:
  - Deploying OpenClaw on EasyRunner
  - Running the Gateway behind EasyRunner's Caddy proxy
  - Choosing persistent volumes and auth for a hosted Gateway
title: "EasyRunner"
---

EasyRunner peut héberger le OpenClaw Gateway en tant que petite application conteneurisée derrière
son proxy Caddy. Ce guide suppose un hôte EasyRunner qui exécute des applications
Compose compatibles avec Podman et expose le HTTPS via Caddy.

## Avant de commencer

- Un serveur EasyRunner avec un domaine acheminé vers celui-ci.
- Une image conteneur OpenClaw construite ou publiée.
- Un volume de configuration persistant pour `/home/node/.openclaw`.
- Un volume d'espace de travail persistant pour `/workspace`.
- Un jeton ou un mot de passe fort pour le Gateway.

Gardez l'authentification de l'appareil activée si possible. Si votre déploiement de proxy inverse ne peut pas
transporter correctement l'identité de l'appareil, corrigez d'abord les paramètres de proxy de confiance (trusted-proxy) ; n'utilisez des
contournements d'authentification dangereux que pour un réseau entièrement privé et contrôlé par un opérateur.

## Application Compose

Créez une application EasyRunner avec un fichier Compose structuré comme suit :

```yaml
services:
  openclaw:
    image: ghcr.io/openclaw/openclaw:latest
    restart: unless-stopped
    environment:
      OPENCLAW_GATEWAY_TOKEN: ${OPENCLAW_GATEWAY_TOKEN}
      OPENCLAW_HOME: /home/node
      OPENCLAW_STATE_DIR: /home/node/.openclaw
      OPENCLAW_CONFIG_PATH: /home/node/.openclaw/openclaw.json
      OPENCLAW_WORKSPACE_DIR: /workspace
    volumes:
      - openclaw-config:/home/node/.openclaw
      - openclaw-workspace:/workspace
    labels:
      caddy: openclaw.example.com
      caddy.reverse_proxy: "{{upstreams 1455}}"
    command: ["openclaw", "gateway", "--bind", "lan", "--port", "1455"]

volumes:
  openclaw-config:
  openclaw-workspace:
```

Remplacez `openclaw.example.com` par le nom d'hôte de votre Gateway. Stockez
`OPENCLAW_GATEWAY_TOKEN` dans le gestionnaire de secrets/environnement d'EasyRunner au lieu de
le commiter dans la définition de l'application.

## Configurer OpenClaw

Dans le volume de configuration persistant, assurez-vous que le Gateway n'est accessible qu'à travers
le proxy et exige une authentification :

```json5
{
  gateway: {
    bind: "lan",
    port: 1455,
    auth: {
      token: "${OPENCLAW_GATEWAY_TOKEN}",
    },
  },
}
```

Si Caddy termine le TLS pour le Gateway, configurez les paramètres de proxy de confiance pour
le chemin exact du proxy plutôt que de désactiver globalement les vérifications d'authentification. Voir
[Authentification par proxy de confiance](/fr/gateway/trusted-proxy-auth).

## Vérifier

Depuis votre poste de travail :

```bash
openclaw gateway probe --url https://openclaw.example.com --token <token>
openclaw gateway status --url https://openclaw.example.com --token <token>
```

Depuis l'hôte EasyRunner, vérifiez les journaux de l'application pour un Gateway à l'écoute et aucune
erreur de démarrage SecretRef, de plugin ou d'authentification de canal.

## Mises à jour et sauvegardes

- Tirez ou construisez la nouvelle image OpenClaw, puis redéployez l'application EasyRunner.
- Sauvegardez le volume `openclaw-config` avant les mises à jour.
- Sauvegardez `openclaw-workspace` si les agents y écrivent des données de projet durables.
- Exécutez `openclaw doctor` après les mises à jour majeures pour détecter les migrations de configuration et
  les avertissements de service.

## Dépannage

- `gateway probe` ne peut pas se connecter : vérifiez que le nom d'hôte Caddy pointe vers l'application
  et que le conteneur écoute sur `0.0.0.0:1455`.
- Échec de l'authentification : faites tourner le jeton dans les secrets d'EasyRunner et la commande client locale
  ensemble.
- Les fichiers appartiennent à root après la restauration : réparez les volumes montés pour que
  l'utilisateur du conteneur puisse écrire `/home/node/.openclaw` et `/workspace`.
- Échec des plugins du navigateur ou du channel : vérifiez si les binaires externes requis,
  la sortie réseau et les identifiants montés sont disponibles à l'intérieur du
  conteneur.
