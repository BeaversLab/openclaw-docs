---
summary: "Protocole de shortcode de sortie enrichie pour les intégrations, les médias, les indices audio et les réponses"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "Protocole de sortie riche"
---

La sortie de l'assistant peut transporter un petit ensemble de directives de livraison/restitution :

- `MEDIA:` pour la livraison des pièces jointes
- `[[audio_as_voice]]` pour les indices de présentation audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` pour les métadonnées de réponse
- `[embed ...]` pour le rendu riche de l'interface utilisateur de contrôle

Les pièces jointes distantes `MEDIA:` doivent être des URLs publiques `https:`. Les noms d'hôte `http:` simples,
bouclage, lien local, privés et internes sont ignorés en tant que directives
de pièce jointe ; les récupérateurs de médias côté serveur appliquent toujours leurs propres gardes réseau.

Les pièces jointes locales `MEDIA:` peuvent utiliser des chemins absolus, relatifs à l'espace de travail ou
relatifs au répertoire personnel `~/`. Ils passent toujours par la stratégie de lecture de fichiers de l'agent et
les vérifications de type de média avant la livraison.

La syntaxe d'image Markdown reste du texte par défaut. Les canaux qui mappent intentionnellement
les réponses images Markdown aux pièces jointes multimédias optent pour cela au niveau de leur adaptateur
sortant ; Telegram le fait pour que `![alt](url)` puisse toujours devenir une réponse multimédia.

Ces directives sont distinctes. `MEDIA:` et les balises reply/voice restent des métadonnées de livraison ; `[embed ...]` est le chemin de rendu riche réservé au web.
Les médias de résultats d'outils de confiance utilisent le même analyseur `MEDIA:` / `[[audio_as_voice]]` avant la livraison, de sorte que les sorties texte des outils peuvent toujours marquer une pièce jointe audio comme une note vocale.

Lorsque le block streaming est activé, `MEDIA:` reste des métadonnées de livraison unique pour un
tour. Si la même URL multimédia est envoyée dans un bloc diffusé et répétée dans la charge utile finale
de l'assistant, OpenClaw livre la pièce jointe une fois et supprime le doublon
de la charge utile finale.

## `[embed ...]`

`[embed ...]` est la seule syntaxe de rendu riche orientée agent pour l'interface utilisateur de contrôle.

Exemple auto-fermant :

```text
[embed ref="cv_123" title="Status" /]
```

Règles :

- `[view ...]` n'est plus valide pour les nouvelles sorties.
- Les shortcodes d'intégration s'affichent uniquement dans la surface des messages de l'assistant.
- Seules les intégrations basées sur une URL sont rendues. Utilisez `ref="..."` ou `url="..."`.
- Les shortcodes d'intégration HTML en ligne sous forme de bloc ne sont pas rendus.
- L'interface web supprime le shortcode du texte visible et rend l'intégration en ligne.
- `MEDIA:` n'est pas un alias d'intégration et ne doit pas être utilisé pour le rendu riche des intégrations.

## Forme de rendu stockée

Le bloc de contenu de l'assistant normalisé/stocké est un élément structuré `canvas` :

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

Les blocs riches stockés/rendus utilisent directement cette forme `canvas`. `present_view` n'est pas reconnu.

## Connexes

- [Adaptateurs RPC](/fr/reference/rpc)
- [Typebox](/fr/concepts/typebox)
