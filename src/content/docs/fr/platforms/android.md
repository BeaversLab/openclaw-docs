---
summary: "AndroidApplication Android (nœud) : manuel de connexion + surface de commande Connect/Chat/Voice/Canvas"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Application Android"
---

<Note>
  The official Android app is available on [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN). It is a companion node and requires a running OpenClaw Gateway. The source code is also available in the [OpenClaw repository](https://github.com/openclaw/openclaw) under `apps/android`; see
  [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) for build instructions.
</Note>

## Support snapshot

- Rôle : application nœud compagnon (Android n'héberge pas le AndroidGateway).
- Gateway requis : oui (exécutez-le sur macOS, Linux ou Windows via WSL2).
- Install : [Google Play](https://play.google.com/store/apps/details?id=ai.openclaw.app&hl=en_IN) pour l'application, [Getting Started](/fr/start/getting-started) pour le Gateway, puis [Pairing](/fr/channels/pairing).
- Gateway : [Runbook](/fr/gateway) + [Configuration](/fr/gateway/configuration).
  - Protocoles : [protocole Gateway](/fr/gateway/protocol) (nœuds + plan de contrôle).

## Contrôle système

Le contrôle système (launchd/systemd) réside sur l'hôte du Gateway. Voir [Gateway](/fr/gateway).

## Manuel de connexion

Application nœud Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se connecte directement au WebSocket du Gateway et utilise l'appareillage des périphériques (`role: node`).

Pour Tailscale ou les hôtes publics, Android nécessite un point de terminaison sécurisé :

- Préféré : Tailscale Serve / Funnel avec `https://<magicdns>` / `wss://<magicdns>`
- Également pris en charge : toute autre URL de Gateway `wss://` avec un point de terminaison TLS réel
- Le `ws://` en clair reste pris en charge sur les adresses LAN privées / les hôtes `.local`, ainsi que `localhost`, `127.0.0.1` et le pont de l'émulateur Android (`10.0.2.2`)

### Prérequis

- Vous pouvez exécuter le Gateway sur la machine « master ».
- Le périphérique/l'émulateur Android peut atteindre le WebSocket de la passerelle :
  - Même réseau local avec mDNS/NSD, **ou**
  - Même réseau tailnet Tailscale via Wide-Area Bonjour / unicast DNS-SD (voir ci-dessous), **ou**
  - Hôte/port de la passerelle manuel (solution de repli)
- L'appairage mobile Tailnet/public n'utilise **pas** les points de terminaison IP bruts de Tailnet `ws://`Tailscale. Utilisez plutôt Tailscale Serve ou une autre URL `wss://`.
- Vous pouvez exécuter le CLI (CLI`openclaw`) sur la machine passerelle (ou via SSH).

### 1) Démarrer la Gateway

```bash
openclaw gateway --port 18789 --verbose
```

Confirmez dans les journaux que vous voyez quelque chose comme :

- `listening on ws://0.0.0.0:18789`

Pour un accès Android distant via AndroidTailscale, préférez Serve/Funnel à une liaison brute de tailnet :

```bash
openclaw gateway --tailscale serve
```

Cela offre à Android un point de terminaison sécurisé `wss://` / `https://`. Une configuration simple `gateway.bind: "tailnet"`Android ne suffit pas pour le premier appariement Android distant, sauf si vous terminez également TLS séparément.

### 2) Vérifier la découverte (facultatif)

Depuis la machine de la passerelle :

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Notes de débogage supplémentaires : [Bonjour](/fr/gateway/bonjour).

Si vous avez également configuré un domaine de découverte étendue, comparez avec :

```bash
openclaw gateway discover --json
```

Cela affiche `local.` ainsi que le domaine étendu configuré en une seule passe et utilise le point de terminaison de service résolu au lieu des indices TXT uniquement.

#### Découverte Tailnet (Vienne ⇄ Londres) via DNS-SD unicast

La découverte NSD/mDNS Android ne traversera pas les réseaux. Si votre nœud Android et la passerelle sont sur des réseaux différents mais connectés via Tailscale, utilisez plutôt le Bonjour à grande échelle / unicast DNS-SD.

Seule la Discovery n'est pas suffisante pour le jumelage tailnet/public Android. La route découverte a toujours besoin d'un point de terminaison sécurisé (`wss://` ou Tailscale Serve) :

1. Configurez une zone DNS-SD (exemple `openclaw.internal.`) sur l'hôte de la passerelle et publiez des enregistrements `_openclaw-gw._tcp`.
2. Configurez le DNS fractionné Tailscale pour votre domaine choisi pointant vers ce serveur DNS.

Détails et exemple de configuration CoreDNS : [Bonjour](/fr/gateway/bonjour).

### 3) Se connecter depuis Android

Dans l'application Android :

- L'application maintient sa connexion à la passerelle active via un **service de premier plan** (notification persistante).
- Ouvrez l'onglet **Connecter**.
- Utilisez le mode **Code de configuration** ou **Manuel**.
- Si la découverte est bloquée, utilisez l'hôte/port manuel dans les **Contrôles avancés**. Pour les hôtes de réseau privé local, `ws://` fonctionne toujours. Pour les hôtes Tailscale/publics, activez TLS et utilisez un point de terminaison `wss://` / Tailscale Serve.

Après le premier appairage réussi, Android se reconnecte automatiquement au lancement :

- Point de terminaison manuel (si activé), sinon
- La dernière passerelle découverte (meilleur effort).

### Balises de présence actives

Après la connexion de la session du nœud authentifié, et lorsque l'application passe en arrière-plan alors que le service de premier plan est toujours connecté, Android appelle `node.event` avec `event: "node.presence.alive"`. La passerelle enregistre cela en tant que `lastSeenAtMs`/`lastSeenReason` sur les métadonnées du nœud/appareil apparié uniquement après que l'identité de l'appareil du nœud authentifié est connue.

L'application considère que la balise a été enregistrée avec succès uniquement lorsque la réponse de la passerelle inclut
`handled: true`. Les anciennes passerelles peuvent accuser réception de `node.event` avec `{ "ok": true }` ; cette réponse est
compatible mais ne compte pas comme une mise à jour durable de la dernière vue.

### 4) Approuver le couplage (CLI)

Sur la machine de la passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Détails du jumelage : [Pairing](/fr/channels/pairing).

Optionnel : si le nœud Android se connecte toujours depuis un sous-réseau strictement contrôlé,
vous pouvez activer l'approbation automatique des nouveaux nœuds avec des CIDRs explicites ou des IP exactes :

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

Cette fonctionnalité est désactivée par défaut. Elle ne s'applique qu'aux nouveaux appariements `role: node` sans
portées demandées. L'appariement via opérateur/navigateur et tout changement de rôle, de portée, de métadonnées ou
de clé publique nécessitent toujours une approbation manuelle.

### 5) Vérifier que le nœud est connecté

- Via le statut des nœuds :

  ```bash
  openclaw nodes status
  ```

- Via Gateway :

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historique

L'onglet Chat Android prend en charge la sélection de session (par défaut `main`, plus autres sessions existantes) :

- Historique : `chat.history` (affichage-normalisé ; les balises de directive en ligne sont
  supprimées du texte visible, les payloads XML d'appel d'outil en texte brut (y compris
  `<tool_call>...</tool_call>`, `<function_call>...</function_call>`,
  `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et
  les blocs d'appel d'outil tronqués) et les jetons de contrôle de modèle ASCII/pleine largeur fuités
  sont supprimés, les lignes d'assistant en jeton silencieux pur telles que `NO_REPLY` /
  `no_reply` exactes sont omises, et les lignes trop volumineuses peuvent être remplacées par des espaces réservés)
- Envoyer : `chat.send`
- Mises à jour push (au mieux) : `chat.subscribe` → `event:"chat"`

### 7) Canvas + caméra

#### Hôte Gateway Canvas (recommandé pour le contenu web)

Si vous souhaitez que le nœud affiche du véritable HTML/CSS/JS que l'agent peut modifier sur le disque, dirigez le nœud vers l'hôte canvas du Gateway.

<Note>Les nœuds chargent le canevas depuis le serveur HTTP du Gateway (même port que Gateway`gateway.port`, par défaut `18789`).</Note>

1. Créez `~/.openclaw/workspace/canvas/index.html` sur l'hôte du gateway.

2. Accédez-y depuis le nœud (LAN) :

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (optionnel) : si les deux appareils sont sur Tailscale, utilisez un nom MagicDNS ou une IP tailnet au lieu de `.local`, par ex. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Ce serveur injecte un client de rechargement en direct dans le HTML et recharge lors des modifications de fichiers.
L'hôte A2UI se trouve à `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Commandes Canvas (premier plan uniquement) :

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (utilisez `{"url":""}` ou `{"url":"/"}` pour revenir à l'échafaud par défaut). `canvas.snapshot` renvoie `{ format, base64 }` (par défaut `format="jpeg"`).
- A2UI : `canvas.a2ui.push`, `canvas.a2ui.reset` (alias hérité `canvas.a2ui.pushJSONL`)

Commandes de caméra (premier plan uniquement ; soumises à autorisation) :

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Voir [Camera node](/fr/nodes/camera) pour les paramètres et les aides CLI.

### 8) Voix + surface de commande Android étendue

- Onglet Voice : Android dispose de deux modes de capture explicites. **Mic** est une session Voice-tab manuelle qui envoie chaque pause comme un tour de discussion et s'arrête lorsque l'application passe en arrière-plan ou que l'utilisateur quitte l'onglet Voice. **Talk** est le mode Talk continu et continue d'écouter jusqu'à ce qu'il soit désactivé ou que le nœud se déconnecte.
- Le mode Talk promeut le service de premier plan existant de `dataSync` à `dataSync|microphone` avant le début de la capture, puis le rétrograde lorsque le mode Talk s'arrête. Android 14+ nécessite la déclaration `FOREGROUND_SERVICE_MICROPHONE`, l'autorisation d'exécution `RECORD_AUDIO` et le type de service de microphone au moment de l'exécution.
- Par défaut, Android Talk utilise la reconnaissance vocale native, le chat Gateway et AndroidGateway`talk.speak` via le fournisseur de Talk Gateway configuré. Le TTS du système local est utilisé uniquement lorsque `talk.speak` n'est pas disponible.
- Android Talk n'utilise le relais Gateway en temps réel que lorsque `talk.realtime.mode` est `realtime` et que `talk.realtime.transport` est `gateway-relay`.
- Le réveil vocal reste désactivé dans l'UX/runtime Android.
- Familles de commandes Android supplémentaires (la disponibilité dépend de l'appareil, des autorisations et des paramètres utilisateur) :
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `device.apps` uniquement lorsque **Paramètres > Capacités du téléphone > Applications installées** est activé ; il répertorie par défaut les applications visibles dans le lanceur.
  - `notifications.list`, `notifications.actions` (voir [Notification forwarding](#notification-forwarding) ci-dessous)
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Points d'entrée de l'assistant

Android prend en charge le lancement de OpenClaw via le déclencheur de l'assistant système (Google
Assistant). Lorsqu'il est configuré, maintenir le bouton d'accueil ou dire « Ok Google, demande
à OpenClaw... » ouvre l'application et transmet l'invite au composeur de chat.

Cela utilise les métadonnées des **App Actions** Android déclarées dans le manifeste de l'application. Aucune
configuration supplémentaire n'est nécessaire du côté de la passerelle -- l'intention de l'assistant
est entièrement gérée par l'application Android et transmise comme un message de chat normal.

<Note>La disponibilité des App Actions dépend de l'appareil, de la version de Google Play Services, et du fait que l'utilisateur a défini OpenClaw comme application d'assistant par défaut.</Note>

## Transfert des notifications

Android peut transférer les notifications de l'appareil vers la passerelle sous forme d'événements. Plusieurs contrôles vous permettent de définir quelles notifications sont transférées et quand.

| Clé                              | Type           | Description                                                                                                                |
| -------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Transférer uniquement les notifications de ces noms de packages. Si défini, tous les autres packages sont ignorés.         |
| `notifications.denyPackages`     | string[]       | Ne jamais transférer les notifications de ces noms de packages. Appliqué après `allowPackages`.                            |
| `notifications.quietHours.start` | string (HH:mm) | Début de la fenêtre d'heures calmes (heure locale de l'appareil). Les notifications sont supprimées pendant cette fenêtre. |
| `notifications.quietHours.end`   | string (HH:mm) | Fin de la fenêtre d'heures calmes.                                                                                         |
| `notifications.rateLimit`        | number         | Nombre maximum de notifications transférées par package par minute. Les notifications excédentaires sont ignorées.         |

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

<Note>Le transfert des notifications nécessite la permission Android Notification Listener. L'application demande cette autorisation lors de la configuration.</Note>

## Connexes

- [Application iOS](/fr/platforms/ios)
- [Nœuds](/fr/nodes)
- [Dépannage du nœud Android](/fr/nodes/troubleshooting)
