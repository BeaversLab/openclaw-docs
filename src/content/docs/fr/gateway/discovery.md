---
summary: "Découverte de nœuds et transports (Bonjour, Tailscale, SSH) pour trouver la passerelle"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "Discovery et transports"
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
- **Pont TCP hérité (supprimé)** : ancien transport de nœud (voir
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
- Lorsque `OPENCLAW_DISABLE_BONJOUR` n'est pas défini, Bonjour publie une annonce sur les hôtes normaux
  et se désactive automatiquement dans les conteneurs détectés. Utilisez `0` uniquement sur l'hôte, macvlan
  ou un autre réseau compatible mDNS ; utilisez `1` pour forcer la désactivation.
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison du Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH annoncé lorsque `sshPort` est émis.
- `OPENCLAW_TAILNET_DNS` publie une indication `tailnetDns` (MagicDNS).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI annoncé.

### 2) Tailnet (inter-réseau)

Pour les configurations de style Londres/Vienne, Bonjour ne sera pas utile. La cible « directe » recommandée est :

- Nom MagicDNS Tailscale (préféré) ou une IP tailnet stable.

Si le Tailscale peut détecter qu'il fonctionne sous Tailscale, il publie `tailnetDns` comme indication optionnelle pour les clients (y compris les balises grande zone).

L'application macOS préfère désormais les noms MagicDNS aux IP brutes Tailscale pour la découverte de passerelles. Cela améliore la fiabilité lorsque les IP tailnet changent (par exemple après le redémarrage de nœuds ou la réattribution CGNAT), car les noms MagicDNS résolvent automatiquement l'IP actuelle.

Pour le couplage de nœuds mobiles, les indications de découverte ne relâchent pas la sécurité du transport sur les routes tailnet/publiques :

- iOS/Android nécessitent toujours un chemin de connexion sécurisé tailnet/public pour la première fois (`wss://` ou Tailscale Serve/Funnel).
- Une IP tailnet brute découverte est une indication de routage, et non une permission d'utiliser un `ws://` distant en texte clair.
- Le `ws://` en connexion directe LAN privé reste pris en charge.
- Si vous voulez le chemin Tailscale le plus simple pour les nœuds mobiles, utilisez Tailscale Serve afin que la découverte et le code de configuration résolvent tous deux vers le même point de terminaison sécurisé MagicDNS.

### 3) Manuel / Cible SSH

Lorsqu'il n'y a pas de route directe (ou que le mode direct est désactivé), les clients peuvent toujours se connecter via SSH en transférant le port de passerelle de bouclage.

Voir [Accès à distance](/fr/gateway/remote).

## Sélection du transport (stratégie client)

Comportement client recommandé :

1. Si un point de terminaison direct apparié est configuré et accessible, utilisez-le.
2. Sinon, si la découverte trouve une passerelle sur `local.` ou le domaine étendu configuré, proposez un choix « Utiliser cette passerelle » en un appui et enregistrez-le comme point de terminaison direct.
3. Sinon, si un DNS/IP de tailnet est configuré, essayez le mode direct.
   Pour les nœuds mobiles sur les routes tailnet/publiques, direct signifie un point de terminaison sécurisé, et non un `ws://` distant en texte clair.
4. Sinon, repliez-vous sur SSH.

## Appairage + auth (transport direct)

La passerelle est la source de vérité pour l'admission des nœuds/clients.

- Les demandes d'appariement sont créées/approuvées/rejetées dans la passerelle (voir [Appairage Gateway](/fr/gateway/pairing)).
- La passerelle applique :
  - auth (jeton / paire de clés)
  - portées/ACL (la passerelle n'est pas un proxy brut vers chaque méthode)
  - limites de taux

## Responsabilités par composant

- **Gateway** : diffuse les balises de découverte, possède les décisions d'appariement et héberge le point de terminaison WS.
- **Application macOS** : vous aide à choisir une passerelle, affiche les invites d'appariement et utilise SSH uniquement en repli.
- **Nœuds iOS/Android** : recherchent Bonjour pour plus de commodité et se connectent au WS du Gateway apparié.

## Connexes

- [Accès à distance](/fr/gateway/remote)
- [Tailscale](/fr/gateway/tailscale)
- [Découverte Bonjour](/fr/gateway/bonjour)
