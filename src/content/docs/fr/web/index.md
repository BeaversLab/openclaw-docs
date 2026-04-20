---
summary: "Interfaces web du Gateway : Interface de contrôle, modes de liaison et sécurité"
read_when:
  - You want to access the Gateway over Tailscale
  - You want the browser Control UI and config editing
title: "Web"
---

# Web (Gateway)

Le Gateway sert une petite **interface de contrôle navigateur** (Vite + Lit) sur le même port que le WebSocket du Gateway :

- par défaut : `http://<host>:18789/`
- préfixe optionnel : définir `gateway.controlUi.basePath` (par ex. `/openclaw`)

Les fonctionnalités se trouvent dans [Control UI](/fr/web/control-ui).
Cette page se concentre sur les modes de liaison, la sécurité et les surfaces web.

## Webhooks

Lorsque `hooks.enabled=true`, le Gateway expose également un petit point de terminaison webhook sur le même serveur HTTP.
Voir [configuration du Gateway](/fr/gateway/configuration) → `hooks` pour l'authentification + les charges utiles.

## Config (activé par défaut)

L'interface de contrôle est **activée par défaut** lorsque les ressources sont présentes (`dist/control-ui`).
Vous pouvez la contrôler via la configuration :

```json5
{
  gateway: {
    controlUi: { enabled: true, basePath: "/openclaw" }, // basePath optional
  },
}
```

## Accès Tailscale

### Serve intégré (recommandé)

Gardez le Gateway en boucle locale (loopback) et laissez Tailscale Serve le proxy :

```json5
{
  gateway: {
    bind: "loopback",
    tailscale: { mode: "serve" },
  },
}
```

Puis démarrez la passerelle :

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

Démarrez ensuite la passerelle (cet exemple non-boucle utilise l'authentification par jeton de secret partagé) :

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

- L'authentification du Gateway est requise par défaut (jeton, mot de passe, proxy de confiance ou en-têtes d'identité Tailscale Serve lorsqu'ils sont activés).
- Les liaisons non-boucle **exigent** toujours l'authentification de la passerelle. En pratique, cela signifie une authentification par jeton/mot de passe ou un proxy inverse conscient de l'identité avec `gateway.auth.mode: "trusted-proxy"`.
- L'assistant crée une authentification par secret partagé par défaut et génère généralement un jeton de passerelle (même en boucle).
- En mode secret partagé, l'interface utilisateur envoie `connect.params.auth.token` ou
  `connect.params.auth.password`.
- Dans les modes porteurs d'identité tels que Tailscale Serve ou `trusted-proxy`, la
  vérification d'authentification WebSocket est satisfaite à partir des en-têtes de requête à la place.
- Pour les déploiements de l'interface utilisateur de contrôle non-boucle, définissez `gateway.controlUi.allowedOrigins`
  explicitement (origines complètes). Sans cela, le démarrage de la passerelle est refusé par défaut.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active
  le mode de repli d'origine de l'en-tête Host, mais constitue une rétrogradation de sécurité dangereuse.
- Avec Serve, les en-têtes d'identité Tailscale peuvent satisfaire l'authentification Control UI/WebSocket
  lorsque `gateway.auth.allowTailscale` est `true` (aucun jeton/mot de passe requis).
  Les points de terminaison HTTP API n'utilisent pas ces en-têtes d'identité Tailscale ; ils suivent
  plutôt le mode d'authentification HTTP normal de la passerelle. Définissez
  `gateway.auth.allowTailscale: false` pour exiger des informations d'identification explicites. Voir
  [Tailscale](/fr/gateway/tailscale) et [Sécurité](/fr/gateway/security). Ce
  flux sans jeton suppose que l'hôte de la passerelle est de confiance.
- `gateway.tailscale.mode: "funnel"` nécessite `gateway.auth.mode: "password"` (mot de passe partagé).

## Construction de l'interface utilisateur

Le Gateway sert des fichiers statiques à partir de `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build # auto-installs UI deps on first run
```
