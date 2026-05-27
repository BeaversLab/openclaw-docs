---
summary: "Protocole de shortcode de sortie enrichie pour les intégrations, les médias, les indices audio et les réponses"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, `MEDIA:`, reply, or audio presentation directives
title: "Protocole de sortie enrichie"
---

La sortie de l'assistant peut transporter un petit ensemble de directives de livraison/restitution :

- `MEDIA:` pour la livraison des pièces jointes
- `[[audio_as_voice]]` pour les indices de présentation audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` pour les métadonnées de réponse
- `[embed ...]` pour le rendu enrichi de l'interface de contrôle

Les pièces jointes distantes `MEDIA:` doivent être des URL `https:` publiques. Les noms d'hôtes `http:` simples,
bouclage, lien local, privés et internes sont ignorés en tant que directives
de pièce jointe ; les récupérateurs de médias côté serveur appliquent toujours leurs propres protections réseau.

Les pièces jointes locales `MEDIA:` peuvent utiliser des chemins absolus, des chemins relatifs à l'espace de travail ou des
chemins relatifs au répertoire personnel `~/`. Ils passent toujours par la stratégie de lecture de fichiers de l'agent et les
vérifications de type de média avant livraison.

<Warning>
`MEDIA:` n'est analysé que comme du texte brut. Envelopper la directive dans un formatage
Markdown (gras, code en ligne, code clôturé) empêche l'analyseur de
la reconnaître, et la pièce jointe est silencieusement abandonnée lors de la livraison.

Valide :

```text
MEDIA:/workspace/image.png
```

Non valide (analysé comme du texte, aucune pièce jointe livrée) :

```text
**MEDIA:/workspace/image.png**
`MEDIA:/workspace/image.png`
Here is your image: MEDIA:/workspace/image.png
```

Gardez `MEDIA:` sur sa propre ligne, en texte brut, sans aucun formatage environnant.

</Warning>

La syntaxe d'image Markdown brute reste du texte par défaut. Les canaux qui mappent intentionnellement
les réponses image Markdown aux pièces jointes multimédias optent pour cette option au niveau de leur adaptateur
sortant ; Telegram le fait afin que `![alt](url)` puisse toujours devenir une réponse multimédia.

Ces directives sont distinctes. `MEDIA:` et les balises de réponse/voix restent des métadonnées de livraison ; `[embed ...]` est le chemin de rendu enrichi uniquement pour le web.
Les médias de résultats d'outil de confiance utilisent le même analyseur `MEDIA:` / `[[audio_as_voice]]` avant livraison, donc les résultats d'outil texte peuvent toujours marquer une pièce jointe audio comme une note vocale.

Lorsque le block streaming est activé, `MEDIA:` reste des métadonnées de livraison unique pour un tour. Si la même URL média est envoyée dans un bloc diffusé et répétée dans la charge utile finale de l'assistant, OpenClaw délivre la pièce jointe une seule fois et supprime le doublon de la charge utile finale.

## `[embed ...]`

`[embed ...]` est la seule syntaxe de rendu riche orientée agent pour l'interface de contrôle.

Exemple de fermeture automatique :

```text
[embed ref="cv_123" title="Status" /]
```

Règles :

- `[view ...]` n'est plus valide pour les nouvelles sorties.
- Les shortcodes d'intégration (embed) sont rendus uniquement dans la surface du message de l'assistant.
- Seules les intégrations basées sur une URL sont rendues. Utilisez `ref="..."` ou `url="..."`.
- Les shortcodes d'intégration HTML en ligne sous forme de bloc ne sont pas rendus.
- L'interface Web supprime le shortcode du texte visible et rend l'intégration en ligne.
- `MEDIA:` n'est pas un alias d'intégration et ne doit pas être utilisé pour le rendu d'intégrations riches.

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

Les blocs riches stockés/rendus utilisent directement cette forme `canvas`. `present_view` n'est pas reconnu.

## Connexes

- [Adaptateurs RPC](/fr/reference/rpc)
- [Typebox](/fr/concepts/typebox)
