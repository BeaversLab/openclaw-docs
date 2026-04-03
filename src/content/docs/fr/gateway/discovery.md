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
- **Pont TCP hérité (déprécié/supprimé)** : ancien transport de nœud (voir [Protocole de pont](/en/gateway/bridge-protocol)) ; n'est plus annoncé pour la découverte.

Protocol details:

- [Protocole Gateway](/en/gateway/protocol)
- [Protocole de pont (hérité)](/en/gateway/bridge-protocol)

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

### 1) Bonjour / mDNS (LAN only)

Bonjour est un best-effort et ne traverse pas les réseaux. Il n'est utilisé que pour la commodité du « même LAN ».

Direction de la cible :

- La **passerelle** annonce son point de terminaison WS via Bonjour.
- Les clients naviguent et affichent une liste « choisir une passerelle », puis stockent le point de terminaison choisi.

Dépannage et détails de la balise : [Bonjour](/en/gateway/bonjour).

#### Détails de la balise de service

- Types de services :
  - `_openclaw-gw._tcp` (balise de transport de la passerelle)
- Clés TXT (non secrètes) :
  - `role=gateway`
  - `transport=gateway`
  - `displayName=<friendly name>` (nom d'affichage configuré par l'opérateur)
  - `lanHost=<hostname>.local`
  - `sshPort=22` (ou tout ce qui est annoncé)
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (uniquement lorsque TLS est activé)
  - `gatewayTlsSha256=<sha256>` (uniquement lorsque TLS est activé et que l'empreinte est disponible)
  - `canvasPort=<port>` (port d'hôte canvas ; actuellement identique à `gatewayPort` lorsque l'hôte canvas est activé)
  - `cliPath=<path>` (optionnel ; chemin absolu vers un point d'entrée ou un binaire `openclaw` exécutable)
  - `tailnetDns=<magicdns>` (indice optionnel ; détecté automatiquement lorsque Tailscale est disponible)

Notes de sécurité :

- Les enregistrements TXT Bonjour/mDNS sont **non authentifiés**. Les clients doivent traiter les valeurs TXT comme des indices d'interface utilisateur uniquement.
- Le routage (hôte/port) doit privilégier le **point de terminaison de service résolu** (SRV + A/AAAA) par rapport aux `lanHost`, `tailnetDns` ou `gatewayPort` fournis par TXT.
- L'épinglage TLS ne doit jamais permettre à un `gatewayTlsSha256` annoncé de remplacer une épingle précédemment stockée.
- Les nœuds iOS/Android doivent traiter les connexions directes basées sur la découverte comme **TLS uniquement** et exiger une confirmation explicite « faire confiance à cette empreinte » avant de stocker une première épingle (vérification hors bande).

Désactiver/Remplacer :

- `OPENCLAW_DISABLE_BONJOUR=1` désactive l'annonce.
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH annoncé dans TXT (par défaut 22).
- `OPENCLAW_TAILNET_DNS` publie un indice `tailnetDns` (MagicDNS).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI annoncé.

### 2) Tailnet (inter-réseau)

Pour les configurations de type Londres/Vienne, Bonjour ne sera d'aucune aide. La cible « directe » recommandée est :

- Nom MagicDNS Tailscale (préféré) ou une IP tailnet stable.

Si la passerelle peut détecter qu'elle fonctionne sous Tailscale, elle publie `tailnetDns` comme indice optionnel pour les clients (y compris les balises longue portée).

L'application macOS préfère désormais les noms MagicDNS aux adresses IP brutes Tailscale pour la découverte de passerelles. Cela améliore la fiabilité lorsque les IP tailnet changent (par exemple après le redémarrage des nœuds ou la réaffectation CGNAT), car les noms MagicDNS résolvent automatiquement l'IP actuelle.

### 3) Cible manuelle / SSH

Lorsqu'il n'y a pas de route directe (ou que la connexion directe est désactivée), les clients peuvent toujours se connecter via SSH en redirigeant le port de passerelle de bouclage (loopback).

Voir [Accès à distance](/en/gateway/remote).

## Sélection du transport (politique client)

Comportement recommandé du client :

1. Si un point de terminaison direct appairé est configuré et accessible, utilisez-le.
2. Sinon, si Bonjour trouve une passerelle sur le réseau local, proposez un choix en un appui « Utiliser cette passerelle » et enregistrez-la en tant que point de terminaison direct.
3. Sinon, si un DNS/IP tailnet est configuré, essayez en direct.
4. Sinon, revenez à SSH.

## Appairage + auth (transport direct)

La passerelle est la source de vérité pour l'admission des nœuds/clients.

- Les demandes d'appairage sont créées/approuvées/rejetées dans la passerelle (voir [Appairage de la Gateway](/en/gateway/pairing)).
- La passerelle applique :
  - auth (jeton / paire de clés)
  - portées/ACL (la passerelle n'est pas un proxy brut vers chaque méthode)
  - limites de débit

## Responsabilités par composant

- **Gateway** : diffuse les balises de découverte, possède les décisions d'appairage et héberge le point de terminaison WS.
- **Application macOS** : vous aide à choisir une passerelle, affiche les invites d'appairage et utilise SSH uniquement en repli.
- **Nœuds iOS/Android** : explorent Bonjour par commodité et se connectent au WS de la Gateway appairée.
