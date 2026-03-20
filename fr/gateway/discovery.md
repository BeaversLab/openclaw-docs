---
summary: "Node discovery and transports (Bonjour, Tailscale, SSH) for finding the gateway"
read_when:
  - Implementing or changing Bonjour discovery/advertising
  - Adjusting remote connection modes (direct vs SSH)
  - Designing node discovery + pairing for remote nodes
title: "Discovery and Transports"
---

# Discovery & transports

OpenClaw has two distinct problems that look similar on the surface:

1. **Operator remote control**: the macOS menu bar app controlling a gateway running elsewhere.
2. **Node pairing**: iOS/Android (and future nodes) finding a gateway and pairing securely.

The design goal is to keep all network discovery/advertising in the **Node Gateway** (`openclaw gateway`) and keep clients (mac app, iOS) as consumers.

## Terms

- **Gateway**: a single long-running gateway process that owns state (sessions, pairing, node registry) and runs channels. Most setups use one per host; isolated multi-gateway setups are possible.
- **Gateway WS (control plane)**: the WebSocket endpoint on `127.0.0.1:18789` by default; can be bound to LAN/tailnet via `gateway.bind`.
- **Direct WS transport**: a LAN/tailnet-facing Gateway WS endpoint (no SSH).
- **SSH transport (fallback)**: remote control by forwarding `127.0.0.1:18789` over SSH.
- **Legacy TCP bridge (deprecated/removed)**: older node transport (see [Bridge protocol](/fr/gateway/bridge-protocol)); no longer advertised for discovery.

Protocol details:

- [Gateway protocol](/fr/gateway/protocol)
- [Bridge protocol (legacy)](/fr/gateway/bridge-protocol)

## Why we keep both "direct" and SSH

- **Direct WS** is the best UX on the same network and within a tailnet:
  - auto-discovery on LAN via Bonjour
  - pairing tokens + ACLs owned by the gateway
  - no shell access required; protocol surface can stay tight and auditable
- **SSH** remains the universal fallback:
  - works anywhere you have SSH access (even across unrelated networks)
  - survives multicast/mDNS issues
  - requires no new inbound ports besides SSH

## Discovery inputs (how clients learn where the gateway is)

### 1) Bonjour / mDNS (LAN only)

Bonjour is best-effort and does not cross networks. It is only used for “same LAN” convenience.

Target direction:

- Le **Gateway** publie son point de terminaison WS via Bonjour.
- Les clients naviguent et affichent une liste « choisir un Gateway », puis stockent le point de terminaison choisi.

Dépannage et détails de la balise : [Bonjour](/fr/gateway/bonjour).

#### Détails de la balise de service

- Types de services :
  - `_openclaw-gw._tcp` (balise de transport Gateway)
- Clés TXT (non secrètes) :
  - `role=gateway`
  - `lanHost=<hostname>.local`
  - `sshPort=22` (ou tout ce qui est publié)
  - `gatewayPort=18789` (Gateway WS + HTTP)
  - `gatewayTls=1` (uniquement lorsque TLS est activé)
  - `gatewayTlsSha256=<sha256>` (uniquement lorsque TLS est activé et que l'empreinte digitale est disponible)
  - `canvasPort=<port>` (port hôte du canvas ; actuellement le même que `gatewayPort` lorsque l'hôte du canvas est activé)
  - `cliPath=<path>` (optionnel ; chemin absolu vers un point d'entrée `openclaw` exécutable ou un binaire)
  - `tailnetDns=<magicdns>` (indice optionnel ; détecté automatiquement lorsque Tailscale est disponible)

Notes de sécurité :

- Les enregistrements TXT Bonjour/mDNS sont **non authentifiés**. Les clients doivent traiter les valeurs TXT uniquement comme des indices UX.
- Le routage (hôte/port) doit préférer le **point de terminaison de service résolu** (SRV + A/AAAA) aux `lanHost`, `tailnetDns`, ou `gatewayPort` fournis par TXT.
- L'épinglage TLS ne doit jamais permettre à un `gatewayTlsSha256` annoncé de remplacer un épinglage précédemment stocké.
- Les nœuds iOS/Android doivent traiter les connexions directes basées sur la découverte comme **TLS uniquement** et exiger une confirmation explicite « faire confiance à cette empreinte digitale » avant de stocker un premier épinglage (vérification hors bande).

Désactiver/remplacer :

- `OPENCLAW_DISABLE_BONJOUR=1` désactive la publication.
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH annoncé dans TXT (par défaut 22).
- `OPENCLAW_TAILNET_DNS` publie un indice `tailnetDns` (MagicDNS).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI annoncé.

### 2) Tailnet (inter-réseau)

Pour les configurations de style Londres/Vienne, Bonjour ne sera d'aucune aide. La cible « directe » recommandée est :

- Nom MagicDNS Tailscale (préféré) ou une IP tailnet stable.

Si la passerelle peut détecter qu'elle fonctionne sous Tailscale, elle publie `tailnetDns` comme indicatif facultatif pour les clients (y compris les balises grande zone).

### 3) Manuel / Cible SSH

Lorsqu'il n'y a pas d'itinéraire direct (ou que le mode direct est désactivé), les clients peuvent toujours se connecter via SSH en transférant le port de bouclage de la passerelle.

Voir [Accès à distance](/fr/gateway/remote).

## Sélection du transport (politique client)

Comportement recommandé du client :

1. Si un point de terminaison direct couplé est configuré et accessible, utilisez-le.
2. Sinon, si Bonjour trouve une passerelle sur le réseau local, proposez un choix « Utiliser cette passerelle » en un appui et enregistrez-la comme point de terminaison direct.
3. Sinon, si un DNS/IP tailnet est configuré, essayez en mode direct.
4. Sinon, revenez à SSH.

## Couplage + authentification (transport direct)

La passerelle est la source de vérité pour l'admission des nœuds/clients.

- Les demandes de couplage sont créées/approuvées/rejetées dans la passerelle (voir [Couplage de Gateway](/fr/gateway/pairing)).
- La passerelle applique :
  - auth (jeton / paire de clés)
  - portées/ACL (la passerelle n'est pas un proxy brut vers chaque méthode)
  - limites de taux

## Responsabilités par composant

- **Gateway** : publie des balises de découverte, possède les décisions de couplage et héberge le point de terminaison WS.
- **Application macOS** : vous aide à choisir une passerelle, affiche les invites de couplage et utilise SSH uniquement en secours.
- **Nœuds iOS/Android** : naviguent sur Bonjour pour plus de commodité et se connectent au WS de la Gateway couplée.

import en from "/components/footer/en.mdx";

<en />
