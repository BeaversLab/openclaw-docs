---
summary: "Règles de gestion des images et des médias pour l'envoi, la passerelle et les réponses des agents"
read_when:
  - Modifying media pipeline or attachments
title: "Prise en charge des images et des médias"
---

# Prise en charge des images et des médias — 2025-12-05

Le channel WhatsApp fonctionne via **Baileys Web**. Ce document capture les règles actuelles de gestion des médias pour l'envoi, la passerelle et les réponses des agents.

## Objectifs

- Envoyer des médias avec des légendes facultatives via `openclaw message send --media`.
- Autoriser les réponses automatiques depuis la boîte de réception Web à inclure des médias avec le texte.
- Garder les limites par type raisonnables et prévisibles.

## Interface CLI

- `openclaw message send --media <path-or-url> [--message <caption>]`
  - `--media` facultatif ; la légende peut être vide pour les envois de médias uniquement.
  - `--dry-run` affiche la charge utile résolue ; `--json` émet `{ channel, to, messageId, mediaUrl, caption }`.

## Comportement du channel Web WhatsApp

- Entrée : chemin d'accès au fichier local **ou** URL HTTP(S).
- Flux : charger dans un tampon (Buffer), détecter le type de média et construire la charge utile correcte :
  - **Images :** redimensionner et recompresser en JPEG (côté max 2048px) en ciblant `agents.defaults.mediaMaxMb` (par défaut 5 Mo), plafonné à 6 Mo.
  - **Audio/Voix/Vidéo :** transfert direct jusqu'à 16 Mo ; l'audio est envoyé sous forme de note vocale (`ptt: true`).
  - **Documents :** tout le reste, jusqu'à 100 Mo, avec le nom de fichier conservé si disponible.
- Lecture style GIF WhatsApp : envoyer un MP4 avec `gifPlayback: true` (CLI : `--gif-playback`) afin que les clients mobiles bouclent en ligne.
- La détection MIME privilégie les octets magiques, puis les en-têtes, puis l'extension de fichier.
- La légende provient de `--message` ou `reply.text` ; une légende vide est autorisée.
- Journalisation : non verbeux affiche `↩️`/`✅` ; verbeux inclut la taille et le chemin d'accès/URL source.

## Pipeline de réponse automatique

- `getReplyFromConfig` renvoie `{ text?, mediaUrl?, mediaUrls? }`.
- Lorsque des médias sont présents, l'expéditeur Web résout les chemins locaux ou les URL en utilisant le même pipeline que `openclaw message send`.
- Plusieurs entrées multimédias sont envoyées séquentiellement si elles sont fournies.

## Médias entrants vers les commandes (Pi)

- Lorsque les messages web entrants incluent des médias, OpenClaw les télécharge dans un fichier temporaire et expose des variables de modèle :
  - `{{MediaUrl}}` pseudo-URL pour les médias entrants.
  - `{{MediaPath}}` chemin temporaire local écrit avant l'exécution de la commande.
- Lorsqu'un bac à sable Docker par session est activé, les médias entrants sont copiés dans l'espace de travail du bac à sable et `MediaPath`/`MediaUrl` sont réécrits dans un chemin relatif comme `media/inbound/<filename>`.
- La compréhension des médias (si configurée via `tools.media.*` ou `tools.media.models` partagé) s'exécute avant le modèle et peut insérer des blocs `[Image]`, `[Audio]` et `[Video]` dans `Body`.
  - L'audio définit `{{Transcript}}` et utilise la transcription pour l'analyse des commandes, afin que les commandes slash fonctionnent toujours.
  - Les descriptions vidéo et image préservent tout le texte de légende pour l'analyse des commandes.
- Par défaut, seule la première pièce jointe image/audio/vidéo correspondante est traitée ; définissez `tools.media.<cap>.attachments` pour traiter plusieurs pièces jointes.

## Limites et erreurs

**Limites d'envoi sortant (envoi web WhatsApp)**

- Images : limite d'environ 6 Mo après recompression.
- Audio/voix/vidéo : limite de 16 Mo ; documents : limite de 100 Mo.
- Médias trop volumineux ou illisibles → erreur claire dans les journaux et la réponse est ignorée.

**Limites de compréhension des médias (transcription/description)**

- Image par défaut : 10 Mo (`tools.media.image.maxBytes`).
- Audio par défaut : 20 Mo (`tools.media.audio.maxBytes`).
- Vidéo par défaut : 50 Mo (`tools.media.video.maxBytes`).
- Les médias trop volumineux sautent l'étape de compréhension, mais les réponses sont toujours envoyées avec le corps d'origine.

## Notes pour les tests

- Couvrir les flux d'envoi + réponse pour les cas image/audio/document.
- Valider la recompression pour les images (limite de taille) et l'indicateur de note vocale pour l'audio.
- S'assurer que les réponses multimédias multiples sont distribuées sous forme d'envois séquentiels.

import fr from '/components/footer/fr.mdx';

<fr />
