---
summary: "Interfaces web du Gateway : Interface de contrôle, modes de liaison et sécurité"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

Le Gateway dessert une petite **interface de contrôle de navigateur** (Vite + Lit) sur le même port que le WebSocket du Gateway :

- par défaut : `http://<host>:18789/`
- avec `gateway.tls.enabled: true` : `https://<host>:18789/`
- préfixe optionnel : définir `gateway.controlUi.basePath` (par ex. `/openclaw`)

Les fonctionnalités se trouvent dans [Control UI](/fr/web/control-ui). Le reste de cette page se concentre sur les modes de liaison, la sécurité et les surfaces web.

## Webhooks

Lorsque `hooks.enabled=true`, le Gateway expose également un petit point de terminaison webhook sur le même serveur HTTP.
Voir [Gateway configuration](/fr/gateway/configuration) → `hooks` pour l'authentification et les charges utiles.

## Admin HTTP RPC

L'Admin HTTP RPC expose certaines méthodes du plan de contrôle du Gateway à `POST /api/v1/admin/rpc`.
Il est désactivé par défaut et n'est enregistré que lorsque le plugin `admin-http-rpc` est activé.
Voir [Admin HTTP RPC](/fr/plugins/admin-http-rpc) pour le modèle d'authentification, les méthodes autorisées et la comparaison avec WebSocket.

## Config (activé par défaut)

Le Control UI est **activé par défaut** lorsque les ressources sont présentes (`dist/control-ui`).
Vous pouvez le contrôler via la configuration :

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Accès Tailscale

### Serve intégré (recommandé)

Gardez le Gateway en boucle locale et laissez Tailscale Serve le proxyer :

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Démarrez ensuite la passerelle :

```bash
openclaw gateway
```

Ouvrez :

- `https://<magicdns>/` (ou votre `gateway.controlUi.basePath` configuré)

### Liaison Tailnet + jeton

```json5
{
  gateway: {
    bind: "tailnet",
    controlUi: { enabled: true },
    auth: { mode: "token", token: "your-token" },
  },
}
```

Démarrez ensuite la passerelle (cet exemple hors boucle locale utilise l'authentification par jeton de secret partagé) :

```bash
openclaw gateway
```

Ouvrez :

- `http://<tailscale-ip>:18789/` (ou votre `gateway.controlUi.basePath` configuré)

### Internet public (Funnel)

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "funnel" },
    auth: { mode: "password" }, // or OPENCLAW_GATEWAY_PASSWORD
  },
}
```

## Notes de sécurité

- L'authentification Gateway est requise par défaut (jeton, mot de passe, proxy de confiance, ou en-têtes d'identité Tailscale Serve lorsque activés).
- Les liaisons hors boucle locale nécessitent toujours l'authentification de la passerelle. En pratique, cela signifie une authentification par jeton/mot de passe ou un proxy inverse conscient de l'identité avec `gateway.auth.mode: "trusted-proxy"`.
- L'assistant crée une authentification par secret partagé par défaut et génère généralement un jeton de passerelle (même en boucle locale).
- En mode secret partagé, l'interface utilisateur envoie `connect.params.auth.token` ou
  `connect.params.auth.password`.
- Quand `gateway.tls.enabled: true`, les assistants locaux de tableau de bord et d'état affichent
  des URL de tableau de bord `https://` et des URL WebSocket `wss://`.
- Dans les modes avec identité comme Tailscale Serve ou `trusted-proxy`, la
  vérification d'authentification WebSocket est satisfaite par les en-têtes de requête à la place.
- Pour les déploiements publics d'interface de contrôle non-bouclage, définissez `gateway.controlUi.allowedOrigins`
  explicitement (origines complètes). Les chargements privés de même origine LAN/Tailnet sont acceptés pour le bouclage,
  RFC1918/link-local, `.local`, `.ts.net`, et les hôtes Tailscale CGNAT.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active
  le mode de repli d'origine basé sur l'en-tête Host, mais constitue une rétrogradation de sécurité dangereuse.
- Avec Serve, les en-têtes d'identité Tailscale peuvent satisfaire l'authentification de l'interface de contrôle/WebSocket
  lorsque `gateway.auth.allowTailscale` est `true` (aucun jeton/mot de passe requis).
  Les points de terminaison HTTP API n'utilisent pas ces en-têtes d'identité Tailscale ; ils suivent
  plutôt le mode d'authentification HTTP normal de la passerelle. Définissez
  `gateway.auth.allowTailscale: false` pour exiger des informations d'identification explicites. Voir
  [Tailscale](/fr/gateway/tailscale) et [Security](/fr/gateway/security). Ce
  flux sans jeton suppose que l'hôte de la passerelle est de confiance.
- `gateway.tailscale.mode: "funnel"` nécessite `gateway.auth.mode: "password"` (mot de passe partagé).

## Création de l'interface utilisateur

Le Gateway sert des fichiers statiques depuis `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build
```
