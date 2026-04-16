# Rich Output Protocol

La sortie de l'assistant peut contenir un petit ensemble de directives de livraison/rendu :

- `MEDIA:` pour la livraison de pièces jointes
- `[[audio_as_voice]]` pour les indices de présentation audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` pour les métadonnées de réponse
- `[embed ...]` pour le rendu riche dans le Control UI

Ces directives sont indépendantes. `MEDIA:` et les balises de réponse/vocale restent des métadonnées de livraison ; `[embed ...]` est le chemin de rendu riche réservé au Web.

## `[embed ...]`

`[embed ...]` est la seule syntaxe de rendu riche destinée aux agents pour le Control UI.

Exemple auto-fermant :

```text
[embed ref="cv_123" title="Status" /]
```

Règles :

- `[view ...]` n'est plus valide pour les nouvelles sorties.
- Les shortcodes embed ne sont rendus que dans la surface des messages de l'assistant.
- Seuls les embeds soutenus par une URL sont rendus. Utilisez `ref="..."` ou `url="..."`.
- Les shortcodes embed HTML en ligne de type bloc ne sont pas rendus.
- L'interface Web supprime le shortcode du texte visible et rend l'embed en ligne.
- `MEDIA:` n'est pas un alias d'embed et ne doit pas être utilisé pour le rendu riche des embeds.

## Structure de rendu stockée

Le bloc de contenu assistant normalisé/stocké est un élément `canvas` structuré :

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

Les blocs riches stockés/rendus utilisent directement cette structure `canvas`. `present_view` n'est pas reconnu.
