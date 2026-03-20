---
summary: "États et animations de l'icône de la barre de menus pour OpenClaw sur macOS"
read_when:
  - Changement du comportement de l'icône de la barre de menus
title: "Icône de la barre de menus"
---

# États de l'icône de la barre de menus

Author: steipete · Updated: 2025-12-06 · Scope: Application macOS (`apps/macos`)

- **Inactif :** Animation d'icône normale (clignement, petit mouvement occasionnel).
- **Paused:** L'élément de statut utilise `appearsDisabled` ; pas de mouvement.
- **Voice trigger (big ears):** Le détecteur de réveil vocal appelle `AppState.triggerVoiceEars(ttl: nil)` lorsque le mot de réveil est détecté, tout en conservant `earBoostActive=true` pendant la capture de l'énoncé. Les oreilles s'agrandissent (1,9x), prennent une forme circulaire pour la lisibilité, puis reviennent à la normale via `stopVoiceEars()` après 1 seconde de silence. Déclenché uniquement depuis le pipeline vocal de l'application.
- **Working (agent running):** `AppState.isWorking=true` anime un micro-mouvement de « course de pattes/queue » : agitation plus rapide des pattes et léger décalage pendant le travail en cours. Actuellement activé autour des exécutions de l'agent WebChat ; ajoutez le même interrupteur autour des autres tâches longues lorsque vous les connecterez.

Points de connexion

- Voice wake: runtime/tester appellent `AppState.triggerVoiceEars(ttl: nil)` lors du déclenchement et `stopVoiceEars()` après 1 seconde de silence pour correspondre à la fenêtre de capture.
- Agent activity: définissez `AppStateStore.shared.setWorking(true/false)` autour des plages de travail (déjà fait dans l'appel de l'agent WebChat). Gardez les plages courtes et réinitialisez-les dans les blocs `defer` pour éviter les animations bloquées.

Formes et tailles

- Icône de base dessinée dans `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`.
- L'échelle des oreilles est par défaut `1.0` ; le boost vocal définit `earScale=1.9` et active `earHoles=true` sans changer le cadre global (image de modèle 18×18 pt rendue dans un tampon de backing Retina 36×36 px).
- La ruée utilise un mouvement de pattes jusqu'à ~1,0 avec une petite agitation horizontale ; il s'ajoute à tout mouvement de repos existant.

Notes comportementales

- Aucun basculement CLI/broker externe pour les oreilles/travail ; gardez-le interne aux signaux propres de l'application pour éviter les battements accidentels.
- Gardez les TTL courts (&lt;10s) afin que l'icône revienne rapidement à la ligne de base si une tâche bloque.

import fr from "/components/footer/fr.mdx";

<fr />
