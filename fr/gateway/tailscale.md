---
summary: "Integrated Tailscale Serve/Funnel for the Gateway dashboard"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

# Tailscale (Gateway dashboard)

OpenClaw can auto-configure Tailscale **Serve** (tailnet) or **Funnel** (public) for the
Gateway dashboard and WebSocket port. This keeps the Gateway bound to loopback while
Tailscale provides HTTPS, routing, and (for Serve) identity headers.

## Modes

- `serve`: Tailnet-only Serve via `tailscale serve`. The gateway stays on `127.0.0.1`.
- `funnel`: Public HTTPS via `tailscale funnel`. OpenClaw requires a shared password.
- `off`: Default (no Tailscale automation).

## Auth

Set `gateway.auth.mode` to control the handshake:

- `token` (default when `OPENCLAW_GATEWAY_TOKEN` is set)
- `password` (shared secret via `OPENCLAW_GATEWAY_PASSWORD` or config)

When `tailscale.mode = "serve"` and `gateway.auth.allowTailscale` is `true`,
Control UI/WebSocket auth can use Tailscale identity headers
(`tailscale-user-login`) without supplying a token/password. OpenClaw verifies
the identity by resolving the `x-forwarded-for` address via the local Tailscale
daemon (`tailscale whois`) and matching it to the header before accepting it.
OpenClaw only treats a request as Serve when it arrives from loopback with
Tailscale’s `x-forwarded-for`, `x-forwarded-proto`, and `x-forwarded-host`
headers.
HTTP API endpoints (for example `/v1/*`, `/tools/invoke`, and `/api/channels/*`)
still require token/password auth.
This tokenless flow assumes the gateway host is trusted. If untrusted local code
may run on the same host, disable `gateway.auth.allowTailscale` and require
token/password auth instead.
To require explicit credentials, set `gateway.auth.allowTailscale: false` or
force `gateway.auth.mode: "password"`.

## Config examples

### Tailnet-only (Serve)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Ouvrez : `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

### Tailnet uniquement (lier à l'IP Tailnet)

Utilisez cette option lorsque vous voulez que le Gateway écoute directement sur l'IP Tailnet (sans Serve/Funnel).

```json5
{
  gateway: {
    bind: "tailnet",
    auth: { mode: "token", token: "your-token" },
  },
}
```

Connectez-vous depuis un autre appareil Tailnet :

- Interface de contrôle : `http://<tailscale-ip>:18789/`
- WebSocket : `ws://<tailscale-ip>:18789`

Remarque : la boucle de retour (`http://127.0.0.1:18789`) ne fonctionnera **pas** dans ce mode.

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

- Tailscale Serve/Funnel nécessite l'installation et la connexion du `tailscale` CLI.
- `tailscale.mode: "funnel"` refuse de démarrer sauf si le mode d'authentification est `password` afin d'éviter une exposition publique.
- Définissez `gateway.tailscale.resetOnExit` si vous souhaitez qu'OpenClaw annule la configuration `tailscale serve`
  ou `tailscale funnel` à l'arrêt.
- `gateway.bind: "tailnet"` est une liaison directe Tailnet (pas de HTTPS, pas de Serve/Funnel).
- `gateway.bind: "auto"` privilégie la boucle de retour ; utilisez `tailnet` si vous souhaitez limiter au Tailnet.
- Serve/Funnel expose uniquement l'**interface de contrôle Gateway + WS**. Les nœuds se connectent via
  le même point de terminaison WS du Gateway, donc Serve peut fonctionner pour l'accès aux nœuds.

## Contrôle du navigateur (Gateway distant + navigateur local)

Si vous exécutez le Gateway sur une machine mais souhaitez piloter un navigateur sur une autre machine,
exécutez un **hôte de nœud** sur la machine du navigateur et gardez les deux sur le même tailnet.
Le Gateway relaiera les actions du navigateur vers le nœud ; aucun serveur de contrôle distinct ni URL Serve n'est nécessaire.

Évitez Funnel pour le contrôle du navigateur ; traitez le jumelage de nœuds comme un accès opérateur.

## Prérequis et limites Tailscale

- Serve nécessite HTTPS activé pour votre tailnet ; le CLI le demande s'il est manquant.
- Serve injecte les en-têtes d'identité Tailscale ; Funnel non.
- Funnel nécessite Tailscale v1.38.3+, MagicDNS, HTTPS activé et un attribut de nœud funnel.
- Funnel ne prend en charge que les ports `443`, `8443` et `10000` sur TLS.
- Funnel sur macOS nécessite la variante d'application open source Tailscale.

## En savoir plus

- Aperçu de Tailscale Serve : [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- `tailscale serve` commande : [https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Tailscale Funnel vue d'ensemble : [https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- `tailscale funnel` commande : [https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

import fr from "/components/footer/fr.mdx";

<fr />
