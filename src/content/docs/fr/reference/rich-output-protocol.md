---
summary: "Protocole de sortie enrichie pour les médias structurés, les intégrations, les indices audio et les réponses"
read_when:
  - Changing assistant output rendering in the Control UI
  - Debugging `[embed ...]`, structured media, reply, or audio presentation directives
title: "Protocole de sortie enrichie"
---

La sortie de l'assistant peut transporter un petit ensemble de directives de livraison/restitution :

- champs `mediaUrl` / `mediaUrls` structurés pour la livraison de pièces jointes
- `[[audio_as_voice]]` pour les indices de présentation audio
- `[[reply_to_current]]` / `[[reply_to:<id>]]` pour les métadonnées de réponse
- `[embed ...]` pour le rendu enrichi de l'interface utilisateur de contrôle

Les pièces jointes de médias distants doivent être des URL `https:` publiques. Les noms d'hôte `http:` simples,
bouclage, lien local, privé et interne sont ignorés en tant que directives de
pièce jointe ; les récupérateurs de médias côté serveur appliquent toujours leurs propres gardes réseau.

Les pièces jointes de médias locaux peuvent utiliser des chemins absolus, des chemins relatifs à l'espace de travail ou des
chemins `~/` relatifs au domicile. Ils passent toujours par la stratégie de lecture de fichiers de l'agent et
les vérifications de type de média avant livraison.

<Warning>
N'émettez pas de commandes texte pour les pièces jointes provenant d'outils, de plugins, de blocs de streaming,
de sortie du navigateur ou d'actions de message. Utilisez plutôt des champs de médias structurés.

Charge utile de message-tool valide :

```json
{ "message": "Here is your image.", "mediaUrl": "/workspace/image.png" }
```

Le texte de réponse final de l'assistant hérité peut toujours être normalisé pour la compatibilité, mais
ce n'est pas un protocole général de plugin/tool.

</Warning>

La syntaxe d'image Markdown brut reste du texte par défaut. Les canaux qui mappent intentionnellement
les réponses image Markdown aux pièces jointes multimédias s'abonnent au niveau de leur adaptateur
sortant ; Telegram le fait pour que `![alt](url)` puisse toujours devenir une réponse média.

Ces directives sont distinctes. Les champs de médias structurés et les balises de réponse/voix sont
des métadonnées de livraison ; `[embed ...]` est le chemin de rendu enrichi uniquement web.

Lorsque le block streaming est activé, les médias doivent être transportés sur les champs de
charge utile structurés. Si la même URL média est envoyée dans un bloc diffusé et répétée dans la
charge utile finale de l'assistant, OpenClaw livre la pièce jointe une fois et supprime le
doublon de la charge utile finale.

## `[embed ...]`

`[embed ...]` est la seule syntaxe de rendu enrichie orientée agent pour l'interface utilisateur de contrôle.

Exemple de fermeture automatique :

```text
[embed ref="cv_123" title="Status" /]
```

Règles :

- `[view ...]` n'est plus valide pour les nouvelles sorties.
- Les shortcodes d'intégration (embed) sont rendus uniquement dans la surface du message de l'assistant.
- Seuls les intégrations basées sur une URL sont rendues. Utilisez `ref="..."` ou `url="..."`.
- Les shortcodes d'intégration HTML en ligne sous forme de bloc ne sont pas rendus.
- L'interface Web supprime le shortcode du texte visible et rend l'intégration en ligne.
- Le média structuré n'est pas un alias d'intégration et ne doit pas être utilisé pour le rendu d'intégrations riches.

## Forme de rendu stockée

Le bloc de contenu de l'assistant normalisé/enregistré est un élément `canvas` structuré :

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

Les blocs riches enregistrés/rendus utilisent directement cette forme `canvas`. `present_view` n'est pas reconnu.

## Connexes

- [Adaptateurs RPC](/fr/reference/rpc)
- [Typebox](/fr/concepts/typebox)
