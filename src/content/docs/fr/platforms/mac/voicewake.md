---
summary: "Modes de réveil vocal et d'appui-parler plus détails de routage dans l'application Mac"
read_when:
  - Working on voice wake or PTT pathways
title: "Réveil vocal (macOS)"
---

# Réveil Vocal et Appui-parler

## Modes

- **Mode mot de réveil** (par défaut) : le module de reconnaissance vocale toujours actif attend les jetons de déclenchement (`swabbleTriggerWords`). En cas de correspondance, il lance la capture, affiche la superposition avec le texte partiel et envoie automatiquement après silence.
- **Appui-parler (maintenir la touche Option droite)** : maintenez la touche Option droite pour capturer immédiatement — aucun déclencheur nécessaire. La superposition apparaît tant que la touche est maintenue ; relâcher finalise et transfère après un court délai afin que vous puissiez ajuster le texte.

## Comportement d'exécution (mot de réveil)

- Le module de reconnaissance vocale réside dans `VoiceWakeRuntime`.
- Le déclencheur ne se déclenche que lorsqu'il y a une **pause significative** entre le mot de réveil et le mot suivant (écart d'environ 0,55 s). La superposition/le signal sonore peut commencer à la pause même avant que la commande ne commence.
- Fenêtres de silence : 2,0 s lorsque la parole est en cours, 5,0 s si seul le déclencheur a été entendu.
- Arrêt forcé : 120 s pour empêcher les sessions incontrôlées.
- Anti-rebond entre les sessions : 350 ms.
- La superposition est pilotée via `VoiceWakeOverlayController` avec une coloration validée/volatile.
- Après l'envoi, le module de reconnaissance redémarre proprement pour écouter le déclencheur suivant.

## Invariants du cycle de vie

- Si le Réveil Vocal est activé et que les autorisations sont accordées, le module de reconnaissance de mot de réveil doit être à l'écoute (sauf lors d'une capture explicite par appui-parler).
- La visibilité de la superposition (y compris la fermeture manuelle via le bouton X) ne doit jamais empêcher le module de reconnaissance de reprendre.

## Mode de défaillance de superposition persistante (précédent)

Auparavant, si la superposition restait bloquée visible et que vous la fermiez manuellement, le Réveil Vocal pouvait sembler « mort » car la tentative de redémarrage de l'exécution pouvait être bloquée par la visibilité de la superposition et aucun redémarrage ultérieur n'était planifié.

Renforcement :

- Le redémarrage de l'exécution du réveil n'est plus bloqué par la visibilité de la superposition.
- La fin de la fermeture de la superposition déclenche un `VoiceWakeRuntime.refresh(...)` via `VoiceSessionCoordinator`, donc une fermeture manuelle par X reprend toujours l'écoute.

## Spécificités de l'appui pour parler

- La détection des raccourcis clavier utilise un moniteur global `.flagsChanged` pour la **touche Option droite** (`keyCode 61` + `.option`). Nous observons uniquement les événements (sans interception).
- Le pipeline de capture réside dans `VoicePushToTalk` : démarre la reconnaissance vocale immédiatement, diffuse les résultats partiels vers la superposition, et appelle `VoiceWakeForwarder` lors du relâchement.
- Lorsque l'appui pour parler commence, nous mettons en pause le moteur de mot de réveil pour éviter des conflits de capture audio ; il redémarre automatiquement après le relâchement.
- Autorisations : nécessite Microphone + Reconnaissance vocale ; la visualisation des événements nécessite l'approbation Accessibilité/Surveillance des entrées.
- Claviers externes : certains peuvent ne pas exposer la touche Option droite comme attendu — proposez un raccourci de secours si les utilisateurs signalent des oublis de détection.

## Paramètres utilisateur

- **Interrupteur Voice Wake** : active le moteur de mot de réveil.
- **Maintenir Cmd+Fn pour parler** : active le moniteur d'appui pour parler. Désactivé sur macOS < 26.
- Sélecteurs de langue et de micro, niveau sonore en direct, table des mots de déclenchement, testeur (local uniquement ; ne transfère pas).
- Le sélecteur de micro préserve la dernière sélection si un périphérique se déconnecte, affiche un indicateur de déconnexion, et revient temporairement au défaut système jusqu'à ce qu'il réapparaisse.
- **Sons** : sons lors de la détection d'un déclencheur et de l'envoi ; par défaut, le son système « Glass » de macOS. Vous pouvez choisir n'importe quel fichier chargeable par `NSSound` (ex. MP3/WAV/AIFF) pour chaque événement ou choisir **Aucun son**.

## Comportement de transfert

- Lorsque Voice Wake est activé, les transcriptions sont transférées à la passerelle/agent actif (le même mode local vs distant utilisé par le reste de l'application mac).
- Les réponses sont livrées au **fournisseur principal utilisé en dernier** (WhatsApp/Telegram/Discord/WebChat). Si la livraison échoue, l'erreur est journalisée et l'exécution reste visible via les journaux WebChat/session.

## Charge utile de transfert

- `VoiceWakeForwarder.prefixedTranscript(_:)` ajoute l'indice de machine avant l'envoi. Partagé entre les chemins de mot de réveil et d'appui-parler.

## Vérification rapide

- Activez l'appui-parler, maintenez Cmd+Fn, parlez, relâchez : la superposition doit afficher les partiels puis envoyer.
- Tout en maintenant, les oreilles de la barre de menu doivent rester agrandies (utilise `triggerVoiceEars(ttl:nil)`); elles disparaissent après le relâchement.
