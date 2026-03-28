---
summary: "Comportement de diffusion et de segmentation (réponses par blocs, diffusion d'aperçu de canal, mappage des modes)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "Diffusion et segmentation"
---

# Diffusion + segmentation

OpenClaw possède deux couches de diffusion distinctes :

- **Block streaming (channels) :** émet des **blocs** terminés au fur et à mesure que l'assistant écrit. Ce sont des messages de canal normaux (pas de deltas de jetons).
- **Preview streaming (Telegram/Discord/Slack) :** met à jour un **message d'aperçu** temporaire pendant la génération.

Il n'y a **pas de véritable diffusion par delta de jetons** vers les messages de canal aujourd'hui. La diffusion d'aperçu est basée sur les messages (envoi + modifications/ajouts).

## Block streaming (channel messages)

La diffusion par blocs envoie la sortie de l'assistant en gros morceaux dès qu'elle est disponible.

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

Légende :

- `text_delta/events` : événements de flux du modèle (peuvent être épars pour les modèles non diffusés en continu).
- `chunker` : `EmbeddedBlockChunker` appliquant les limites min/max + préférence de rupture.
- `channel send` : messages sortants réels (réponses par blocs).

**Contrôles :**

- `agents.defaults.blockStreamingDefault` : `"on"`/`"off"` (désactivé par défaut).
- Remplacements de canal : `*.blockStreaming` (et variantes par compte) pour forcer `"on"`/`"off"` par canal.
- `agents.defaults.blockStreamingBreak` : `"text_end"` ou `"message_end"`.
- `agents.defaults.blockStreamingChunk` : `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce` : `{ minChars?, maxChars?, idleMs? }` (fusionner les blocs diffusés avant l'envoi).
- Limite stricte du canal : `*.textChunkLimit` (par exemple, `channels.whatsapp.textChunkLimit`).
- Mode de segmentation du canal : `*.chunkMode` (`length` par défaut, `newline` divise sur les lignes vides (limites de paragraphes) avant la segmentation par longueur).
- Limite souple Discord : `channels.discord.maxLinesPerMessage` (17 par défaut) divise les réponses longues pour éviter le rognage de l'interface utilisateur.

**Sémantique des limites :**

- `text_end` : diffusez les blocs dès que le segmenteur les émet ; videz à chaque `text_end`.
- `message_end` : attendez que le message de l'assistant soit terminé, puis videz la sortie tamponnée.

`message_end` utilise toujours le segmenteur si le texte tamponné dépasse `maxChars`, il peut donc émettre plusieurs segments à la fin.

## Algorithme de segmentation (limites basse/haute)

La segmentation des blocs est implémentée par `EmbeddedBlockChunker` :

- **Limite basse :** ne pas émettre tant que le tampon n'est pas >= `minChars` (sauf si forcé).
- **Limite haute :** préférer les divisions avant `maxChars` ; si forcé, diviser à `maxChars`.
- **Préférence de rupture :** `paragraph` → `newline` → `sentence` → `whitespace` → rupture forcée.
- **Clôtures de code :** ne jamais diviser à l'intérieur des clôtures ; lors d'une division forcée à `maxChars`, fermez et rouvrez la clôture pour garder le Markdown valide.

`maxChars` est limité à `textChunkLimit` du canal, vous ne pouvez donc pas dépasser les limites par canal.

## Fusion (fusionner les blocs diffusés)

Lorsque la diffusion de blocs est activée, OpenClaw peut **fusionner des segments de blocs consécutifs**
avant de les envoyer. Cela réduit le « spam d'une seule ligne » tout en fournissant
une sortie progressive.

- La fusion attend les **intervalles d'inactivité** (`idleMs`) avant de vider.
- Les tampons sont plafonnés par `maxChars` et seront vidés s'ils le dépassent.
- `minChars` empêche l'envoi de minuscules fragments jusqu'à ce qu'il y ait suffisamment de texte accumulé
  (le vidage final envoie toujours le texte restant).
- Le jointeur est dérivé de `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espace).
- Les substitutions de canal sont disponibles via `*.blockStreamingCoalesce` (y compris les configurations par compte).
- La fusion par défaut `minChars` est augmentée à 1500 pour Signal/Slack/Discord, sauf si elle est remplacée.

## Rythme humain entre les blocs

Lorsque le block streaming est activé, vous pouvez ajouter une **pause aléatoire** entre
les réponses de blocs (après le premier bloc). Cela rend les réponses à bulles multiples
plus naturelles.

- Config : `agents.defaults.humanDelay` (remplacer pour chaque agent via `agents.list[].humanDelay`).
- Modes : `off` (par défaut), `natural` (800–2500ms), `custom` (`minMs`/`maxMs`).
- S'applique uniquement aux **réponses de blocs**, pas aux réponses finales ni aux résumés de tools.

## "Stream chunks or everything"

Cela correspond à :

- **Stream chunks :** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (émettre au fur et à mesure). Les canaux non-Telegram ont également besoin de `*.blockStreaming: true`.
- **Stream everything at end :** `blockStreamingBreak: "message_end"` (vider une fois, éventuellement plusieurs blocs si très long).
- **No block streaming :** `blockStreamingDefault: "off"` (seule la réponse finale).

**Note de canal :** Le block streaming est **désactivé sauf** si
`*.blockStreaming` est explicitement défini à `true`. Les canaux peuvent diffuser un aperçu en direct
(`channels.<channel>.streaming`) sans réponses de blocs.

Rappel de l'emplacement de la configuration : les valeurs par défaut `blockStreaming*` se trouvent sous
`agents.defaults`, et non dans la configuration racine.

## Modes de diffusion d'aperçu

Clé canonique : `channels.<channel>.streaming`

Modes :

- `off` : désactiver la diffusion d'aperçu.
- `partial` : aperçu unique remplacé par le dernier texte.
- `block` : mises à jour de l'aperçu par étapes découpées/ajoutées.
- `progress` : aperçu de progression/état pendant la génération, réponse finale à l'achèvement.

### Mappage de canal

| Canal    | `off` | `partial` | `block` | `progress`             |
| -------- | ----- | --------- | ------- | ---------------------- |
| Telegram | ✅    | ✅        | ✅      | correspond à `partial` |
| Discord  | ✅    | ✅        | ✅      | correspond à `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                     |

Slack uniquement :

- `channels.slack.nativeStreaming` active les appels à l'API de streaming native Slack lorsque `streaming=partial` (par défaut : `true`).

Migration de clé héritée :

- Telegram : `streamMode` + booléen `streaming` migrent automatiquement vers l'énumération `streaming`.
- Discord : `streamMode` + booléen `streaming` migrent automatiquement vers l'énumération `streaming`.
- Slack : `streamMode` migre automatiquement vers l'énumération `streaming` ; le booléen `streaming` migre automatiquement vers `nativeStreaming`.

### Comportement à l'exécution

Telegram :

- Utilise les mises à jour d'aperçu `sendMessage` + `editMessageText` sur les DMs et les groupes/sujets.
- Le streaming d'aperçu est ignoré lorsque le streaming de blocs Telegram est explicitement activé (pour éviter le double streaming).
- `/reasoning stream` peut écrire le raisonnement dans l'aperçu.

Discord :

- Utilise l'envoi et l'édition de messages d'aperçu.
- Le mode `block` utilise le découpage par ébauches (`draftChunk`).
- Le streaming d'aperçu est ignoré lorsque le streaming de blocs Discord est explicitement activé.

Slack :

- `partial` peut utiliser le streaming natif Slack (`chat.startStream`/`append`/`stop`) lorsque disponible.
- `block` utilise des aperçus d'ébauches de type ajout.
- `progress` utilise le texte d'aperçu d'état, puis la réponse finale.
