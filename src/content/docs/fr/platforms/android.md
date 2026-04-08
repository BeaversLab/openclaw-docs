---
summary: "Application Android (nœud) : manuel de connexion + surface de commande Connect/Chat/Voice/Android"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Application Android"
---

# Application Android (Nœud)

> **Remarque :** L'application Android n'a pas encore été publiée publiquement. Le code source est disponible dans le [dépôt OpenClaw](https://github.com/openclaw/openclaw) sous `apps/android`. Vous pouvez la compiler vous-même en utilisant Java 17 et le SDK Android (`./gradlew :app:assemblePlayDebug`). Consultez [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) pour les instructions de compilation.

## Instantané de la prise en charge

- Rôle : application de nœud compagnon (Android n'héberge pas le Gateway).
- Gateway requis : oui (exécutez-le sur macOS, Linux ou Windows via WSL2).
- Installation : [Getting Started](/en/start/getting-started) + [Pairing](/en/channels/pairing).
- Gateway : [Runbook](/en/gateway) + [Configuration](/en/gateway/configuration).
  - Protocoles : [Protocole Gateway](/en/gateway/protocol) (nœuds + plan de contrôle).

## Contrôle système

Le contrôle système (launchd/systemd) réside sur l'hôte du Gateway. Voir [Gateway](/en/gateway).

## Manuel de connexion

Application nœud Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se connecte directement au WebSocket du Gateway et utilise l'appareillage des appareils (`role: node`).

Pour Tailscale ou les hôtes publics, Android nécessite un point de terminaison sécurisé :

- Préféré : Tailscale Serve / Funnel avec `https://<magicdns>` / `wss://<magicdns>`
- Également pris en charge : tout autre URL `wss://` de Gateway avec un point de terminaison TLS réel
- Le texte en clair `ws://` reste pris en charge sur les adresses LAN privées / hôtes `.local`, ainsi que `localhost`, `127.0.0.1` et le pont de l'émulateur Android (`10.0.2.2`)

### Prérequis

- Vous pouvez exécuter le Gateway sur la machine « maître ».
- L'appareil/émulateur Android peut atteindre le WebSocket de la passerelle :
  - Même LAN avec mDNS/NSD, **ou**
  - Même tailnet Tailscale utilisant Wide-Area Bonjour / DNS-SD unicast (voir ci-dessous), **ou**
  - Hôte/port de passerelle manuel (secours)
- L'appareillage mobile sur tailnet/public n'utilise **pas** les points de terminaison IP de tailnet bruts `ws://`. Utilisez plutôt Tailscale Serve ou une autre URL `wss://`.
- Vous pouvez exécuter la CLI (`openclaw`) sur la machine de la passerelle (ou via SSH).

### 1) Démarrer le Gateway

```bash
openclaw gateway --port 18789 --verbose
```

Confirmez dans les journaux que vous voyez quelque chose comme :

- `listening on ws://0.0.0.0:18789`

Pour un accès Android à distance via Tailscale, préférez Serve/Funnel à une liaison brute tailnet :

```bash
openclaw gateway --tailscale serve
```

Cela fournit à Android un point de terminaison sécurisé `wss://` / `https://`. Une configuration `gateway.bind: "tailnet"` simple ne suffit pas pour le premier appairage Android à distance, sauf si vous terminez également TLS séparément.

### 2) Vérifier la découverte (optionnel)

Depuis la machine passerelle :

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Plus de notes de débogage : [Bonjour](/en/gateway/bonjour).

Si vous avez également configuré un domaine de découverte étendue (wide-area), comparez avec :

```bash
openclaw gateway discover --json
```

Cela affiche `local.` ainsi que le domaine étendu configuré en une seule passe et utilise le point de terminaison de service résolu au lieu des indices TXT uniquement.

#### Découverte Tailnet (Vienne ⇄ Londres) via unicast DNS-SD

La découverte Android NSD/mDNS ne traverse pas les réseaux. Si votre nœud Android et la passerelle sont sur des réseaux différents mais connectés via Tailscale, utilisez plutôt Bonjour étendu (Wide-Area) / unicast DNS-SD.

La seule découverte n'est pas suffisante pour l'appairage tailnet/public Android. La route découverte a toujours besoin d'un point de terminaison sécurisé (`wss://` ou Tailscale Serve) :

1. Configurez une zone DNS-SD (exemple `openclaw.internal.`) sur l'hôte de la passerelle et publiez des enregistrements `_openclaw-gw._tcp`.
2. Configurez le DNS fractionné (split DNS) Tailscale pour votre domaine choisi pointant vers ce serveur DNS.

Détails et exemple de configuration CoreDNS : [Bonjour](/en/gateway/bonjour).

### 3) Se connecter depuis Android

Dans l'application Android :

- L'application maintient sa connexion passerelle active via un **service de premier plan** (notification persistante).
- Ouvrez l'onglet **Connect**.
- Utilisez le mode **Code de configuration** ou **Manuel**.
- Si la découverte est bloquée, utilisez l'hôte/port manuel dans **Contrôles avancés**. Pour les hôtes LAN privés, `ws://` fonctionne toujours. Pour les hôtes Tailscale/publics, activez TLS et utilisez un point de terminaison `wss://` / Tailscale Serve.

Après le premier appairage réussi, Android se reconnecte automatiquement au lancement :

- Point de terminaison manuel (si activé), sinon
- La dernière passerelle découverte (au mieux).

### 4) Approuver l'appairage (CLI)

Sur la machine passerelle :

```bash
openclaw devices list
openclaw devices approve <requestId>
openclaw devices reject <requestId>
```

Détails de l'appairage : [Appairage](/en/channels/pairing).

### 5) Vérifier que le nœud est connecté

- Via nodes status :

  ```bash
  openclaw nodes status
  ```

- Via Gateway :

  ```bash
  openclaw gateway call node.list --params "{}"
  ```

### 6) Chat + historique

L'onglet Android Chat prend en charge la sélection de session (par défaut `main`, ainsi que d'autres sessions existantes) :

- Historique : `chat.history` (normalisé pour l'affichage ; les balises de directive en ligne sont
  supprimées du texte visible, les charges utiles XML d'appel d'outil en texte brut (y compris
  `<tool_call>...</tool_call>`, `<function_call>...</function_call>`,
  `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et
  les blocs d'appel d'outil tronqués) et les jetons de contrôle de modèle ASCII/à pleine largeur divulgués
  sont supprimés, les lignes d'assistant de jeton silencieux pur telles que `NO_REPLY` exact /
  `no_reply` sont omises, et les lignes trop volumineuses peuvent être remplacées par des espaces réservés)
- Envoyer : `chat.send`
- Mises à jour push (best-effort) : `chat.subscribe` → `event:"chat"`

### 7) Canvas + caméra

#### Hôte Canvas de la passerelle (recommandé pour le contenu Web)

Si vous souhaitez que le nœud affiche du HTML/CSS/JS réel que l'agent peut modifier sur le disque, pointez le nœud vers l'hôte canvas de la passerelle.

Remarque : les nœuds chargent le canvas à partir du serveur HTTP de la passerelle (même port que `gateway.port`, par défaut `18789`).

1. Créez `~/.openclaw/workspace/canvas/index.html` sur l'hôte de la passerelle.

2. Naviguez le nœud vers celui-ci (LAN) :

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (optionnel) : si les deux appareils sont sur Tailscale, utilisez un nom MagicDNS ou une IP tailnet au lieu de `.local`, par ex. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Ce serveur injecte un client de rechargement en direct dans le HTML et se recharge lors des modifications de fichiers.
L'hôte A2UI se trouve à `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Commandes Canvas (premier plan uniquement) :

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (utilisez `{"url":""}` ou `{"url":"/"}` pour revenir à l'échafaudage par défaut). `canvas.snapshot` renvoie `{ format, base64 }` (par défaut `format="jpeg"`).
- A2UI : `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` alias hérité)

Commandes de caméra (premier plan uniquement ; soumises à autorisation) :

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Voir [Camera node](/en/nodes/camera) pour les paramètres et les assistants CLI.

### 8) Voix + surface de commande étendue Android

- Voix : Android utilise un flux unique d'activation/désactivation du microphone dans l'onglet Voix avec capture de la transcription et lecture `talk.speak`. Le TTS système local est utilisé uniquement lorsque `talk.speak` n'est pas disponible. La voix s'arrête lorsque l'application quitte le premier plan.
- Les commutateurs de mode réveil/discours de la voix sont actuellement supprimés de l'UX/runtime Android.
- Familles de commandes supplémentaires Android (la disponibilité dépend de l'appareil + des autorisations) :
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
Assistant). Lorsqu'il est configuré, maintenir le bouton d'accueil enfoncé ou dire « Hey Google, demande
à OpenClaw... » ouvre l'application et transmet la demande au composeur de chat.

Cela utilise les métadonnées **App Actions** Android déclarées dans le manifeste de l'application. Aucune
configuration supplémentaire n'est nécessaire du côté de la passerelle -- l'intention de l'assistant est
gérée entièrement par l'application Android et transmise comme un message de chat normal.

<Note>La disponibilité des App Actions dépend de l'appareil, de la version de Google Play Services, et du fait que l'utilisateur a défini OpenClaw comme application assistant par défaut.</Note>

## Transmission des notifications

Android peut transmettre les notifications de l'appareil à la passerelle sous forme d'événements. Plusieurs contrôles vous permettent de définir la portée des notifications transmises et quand.

| Clé                              | Type           | Description                                                                                                           |
| -------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Ne transmettre que les notifications de ces noms de packages. Si défini, tous les autres packages sont ignorés.       |
| `notifications.denyPackages`     | string[]       | Ne jamais transmettre les notifications de ces noms de packages. Appliqué après `allowPackages`.                      |
| `notifications.quietHours.start` | chaîne (HH:mm) | Début de la période de silence (heure locale de l'appareil). Les notifications sont supprimées pendant cette période. |
| `notifications.quietHours.end`   | chaîne (HH:mm) | Fin de la période de silence.                                                                                         |
| `notifications.rateLimit`        | nombre         | Nombre maximum de notifications transférées par paquet par minute. Les notifications excédentaires sont ignorées.     |

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

<Note>Le transfert de notifications nécessite l'autorisation Android Notification Listener. L'application demande cette autorisation lors de la configuration.</Note>
