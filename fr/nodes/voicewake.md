---
summary: "Mots de réveil vocaux globaux (appartenant au Gateway) et leur synchronisation entre les nœuds"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "Voice Wake"
---

# Voice Wake (Global Wake Words)

OpenClaw traite les **mots de réveil comme une liste globale unique** appartenant au **Gateway**.

- Il n'y a **pas de mots de réveil personnalisés par nœud**.
- **Toute interface utilisateur de nœud/application peut modifier** la liste ; les modifications sont persistées par le Gateway et diffusées à tous.
- macOS et iOS conservent des interrupteurs locaux pour **Voice Wake activé/désactivé** (l'expérience utilisateur locale + les autorisations diffèrent).
- Android garde actuellement Voice Wake désactivé et utilise un flux de microphone manuel dans l'onglet Voice.

## Stockage (hôte Gateway)

Les mots de réveil sont stockés sur la machine de la passerelle à l'emplacement :

- `~/.openclaw/settings/voicewake.json`

Forme :

```json
{ "triggers": ["openclaw", "claude", "computer"], "updatedAtMs": 1730000000000 }
```

## Protocole

### Méthodes

- `voicewake.get` → `{ triggers: string[] }`
- `voicewake.set` avec les paramètres `{ triggers: string[] }` → `{ triggers: string[] }`

Remarques :

- Les déclencheurs sont normalisés (espaces supprimés, éléments vides supprimés). Les listes vides reviennent aux valeurs par défaut.
- Des limites sont appliquées pour la sécurité (plafonds de nombre/longueur).

### Événements

- charge utile `voicewake.changed` `{ triggers: string[] }`

Qui le reçoit :

- Tous les clients WebSocket (application macOS, WebChat, etc.)
- Tous les nœuds connectés (iOS/Android), et également lors de la connexion du nœud en tant que diffusion initiale de l'« état actuel ».

## Comportement du client

### Application macOS

- Utilise la liste globale pour bloquer les déclencheurs `VoiceWakeRuntime`.
- La modification des « Mots de déclenchement » dans les paramètres de Voice Wake appelle `voicewake.set` et s'appuie ensuite sur la diffusion pour maintenir la synchronisation des autres clients.

### Nœud iOS

- Utilise la liste globale pour la détection de déclencheur `VoiceWakeManager`.
- La modification des mots de réveil dans les paramètres appelle `voicewake.set` (via le WS Gateway) et maintient également la détection locale des mots de réveil réactive.

### Nœud Android

- Voice Wake est actuellement désactivé dans le runtime/les paramètres Android.
- La voix Android utilise une capture manuelle du microphone dans l'onglet Voice au lieu des déclencheurs de mots de réveil.

import fr from "/components/footer/fr.mdx";

<fr />
