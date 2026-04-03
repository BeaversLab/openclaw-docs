---
summary: "application Android (nœud) : manuel de connexion + surface de commande Connect/Chat/Voice/Android"
read_when:
  - Pairing or reconnecting the Android node
  - Debugging Android gateway discovery or auth
  - Verifying chat history parity across clients
title: "Application Android"
---

# Application Android (Nœud)

> **Remarque :** L'application Android n'a pas encore été publiée publiquement. Le code source est disponible dans le [dépôt OpenClaw](https://github.com/openclaw/openclaw) sous `apps/android`. Vous pouvez la construire vous-même en utilisant Java 17 et le SDK Android (`./gradlew :app:assemblePlayDebug`). Consultez [apps/android/README.md](https://github.com/openclaw/openclaw/blob/main/apps/android/README.md) pour les instructions de construction.

## Instantané de la prise en charge

- Rôle : application de nœud compagnon (Android n'héberge pas le Gateway).
- Gateway requis : oui (exécutez-le sur macOS, Linux ou Windows via WSL2).
- Installation : [Getting Started](/en/start/getting-started) + [Pairing](/en/channels/pairing).
- Gateway : [Runbook](/en/gateway) + [Configuration](/en/gateway/configuration).
  - Protocoles : [Protocole Gateway](/en/gateway/protocol) (nœuds + plan de contrôle).

## Contrôle système

Le contrôle système (launchd/systemd) réside sur l'hôte Gateway. Voir [Gateway](/en/gateway).

## Manuel de connexion

Application nœud Android ⇄ (mDNS/NSD + WebSocket) ⇄ **Gateway**

Android se connecte directement au WebSocket du Gateway (par défaut `ws://<host>:18789`) et utilise l'appareillage des périphériques (`role: node`).

### Prérequis

- Vous pouvez exécuter le Gateway sur la machine « maître ».
- L'appareil/émulateur Android peut atteindre le WebSocket de la passerelle :
  - Même réseau local avec mDNS/NSD, **ou**
  - Même réseau tailnet Tailscale en utilisant Bonjour étendu / DNS-SD monodiffusion (voir ci-dessous), **ou**
  - Hôte/port de la passerelle manuel (solution de repli)
- Vous pouvez exécuter la CLI (`openclaw`) sur la machine passerelle (ou via SSH).

### 1) Démarrer le Gateway

```bash
openclaw gateway --port 18789 --verbose
```

Confirmez dans les journaux que vous voyez quelque chose comme :

- `listening on ws://0.0.0.0:18789`

Pour les configurations exclusivement tailnet (recommandé pour Vienne ⇄ Londres), liez la passerelle à l'IP du tailnet :

- Définissez `gateway.bind: "tailnet"` dans `~/.openclaw/openclaw.json` sur l'hôte passerelle.
- Redémarrez l'application de menu barre Gateway / macOS.

### 2) Vérifier la découverte (facultatif)

Depuis la machine passerelle :

```bash
dns-sd -B _openclaw-gw._tcp local.
```

Plus de notes de débogage : [Bonjour](/en/gateway/bonjour).

#### Découverte Tailnet (Vienne ⇄ Londres) via DNS-SD monodiffusion (unicast)

La découverte NSD/mDNS Android ne traverse pas les réseaux. Si votre nœud Android et la passerelle sont sur des réseaux différents mais connectés via Tailscale, utilisez plutôt Bonjour étendu / DNS-SD monodiffusion (unicast) :

1. Configurez une zone DNS-SD (exemple `openclaw.internal.`) sur l'hôte passerelle et publiez des enregistrements `_openclaw-gw._tcp`.
2. Configurez le DNS fractionné Tailscale pour votre domaine choisi pointant vers ce serveur DNS.

Détails et exemple de configuration CoreDNS : [Bonjour](/en/gateway/bonjour).

### 3) Se connecter depuis Android

Dans l'application Android :

- L'application maintient sa connexion passerelle active via un **service de premier plan** (notification persistante).
- Ouvrez l'onglet **Connect**.
- Utilisez le mode **Code de configuration** ou **Manuel**.
- Si la découverte est bloquée, utilisez l'hôte/port manuel (et TLS/jeton/mot de passe si nécessaire) dans **Contrôles avancés**.

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

Détails sur l'appareillage : [Pairing](/en/channels/pairing).

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

L'onglet Chat de l'application Android prend en charge la sélection de session (par défaut `main`, plus autres sessions existantes) :

- Historique : `chat.history`
- Envoyer : `chat.send`
- Mises à jour push (best-effort) : `chat.subscribe` → `event:"chat"`

### 7) Canvas + caméra

#### Hôte Gateway de Canvas (recommandé pour le contenu web)

Si vous souhaitez que le nœud affiche du vrai HTML/CSS/JS que l'agent peut modifier sur le disque, pointez le nœud vers l'hôte canvas de la Gateway.

Remarque : les nœuds chargent le canvas depuis le serveur HTTP du Gateway (même port que `gateway.port`, par défaut `18789`).

1. Create `~/.openclaw/workspace/canvas/index.html` sur l'hôte de la passerelle.

2. Naviguez vers ce dernier via le nœud (LAN) :

```bash
openclaw nodes invoke --node "<Android Node>" --command canvas.navigate --params '{"url":"http://<gateway-hostname>.local:18789/__openclaw__/canvas/"}'
```

Tailnet (facultatif) : si les deux appareils sont sur Tailscale, utilisez un nom MagicDNS ou une IP de tailnet au lieu de `.local`, par ex. `http://<gateway-magicdns>:18789/__openclaw__/canvas/`.

Ce serveur injecte un client de rechargement à chaud (live-reload) dans le HTML et recharge lors des modifications de fichiers.
L'hôte A2UI se trouve à `http://<gateway-host>:18789/__openclaw__/a2ui/`.

Commandes Canvas (premier plan uniquement) :

- `canvas.eval`, `canvas.snapshot`, `canvas.navigate` (utilisez `{"url":""}` ou `{"url":"/"}` pour revenir à l'échafaudage par défaut). `canvas.snapshot` renvoie `{ format, base64 }` (par défaut `format="jpeg"`).
- A2UI : `canvas.a2ui.push`, `canvas.a2ui.reset` (`canvas.a2ui.pushJSONL` ancien alias)

Commandes de caméra (premier plan uniquement ; soumises aux permissions) :

- `camera.snap` (jpg)
- `camera.clip` (mp4)

Voir [Camera node](/en/nodes/camera) pour les paramètres et les aides CLI.

### 8) Voix + surface de commande Android étendue

- Voix : Android utilise un flux unique d'activation/désactivation du micro dans l'onglet Voix avec capture de transcription et lecture TTS (ElevenLabs si configuré, secours TTS système). La voix s'arrête lorsque l'application quitte le premier plan.
- Les bascules de réveil/mode de parole de la voix sont actuellement supprimées de l'UX/runtime Android.
- Familles de commandes Android supplémentaires (la disponibilité dépend de l'appareil + des permissions) :
  - `device.status`, `device.info`, `device.permissions`, `device.health`
  - `notifications.list`, `notifications.actions` (voir [Notification forwarding](#notification-forwarding) ci-dessous)
  - `photos.latest`
  - `contacts.search`, `contacts.add`
  - `calendar.events`, `calendar.add`
  - `callLog.search`
  - `sms.search`
  - `motion.activity`, `motion.pedometer`

## Transmission des notifications

Android peut transmettre les notifications de l'appareil à la passerelle sous forme d'événements. Plusieurs contrôles vous permettent de définir la portée des notifications transmises et le moment de la transmission.

| Clé                              | Type           | Description                                                                                                                |
| -------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `notifications.allowPackages`    | string[]       | Ne transmettre que les notifications de ces noms de packages. Si défini, tous les autres packages sont ignorés.            |
| `notifications.denyPackages`     | string[]       | Ne jamais transmettre les notifications de ces noms de packages. Appliqué après `allowPackages`.                           |
| `notifications.quietHours.start` | string (HH:mm) | Début de la fenêtre d'heures calmes (heure locale de l'appareil). Les notifications sont supprimées pendant cette fenêtre. |
| `notifications.quietHours.end`   | chaîne (HH:mm) | Fin de la fenêtre des heures de silence.                                                                                   |
| `notifications.rateLimit`        | numéro         | Nombre maximum de notifications transférées par package par minute. Les notifications excédentaires sont ignorées.         |

Le sélecteur de notifications utilise également un comportement plus sûr pour les événements de notification transférés, évitant le transfert accidentel de notifications système sensibles.

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

<Note>Le transfert de notifications nécessite la autorisation Android Notification Listener. L'application demande cette autorisation lors de la configuration.</Note>
