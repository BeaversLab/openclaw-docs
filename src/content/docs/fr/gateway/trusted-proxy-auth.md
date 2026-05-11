---
summary: "Déléguer l'authentification de la passerelle à un proxy inverse de confiance (Pomerium, Caddy, nginx + OAuth)"
title: "Authentification par proxy de confiance"
sidebarTitle: "Authentification par proxy de confiance"
read_when:
  - Running OpenClaw behind an identity-aware proxy
  - Setting up Pomerium, Caddy, or nginx with OAuth in front of OpenClaw
  - Fixing WebSocket 1008 unauthorized errors with reverse proxy setups
  - Deciding where to set HSTS and other HTTP hardening headers
---

<Warning>**Fonctionnalité sensible à la sécurité.** Ce mode délègue entièrement l'authentification à votre proxy inverse. Une mauvaise configuration peut exposer votre Gateway à un accès non autorisé. Lisez attentivement cette page avant d'activer cette fonctionnalité.</Warning>

## Quand l'utiliser

Utilisez le mode d'authentification `trusted-proxy` lorsque :

- Vous exécutez OpenClaw derrière un **proxy conscient de l'identité** (Pomerium, Caddy + OAuth, nginx + oauth2-proxy, Traefik + authentification forward).
- Votre proxy gère toute l'authentification et transmet l'identité de l'utilisateur via des en-têtes.
- Vous êtes dans un environnement Kubernetes ou conteneurisé où le proxy est le seul chemin d'accès au Gateway.
- Vous rencontrez des erreurs `1008 unauthorized` WebSocket car les navigateurs ne peuvent pas transmettre de jetons dans les charges utiles WS.

## Quand NE PAS l'utiliser

- Si votre proxy n'authentifie pas les utilisateurs (simplement un terminateur TLS ou un équilibreur de charge).
- S'il existe un chemin vers le Gateway qui contourne le proxy (trous dans le pare-feu, accès au réseau interne).
- Si vous n'êtes pas sûr que votre proxy supprime/écrase correctement les en-têtes transférés.
- Si vous avez uniquement besoin d'un accès personnel mono-utilisateur (envisagez Tailscale Serve + boucle locale pour une configuration plus simple).

## Comment cela fonctionne

<Steps>
  <Step title="Le proxy authentifie l'utilisateur">Votre proxy inverse authentifie les utilisateurs (OAuth, OIDC, SAML, etc.).</Step>
  <Step title="Le proxy ajoute un en-tête d'identité">Le proxy ajoute un en-tête avec l'identité de l'utilisateur authentifié (par exemple, `x-forwarded-user: nick@example.com`).</Step>
  <Step title="La passerelle vérifie la source de confiance">Gateway vérifie que la requête provient d'une **IP de proxy de confiance** (configurée dans `gateway.trustedProxies`).</Step>
  <Step title="La passerelle extrait l'identité">Gateway extrait l'identité de l'utilisateur de l'en-tête configuré.</Step>
  <Step title="Autoriser">Si tout est vérifié, la demande est autorisée.</Step>
</Steps>

## Contrôler le comportement de l'appairage de l'interface de contrôle

Lorsque `gateway.auth.mode = "trusted-proxy"` est actif et que la demande réussit les vérifications du proxy de confiance, les sessions WebSocket de l'interface de contrôle peuvent se connecter sans identité d'appairage d'appareil.

Implications :

- L'appairage n'est plus la porte principale pour l'accès à l'interface de contrôle dans ce mode.
- Votre stratégie d'authentification de proxy inverse et `allowUsers` deviennent le contrôle d'accès effectif.
- Maintenez l'entrée de la passerelle verrouillée uniquement aux adresses IP de proxy de confiance (`gateway.trustedProxies` + pare-feu).

## Configuration

```json5
{
  gateway: {
    // Trusted-proxy auth expects requests from a non-loopback trusted proxy source
    bind: "lan",

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

<Warning>
**Règles d'exécution importantes**

- L'authentification par proxy de confiance rejette les requêtes provenant de boucles locales (`127.0.0.1`, `::1`, CIDRs de boucle locale).
- Les proxies inverses de même machine sur boucle locale ne **satisfont pas** l'authentification par proxy de confiance.
- Pour les configurations de proxy de même machine sur boucle locale, utilisez plutôt l'authentification par mot de passe/jeton, ou acheminez via une adresse de proxy de confiance non locale que OpenClaw peut vérifier.
- Les déploiements de l'interface de contrôle (Control UI) non locaux nécessitent toujours un `gateway.controlUi.allowedOrigins` explicite.
- **Les preuves d'en-têtes transmis (Forwarded) prévalent sur la localité de la boucle locale.** Si une requête arrive sur la boucle locale mais porte des en-têtes `X-Forwarded-For` / `X-Forwarded-Host` / `X-Forwarded-Proto` pointant vers une origine non locale, cette preuve invalide la revendication de localité de boucle locale. La requête est traitée comme distante pour l'appairage, l'authentification par proxy de confiance et le filtrage par identité d'appareil de l'interface de contrôle. Cela empêche un proxy de boucle locale de même machine de blanchir une identité d'en-tête transmis en authentification par proxy de confiance.
  </Warning>

### Référence de configuration

<ParamField path="gateway.trustedProxies" type="string[]" required>
  Tableau d'adresses IP de proxy à approuver. Les requêtes provenant d'autres adresses IP sont rejetées.
</ParamField>
<ParamField path="gateway.auth.mode" type="string" required>
  Doit être `"trusted-proxy"`.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.userHeader" type="string" required>
  Nom de l'en-tête contenant l'identité de l'utilisateur authentifié.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.requiredHeaders" type="string[]">
  En-têtes supplémentaires qui doivent être présents pour que la requête soit approuvée.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowUsers" type="string[]">
  Liste blanche des identités des utilisateurs. Vide signifie autoriser tous les utilisateurs authentifiés.
</ParamField>

## Terminaison TLS et HSTS

Utilisez un seul point de terminaison TLS et appliquez HSTS à cet endroit.

<Tabs>
  <Tab title="Terminaison TLS par le proxy (recommandé)">
    Lorsque votre proxy inverse gère le HTTPS pour `https://control.example.com`, définissez `Strict-Transport-Security` au niveau du proxy pour ce domaine.

    - Adapté aux déploiements accessibles sur Internet.
    - Conserve le certificat et la stratégie de durcissement HTTP en un seul endroit.
    - OpenClaw peut rester sur le HTTP de boucle locale derrière le proxy.

    Exemple de valeur d'en-tête :

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="Terminaison TLS par la passerelle">
    Si Gateway lui-même sert le HTTPS directement (sans proxy de terminaison TLS), définissez :

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

    `strictTransportSecurity` accepte une valeur d'en-tête de chaîne, ou `false` pour désactiver explicitement.

  </Tab>
</Tabs>

### Conseils de déploiement

- Commencez par une durée max courte (par exemple `max-age=300`) lors de la validation du trafic.
- Augmentez vers des valeurs durables (par exemple `max-age=31536000`) uniquement une fois la confiance établie.
- Ajoutez `includeSubDomains` uniquement si chaque sous-domaine est prêt pour HTTPS.
- Utilisez le préchargement (preload) uniquement si vous répondez intentionnellement aux exigences de préchargement pour l'ensemble complet de vos domaines.
- Le développement local en boucle locale uniquement ne bénéficie pas de HSTS.

## Exemples de configuration de proxy

<AccordionGroup>
  <Accordion title="Pomerium">
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

  </Accordion>
  <Accordion title="Caddy avec OAuth">
    Caddy avec le plugin `caddy-security` peut authentifier les utilisateurs et transmettre les en-têtes d'identité.

    ```json5
    {
      gateway: {
        bind: "lan",
        trustedProxies: ["10.0.0.1"], // Caddy/sidecar proxy IP
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

  </Accordion>
  <Accordion title="nginx + oauth2-proxy">
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

  </Accordion>
  <Accordion title="Traefik avec forward auth">
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
  </Accordion>
</AccordionGroup>

## Configuration de jetons mixtes

OpenClaw rejette les configurations ambiguës où à la fois un `gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) et le mode `trusted-proxy` sont actifs simultanément. Les configurations de jetons mixtes peuvent provoquer l'authentification silencieuse des requêtes de bouclage sur le mauvais chemin d'authentification.

Si vous rencontrez une erreur `mixed_trusted_proxy_token` au démarrage :

- Supprimez le jeton partagé lors de l'utilisation du mode trusted-proxy, ou
- Basculez `gateway.auth.mode` sur `"token"` si vous avez l'intention d'utiliser une authentification par jeton.

L'authentification trusted-proxy en bouclage échoue également en mode fermé : les appelants du même hôte doivent fournir les en-têtes d'identité configurés via un proxy de confiance au lieu d'être authentifiés silencieusement.

## En-tête des étendues d'opérateur

L'authentification trusted-proxy est un mode HTTP **porteur d'identité**, les appelants peuvent donc déclarer facultativement les étendues d'opérateur avec `x-openclaw-scopes`.

Exemples :

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

Comportement :

- Lorsque l'en-tête est présent, OpenClaw respecte l'ensemble d'étendues déclaré.
- Lorsque l'en-tête est présent mais vide, la requête ne déclare **aucune** étendue d'opérateur.
- When the header is absent, normal identity-bearing HTTP APIs fall back to the standard operator default scope set.
- Gateway-auth **plugin HTTP routes** are narrower by default: when `x-openclaw-scopes` is absent, their runtime scope falls back to `operator.write`.
- Browser-origin HTTP requests still have to pass `gateway.controlUi.allowedOrigins` (or deliberate Host-header fallback mode) even after trusted-proxy auth succeeds.

Practical rule: send `x-openclaw-scopes` explicitly when you want a trusted-proxy request to be narrower than the defaults, or when a gateway-auth plugin route needs something stronger than write scope.

## Security checklist

Before enabling trusted-proxy auth, verify:

- [ ] **Proxy is the only path**: The Gateway port is firewalled from everything except your proxy.
- [ ] **trustedProxies is minimal**: Only your actual proxy IPs, not entire subnets.
- [ ] **No loopback proxy source**: trusted-proxy auth fails closed for loopback-source requests.
- [ ] **Proxy strips headers**: Your proxy overwrites (not appends) `x-forwarded-*` headers from clients.
- [ ] **TLS termination**: Your proxy handles TLS; users connect via HTTPS.
- [ ] **allowedOrigins is explicit**: Non-loopback Control UI uses explicit `gateway.controlUi.allowedOrigins`.
- [ ] **allowUsers is set** (recommended): Restrict to known users rather than allowing anyone authenticated.
- [ ] **No mixed token config**: Do not set both `gateway.auth.token` and `gateway.auth.mode: "trusted-proxy"`.

## Security audit

`openclaw security audit` will flag trusted-proxy auth with a **critical** severity finding. This is intentional — it's a reminder that you're delegating security to your proxy setup.

The audit checks for:

- Base `gateway.trusted_proxy_auth` warning/critical reminder
- Missing `trustedProxies` configuration
- Missing `userHeader` configuration
- Empty `allowUsers` (allows any authenticated user)
- Wildcard or missing browser-origin policy on exposed Control UI surfaces

## Troubleshooting

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    La demande ne provient pas d'une adresse IP présente dans `gateway.trustedProxies`. Vérifiez :

    - L'adresse IP du proxy est-elle correcte ? (Les adresses IP des conteneurs Docker peuvent changer.)
    - Y a-t-il un équilibreur de charge devant votre proxy ?
    - Utilisez `docker inspect` ou `kubectl get pods -o wide` pour trouver les adresses IP réelles.

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source">
    OpenClaw a rejeté une demande de proxy de confiance provenant d'une adresse de bouclage.

    Vérifiez :

    - Le proxy se connecte-t-il à partir de `127.0.0.1` / `::1` ?
    - Essayez-vous d'utiliser l'authentification par proxy de confiance avec un proxy inverse de bouclage sur le même hôte ?

    Solution :

    - Utilisez l'authentification par jeton/mot de passe pour les configurations de proxy de bouclage sur le même hôte, ou
    - Acheminez via une adresse de proxy de confiance non bouclage et conservez cette IP dans `gateway.trustedProxies`.

  </Accordion>
  <Accordion title="trusted_proxy_user_missing">
    L'en-tête utilisateur était vide ou manquant. Vérifiez :

    - Votre proxy est-il configuré pour transmettre les en-têtes d'identité ?
    - Le nom de l'en-tête est-il correct ? (insensible à la casse, mais l'orthographe compte)
    - L'utilisateur est-il réellement authentifié au niveau du proxy ?

  </Accordion>
  <Accordion title="trusted_proxy_missing_header_*">
    Un en-tête requis n'était pas présent. Vérifiez :

    - La configuration de votre proxy pour ces en-têtes spécifiques.
    - Si les en-têtes sont supprimés quelque part dans la chaîne.

  </Accordion>
  <Accordion title="trusted_proxy_user_not_allowed">
    L'utilisateur est authentifié mais n'est pas dans `allowUsers`. Ajoutez-le ou supprimez la liste blanche.
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    L'authentification par proxy de confiance a réussi, mais l'en-tête `Origin` du navigateur n'a pas passé les vérifications d'origine de l'interface de contrôle.

    Vérifiez :

    - `gateway.controlUi.allowedOrigins` inclut l'origine exacte du navigateur.
    - Vous ne comptez pas sur les origines génériques (wildcard) sauf si vous voulez intentionnellement un comportement « autoriser tout ».
    - Si vous utilisez intentionnellement le mode de repli d'en-tête Host, `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` est défini délibérément.

  </Accordion>
  <Accordion title="WebSocket still failing">
    Assurez-vous que votre proxy :

    - Prend en charge les mises à niveau WebSocket (`Upgrade: websocket`, `Connection: upgrade`).
    - Transmet les en-têtes d'identité lors des demandes de mise à niveau WebSocket (pas seulement HTTP).
    - N'a pas de chemin d'authentification distinct pour les connexions WebSocket.

  </Accordion>
</AccordionGroup>

## Migration depuis l'authentification par jeton

Si vous passez de l'authentification par jeton à l'authentification par proxy de confiance :

<Steps>
  <Step title="Configure the proxy">Configurez votre proxy pour authentifier les utilisateurs et transmettre les en-têtes.</Step>
  <Step title="Test the proxy independently">Testez la configuration du proxy de manière indépendante (curl avec les en-têtes).</Step>
  <Step title="Update OpenClaw config">Mettez à jour la configuration OpenClaw avec l'authentification trusted-proxy.</Step>
  <Step title="Restart the Gateway">Redémarrez le Gateway.</Step>
  <Step title="Test WebSocket">Testez les connexions WebSocket depuis l'interface de contrôle.</Step>
  <Step title="Audit">Exécutez `openclaw security audit` et examinez les résultats.</Step>
</Steps>

## Connexes

- [Configuration](/fr/gateway/configuration) — référence de configuration
- [Accès à distance](/fr/gateway/remote) — autres modèles d'accès à distance
- [Sécurité](/fr/gateway/security) — guide de sécurité complet
- [Tailscale](/fr/gateway/tailscale) — alternative plus simple pour l'accès exclusif au tailnet
