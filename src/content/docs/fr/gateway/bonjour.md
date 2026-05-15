---
summary: "BonjourGatewayDécouverte Bonjour/mDNS + débogage (balises Gateway, clients et modes d'échec courants)"
read_when:
  - Debugging Bonjour discovery issues on macOS/iOS
  - Changing mDNS service types, TXT records, or discovery UX
title: "BonjourDécouverte Bonjour"
---

OpenClaw peut utiliser Bonjour (mDNS / DNS-SD) pour découvrir une Gateway active (point de terminaison WebSocket).
La navigation multidiffusion OpenClawBonjourGateway`local.` est une **commodité réservée au LAN**. Le plugin `bonjour`macOSLinuxWindowsGateway
inclus gère la publicité sur le LAN. Il démarre automatiquement sur les hôtes macOS et est optionnel sur
les déploiements Gateway sous Linux, Windows et conteneurisés. Pour la découverte inter-réseaux, la même
balise peut également être publiée via un domaine DNS-SD étendu configuré. La découverte
reste basée sur le meilleur effort et ne remplace **pas** la connectivité basée sur SSH ou Tailnet.

## Bonjour étendu (Unicast DNS-SD) sur Tailscale

Si le nœud et la passerelle se trouvent sur des réseaux différents, le mDNS multidiffusion ne traversera pas
la limite. Vous pouvez conserver la même expérience utilisateur de découverte en basculant vers **DNS-SD monodiffusion**
("Bonjour étendu") sur Tailscale.

Étapes générales :

1. Exécutez un serveur DNS sur l'hôte de la passerelle (accessible via Tailnet).
2. Publiez les enregistrements DNS-SD pour `_openclaw-gw._tcp` sous une zone dédiée
   (exemple : `openclaw.internal.`).
3. Configurez le **DNS split** Tailscale afin que votre domaine choisi résolve via ce
   serveur DNS pour les clients (y compris iOS).

OpenClaw prend en charge n'importe quel domaine de découverte ; OpenClaw`openclaw.internal.`iOSAndroid n'est qu'un exemple.
Les nœuds iOS/Android explorent à la fois `local.` et votre domaine étendu configuré.

### Configuration de la Gateway (recommandé)

```json5
{
  gateway: { bind: "tailnet" }, // tailnet-only (recommended)
  discovery: { wideArea: { enabled: true } }, // enables wide-area DNS-SD publishing
}
```

### Configuration unique du serveur DNS (hôte de la passerelle)

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
- Ajoutez un DNS fractionné pour que votre domaine de découverte utilise ce serveur de noms.

Une fois que les clients acceptent le DNS tailnet, les nœuds iOS et la découverte CLI peuvent parcourir
`_openclaw-gw._tcp` dans votre domaine de découverte sans multidiffusion.

### Sécurité de l'écouteur Gateway (recommandé)

Le port WS Gateway (défaut `18789`) se lie à loopback par défaut. Pour l'accès LAN/tailnet,
liez explicitement et gardez l'authentification activée.

Pour les configurations exclusivement tailnet :

- Définissez `gateway.bind: "tailnet"` dans `~/.openclaw/openclaw.json`.
- Redémarrez le Gateway (ou redémarrez l'application de barre de menus macOS).

## Ce qui publie

Seul le Gateway publie `_openclaw-gw._tcp`. La publicité multidiffusion LAN est
fournie par le plugin `bonjour` inclus lorsque le plugin est activé ; la publication DNS-SD
à grande échelle reste la propriété du Gateway.

## Types de services

- `_openclaw-gw._tcp` - balise de transport passerelle (utilisée par les nœuds macOS/iOS/Android).

## Clés TXT (indices non secrets)

Le Gateway publie de petits indices non secrets pour faciliter les flux d'interface utilisateur :

- `role=gateway`
- `displayName=<friendly name>`
- `lanHost=<hostname>.local`
- `gatewayPort=<port>` (WS Gateway + HTTP)
- `gatewayTls=1` (uniquement lorsque TLS est activé)
- `gatewayTlsSha256=<sha256>` (uniquement lorsque TLS est activé et que l'empreinte est disponible)
- `canvasPort=<port>` (uniquement lorsque l'hôte canvas est activé ; actuellement identique à `gatewayPort`)
- `transport=gateway`
- `tailnetDns=<magicdns>` (mode mDNS complet uniquement, indice facultatif lorsque Tailnet est disponible)
- `sshPort=<port>` (mode complet mDNS uniquement ; DNS-SD étendu peut l'omettre)
- `cliPath=<path>` (mode complet mDNS uniquement ; DNS-SD étendu l'écrit toujours comme indication d'installation à distance)

Notes de sécurité :

- Les enregistrements TXT Bonjour/mDNS ne sont **pas authentifiés**. Les clients ne doivent pas considérer les TXT comme un routage faisant autorité.
- Les clients doivent router en utilisant le point de terminaison de service résolu (SRV + A/AAAA). Considérez `lanHost`, `tailnetDns`, `gatewayPort` et `gatewayTlsSha256` uniquement comme des indications.
- La ciblage automatique SSH doit de même utiliser l'hôte de service résolu, et non les indications TXT uniquement.
- L'épinglage TLS ne doit jamais permettre à un `gatewayTlsSha256` annoncé de remplacer une épingle précédemment stockée.
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

Le Gateway écrit un fichier journal circulaire (affiché au démarrage comme `gateway log file: ...`). Recherchez les lignes `bonjour:`, en particulier :

- `bonjour: advertise failed ...`
- `bonjour: suppressing ciao cancellation ...`
- `bonjour: ... name conflict resolved` / `hostname conflict resolved`
- `bonjour: watchdog detected non-announced service ...`
- `bonjour: disabling advertiser after ... failed restarts ...`

Bonjour utilise le nom d'hôte système pour l'hôte `.local` annoncé lorsqu'il s'agit d'une étiquette DNS valide. Si le nom d'hôte système contient des espaces, des traits de soulignement ou un autre caractère d'étiquette DNS non valide, OpenClaw revient à `openclaw.local`. Définissez `OPENCLAW_MDNS_HOSTNAME=<name>` avant de démarrer le Gateway lorsque vous avez besoin d'une étiquette d'hôte explicite.

## Débogage sur le nœud iOS

Le nœud iOS utilise `NWBrowser` pour découvrir `_openclaw-gw._tcp`.

Pour capturer les journaux :

- Réglages → Gateway → Avancé → **Journaux de débogage de la découverte**
- Réglages → Gateway → Avancé → **Journaux de découverte** → reproduire → **Copier**

Le journal inclut les transitions d'état du navigateur et les modifications des jeux de résultats.

## Quand activer Bonjour

Bonjour se lance automatiquement au démarrage du Gateway avec une configuration vide sur les hôtes macOS, car l'application locale et les nœuds iOS/Android proches reposent généralement sur la découverte sur le même réseau local.

Activez Bonjour explicitement lorsque la découverte automatique sur le même réseau local est utile sur Linux,
WindowsmacOS, ou un autre hôte non %%PH:GLOSSARY:167:a457f5c%% :

```bash
openclaw plugins enable bonjour
```

Lorsqu'il est activé, Bonjour utilise `discovery.mdns.mode` pour décider de la quantité de métadonnées TXT
à publier. Le mode par défaut est `minimal` ; utilisez `full` uniquement lorsque les clients locaux ont besoin
`cliPath` ou `sshPort` indices, et utilisez `off` pour supprimer le multidiffusion LAN sans
changer l'activation du plugin.

## Quand désactiver Bonjour

Laissez Bonjour désactivé lorsque la publicité multidiffusion LAN est inutile, indisponible
ou nuisible. Les cas courants sont les serveurs non macOS, le réseau de pont Docker,
WSL, ou une stratégie réseau qui abandonne la multidiffusion mDNS. Dans ces environnements, le
Gateway est toujours accessible via son URL publiée, SSH, Tailnet, ou DNS-SD
à grande distance, mais la découverte automatique LAN n'est pas fiable.

Préférez le remplacement de l'environnement existant lorsque le problème est lié au déploiement :

```bash
OPENCLAW_DISABLE_BONJOUR=1
```

Cela désactive la publicité multidiffusion LAN sans modifier la configuration du plugin.
C'est sûr pour les images Docker, les fichiers de service, les scripts de lancement et le débogage
ponctuel car le paramètre disparaît lorsque l'environnement disparaît.

Utilisez la configuration du plugin lorsque vous souhaitez intentionnellement désactiver le plugin de découverte
LAN inclus pour cette configuration OpenClaw :

```bash
openclaw plugins disable bonjour
```

## Pièges Docker

Le module Bonjour inclus désactive automatiquement la publicité multidiffusion LAN dans les conteneurs détectés lorsque Bonjour`OPENCLAW_DISABLE_BONJOUR` n'est pas défini. Les réseaux pont Docker Docker ne transfèrent généralement pas la multidiffusion mDNS (`224.0.0.251:5353`) entre le conteneur et le réseau local (LAN), de sorte que la publicité depuis le conteneur permet rarement la découverte.

Pièges importants :

- Bonjour démarre automatiquement sur les hôtes macOS BonjourmacOS et est facultatif ailleurs. Le laisser désactivé n'arrête pas le Gateway Gateway ; cela ne fait que sauter la publicité multidiffusion LAN.
- Désactiver Bonjour Bonjour ne modifie pas `gateway.bind` ; Docker Docker utilise par défaut `OPENCLAW_GATEWAY_BIND=lan` afin que le port d'hôte publié puisse fonctionner.
- Désactiver Bonjour Bonjour ne désactive pas le DNS-SD étendu. Utilisez la découverte étendue ou Tailnet lorsque le Gateway Gateway et le nœud ne sont pas sur le même réseau local (LAN).
- La réutilisation du même `OPENCLAW_CONFIG_DIR` en dehors de Docker Docker ne conserve pas la stratégie de désactivation automatique du conteneur.
- Définissez `OPENCLAW_DISABLE_BONJOUR=0` uniquement pour le réseau hôte, macvlan ou un autre réseau où la multidiffusion mDNS est connue pour passer ; définissez-le sur `1` pour forcer la désactivation.

## Dépannage lorsque Bonjour Bonjour est désactivé

Si un nœud ne découvre plus automatiquement le Gateway Gateway après la configuration Docker Docker :

1. Confirmez si le Gateway Gateway fonctionne en mode automatique, forcé activé ou forcé désactivé :

   ```bash
   docker compose config | grep OPENCLAW_DISABLE_BONJOUR
   ```

2. Confirmez que le Gateway Gateway lui-même est accessible via le port publié :

   ```bash
   curl -fsS http://127.0.0.1:18789/healthz
   ```

3. Utilisez une cible directe lorsque Bonjour Bonjour est désactivé :
   - Interface de contrôle ou outils locaux : `http://127.0.0.1:18789`
   - Clients LAN : `http://<gateway-host>:18789`
   - Clients inter-réseaux : Tailnet MagicDNS, IP Tailnet, tunnel SSH ou DNS-SD étendu

4. Si vous avez délibérément activé le module Bonjour Bonjour dans Docker Docker et forcé la publicité avec `OPENCLAW_DISABLE_BONJOUR=0`, testez la multidiffusion depuis l'hôte :

   ```bash
   dns-sd -B _openclaw-gw._tcp local.
   ```

   Si la navigation est vide ou si les journaux du Gateway affichent des annulations répétées du chien de garde ciao, rétablissez Gateway`OPENCLAW_DISABLE_BONJOUR=1` et utilisez un itinéraire direct ou Tailnet.

## Modes de défaillance courants

- **Bonjour ne traverse pas les réseaux** : utilisez Tailnet ou SSH.
- **Multicast bloqué** : certains réseaux Wi-Fi désactivent mDNS.
- **Annonceur bloqué lors de la sonde/annonce** : les hôtes dont le multicast est bloqué, les ponts de conteneurs, WSL, ou la rotation des interfaces peuvent laisser l'annonceur ciao dans un état non annoncé. OpenClaw réessaie plusieurs fois puis désactive Bonjour pour le processus Gateway actuel au lieu de redémarrer l'annonceur indéfiniment.
- **Réseau pont Docker** : Bonjour se désactive automatiquement dans les conteneurs détectés. Définissez DockerBonjour`OPENCLAW_DISABLE_BONJOUR=0` uniquement pour l'hôte, macvlan, ou un autre réseau compatible mDNS.
- **Veille / rotation d'interface** : macOS peut temporairement abandonner les résultats mDNS ; réessayez.
- **La navigation fonctionne mais la résolution échoue** : gardez les noms de machine simples (évitez les émojis ou la ponctuation), puis redémarrez le Gateway. Le nom de l'instance de service dérive du nom d'hôte, donc les noms trop complexes peuvent confondre certains résolveurs.

## Noms d'instances échappés (`\032`)

Bonjour/DNS-SD échappe souvent les octets dans les noms d'instances de service sous forme de séquences décimales Bonjour`\DDD` (par exemple, les espaces deviennent `\032`).

- Ceci est normal au niveau du protocole.
- Les interfaces utilisateur doivent décoder pour l'affichage (iOS utilise iOS`BonjourEscapes.decode`).

## Activation / désactivation / configuration

- Les hôtes macOS démarrent automatiquement le plugin de découverte LAN inclus par défaut.
- `openclaw plugins enable bonjour` active le plugin de découverte LAN inclus sur les hôtes où il n'est pas activé par défaut.
- `openclaw plugins disable bonjour` désactive l'annonce multicast LAN en désactivant le plugin inclus.
- `OPENCLAW_DISABLE_BONJOUR=1` désactive la publicité multicast LAN sans modifier la configuration du plugin ; les valeurs véridiques acceptées sont `1`, `true`, `yes` et `on` (obsolète : `OPENCLAW_DISABLE_BONJOUR`).
- `OPENCLAW_DISABLE_BONJOUR=0` force l'activation de la publicité multicast LAN, y compris à l'intérieur des conteneurs détectés ; les valeurs fausses acceptées sont `0`, `false`, `no` et `off`.
- Lorsque le plugin Bonjour est activé et que `OPENCLAW_DISABLE_BONJOUR` n'est pas défini, Bonjour publie sur les hôtes normaux et se désactive automatiquement dans les conteneurs détectés.
- `gateway.bind` dans `~/.openclaw/openclaw.json` contrôle le mode de liaison du Gateway.
- `OPENCLAW_SSH_PORT` remplace le port SSH lorsque `sshPort` est publié (obsolète : `OPENCLAW_SSH_PORT`).
- `OPENCLAW_TAILNET_DNS` publie une indication MagicDNS dans TXT lorsque le mode complet mDNS est activé (obsolète : `OPENCLAW_TAILNET_DNS`).
- `OPENCLAW_CLI_PATH` remplace le chemin CLI publié (obsolète : `OPENCLAW_CLI_PATH`).

## Documentation connexe

- Stratégie de découverte et sélection du transport : [Discovery](/fr/gateway/discovery)
- Appairage de nœuds + approbations : [Appairage de Gateway](/fr/gateway/pairing)
