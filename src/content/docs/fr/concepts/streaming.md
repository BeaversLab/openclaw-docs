---
summary: "Comportement de diffusion + segmentation (réponses de bloc, diffusion d'aperçu de channel, mappage de mode)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "Diffusion et segmentation"
---

OpenClaw possède deux couches de streaming distinctes :

- **Block streaming (channels) :** émet des **blocs** terminés au fur et à mesure que l'assistant écrit. Ce sont des messages de canal normaux (pas de deltas de jetons).
- **Preview streaming (Telegram/Discord/Slack) :** met à jour un **message d'aperçu** temporaire pendant la génération.

Il n'y a **aucun véritable streaming de deltas de jetons** vers les messages de canal pour l'instant. Le streaming d'aperçu est basé sur les messages (envoi + modifications/ajouts).

## Block streaming (messages de canal)

Le Block streaming envoie la sortie de l'assistant en gros morceaux au fur et à mesure qu'elle devient disponible.

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

- `text_delta/events` : événements de diffusion du model (peuvent être clairsemés pour les modèles non continuus).
- `chunker` : `EmbeddedBlockChunker` appliquant les bornes min/max + préférence de rupture.
- `channel send` : messages sortants réels (réponses de bloc).

**Contrôles :**

- `agents.defaults.blockStreamingDefault` : `"on"`/`"off"` (désactivé par défaut).
- Remplacements de channel : `*.blockStreaming` (et variantes par compte) pour forcer `"on"`/`"off"` par channel.
- `agents.defaults.blockStreamingBreak` : `"text_end"` ou `"message_end"`.
- `agents.defaults.blockStreamingChunk` : `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce` : `{ minChars?, maxChars?, idleMs? }` (fusionner les blocs diffusés avant l'envoi).
- Limite absolue de channel : `*.textChunkLimit` (par exemple, `channels.whatsapp.textChunkLimit`).
- Mode de segmentation de channel : `*.chunkMode` (`length` par défaut, `newline` divise sur les lignes vides (limites de paragraphe) avant la segmentation par longueur).
- Limite souple de Discord : Discord`channels.discord.maxLinesPerMessage` (17 par défaut) divise les réponses hautes pour éviter le découpage de l'interface.

**Sémantique des limites :**

- `text_end` : diffuser les blocs dès que le segmenteur émet ; vider à chaque `text_end`.
- `message_end` : attendre que le message de l'assistant se termine, puis vider la sortie tamponnée.

`message_end` utilise toujours le segmenteur si le texte tamponné dépasse `maxChars`, il peut donc émettre plusieurs segments à la fin.

### Livraison de médias avec le block streaming

Les directives `MEDIA:`OpenClaw sont des métadonnées de livraison normales. Lorsque la block streaming envoie un bloc média tôt, OpenClaw se souvient de cette livraison pour le tour. Si la charge utile finale de l'assistant répète la même URL média, la livraison finale supprime le média en double au lieu d'envoyer à nouveau la pièce jointe.

Les payloads finaux exactement en double sont supprimés. Si le payload final ajoute
du texte distinct autour de médias déjà diffusés, OpenClaw envoie toujours le
nouveau texte tout en maintenant la diffusion unique des médias. Cela empêche les notes vocales
ou fichiers en double sur des channels tels que Telegram lorsqu'un agent émet `MEDIA:` pendant
le streaming et que le provider l'inclut également dans la réponse terminée.

## Algorithme de chunking (bornes basse/haute)

Le découpage de blocs est implémenté par `EmbeddedBlockChunker` :

- **Limite basse :** ne pas émettre tant que le tampon n'est pas >= `minChars` (sauf si forcé).
- **Limite haute :** préférer les séparations avant `maxChars` ; si forcé, séparer à `maxChars`.
- **Préférence de rupture :** `paragraph` → `newline` → `sentence` → `whitespace` → rupture forcée.
- **Clôtures de code :** ne jamais séparer à l'intérieur des clôtures ; lors d'une rupture forcée à `maxChars`, fermer et rouvrir la clôture pour garder le Markdown valide.

`maxChars` est limité à la `textChunkLimit` du channel, vous ne pouvez donc pas dépasser les limites par channel.

## Fusion (fusionner les blocs diffusés)

Lorsque le block streaming est activé, OpenClaw peut **fusionner les blocs consécutifs**
avant de les envoyer. Cela réduit le « spam de ligne unique » tout en fournissant
toujours une sortie progressive.

- La fusion attend les **intervalles d'inactivité** (`idleMs`) avant de vider les tampons.
- Les tampons sont limités par `maxChars` et seront vidés s'ils le dépassent.
- `minChars` empêche l'envoi de minuscules fragments jusqu'à ce que suffisamment de texte s'accumule
  (le vidage final envoie toujours le texte restant).
- Le jointeur est dérivé de `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espace).
- Les redéfinitions de channel sont disponibles via `*.blockStreamingCoalesce` (y compris les configurations par compte).
- La `minChars` de fusion par défaut est augmentée à 1500 pour Signal/Slack/Discord sauf si elle est redéfinie.

## Rythme humain entre les blocs

Lorsque le bloc streaming est activé, vous pouvez ajouter une **pause aléatoire** entre
les réponses de blocs (après le premier bloc). Cela rend les réponses à plusieurs bulles plus
naturelles.

- Config : `agents.defaults.humanDelay` (remplacer pour chaque agent via `agents.list[].humanDelay`).
- Modes : `off` (par défaut), `natural` (800-2500ms), `custom` (`minMs`/`maxMs`).
- S'applique uniquement aux **réponses de blocs**, pas aux réponses finales ni aux résumés d'outil.

## "Diffuser des fragments ou tout"

Cela correspond à :

- **Stream chunks :** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (émettre au fur et à mesure). Les channels autres que Telegram nécessitent également `*.blockStreaming: true`.
- **Stream everything at end :** `blockStreamingBreak: "message_end"` (vider une fois, éventuellement plusieurs chunks si très long).
- **No block streaming :** `blockStreamingDefault: "off"` (seulement la réponse finale).

**Channel note :** Le block streaming est **désactivé sauf si**
`*.blockStreaming` est explicitement défini à `true`. Les channels peuvent diffuser un aperçu en direct
(`channels.<channel>.streaming`) sans réponses de blocs.

Rappel de l'emplacement de la configuration : les valeurs par défaut de `blockStreaming*` se trouvent sous
`agents.defaults`, et non dans la configuration racine.

## Modes de diffusion d'aperçu

Clé canonique : `channels.<channel>.streaming`

Modes :

- `off` : désactiver le streaming d'aperçu.
- `partial` : aperçu unique qui est remplacé par le dernier texte.
- `block` : mises à jour de l'aperçu par étapes découpées/ajoutées.
- `progress` : aperçu de progression/état pendant la génération, réponse finale à l'achèvement.

`streaming.mode: "block"` est un mode de streaming d'aperçu pour les channels capables d'éditer
tels que Discord et Telegram. Il n'active pas la livraison de blocs de channel à cet endroit.
Utilisez `streaming.block.enabled` ou l'ancienne clé de channel `blockStreaming` lorsque
vous souhaitez des réponses de bloc normales. Microsoft Teams est l'exception : il n'a pas
de transport de bloc d'aperçu de brouillon, donc `streaming.mode: "block"` correspond à la livraison de bloc Teams
au lieu du streaming natif partiel/par progression.

### Channel mapping

| Channel    | `off` | `partial` | `block` | `progress`                          |
| ---------- | ----- | --------- | ------- | ----------------------------------- |
| Telegram   | ✅    | ✅        | ✅      | brouillon de progression éditable   |
| Discord    | ✅    | ✅        | ✅      | brouillon de progression modifiable |
| Slack      | ✅    | ✅        | ✅      | ✅                                  |
| Mattermost | ✅    | ✅        | ✅      | ✅                                  |
| MS Teams   | ✅    | ✅        | ✅      | flux de progression natif           |

Slack uniquement :

- `channels.slack.streaming.nativeTransport` active les appels à l'Slack de flux natif API lorsque `channels.slack.streaming.mode="partial"` (par défaut : `true`).
- Le flux natif Slack et le statut du fil de discussion de l'assistant Slack nécessitent une cible de fil de réponse. Les DM de premier niveau n'affichent pas cet aperçu de style fil, mais ils peuvent toujours utiliser les publications et modifications d'aperçu de brouillon Slack.

Migration de clé héritée :

- Telegram : les valeurs `streamMode` héritées et `streaming` scalaires/booléennes sont détectées et migrées par les chemins de compatibilité docteur/config vers `streaming.mode`.
- Discord : `streamMode` + booléen `streaming` restent des alias d'exécution pour l'énumération `streaming` ; exécutez `openclaw doctor --fix` pour réécrire la configuration persistante.
- Slack : `streamMode` reste un alias d'exécution pour `streaming.mode` ; booléen `streaming` reste un alias d'exécution pour `streaming.mode` plus `streaming.nativeTransport` ; `nativeStreaming` hérité reste un alias d'exécution pour `streaming.nativeTransport`. Exécutez `openclaw doctor --fix` pour réécrire la configuration persistante.

### Comportement à l'exécution

Telegram :

- Utilise les mises à jour d'aperçu `sendMessage` + `editMessageText` dans les DM et les groupes/sujets.
- Le texte final modifie l'aperçu actif en place ; les textes finaux longs réutilisent ce message pour le premier bloc et n'envoient que les blocs restants.
- Le mode `progress` conserve la progression de l'outil dans un brouillon de statut modifiable, efface ce brouillon à la fin et envoie la réponse finale par livraison normale.
- Si la modification finale échoue avant que le texte terminé ne soit confirmé, OpenClaw utilise la livraison finale normale et nettoie l'aperçu périmé.
- Le streaming de prévisualisation est ignoré lorsque le streaming de blocs Telegram est explicitement activé (pour éviter le double streaming).
- `/reasoning stream` peut écrire le raisonnement dans une prévisualisation transitoire qui est supprimée après la livraison finale.

Discord :

- Utilise l'envoi et l'édition de messages de prévisualisation.
- Le mode `block` utilise le découpage (chunking) de brouillon (`draftChunk`).
- Le streaming de prévisualisation est ignoré lorsque le streaming de blocs Discord est explicitement activé.
- Les charges utiles finales de média, d'erreur et de réponse explicite annulent les prévisualisations en attente sans vider de nouveau brouillon, puis utilisent la livraison normale.

Slack :

- `partial` peut utiliser le streaming natif Slack (`chat.startStream`/`append`/`stop`) lorsqu'il est disponible.
- `block` utilise des prévisualisations de brouillon de type ajouter (append-style).
- `progress` utilise le texte de prévisualisation de statut, puis la réponse finale.
- Les DMs de premier niveau sans fil de réponse utilisent des publications et des modifications de prévisualisation de brouillon au lieu du streaming natif Slack.
- Le streaming natif et de prévisualisation de brouillon supprime les réponses de bloc pour ce tour, donc une réponse Slack est diffusée par un seul chemin de livraison.
- Les charges utiles finales de média/erreur et les fins de progression ne créent pas de messages de brouillon jetables ; seules les fins de texte/bloc qui peuvent modifier la prévisualisation vident le texte de brouillon en attente.

Mattermost :

- Diffuse la réflexion, l'activité des outils et le texte de réponse partiel dans une seule publication de prévisualisation de brouillon qui finalise sur place lorsque la réponse finale est prête à être envoyée.
- Revient à l'envoi d'une nouvelle publication finale si la publication de prévisualisation a été supprimée ou n'est pas disponible au moment de la finalisation.
- Les charges utiles finales de média/erreur annulent les mises à jour de prévisualisation en attente avant la livraison normale au lieu de vider une publication de prévisualisation temporaire.

Matrix :

- Les prévisualisations de brouillon finalisent sur place lorsque le texte final peut réutiliser l'événement de prévisualisation.
- Les finales de type média uniquement, erreur ou inadéquation de cible de réponse annulent les mises à jour de prévisualisation en attente avant la livraison normale ; une prévisualisation obsolète déjà visible est supprimée.

### Mises à jour de prévisualisation de la progression des outils

La diffusion en aperçu peut également inclure des mises à jour de **tool-progress** - de courtes lignes de statut comme "recherche sur le web", "lecture du fichier", ou "appel de tool" - qui apparaissent dans le même message d'aperçu pendant que les outils sont en cours d'exécution, avant la réponse finale. Cela maintient les tours d'outil à plusieurs étapes visuellement actifs plutôt que silencieux entre le premier aperçu de réflexion et la réponse finale.

Surfaces prises en charge :

- **Discord**, **Slack**, **Telegram** et **Matrix** diffusent le tool-progress dans la modification de l'aperçu en direct par défaut lorsque la diffusion en aperçu est active. Microsoft Teams utilise son flux de progression natif dans les chats personnels.
- Telegram est livré avec les mises à jour de l'aperçu de tool-progress activées depuis `v2026.4.22` ; les maintenir activées préserve ce comportement publié.
- **Mattermost** intègre déjà l'activité des outils dans son unique message de brouillon d'aperçu (voir ci-dessus).
- Les modifications de tool-progress suivent le mode de diffusion en aperçu actif ; elles sont ignorées lorsque la diffusion en aperçu est `off` ou lorsque la diffusion de blocs a pris le relais du message. Sur Telegram, `streaming.mode: "off"` est final-only : les bavardages de progression génériques sont également supprimés au lieu d'être livrés sous forme de messages de statut autonomes, tandis que les invites d'approbation, les charges utiles multimédias et les erreurs sont toujours acheminés normalement.
- Pour conserver le streaming d'aperçu tout en masquant les lignes de progression des outils, définissez `streaming.preview.toolProgress` sur `false` pour ce channel. Pour garder les lignes de progression des outils visibles tout en masquant le texte de commande/exec, définissez `streaming.preview.commandText` sur `"status"` ou `streaming.progress.commandText` sur `"status"` ; la valeur par défaut est `"raw"` pour préserver le comportement publié. Cette stratégie est partagée par les channels de brouillon/progression qui utilisent le rendu de progression compact d'OpenClaw, notamment Discord, Matrix, Microsoft Teams, Mattermost, les aperçus de brouillon Slack et Telegram. Pour désactiver entièrement les modifications d'aperçu, définissez `streaming.mode` sur `off`.
- Les réponses avec citation sélectionnée sur Telegram font exception : lorsque `replyToMode` n'est pas `"off"` et qu'un texte de citation est présent, OpenClaw ignore le flux d'aperçu de réponse pour ce tour, afin que les lignes d'aperçu de progression des outils ne puissent pas s'afficher. Les réponses au message actuel sans texte de citation sélectionné conservent toujours le streaming d'aperçu. Voir la [documentation du channel Telegram](/fr/channels/telegram) pour plus de détails.

Garder les lignes de progression visibles mais masquer le texte brut de commande/exec :

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

Utilisez la même structure sous une autre clé de channel à progression compacte, par exemple `channels.discord`, `channels.matrix`, `channels.msteams`, `channels.mattermost` ou les aperçus de brouillon Slack. Pour le mode progression-brouillon, placez la même stratégie sous `streaming.progress` :

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "progress",
        "progress": {
          "toolProgress": true,
          "commandText": "status"
        }
      }
    }
  }
}
```

## Connexes

- [Refactorisation du cycle de vie des messages](/fr/concepts/message-lifecycle-refactor) - conception cible partagée pour l'aperçu, la modification, le streaming et la finalisation
- [Brouillons de progression](/fr/concepts/progress-drafts) - messages de travail en cours visibles qui sont mis à jour lors des longs tours
- [Messages](/fr/concepts/messages) - cycle de vie et livraison des messages
- [Nouvelle tentative](/fr/concepts/retry) - comportement de nouvelle tentative en cas d'échec de livraison
- [Canaux](/fr/channels) - prise en charge du flux par canal
