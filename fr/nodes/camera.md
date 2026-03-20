---
summary: "Camera capture (iOS/Android nodes + macOS app) pour l'usage de l'agent : photos (jpg) et courts clips vidéo (mp4)"
read_when:
  - Ajout ou modification de la capture de caméra sur les nœuds iOS/Android ou macOS
  - Extension des flux de travail de fichiers temporaires MEDIA accessibles par l'agent
title: "Camera Capture"
---

# Camera capture (agent)

OpenClaw prend en charge la **camera capture** pour les flux de travail de l'agent :

- **Nœud iOS** (apparié via Gateway) : capturer une **photo** (`jpg`) ou un **court clip vidéo** (`mp4`, avec audio optionnel) via `node.invoke`.
- **Nœud Android** (apparié via Gateway) : capturer une **photo** (`jpg`) ou un **court clip vidéo** (`mp4`, avec audio optionnel) via `node.invoke`.
- **Application macOS** (nœud via Gateway) : capturer une **photo** (`jpg`) ou un **court clip vidéo** (`mp4`, avec audio optionnel) via `node.invoke`.

Tout accès à la caméra est verrouillé derrière des **paramètres contrôlés par l'utilisateur**.

## Nœud iOS

### Paramètre utilisateur (activé par défaut)

- Onglet des paramètres iOS → **Caméra** → **Autoriser la caméra** (`camera.enabled`)
  - Par défaut : **activé** (une clé manquante est considérée comme activée).
  - Lorsque désactivé : les commandes `camera.*` renvoient `CAMERA_DISABLED`.

### Commandes (via Gateway `node.invoke`)

- `camera.list`
  - Charge utile de réponse :
    - `devices` : tableau de `{ id, name, position, deviceType }`

- `camera.snap`
  - Paramètres :
    - `facing` : `front|back` (par défaut : `front`)
    - `maxWidth` : nombre (facultatif ; par défaut `1600` sur le nœud iOS)
    - `quality` : `0..1` (facultatif ; par défaut `0.9`)
    - `format` : actuellement `jpg`
    - `delayMs` : nombre (facultatif ; par défaut `0`)
    - `deviceId` : chaîne (facultatif ; depuis `camera.list`)
  - Charge utile de réponse :
    - `format: "jpg"`
    - `base64: "<...>"`
    - `width`, `height`
  - Garantie de charge utile : les photos sont recomprimées pour maintenir la charge utile base64 sous les 5 Mo.

- `camera.clip`
  - Paramètres :
    - `facing` : `front|back` (par défaut : `front`)
    - `durationMs` : nombre (par défaut `3000`, limité à un maximum de `60000`)
    - `includeAudio` : booléen (par défaut `true`)
    - `format` : actuellement `mp4`
    - `deviceId` : chaîne (facultatif ; depuis `camera.list`)
  - Charge utile de réponse :
    - `format: "mp4"`
    - `base64: "<...>"`
    - `durationMs`
    - `hasAudio`

### Exigence de premier plan

Comme `canvas.*`, le nœud iOS n'autorise les commandes `camera.*` qu'en **premier plan**. Les appels en arrière-plan renvoient `NODE_BACKGROUND_UNAVAILABLE`.

### Assistant CLI (fichiers temporaires + MEDIA)

Le moyen le plus simple d'obtenir des pièces jointes est via l'assistant CLI, qui écrit les médias décodés dans un fichier temporaire et imprime `MEDIA:<path>`.

Exemples :

```bash
openclaw nodes camera snap --node <id>               # default: both front + back (2 MEDIA lines)
openclaw nodes camera snap --node <id> --facing front
openclaw nodes camera clip --node <id> --duration 3000
openclaw nodes camera clip --node <id> --no-audio
```

Remarques :

- `nodes camera snap` est réglé par défaut sur **les deux** orientations pour donner à l'agent les deux vues.
- Les fichiers de sortie sont temporaires (dans le répertoire temporaire de l'OS) sauf si vous créez votre propre wrapper.

## Nœud Android

### Paramètre utilisateur Android (activé par défaut)

- Feuille de paramètres Android → **Appareil photo** → **Autoriser l'appareil photo** (`camera.enabled`)
  - Par défaut : **activé** (une clé manquante est traitée comme activée).
  - Lorsqu'il est désactivé : les commandes `camera.*` renvoient `CAMERA_DISABLED`.

### Autorisations

- Android nécessite des autorisations d'exécution :
  - `CAMERA` pour `camera.snap` et `camera.clip`.
  - `RECORD_AUDIO` pour `camera.clip` lorsque `includeAudio=true`.

Si les autorisations sont manquantes, l'application invite à les accorder si possible ; si elles sont refusées, les requêtes `camera.*` échouent avec une erreur `*_PERMISSION_REQUIRED`.

### Exigence de premier plan Android

Comme `canvas.*`, le nœud Android autorise uniquement les commandes `camera.*` en **premier plan**. Les appels en arrière-plan renvoient `NODE_BACKGROUND_UNAVAILABLE`.

### Commandes Android (via Gateway `node.invoke`)

- `camera.list`
  - Payload de réponse :
    - `devices` : tableau de `{ id, name, position, deviceType }`

### Garde du payload

Les photos sont recompressées pour garder la charge utile base64 sous 5 Mo.

## application macOS

### Paramètre utilisateur (désactivé par défaut)

L'application compagnon macOS expose une case à cocher :

- **Réglages → Général → Autoriser l'appareil photo** (`openclaw.cameraEnabled`)
  - Par défaut : **désactivé**
  - Lorsqu'il est désactivé : les requêtes d'appareil photo renvoient « Camera disabled by user ».

### Assistant CLI (appel de nœud)

Utilisez le CLI `openclaw` principal pour invoquer les commandes d'appareil photo sur le nœud macOS.

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

Remarques :

- `openclaw nodes camera snap` vaut `maxWidth=1600` par défaut, sauf si elle est remplacée.
- Sur macOS, `camera.snap` attend `delayMs` (2000 ms par défaut) après le réglage de l'échauffement/exposition avant de capturer.
- Les charges utiles des photos sont recompressées pour garder le base64 sous 5 Mo.

## Limites de sécurité et pratiques

- L'accès à l'appareil photo et au microphone déclenche les invites d'autorisation habituelles du système d'exploitation (et nécessite des chaînes d'utilisation dans Info.plist).
- Les clips vidéo sont limités (actuellement `<= 60s`) pour éviter des charges utiles de nœud trop volumineuses (surcharge base64 + limites de messages).

## Vidéo de l'écran macOS (niveau système d'exploitation)

Pour la vidéo d'_écran_ (pas la caméra), utilisez l'application compagnon macOS :

```bash
openclaw nodes screen record --node <id> --duration 10s --fps 15   # prints MEDIA:<path>
```

Remarques :

- Nécessite l'autorisation macOS **Enregistrement de l'écran** (TCC).

import en from "/components/footer/en.mdx";

<en />
