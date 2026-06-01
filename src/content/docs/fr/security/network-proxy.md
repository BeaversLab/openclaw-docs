---
summary: "OpenClawComment router le trafic HTTP et WebSocket d'exécution OpenClaw via un proxy de filtrage géré par l'opérateur"
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
- Couverture JavaScript plus large : acheminez les clients `fetch`, `node:http`, `node:https`, WebSocket, axios, got, node-fetch et similaires via le même chemin.
- Auditabilité : journalisez les destinations autorisées et refusées à la frontière de sortie.
- Contrôle opérationnel : appliquez des règles de destination, une segmentation du réseau, des limites de débit ou des listes d'autorisation de sortie sans avoir à reconstruire OpenClaw.

Le routage via proxy est une barrière de sécurité au niveau du processus pour la sortie HTTP et WebSocket normale. Il offre aux opérateurs un chemin fermé par défaut (fail-closed) pour acheminer les clients HTTP JavaScript pris en charge via leur propre proxy de filtrage, mais ce n'est pas un bac à sable réseau au niveau du système d'exploitation et ne fait pas certifier la stratégie de destination du proxy par OpenClaw.

## Comment OpenClaw achemine le trafic

Lorsque `proxy.enabled=true` et une URL de proxy sont configurés, les processus d'exécution protégés tels que `openclaw gateway run`, `openclaw node run` et `openclaw agent --local` acheminent le trafic de sortie HTTP et WebSocket normal via le proxy configuré :

```text
OpenClaw process
  fetch                  -> operator-managed filtering proxy -> public internet
  node:http and https    -> operator-managed filtering proxy -> public internet
  WebSocket clients      -> operator-managed filtering proxy -> public internet
```

Le contrat public porte sur le comportement du routage, et non sur les hooks internes de Node utilisés pour le mettre en œuvre. Les clients WebSocket du plan de contrôle OpenClaw Gateway utilisent un chemin direct étroit pour le trafic RPC GatewayRPC en boucle locale lorsque l'URL du Gateway utilise `localhost` ou une adresse IP de boucle locale littérale telle que `127.0.0.1` ou `[::1]`. Ce chemin de contrôle doit pouvoir atteindre les passerelles en boucle locale même lorsque le proxy de l'opérateur bloque les destinations de boucle locale. Les requêtes HTTP et WebSocket d'exécution normales utilisent toujours le proxy configuré.

En interne, OpenClaw installe Proxyline comme runtime de routage au niveau du processus pour cette fonctionnalité. Proxyline couvre `fetch`, les clients basés sur undici, les appelants du `node:http` / `node:https` de Node core, les clients WebSocket courants et les tunnels CONNECT créés par des helpers. Le mode de proxy géré remplace les agents HTTP Node fournis par l'appelant afin que les agents explicites ne contournent pas accidentellement le proxy de l'opérateur.

Certains plugins possèdent des transports personnalisés qui nécessitent un câblage explicite du proxy, même lorsque le routage au niveau du processus existe. Par exemple, le transport de l'API Bot de TelegramAPI utilise son propre répartiteur undici HTTP/1 et honore donc les variables d'environnement du proxy de processus ainsi que le repli géré `OPENCLAW_PROXY_URL` dans ce chemin de transport spécifique au propriétaire.

L'URL du proxy elle-même peut utiliser `http://` ou `https://`. Ces schémas décrivent la connexion de OpenClaw au point de terminaison du proxy :

- `http://proxy.example:3128` : OpenClaw ouvre une connexion TCP simple vers le proxy de transfert et envoie des requêtes de proxy HTTP, y compris `CONNECT` pour les destinations HTTPS.
- `https://proxy.example:8443` : OpenClaw ouvre une session TLS vers le point de terminaison du proxy, vérifie le certificat du proxy, puis envoie des requêtes de proxy HTTP à l'intérieur de cette session TLS.

Le HTTPS de destination est distinct du TLS du point de terminaison du proxy. Pour une destination HTTPS, OpenClaw demande toujours au proxy un tunnel HTTP `CONNECT`, puis lance le TLS de destination via ce tunnel.

Tant que le proxy est actif, OpenClaw efface `no_proxy` et `NO_PROXY`. Ces listes de contournement sont basées sur la destination, donc laisser `localhost` ou `127.0.0.1` permettrait aux cibles SSRF à haut risque de contourner le proxy de filtrage.

À l'arrêt, OpenClaw restaure l'environnement proxy précédent et réinitialise l'état du routage de processus mis en cache.

## Termes de proxy connexes

- `proxy.enabled` / `proxy.proxyUrl` : routage du proxy de transfert sortant pour le trafic sortant du runtime OpenClaw. Cette page documente cette fonctionnalité.
- `gateway.auth.mode: "trusted-proxy"` : authentification reverse-proxy entrante sensible à l'identité pour l'accès à la Gateway. Voir [Authentification de proxy de confiance](/fr/gateway/trusted-proxy-auth).
- `openclaw proxy` : proxy de débogage local et inspecteur de capture pour le développement et le support. Voir [proxy openclaw](/fr/cli/proxy).
- `tools.web.fetch.useTrustedEnvProxy` : option pour `web_fetch` permettant à un proxy d'environnement HTTP(S) contrôlé par l'opérateur de résoudre le DNS tout en conservant le paramètre DNS strict et la stratégie de nom d'hôte par défaut. Voir [Récupération Web](/fr/tools/web-fetch#trusted-env-proxy).
- Paramètres de proxy spécifiques au canal ou au provider : remplacements spécifiques au propriétaire pour un transport particulier. Privilégiez le proxy réseau géré lorsque l'objectif est un contrôle centralisé de la sortie sur l'environnement d'exécution.

## Configuration

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
```

Pour un point de terminaison proxy HTTPS avec une autorité de certification (CA) proxy privée :

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

Vous pouvez également fournir l'URL via l'environnement, tout en conservant `proxy.enabled=true` dans la configuration :

```bash
OPENCLAW_PROXY_URL=http://127.0.0.1:3128 openclaw gateway run
```

`proxy.proxyUrl` prend la priorité sur `OPENCLAW_PROXY_URL`.

### Gateway Loopback Mode

Les clients du plan de contrôle de la Gateway locale se connectent généralement à un WebSocket de boucle locale (loopback) tel que `ws://127.0.0.1:18789`. Utilisez `proxy.loopbackMode` pour choisir comment se comportent les exceptions de proxy géré pour la boucle locale lorsque le proxy géré est actif :

```yaml
proxy:
  enabled: true
  proxyUrl: http://127.0.0.1:3128
  loopbackMode: gateway-only # gateway-only, proxy, or block
```

- `gateway-only` (par défaut) : OpenClaw enregistre l'autorité de boucle locale de la Gateway dans la stratégie de contournement géré de Proxyline afin que le traffic WebSocket de la Gateway locale puisse se connecter directement. Les ports de boucle locale personnalisés de la Gateway fonctionnent car l'hôte et le port de l'URL active de la Gateway sont enregistrés. Le plugin de navigateur inclus peut également enregistrer les points de terminaison WebSocket exacts de préparation CDP et DevTools locaux pour les navigateurs gérés lancés par OpenClaw, et le provider d'intégration de mémoire Ollama inclus peut utiliser son propre chemin direct gardé plus étroit pour l'origine d'intégration de boucle locale hôte-local exactement configurée.
- `proxy` : OpenClaw n'enregistre pas les contournements de boucle locale pour la Gateway ou Ollama, de sorte que le trafic de boucle locale est envoyé via le proxy géré. Si le proxy est distant, il doit fournir un routage spécial pour le service de boucle locale de l'hôte OpenClaw, tel qu'en le mappant à un nom d'hôte, une IP ou un tunnel accessible par proxy. Les proxies distants standard résolvent `127.0.0.1` et `localhost` depuis l'hôte du proxy, et non depuis l'hôte OpenClaw.
- `block`OpenClawGatewayOllama : OpenClaw refuse les connexions du plan de contrôle en boucle locale de Gateway et les connexions en boucle locale d'intégration hébergées et protégées d'Ollama avant l'ouverture d'un socket.

Si `enabled=true` mais qu'aucune URL de proxy valide n'est configurée, les commandes protégées échouent au démarrage au lieu de revenir à un accès réseau direct.

Pour les services de passerelle gérés démarrés avec `openclaw gateway start`, il est préférable de stocker l'URL dans la configuration :

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl http://127.0.0.1:3128
openclaw gateway install --force
openclaw gateway start
```

La variable d'environnement de secours est idéale pour les exécutions au premier plan. Si vous l'utilisez avec un service installé, placez `OPENCLAW_PROXY_URL` dans l'environnement durable du service, tel que `$OPENCLAW_STATE_DIR/.env` ou `~/.openclaw/.env`, puis réinstallez le service afin que launchd, systemd ou les tâches planifiées démarrent la passerelle avec cette valeur.

Pour les commandes `openclaw --container ...`, OpenClaw transfère `OPENCLAW_PROXY_URL` vers le CLI enfant ciblé sur le conteneur lorsqu'il est défini. L'URL doit être accessible depuis l'intérieur du conteneur ; `127.0.0.1` fait référence au conteneur lui-même, et non à l'hôte. OpenClaw rejette les URL de proxy de bouclage pour les commandes ciblées sur le conteneur, sauf si vous remplacez explicitement cette vérification de sécurité.

## Exigences du proxy

La stratégie de proxy est la limite de sécurité. OpenClaw ne peut pas vérifier que le proxy bloque les bonnes cibles.

Configurez le proxy pour :

- Se lier uniquement au bouclage ou à une interface privée de confiance.
- Restreindre l'accès afin que seul le processus OpenClaw, l'hôte, le conteneur ou le compte de service puisse l'utiliser.
- Résoudre les destinations lui-même et bloquer les IP de destination après la résolution DNS.
- Appliquer la stratégie au moment de la connexion pour les requêtes HTTP simples et les tunnels HTTPS `CONNECT`.
- Rejeter les contournements basés sur la destination pour le bouclage, les privés, les liaison-locaux, les métadonnées, le multidiffusion, les réservés ou les plages de documentation.
- Évitez les listes d'autorisation de noms d'hôte sauf si vous faites entièrement confiance au chemin de résolution DNS.
- Journaliser la destination, la décision, le statut et la raison sans journaliser les corps de requête, les en-têtes d'autorisation, les cookies ou autres secrets.
- Gardez la stratégie de proxy sous contrôle de version et examinez les modifications comme une configuration sensible à la sécurité.

## Destinations bloquées recommandées

Utilisez cette liste de refus comme point de départ pour tout proxy de transfert, pare-feu ou stratégie de sortie.

La logique de classificateur au niveau de l'application OpenClaw réside dans `src/infra/net/ssrf.ts` et `packages/net-policy/src/ip.ts`. Les hooks de parité pertinents sont `BLOCKED_HOSTNAMES`, `BLOCKED_IPV4_SPECIAL_USE_RANGES`, `BLOCKED_IPV6_SPECIAL_USE_RANGES`, `RFC2544_BENCHMARK_PREFIX`, ainsi que la gestion intégrée des sentinelles IPv4 pour NAT64, 6to4, Teredo, ISATAP et les formes mappées IPv4. Ces fichiers constituent des références utiles lors de la maintenance d'une stratégie de proxy externe, mais OpenClaw n'exporte ni n'applique automatiquement ces règles dans votre proxy.

| Plage ou hôte                                                                        | Pourquoi bloquer                                                |
| ------------------------------------------------------------------------------------ | --------------------------------------------------------------- |
| `127.0.0.0/8`, `localhost`, `localhost.localdomain`                                  | Boucle locale IPv4                                              |
| `::1/128`                                                                            | Boucle locale IPv6                                              |
| `0.0.0.0/8`, `::/128`                                                                | Adresses non spécifiées et de ce réseau                         |
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`                                      | Réseaux privés RFC1918                                          |
| `169.254.0.0/16`, `fe80::/10`                                                        | Adresses lien-local et chemins de métadonnées cloud courants    |
| `169.254.169.254`, `metadata.google.internal`                                        | Services de métadonnées cloud                                   |
| `100.64.0.0/10`                                                                      | Espace d'adressage partagé NAT de opérateur (Carrier-grade NAT) |
| `198.18.0.0/15`, `2001:2::/48`                                                       | Plages de benchmarking                                          |
| `192.0.0.0/24`, `192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32` | Plages à usage spécial et de documentation                      |
| `224.0.0.0/4`, `ff00::/8`                                                            | Multidiffusion                                                  |
| `240.0.0.0/4`                                                                        | IPv4 réservée                                                   |
| `fc00::/7`, `fec0::/10`                                                              | Plages locales/privées IPv6                                     |
| `100::/64`, `2001:20::/28`                                                           | Plages de rejet IPv6 et ORCHIDv2                                |
| `64:ff9b::/96`, `64:ff9b:1::/48`                                                     | Préfixes NAT64 avec IPv4 intégrée                               |
| `2002::/16`, `2001::/32`                                                             | 6to4 et Teredo avec IPv4 intégrée                               |
| `::/96`, `::ffff:0:0/96`                                                             | IPv4-compatible et IPv4-mapped IPv6                             |

Si votre fournisseur cloud ou votre plateforme réseau documente des hôtes de métadonnées ou des plages réservées supplémentaires, ajoutez-les également.

## Validation

Validez le proxy depuis le même hôte, conteneur ou compte de service qui exécute OpenClaw :

```bash
openclaw proxy validate --proxy-url http://127.0.0.1:3128
```

Pour un point de terminaison proxy HTTPS signé par une autorité de certification privée :

```bash
openclaw proxy validate --proxy-url https://proxy.corp.example:8443 --proxy-ca-file /etc/openclaw/proxy-ca.pem
```

Par défaut, lorsque aucune destination personnalisée n'est fournie, la commande vérifie que `https://example.com/` réussit et démarre une sonde de bouclage temporaire que le proxy ne doit pas atteindre. La vérification de refus par défaut réussit lorsque le proxy renvoie une réponse de refus non-2xx ou bloque la sonde avec une erreur de transport ; elle échoue si une réponse réussie atteint la sonde. Si aucun proxy n'est activé et configuré, la validation signale un problème de configuration ; utilisez `--proxy-url` pour une vérification préalable ponctuelle avant de modifier la configuration. Utilisez `--allowed-url` et `--denied-url` pour tester les attentes spécifiques au déploiement. Ajoutez `--apns-reachable` pour vérifier également que la livraison HTTP/2 APNs directe peut ouvrir un tunnel CONNECT via le proxy et recevoir une réponse APNs de bac à sable ; la sonde utilise un jeton provider intentionnellement invalide, donc `403 InvalidProviderToken` est attendu et compte comme accessible. Les destinations de refus personnalisées sont en échec fermé : toute réponse HTTP signifie que la destination était accessible via le proxy, et toute erreur de transport est signalée comme non concluante car OpenClaw ne peut pas prouver que le proxy a bloqué une origine accessible. En cas d'échec de la validation, la commande se termine avec le code 1.

Utilisez `--json` pour l'automatisation. La sortie JSON contient le résultat global, la source de configuration proxy effective, toute erreur de configuration et chaque vérification de destination. Les informations d'identification de l'URL du proxy sont masquées dans la sortie texte et JSON :

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

La demande publique doit réussir. Les demandes de bouclage et de métadonnées doivent être bloquées par le proxy. Pour `openclaw proxy validate`, le canari de bouclage intégré peut distinguer un refus du proxy d'une origine accessible. Les vérifications `--denied-url` personnalisées ne disposent pas de ce canari, traitez donc les réponses HTTP et les échecs de transport ambigus comme des échecs de validation, sauf si votre proxy expose un signal de refus spécifique au déploiement que vous pouvez vérifier séparément.

## Confiance dans le CA du proxy

Utilisez `proxy.tls.caFile` géré lorsque le point de terminaison du proxy lui-même utilise un certificat signé par une autorité de certification (CA) privée :

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

Cette CA est utilisée pour la vérification TLS du point de terminaison du proxy. Ce n'est pas un paramètre de confiance MITM de destination, un certificat client, ni un remplacement de la stratégie de destination du proxy.

Utilisez `NODE_EXTRA_CA_CERTS` uniquement lorsque l'ensemble du processus Node doit faire confiance à une CA supplémentaire dès le démarrage du processus, par exemple lorsqu'un système d'inspection TLS d'entreprise re-signe les certificats de destination pour chaque client HTTPS du processus. `NODE_EXTRA_CA_CERTS` est global au processus et doit être présent avant le démarrage de Node. Privilégiez `proxy.tls.caFile` pour la confiance du point de terminaison du proxy HTTPS, car il est limité au routage du proxy géré.

Activez ensuite le routage du proxy OpenClaw :

```bash
openclaw config set proxy.enabled true
openclaw config set proxy.proxyUrl https://proxy.corp.example:8443
openclaw config set proxy.tls.caFile /etc/openclaw/proxy-ca.pem
openclaw gateway run
```

ou définissez :

```yaml
proxy:
  enabled: true
  proxyUrl: https://proxy.corp.example:8443
  tls:
    caFile: /etc/openclaw/proxy-ca.pem
```

## Limites

- Le proxy améliore la couverture pour les clients HTTP et WebSocket JavaScript locaux au processus, mais il ne s'agit pas d'un bac à sable réseau au niveau de l'OS.
- Le trafic du plan de contrôle en boucle locale de Gateway est réglé par défaut sur un contournement local direct via Gateway`proxy.loopbackMode: "gateway-only"`OpenClawGateway. OpenClaw implémente ce contournement en enregistrant l'autorité de boucle locale Gateway active dans la stratégie de contournement gérée de Proxyline. Les opérateurs peuvent définir `proxy.loopbackMode: "proxy"`Gateway pour envoyer le trafic en boucle locale de Gateway via le proxy géré, ou `proxy.loopbackMode: "block"`GatewayGateway pour refuser les connexions en boucle locale de Gateway. Consultez [Gateway Loopback Mode](#gateway-loopback-mode) pour la mise en garde concernant le proxy distant.
- Les sockets bruts `net`, `tls` et `http2`OpenClawOpenClaw, les modules natifs et les processus enfants non-OpenClaw peuvent contourner le routage du proxy au niveau Node, à moins qu'ils n'héritent et ne respectent les variables d'environnement du proxy. Les processus enfants CLI d'OpenClaw forkés héritent de l'URL du proxy géré et de l'état `proxy.loopbackMode`.
- IRC est un canal TCP/TLS brut en dehors du routage du proxy de transfert géré par l'opérateur. Dans les déploiements qui nécessitent que tout le trafic sortant passe par ce proxy de transfert, définissez `channels.irc.enabled=false`, sauf si la sortie IRC directe est explicitement approuvée.
- Le proxy de débogage local est un outil de diagnostic et son transfert direct en amont pour les requêtes proxy et les tunnels CONNECT est désactivé par défaut lorsque le mode de proxy géré est actif ; n'activez le transfert direct que pour les diagnostics locaux approuvés.
- Les WebUI locales de l'utilisateur et les serveurs de modèle locaux doivent être ajoutés à la liste d'autorisation (allowlisted) dans la stratégie de proxy de l'opérateur si nécessaire ; OpenClaw n'expose pas de contournement général de réseau local pour eux. Le fournisseur d'intégration de mémoire Ollama inclus est plus restreint : il peut utiliser un chemin direct protégé uniquement pour l'origine d'intégration en boucle locale exacte de l'hôte dérivée du OpenClawOllama`baseUrl`Ollama configuré, afin que les intégrations locales continuent de fonctionner lorsque le proxy géré ne peut pas atteindre la boucle locale de l'hôte. Les hôtes d'intégration Ollama LAN, tailnet, réseau privé et public utilisent toujours le chemin du proxy géré. `proxy.loopbackMode: "proxy"`Ollama envoie ce trafic en boucle locale Ollama via le proxy géré, et `proxy.loopbackMode: "block"` le refuse avant l'ouverture d'une connexion.
- Le contournement du proxy du plan de contrôle de Gateway est intentionnellement limité à Gateway`localhost` et aux URL d'IP en boucle locale littérales. Utilisez `ws://127.0.0.1:18789`, `ws://[::1]:18789` ou `ws://localhost:18789`Gateway pour les connexions directes locales du plan de contrôle de Gateway ; les autres noms d'hôte sont routés comme le trafic ordinaire basé sur le nom d'hôte.
- OpenClaw n'inspecte, ne teste ni ne certifie votre stratégie de proxy.
- Traitez les modifications de la stratégie de proxy comme des modifications opérationnelles sensibles à la sécurité.

| Surface                                                        | Statut du proxy géré                                                                                                      |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `fetch`, `node:http`, `node:https`, clients WebSocket courants | Routé via les hooks du proxy géré lorsqu'il est configuré.                                                                |
| HTTP/2 direct APNs                                             | Routé via l'assistant CONNECT géré APNs.                                                                                  |
| Bouclage du plan de contrôle du Gateway                        | Direct uniquement pour l'URL du Gateway en bouclage locale configurée.                                                    |
| Transfert en amont du proxy de débogage                        | Désactivé tant que le mode de proxy géré est actif, sauf s'il est explicitement activé pour les diagnostics locaux.       |
| IRC                                                            | TCP/TLS brut ; non pris en charge par le mode de proxy HTTP géré. Désactivez sauf si la sortie IRC directe est approuvée. |
| Autres appels bruts de clients `net`, `tls` ou `http2`         | Doit être classé par le gardien de socket brut avant l'atterrissage.                                                      |
