---
summary: "Serve/Funnel Tailscale intégré pour le tableau de bord du Gateway"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

OpenClaw peut configurer automatiquement Tailscale **Serve** (tailnet) ou **Funnel** (public) pour le
tableau de bord du Gateway et le port WebSocket. Cela maintient le Gateway lié au bouclage local (loopback) tandis que
Tailscale fournit HTTPS, le routage et (pour Serve) les en-têtes d'identité.

## Modes

- `serve` : Serve Tailnet uniquement via `tailscale serve`. La passerelle reste sur `127.0.0.1`.
- `funnel` : HTTPS public via `tailscale funnel`. OpenClaw nécessite un mot de passe partagé.
- `off` : Par défaut (pas d'automatisation Tailscale).

Le statut et la sortie d'audit utilisent l'**exposition Tailscale** pour ce mode Serve/Funnel
OpenClaw. `off` signifie que OpenClaw ne gère pas Serve ou Funnel ; cela ne signifie pas que
le démon local Tailscale est arrêté ou déconnecté.

## Auth

Définissez `gateway.auth.mode` pour contrôler la négociation (handshake) :

- `none` (entrée privée uniquement)
- `token` (par défaut lorsque `OPENCLAW_GATEWAY_TOKEN` est défini)
- `password` (secret partagé via `OPENCLAW_GATEWAY_PASSWORD` ou la configuration)
- `trusted-proxy` (proxy inverse conscient de l'identité ; voir [Trusted Proxy Auth](/fr/gateway/trusted-proxy-auth))

Lorsque `tailscale.mode = "serve"` et que `gateway.auth.allowTailscale` est `true`,
l'authentification de l'interface de contrôle/WebSocket peut utiliser les en-têtes d'identité Tailscale
(`tailscale-user-login`) sans fournir de jeton/mot de passe. OpenClaw vérifie
l'identité en résolvant l'adresse `x-forwarded-for` via le démon local Tailscale
(`tailscale whois`) et en la correspondant à l'en-tête avant de l'accepter.
OpenClaw ne traite une requête comme Serve que lorsqu'elle provient du bouclage local avec
les en-têtes `x-forwarded-for`, `x-forwarded-proto` et `x-forwarded-host`
de Tailscale.
Pour les sessions opérateur de l'interface de contrôle qui incluent l'identité de l'appareil du navigateur, ce
chemin Serve vérifié évite également l'aller-retour pour le couplage de l'appareil. Cela ne contourne pas
l'identité de l'appareil du navigateur : les clients sans appareil sont toujours rejetés, et les connexions
WebSocket de rôle de nœud ou hors interface de contrôle suivent toujours les vérifications de couplage et
d'authentification normales.
Les points de terminaison de l'API HTTP (par exemple `/v1/*`, `/tools/invoke` et `/api/channels/*`)
n'utilisent **pas** l'authentification par en-tête d'identité Tailscale. Ils suivent toujours le mode d'authentification
HTTP normal de la passerelle : authentification par secret partagé par défaut, ou une configuration
intentionnelle de proxy de confiance / accès privé `none`.
Ce flux sans jeton suppose que l'hôte de la passerelle est de confiance. Si du code local non fiable
peut s'exécuter sur le même hôte, désactivez `gateway.auth.allowTailscale` et exigez
plutôt une authentification par jeton/mot de passe.
Pour exiger des identifiants explicites de secret partagé, définissez `gateway.auth.allowTailscale: false`
et utilisez `gateway.auth.mode: "token"` ou `"password"`.

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

Open : `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

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

Se connecter depuis un autre appareil Tailnet :

- Interface de contrôle : `http://<tailscale-ip>:18789/`
- WebSocket : `ws://<tailscale-ip>:18789`

<Note>Le bouclage local (`http://127.0.0.1:18789`) ne fonctionnera **pas** dans ce mode.</Note>

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

Privilégiez `OPENCLAW_GATEWAY_PASSWORD` plutôt que de stocker un mot de passe sur le disque.

## Exemples CLI

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## Notes

- Le Tailscale Serve/Funnel nécessite que le CLI `tailscale` soit installé et connecté.
- `tailscale.mode: "funnel"` refuse de démarrer sauf si le mode d'authentification est `password` afin d'éviter une exposition publique.
- Définissez `gateway.tailscale.resetOnExit` si vous souhaitez qu'OpenClaw annule la configuration `tailscale serve`
  ou `tailscale funnel` à l'arrêt.
- `gateway.bind: "tailnet"` est une liaison directe au Tailnet (pas de HTTPS, pas de Serve/Funnel).
- `gateway.bind: "auto"` préfère le bouclage local (loopback) ; utilisez `tailnet` si vous souhaitez un accès Tailnet uniquement.
- Serve/Funnel expose uniquement l'**interface de contrôle Gateway + WS**. Les nœuds se connectent via
  le même point de terminaison WS Gateway, donc Serve peut fonctionner pour l'accès aux nœuds.

## Contrôle du navigateur (Gateway distant + navigateur local)

Si vous exécutez le Gateway sur une machine mais souhaitez piloter un navigateur sur une autre machine,
exécutez un **hôte de nœud** sur la machine du navigateur et gardez les deux sur le même tailnet.
Le Gateway fera transiter les actions du navigateur vers le nœud ; aucun serveur de contrôle ou URL Serve séparé n'est nécessaire.

Évitez d'utiliser Funnel pour le contrôle du navigateur ; traitez l'appariement des nœuds comme un accès opérateur.

## Prérequis et limites Tailscale

- Serve nécessite HTTPS activé pour votre tailnet ; le CLI le demande s'il manque.
- Serve injecte les en-têtes d'identité Tailscale ; Funnel non.
- Funnel nécessite Tailscale v1.38.3+, MagicDNS, HTTPS activé et un attribut de nœud funnel.
- Funnel ne prend en charge que les ports `443`, `8443` et `10000` sur TLS.
- Funnel sur macOS nécessite la variante d'application open source Tailscale.

## En savoir plus

- Aperçu de Tailscale Serve : [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- Commande `tailscale serve` : [https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Aperçu de Tailscale Funnel : [https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- Commande `tailscale funnel` : [https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## Connexes

- [Accès à distance](/fr/gateway/remote)
- [Discovery](/fr/gateway/discovery)
- [Authentification](/fr/gateway/authentication)
