---
summary: "Comportement de diffusion et de découpage (réponses de bloc, diffusion d'aperçu de canal, mappage des modes)"
read_when:
  - Explaining how streaming or chunking works on channels
  - Changing block streaming or channel chunking behavior
  - Debugging duplicate/early block replies or channel preview streaming
title: "Streaming et découpage"
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

- `text_delta/events` : événements de streaming du modèle (peuvent être clairsemés pour les modèles non-streaming).
- `chunker` : `EmbeddedBlockChunker` appliquant les limites min/max + préférence de rupture.
- `channel send` : messages sortants réels (réponses de bloc).

**Contrôles :**

- `agents.defaults.blockStreamingDefault` : `"on"`/`"off"` (désactivé par défaut).
- Remplacements de canal : `*.blockStreaming` (et variantes par compte) pour forcer `"on"`/`"off"` par canal.
- `agents.defaults.blockStreamingBreak` : `"text_end"` ou `"message_end"`.
- `agents.defaults.blockStreamingChunk` : `{ minChars, maxChars, breakPreference? }`.
- `agents.defaults.blockStreamingCoalesce` : `{ minChars?, maxChars?, idleMs? }` (fusionner les blocs streamés avant l'envoi).
- Limite stricte du canal : `*.textChunkLimit` (par exemple, `channels.whatsapp.textChunkLimit`).
- Mode de découpage du canal : `*.chunkMode` (`length` par défaut, `newline` divise sur les lignes vides (limites de paragraphe) avant le découpage par longueur).
- Limite souple Discord : `channels.discord.maxLinesPerMessage` (17 par défaut) divise les réponses hautes pour éviter le rognage de l'interface utilisateur.

**Sémantique des limites :**

- `text_end` : diffuser les blocs dès que le découpeur les émet ; vider à chaque `text_end`.
- `message_end` : attendez ce que le message de l'assistant se termine, puis videz la sortie tamponnée.

`message_end` utilise toujours le chunker si le texte tamponné dépasse `maxChars`, il peut donc émettre plusieurs chunks à la fin.

### Livraison de médias avec le block streaming

Les directives `MEDIA:` sont des métadonnées de livraison normales. Lorsque le block streaming envoie un bloc média de manière anticipée, OpenClaw mémorise cette livraison pour le tour. Si la charge utile finale de l'assistant répète la même URL média, la livraison finale supprime le média en double au lieu de renvoyer la pièce jointe.

Les charges utiles finales en double exact sont supprimées. Si la charge utile finale ajoute un texte distinct autour d'un média déjà diffusé, OpenClaw envoie tout de même le nouveau texte tout en maintenant la livraison unique du média. Cela évite les notes vocales ou fichiers en double sur des channels tels que Telegram lorsqu'un agent émet `MEDIA:` pendant le streaming et que le provider l'inclut également dans la réponse terminée.

## Algorithme de chunking (bornes basse/haute)

Le chunking de blocs est implémenté par `EmbeddedBlockChunker` :

- **Borne basse :** ne pas émettre tant que le tampon < `minChars` (sauf si forcé).
- **Borne haute :** préférer les séparations avant `maxChars` ; si forcé, séparer à `maxChars`.
- **Préférence de rupture :** `paragraph` → `newline` → `sentence` → `whitespace` → rupture forcée.
- **Clôtures de code :** ne jamais séparer à l'intérieur des clôtures ; lors d'une séparation forcée à `maxChars`, fermer + rouvrir la clôture pour garder le Markdown valide.

`maxChars` est limité à la `textChunkLimit` du channel, vous ne pouvez donc pas dépasser les limites par channel.

## Fusion (fusionner les blocs diffusés)

Lorsque le block streaming est activé, OpenClaw peut **fusionner les chunks de blocs consécutifs** avant de les envoyer. Cela réduit le « spam monoligne » tout en fournissant toujours une sortie progressive.

- La fusion attend les **écarts d'inactivité** (`idleMs`) avant de vider.
- Les tampons sont plafonnés par `maxChars` et seront vidés s'ils le dépassent.
- `minChars` empêche l'envoi de tout petits fragments jusqu'à ce qu'une quantité suffisante de texte soit accumulée
  (le vidage final envoie toujours le texte restant).
- Le séparateur est dérivé de `blockStreamingChunk.breakPreference`
  (`paragraph` → `\n\n`, `newline` → `\n`, `sentence` → espace).
- Les redéfinitions de canal sont disponibles via `*.blockStreamingCoalesce` (y compris les configurations par compte).
- La valeur de fusion par défaut `minChars` est augmentée à 1500 pour Signal/Slack/Discord, sauf en cas de redéfinition.

## Rythme humain entre les blocs

Lorsque le bloc streaming est activé, vous pouvez ajouter une **pause aléatoire** entre
les réponses de blocs (après le premier bloc). Cela rend les réponses à plusieurs bulles plus
naturelles.

- Configuration : `agents.defaults.humanDelay` (redéfinition par agent via `agents.list[].humanDelay`).
- Modes : `off` (par défaut), `natural` (800–2500 ms), `custom` (`minMs`/`maxMs`).
- S'applique uniquement aux **réponses de blocs**, pas aux réponses finales ni aux résumés d'outil.

## "Diffuser des fragments ou tout"

Cela correspond à :

- **Diffuser des fragments :** `blockStreamingDefault: "on"` + `blockStreamingBreak: "text_end"` (émettre au fur et à mesure). Les canaux non Telegram nécessitent également `*.blockStreaming: true`.
- **Diffuser tout à la fin :** `blockStreamingBreak: "message_end"` (vider une fois, éventuellement en plusieurs fragments si très long).
- **Pas de bloc streaming :** `blockStreamingDefault: "off"` (seulement la réponse finale).

**Note de canal :** Le bloc streaming est **désactivé sauf si**
`*.blockStreaming` est explicitement défini sur `true`. Les canaux peuvent diffuser un aperçu en direct
(`channels.<channel>.streaming`) sans réponses de blocs.

Rappel sur l'emplacement de la configuration : les valeurs par défaut `blockStreaming*` se trouvent sous
`agents.defaults`, et non dans la configuration racine.

## Modes de diffusion d'aperçu

Clé canonique : `channels.<channel>.streaming`

Modes :

- `off` : désactiver la diffusion d'aperçu.
- `partial` : aperçu unique qui est remplacé par le dernier texte.
- `block` : mises à jour de l'aperçu par étapes découpées/ajoutées.
- `progress` : aperçu de progression/statut pendant la génération, réponse finale à l'achèvement.

### Mapping de canal

| Canal      | `off` | `partial` | `block` | `progress`             |
| ---------- | ----- | --------- | ------- | ---------------------- |
| Telegram   | ✅    | ✅        | ✅      | correspond à `partial` |
| Discord    | ✅    | ✅        | ✅      | correspond à `partial` |
| Slack      | ✅    | ✅        | ✅      | ✅                     |
| Mattermost | ✅    | ✅        | ✅      | ✅                     |

Slack uniquement :

- `channels.slack.streaming.nativeTransport` active les appels de l'API de streaming natif de Slack lorsque `channels.slack.streaming.mode="partial"` (par défaut : `true`).
- Le streaming natif de Slack et le statut du fil de discussion de l'assistant Slack nécessitent une cible de fil de discussion de réponse ; les Slack de premier niveau n'affichent pas cet aperçu de style fil.

Migration des clés héritées :

- Telegram : les valeurs héritées `streamMode` et scalaire/booléenne `streaming` sont détectées et migrées par les chemins de compatibilité doctor/config vers `streaming.mode`.
- Discord : `streamMode` + booléen `streaming` migrent automatiquement vers l'énumération `streaming`.
- Slack : `streamMode` migre automatiquement vers `streaming.mode` ; le booléen `streaming` migre automatiquement vers `streaming.mode` plus `streaming.nativeTransport` ; l'ancien `nativeStreaming` migre automatiquement vers `streaming.nativeTransport`.

### Comportement d'exécution

Telegram :

- Utilise les mises à jour d'aperçu `sendMessage` + `editMessageText` sur les API et les groupements/sujets.
- Envoie un message final frais au lieu de modifier sur place lorsqu'un aperçu a été visible pendant environ une minute, puis nettoie l'aperçu pour que l'horodatage de Telegram reflète l'achèvement de la réponse.
- Le streaming d'aperçu est ignoré lorsque le streaming de blocs de Telegram est explicitement activé (pour éviter le double streaming).
- `/reasoning stream` peut écrire le raisonnement dans l'aperçu.

Discord :

- Utilise l'envoi + modification des messages d'aperçu.
- Le mode `block` utilise le découpage de brouillon (`draftChunk`).
- Le streaming d'aperçu est ignoré lorsque le streaming de blocs de Discord est explicitement activé.
- Les payloads médias finaux, d'erreur et de réponse explicite annulent les aperçus en attente sans vider un nouveau brouillon, puis utilisent la livraison normale.

Slack :

- `partial` peut utiliser le streaming natif Slack (`chat.startStream`/`append`/`stop`) lorsqu'il est disponible.
- `block` utilise des aperçus de brouillon de type ajout.
- `progress` utilise un texte d'aperçu de statut, puis la réponse finale.
- Le streaming natif et par aperçu de brouillon supprime les réponses de bloc pour ce tour, de sorte qu'une réponse Slack est diffusée par un seul chemin de livraison.
- Les payloads médias finaux/erreurs et les finales de progression ne créent pas de messages de brouillon jetables ; seules les finales de texte/bloc qui peuvent modifier l'aperçu vident le texte de brouillon en attente.

Mattermost :

- Diffuse la réflexion, l'activité de l'outil et le texte de réponse partiel dans un seul post d'aperçu de brouillon qui se finalise en place lorsque la réponse finale est prête à être envoyée.
- Revient à l'envoi d'un nouveau post final si le post d'aperçu a été supprimé ou n'est pas disponible au moment de la finalisation.
- Les payloads médias finaux/erreurs annulent les mises à jour d'aperçu en attente avant la livraison normale au lieu de vider un post d'aperçu temporaire.

Matrix :

- Les aperçus de brouillon se finalisent en place lorsque le texte final peut réutiliser l'événement d'aperçu.
- Les finales médias uniquement, erreurs et inadéquations de cible de réponse annulent les mises à jour d'aperçu en attente avant la livraison normale ; un aperçu obsolète déjà visible est révisé.

### Mises à jour de l'aperçu de progression de l'outil

Le streaming d'aperçu peut également inclure des mises à jour de **progression de l'outil** — des lignes de statut courtes comme « recherche sur le web », « lecture de fichier » ou « appel de l'outil » — qui apparaissent dans le même message d'aperçu pendant que les outils s'exécutent, avant la réponse finale. Cela garde les tours d'outil à plusieurs étapes visuellement actifs plutôt que silencieux entre le premier aperçu de réflexion et la réponse finale.

Surfaces prises en charge :

- **Discord**, **Slack** et **Telegram** diffusent la progression de l'outil dans la modification de l'aperçu en direct par défaut lorsque le streaming d'aperçu est actif.
- Telegram est livré avec les mises à jour de l'aperçu de progression de l'outil activées depuis `v2026.4.22` ; les garder activées préserve ce comportement publié.
- **Mattermost** intègre déjà l'activité de l'outil dans son post d'aperçu de brouillon unique (voir ci-dessus).
- Les modifications de la progression des outils suivent le mode de diffusion en aperçu actif ; elles sont ignorées lorsque la diffusion en aperçu est `off` ou lorsque la diffusion de blocs a pris en charge le message.
- Pour conserver la diffusion en aperçu mais masquer les lignes de progression des outils, définissez `streaming.preview.toolProgress` sur `false` pour ce canal. Pour désactiver entièrement les modifications d'aperçu, définissez `streaming.mode` sur `off`.

Exemple :

```json
{
  "channels": {
    "telegram": {
      "streaming": {
        "mode": "partial",
        "preview": {
          "toolProgress": false
        }
      }
    }
  }
}
```

## Connexes

- [Messages](/fr/concepts/messages) — cycle de vie et livraison des messages
- [Nouvelle tentative](/fr/concepts/retry) — comportement de nouvelle tentative en cas d'échec de livraison
- [Canaux](/fr/channels) — support de la diffusion par canal
