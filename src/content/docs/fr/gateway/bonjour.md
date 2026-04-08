---
summary: "Découverte Bonjour/mDNS + débogage (balises Gateway, clients et modes d'échec courants)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Découverte Bonjour"
---

# Découverte Bonjour / mDNS

OpenClaw utilise Bonjour (mDNS / DNS‑SD) pour découvrir une Gateway active (point de terminaison WebSocket).
La navigation multidiffusion `local.` est une **commodité réservée au réseau local**. Pour la découverte inter-réseaux, la
même balise peut également être publiée via un domaine DNS-SD étendu configuré. La découverte reste
un best-effort et ne remplace **pas** la connectivité basée sur SSH ou Tailnet.

## Bonjour à grande portée (Unicast DNS-SD) sur Bonjour

Si le nœud et la passerelle se trouvent sur des réseaux différents, le mDNS multidiffusion ne traversera pas
la limite. Vous pouvez conserver la même UX de découverte en passant au **DNS‑SD monodiffusion**
("Bonjour à grande portée") sur Bonjour.

Étapes de haut niveau :

1. Exécutez un serveur DNS sur l'hôte de la passerelle (accessible via Tailnet).
2. Publiez les enregistrements DNS‑SD pour `_openclaw-gw._tcp` sous une zone dédiée
   (exemple : `openclaw.internal.`).
3. Configurez le **DNS split** Tailscale afin que votre domaine choisi soit résolu via ce
   serveur DNS pour les clients (y compris iOS).

OpenClaw prend en charge n'importe quel domaine de découverte ; `openclaw.internal.` n'est qu'un exemple.
Les nœuds iOS/Android explorent à la fois `local.` et votre domaine étendu configuré.

### Config Gateway (recommandé)

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### Configuration unique du serveur DNS (hôte passerelle)

```bash
openclaw dns setup --apply
```

Cela installe CoreDNS et le configure pour :

- écouter sur le port 53 uniquement sur les interfaces Tailscale de la passerelle
- servez votre domaine choisi (exemple : `openclaw.internal.`) depuis `~/.openclaw/dns/<domain>.db`

Validez à partir d'une machine connectée au tailnet :

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Paramètres DNS Tailscale

Dans la console d'administration Tailscale :

- Ajoutez un serveur de noms pointant vers l'IP tailnet de la passerelle (UDP/TCP 53).
- Ajoutez le DNS split afin que votre domaine de découverte utilise ce serveur de noms.

Une fois que les clients acceptent le DNS tailnet, les nœuds iOS et la découverte CLI peuvent parcourir
`_openclaw-gw._tcp` dans votre domaine de découverte sans multidiffusion.

### Sécurité de l'écouteur Gateway (recommandé)

Le port WS de la Gateway (par défaut `18789`) se lie à loopback par défaut. Pour l'accès LAN/tailnet,
liez explicitement et gardez l'authentification activée.

Pour les configurations tailnet uniquement :

- Définissez `gateway.bind: "tailnet"` dans `~/.openclaw/openclaw.json`.
- Redémarrez le Gateway (ou redémarrez l'application de barre de menus macOS).

## Ce qui est annoncé

Seule la Gateway annonce `_openclaw-gw._tcp`.

## Types de services

- `_openclaw-gw._tcp` — balise de transport de passerelle (utilisée par les nœuds macOS/iOS/Android).

## Clés TXT (indices non secrets)

Le Gateway annonce de petits indices non secrets pour faciliter les flux de l'interface utilisateur :

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (WS + HTTP de la Gateway)
- `gatewayTls=1` (uniquement lorsque TLS est activé)
- `gatewayTlsSha256=<sha256>` (uniquement lorsque TLS est activé et que l'empreinte digitale est disponible)
- `canvasPort=<port>` (uniquement lorsque l'hôte de canevas est activé ; actuellement identique à `gatewayPort`)
- `transport=gateway`
- `tailnetDns=<magicdns>` (indice facultatif lorsque Tailnet est disponible)
- `sshPort=<port>` (mode mDNS complet uniquement ; DNS-SD étendu peut l'omettre)
- `cliPath=<path>` (mode mDNS complet uniquement ; DNS-SD étendu l'écrit toujours comme un indice d'installation à distance)

Notes de sécurité :

- Les enregistrements TXT Bonjour/mDNS sont **non authentifiés**. Les clients ne doivent pas traiter TXT comme un routage faisant autorité.
- Les clients doivent router en utilisant le point de terminaison de service résolu (SRV + A/AAAA). Traitez `lanHost`, `tailnetDns`, `gatewayPort` et `gatewayTlsSha256` comme de simples indices.
- Le ciblage automatique SSH doit également utiliser l'hôte de service résolu, pas les indices TXT uniquement.
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

Le Gateway écrit un fichier journal circulant (affiché au démarrage comme `gateway log file: ...`). Recherchez les lignes `bonjour:`, notamment :

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## Débogage sur le nœud iOS

Le nœud iOS utilise `NWBrowser` pour découvrir `_openclaw-gw._tcp`.

Pour capturer les journaux :

- Réglages → Gateway → Avancé → **Journaux de débogage de la découverte**
- Réglages → Gateway → Avancé → **Journaux de découverte** → reproduire → **Copier**

Le journal inclut les transitions d'état du navigateur et les modifications de l'ensemble de résultats.

## Modes d'échec courants

- **Le Bonjour ne traverse pas les réseaux** : utilisez Tailnet ou SSH.
- **Multicast bloqué** : certains réseaux Wi‑Fi désactivent mDNS.
- **Veille / instabilité de l'interface** : macOS peut temporairement abandonner les résultats mDNS ; réessayez.
- **Le parcours fonctionne mais la résolution échoue** : gardez les noms de machine simples (évitez les émojis ou la ponctuation), puis redémarrez le Gateway. Le nom de l'instance de service dérive du nom d'hôte, donc des noms trop complexes peuvent perturber certains résolveurs.

## Noms d'instance échappés (`\032`)

Bonjour/DNS‑SD échappe souvent les octets dans les noms d'instance de service sous forme de séquences décimales `\DDD` (par exemple, les espaces deviennent `\032`).

- Ceci est normal au niveau du protocole.
- Les interfaces utilisateur doivent décoder pour l'affichage (iOS utilise `BonjourEscapes.decode`).

## Désactivation / configuration

- `OPENCLAW_DISABLE_BONJOUR=1` désactive la publicité (ancien : `OPENCLAW_DISABLE_BONJOUR`).
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison du Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH lorsque `sshPort` est annoncé (obsolète : `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publie une indication MagicDNS dans TXT (obsolète : `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI annoncé (obsolète : `OPENCLAW_CLI_PATH`).

## Documentation connexe

- Stratégie de découverte et sélection du transport : [Discovery](/en/gateway/discovery)
- Appairage de nœuds + approbations : [Appairage Gateway](/en/gateway/pairing)
