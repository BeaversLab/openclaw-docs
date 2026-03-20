---
summary: "Cycle de vie de la superposition vocale lorsque le mot d'éveil et l'appui pour parler se chevauchent"
read_when:
  - Ajustement du comportement de la superposition vocale
title: "Superposition vocale"
---

# Cycle de vie de la superposition vocale (macOS)

Public : contributeurs à l'application macOS. Objectif : garder la superposition vocale prévisible lorsque le mot d'éveil et l'appui-parler se chevauchent.

## Intention actuelle

- Si la superposition est déjà visible suite à un mot d'éveil et que l'utilisateur appuie sur la touche de raccourci, la session de raccourci _adopte_ le texte existant au lieu de le réinitialiser. La superposition reste active tant que la touche de raccourci est maintenue. Lorsque l'utilisateur relâche : envoyer s'il y a du texte rogné, sinon rejeter.
- Le mot d'éveil seul envoie toujours automatiquement en cas de silence ; l'appui-parler envoie immédiatement au relâchement.

## Implémenté (9 déc. 2025)

- Les sessions de superposition transportent désormais un jeton par capture (mot d'éveil ou appui-parler). Les mises à jour partielles/finales/envoi/rejet/niveau sont ignorées lorsque le jeton ne correspond pas, évitant ainsi les rappels obsolètes.
- L'appui-parler adopte tout texte visible de la superposition comme préfixe (ainsi, appuyer sur la touche de raccourci alors que la superposition d'éveil est active conserve le texte et ajoute la nouvelle parole). Il attend jusqu'à 1,5 s une transcription finale avant de revenir au texte actuel.
- La journalisation de la sonnerie/superposition est émise à `info` dans les catégories `voicewake.overlay`, `voicewake.ptt` et `voicewake.chime` (session start, partial, final, send, dismiss, chime reason).

## Prochaines étapes

1. **VoiceSessionCoordinator (actor)**
   - Possède exactement un `VoiceSession` à la fois.
   - API (basée sur des jetons) : `beginWakeCapture`, `beginPushToTalk`, `updatePartial`, `endCapture`, `cancel`, `applyCooldown`.
   - Ignore les rappels portant des jetons obsolètes (empêche les anciens reconnaissanceurs de rouvrir la superposition).
2. **VoiceSession (model)**
   - Champs : `token`, `source` (wakeWord|pushToTalk), texte committed/volatile, indicateurs de sonnerie, minuteries (auto-send, idle), `overlayMode` (display|editing|sending), date limite de refroidissement.
3. **Liaison de la superposition**
   - `VoiceSessionPublisher` (`ObservableObject`) reflète la session active dans SwiftUI.
   - `VoiceWakeOverlayView` ne s'affiche que via l'éditeur ; il ne modifie jamais directement les singletons globaux.
   - Les actions utilisateur de la superposition (`sendNow`, `dismiss`, `edit`) rappellent le coordinateur avec le jeton de session.
4. **Chemin d'envoi unifié**
   - Sur `endCapture` : si le texte rogné est vide → fermer ; sinon `performSend(session:)` (joue la sonnerie d'envoi une fois, transfère, ferme).
   - Push-to-talk : pas de délai ; mot de réveil : délai optionnel pour l'envoi automatique.
   - Appliquez un court cooldown au runtime de réveil après la fin du push-to-talk pour que le mot de réveil ne se redéclenche pas immédiatement.
5. **Journalisation**
   - Le coordinateur émet des journaux `.info` dans le sous-système `ai.openclaw`, catégories `voicewake.overlay` et `voicewake.chime`.
   - Événements clés : `session_started`, `adopted_by_push_to_talk`, `partial`, `finalized`, `send`, `dismiss`, `cancel`, `cooldown`.

## Liste de contrôle du débogage

- Diffusez les journaux lors de la reproduction d'une superposition bloquée :

  ```bash
  sudo log stream --predicate 'subsystem == "ai.openclaw" AND category CONTAINS "voicewake"' --level info --style compact
  ```

- Vérifiez qu'il n'y a qu'un seul jeton de session actif ; les rappels obsolètes doivent être ignorés par le coordinateur.
- Assurez-vous que le relâchement de l'appui pour parler appelle toujours `endCapture` avec le jeton actif ; si le texte est vide, attendez-vous à `dismiss` sans sonnerie ni envoi.

## Étapes de migration (suggérées)

1. Ajoutez `VoiceSessionCoordinator`, `VoiceSession` et `VoiceSessionPublisher`.
2. Refactor `VoiceWakeRuntime` to create/update/end sessions instead of touching `VoiceWakeOverlayController` directly.
3. Refactor `VoicePushToTalk` to adopt existing sessions and call `endCapture` on release; apply runtime cooldown.
4. Wire `VoiceWakeOverlayController` to the publisher; remove direct calls from runtime/PTT.
5. Add integration tests for session adoption, cooldown, and empty-text dismissal.

import fr from "/components/footer/fr.mdx";

<fr />
