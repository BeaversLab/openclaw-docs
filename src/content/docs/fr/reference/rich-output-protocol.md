# Protocole de sortie enrichie

La sortie de l'assistant peut contenir un petit ensemble de directives de livraison/restitution :

- `MEDIA:` pour la livraison de pièces jointes
- `[[audio_as_voice]]` pour les indices de présentation audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` pour les métadonnées de réponse
- `[embed ...]` pour le rendu enrichi de l'interface de contrôle

Ces directives sont distinctes. `MEDIA:` et les balises de réponse/voix restent des métadonnées de livraison ; `[embed ...]` est le chemin de rendu enrichi réservé au web.

## `[embed ...]`

`[embed ...]` est la seule syntaxe de rendu enrichi orientée agent pour l'interface de contrôle.

Exemple de fermeture automatique :

```text
[embed ref="cv_123" title="Status" /]
```

Règles :

- `[view ...]` n'est plus valide pour les nouvelles sorties.
- Les shortcodes d'intégration (embed) sont restitués uniquement dans la surface du message de l'assistant.
- Seules les intégrations basées sur une URL sont restituées. Utilisez `ref="..."` ou `url="..."`.
- Les shortcodes d'intégration HTML en ligne sous forme de bloc ne sont pas restitués.
- L'interface web supprime le shortcode du texte visible et restitue l'intégration en ligne.
- `MEDIA:` n'est pas un alias d'intégration et ne doit pas être utilisé pour le rendu d'intégrations enrichies.

## Forme de rendu stockée

Le bloc de contenu de l'assistant normalisé/stocké est un élément `canvas` structuré :

```json
{
  "type": "canvas",
  "preview": {
    "kind": "canvas",
    "surface": "assistant_message",
    "render": "url",
    "viewId": "cv_123",
    "url": "/__openclaw__/canvas/documents/cv_123/index.html",
    "title": "Status",
    "preferredHeight": 320
  }
}
```

Les blocs enrichis stockés/restitués utilisent directement cette forme `canvas`. `present_view` n'est pas reconnu.
