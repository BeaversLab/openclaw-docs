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

Les capacités se trouvent dans [Control UI](/fr/web/control-ui).
Cette page se concentre sur les modes de liaison, la sécurité et les surfaces web.

## Webhooks

Lorsque `hooks.enabled=true`, le Gateway expose également un petit point de terminaison webhook sur le même serveur HTTP.
Voir [configuration du Gateway](/fr/gateway/configuration) → `hooks` pour l'authentification et les payloads.

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

Puis démarrez la passerelle (le jeton est requis pour les liaisons non-loopback) :

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

- L'authentification du Gateway est requise par défaut (jeton/mot de passe ou en-têtes d'identité Tailscale).
- Les liaisons non-loopback exigent toujours un jeton/mot de passe partagé (**require**) (`gateway.auth` ou env).
- L'assistant génère un jeton de passerelle par défaut (même en boucle locale).
- L'interface utilisateur envoie `connect.params.auth.token` ou `connect.params.auth.password`.
- Pour les déploiements de l'interface de contrôle non-loopback, définissez `gateway.controlUi.allowedOrigins`
  explicitement (origines complètes). Sans cela, le démarrage de la passerelle est refusé par défaut.
- `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` active
  le mode de repli d'origine basé sur l'en-tête Host, mais constitue une rétrogradation de sécurité dangereuse.
- Avec Serve, les en-têtes d'identité Tailscale peuvent satisfaire l'authentification de l'interface de contrôle/WebSocket
  lorsque `gateway.auth.allowTailscale` est `true` (aucun jeton/mot de passe requis).
  Les points de terminaison de l'API API HTTP nécessitent toujours un jeton/mot de passe. Définissez
  `gateway.auth.allowTailscale: false` pour exiger des identifiants explicites. Voir
  [Tailscale](/fr/gateway/tailscale) et [Sécurité](/fr/gateway/security). Ce
  flux sans jeton suppose que l'hôte de la passerelle est de confiance.
- `gateway.tailscale.mode: "funnel"` nécessite `gateway.auth.mode: "password"` (mot de passe partagé).

## Construction de l'interface utilisateur

Le Gateway sert des fichiers statiques depuis `dist/control-ui`. Construisez-les avec :

```bash
pnpm ui:build # auto-installs UI deps on first run
```

import fr from '/components/footer/fr.mdx';

<fr />
