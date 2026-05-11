---
summary: "Mots de réveil vocaux globaux (appartenant au Gateway) et leur synchronisation entre les nœuds"
read_when:
  - Changing voice wake words behavior or defaults
  - Adding new node platforms that need wake word sync
title: "Réveil vocal"
---

OpenClaw traite les mots de réveil comme une **liste globale unique** appartenant au **Gateway**.

- Il n'y a **pas de mots de réveil personnalisés par nœud**.
- **Toute interface utilisateur de nœud/application peut modifier** la liste ; les modifications sont persistées par le Gateway et diffusées à tous.
- macOS et iOS conservent des interrupteurs locaux d'activation/désactivation du **Réveil vocal** (l'expérience utilisateur locale et les autorisations diffèrent).
- Android garde actuellement le Réveil vocal désactivé et utilise un flux manuel de microphone dans l'onglet Voice.

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

Notes :

- Les déclencheurs sont normalisés (espaces supprimés, éléments vides ignorés). Les listes vides reviennent aux valeurs par défaut.
- Des limites sont appliquées pour la sécurité (plafonds de nombre/longueur).

### Méthodes de routage (déclencheur → cible)

- `voicewake.routing.get` → `{ config: VoiceWakeRoutingConfig }`
- `voicewake.routing.set` avec les paramètres `{ config: VoiceWakeRoutingConfig }` → `{ config: VoiceWakeRoutingConfig }`

Forme `VoiceWakeRoutingConfig` :

```json
{
  "version": 1,
  "defaultTarget": { "mode": "current" },
  "routes": [{ "trigger": "robot wake", "target": { "sessionKey": "agent:main:main" } }],
  "updatedAtMs": 1730000000000
}
```

Les cibles de routage prennent en charge exactement l'une des options suivantes :

- `{ "mode": "current" }`
- `{ "agentId": "main" }`
- `{ "sessionKey": "agent:main:main" }`

### Événements

- Charge utile `voicewake.changed` `{ triggers: string[] }`
- Charge utile `voicewake.routing.changed` `{ config: VoiceWakeRoutingConfig }`

Qui le reçoit :

- Tous les clients WebSocket (application macOS, WebChat, etc.)
- Tous les nœuds connectés (iOS/Android), et également lors de la connexion du nœud en tant que push initial de « l'état actuel ».

## Comportement du client

### Application macOS

- Utilise la liste globale pour filtrer les déclencheurs `VoiceWakeRuntime`.
- La modification des « Mots déclencheurs » dans les paramètres du Réveil vocal appelle `voicewake.set` et s'appuie ensuite sur la diffusion pour maintenir les autres clients synchronisés.

### Nœud iOS

- Utilise la liste globale pour la détection des déclencheurs `VoiceWakeManager`.
- La modification des mots de réveil dans les paramètres appelle `voicewake.set` (via le WS du Gateway) et maintient également la réactivité de la détection locale des mots de réveil.

### Nœud Android

- Voice Wake est actuellement désactivé dans le runtime/les paramètres Android.
- La voix Android utilise une capture manuelle du microphone dans l'onglet Voice au lieu des déclencheurs de mots de réveil.

## Connexes

- [Mode talk](/fr/nodes/talk)
- [Notes audio et vocales](/fr/nodes/audio)
- [Compréhension des médias](/fr/nodes/media-understanding)
