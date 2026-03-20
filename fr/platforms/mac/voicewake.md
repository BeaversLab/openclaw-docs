---
summary: "Voice wake and push-to-talk modes plus routing details in the mac app"
read_when:
  - Working on voice wake or PTT pathways
title: "Voice Wake (macOS)"
---

# Réveil Vocal et Appui-parler

## Modes

- **Wake-word mode** (default): always-on Speech recognizer waits for trigger tokens (`swabbleTriggerWords`). On match it starts capture, shows the overlay with partial text, and auto-sends after silence.
- **Appui-parler (maintenir la touche Option droite)** : maintenez la touche Option droite pour capturer immédiatement — aucun déclencheur nécessaire. La superposition apparaît tant que la touche est maintenue ; relâcher finalise et transfère après un court délai afin que vous puissiez ajuster le texte.

## Comportement d'exécution (mot de réveil)

- Speech recognizer lives in `VoiceWakeRuntime`.
- Le déclencheur ne se déclenche que lorsqu'il y a une **pause significative** entre le mot de réveil et le mot suivant (écart d'environ 0,55 s). La superposition/le signal sonore peut commencer à la pause même avant que la commande ne commence.
- Fenêtres de silence : 2,0 s lorsque la parole est en cours, 5,0 s si seul le déclencheur a été entendu.
- Arrêt forcé : 120 s pour empêcher les sessions incontrôlées.
- Anti-rebond entre les sessions : 350 ms.
- Overlay is driven via `VoiceWakeOverlayController` with committed/volatile coloring.
- Après l'envoi, le module de reconnaissance redémarre proprement pour écouter le déclencheur suivant.

## Invariants du cycle de vie

- Si le Réveil Vocal est activé et que les autorisations sont accordées, le module de reconnaissance de mot de réveil doit être à l'écoute (sauf lors d'une capture explicite par appui-parler).
- La visibilité de la superposition (y compris la fermeture manuelle via le bouton X) ne doit jamais empêcher le module de reconnaissance de reprendre.

## Mode de défaillance de superposition persistante (précédent)

Auparavant, si la superposition restait bloquée visible et que vous la fermiez manuellement, le Réveil Vocal pouvait sembler « mort » car la tentative de redémarrage de l'exécution pouvait être bloquée par la visibilité de la superposition et aucun redémarrage ultérieur n'était planifié.

Renforcement :

- Le redémarrage de l'exécution du réveil n'est plus bloqué par la visibilité de la superposition.
- Overlay dismiss completion triggers a `VoiceWakeRuntime.refresh(...)` via `VoiceSessionCoordinator`, so manual X-dismiss always resumes listening.

## Spécificités de l'appui pour parler

- Hotkey detection uses a global `.flagsChanged` monitor for **right Option** (`keyCode 61` + `.option`). We only observe events (no swallowing).
- Capture pipeline lives in `VoicePushToTalk`: starts Speech immediately, streams partials to the overlay, and calls `VoiceWakeForwarder` on release.
- Lorsque l'appui pour parler commence, nous mettons en pause le moteur de mot de réveil pour éviter des conflits de capture audio ; il redémarre automatiquement après le relâchement.
- Autorisations : nécessite Microphone + Reconnaissance vocale ; la visualisation des événements nécessite l'approbation Accessibilité/Surveillance des entrées.
- Claviers externes : certains peuvent ne pas exposer la touche Option droite comme attendu — proposez un raccourci de secours si les utilisateurs signalent des oublis de détection.

## Paramètres utilisateur

- **Interrupteur Voice Wake** : active le moteur de mot de réveil.
- **Maintenir Cmd+Fn pour parler** : active le moniteur d'appui pour parler. Désactivé sur macOS < 26.
- Sélecteurs de langue et de micro, niveau sonore en direct, table des mots de déclenchement, testeur (local uniquement ; ne transfère pas).
- Le sélecteur de micro préserve la dernière sélection si un périphérique se déconnecte, affiche un indicateur de déconnexion, et revient temporairement au défaut système jusqu'à ce qu'il réapparaisse.
- **Sounds**: chimes on trigger detect and on send; defaults to the macOS “Glass” system sound. You can pick any `NSSound`-loadable file (e.g. MP3/WAV/AIFF) for each event or choose **No Sound**.

## Comportement de transfert

- Lorsque Voice Wake est activé, les transcriptions sont transférées à la passerelle/agent actif (le même mode local vs distant utilisé par le reste de l'application mac).
- Les réponses sont livrées au **fournisseur principal utilisé en dernier** (WhatsApp/Telegram/Discord/WebChat). Si la livraison échoue, l'erreur est journalisée et l'exécution reste visible via les journaux WebChat/session.

## Charge utile de transfert

- `VoiceWakeForwarder.prefixedTranscript(_:)` prepends the machine hint before sending. Shared between wake-word and push-to-talk paths.

## Vérification rapide

- Activez l'appui-parler, maintenez Cmd+Fn, parlez, relâchez : la superposition doit afficher les partiels puis envoyer.
- While holding, menu-bar ears should stay enlarged (uses `triggerVoiceEars(ttl:nil)`); they drop after release.

import en from "/components/footer/en.mdx";

<en />
