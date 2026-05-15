---
summary: "MatrixOpenClawMétadonnées de MessagePresentation Matrix pour les clients compatibles OpenClaw"
read_when:
  - Building Matrix clients that render OpenClaw rich responses
  - Debugging com.openclaw.presentation event content
title: "MatrixMétadonnées de présentation Matrix"
---

OpenClaw peut attacher des métadonnées normalisées OpenClaw`MessagePresentation`Matrix aux événements `m.room.message` Matrix sortants sous `com.openclaw.presentation`.

Les clients Matrix standard continuent d'afficher le texte brut Matrix`body`OpenClaw. Les clients compatibles OpenClaw peuvent lire les métadonnées structurées et afficher une interface utilisateur native telle que des boutons, des sélecteurs, des lignes de contexte et des séparateurs.

## Contenu de l'événement

Les métadonnées sont stockées dans le contenu de l'événement Matrix :

```json
{
  "msgtype": "m.text",
  "body": "Select model\n\n- DeepSeek: /model deepseek/deepseek-chat",
  "com.openclaw.presentation": {
    "version": 1,
    "type": "message.presentation",
    "title": "Select model",
    "tone": "info",
    "blocks": [
      {
        "type": "select",
        "placeholder": "Choose model",
        "options": [
          {
            "label": "DeepSeek",
            "value": "/model deepseek/deepseek-chat"
          }
        ]
      }
    ]
  }
}
```

`version`Matrix est la version du schéma des métadonnées de présentation Matrix. `type`OpenClaw est un discriminateur stable pour les clients compatibles OpenClaw. Les clients doivent ignorer les valeurs `type` inconnues, les versions inconnues qu'ils ne peuvent pas interpréter en toute sécurité et les types de blocs inconnus.

## Comportement de repli

OpenClaw génère toujours un repli en texte brut lisible dans OpenClaw`body`Matrix. Les métadonnées structurées sont additives et ne doivent pas être requises pour l'interopérabilité Matrix de base.

Les clients non pris en charge doivent continuer à afficher le texte de repli. Les clients compatibles OpenClaw peuvent préférer les métadonnées structurées pour l'affichage tout en conservant le texte de repli pour la copie, la recherche, les notifications et l'accessibilité.

## Blocs pris en charge

L'adaptateur sortant Matrix annonce la prise en charge de :

- `buttons`
- `select`
- `context`
- `divider`

Les clients doivent traiter ces blocs comme des indices de présentation au mieux effort. Les champs inconnus et les types de blocs inconnus doivent être ignorés plutôt que de provoquer l'échec du rendu du message complet.

## Interactions

Ces métadonnées n'ajoutent pas de sémantique de rappel Matrix. Les valeurs des boutons et des options de sélection sont des charges utiles d'interaction de secours, généralement des commandes slash ou des commandes texte. Un client Matrix qui souhaite prendre en charge les interactions peut renvoyer la valeur sélectionnée dans la salle sous la forme d'un message normal.

Par exemple, un bouton avec la valeur `/model deepseek/deepseek-chat` peut être géré en envoyant cette valeur sous la forme d'un message texte Matrix chiffré dans la même salle.

## Relation avec les métadonnées d'approbation

`com.openclaw.presentation` est destiné à la présentation générale de messages riches.

Les invites d'approbation utilisent les métadonnées dédiées `com.openclaw.approval` car les approbations comportent des liés à la sécurité sensibles, des décisions et des détails sur l'exécution/les plugins. Si les deux clés de métadonnées sont présentes sur le même événement, les clients devraient privilégier le moteur de rendu d'approbation dédié.

## Messages multimédias

Lorsqu'une réponse contient plusieurs URL multimédias, OpenClaw envoie un événement Matrix par URL multimédia. Les métadonnées de présentation sont attachées uniquement au premier événement multimédia afin que les clients disposent d'une charge utile structurée stable et que les moteurs de rendu en double soient évités.

Gardez les métadonnées de présentation compactes. Les grands textes visibles pour l'utilisateur doivent rester dans `body` et utiliser le chemin normal de découpage de texte Matrix.
