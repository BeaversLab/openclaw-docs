---
summary: "Serve/Funnel Tailscale intégré pour le tableau de bord du Gateway"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

# Tailscale (tableau de bord du Gateway)

OpenClaw peut configurer automatiquement Tailscale **Serve** (tailnet) ou **Funnel** (public) pour le
tableau de bord du Gateway et le port WebSocket. Cela permet de garder le Gateway lié au boucle local (loopback) tandis que
Tailscale fournit le HTTPS, le routage et (pour Serve) les en-têtes d'identité.

## Modes

- `serve` : Serve Tailnet uniquement via `tailscale serve`. La passerelle reste sur `127.0.0.1`.
- `funnel` : HTTPS public via `tailscale funnel`. OpenClaw nécessite un mot de passe partagé.
- `off` : Par défaut (pas d'automatisation Tailscale).

## Auth

Définissez `gateway.auth.mode` pour contrôler la poignée de main :

- `token` (par défaut lorsque `OPENCLAW_GATEWAY_TOKEN` est défini)
- `password` (secret partagé via `OPENCLAW_GATEWAY_PASSWORD` ou config)

Quand `tailscale.mode = "serve"` et `gateway.auth.allowTailscale` sont `true`,
l'authentification de l'interface de contrôle/WebSocket peut utiliser les en-têtes d'identité Tailscale
(`tailscale-user-login`) sans fournir de jeton/mot de passe. OpenClaw vérifie
l'identité en résolvant l'adresse `x-forwarded-for` via le démon local Tailscale
(`tailscale whois`) et en la correspondant à l'en-tête avant de l'accepter.
OpenClaw ne traite une requête comme Serve que lorsqu'elle provient du loopback avec
les en-têtes Tailscale's `x-forwarded-for`, `x-forwarded-proto` et `x-forwarded-host`.
Les points de terminaison de l'API HTTP (par exemple `/v1/*`, `/tools/invoke` et `/api/channels/*`)
requièrent toujours une authentification par jeton/mot de passe.
Ce flux sans jeton suppose que l'hôte de la passerelle est fiable. Si du code local non fiable
peut s'exécuter sur le même hôte, désactivez `gateway.auth.allowTailscale` et exigez
plutôt une authentification par jeton/mot de passe.
Pour exiger des informations d'identification explicites, définissez `gateway.auth.allowTailscale: false` ou
forcez `gateway.auth.mode: "password"`.

## Exemples de configuration

### Tailnet uniquement (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Ouvrir : `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

### Tailnet uniquement (lier à l'IP Tailnet)

Utilisez ceci lorsque vous voulez que le Gateway écoute directement sur l'IP Tailnet (pas de Serve/Funnel).

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

Connectez-vous depuis un autre appareil Tailnet :

- Interface de contrôle : `http://<tailscale-ip>:18789/`
- WebSocket : `ws://<tailscale-ip>:18789`

Remarque : le loopback (`http://127.0.0.1:18789`) ne fonctionnera **pas** dans ce mode.

### Internet public (Funnel + mot de passe partagé)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password", password: "replace-me" },
  },
}
```

Privilégiez `OPENCLAW_GATEWAY_PASSWORD` par rapport à l'engagement d'un mot de passe sur le disque.

## Exemples CLI

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## Notes

- Tailscale Serve/Funnel nécessite que la `tailscale` CLI soit installée et connectée.
- `tailscale.mode: "funnel"` refuse de démarrer sauf si le mode d'authentification est `password` pour éviter une exposition publique.
- Définissez `gateway.tailscale.resetOnExit` si vous souhaitez qu'OpenClaw annule la configuration `tailscale serve`
  ou `tailscale funnel` à l'arrêt.
- `gateway.bind: "tailnet"` est une liaison directe au Tailnet (pas de HTTPS, pas de Serve/Funnel).
- `gateway.bind: "auto"` préfère le bouclage local (loopback) ; utilisez `tailnet` si vous souhaitez un accès Tailnet uniquement.
- Serve/Funnel n'exposent que l'**interface utilisateur de contrôle du Gateway + WS**. Les nœuds se connectent via
  le même point de terminaison WS du Gateway, donc Serve peut fonctionner pour l'accès aux nœuds.

## Contrôle du navigateur (Gateway distant + navigateur local)

Si vous exécutez le Gateway sur une machine mais souhaitez piloter un navigateur sur une autre machine,
exécutez un **node host** sur la machine du navigateur et gardez les deux sur le même tailnet.
Le Gateway transmettra les actions du navigateur au nœud ; aucun serveur de contrôle distinct ou URL Serve n'est nécessaire.

Évitez Funnel pour le contrôle du navigateur ; traitez le jumelage de nœuds comme un accès opérateur.

## Prérequis + limites Tailscale

- Serve nécessite HTTPS activé pour votre tailnet ; la CLI vous invite à l'activer s'il manque.
- Serve injecte les en-têtes d'identité Tailscale ; Funnel ne le fait pas.
- Funnel nécessite Tailscale v1.38.3+, MagicDNS, HTTPS activé, et un attribut de nœud funnel.
- Funnel prend uniquement en charge les ports `443`, `8443` et `10000` sur TLS.
- Funnel sur macOS nécessite la variante d'application open source de Tailscale.

## En savoir plus

- Aperçu de Tailscale Serve : [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- Commande `tailscale serve` : [https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Aperçu de Tailscale Funnel : [https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- Commande `tailscale funnel` : [https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

import fr from "/components/footer/fr.mdx";

<fr />
