---
summary: "États et animations de l'icône de la barre de menus pour OpenClaw sur macOS"
read_when:
  - Changing menu bar icon behavior
title: "Icône de la barre de menus"
---

# États de l'icône de la barre de menus

Auteur : steipete · Mis à jour : 2025-12-06 · Portée : application macOS (`apps/macos`)

- **Inactif :** Animation d'icône normale (clignement, petit mouvement occasionnel).
- **En pause :** L'élément d'état utilise `appearsDisabled` ; aucun mouvement.
- **Déclencheur vocal (grandes oreilles) :** Le détecteur de réveil vocal appelle `AppState.triggerVoiceEars(ttl: nil)` lorsque le mot de réveil est détecté, en conservant `earBoostActive=true` pendant la capture de l'énoncé. Les oreilles s'agrandissent (1,9x), ont des trous d'oreilles circulaires pour la lisibilité, puis disparaissent via `stopVoiceEars()` après 1 seconde de silence. Déclenché uniquement par le pipeline vocal de l'application.
- **En cours de traitement (agent en cours d'exécution) :** `AppState.isWorking=true` entraîne un micromouvement de « ruée de queue/pattes » : un mouvement plus rapide des pattes et un léger décalage pendant le travail. Actuellement basculé autour des exécutions de l'agent WebChat ; ajoutez le même basculement autour d'autres tâches longues lorsque vous les connecterez.

Points de connexion

- Réveil vocal : runtime/testeur appelle `AppState.triggerVoiceEars(ttl: nil)` lors du déclenchement et `stopVoiceEars()` après 1 seconde de silence pour correspondre à la fenêtre de capture.
- Activité de l'agent : définir `AppStateStore.shared.setWorking(true/false)` autour des périodes de travail (déjà fait dans l'appel de l'agent WebChat). Gardez les périodes courtes et réinitialisez-les dans les blocs `defer` pour éviter les animations bloquées.

Formes et tailles

- Icône de base dessinée dans `CritterIconRenderer.makeIcon(blink:legWiggle:earWiggle:earScale:earHoles:)`.
- L'échelle des oreilles par défaut est `1.0` ; le boost vocal définit `earScale=1.9` et bascule `earHoles=true` sans changer le cadre global (image de modèle 18×18 pt rendue dans un magasin de sauvegarde Retina 36×36 px).
- La ruée utilise un mouvement de pattes jusqu'à ~1,0 avec une petite agitation horizontale ; il s'ajoute à tout mouvement de repos existant.

Notes comportementales

- Aucun basculement CLI/broker externe pour les oreilles/travail ; gardez-le interne aux signaux propres de l'application pour éviter les battements accidentels.
- Gardez les TTL courts (&lt;10s) pour que l'icône revienne rapidement à la ligne de base si une tâche se bloque.

import fr from "/components/footer/fr.mdx";

<fr />
