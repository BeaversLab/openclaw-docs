---
summary: "Bonjour/mDNS discovery + debugging (Gateway beacons, clients, and common failure modes)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Bonjour Discovery"
---

# Bonjour / mDNS discovery

OpenClaw uses Bonjour (mDNS / DNS‑SD) as a **LAN‑only convenience** to discover
an active Gateway (WebSocket endpoint). It is best‑effort and does **not** replace SSH or
Tailnet-based connectivity.

## Wide-area Bonjour (Unicast DNS-SD) over Tailscale

If the node and gateway are on different networks, multicast mDNS won’t cross the
boundary. You can keep the same discovery UX by switching to **unicast DNS‑SD**
("Wide‑Area Bonjour") over Tailscale.

High‑level steps:

1. Run a DNS server on the gateway host (reachable over Tailnet).
2. Publish DNS‑SD records for `_openclaw-gw._tcp` under a dedicated zone
   (example: `openclaw.internal.`).
3. Configure Tailscale **split DNS** so your chosen domain resolves via that
   DNS server for clients (including iOS).

OpenClaw supports any discovery domain; `openclaw.internal.` is just an example.
iOS/Android nodes browse both `local.` and your configured wide‑area domain.

### Gateway config (recommended)

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### One-time DNS server setup (gateway host)

```bash
openclaw dns setup --apply
```

This installs CoreDNS and configures it to:

- listen on port 53 only on the gateway’s Tailscale interfaces
- serve your chosen domain (example: `openclaw.internal.`) from `~/.openclaw/dns/<domain>.db`

Validate from a tailnet‑connected machine:

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Tailscale DNS settings

In the Tailscale admin console:

- Add a nameserver pointing at the gateway’s tailnet IP (UDP/TCP 53).
- Add split DNS so your discovery domain uses that nameserver.

Once clients accept tailnet DNS, iOS nodes can browse
`_openclaw-gw._tcp` in your discovery domain without multicast.

### Gateway listener security (recommended)

The Gateway WS port (default `18789`) binds to loopback by default. For LAN/tailnet
access, bind explicitly and keep auth enabled.

For tailnet‑only setups:

- Set `gateway.bind: "tailnet"` in `~/.openclaw/openclaw.json`.
- Restart the Gateway (or restart the macOS menubar app).

## What advertises

Seul le Gateway annonce `_openclaw-gw._tcp`.

## Types de service

- `_openclaw-gw._tcp` — balise de transport de passerelle (utilisée par les nœuds macOS/iOS/Android).

## Clés TXT (indices non secrets)

Le Gateway annonce de petits indices non secrets pour faciliter les flux de l'interface utilisateur :

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (WS + HTTP du Gateway)
- `gatewayTls=1` (uniquement lorsque TLS est activé)
- `gatewayTlsSha256=<sha256>` (uniquement lorsque TLS est activé et que l'empreinte est disponible)
- `canvasPort=<port>` (uniquement lorsque l'hôte du canvas est activé ; actuellement identique à `gatewayPort`)
- `sshPort=<port>` (par défaut 22 si non remplacé)
- `transport=gateway`
- `cliPath=<path>` (facultatif ; chemin absolu vers un point d'entrée `openclaw` exécutable)
- `tailnetDns=<magicdns>` (indice facultatif lorsque Tailnet est disponible)

Notes de sécurité :

- Les enregistrements TXT Bonjour/mDNS sont **non authentifiés**. Les clients ne doivent pas traiter les TXT comme un routage faisant autorité.
- Les clients doivent router en utilisant le point de terminaison de service résolu (SRV + A/AAAA). Traitez `lanHost`, `tailnetDns`, `gatewayPort` et `gatewayTlsSha256` uniquement comme des indices.
- Le épinglage TLS ne doit jamais permettre à un `gatewayTlsSha256` annoncé de remplacer une épingle précédemment stockée.
- Les nœuds iOS/Android doivent traiter les connexions directes basées sur la découverte comme **TLS uniquement** et exiger une confirmation explicite de l'utilisateur avant de faire confiance à une empreinte pour la première fois.

## Débogage sur macOS

Outils intégrés utiles :

- Parcourir les instances :

  ```bash
  dns-sd -B _openclaw-gw._tcp local.
  ```

- Résoudre une instance (remplacez `<instance>`) :

  ```bash
  dns-sd -L "<instance>" _openclaw-gw._tcp local.
  ```

Si le parcours fonctionne mais que la résolution échoue, vous rencontrez généralement un problème de stratégie LAN ou de résolveur mDNS.

## Débogage dans les journaux du Gateway

Le Gateway écrit un fichier journal rotatif (affiché au démarrage comme `gateway log file: ...`). Recherchez les lignes `bonjour:`, notamment :

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## Débogage sur le nœud iOS

Le nœud iOS utilise `NWBrowser` pour découvrir `_openclaw-gw._tcp`.

Pour capturer les journaux :

- Paramètres → Gateway → Avancé → **Journaux de débogage de la découverte**
- Paramètres → Gateway → Avancé → **Journaux de découverte** → reproduire → **Copier**

Le journal inclut les transitions d'état du navigateur et les modifications de l'ensemble de résultats.

## Modes de défaillance courants

- **Bonjour ne traverse pas les réseaux** : utilisez Tailnet ou SSH.
- **Multicast bloqué** : certains réseaux Wi‑Fi désactivent mDNS.
- **Mise en veille / rotation des interfaces** : macOS peut temporairement abandonner les résultats mDNS ; réessayez.
- **Le navigateur fonctionne mais la résolution échoue** : gardez les noms de machine simples (évitez les emojis ou la ponctuation), puis redémarrez le Gateway. Le nom de l'instance de service dérive du nom d'hôte, des noms trop complexes peuvent donc confondre certains résolveurs.

## Noms d'instance échappés (`\032`)

Bonjour/DNS‑SD échappe souvent les octets dans les noms d'instances de service sous forme de séquences décimales `\DDD` (par exemple, les espaces deviennent `\032`).

- Ceci est normal au niveau du protocole.
- Les interfaces utilisateur doivent décoder pour l'affichage (iOS utilise `BonjourEscapes.decode`).

## Désactivation / configuration

- `OPENCLAW_DISABLE_BONJOUR=1` désactive la publicité (ancien : `OPENCLAW_DISABLE_BONJOUR`).
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison du Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH annoncé dans TXT (ancien : `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publie une indication MagicDNS dans TXT (ancien : `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI annoncé (ancien : `OPENCLAW_CLI_PATH`).

## Documentation connexe

- Stratégie et sélection du transport de la découverte : [Découverte](/fr/gateway/discovery)
- Jumelage de nœuds + approbations : [Jumelage Gateway](/fr/gateway/pairing)

import fr from "/components/footer/fr.mdx";

<fr />
