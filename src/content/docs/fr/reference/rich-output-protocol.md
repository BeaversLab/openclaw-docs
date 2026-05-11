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

La syntaxe d'image Markdown brute reste du texte par défaut. Les canaux qui mappent intentionnellement
les réponses images Markdown vers des pièces jointes médias optent pour cela au niveau de leur adaptateur
sortant ; Telegram fait cela afin que `![alt](url)` puisse toujours devenir une réponse média.

Ces directives sont distinctes. `MEDIA:` et les balises de réponse/voix restent des métadonnées de livraison ; `[embed ...]` est le chemin de rendu riche uniquement web.
Les médias de résultats d'outil de confiance utilisent le même analyseur `MEDIA:` / `[[audio_as_voice]]` avant la livraison, afin que les sorties d'outil texte puissent toujours marquer une pièce jointe audio comme une note vocale.

Lorsque le block streaming est activé, `MEDIA:` reste des métadonnées de livraison unique pour un
tour. Si la même URL média est envoyée dans un bloc diffusé et répétée dans la charge utile finale
de l'assistant, OpenClaw livre la pièce jointe une seule fois et supprime le doublon
de la charge utile finale.

## `[embed ...]`

`[embed ...]` est la seule syntaxe de rendu riche orientée agent pour l'interface utilisateur de contrôle.

Exemple auto-fermant :

```text
[embed ref="cv_123" title="Status" /]
```

Règles :

- `[view ...]` n'est plus valide pour les nouvelles sorties.
- Les shortcodes d'intégration s'affichent uniquement dans la surface du message de l'assistant.
- Seules les intégrations basées sur des URL sont restituées. Utilisez `ref="..."` ou `url="..."`.
- Les shortcodes d'intégration HTML en ligne de forme bloc ne sont pas restitués.
- L'interface web supprime le shortcode du texte visible et restitue l'intégration en ligne.
- `MEDIA:` n'est pas un alias d'intégration et ne doit pas être utilisé pour le rendu riche intégré.

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
