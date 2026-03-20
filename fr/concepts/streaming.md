---
summary: "Streaming + chunking behavior (block replies, channel preview streaming, mode mapping)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "Streaming and Chunking"
---

# Streaming + chunking

OpenClaw has two separate streaming layers:

- **Block streaming (channels):** emit completed **blocks** as the assistant writes. These are normal channel messages (not token deltas).
- **Preview streaming (Telegram/Discord/Slack):** update a temporary **preview message** while generating.

There is **no true token-delta streaming** to channel messages today. Preview streaming is message-based (send + edits/appends).

## Block streaming (channel messages)

Block streaming sends assistant output in coarse chunks as it becomes available.

```
Model output
  └─ text_delta/events
       ├─ (blockStreamingBreak=text_end)
       │    └─ chunker emits blocks as buffer grows
       └─ (blockStreamingBreak=message_end)
            └─ chunker flushes at message_end
                   └─ channel send (block replies)
```

Legend:

- `text_delta/events`: model stream events (may be sparse for non-streaming models).
- `chunker`: `EmbeddedBlockChunker` applying min/max bounds + break preference.
- `channel send`: actual outbound messages (block replies).

**Controls:**

- `agents.defaults.blockStreamingDefault`: `"on"`/`"off"` (default off).
- Channel overrides: `*.blockStreaming` (and per-account variants) to force `"on"`/`"off"` per channel.
- `agents.defaults.blockStreamingBreak`: `"text_end"` or `"message_end"`.
- `agents.defaults.blockStreamingChunk`: `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce`: `{ minChars?, maxChars?, idleMs? }` (merge streamed blocks before send).
- Channel hard cap: `*.textChunkLimit` (e.g., `channels.whatsapp.textChunkLimit`).
- Channel chunk mode: `*.chunkMode` (`length` default, `newline` splits on blank lines (paragraph boundaries) before length chunking).
- Discord soft cap: `channels.discord.maxLinesPerMessage` (default 17) splits tall replies to avoid UI clipping.

**Boundary semantics:**

- `text_end` : diffuser les blocs dès que le chunker les émet ; vider à chaque `text_end`.
- `message_end` : attendre que le message de l'assistant soit terminé, puis vider la sortie tamponnée.

`message_end` utilise toujours le chunker si le texte tamponné dépasse `maxChars`, il peut donc émettre plusieurs chunks à la fin.

## Algorithme de découpage (limites basse/haute)

Le découpage des blocs est implémenté par `EmbeddedBlockChunker` :

- **Limite basse :** ne pas émettre tant que le tampon n'est pas >= `minChars` (sauf si forcé).
- **Limite haute :** préférer les séparations avant `maxChars` ; si forcé, séparer à `maxChars`.
- **Préférence de rupture :** `paragraph` → `newline` → `sentence` → `whitespace` → rupture forcée.
- **Clôtures de code :** ne jamais séparer à l'intérieur des clôtures ; lorsque forcé à `maxChars`, fermer + rouvrir la clôture pour garder le Markdown valide.

`maxChars` est limité à la `textChunkLimit` du channel, vous ne pouvez donc pas dépasser les limites par channel.

## Fusion (fusion des blocs diffusés)

Lorsque le block streaming est activé, OpenClaw peut **fusionner les chunks de blocs consécutifs**
avant de les envoyer. Cela réduit le « spam monoligne » tout en fournissant
toujours une sortie progressive.

- La fusion attend les **trous d'inactivité** (`idleMs`) avant de vider.
- Les tampons sont plafonnés par `maxChars` et seront vidés s'ils le dépassent.
- `minChars` empêche l'envoi de minuscules fragments jusqu'à ce que suffisamment de texte s'accumule
  (le vidage final envoie toujours le texte restant).
- Le jointeur est dérivé de `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espace).
- Les remplacements de channel sont disponibles via `*.blockStreamingCoalesce` (y compris les configurations par compte).
- La fusion par défaut `minChars` est augmentée à 1500 pour Signal/Slack/Discord sauf si remplacée.

## Rythme humain entre les blocs

Lorsque le block streaming est activé, vous pouvez ajouter une **pause aléatoire** entre
les réponses de bloc (après le premier bloc). Cela rend les réponses à plusieurs bulles plus naturelles.

- Config : `agents.defaults.humanDelay` (remplacer par agent via `agents.list[].humanDelay`).
- Modes : `off` (par défaut), `natural` (800–2500 ms), `custom` (`minMs`/`maxMs`).
- S'applique uniquement aux **réponses de bloc**, pas aux réponses finales ou aux résumés de tool.

## "Stream chunks or everything"

Cela correspond à :

- **Stream chunks :** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (émettre au fur et à mesure). Les canaux non-Telegram ont également besoin de `*.blockStreaming: true`.
- **Stream everything at end :** `blockStreamingBreak: "message_end"` (vider une fois, éventuellement plusieurs chunks si très long).
- **No block streaming :** `blockStreamingDefault: "off"` (seule la réponse finale).

**Note de canal :** Le block streaming est **désactivé sauf si**
`*.blockStreaming` est explicitement défini sur `true`. Les canaux peuvent diffuser un aperçu en direct
(`channels.<channel>.streaming`) sans réponses de bloc.

Rappel de l'emplacement de la configuration : les valeurs par défaut `blockStreaming*` se trouvent sous
`agents.defaults`, et non dans la configuration racine.

## Modes de streaming d'aperçu

Clé canonique : `channels.<channel>.streaming`

Modes :

- `off` : désactiver le streaming d'aperçu.
- `partial` : aperçu unique qui est remplacé par le dernier texte.
- `block` : mises à jour de l'aperçu par étapes découpées/ajoutées.
- `progress` : aperçu de progression/statut pendant la génération, réponse finale à l'achèvement.

### Mapping de canal

| Canal  | `off` | `partial` | `block` | `progress`        |
| -------- | ----- | --------- | ------- | ----------------- |
| Telegram | ✅    | ✅        | ✅      | correspond à `partial` |
| Discord  | ✅    | ✅        | ✅      | correspond à `partial` |
| Slack    | ✅    | ✅        | ✅      | ✅                |

Slack uniquement :

- `channels.slack.nativeStreaming` active/désactive les appels Slack de streaming natif de API lorsque `streaming=partial` (par défaut : `true`).

Migration de clé héritée :

- Telegram : `streamMode` + booléen `streaming` migration automatique vers l'énumération `streaming`.
- Discord : `streamMode` + booléen `streaming` migration automatique vers l'énumération `streaming`.
- Slack : `streamMode` migre automatiquement vers l'énumération `streaming` ; le booléen `streaming` migre automatiquement vers `nativeStreaming`.

### Comportement à l'exécution

Telegram :

- Utilise les mises à jour d'aperçu `sendMessage` + `editMessageText` dans les DMs et les groupes/sujets.
- Le streaming d'aperçu est ignoré lorsque le block streaming Telegram est explicitement activé (pour éviter le double streaming).
- `/reasoning stream` peut écrire le raisonnement dans l'aperçu.

Discord :

- Utilise l'envoi et la modification de messages d'aperçu.
- Le mode `block` utilise le découpage de brouillon (`draftChunk`).
- Le streaming d'aperçu est ignoré lorsque le block streaming Discord est explicitement activé.

Slack :

- `partial` peut utiliser le streaming natif Slack (`chat.startStream`/`append`/`stop`) lorsque disponible.
- `block` utilise des aperçus de brouillon de type ajout.
- `progress` utilise le texte d'aperçu de statut, puis la réponse finale.

import en from "/components/footer/en.mdx";

<en />
