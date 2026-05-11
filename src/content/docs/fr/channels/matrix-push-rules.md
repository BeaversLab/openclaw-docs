---
summary: "Règles de notification Matrix par destinataire pour les aperçus finalisés en mode silencieux"
read_when:
  - Setting up Matrix quiet streaming for self-hosted Synapse or Tuwunel
  - Users want notifications only on finished blocks, not on every preview edit
title: "Règles de notification Matrix pour les aperçus en mode silencieux"
---

Lorsque `channels.matrix.streaming` est `"quiet"`, OpenClaw modifie un seul événement d'aperçu sur place et marque la modification finalisée avec un indicateur de contenu personnalisé. Les clients Matrix notifient la modification finale uniquement si une règle de notification par utilisateur correspond à cet indicateur. Cette page s'adresse aux opérateurs qui hébergent eux-mêmes Matrix et souhaitent installer cette règle pour chaque compte destinataire.

Si vous souhaitez uniquement le comportement de notification Matrix standard, utilisez `streaming: "partial"` ou désactivez le streaming. Voir [Configuration du canal Matrix](/fr/channels/matrix#streaming-previews).

## Prérequis

- utilisateur destinataire = la personne qui doit recevoir la notification
- utilisateur bot = le compte Matrix OpenClaw qui envoie la réponse
- utilisez le jeton d'accès de l'utilisateur destinataire pour les appels API ci-dessous
- faites correspondre `sender` dans la règle de notification avec l'identifiant MXID complet de l'utilisateur bot
- le compte destinataire doit déjà disposer de pushers fonctionnels — les règles d'aperçu en mode silencieux ne fonctionnent que lorsque la distribution des notifications Matrix normale est saine

## Étapes

<Steps>
  <Step title="Configurer les aperçus en mode silencieux">

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

  </Step>

  <Step title="Obtenir le jeton d'accès du destinataire">
    Réutilisez un jeton de session client existant si possible. Pour en créer un nouveau :

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": { "type": "m.id.user", "user": "@alice:example.org" },
    "password": "REDACTED"
  }'
```

  </Step>

  <Step title="Vérifier que les pushers existent">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

Si aucun pusher n'est renvoyé, corrigez la distribution des notifications Matrix normale pour ce compte avant de continuer.

  </Step>

  <Step title="Installer la règle de priorité push">
    OpenClaw marque les modifications de prévisualisation en mode texte finalisées avec `content["com.openclaw.finalized_preview"] = true`. Installez une règle qui correspond à ce marqueur ainsi qu'au MXID du bot en tant qu'expéditeur :

```bash
curl -sS -X PUT \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname" \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  --data '{
    "conditions": [
      { "kind": "event_match", "key": "type", "pattern": "m.room.message" },
      {
        "kind": "event_property_is",
        "key": "content.m\\.relates_to.rel_type",
        "value": "m.replace"
      },
      {
        "kind": "event_property_is",
        "key": "content.com\\.openclaw\\.finalized_preview",
        "value": true
      },
      { "kind": "event_match", "key": "sender", "pattern": "@bot:example.org" }
    ],
    "actions": [
      "notify",
      { "set_tweak": "sound", "value": "default" },
      { "set_tweak": "highlight", "value": false }
    ]
  }'
```

    Remplacer avant l'exécution :

    - `https://matrix.example.org` : l'URL de base de votre serveur d'accueil (homeserver)
    - `$USER_ACCESS_TOKEN` : le jeton d'accès de l'utilisateur destinataire
    - `openclaw-finalized-preview-botname` : un ID de règle unique par bot et par destinataire (modèle : `openclaw-finalized-preview-<botname>`)
    - `@bot:example.org` : le MXID de votre bot OpenClaw, et non celui du destinataire

  </Step>

  <Step title="Vérifier">

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

Ensuite, testez une réponse en streaming. En mode silencieux, le salon affiche une prévisualisation de brouillon silencieuse et notifie une fois le bloc ou le tour terminé.

  </Step>
</Steps>

Pour supprimer la règle ultérieurement, `DELETE` la même URL de règle avec le jeton du destinataire.

## Notes multi-bot

Les règles de push (push rules) sont indexées par `ruleId` : relancer `PUT` avec le même ID met à jour une seule règle. Pour plusieurs bots OpenClaw notifiant le même destinataire, créez une règle par bot avec une condition d'expéditeur distincte.

Les nouvelles règles `override` définies par l'utilisateur sont insérées avant les règles de suppression par défaut, aucun paramètre d'ordre supplémentaire n'est donc nécessaire. La règle n'affecte que les modifications de prévisualisation en mode texte qui peuvent être finalisées sur place ; les replis (fallbacks) médias et les replis de prévisualisation obsolète utilisent la livraison normale Matrix.

## Notes sur le serveur d'accueil (Homeserver)

<AccordionGroup>
  <Accordion title="Synapse">
    Aucune modification spéciale de `homeserver.yaml` n'est requise. Si les notifications Matrix normales atteignent déjà cet utilisateur, le jeton du destinataire + l'appel `pushrules` ci-dessus constituent la principale étape de configuration.

    Si vous exécutez Synapse derrière un proxy inverse ou des workers, assurez-vous que `/_matrix/client/.../pushrules/` atteint correctement Synapse. La livraison des push est gérée par le processus principal ou `synapse.app.pusher` / les workers de push configurés — assurez-vous qu'ils sont en bonne santé.

    La règle utilise la condition de règle de push `event_property_is` (MSC3758, push rule v1.10), qui a été ajoutée à Synapse en 2023. Les versions plus anciennes de Synapse acceptent l'appel `PUT pushrules/...` mais ne correspondent jamais silencieusement à la condition — mettez à niveau Synapse si aucune notification n'arrive lors d'une modification de prévisualisation finalisée.

  </Accordion>

  <Accordion title="Tuwunel">
    Même flux que Synapse ; aucune configuration spécifique à Tuwunel n'est nécessaire pour le marqueur de prévisualisation finalisée.

    Si les notifications disparaissent pendant que l'utilisateur est actif sur un autre appareil, vérifiez si `suppress_push_when_active` est activé. Tuwunel a ajouté cette option dans la version 1.4.2 (septembre 2025) et elle peut intentionnellement supprimer les push vers d'autres appareils pendant qu'un appareil est actif.

  </Accordion>
</AccordionGroup>

## Connexes

- [Configuration du channel Matrix](/fr/channels/matrix)
- [Concepts de streaming](/fr/concepts/streaming)
