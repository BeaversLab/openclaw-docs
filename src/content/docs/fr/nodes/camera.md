---
summary: "Capture d'appareil photo (nœuds iOS/Android + application macOS) pour usage de l'agent : photos (jpg) et courts extraits vidéo (mp4)"
read_when:
  - Adding or modifying camera capture on iOS/Android nodes or macOS
  - Extending agent-accessible MEDIA temp-file workflows
title: "Capture d'appareil photo"
---

# Capture d'appareil photo (agent)

OpenClaw prend en charge la **capture d'appareil photo** pour les workflows de l'agent :

- **Nœud iOS** (jumelé via Gateway) : capturer une **photo** (`jpg`) ou un **court extrait vidéo** (`mp4`, avec audio optionnel) via `node.invoke`.
- **Nœud Android** (jumelé via Gateway) : capturer une **photo** (`jpg`) ou un **court extrait vidéo** (`mp4`, avec audio optionnel) via `node.invoke`.
- **Application macOS** (nœud via Gateway) : capturer une **photo** (`jpg`) ou un **court extrait vidéo** (`mp4`, avec audio optionnel) via `node.invoke`.

Tout accès à l'appareil photo est protégé par des **paramètres contrôlés par l'utilisateur**.

## Nœud iOS

### Paramètre utilisateur (activé par défaut)

- Onglet Paramètres iOS → **Caméra** → **Autoriser la caméra** (`camera.enabled`)
  - Par défaut : **activé** (l'absence de clé est traitée comme activée).
  - Lorsqu'elle est désactivée : les commandes `camera.*` renvoient `CAMERA_DISABLED`.

### Commandes (via Gateway `node.invoke`)

- `camera.list`
  - Charge utile de réponse :
    - `devices` : tableau de `{ id, name, position, deviceType }`

- `camera.snap`
  - Paramètres :
    - `facing` : `front|back` (par défaut : `front`)
    - `maxWidth` : nombre (optionnel ; par défaut `1600` sur le nœud iOS)
    - `quality` : `0..1` (optionnel ; par défaut `0.9`)
    - `format` : actuellement `jpg`
    - `delayMs` : nombre (optionnel ; par défaut `0`)
    - `deviceId` : chaîne (optionnel ; depuis `camera.list`)
  - Charge utile de réponse :
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Garantie de charge utile : les photos sont recompressées pour maintenir la charge utile base64 sous 5 Mo.

- `camera.clip`
  - Paramètres :
    - `facing` : `front|back` (par défaut : `front`)
    - `durationMs` : nombre (par défaut `3000`, limité à un maximum de `60000`)
    - `includeAudio` : booléen (par défaut `true`)
    - `format` : actuellement `mp4`
    - `deviceId` : chaîne (optionnel ; depuis `camera.list`)
  - Charge utile de réponse :
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### Exigence de premier plan

Comme `canvas.*`, le nœud iOS n'autorise les commandes `camera.*` qu'en **premier plan**. Les appels en arrière-plan renvoient `NODE_BACKGROUND_UNAVAILABLE`.

### Assistant CLI (fichiers temporaires + MEDIA)

Le moyen le plus simple d'obtenir des pièces jointes consiste à utiliser l'assistant CLI, qui écrit les médias décodés dans un fichier temporaire et imprime `MEDIA:<path>`.

Exemples :

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

Notes :

- `nodes camera snap` est par défaut réglé sur **les deux** orientations pour donner à l'agent les deux vues.
- Les fichiers de sortie sont temporaires (dans le répertoire temporaire du SE) sauf si vous créez votre propre wrapper.

## Nœud Android

### Paramètre utilisateur Android (activé par défaut)

- Feuille de paramètres Android → **Caméra** → **Autoriser la caméra** (`camera.enabled`)
  - Par défaut : **activé** (une clé manquante est traitée comme activée).
  - Lorsque désactivé : les commandes `camera.*` renvoient `CAMERA_DISABLED`.

### Autorisations

- Android nécessite des autorisations d'exécution :
  - `CAMERA` pour à la fois `camera.snap` et `camera.clip`.
  - `RECORD_AUDIO` pour `camera.clip` lorsque `includeAudio=true`.

Si les autorisations sont manquantes, l'application vous demandera si possible ; si refusées, les requêtes `camera.*` échouent avec une erreur `*_PERMISSION_REQUIRED`.

### Exigence de premier plan Android

Comme `canvas.*`, le nœud Android n'autorise les commandes `camera.*` qu'en **premier plan**. Les appels en arrière-plan renvoient `NODE_BACKGROUND_UNAVAILABLE`.

### Commandes Android (via Gateway `node.invoke`)

- `camera.list`
  - Charge utile de réponse :
    - `devices` : tableau de `{ id, name, position, deviceType }`

### Garantie de charge utile

Les photos sont recompressées pour garder la charge utile base64 sous 5 Mo.

## Application macOS

### Paramètre utilisateur (désactivé par défaut)

L'application compagnon macOS expose une case à cocher :

- **Paramètres → Général → Autoriser l'appareil photo** (`openclaw.cameraEnabled`)
  - Par défaut : **désactivé**
  - Lorsque désactivé : les requêtes d'appareil photo renvoient « Camera disabled by user ».

### Assistant CLI (appel de nœud)

Utilisez le CLI `openclaw` principal pour appeler des commandes d'appareil photo sur le nœud macOS.

Exemples :

```bash
openclaw nodes camera list --node <id>            # list camera ids
openclaw nodes camera snap --node <id>            # prints MEDIA:<path>
openclaw nodes camera snap --node <id> --max-width 1280
openclaw nodes camera snap --node <id> --delay-ms 2000
openclaw nodes camera snap --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --duration 10s          # prints MEDIA:<path>
openclaw nodes camera clip --node <id> --duration-ms 3000      # prints MEDIA:<path> (legacy flag)
openclaw nodes camera clip --node <id> --device-id <id>
openclaw nodes camera clip --node <id> --no-audio
```

Notes :

- `openclaw nodes camera snap` correspond par défaut à `maxWidth=1600` sauf s'il est remplacé.
- Sur macOS, `camera.snap` attend `delayMs` (2000 ms par défaut) après le réglage de l'échauffement/exposition avant la capture.
- Les charges utiles des photos sont recompressées pour garder le base64 sous 5 Mo.

## Limites de sécurité et pratiques

- L'accès à l'appareil photo et au microphone déclenche les invites d'autorisation habituelles du système d'exploitation (et nécessite des chaînes d'utilisation dans Info.plist).
- Les clips vidéo sont limités (actuellement `<= 60s`) pour éviter des charges utiles de nœud trop volumineuses (surcharge base64 + limites de message).

## Vidéo de l'écran macOS (niveau OS)

Pour la vidéo de l'_écran_ (pas l'appareil photo), utilisez le compagnon macOS :

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

Notes :

- Nécessite l'autorisation **Screen Recording** macOS (TCC).
