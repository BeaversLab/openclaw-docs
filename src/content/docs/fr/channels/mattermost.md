---
summary: "Configuration du bot Mattermost et configuration d'OpenClaw"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
sidebarTitle: "Mattermost"
---

Statut : plugin groupé (bot token + événements WebSocket). Les salons, les groupes et les DM sont pris en charge. Mattermost est une plateforme de messagerie d'équipe auto-hébergeable ; consultez le site officiel à [mattermost.com](https://mattermost.com) pour plus de détails sur le produit et les téléchargements.

## Plugin inclus

<Note>Mattermost est fourni en tant que plugin groupé dans les versions actuelles d'OpenClaw, les versions empaquetées normales n'ont donc pas besoin d'une installation séparée.</Note>

Si vous êtes sur une version plus ancienne ou une installation personnalisée qui exclut Mattermost, installez-le manuellement :

<Tabs>
  <Tab title="Registre npm">```bash openclaw plugins install @openclaw/mattermost ```</Tab>
  <Tab title="Extraction locale">```bash openclaw plugins install ./path/to/local/mattermost-plugin ```</Tab>
</Tabs>

Détails : [Plugins](/fr/tools/plugin)

## Installation rapide

<Steps>
  <Step title="S'assurer que le plugin est disponible">
    Les versions empaquetées actuelles d'OpenClaw l'incluent déjà. Les installations plus anciennes ou personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
  </Step>
  <Step title="Créer un bot Mattermost">
    Créez un compte bot Mattermost et copiez le **bot token**.
  </Step>
  <Step title="Copier l'URL de base">
    Copiez l'**URL de base** de Mattermost (p. ex., `https://chat.example.com`).
  </Step>
  <Step title="Configurer OpenClaw et démarrer la passerelle">
    Configuration minimale :

    ```json5
    {
      channels: {
        mattermost: {
          enabled: true,
          botToken: "mm-token",
          baseUrl: "https://chat.example.com",
          dmPolicy: "pairing",
        },
      },
    }
    ```

  </Step>
</Steps>

## Commandes slash natives

Les commandes slash natives sont facultatives. Lorsqu'elles sont activées, OpenClaw enregistre les commandes slash `oc_*` via l'API Mattermost et reçoit les POST de rappel sur le serveur HTTP de la passerelle.

```json5
{
  channels: {
    mattermost: {
      commands: {
        native: true,
        nativeSkills: true,
        callbackPath: "/api/channels/mattermost/command",
        // Use when Mattermost cannot reach the gateway directly (reverse proxy/public URL).
        callbackUrl: "https://gateway.example.com/api/channels/mattermost/command",
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Notes de comportement">
    - `native: "auto"` est désactivé par défaut pour Mattermost. Définissez `native: true` pour activer.
    - Si `callbackUrl` est omis, OpenClaw en dérive un à partir de l'hôte/port de la passerelle + `callbackPath`.
    - Pour les configurations multi-comptes, `commands` peut être défini au niveau supérieur ou sous `channels.mattermost.accounts.<id>.commands` (les valeurs de compte remplacent les champs de niveau supérieur).
    - Les rappels de commande sont validés avec les jetons par commande renvoyés par Mattermost lorsqu'OpenClaw enregistre les commandes `oc_*`.
    - Les rappels slash échouent en mode fermé lorsque l'enregistrement a échoué, le démarrage était partiel, ou que le jeton de rappel ne correspond pas à l'une des commandes enregistrées.
  </Accordion>
  <Accordion title="Exigence d'accessibilité">
    Le point de terminaison de rappel doit être accessible depuis le serveur Mattermost.

    - Ne définissez pas `callbackUrl` sur `localhost` sauf si Mattermost s'exécute sur le même hôte/espace de noms réseau qu'OpenClaw.
    - Ne définissez pas `callbackUrl` sur votre URL de base Mattermost sauf si cette URL fait un proxy inverse de `/api/channels/mattermost/command` vers OpenClaw.
    - Une vérification rapide est `curl https://<gateway-host>/api/channels/mattermost/command` ; un GET devrait renvoyer `405 Method Not Allowed` depuis OpenClaw, et non `404`.

  </Accordion>
  <Accordion title="Liste d'autorisation de sortie Mattermost">
    Si vos cibles de rappel sont des adresses privées/tailnet/ internes, définissez le `ServiceSettings.AllowedUntrustedInternalConnections` Mattermost pour inclure l'hôte/domaine de rappel.

    Utilisez des entrées d'hôte/domaine, pas des URL complètes.

    - Bon : `gateway.tailnet-name.ts.net`
    - Mauvais : `https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## Variables d'environnement (compte par défaut)

Définissez-les sur l'hôte de la passerelle si vous préférez les variables d'environnement :

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
Les variables d'environnement ne s'appliquent qu'au compte par **défaut** (`default`). Les autres comptes doivent utiliser les valeurs de configuration.

`MATTERMOST_URL` ne peut pas être défini à partir d'un `.env` d'espace de travail ; voir [Fichiers `.env` d'espace de travail](/fr/gateway/security).

</Note>

## Modes de chat

Mattermost répond automatiquement aux DMs. Le comportement du canal est contrôlé par `chatmode` :

<Tabs>
  <Tab title="oncall (default)">Répond uniquement lorsqu'il est @mentionné dans les canaux.</Tab>
  <Tab title="onmessage">Répond à chaque message de canal.</Tab>
  <Tab title="onchar">Répond lorsqu'un message commence par un préfixe de déclenchement.</Tab>
</Tabs>

Exemple de configuration :

```json5
{
  channels: {
    mattermost: {
      chatmode: "onchar",
      oncharPrefixes: [">", "!"],
    },
  },
}
```

Remarques :

- `onchar` répond toujours aux @mentions explicites.
- `channels.mattermost.requireMention` est honoré pour les configurations héritées, mais `chatmode` est préféré.

## Fils de discussion et sessions

Utilisez `channels.mattermost.replyToMode` pour contrôler si les réponses aux canaux et aux groupes restent dans le canal principal ou commencent un fil sous le message déclencheur.

- `off` (par défaut) : ne répond dans un fil que lorsque le message entrant en fait déjà partie.
- `first` : pour les messages de canal/groupe de premier niveau, commencez un fil sous ce message et acheminez la conversation vers une session limitée au fil.
- `all` : même comportement que `first` pour Mattermost aujourd'hui.
- Les messages directs ignorent ce paramètre et restent non threadés.

Exemple de configuration :

```json5
{
  channels: {
    mattermost: {
      replyToMode: "all",
    },
  },
}
```

Remarques :

- Les sessions limitées au fil utilisent l'identifiant du message déclencheur comme racine du fil.
- `first` et `all` sont actuellement équivalents car une fois que Mattermost a une racine de fil, les blocs de suivi et les médias continuent dans ce même fil.

## Contrôle d'accès (DMs)

- Par défaut : `channels.mattermost.dmPolicy = "pairing"` (les expéditeurs inconnus reçoivent un code d'appairage).
- Approuver via :
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- DMs publics : `channels.mattermost.dmPolicy="open"` plus `channels.mattermost.allowFrom=["*"]`.

## Canaux (groupes)

- Par défaut : `channels.mattermost.groupPolicy = "allowlist"` (limité par mention).
- Autoriser les expéditeurs avec `channels.mattermost.groupAllowFrom` (identifiants utilisateur recommandés).
- Les substitutions de mentions par canal se trouvent sous `channels.mattermost.groups.<channelId>.requireMention` ou `channels.mattermost.groups["*"].requireMention` pour une valeur par défaut.
- La correspondance `@username` est modifiable et uniquement activée lorsque `channels.mattermost.dangerouslyAllowNameMatching: true`.
- Canaux ouverts : `channels.mattermost.groupPolicy="open"` (limité par mention).
- Note d'exécution : si `channels.mattermost` est totalement absent, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

Exemple :

```json5
{
  channels: {
    mattermost: {
      groupPolicy: "open",
      groups: {
        "*": { requireMention: true },
        "team-channel-id": { requireMention: false },
      },
    },
  },
}
```

## Cibles pour la livraison sortante

Utilisez ces formats de cible avec `openclaw message send` ou cron/webhooks :

- `channel:<id>` pour un channel
- `user:<id>` pour un DM
- `@username` pour un DM (résolu via l'Mattermost API)

<Warning>
Les ID opaques bruts (comme `64ifufp...`) sont **ambigus** dans Mattermost (ID utilisateur vs ID de channel).

OpenClaw les résout en **priorité utilisateur** :

- Si l'ID existe en tant qu'utilisateur (`GET /api/v4/users/<id>` réussit), OpenClaw envoie un **DM** en résolvant le channel direct via `/api/v4/channels/direct`.
- Sinon, l'ID est traité comme un **ID de channel**.

Si vous avez besoin d'un comportement déterministe, utilisez toujours les préfixes explicites (`user:<id>` / `channel:<id>`).

</Warning>

## Nouvelle tentative de channel DM

Lorsque OpenClaw envoie à une cible DM Mattermost et doit résoudre le channel direct en premier, il réessaie par défaut les échecs temporaires de création de channel direct.

Utilisez `channels.mattermost.dmChannelRetry` pour régler ce comportement globalement pour le plugin Mattermost, ou `channels.mattermost.accounts.<id>.dmChannelRetry` pour un compte.

```json5
{
  channels: {
    mattermost: {
      dmChannelRetry: {
        maxRetries: 3,
        initialDelayMs: 1000,
        maxDelayMs: 10000,
        timeoutMs: 30000,
      },
    },
  },
}
```

Notes :

- Cela s'applique uniquement à la création de channel DM (`/api/v4/channels/direct`), et non à chaque appel à l'Mattermost API.
- Les nouvelles tentatives s'appliquent aux échecs temporaires tels que les limites de débit, les réponses 5xx, et les erreurs de réseau ou d'expiration.
- Les erreurs client 4xx autres que `429` sont traitées comme permanentes et ne font pas l'objet d'une nouvelle tentative.

## Aperçu du streaming

Mattermost diffuse la réflexion, l'activité des outils et le texte de réponse partiel dans un seul **brouillon de post de prévisualisation** qui est finalisé sur place lorsque la réponse finale peut être envoyée en toute sécurité. La prévisualisation est mise à jour sur le même identifiant de post au lieu de polluer le channel avec des messages par bloc. Les finales de média/erreur annulent les modifications de prévisualisation en attente et utilisent la livraison normale au lieu de publier un brouillon de prévisualisation jetable.

Activer via `channels.mattermost.streaming` :

```json5
{
  channels: {
    mattermost: {
      streaming: "partial", // off | partial | block | progress
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Modes de streaming">
    - `partial` est le choix habituel : un post de prévisualisation qui est modifié au fur et à mesure que la réponse grandit, puis finalisé avec la réponse complète.
    - `block` utilise des blocs de brouillon de type « append » à l'intérieur du post de prévisualisation.
    - `progress` affiche une prévisualisation de l'état pendant la génération et ne poste que la réponse finale à l'achèvement.
    - `off` désactive le streaming de prévisualisation.
  </Accordion>
  <Accordion title="Notes sur le comportement du streaming">
    - Si le flux ne peut pas être finalisé sur place (par exemple si le post a été supprimé en cours de flux), OpenClaw revient à l'envoi d'un nouveau post final afin que la réponse ne soit jamais perdue.
    - Les charges utiles contenant uniquement du raisonnement sont supprimées des posts de channel, y compris le texte qui arrive sous forme de `> Reasoning:` citation. Définissez `/reasoning on` pour voir la réflexion dans d'autres surfaces ; le post final Mattermost ne conserve que la réponse.
    - Voir [Streaming](/fr/concepts/streaming#preview-streaming-modes) pour la matrice de mappage des canaux.
  </Accordion>
</AccordionGroup>

## Réactions (outil de message)

- Utilisez `message action=react` avec `channel=mattermost`.
- `messageId` est l'identifiant du post Mattermost.
- `emoji` accepte les noms comme `thumbsup` ou `:+1:` (les deux-points sont facultatifs).
- Définissez `remove=true` (booléen) pour supprimer une réaction.
- Les événements d'ajout/suppression de réaction sont transférés en tant qu'événements système vers la session de l'agent routé.

Exemples :

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

Configuration :

- `channels.mattermost.actions.reactions` : activer/désactiver les actions de réaction (par défaut true).
- Remplacement par compte : `channels.mattermost.accounts.<id>.actions.reactions`.

## Boutons interactifs (outil de message)

Envoyez des messages avec des boutons cliquables. Lorsqu'un utilisateur clique sur un bouton, l'agent reçoit la sélection et peut répondre.

Activez les boutons en ajoutant `inlineButtons` aux capacités du canal :

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

Utilisez `message action=send` avec un paramètre `buttons`. Les boutons sont un tableau à deux dimensions (lignes de boutons) :

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

Champs des boutons :

<ParamField path="text" type="string" required>
  Libellé d'affichage.
</ParamField>
<ParamField path="callback_data" type="string" required>
  Valeur renvoyée lors du clic (utilisée comme ID d'action).
</ParamField>
<ParamField path="style" type='"default" | "primary" | "danger"'>
  Style du bouton.
</ParamField>

Lorsqu'un utilisateur clique sur un bouton :

<Steps>
  <Step title="Buttons replaced with confirmation">Tous les boutons sont remplacés par une ligne de confirmation (par exemple, « ✓ **Yes** sélectionné par @user »).</Step>
  <Step title="Agent receives the selection">L'agent reçoit la sélection sous forme de message entrant et répond.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Implementation notes">
    - Les rappels de boutons utilisent la vérification HMAC-SHA256 (automatique, aucune configuration requise).
    - Mattermost supprime les données de rappel de ses réponses API (fonctionnalité de sécurité), donc tous les boutons sont supprimés au clic — une suppression partielle n'est pas possible.
    - Les ID d'action contenant des traits d'union ou des tirets du bas sont nettoyés automatiquement (limitation de routage Mattermost).
  </Accordion>
  <Accordion title="Configuration et accessibilité">
    - `channels.mattermost.capabilities` : tableau de chaînes de capacités. Ajoutez `"inlineButtons"` pour activer la description de l'outil de boutons dans le prompt système de l'agent.
    - `channels.mattermost.interactions.callbackBaseUrl` : URL de base externe facultative pour les rappels de boutons (par exemple `https://gateway.example.com`). Utilisez ceci lorsque Mattermost ne peut pas atteindre la passerelle à son hôte de liaison directement.
    - Dans les configurations multi-comptes, vous pouvez également définir le même champ sous `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl`.
    - Si `interactions.callbackBaseUrl` est omis, OpenClaw déduit l'URL de rappel à partir de `gateway.customBindHost` + `gateway.port`, puis revient à `http://localhost:<port>`.
    - Règle d'accessibilité : l'URL de rappel des boutons doit être accessible depuis le serveur Mattermost. `localhost` ne fonctionne que lorsque Mattermost et OpenClaw s'exécutent sur le même hôte/espace de noms réseau.
    - Si votre cible de rappel est privée/tailnet/interne, ajoutez son hôte/domaine à `ServiceSettings.AllowedUntrustedInternalConnections` de Mattermost.
  </Accordion>
</AccordionGroup>

### Intégration directe à l'API (scripts externes)

Les scripts externes et les webhooks peuvent publier des boutons directement via l'API REST de Mattermost au lieu de passer par l'outil `message` de l'agent. Utilisez `buildButtonAttachments()` du plugin si possible ; si vous publiez du JSON brut, suivez ces règles :

**Structure de la charge utile :**

```json5
{
  channel_id: "<channelId>",
  message: "Choose an option:",
  props: {
    attachments: [
      {
        actions: [
          {
            id: "mybutton01", // alphanumeric only — see below
            type: "button", // required, or clicks are silently ignored
            name: "Approve", // display label
            style: "primary", // optional: "default", "primary", "danger"
            integration: {
              url: "https://gateway.example.com/mattermost/interactions/default",
              context: {
                action_id: "mybutton01", // must match button id (for name lookup)
                action: "approve",
                // ... any custom fields ...
                _token: "<hmac>", // see HMAC section below
              },
            },
          },
        ],
      },
    ],
  },
}
```

<Warning>
**Règles critiques**

1. Les pièces jointes doivent être placées dans `props.attachments`, et non au niveau supérieur `attachments` (ignoré silencieusement).
2. Chaque action nécessite `type: "button"` — sans cela, les clics sont ignorés silencieusement.
3. Chaque action nécessite un champ `id` — Mattermost ignore les actions sans ID.
4. L'`id` de l'action doit être **uniquement alphanumérique** (`[a-zA-Z0-9]`). Les traits d'union et les tirets du bas cassent le routage des actions côté serveur de Mattermost (renvoie 404). Retirez-les avant utilisation.
5. `context.action_id` doit correspondre à l'`id` du bouton afin que le message de confirmation affiche le nom du bouton (par exemple, « Approuver ») au lieu de l'ID brut.
6. `context.action_id` est obligatoire — le gestionnaire d'interaction renvoie 400 sans cela.
   </Warning>

**Génération de jeton HMAC**

La passerelle vérifie les clics sur les boutons avec HMAC-SHA256. Les scripts externes doivent générer des jetons qui correspondent à la logique de vérification de la passerelle :

<Steps>
  <Step title="Dériver le secret du jeton du bot">`HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`</Step>
  <Step title="Construire l'objet de contexte">Construisez l'objet de contexte avec tous les champs **sauf** `_token`.</Step>
  <Step title="Sérialiser avec des clés triées">Sérialisez avec des **clés triées** et **sans espaces** (la passerelle utilise `JSON.stringify` avec des clés triées, ce qui produit une sortie compacte).</Step>
  <Step title="Signer la charge utile">`HMAC-SHA256(key=secret, data=serializedContext)`</Step>
  <Step title="Ajouter le jeton">Ajoutez l'empreinte hexadécimale résultante en tant que `_token` dans le contexte.</Step>
</Steps>

Exemple Python :

```python
import hmac, hashlib, json

secret = hmac.new(
    b"openclaw-mattermost-interactions",
    bot_token.encode(), hashlib.sha256
).hexdigest()

ctx = {"action_id": "mybutton01", "action": "approve"}
payload = json.dumps(ctx, sort_keys=True, separators=(",", ":"))
token = hmac.new(secret.encode(), payload.encode(), hashlib.sha256).hexdigest()

context = {**ctx, "_token": token}
```

<AccordionGroup>
  <Accordion title="Pièges courants liés à HMAC">
    - Par défaut, `json.dumps` de Python ajoute des espaces (`{"key": "val"}`). Utilisez `separators=(",", ":")` pour correspondre à la sortie compacte de JavaScript (`{"key":"val"}`).
    - Signez toujours **tous** les champs de contexte (à l'exception de `_token`). La passerelle supprime `_token` puis signe tout ce qui reste. Signer un sous-ensemble provoque un échec silencieux de la vérification.
    - Utilisez `sort_keys=True` — la passerelle trie les clés avant de signer, et Mattermost peut réorganiser les champs de contexte lors du stockage de la charge utile.
    - Dérivez le secret du jeton du bot (déterministe), et non d'octets aléatoires. Le secret doit être identique entre le processus qui crée les boutons et la passerelle qui les vérifie.
  </Accordion>
</AccordionGroup>

## Adaptateur de répertoire

Le plugin Mattermost inclut un adaptateur de répertoire qui résout les noms des canaux et des utilisateurs via l'API Mattermost. Cela permet les cibles `#channel-name` et `@username` dans les livraisons `openclaw message send` et cron/webhook.

Aucune configuration n'est nécessaire — l'adaptateur utilise le jeton du bot provenant de la configuration du compte.

## Multi-compte

Mattermost prend en charge plusieurs comptes sous `channels.mattermost.accounts` :

```json5
{
  channels: {
    mattermost: {
      accounts: {
        default: { name: "Primary", botToken: "mm-token", baseUrl: "https://chat.example.com" },
        alerts: { name: "Alerts", botToken: "mm-token-2", baseUrl: "https://alerts.example.com" },
      },
    },
  },
}
```

## Dépannage

<AccordionGroup>
  <Accordion title="Pas de réponses dans les canaux">Assurez-vous que le bot est dans le canal et mentionnez-le (oncall), utilisez un préfixe de déclencheur (onchar), ou définissez `chatmode: "onmessage"`.</Accordion>
  <Accordion title="Erreurs d'authentification ou multi-compte">- Vérifiez le jeton du bot, l'URL de base, et si le compte est activé. - Problèmes multi-compte : les env vars ne s'appliquent qu'au compte `default`.</Accordion>
  <Accordion title="Native slash commands fail">
    - `Unauthorized: invalid command token.` : OpenClaw n'a pas accepté le jeton de rappel. Causes typiques : - l'enregistrement de la commande slash a échoué ou n'a été que partiellement terminé au démarrage - le rappel atteint la mauvaise passerelle/compte - Mattermost possède encore d'anciennes commandes pointant vers une cible de rappel précédente - la passerelle a redémarré sans réactiver les
    commandes slash - Si les commandes slash natives cessent de fonctionner, vérifiez les journaux pour `mattermost: failed to register slash commands` ou `mattermost: native slash commands enabled but no commands could be registered`. - Si `callbackUrl` est omis et que les journaux avertissent que le rappel a résolu vers `http://127.0.0.1:18789/...`, cette URL n'est probablement accessible que
    lorsque Mattermost s'exécute sur le même hôte/espace de réseau qu'OpenClaw. Définissez plutôt un `commands.callbackUrl` explicitement accessible de l'extérieur.
  </Accordion>
  <Accordion title="Problèmes de boutons">
    - Les boutons apparaissent sous forme de cases blanches : l'agent est peut-être en train d'envoyer des données de boutons mal formées. Vérifiez que chaque bouton possède à la fois les champs `text` et `callback_data`. - Les boutons s'affichent mais les clics ne font rien : vérifiez que `AllowedUntrustedInternalConnections` dans la configuration du serveur Mattermost inclut `127.0.0.1
    localhost`, et que `EnablePostActionIntegration` est `true` dans ServiceSettings. - Les boutons renvoient 404 lors du clic : le `id` du bouton contient probablement des traits d'union ou des underscores. Le routeur d'action de Mattermost plante sur les ID non alphanumériques. Utilisez uniquement `[a-zA-Z0-9]`. - Le Gateway enregistre `invalid _token` : inadéquation HMAC. Vérifiez que vous
    signez tous les champs de contexte (pas un sous-ensemble), que vous utilisez des clés triées et du JSON compact (sans espaces). Voir la section HMAC ci-dessus. - Le Gateway enregistre `missing _token in context` : le champ `_token` n'est pas dans le contexte du bouton. Assurez-vous qu'il est inclus lors de la construction de la charge utile d'intégration. - La confirmation affiche l'ID brut au
    lieu du nom du bouton : `context.action_id` ne correspond pas au `id` du bouton. Définissez les deux avec la même valeur nettoyée. - L'agent ne connaît pas les boutons : ajoutez `capabilities: ["inlineButtons"]` à la configuration du canal Mattermost.
  </Accordion>
</AccordionGroup>

## Connexes

- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Aperçu des canaux](/fr/channels) — tous les canaux pris en charge
- [Groupes](/fr/channels/groups) — comportement de chat de groupe et filtrage des mentions
- [Jumelage](/fr/channels/pairing) — authentification DM et flux de jumelage
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
