---
summary: "Application Android (nœud) : manuel de connexion + surface de commande Connect/Chat/Voice/Canvas"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Application Android"
---

<Note>
  The Android app has not been publicly released yet. The source code is available in the [OpenClaw repository](AndroidOpenClawhttps://github.com/openclaw/openclaw) under `apps/android`Android. You can build it yourself using Java 17 and the Android SDK (`./gradlew :app:assemblePlayDebug`). See [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) for
  build instructions.
</Note>

## Snapshot de prise en charge

- Rôle : application de nœud compagnon (Android n'héberge pas le Gateway).
- Gateway requis : oui (exécutez-le sur macOS, Linux ou Windows via WSL2).
- Install : [Getting Started](/fr/start/getting-started) + [Pairing](/fr/channels/pairing).
- Gateway : [Runbook](Gateway/en/gateway) + [Configuration](/fr/gateway/configuration).
  - Protocoles : [Gateway protocol](Gateway/en/gateway/protocol) (nodes + control plane).

## Contrôle système

Le contrôle système (launchd/systemd) réside sur l'hôte Gateway. Voir [Gateway](GatewayGateway/en/gateway).

## Manuel de connexion

Application de nœud Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se connecte directement au WebSocket Gateway et utilise l'appareil pairing (`role: node`).

Pour les hôtes Tailscale ou publics, Android nécessite un point de terminaison sécurisé :

- Préféré : Tailscale Serve / Funnel avec `https://<magicdns>` / `wss://<magicdns>`
- Également pris en charge : tout autre `wss://` URL Gateway avec un point de terminaison TLS réel
- Le `ws://` en clair reste pris en charge sur les adresses LAN privées / les hôtes `.local`, ainsi que `localhost`, `127.0.0.1`, et le pont de l'émulateur Android (`10.0.2.2`)

### Prérequis

- Vous pouvez exécuter le Gateway sur la machine "master".
- L'appareil/l'émulateur Android peut atteindre le WebSocket du gateway :
  - Même LAN avec mDNS/NSD, **ou**
  - Même tailnet Tailscale utilisant Bonjour à grande portée / DNS-SD unicast (voir ci-dessous), **ou**
  - Hôte/port du gateway manuel (solution de repli)
- L'appairage mobile Tailnet/public n'utilise **pas** les points de terminaison IP bruts de tailnet `ws://`. Utilisez plutôt Tailscale Serve ou une autre URL `wss://`.
- Vous pouvez exécuter la CLI (`openclaw`) sur la machine passerelle (ou via SSH).

### 1) Démarrer le Gateway

```bash
openclaw gateway --port 18789 --verbose
```

Vérifiez dans les journaux que vous voyez quelque chose comme :

- `listening on ws://0.0.0.0:18789`

Pour un accès distant Android via Tailscale, privilégiez Serve/Funnel plutôt qu'une liaison brute de tailnet :

```bash
openclaw gateway --tailscale serve
```

Cela fournit à Android un point de terminaison sécurisé `wss://` / `https://`. Une configuration simple `gateway.bind: "tailnet"` ne suffit pas pour le premier appairage à distance Android sauf si vous terminez également TLS séparément.

### 2) Vérifier la découverte (facultatif)

Depuis la machine passerelle :

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Plus de notes de débogage : [Bonjour](Bonjour/en/gateway/bonjour).

Si vous avez également configuré un domaine de découverte étendue (wide-area), comparez avec :

```bash
openclaw gateway discover --json
```

Cela affiche `local.` ainsi que le domaine étendu configuré en une seule passe et utilise le point de terminaison de service résolu au lieu des indices TXT uniquement.

#### Découverte Tailnet (Vienne ⇄ Londres) via DNS-SD unicast

La découverte Android NSD/mDNS ne traversera pas les réseaux. Si votre nœud Android et la passerelle sont sur des réseaux différents mais connectés via Tailscale, utilisez plutôt Wide-Area Bonjour / unicast DNS-SD.

La découverte seule n'est pas suffisante pour l'appairage Tailnet/public Android. La route découverte a toujours besoin d'un point de terminaison sécurisé (`wss://` ou Tailscale Serve) :

1. Configurez une zone DNS-SD (exemple `openclaw.internal.`) sur l'hôte de la passerelle et publiez les enregistrements `_openclaw-gw._tcp`.
2. Configurez le DNS fractionné (split DNS) Tailscale pour votre domaine choisi pointant vers ce serveur DNS.

Détails et exemple de configuration CoreDNS : [Bonjour](Bonjour/en/gateway/bonjour).

### 3) Se connecter depuis Android

Dans l'application Android :

- L'application maintient sa connexion passerelle active via un **service de premier plan** (notification persistante).
- Ouvrez l'onglet **Connect**.
- Utilisez le mode **Code de configuration** ou **Manuel**.
- Si la découverte est bloquée, utilisez l'hôte/port manuel dans **Contrôles avancés**. Pour les hôtes LAN privés, `ws://` fonctionne toujours. Pour les hôtes Tailscale/public, activez TLS et utilisez un point de terminaison `wss://` / Tailscale Serve.

Après le premier appairage réussi, Android se reconnecte automatiquement au lancement :

- Point de terminaison manuel (si activé), sinon
- La dernière passerelle découverte (best-effort).

### Presence alive beacons

After the authenticated node session connects, and when the app moves to the background while the
foreground service is still connected, Android calls Android`node.event` with
`event: "node.presence.alive"`. The gateway records this as `lastSeenAtMs`/`lastSeenReason` on the
paired node/device metadata only after the authenticated node device identity is known.

L'application considère que la balise a été enregistrée avec succès uniquement lorsque la réponse de la passerelle inclut
`handled: true`. Les passerelles plus anciennes peuvent accuser réception de `node.event` avec `{ "ok": true }` ; cette réponse est
compatible mais ne compte pas comme une mise à jour durable de la dernière vue.

### 4) Approuver le jumelage (CLI)

Sur la machine de la passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Détails du jumelage : [Jumelage](/fr/channels/pairing).

Optionnel : si le nœud Android se connecte toujours à partir d'un sous-réseau étroitement contrôlé,
vous pouvez activer l'auto-approbation des nouveaux nœuds avec des CIDR explicites ou des IP exactes :

```json5
{
  gateway: {
    nodes: {
      pairing: {
        autoApproveCidrs: ["192.168.1.0/24"],
      },
    },
  },
}
```

Ceci est désactivé par défaut. Cela ne s'applique qu'au jumelage `role: node` frais sans
portée demandée. Le jumelage opérateur/navigateur et tout changement de rôle, de portée, de métadonnées ou
de clé publique nécessitent toujours une approbation manuelle.

### 5) Vérifier que le nœud est connecté

- Via le statut des nœuds :

  ```bash
  openclaw nodes status
  ```

- Via la Gateway :

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historique

L'onglet Chat Android prend en charge la sélection de session (par défaut `main`, plus les autres sessions existantes) :

- Historique : `chat.history` (normalisé pour l'affichage ; les balises de directive en ligne sont
  supprimées du texte visible, les payloads XML d'appel d'outil en texte brut (y compris
  `<tool_call>...</tool_call>`, `<function_call>...</function_call>`,
  `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et
  les blocs d'appel d'outil tronqués) et les jetons de contrôle de modèle ASCII/full-width fuyants
  sont supprimés, les lignes d'assistant à jeton silencieux pur telles que exact `NO_REPLY` /
  `no_reply` sont omises, et les lignes trop volumineuses peuvent être remplacées par des espaces réservés)
- Envoyer : `chat.send`
- Mises à jour push (best-effort) : `chat.subscribe` → `event:"chat"`

### 7) Canvas + caméra

#### Hôte de Gateway de la Canvas (recommandé pour le contenu web)

Si vous souhaitez que le nœud affiche du HTML/CSS/JS réel que l'agent peut modifier sur le disque, dirigez le nœud vers l'hôte canvas de la Gateway.

<Note>Les nœuds chargent le canvas depuis le serveur HTTP du Gateway (même port que Gateway`gateway.port`, par défaut `18789`).</Note>

1. Créez `~/.openclaw/workspace/canvas/index.html` sur l'hôte de la passerelle.

2. Naviguez le nœud vers celui-ci (LAN) :

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (facultatif) : si les deux appareils sont sur Tailscale, utilisez un nom MagicDNS ou une IP tailnet au lieu de Tailscale`.local`, par ex. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Ce serveur injecte un client de rechargement en direct dans le HTML et se recharge lors des modifications de fichiers.
L'hôte A2UI se trouve à `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Commandes Canvas (premier plan uniquement) :

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (utilisez `{"url":""}` ou `{"url":"/"}` pour revenir à l'échafaudage par défaut). `canvas.snapshot` renvoie `{ format, base64 }` (par défaut `format="jpeg"`).
- A2UI : `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` ancien alias)

Commandes de caméra (premier plan uniquement ; soumises à autorisation) :

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Voir [Camera node](/fr/nodes/cameraCLI) pour les paramètres et les aides CLI.

### 8) Voice + surface de commande Android étendue

- Onglet Voice : Android dispose de deux modes de capture explicites. **Mic** est une session manuelle de l'onglet Voice qui envoie chaque pause sous forme de tour de chat et s'arrête lorsque l'application quitte le premier plan ou lorsque l'utilisateur quitte l'onglet Voice. **Talk** est le mode Talk continu et continue à écouter jusqu'à ce qu'il soit désactivé ou que le nœud se déconnecte.
- Le mode Talk promeut le service de premier plan existant de `dataSync` à `dataSync|microphone`Android avant le début de la capture, puis le rétrograde lorsque le mode Talk s'arrête. Android 14+ exige la déclaration `FOREGROUND_SERVICE_MICROPHONE`, l'autorisation d'exécution `RECORD_AUDIO` et le type de service micro à l'exécution.
- Les réponses vocales utilisent `talk.speak` via le fournisseur Talk de la passerelle configurée. Le TTS du système local est utilisé uniquement lorsque `talk.speak` n'est pas disponible.
- Le réveil vocal reste désactivé dans l'UX/le runtime Android.
- Familles de commandes Android supplémentaires (la disponibilité dépend de l'appareil et des autorisations) :
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (voir [Notification forwarding](#notification-forwarding) ci-dessous)
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Points d'entrée de l'assistant

Android prend en charge le lancement de OpenClaw à partir du déclencheur de l'assistant système (Google
Assistant). Lorsqu'il est configuré, maintenir le bouton d'accueil enfoncé ou dire "Ok Google, demande à
OpenClaw..." ouvre l'application et transmet la demande au compositeur de chat.

Ceci utilise les métadonnées des **App Actions** Android déclarées dans le manifeste de l'application. Aucune
configuration supplémentaire n'est nécessaire côté passerelle -- l'intention de l'assistant est
gérée entièrement par l'application Android et transmise comme un message de chat normal.

<Note>La disponibilité des App Actions dépend de l'appareil, de la version de Google Play Services, et du fait que l' utilisateur a défini OpenClaw comme application assistant par défaut.</Note>

## Transfert des notifications

Android peut transférer les notifications de l'appareil vers la passerelle sous forme d'événements. Plusieurs contrôles vous permettent de définir quelles notifications sont transférées et quand.

| Clé                              | Type           | Description                                                                                                               |
| -------------------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Ne transférer que les notifications de ces noms de packages. Si défini, tous les autres packages sont ignorés.            |
| `notifications.denyPackages`     | string[]       | Ne jamais transférer les notifications de ces noms de packages. Appliqué après `allowPackages`.                           |
| `notifications.quietHours.start` | string (HH:mm) | Début de la plage horaire de calme (heure locale de l'appareil). Les notifications sont supprimées pendant cette période. |
| `notifications.quietHours.end`   | chaîne (HH:mm) | Fin de la plage horaire de calme.                                                                                         |
| `notifications.rateLimit`        | nombre         | Nombre maximal de notifications transférées par package et par minute. Les notifications excédentaires sont ignorées.     |

Le sélecteur de notifications utilise également un comportement plus sûr pour les événements de notification transférés, empêchant le transfert accidentel de notifications système sensibles.

Exemple de configuration :

```json5
{
  notifications: {
    allowPackages: ["com.slack", "com.whatsapp"],
    denyPackages: ["com.android.systemui"],
    quietHours: {
      start: "22:00",
      end: "07:00",
    },
    rateLimit: 5,
  },
}
```

<Note>Le transfert de notifications nécessite l'autorisation Android Notification Listener. L'application vous demande cette autorisation lors de la configuration.</Note>

## Connexes

- [Application iOS](iOS/en/platforms/ios)
- [Nœuds](/fr/nodes)
- [Dépannage du nœud Android](Android/en/nodes/troubleshooting)
