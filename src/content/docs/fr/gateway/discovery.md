---
summary: "Découverte de nœuds et transports (Bonjour, Tailscale, SSH) pour trouver la passerelle"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "Discovery and Transports"
---

# Discovery & transports

OpenClaw présente deux problèmes distincts qui semblent similaires en surface :

1. **Contrôle à distance de l'opérateur** : l'application de la barre de menus macOS contrôlant une passerelle exécutée ailleurs.
2. **Appairage de nœuds** : iOS/Android (et futurs nœuds) trouvant une passerelle et s'appariant de manière sécurisée.

L'objectif de conception est de conserver toute la découverte/publicité réseau dans la **Node Gateway** (`openclaw gateway`) et de garder les clients (application Mac, iOS) en tant que consommateurs.

## Terms

- **Gateway** : un processus de passerée unique et de longue durée qui possède l'état (sessions, appariement, registre de nœuds) et exécute des canaux. La plupart des configurations en utilisent une par hôte ; les configurations multi-passereles isolées sont possibles.
- **Gateway WS (plan de contrôle)** : le point de terminaison WebSocket sur `127.0.0.1:18789` par défaut ; peut être lié au réseau local/tailnet via `gateway.bind`.
- **Transport WS direct** : un point de terminaison Gateway WS orienté réseau local/tailnet (pas de SSH).
- **Transport SSH (secours)** : contrôle à distance en transférant `127.0.0.1:18789` via SSH.
- **Pont TCP hérité (supprimé)** : ancien protocole de transport de nœud (voir
  [Protocole de pont](/fr/gateway/bridge-protocol)) ; n'est plus annoncé pour
  la découverte et ne fait plus partie des versions actuelles.

Protocol details:

- [Protocole Gateway](/fr/gateway/protocol)
- [Protocole de pont (hérité)](/fr/gateway/bridge-protocol)

## Pourquoi nous conservons à la fois le mode "direct" et SSH

- **Direct WS** offre la meilleure expérience utilisateur sur le même réseau et au sein d'un tailnet :
  - découverte automatique sur le réseau local via Bonjour
  - jetons d'appariement + ACL détenus par la passerelle
  - aucun accès shell requis ; la surface du protocole peut rester restreinte et auditable
- **SSH** reste le secours universel :
  - fonctionne partout où vous avez un accès SSH (même sur des réseaux non liés)
  - survit aux problèmes de multidiffusion/mDNS
  - ne nécessite aucun nouveau port entrant en plus de SSH

## Discovery inputs (how clients learn where the gateway is)

### 1) Découverte Bonjour / DNS-SD

Le multicast Bonjour fonctionne au mieux effort (best-effort) et ne traverse pas les réseaux. OpenClaw peut également parcourir
la même balise de passerelle via un domaine DNS-SD de zone étendue configuré, permettant ainsi à la découverte de couvrir :

- `local.` sur le même réseau local
- un domaine DNS-SD unicast configuré pour la découverte inter-réseaux

Direction de la cible :

- La **passerelle** annonce son point de terminaison WS via Bonjour.
- Les clients naviguent et affichent une liste « choisir une passerelle », puis stockent le point de terminaison choisi.

Dépannage et détails sur les balises : [Bonjour](/fr/gateway/bonjour).

#### Détails de la balise de service

- Types de service :
  - `_openclaw-gw._tcp` (balise de transport de passerelle)
- Clés TXT (non secrètes) :
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (nom d'affichage configuré par l'opérateur)
  - `lanHost=<hostname>.local`
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (uniquement lorsque TLS est activé)
  - `gatewayTlsSha256=<sha256>` (uniquement lorsque TLS est activé et que l'empreinte est disponible)
  - `canvasPort=<port>` (port d'hôte de canvas ; actuellement identique à `gatewayPort` lorsque l'hôte de canvas est activé)
  - `tailnetDns=<magicdns>` (indice optionnel ; détecté automatiquement lorsque Tailscale est disponible)
  - `sshPort=<port>` (mode mDNS complet uniquement ; le DNS-SD de zone étendue peut l'omettre, auquel cas les valeurs par défaut SSH restent à `22`)
  - `cliPath=<path>` (mode mDNS complet uniquement ; le DNS-SD de zone étendue l'écrit toujours comme un indice d'installation à distance)

Notes de sécurité :

- Les enregistrements TXT Bonjour/mDNS sont **non authentifiés**. Les clients doivent traiter les valeurs TXT uniquement comme des indices UX.
- Le routage (hôte/port) doit privilégier le **point de terminaison de service résolu** (SRV + A/AAAA) par rapport aux `lanHost`, `tailnetDns`, ou `gatewayPort` fournis par TXT.
- L'épinglage TLS ne doit jamais permettre à une `gatewayTlsSha256` annoncée de remplacer un épingle précédemment stockée.
- Les nœuds iOS/Android doivent exiger une confirmation explicite « faire confiance à cette empreinte » avant de stocker une épingle pour la première fois (vérification hors bande) chaque fois que l'itinéraire choisi est sécurisé/basé sur TLS.

Désactiver/remplacer :

- `OPENCLAW_DISABLE_BONJOUR=1` désactive la publicité.
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison du Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH annoncé lorsque `sshPort` est émis.
- `OPENCLAW_TAILNET_DNS` publie un indice `tailnetDns` (MagicDNS).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI annoncé.

### 2) Tailnet (inter-réseau)

Pour les configurations de type Londres/Vienne, Bonjour ne sera d'aucune aide. La cible « directe » recommandée est :

- Nom MagicDNS Tailscale (préféré) ou une IP tailnet stable.

Si la passerelle peut détecter qu'elle fonctionne sous Tailscale, elle publie `tailnetDns` comme indice optionnel pour les clients (y compris les balises de zone étendue).

L'application macOS préfère désormais les noms MagicDNS aux IP Tailscale brutes pour la découverte de passerelles. Cela améliore la fiabilité lorsque les IP tailnet changent (par exemple après le redémarrage des nœuds ou la réaffectation CGNAT), car les noms MagicDNS résolvent automatiquement l'IP actuelle.

Pour le jumelage de nœuds mobiles, les indices de découverte ne relâchent pas la sécurité du transport sur les itinéraires tailnet/publics :

- iOS/Android exigent toujours un chemin de connexion sécurisé pour la première fois sur tailnet/public (`wss://` ou Tailscale Serve/Funnel).
- Une IP tailnet brute découverte est un indice de routage, et non une autorisation d'utiliser une `ws://` distante en clair.
- La `ws://` en connexion directe LAN privé reste prise en charge.
- Si vous souhaitez le chemin Tailscale le plus simple pour les nœuds mobiles, utilisez Tailscale Serve afin que la découverte et le code de configuration résolvent tous deux vers le même point de terminaison MagicDNS sécurisé.

### 3) Manuel / Cible SSH

Lorsqu'il n'y a pas d'itinéraire direct (ou que le mode direct est désactivé), les clients peuvent toujours se connecter via SSH en transférant le port de passerelle de bouclage.

Voir [Accès à distance](/fr/gateway/remote).

## Sélection du transport (politique client)

Comportement client recommandé :

1. Si un point de terminaison direct apparié est configuré et accessible, utilisez-le.
2. Sinon, si la découverte trouve une passerelle sur `local.` ou le domaine étendu configuré, proposez un choix « Utiliser cette passerelle » en un appui et enregistrez-la comme point de terminaison direct.
3. Sinon, si un DNS/IP de tailnet est configuré, essayez en direct.
   Pour les nœuds mobiles sur les routes tailnet/publiques, direct signifie un point de terminaison sécurisé, et non un `ws://` distant en clair.
4. Sinon, revenez à SSH.

## Appairage + auth (transport direct)

La passerelle est la source de vérité pour l'admission des nœuds/clients.

- Les demandes d'appairage sont créées/approuvées/rejetées dans la passerelle (voir [Appairage Gateway](/fr/gateway/pairing)).
- La passerelle applique :
  - auth (jeton / paire de clés)
  - portées/ACL (la passerelle n'est pas un proxy brut vers chaque méthode)
  - limites de taux

## Responsabilités par composant

- **Gateway** : annonce les balises de découverte, possède les décisions d'appairage et héberge le point de terminaison WS.
- **Application macOS** : vous aide à choisir une passerelle, affiche les invites d'appairage et utilise SSH uniquement en dernier recours.
- **Nœuds iOS/Android** : parcourent Bonjour pour plus de commodité et se connectent au WS Gateway apparié.
