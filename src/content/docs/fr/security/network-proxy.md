---
summary: "Comment faire router le trafic HTTP et WebSocket d'exécution OpenClaw via un proxy de filtrage géré par l'opérateur"
title: "Proxy réseau"
read_when:
  - You want defense-in-depth against SSRF and DNS rebinding attacks
  - Configuring an external forward proxy for OpenClaw runtime traffic
---

OpenClaw peut faire router le trafic HTTP et WebSocket d'exécution via un proxy de transfert géré par l'opérateur. Il s'agit d'une défense en profondeur facultative pour les déploiements qui souhaitent un contrôle centralisé de la sortie, une protection SSRF plus renforcée et une meilleure auditabilité du réseau.

OpenClaw n'expédie, ne télécharge, ne démarre, ne configure ni ne certifie de proxy. Vous exécutez la technologie de proxy qui convient à votre environnement, et OpenClaw fait passer les clients HTTP et WebSocket normaux locaux au processus par ce biais.

## Pourquoi utiliser un proxy

Un proxy offre aux opérateurs un point de contrôle réseau unique pour le trafic HTTP et WebSocket sortant. Cela peut être utile même en dehors du durcissement SSRF :

- Stratégie centralisée : maintenez une stratégie de sortie unique au lieu de vous fier à chaque site d'appel HTTP de l'application pour appliquer correctement les règles réseau.
- Vérifications au moment de la connexion : évaluez la destination après la résolution DNS et immédiatement avant que le proxy n'ouvre la connexion amont.
- Défense contre le rebond DNS : réduisez l'écart entre une vérification DNS au niveau de l'application et la connexion sortante réelle.
- Couverture JavaScript plus large : acheminez les clients ordinaires `fetch`, `node:http`, `node:https`, WebSocket, axios, got, node-fetch et similaires par le même chemin.
- Auditabilité : journalisez les destinations autorisées et refusées à la frontière de sortie.
- Contrôle opérationnel : appliquez des règles de destination, une segmentation du réseau, des limites de débit ou des listes d'autorisation de sortie sans avoir à reconstruire OpenClaw.

Le routage via proxy est une barrière de sécurité au niveau du processus pour la sortie HTTP et WebSocket normale. Il offre aux opérateurs un chemin fermé par défaut (fail-closed) pour acheminer les clients HTTP JavaScript pris en charge via leur propre proxy de filtrage, mais ce n'est pas un bac à sable réseau au niveau du système d'exploitation et ne fait pas certifier la stratégie de destination du proxy par OpenClaw.

## Comment OpenClaw achemine le trafic

Lorsque `proxy.enabled=true` et une URL de proxy sont configurées, les processus d'exécution protégés tels que `openclaw gateway run`, `openclaw node run` et `openclaw agent --local` acheminent le trafic de sortie HTTP et WebSocket normal via le proxy configuré :

```text
OpenClaw process
  fetch                  -> operator-managed filtering proxy -> public internet
  node:http and https    -> operator-managed filtering proxy -> public internet
  WebSocket clients      -> operator-managed filtering proxy -> public internet
```

Le contrat public est le comportement de routage, et non les crochets internes Node utilisés pour le mettre en œuvre. Les clients WebSocket du plan de contrôle d'OpenClaw Gateway utilisent un chemin direct étroit pour le trafic RPC de Gateway en local loopback lorsque l'URL de la Gateway utilise OpenClawGatewayGatewayRPCGateway`localhost` ou une IP de bouclage littérale telle que `127.0.0.1` ou `[::1]`. Ce chemin de plan de contrôle doit être capable d'atteindre les Gateways en bouclage même lorsque le proxy de l'opérateur bloque les destinations de bouclage. Les requêtes HTTP et WebSocket d'exécution normales utilisent toujours le proxy configuré.

En interne, OpenClaw utilise deux crochets de routage au niveau du processus pour cette fonctionnalité :

- Le routage du répartiteur Undici couvre `fetch`, les clients basés sur undici et les transports qui fournissent leur propre répartiteur undici.
- Le routage `global-agent` couvre les appelants du cœur `node:http` et `node:https` de Node, y compris de nombreuses bibliothèques superposées à `http.request`, `https.request`, `http.get` et `https.get`. Le mode de proxy géré force cet agent global afin que les agents HTTP Node explicites ne contournent pas accidentellement le proxy de l'opérateur.

Certains plugins possèdent des transports personnalisés qui nécessitent un câblage de proxy explicite même lorsque le routage au niveau du processus existe. Par exemple, le transport de l'API Bot de Telegram utilise son propre répartiteur undici HTTP/1 et honore donc l'environnement de proxy de processus ainsi que le repli TelegramAPI`OPENCLAW_PROXY_URL` géré dans ce chemin de transport spécifique au propriétaire.

L'URL du proxy elle-même doit utiliser `http://`. Les destinations HTTPS sont toujours prises en charge via le proxy avec HTTP `CONNECT` ; cela signifie simplement que OpenClaw s'attend à un écouteur de proxy de transfert HTTP brut tel que `http://127.0.0.1:3128`.

Tant que le proxy est actif, OpenClaw efface `no_proxy`, `NO_PROXY` et `GLOBAL_AGENT_NO_PROXY`. Ces listes de contournement sont basées sur la destination, donc laisser `localhost` ou `127.0.0.1` là permettrait aux cibles SSRF à risque élevé de sauter le proxy de filtrage.

À l'arrêt, OpenClaw restaure l'environnement proxy précédent et réinitialise l'état de routage de processus mis en cache.

## Termes liés au proxy

- `proxy.enabled` / `proxy.proxyUrl` : routage de proxy de transfert sortant pour le trafic sortant d'exécution OpenClaw. Cette page documente cette fonctionnalité.
- `gateway.auth.mode: "trusted-proxy"` : authentification de proxy inverse consciente de l'identité entrante pour l'accès Gateway. Voir [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth).
- `openclaw proxy` : proxy de débogage local et inspecteur de capture pour le développement et le support. Voir [openclaw proxy](/fr/cli/proxy).
- `tools.web.fetch.useTrustedEnvProxy` : option d'adhésion pour `web_fetch` afin de permettre à un proxy d'environnement HTTP(S) contrôlé par l'opérateur de résoudre le DNS tout en conservant le stratégie d'épinglage DNS stricte et de nom d'hôte par défaut. Voir [Récupération Web](/fr/tools/web-fetch#trusted-env-proxy).
- Paramètres de proxy spécifiques au canal ou au fournisseur : remplacements spécifiques au propriétaire pour un transport particulier. Préférez le proxy réseau géré lorsque l'objectif est un contrôle centralisé de la sortie sur l'exécution.

## Configuration

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

Vous pouvez également fournir l'URL via l'environnement, tout en gardant `proxy.enabled=true` dans la configuration :

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` prend le pas sur `OPENCLAW_PROXY_URL`.

### Mode bouclage Gateway

Les clients du plan de contrôle du Gateway local se connectent généralement à un WebSocket de bouclage (loopback) tel que `ws://127.0.0.1:18789`. Utilisez `proxy.loopbackMode` pour choisir le comportement de ce trafic lorsque le proxy géré est actif :

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
  loopbackMode: gateway-only # gateway-only, proxy, or block
```

- `gateway-only` (par défaut) : OpenClaw enregistre l'autorité de bouclage du Gateway dans le contrôleur `global-agent` `NO_PROXY` actif afin que le trafic WebSocket local du Gateway puisse se connecter directement. Les ports de bouclage personnalisés du Gateway fonctionnent car l'hôte et le port de l'URL Gateway active sont enregistrés.
- `proxy` : OpenClaw n'enregistre pas d'autorité de bouclage Gateway `NO_PROXY`, le trafic local du Gateway est donc envoyé via le proxy géré. Si le proxy est distant, il doit fournir un routage spécial pour le service de bouclage de l'hôte OpenClaw, par exemple en le mappant à un nom d'hôte, une IP ou un tunnel accessible par le proxy. Les proxies distants standard résolvent `127.0.0.1` et `localhost` à partir de l'hôte du proxy, et non de l'hôte OpenClaw.
- `block` : OpenClaw refuse les connexions du plan de contrôle de bouclage du Gateway avant l'ouverture d'un socket.

Si `enabled=true` est défini mais qu'aucune URL de proxy valide n'est configurée, les commandes protégées échouent au démarrage au lieu de revenir à un accès réseau direct.

Pour les services de passerelle gérés démarrés avec `openclaw gateway start`, il est préférable de stocker l'URL dans la configuration :

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

La solution de repli (fallback) de l'environnement est idéale pour les exécutions en premier plan. Si vous l'utilisez avec un service installé, placez `OPENCLAW_PROXY_URL` dans l'environnement durable du service, tel que `$OPENCLAW_STATE_DIR/.env` ou `~/.openclaw/.env`, puis réinstallez le service afin que launchd, systemd ou les tâches planifiées démarrent la passerelle avec cette valeur.

Pour les commandes `openclaw --container ...`, OpenClaw transfère `OPENCLAW_PROXY_URL` vers le CLI enfant ciblé sur le conteneur lorsqu'il est défini. L'URL doit être accessible depuis l'intérieur du conteneur ; `127.0.0.1` fait référence au conteneur lui-même, et non à l'hôte. OpenClaw rejette les URLs de proxy de bouclage pour les commandes ciblées sur le conteneur, sauf si vous substituez explicitement cette vérification de sécurité.

## Exigences du proxy

La stratégie du proxy constitue la limite de sécurité. OpenClaw ne peut pas vérifier que le proxy bloque les bonnes cibles.

Configurez le proxy pour :

- Se lier uniquement au bouclage ou à une interface privée de confiance.
- Restreindre l'accès afin que seul le processus OpenClaw, l'hôte, le conteneur ou le compte de service puisse l'utiliser.
- Résoudre les destinations lui-même et bloquer les IP de destination après la résolution DNS.
- Appliquer la stratégie au moment de la connexion pour les requêtes HTTP simples et les tunnels HTTPS `CONNECT`.
- Rejeter les contournements basés sur la destination pour le bouclage, le privé, le lien local, les métadonnées, le multidiffusion, les réservés ou les plages de documentation.
- Évitez les listes d'autorisation de noms d'hôte à moins de faire entièrement confiance au chemin de résolution DNS.
- Journaliser la destination, la décision, le statut et la raison sans journaliser les corps de requête, les en-têtes d'autorisation, les cookies ou autres secrets.
- Gardez la stratégie de proxy sous contrôle de version et examinez les modifications comme une configuration sensible à la sécurité.

## Destinations bloquées recommandées

Utilisez cette liste de refus comme point de départ pour tout proxy de transfert, pare-feu ou stratégie de sortie.

La logique de classificateur au niveau de l'application de OpenClaw réside dans `src/infra/net/ssrf.ts` et `src/shared/net/ip.ts`. Les crochets de parité pertinents sont `BLOCKED_HOSTNAMES`, `BLOCKED_IPV4_SPECIAL_USE_RANGES`, `BLOCKED_IPV6_SPECIAL_USE_RANGES`, `RFC2544_BENCHMARK_PREFIX`, et la gestion intégrée de la sentinelle IPv4 pour NAT64, 6to4, Teredo, ISATAP et les formes mappées IPv4. Ces fichiers sont des références utiles lors de la maintenance d'une stratégie de proxy externe, mais OpenClaw n'exporte ni n'applique automatiquement ces règles dans votre proxy.

| Plage ou hôte                                                                        | Pourquoi bloquer                                              |
| ------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| `127.0.0.0/8`, `localhost`, `localhost.localdomain`                                  | Bouclage IPv4                                                 |
| `::1/128`                                                                            | Bouclage IPv6                                                 |
| `0.0.0.0/8`, `::/128`                                                                | Adresses non spécifiées et de ce réseau                       |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`                                      | Réseaux privés RFC1918                                        |
| `169.254.0.0/16`, `fe80::/10`                                                        | Adresses lien-local et chemins courants des métadonnées cloud |
| `169.254.169.254`, `metadata.google.internal`                                        | Services de métadonnées cloud                                 |
| `100.64.0.0/10`                                                                      | Espace d'adressage partagé NAT de niveau opérateur            |
| `198.18.0.0/15`, `2001:2::/48`                                                       | Plages de benchmarking                                        |
| `192.0.0.0/24`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | Plages à usage spécial et de documentation                    |
| `224.0.0.0/4`, `ff00::/8`                                                            | Multidiffusion                                                |
| `240.0.0.0/4`                                                                        | IPv4 réservé                                                  |
| `fc00::/7`, `fec0::/10`                                                              | Plages locales/privées IPv6                                   |
| `100::/64`, `2001:20::/28`                                                           | Plages de rejet IPv6 et ORCHIDv2                              |
| `64:ff9b::/96`, `64:ff9b:1::/48`                                                     | Préfixes NAT64 avec IPv4 intégré                              |
| `2002::/16`, `2001::/32`                                                             | 6to4 et Teredo avec IPv4 intégré                              |
| `::/96`, `::ffff:0:0/96`                                                             | IPv6 compatible IPv4 et mappé IPv4                            |

Si votre fournisseur cloud ou votre plateforme réseau documente des hôtes de métadonnées ou des plages réservées supplémentaires, ajoutez-les également.

## Validation

Validez le proxy à partir du même hôte, conteneur ou compte de service qui exécute OpenClaw :

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

Par défaut, lorsque aucune destination personnalisée n'est fournie, la commande vérifie que `https://example.com/` réussit et démarre un canary de bouclage temporaire que le proxy ne doit pas atteindre. La vérification de refus par défaut réussit lorsque le proxy renvoie une réponse de refus non-2xx ou bloque le canary avec un échec de transport ; elle échoue si une réponse réussie atteint le canary. Si aucun proxy n'est activé et configuré, la validation signale un problème de configuration ; utilisez `--proxy-url` pour une vérification préalable ponctuelle avant de modifier la configuration. Utilisez `--allowed-url` et `--denied-url` pour tester les attentes spécifiques au déploiement. Ajoutez `--apns-reachable` pour vérifier également que la livraison HTTP/2 APNs directe peut ouvrir un tunnel CONNECT via le proxy et recevoir une réponse APNs de sandbox ; la sonde utilise un jeton de fournisseur intentionnellement invalide, donc `403 InvalidProviderToken` est attendu et compte comme étant accessible. Les destinations refusées personnalisées sont en échec fermé : toute réponse HTTP signifie que la destination était accessible via le proxy, et toute erreur de transport est signalée comme non concluante car OpenClaw ne peut pas prouver que le proxy a bloqué une origine accessible. En cas d'échec de la validation, la commande se termine avec le code 1.

Utilisez `--json` pour l'automatisation. La sortie JSON contient le résultat global, la source de la configuration proxy effective, toutes les erreurs de configuration et chaque vérification de destination. Les informations d'identification de l'URL du proxy sont masquées dans la sortie textuelle et JSON :

```json
{
  "ok": true,
  "config": {
    "enabled": true,
    "proxyUrl": "http://127.0.0.1:3128/",
    "source": "override",
    "errors": []
  },
  "checks": [
    {
      "kind": "allowed",
      "url": "https://example.com/",
      "ok": true,
      "status": 200
    },
    {
      "kind": "apns",
      "url": "https://api.sandbox.push.apple.com",
      "ok": true,
      "status": 403
    }
  ]
}
```

Vous pouvez également valider manuellement avec `curl` :

```bash
curl -x http://127.0.0.1:3128 https://example.com/
curl -x http://127.0.0.1:3128 http://127.0.0.1/
curl -x http://127.0.0.1:3128 http://169.254.169.254/
```

La demande publique doit réussir. Les demandes de bouclage et de métadonnées doivent être bloquées par le proxy. Pour `openclaw proxy validate`, le canary de bouclage intégré peut distinguer un refus de proxy d'une origine accessible. Les vérifications `--denied-url` personnalisées n'ont pas ce canary, donc traitez les réponses HTTP et les échecs de transport ambigus comme des échecs de validation, sauf si votre proxy expose un signal de refus spécifique au déploiement que vous pouvez vérifier séparément.

Activez ensuite le routage du proxy OpenClaw :

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway run
```

ou définissez :

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

## Limites

- Le proxy améliore la couverture pour les clients HTTP et WebSocket JavaScript locaux au processus, mais il ne s'agit pas d'un bac à sable réseau au niveau du système d'exploitation.
- Le trafic du plan de contrôle de boucle locale Gateway est dirigé par défaut vers un contournement local direct via Gateway`proxy.loopbackMode: "gateway-only"`OpenClawGateway. OpenClaw implémente ce contournement en enregistrant l'autorité de boucle locale Gateway active dans le contrôleur `global-agent` `NO_PROXY` géré. Les opérateurs peuvent définir `proxy.loopbackMode: "proxy"`Gateway pour envoyer le trafic de boucle locale Gateway via le proxy géré, ou `proxy.loopbackMode: "block"`GatewayGateway pour refuser les connexions de boucle locale Gateway. Consultez [Mode de boucle locale Gateway](#gateway-loopback-mode) pour l'avertissement concernant le proxy distant.
- Les sockets bruts `net`, `tls` et `http2`OpenClawOpenClaw, les modules natifs et les processus enfants non OpenClaw peuvent contourner le routage du proxy au niveau Node, sauf s'ils héritent et respectent les variables d'environnement de proxy. Les processus enfants CLI OpenClaw bifurqués héritent de l'URL du proxy géré et de l'état `proxy.loopbackMode`.
- IRC est un canal TCP/TLS brut en dehors du routage du proxy de transfert géré par l'opérateur. Dans les déploiements qui nécessitent que tout le trafic sortant passe par ce proxy de transfert, définissez `channels.irc.enabled=false` sauf si la sortie directe IRC est explicitement approuvée.
- Le proxy de débogage local est un outil de diagnostic et son transfert direct en amont pour les requêtes proxy et les tunnels CONNECT est désactivé par défaut pendant que le mode de proxy géré est actif ; n'activez le transfert direct que pour les diagnostics locaux approuvés.
- Les WebUI locaux de l'utilisateur et les serveurs de model locaux doivent figurer sur la liste d'autorisation de la stratégie de proxy de l'opérateur si nécessaire ; OpenClaw n'expose pas de contournement général de réseau local pour eux.
- Le contournement du proxy du plan de contrôle Gateway est intentionnellement limité à Gateway`localhost` et aux URL d'IP de boucle locale littérales. Utilisez `ws://127.0.0.1:18789`, `ws://[::1]:18789` ou `ws://localhost:18789`Gateway pour les connexions directes locales du plan de contrôle Gateway ; les autres noms d'hôte sont acheminés comme le trafic ordinaire basé sur le nom d'hôte.
- OpenClaw n'inspecte, ne teste ni ne certifie votre stratégie de proxy.
- Traitez les modifications de la stratégie de proxy comme des modifications opérationnelles sensibles sur le plan de la sécurité.

| Surface                                                        | Statut du proxy géré                                                                                                         |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `fetch`, `node:http`, `node:https`, clients WebSocket courants | Acheminé via les hooks de proxy géré lorsqu'il est configuré.                                                                |
| APNs direct HTTP/2                                             | Acheminé via le helper CONNECT géré APNs.                                                                                    |
| Boucle locale du plan de contrôle Gateway                      | Direct uniquement pour l'URL de la boucle locale Gateway configurée.                                                         |
| Transfert amont du proxy de débogage                           | Désactivé tant que le mode de proxy géré est actif, sauf s'il est explicitement activé pour les diagnostics locaux.          |
| IRC                                                            | TCP/TLS brut ; non pris en charge par le mode de proxy HTTP géré. Désactivez-le sauf si la sortie IRC directe est approuvée. |
| Autres appels de clients bruts `net`, `tls` ou `http2`         | Doit être classé par le garde de socket brut avant l'atterrissage.                                                           |
