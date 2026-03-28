---
summary: "Découverte Bonjour/mDNS + débogage (balises Gateway, clients et modes d'échec courants)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Découverte Bonjour"
---

# Découverte Bonjour / mDNS

OpenClaw utilise Bonjour (mDNS / DNS‑SD) comme commodité **uniquement sur le réseau local** pour découvrir
un Gateway actif (point de terminaison WebSocket). C'est un best‑effort et cela ne remplace **pas** SSH ou
la connectivité basée sur Tailnet.

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
Les nœuds iOS/Android parcourent à la fois `local.` et votre domaine de grande portée configuré.

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
- servir votre domaine choisi (exemple : `openclaw.internal.`) à partir de `~/.openclaw/dns/<domain>.db`

Validez à partir d'une machine connectée au tailnet :

```bash
dns-sd -B _openclaw-gw._tcp openclaw.internal.
dig @<TAILNET_IPV4> -p 53 _openclaw-gw._tcp.openclaw.internal PTR +short
```

### Paramètres DNS Tailscale

Dans la console d'administration Tailscale :

- Ajoutez un serveur de noms pointant vers l'IP tailnet de la passerelle (UDP/TCP 53).
- Ajoutez le DNS split afin que votre domaine de découverte utilise ce serveur de noms.

Une fois que les clients acceptent le DNS tailnet, les nœuds iOS peuvent parcourir
`_openclaw-gw._tcp` dans votre domaine de découverte sans multidiffusion.

### Sécurité de l'écouteur Gateway (recommandé)

Le port WS du Gateway (défaut `18789`) se lie à loopback par défaut. Pour l'accès LAN/tailnet, liez explicitement et gardez l'auth activée.

Pour les configurations tailnet uniquement :

- Définissez `gateway.bind: "tailnet"` dans `~/.openclaw/openclaw.json`.
- Redémarrez le Gateway (ou redémarrez l'application de barre de menus macOS).

## Ce qui est annoncé

Seul le Gateway annonce `_openclaw-gw._tcp`.

## Types de services

- `_openclaw-gw._tcp` — balise de transport de passerelle (utilisée par les nœuds macOS/iOS/Android).

## Clés TXT (indices non secrets)

Le Gateway annonce de petits indices non secrets pour faciliter les flux de l'interface utilisateur :

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (Gateway WS + HTTP)
- `gatewayTls=1` (uniquement lorsque TLS est activé)
- `gatewayTlsSha256=<sha256>` (uniquement lorsque TLS est activé et que l'empreinte est disponible)
- `canvasPort=<port>` (uniquement lorsque l'hôte de canevas est activé ; actuellement identique à `gatewayPort`)
- `sshPort=<port>` (par défaut 22 si non remplacé)
- `transport=gateway`
- `cliPath=<path>` (facultatif ; chemin absolu vers un point d'entrée `openclaw` exécutable)
- `tailnetDns=<magicdns>` (indice facultatif lorsque Tailnet est disponible)

Notes de sécurité :

- Les enregistrements TXT Bonjour/mDNS sont **non authentifiés**. Les clients ne doivent pas traiter TXT comme un routage faisant autorité.
- Les clients doivent router en utilisant le point de terminaison de service résolu (SRV + A/AAAA). Traitez `lanHost`, `tailnetDns`, `gatewayPort` et `gatewayTlsSha256` comme de simples indices.
- L'épinglage TLS ne doit jamais permettre à un `gatewayTlsSha256` annoncé de remplacer un épinglage précédemment stocké.
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

Si la navigation fonctionne mais que la résolution échoue, vous rencontrez généralement un problème de stratégie LAN ou de résolveur mDNS.

## Débogage dans les journaux du Gateway

Le Gateway écrit un fichier journal circulaire (affiché au démarrage sous la forme
`gateway log file: ...`). Recherchez les lignes `bonjour:`, notamment :

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`

## Débogage sur le nœud iOS

Le nœud iOS utilise `NWBrowser` pour découvrir `_openclaw-gw._tcp`.

Pour capturer les journaux :

- Réglages → Gateway → Avancé → **Journaux de débogage de découverte**
- Réglages → Gateway → Avancé → **Journaux de découverte** → reproduire → **Copier**

Le journal inclut les transitions d'état du navigateur et les modifications de l'ensemble de résultats.

## Modes d'échec courants

- **Bonjour ne traverse pas les réseaux** : utilisez Tailnet ou SSH.
- **Multidiffusion bloquée** : certains réseaux Wi‑Fi désactivent mDNS.
- **Veille / rotation des interfaces** : macOS peut temporairement perdre les résultats mDNS ; réessayez.
- **La navigation fonctionne mais la résolution échoue** : gardez les noms de machine simples (évitez les émojis ou la ponctuation), puis redémarrez le Gateway. Le nom de l'instance de service dérive du nom d'hôte, les noms trop complexes peuvent donc confondre certains résolveurs.

## Noms d'instance échappés (`\032`)

Bonjour/DNS‑SD échappe souvent les octets dans les noms d'instance de service sous forme de séquences décimales `\DDD`
(par exemple, les espaces deviennent `\032`).

- C'est normal au niveau du protocole.
- Les interfaces utilisateur doivent décoder pour l'affichage (iOS utilise `BonjourEscapes.decode`).

## Désactivation / configuration

- `OPENCLAW_DISABLE_BONJOUR=1` désactive la publicité (ancien : `OPENCLAW_DISABLE_BONJOUR`).
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison du Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH annoncé dans le TXT (ancien : `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publie une indication MagicDNS dans TXT (ancien : `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI annoncé (ancien : `OPENCLAW_CLI_PATH`).

## Documentation connexe

- Stratégie de découverte et sélection du transport : [Discovery](/fr/gateway/discovery)
- Appairage de nœuds + approbations : [Gateway pairing](/fr/gateway/pairing)
