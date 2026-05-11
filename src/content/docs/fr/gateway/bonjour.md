---
summary: "Discovery/mDNS + débogage (balises Gateway, clients et modes de défaillance courants)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "Discovery Bonjour"
---

# Découverte Bonjour / mDNS

OpenClaw utilise Bonjour (mDNS / DNS‑SD) pour découvrir une Gateway active (point de terminaison WebSocket).
La navigation multidiffusion `local.` est une **commodité réservée au LAN**. Le plugin `bonjour`
bundlé gère la publicité sur le LAN et est activé par défaut. Pour la découverte inter-réseaux,
la même balise peut également être publiée via un domaine DNS-SD de grande zone configuré.
La Discovery reste de type « best-effort » et ne remplace **pas** la connectivité basée sur SSH ou Tailnet.

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
Les nœuds iOS/Android naviguent à la fois dans `local.` et votre domaine de grande zone configuré.

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

Une fois que les clients acceptent le DNS tailnet, les nœuds iOS et la Discovery CLI peuvent parcourir
`_openclaw-gw._tcp` dans votre domaine de découverte sans multidiffusion.

### Sécurité de l'écouteur Gateway (recommandé)

Le port WS Gateway (par défaut `18789`) se lie à loopback par défaut. Pour l'accès LAN/tailnet,
liez explicitement et gardez l'auth activée.

Pour les configurations tailnet uniquement :

- Définissez `gateway.bind: "tailnet"` dans `~/.openclaw/openclaw.json`.
- Redémarrez le Gateway (ou redémarrez l'application de barre de menus macOS).

## Ce qui est annoncé

Seule la Gateway annonce `_openclaw-gw._tcp`. La publicité multidiffusion LAN est
fournie par le plugin `bonjour` bundlé ; la publication DNS-SD de grande zone reste
propriété de la Gateway.

## Types de services

- `_openclaw-gw._tcp` — balise de transport de gateway (utilisée par les nœuds macOS/iOS/Android).

## Clés TXT (indices non secrets)

Le Gateway annonce de petits indices non secrets pour faciliter les flux de l'interface utilisateur :

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (WS Gateway + HTTP)
- `gatewayTls=1` (uniquement lorsque TLS est activé)
- `gatewayTlsSha256=<sha256>` (uniquement lorsque TLS est activé et que l'empreinte digitale est disponible)
- `canvasPort=<port>` (uniquement lorsque l'hôte canvas est activé ; actuellement identique à `gatewayPort`)
- `transport=gateway`
- `tailnetDns=<magicdns>` (mode complet mDNS uniquement, indice facultatif lorsque Tailnet est disponible)
- `sshPort=<port>` (mode complet mDNS uniquement ; DNS-SD grande zone peut l'omettre)
- `cliPath=<path>` (mode complet mDNS uniquement ; DNS-SD grande zone l'écrit toujours comme un indice d'installation à distance)

Notes de sécurité :

- Les enregistrements TXT Bonjour/mDNS sont **non authentifiés**. Les clients ne doivent pas traiter TXT comme un routage faisant autorité.
- Les clients doivent router en utilisant le point de terminaison de service résolu (SRV + A/AAAA). Traitez `lanHost`, `tailnetDns`, `gatewayPort` et `gatewayTlsSha256` comme de simples indices.
- Le ciblage automatique SSH doit également utiliser l'hôte de service résolu, pas les indices TXT uniquement.
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

Si le parcours fonctionne mais que la résolution échoue, vous rencontrez généralement un problème de stratégie LAN ou de résolveur mDNS.

## Débogage dans les journaux du Gateway

Le Gateway écrit un fichier journal circulaire (affiché au démarrage comme `gateway log file: ...`). Recherchez les lignes `bonjour:`, notamment :

- `bonjour: advertise failed ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

Bonjour utilise le nom d'hôte système pour l'hôte `.local` annoncé lorsqu'il s'agit d'une étiquette DNS valide. Si le nom d'hôte système contient des espaces, des traits de soulignement ou un autre caractère d'étiquette DNS non valide, OpenClaw revient à `openclaw.local`. Définissez `OPENCLAW_MDNS_HOSTNAME=<name>` avant de démarrer le Gateway lorsque vous avez besoin d'une étiquette d'hôte explicite.

## Débogage sur le nœud iOS

Le nœud iOS utilise `NWBrowser` pour découvrir `_openclaw-gw._tcp`.

Pour capturer les journaux :

- Réglages → Gateway → Avancé → **Journaux de débogage de la découverte**
- Réglages → Gateway → Avancé → **Journaux de découverte** → reproduire → **Copier**

Le journal inclut les transitions d'état du navigateur et les modifications de l'ensemble de résultats.

## Quand désactiver Bonjour

Désactivez Bonjour uniquement lorsque la publicité multidiffusion LAN est indisponible ou nuisible. Le cas courant est un Gateway fonctionnant derrière un réseau pont Docker, WSL, ou une stratégie réseau qui abandonne la multidiffusion mDNS. Dans ces environnements, le Gateway est toujours accessible via son URL publiée, SSH, Tailnet ou DNS-SD grande zone, mais la découverte automatique LAN n'est pas fiable.

Préférez le remplacement de l'environnement existant lorsque le problème est lié au déploiement :

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

Cela désactive la publicité multidiffusion LAN sans modifier la configuration du plugin.
C'est sans danger pour les images Docker, les fichiers de service, les scripts de lancement et le débogage ponctuel
parce que le paramètre disparaît lorsque l'environnement n'existe plus.

N'utilisez la configuration du plugin que lorsque vous souhaitez intentionnellement désactiver le
plugin de découverte LAN intégré pour cette configuration OpenClaw :

```bash
openclaw plugins disable bonjour
```

## Pièges Docker

Le plugin Bonjour intégré désactive automatiquement la publicité multidiffusion LAN dans les conteneurs détectés
lorsque `OPENCLAW_DISABLE_BONJOUR` n'est pas défini. Les réseaux pont Docker
ne transfèrent généralement pas la multidiffusion mDNS (`224.0.0.251:5353`) entre le conteneur
et le LAN, la publicité à partir du conteneur permet donc rarement la découverte.

Pièges importants :

- Désactiver Bonjour n'arrête pas le Gateway. Cela n'arrête que la publicité
  multidiffusion LAN.
- Désactiver Bonjour ne modifie pas `gateway.bind` ; Docker utilise par défaut toujours
  `OPENCLAW_GATEWAY_BIND=lan` pour que le port d'hôte publié puisse fonctionner.
- Désactiver Bonjour ne désactive pas le DNS-SD étendu. Utilisez la découverte étendue
  ou Tailnet lorsque le Gateway et le nœud ne sont pas sur le même LAN.
- La réutilisation du même `OPENCLAW_CONFIG_DIR` en dehors de Docker ne conserve pas
  la stratégie de désactivation automatique du conteneur.
- Définissez `OPENCLAW_DISABLE_BONJOUR=0` uniquement pour le réseau hôte, macvlan ou un
  autre réseau où la multidiffusion mDNS est connue pour passer ; définissez-le sur `1` pour forcer la désactivation.

## Dépannage de Bonjour désactivé

Si un nœud ne découvre plus automatiquement le Gateway après la configuration Docker :

1. Confirmez si le Gateway fonctionne en mode automatique, forcé-on ou forcé-off :

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. Confirmez que le Gateway lui-même est accessible via le port publié :

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. Utilisez une cible directe lorsque Bonjour est désactivé :
   - Interface de contrôle ou outils locaux : `http://127.0.0.1:18789`
   - Clients LAN : `http://<gateway-host>:18789`
   - Clients inter-réseaux : MagicDNS Tailnet, IP Tailnet, tunnel SSH ou
     DNS-SD étendu

4. Si vous avez délibérément activé Bonjour dans Docker avec
   `OPENCLAW_DISABLE_BONJOUR=0`, testez la multidiffusion depuis l'hôte :

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   Si le parcours est vide ou si les journaux du Gateway montrent des annulations répétées du watchdog ciao,
   restaurez `OPENCLAW_DISABLE_BONJOUR=1` et utilisez une route directe ou Tailnet.

## Modes de défaillance courants

- **Bonjour ne traverse pas les réseaux** : utilisez Tailnet ou SSH.
- **Multicast bloqué** : certains réseaux Wi‑Fi désactivent le mDNS.
- **Annonceur bloqué dans la phase de sonde/annonce** : les hôtes avec un multicast bloqué,
  les ponts de conteneurs, WSL, ou l'instabilité des interfaces peuvent laisser l'annonceur ciao dans un
  état sans annonce. OpenClaw réessaie plusieurs fois puis désactive Bonjour
  pour le processus Gateway actuel au lieu de redémarrer l'annonceur indéfiniment.
- **Réseau pont Docker** : Bonjour se désactive automatiquement dans les conteneurs détectés.
  Définissez `OPENCLAW_DISABLE_BONJOUR=0` uniquement pour l'hôte, macvlan, ou un autre
  réseau compatible mDNS.
- **Mise en veille / instabilité des interfaces** : macOS peut abandonner temporairement les résultats mDNS ; réessayez.
- **La navigation fonctionne mais la résolution échoue** : gardez les noms de machine simples (évitez les emojis ou
  la ponctuation), puis redémarrez le Gateway. Le nom de l'instance de service dérive du
  nom d'hôte, donc des noms trop complexes peuvent perturber certains résolveurs.

## Noms d'instance échappés (`\032`)

Bonjour/DNS‑SD échappe souvent les octets dans les noms d'instance de service sous forme de séquences décimales `\DDD`
(par exemple, les espaces deviennent `\032`).

- Ceci est normal au niveau du protocole.
- Les interfaces utilisateur doivent décoder pour l'affichage (%PH:GLOSSARY:182:dcfa0ea4%% utilise `BonjourEscapes.decode`).

## Désactivation / configuration

- `openclaw plugins disable bonjour` désactive la publicité multicast LAN en désactivant le plugin inclus.
- `openclaw plugins enable bonjour` rétablit le plugin de découverte LAN par défaut.
- `OPENCLAW_DISABLE_BONJOUR=1` désactive la publicité multicast LAN sans modifier la configuration du plugin ; les valeurs vraies acceptées sont `1`, `true`, `yes`, et `on` (legacy : `OPENCLAW_DISABLE_BONJOUR`).
- `OPENCLAW_DISABLE_BONJOUR=0` force l'activation de la publicité multicast LAN, y compris à l'intérieur des conteneurs détectés ; les valeurs fausses acceptées sont `0`, `false`, `no`, et `off`.
- Lorsque `OPENCLAW_DISABLE_BONJOUR` n'est pas défini, Bonjour effectue de la publicité sur les hôtes normaux et se désactive automatiquement dans les conteneurs détectés.
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison du Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH lorsque `sshPort` est annoncé (ancien : `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publie une indication MagicDNS dans TXT lorsque le mode complet mDNS est activé (ancien : `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI annoncé (ancien : `OPENCLAW_CLI_PATH`).

## Documentation connexe

- Stratégie de découverte et sélection du transport : [Discovery](/fr/gateway/discovery)
- Jumelage de nœuds + approbations : [Gateway pairing](/fr/gateway/pairing)
