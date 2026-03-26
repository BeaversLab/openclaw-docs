---
title: "Authentification par proxy de confiance"
summary: "Déléguer l'authentification de la passerelle à un reverse proxy de confiance (Pomerium, Caddy, nginx + OAuth)"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

# Authentification par proxy de confiance

> ⚠️ **Fonctionnalité sensible à la sécurité.** Ce mode délègue entièrement l'authentification à votre reverse proxy. Une mauvaise configuration peut exposer votre Gateway à un accès non autorisé. Lisez attentivement cette page avant d'activer cette fonctionnalité.

## Quand l'utiliser

Utilisez le mode d'authentification `trusted-proxy` lorsque :

- Vous exécutez OpenClaw derrière un **proxy conscient de l'identité** (Pomerium, Caddy + OAuth, nginx + oauth2-proxy, Traefik + authentification de transfert)
- Votre proxy gère toute l'authentification et transmet l'identité de l'utilisateur via des en-têtes
- Vous êtes dans un environnement Kubernetes ou conteneurisé où le proxy est le seul chemin d'accès à la Gateway
- Vous rencontrez des erreurs WebSocket `1008 unauthorized` car les navigateurs ne peuvent pas transmettre de jetons dans les charges utiles WS

## Quand NE PAS l'utiliser

- Si votre proxy n'authentifie pas les utilisateurs (simplement un terminateur TLS ou un équilibreur de charge)
- S'il existe un chemin vers la Gateway qui contourne le proxy (trous dans le pare-feu, accès réseau interne)
- Si vous n'êtes pas sûr que votre proxy supprime/écrase correctement les en-têtes transférés
- Si vous avez uniquement besoin d'un accès personnel monoutilisateur (envisagez Tailscale Serve + boucle locale pour une configuration plus simple)

## Fonctionnement

1. Votre reverse proxy authentifie les utilisateurs (OAuth, OIDC, SAML, etc.)
2. Le proxy ajoute un en-tête avec l'identité de l'utilisateur authentifié (par exemple, `x-forwarded-user: nick@example.com`)
3. OpenClaw vérifie que la requête provient d'une **IP de proxy de confiance** (configurée dans `gateway.trustedProxies`)
4. OpenClaw extrait l'identité de l'utilisateur de l'en-tête configuré
5. Si tout est vérifié, la requête est autorisée

## Comportement de l'appairage de l'interface de contrôle

Lorsque `gateway.auth.mode = "trusted-proxy"` est actif et que la requête réussit
les vérifications du proxy de confiance, les sessions WebSocket de l'interface de contrôle peuvent se connecter sans
dentité d'appairage d'appareil.

Implications :

- L'appairage n'est plus la porte principale pour l'accès à l'interface de contrôle dans ce mode.
- Votre stratégie d'authentification de reverse proxy et `allowUsers` deviennent le contrôle d'accès effectif.
- Maintenez l'accès à la passerelle verrouillé uniquement sur les IP de proxy de confiance (`gateway.trustedProxies` + pare-feu).

## Configuration

```json5
{
  gateway: {
    // Use loopback for same-host proxy setups; use lan/custom for remote proxy hosts
    bind: "loopback",

    // CRITICAL: Only add your proxy's IP(s) here
    trustedProxies: ["10.0.0.1", "172.17.0.1"],

    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        // Header containing authenticated user identity (required)
        userHeader: "x-forwarded-user",

        // Optional: headers that MUST be present (proxy verification)
        requiredHeaders: ["x-forwarded-proto", "x-forwarded-host"],

        // Optional: restrict to specific users (empty = allow all)
        allowUsers: ["nick@example.com", "admin@company.org"],
      },
    },
  },
}
```

Si `gateway.bind` est `loopback`, incluez une adresse proxy de bouclage dans
`gateway.trustedProxies` (`127.0.0.1`, `::1`, ou un CIDR de bouclage équivalent).

### Référence de configuration

| Champ                                       | Obligatoire | Description                                                                                            |
| ------------------------------------------- | ----------- | ------------------------------------------------------------------------------------------------------ |
| `gateway.trustedProxies`                    | Oui         | Tableau d'adresses IP de proxy à approuver. Les requêtes provenant d'autres adresses IP sont rejetées. |
| `gateway.auth.mode`                         | Oui         | Doit être `"trusted-proxy"`                                                                            |
| `gateway.auth.trustedProxy.userHeader`      | Oui         | Nom de l'en-tête contenant l'identité de l'utilisateur authentifié                                     |
| `gateway.auth.trustedProxy.requiredHeaders` | Non         | En-têtes supplémentaires qui doivent être présents pour que la requête soit approuvée                  |
| `gateway.auth.trustedProxy.allowUsers`      | Non         | Liste blanche des identités utilisateur. Vide signifie autoriser tous les utilisateurs authentifiés.   |

## Terminaison TLS et HSTS

Utilisez un seul point de terminaison TLS et appliquez HSTS à cet endroit.

### Modèle recommandé : terminaison TLS par le proxy

Lorsque votre proxy inverse gère le HTTPS pour `https://control.example.com`, définissez
`Strict-Transport-Security` au niveau du proxy pour ce domaine.

- Convient bien aux déploiements accessibles sur Internet.
- Conserve le certificat et la stratégie de durcissement HTTP au même endroit.
- OpenClaw peut rester en HTTP loopback derrière le proxy.

Exemple de valeur d'en-tête :

```text
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

### Terminaison TLS Gateway

Si OpenClaw sert directement le HTTPS (sans proxy de terminaison TLS), définissez :

```json5
{
  gateway: {
    tls: { enabled: true },
    http: {
      securityHeaders: {
        strictTransportSecurity: "max-age=31536000; includeSubDomains",
      },
    },
  },
}
```

`strictTransportSecurity` accepte une valeur d'en-tête sous forme de chaîne, ou `false` pour désactiver explicitement.

### Conseils de déploiement

- Commencez par une durée max-age courte (par exemple `max-age=300`) lors de la validation du trafic.
- Augmentez vers des valeurs de longue durée (par exemple `max-age=31536000`) uniquement lorsque vous êtes pleinement confiant.
- Ajoutez `includeSubDomains` uniquement si chaque sous-domaine est prêt pour le HTTPS.
- Utilisez le préchargement uniquement si vous répondez intentionnellement aux exigences de préchargement pour l'ensemble de vos domaines.
- Le développement local en boucle locale (loopback) ne bénéficie pas de HSTS.

## Exemples de configuration de proxy

### Pomerium

Pomerium transmet l'identité dans `x-pomerium-claim-email` (ou d'autres en-têtes de revendication) et un JWT dans `x-pomerium-jwt-assertion`.

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // Pomerium's IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-pomerium-claim-email",
        requiredHeaders: ["x-pomerium-jwt-assertion"],
      },
    },
  },
}
```

Extrait de configuration Pomerium :

```yaml
routes:
  - from: https://openclaw.example.com
    to: http://openclaw-gateway:18789
    policy:
      - allow:
          or:
            - email:
                is: nick@example.com
    pass_identity_headers: true
```

### Caddy avec OAuth

Caddy avec le plugin `caddy-security` peut authentifier les utilisateurs et transmettre les en-têtes d'identité.

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["127.0.0.1"], // Caddy's IP (if on same host)
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

Extrait de Caddyfile :

```
openclaw.example.com {
    authenticate with oauth2_provider
    authorize with policy1

    reverse_proxy openclaw:18789 {
        header_up X-Forwarded-User {http.auth.user.email}
    }
}
```

### nginx + oauth2-proxy

oauth2-proxy authentifie les utilisateurs et transmet l'identité dans `x-auth-request-email`.

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["10.0.0.1"], // nginx/oauth2-proxy IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-auth-request-email",
      },
    },
  },
}
```

Extrait de configuration nginx :

```nginx
location / {
    auth_request /oauth2/auth;
    auth_request_set $user $upstream_http_x_auth_request_email;

    proxy_pass http://openclaw:18789;
    proxy_set_header X-Auth-Request-Email $user;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
}
```

### Traefik avec Forward Auth

```json5
{
  gateway: {
    bind: "lan",
    trustedProxies: ["172.17.0.1"], // Traefik container IP
    auth: {
      mode: "trusted-proxy",
      trustedProxy: {
        userHeader: "x-forwarded-user",
      },
    },
  },
}
```

## Liste de vérification de sécurité

Avant d'activer l'authentification proxy de confiance, vérifiez :

- [ ] **Le proxy est le seul chemin** : Le port du Gateway est protégé par un pare-feu de tout accès sauf votre proxy
- [ ] **trustedProxies est minimal** : Uniquement vos IP de proxy réelles, pas des sous-réseaux entiers
- [ ] **Proxy strips headers** : Votre proxy remplace (n'ajoute pas) les en-têtes `x-forwarded-*` des clients
- [ ] **TLS termination** : Votre proxy gère le TLS ; les utilisateurs se connectent via HTTPS
- [ ] **allowUsers est défini** (recommandé) : Limitez aux utilisateurs connus plutôt que d'autoriser toute personne authentifiée

## Audit de sécurité

`openclaw security audit` signalera l'authentification trusted-proxy avec une découverte de gravité **critique**. C'est intentionnel — c'est un rappel que vous déléguez la sécurité à votre configuration de proxy.

L'audit vérifie :

- Configuration `trustedProxies` manquante
- Configuration `userHeader` manquante
- `allowUsers` vide (autorise n'importe quel utilisateur authentifié)

## Dépannage

### "trusted_proxy_untrusted_source"

La demande ne provenait pas d'une adresse IP dans `gateway.trustedProxies`. Vérifiez :

- L'adresse IP du proxy est-elle correcte ? (Les adresses IP des conteneurs Docker peuvent changer)
- Y a-t-il un équilibreur de charge devant votre proxy ?
- Utilisez `docker inspect` ou `kubectl get pods -o wide` pour trouver les adresses IP réelles

### "trusted_proxy_user_missing"

L'en-tête utilisateur était vide ou manquant. Vérifiez :

- Votre proxy est-il configuré pour transmettre les en-têtes d'identité ?
- Le nom de l'en-tête est-il correct ? (insensible à la casse, mais l'orthographe compte)
- L'utilisateur est-il réellement authentifié au niveau du proxy ?

### "trusted*proxy_missing_header*\*"

Un en-tête requis n'était pas présent. Vérifiez :

- La configuration de votre proxy pour ces en-têtes spécifiques
- Si les en-têtes sont supprimés quelque part dans la chaîne

### "trusted_proxy_user_not_allowed"

L'utilisateur est authentifié mais n'est pas dans `allowUsers`. Ajoutez-le ou supprimez la liste d'autorisation.

### Échec persistant de WebSocket

Assurez-vous que votre proxy :

- Prend en charge les mises à niveau WebSocket (`Upgrade: websocket`, `Connection: upgrade`)
- Transfère les en-têtes d'identité sur les demandes de mise à niveau WebSocket (pas seulement HTTP)
- N'a pas de chemin d'authentification distinct pour les connexions WebSocket

## Migration depuis l'authentification par jeton

Si vous passez de l'authentification par jeton au proxy de confiance :

1. Configurez votre proxy pour authentifier les utilisateurs et transmettre les en-têtes
2. Testez la configuration du proxy de manière indépendante (curl avec en-têtes)
3. Mettez à jour la configuration OpenClaw avec l'authentification trusted-proxy
4. Redémarrez le Gateway
5. Testez les connexions WebSocket depuis l'interface de contrôle
6. Exécutez `openclaw security audit` et examinez les résultats

## Connexes

- [Sécurité](/fr/gateway/security) — guide de sécurité complet
- [Configuration](/fr/gateway/configuration) — référence de configuration
- [Accès à distance](/fr/gateway/remote) — autres modèles d'accès à distance
- [Tailscale](/fr/gateway/tailscale) — alternative plus simple pour l'accès exclusif au tailnet

import fr from "/components/footer/fr.mdx";

<fr />
