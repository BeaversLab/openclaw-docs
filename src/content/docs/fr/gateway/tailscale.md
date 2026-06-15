---
summary: "TailscaleServe/Funnel Tailscale intégré pour le tableau de bord du Gateway"
read_when:
  - Exposing the Gateway Control UI outside localhost
  - Automating tailnet or public dashboard access
title: "Tailscale"
---

OpenClaw peut configurer automatiquement Tailscale **Serve** (tailnet) ou **Funnel** (public) pour le
tableau de bord du Gateway et le port WebSocket. Cela maintient le Gateway lié au bouclage local (loopback) tandis que
Tailscale fournit HTTPS, le routage et (pour Serve) les en-têtes d'identité.

## Modes

- `serve` : Service Tailnet uniquement via `tailscale serve`. La passerelle reste sur `127.0.0.1`.
- `funnel` : HTTPS public via `tailscale funnel`. OpenClaw nécessite un mot de passe partagé.
- `off` : Par défaut (pas d'automatisation Tailscale).

Le statut et la sortie d'audit utilisent l'**exposition Tailscale** pour ce mode de Service/Funnel OpenClaw. `off` signifie que OpenClaw ne gère pas le Service ou le Funnel ; cela ne signifie pas que le démon Tailscale local est arrêté ou déconnecté.

## Auth

Définissez `gateway.auth.mode` pour contrôler la négociation :

- `none` (ingrès privé uniquement)
- `token` (par défaut lorsque `OPENCLAW_GATEWAY_TOKEN` est défini)
- `password` (secret partagé via `OPENCLAW_GATEWAY_PASSWORD` ou configuration)
- `trusted-proxy` (proxy inverse conscient de l'identité ; voir [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth))

Lorsque `tailscale.mode = "serve"` et que `gateway.auth.allowTailscale` est `true`,
l'authentification de l'interface de contrôle/WebSocket peut utiliser les en-têtes d'identité Tailscale
(`tailscale-user-login`) sans fournir de jeton/mot de passe. OpenClaw vérifie
l'identité en résolvant l'adresse `x-forwarded-for` via le démon local Tailscale
(`tailscale whois`) et en la faisant correspondre à l'en-tête avant de l'accepter.
OpenClaw ne traite une requête comme Serve que lorsqu'elle provient du bouclage local avec
les en-têtes `x-forwarded-for`, `x-forwarded-proto` et `x-forwarded-host` de
Tailscale.
Pour les sessions d'opérateur de l'interface de contrôle qui incluent l'identité de l'appareil du navigateur, ce
chemin Serve vérifié évite également l'aller-retour d'appariement des appareils. Cela ne contourne pas
l'identité de l'appareil du navigateur : les clients sans appareil sont toujours rejetés, et les connexions WebSocket
avec un rôle de nœud ou en dehors de l'interface de contrôle suivent toujours les vérifications d'appariement et
d'authentification normales.
Les points de terminaison de l'API HTTP (par exemple `/v1/*`, `/tools/invoke` et `/api/channels/*`)
n'utilisent **pas** l'authentification par en-tête d'identité Tailscale. Ils suivent toujours le mode d'authentification
HTTP normal de la passerelle : authentification par secret partagé par défaut, ou une configuration `none` de proxy de confiance / ingress privé
intentionnellement configurée.
Ce flux sans jeton suppose que l'hôte de la passerelle est fiable. Si du code local non fiable
peut s'exécuter sur le même hôte, désactivez `gateway.auth.allowTailscale` et exigez
plutôt une authentification par jeton/mot de passe.
Pour exiger des informations d'identification de secret partagé explicites, définissez `gateway.auth.allowTailscale: false`
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

Ouvrez : `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configurée)

Pour exposer l'interface de contrôle via un Service Tailscale nommé au lieu du
nom d'hôte de l'appareil, définissez `gateway.tailscale.serviceName` sur le nom du Service :

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve", serviceName: "svc:openclaw" },
  },
}
```

Avec l'exemple ci-dessus, le démarrage signale l'URL du Service sous la forme
`https://openclaw.<tailnet-name>.ts.net/`TailscaleTailscale au lieu du nom d'hôte de l'appareil.
Les Services Tailscale nécessitent que l'hôte soit un nœud balisé approuvé dans votre
tailnet. Configurez la balise et approuvez le Service dans Tailscale avant d'activer
cette option, sinon `tailscale serve --service=...` échouera lors du démarrage de la
gateway.

### Tailnet uniquement (lier à l'IP Tailnet)

Utilisez cette option lorsque vous souhaitez que la Gateway écoute directement sur l'IP Tailnet (pas de Serve/Funnel).

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

<Note>Le bouclage (loopback) (`http://127.0.0.1:18789`) ne fonctionnera **pas** dans ce mode.</Note>

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

Préférez `OPENCLAW_GATEWAY_PASSWORD` plutôt que d'enregistrer un mot de passe sur le disque.

## Exemples CLI

```bash
openclaw gateway --tailscale serve
openclaw gateway --tailscale funnel --auth password
```

## Notes

- Tailscale Serve/Funnel nécessite que la CLI Tailscale`tailscale`CLI soit installée et que vous soyez connecté.
- `tailscale.mode: "funnel"` refuse de démarrer sauf si le mode d'authentification est `password` pour éviter toute exposition publique.
- `gateway.tailscale.serviceName` s'applique uniquement au mode Serve et est transmis à
  `tailscale serve --service=<name>`Tailscale. La valeur doit utiliser le format de nom de Service
  `svc:<dns-label>` de Tailscale, par exemple `svc:openclaw`Tailscale.
  Tailscale exige que les hôtes de Service soient des nœuds balisés, et le Service peut nécessiter
  une approbation dans la console d'administration avant que Serve ne puisse le publier.
- Définissez `gateway.tailscale.resetOnExit`OpenClaw si vous souhaitez qu'OpenClaw annule la configuration
  `tailscale serve` ou `tailscale funnel` à l'arrêt.
- Définissez `gateway.tailscale.preserveFunnel: true` pour maintenir une route
  `tailscale funnel` configurée externe active lors des redémarrages de la gateway. Lorsqu'elle est activée et que
  la gateway s'exécute en `mode: "serve"`OpenClaw, OpenClaw vérifie `tailscale funnel status`OpenClaw
  avant de réappliquer Serve et l'ignore si une route Funnel couvre déjà le
  port de la gateway. La stratégie Funnel uniquement par mot de passe gérée par OpenClaw reste inchangée.
- `gateway.bind: "tailnet"` est une liaison directe au Tailnet (pas de HTTPS, pas de Serve/Funnel).
- `gateway.bind: "auto"` privilégie le loopback ; utilisez `tailnet` si vous voulez limiter l'accès au Tailnet uniquement.
- Serve/Funnel expose uniquement l'**interface de contrôle du Gateway + WS**. Les nœuds se connectent via
  le même point de terminaison WS du Gateway, donc Serve peut fonctionner pour l'accès aux nœuds.

## Contrôle du navigateur (Gateway distant + navigateur local)

Si vous exécutez le Gateway sur une machine mais souhaitez piloter un navigateur sur une autre machine,
exécutez un **hôte de nœud** sur la machine du navigateur et gardez les deux sur le même tailnet.
Le Gateway relaiera les actions du navigateur vers le nœud ; aucun serveur de contrôle distinct ou URL Serve n'est nécessaire.

Évitez d'utiliser Funnel pour le contrôle du navigateur ; traitez l'appariement des nœuds comme un accès opérateur.

## Prérequis et limites Tailscale

- Serve nécessite HTTPS activé pour votre tailnet ; le CLI vous le demandera s'il manque.
- Serve injecte les en-têtes d'identité Tailscale ; Funnel non.
- Funnel nécessite Tailscale v1.38.3+, MagicDNS, HTTPS activé, et un attribut de nœud funnel.
- Funnel ne prend en charge que les ports `443`, `8443` et `10000` via TLS.
- Funnel sur macOS nécessite la variante d'application open source de Tailscale.

## En savoir plus

- Aperçu de Tailscale Serve : [https://tailscale.com/kb/1312/serve](https://tailscale.com/kb/1312/serve)
- Commande `tailscale serve` : [https://tailscale.com/kb/1242/tailscale-serve](https://tailscale.com/kb/1242/tailscale-serve)
- Aperçu de Tailscale Funnel : [https://tailscale.com/kb/1223/tailscale-funnel](https://tailscale.com/kb/1223/tailscale-funnel)
- Commande `tailscale funnel` : [https://tailscale.com/kb/1311/tailscale-funnel](https://tailscale.com/kb/1311/tailscale-funnel)

## Connexes

- [Accès à distance](/fr/gateway/remote)
- [Discovery](/fr/gateway/discovery)
- [Authentification](/fr/gateway/authentication)
