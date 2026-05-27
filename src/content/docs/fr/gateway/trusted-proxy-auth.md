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
- Vous rencontrez des erreurs WebSocket `1008 unauthorized` car les navigateurs ne peuvent pas transmettre de jetons dans les charges utiles WS.

## Quand NE PAS l'utiliser

- Si votre proxy n'authentifie pas les utilisateurs (simplement un terminateur TLS ou un équilibreur de charge).
- S'il existe un chemin vers le Gateway qui contourne le proxy (trous dans le pare-feu, accès au réseau interne).
- Si vous n'êtes pas sûr que votre proxy supprime/écrase correctement les en-têtes transférés.
- Si vous avez uniquement besoin d'un accès personnel mono-utilisateur (envisagez Tailscale Serve + boucle locale pour une configuration plus simple).

## Comment cela fonctionne

<Steps>
  <Step title="Le proxy authentifie l'utilisateur">Votre proxy inverse authentifie les utilisateurs (OAuth, OIDC, SAML, etc.).</Step>
  <Step title="Proxy adds an identity header">Le proxy ajoute un en-tête avec l'identité de l'utilisateur authentifié (par exemple, `x-forwarded-user: nick@example.com`).</Step>
  <Step title="Gateway verifies trusted source">OpenClaw vérifie que la requête provient d'une **IP de proxy de confiance** (configurée dans `gateway.trustedProxies`).</Step>
  <Step title="La passerelle extrait l'identité">Gateway extrait l'identité de l'utilisateur de l'en-tête configuré.</Step>
  <Step title="Autoriser">Si tout est vérifié, la demande est autorisée.</Step>
</Steps>

## Contrôler le comportement de l'appairage de l'interface de contrôle

Lorsque `gateway.auth.mode = "trusted-proxy"` est actif et que la requête réussit les vérifications du proxy de confiance, les sessions WebSocket de l'interface de contrôle peuvent se connecter sans identité d'appareil.

Implications :

- L'appairage n'est plus la porte principale pour l'accès à l'interface de contrôle dans ce mode.
- Votre stratégie d'authentification de proxy inverse et `allowUsers` deviennent le contrôle d'accès effectif.
- Maintenez l'entrée de la passerelle verrouillée uniquement aux IP de proxy de confiance (`gateway.trustedProxies` + pare-feu).

**Effacement des portées sans identité d'appareil :** Parce que le navigateur sur HTTP brut
ne peut pas créer l'identité de l'appareil que OpenClaw utilise pour lier les portées de l'opérateur,
les connexions WebSocket de proxy de confiance qui n'ont pas d'identité d'appareil voient leurs
portées autodéclarées effacées pour devenir un ensemble vide. La connexion est autorisée, mais
les méthodes à accès restreint par portée (`operator.read`, `operator.write`, etc.) échouent avec
`missing scope`.

Pour préserver les portées de l'opérateur sur les connexions WebSocket de proxy de confiance sans
identité d'appareil, définissez `gateway.controlUi.dangerouslyDisableDeviceAuth: true`.
C'est un indicateur de bris de glace (`openclaw security audit` le signale comme critique).
Utilisez-le uniquement lorsque le proxy inverse est le seul chemin vers le Gateway et que l'identité
de l'appareil ne peut pas être établie.

## Configuration

```json5
{
  gateway: {
    // Trusted-proxy auth expects requests from a non-loopback trusted proxy source by default
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

        // Optional: allow a same-host loopback proxy after explicit opt-in
        allowLoopback: false,
      },
    },
  },
}
```

<Warning>
**Règles d'exécution importantes**

- L'authentification par proxy de confiance rejette par défaut les requests provenant de sources de bouclage (`127.0.0.1`, `::1`, CIDRs de bouclage).
- Les proxies inverses de bouclage sur le même hôte ne **satisfont pas** l'authentification par proxy de confiance, sauf si vous définissez explicitement `gateway.auth.trustedProxy.allowLoopback = true` et incluez l'adresse de bouclage dans `gateway.trustedProxies`.
- `allowLoopback` fait confiance aux processus locaux sur l'hôte du Gateway dans la même mesure qu'au proxy inverse. Activez-le uniquement lorsque le Gateway est encore protégé par un pare-feu contre l'accès à distance direct et que le proxy local supprime ou remplace les en-têtes d'identité fournis par le client.
- Les clients internes du Gateway qui ne passent pas par le proxy inverse doivent utiliser `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`, et non les en-têtes d'identité de proxy de confiance.
- Les déploiements de l'interface de contrôle (Control UI) non en bouclage ont toujours besoin d'un `gateway.controlUi.allowedOrigins` explicite.
- **Les preuves d'en-tête Forwarded remplacent la localité de bouclage pour le repli direct local.** Si une demande arrive sur bouclage mais porte `Forwarded`, n'importe quel `X-Forwarded-*`, ou des preuves d'en-tête `X-Real-IP`, cette preuve invalide le repli par mot de passe direct local et le filtrage par identité de l'appareil. Avec `allowLoopback: true`, l'authentification par proxy de confiance peut toujours accepter la demande en tant que demande de proxy sur le même hôte, tandis que `requiredHeaders` et `allowUsers` continuent de s'appliquer.

</Warning>

### Référence de configuration

<ParamField path="gateway.trustedProxies" type="string[]" required>
  Tableau d'adresses IP de proxy à approuver. Les requêtes provenant d'autres IP sont rejetées.
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
  Liste blanche des identités utilisateurs. Vide signifie autoriser tous les utilisateurs authentifiés.
</ParamField>
<ParamField path="gateway.auth.trustedProxy.allowLoopback" type="boolean">
  Support optionnel pour les proxies inversés de bouclage sur le même hôte. La valeur par défaut est `false`.
</ParamField>

<Warning>
  N'activez `allowLoopback` que lorsque le proxy inverse local est la limite de confiance prévue. Tout processus local capable de se connecter au Gateway peut essayer d'envoyer des en-têtes d'identité de proxy, donc gardez l'accès direct au Gateway privé pour l'hôte et exigez des en-têtes appartenant au proxy tels que `x-forwarded-proto` ou un en-tête d'assertion signé si votre proxy en prend en
  charge un.
</Warning>

## Terminaison TLS et HSTS

Utilisez un seul point de terminaison TLS et appliquez HSTS à cet endroit.

<Tabs>
  <Tab title="Terminaison TLS par le proxy (recommandé)">
    Lorsque votre proxy inverse gère le HTTPS pour `https://control.example.com`, définissez `Strict-Transport-Security` au niveau du proxy pour ce domaine.

    - Convient bien aux déploiements accessibles sur Internet.
    - Conserve le certificat et la politique de durcissement HTTP au même endroit.
    - OpenClaw peut rester en HTTP bouclage derrière le proxy.

    Valeur d'exemple d'en-tête :

    ```text
    Strict-Transport-Security: max-age=31536000; includeSubDomains
    ```

  </Tab>
  <Tab title="GatewayArrêt TLS de la Gateway"OpenClaw>
    Si OpenClaw lui-même sert HTTPS directement (pas de proxy de terminaison TLS), définissez :

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

- Commencez par une durée max-age courte (par exemple `max-age=300`) lors de la validation du trafic.
- Augmentez à des valeurs à long terme (par exemple `max-age=31536000`) uniquement lorsque la confiance est élevée.
- Ajoutez `includeSubDomains` uniquement si chaque sous-domaine est prêt pour HTTPS.
- Utilisez le préchargement uniquement si vous répondez intentionnellement aux exigences de préchargement pour l'ensemble complet de vos domaines.
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
  <Accordion title="OAuthCaddy avec OAuth">
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
  <Accordion title="Traefik avec authentification transmise">
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

OpenClaw rejette les configurations ambiguës où à la fois un OpenClaw`gateway.auth.token` (ou `OPENCLAW_GATEWAY_TOKEN`) et le mode `trusted-proxy` sont actifs en même temps. Les configurations de jetons mixtes peuvent provoquer l'authentification silencieuse des requêtes en boucle locale sur le mauvais chemin d'authentification.

Si vous rencontrez une erreur `mixed_trusted_proxy_token` au démarrage :

- Supprimez le jeton partagé lorsque vous utilisez le mode trusted-proxy, ou
- Basculez `gateway.auth.mode` sur `"token"` si vous prévoyez une authentification par jeton.

Les en-têtes d'identité trusted-proxy en boucle locale échouent toujours en mode fermé : les appelants du même hôte ne sont pas silencieusement authentifiés en tant qu'utilisateurs du proxy. Les appelants internes OpenClaw qui contournent le proxy peuvent plutôt s'authentifier avec `gateway.auth.password` / `OPENCLAW_GATEWAY_PASSWORD`. La repli sur jeton reste intentionnellement non pris en charge en mode trusted-proxy.

## En-tête des portées de l'opérateur

L'authentification trusted-proxy est un mode HTTP **porteur d'identité** (identity-bearing), les appelants peuvent donc éventuellement déclarer des portées d'opérateur avec `x-openclaw-scopes`.

Remarque : `x-openclaw-scopes` s'applique uniquement aux points de terminaison HTTP. Les portées WebSocket sont déterminées par la poignée de main (handshake) du protocole Gateway et la liaison d'identité de l'appareil. Pour le comportement des portées WebSocket avec trusted-proxy, voir [Control UI pairing behavior](#control-ui-pairing-behavior).

Exemples :

- `x-openclaw-scopes: operator.read`
- `x-openclaw-scopes: operator.read,operator.write`
- `x-openclaw-scopes: operator.admin,operator.write`

Comportement :

- Lorsque l'en-tête est présent, OpenClaw respecte l'ensemble de portées déclarées.
- Lorsque l'en-tête est présent mais vide, la requête ne déclare **aucune** portée d'opérateur.
- Lorsque l'en-tête est absent, les API HTTP porteurs d'identité standard reviennent à l'ensemble de portées par défaut standard de l'opérateur.
- Les **routes HTTP de plugin** d'auth Gateway sont plus restrictives par défaut : lorsque `x-openclaw-scopes` est absent, leur portée d'exécution revient à `operator.write`.
- Les requêtes HTTP d'origine navigateur doivent toujours réussir `gateway.controlUi.allowedOrigins` (ou le mode de repli délibéré de l'en-tête Host) même après la réussite de l'authentification trusted-proxy.

Règle pratique : envoyez `x-openclaw-scopes` explicitement lorsque vous souhaitez qu'une requête trusted-proxy soit plus restrictive que les valeurs par défaut, ou lorsqu'une route de plugin d'auth gateway a besoin de quelque chose de plus fort que la portée d'écriture.

## Liste de vérification de sécurité

Avant d'activer l'authentification trusted-proxy, vérifiez :

- [ ] **Le proxy est le seul chemin** : Le port du Gateway est protégé par un pare-feu contre tout sauf votre proxy.
- [ ] **trustedProxies est minimal** : Uniquement vos adresses IP proxy réelles, et non des sous-réseaux entiers.
- [ ] **La source du proxy de bouclage est délibérée** : L'authentification trusted-proxy échoue de manière fermée pour les requests provenant de la boucle locale, sauf si `gateway.auth.trustedProxy.allowLoopback` est explicitement activé pour un proxy sur le même hôte.
- [ ] **Le proxy supprime les en-têtes** : Votre proxy remplace (et n'ajoute pas à) les en-têtes `x-forwarded-*` provenant des clients.
- [ ] **Terminaison TLS** : Votre proxy gère le TLS ; les utilisateurs se connectent via HTTPS.
- [ ] **allowedOrigins est explicite** : L'interface de contrôle (Control UI) non-bouclée utilise un `gateway.controlUi.allowedOrigins` explicite.
- [ ] **allowUsers est défini** (recommandé) : Restreindre aux utilisateurs connus plutôt que d'autoriser toute personne authentifiée.
- [ ] **Pas de configuration de jetons mixte** : Ne définissez pas à la fois `gateway.auth.token` et `gateway.auth.mode: "trusted-proxy"`.
- [ ] **Le repli mot de passe local est privé** : Si vous configurez `gateway.auth.password` pour les appelants directs internes, gardez le port du Gateway derrière un pare-feu afin que les clients distants non-proxy ne puissent pas l'atteindre directement.

## Audit de sécurité

`openclaw security audit` signalera l'authentification trusted-proxy avec une conclusion de gravité **critique**. C'est intentionnel — c'est un rappel que vous déléguez la sécurité à votre configuration de proxy.

L'audit vérifie :

- Rappel d'avertissement/critique de base `gateway.trusted_proxy_auth`
- Configuration `trustedProxies` manquante
- Configuration `userHeader` manquante
- `allowUsers` vide (autorise tout utilisateur authentifié)
- `allowLoopback` activé pour les sources proxy sur le même hôte
- Stratégie d'origine navigateur générique ou manquante sur les surfaces de l'interface de contrôle exposées

## Dépannage

<AccordionGroup>
  <Accordion title="trusted_proxy_untrusted_source">
    La requête ne provenait pas d'une adresse IP présente dans `gateway.trustedProxies`. Vérifiez :

    - L'adresse IP du proxy est-elle correcte ? (Les IP des conteneurs Docker peuvent changer.)
    - Y a-t-il un équilibreur de charge devant votre proxy ?
    - Utilisez `docker inspect` ou `kubectl get pods -o wide` pour trouver les adresses IP réelles.

  </Accordion>
  <Accordion title="trusted_proxy_loopback_source"OpenClaw>
    OpenClaw a rejeté une demande de proxy de confiance provenant d'une adresse de rebouclage.

    Vérifiez :

    - Le proxy se connecte-t-il à partir de `127.0.0.1` / `::1` ?
    - Essayez-vous d'utiliser l'authentification par proxy de confiance avec un proxy inverse de rebouclage sur le même hôte ?

    Solution :

    - Privilégiez l'authentification par jeton/mot de passe pour les clients internes sur le même hôte qui ne passent pas par le proxy, ou
    - Acheminez via une adresse de proxy de confiance non rebouclage et conservez cette IP dans `gateway.trustedProxies`, ou
    - Pour un proxy inverse délibéré sur le même hôte, définissez `gateway.auth.trustedProxy.allowLoopback = true`, conservez l'adresse de rebouclage dans `gateway.trustedProxies`, et assurez-vous que le proxy supprime ou écrase les en-têtes d'identité.

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
    L'utilisateur est authentifié mais n'est pas dans `allowUsers`. Soit ajoutez-le, soit supprimez la liste d'autorisation.
  </Accordion>
  <Accordion title="trusted_proxy_origin_not_allowed">
    L'authentification par proxy de confiance a réussi, mais l'en-tête `Origin` du navigateur n'a pas réussi les vérifications d'origine de l'interface de contrôle.

    Vérifiez :

    - `gateway.controlUi.allowedOrigins` inclut l'origine exacte du navigateur.
    - Vous ne vous fiez pas aux origines génériques, sauf si vous souhaitez intentionnellement un comportement d'autorisation totale.
    - Si vous utilisez intentionnellement le mode de repli de l'en-tête Host, `gateway.controlUi.dangerouslyAllowHostHeaderOriginFallback=true` est défini délibérément.

  </Accordion>
  <Accordion title="Connection succeeds but methods report missing scope">
    La WebSocket se connecte, mais `chat.history` ou `sessions.list` échoue avec
    `missing scope: operator.read`.

    C'est le comportement attendu pour les connexions WebSocket trusted-proxy sans identité
    d'appareil. Les connexions sans identité d'appareil voient leurs portées (scopes) effacées. Le
    navigateur ne peut pas générer d'identité d'appareil via HTTP simple.

    Solution :

    - Définissez `gateway.controlUi.dangerouslyDisableDeviceAuth: true` pour préserver les portées de l'opérateur sur les connexions WebSocket trusted-proxy, ou
    - Utilisez l'appariement d'identité d'appareil afin que les portées soient liées au jeton de l'appareil.

  </Accordion>
  <Accordion title="WebSocket still failing">
    Assurez-vous que votre proxy :

    - Prend en charge les mises à niveau WebSocket (`Upgrade: websocket`, `Connection: upgrade`).
    - Transmet les en-têtes d'identité lors des demandes de mise à niveau WebSocket (et pas seulement HTTP).
    - N'a pas de chemin d'authentification distinct pour les connexions WebSocket.

  </Accordion>
</AccordionGroup>

## Migration depuis l'authentification par jeton

Si vous passez de l'authentification par jeton à trusted-proxy :

<Steps>
  <Step title="Configure the proxy">Configurez votre proxy pour authentifier les utilisateurs et transmettre les en-têtes.</Step>
  <Step title="Test the proxy independently">Testez la configuration du proxy indépendamment (curl avec en-têtes).</Step>
  <Step title="Update OpenClaw config" OpenClaw>
    Mettez à jour la configuration OpenClaw avec l'authentification trusted-proxy.
  </Step>
  <Step title="Restart the Gateway" Gateway>
    Redémarrez le Gateway.
  </Step>
  <Step title="Test WebSocket">Testez les connexions WebSocket depuis l'interface de contrôle (Control UI).</Step>
  <Step title="Audit">Exécutez `openclaw security audit` et examinez les résultats.</Step>
</Steps>

## Connexes

- [Configuration](/fr/gateway/configuration) — référence de configuration
- [Accès distant](/fr/gateway/remote) — autres modèles d'accès distant
- [Sécurité](/fr/gateway/security) — guide complet sur la sécurité
- [Tailscale](/fr/gateway/tailscale) — alternative plus simple pour l'accès exclusif au tailnet
