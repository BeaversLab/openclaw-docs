---
summary: "Configuration du bot Mattermost et configuration d'OpenClaw"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
sidebarTitle: "Mattermost"
---

Statut : plugin téléchargeable (jeton de bot + événements WebSocket). Les canaux, les groupes et les DM sont pris en charge. Mattermost est une plateforme de messagerie d'équipe auto-hébergeable ; consultez le site officiel à [mattermost.com](https://mattermost.com) pour plus de détails sur le produit et les téléchargements.

## Installer

Installez Mattermost avant de configurer le canal :

<Tabs>
  <Tab title="Registre npm">```bash openclaw plugins install @openclaw/mattermost ```</Tab>
  <Tab title="Extraction locale">```bash openclaw plugins install ./path/to/local/mattermost-plugin ```</Tab>
</Tabs>

Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide

<Steps>
  <Step title="S'assurer que le plugin est disponible">
    Les versions actuelles empaquetées de OpenClaw l'incluent déjà. Les installations plus anciennes ou personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
  </Step>
  <Step title="Créer un bot Mattermost">
    Créez un compte bot Mattermost et copiez le **bot token**.
  </Step>
  <Step title="Copier l'URL de base">
    Copiez l'**URL de base** de Mattermost (par ex., `https://chat.example.com`).
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

Les commandes slash natives sont optionnelles. Lorsqu'elles sont activées, OpenClaw enregistre des commandes slash `oc_*` via l'Mattermost API et reçoit des POST de rappel sur le serveur HTTP de la passerelle.

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
  <Accordion title="Remarques sur le comportement">
    - `native: "auto"`Mattermost est désactivé par défaut pour Mattermost. Définissez `native: true` pour activer.
    - Si `callbackUrl`OpenClaw est omis, OpenClaw en dérive un à partir de l'hôte/port de la passerelle + `callbackPath`.
    - Pour les configurations multi-comptes, `commands` peut être défini au niveau supérieur ou sous `channels.mattermost.accounts.<id>.commands`MattermostOpenClaw (les valeurs de compte remplacent les champs de niveau supérieur).
    - Les rappels de commande sont validés avec les jetons par commande renvoyés par Mattermost lorsqu'OpenClaw enregistre les commandes `oc_*`OpenClawMattermostMattermostAPI.
    - OpenClaw actualise l'enregistrement actuel de la commande Mattermost avant d'accepter chaque rappel, afin que les jetons périmés des commandes slash supprimées ou régénérées cessent d'être acceptés sans redémarrage de la passerelle.
    - La validation des rappels échoue en mode fermé si l'API Mattermost ne peut pas confirmer que la commande est toujours actuelle ; les validations échouées sont mises en cache brièvement, les recherches simultanées sont fusionnées et les nouvelles recherches sont limitées par taux par commande pour borner la pression de relecture.
    - Les rappels slash échouent en mode fermé lorsque l'enregistrement a échoué, le démarrage était partiel, ou que le jeton de rappel ne correspond pas au jeton enregistré de la commande résolue (un jeton valide pour une commande ne peut pas atteindre la validation en amont pour une autre commande).

  </Accordion>
  <Accordion title="Exigence d'accessibilité"Mattermost>
    Le point de terminaison de rappel doit être accessible depuis le serveur Mattermost.

    - Ne définissez pas `callbackUrl` sur `localhost`MattermostOpenClaw sauf si Mattermost s'exécute sur le même hôte/espace de réseau qu'OpenClaw.
    - Ne définissez pas `callbackUrl`Mattermost sur votre URL de base Mattermost, sauf si cette URL effectue un proxy inverse de `/api/channels/mattermost/command`OpenClaw vers OpenClaw.
    - Une vérification rapide est `curl https://<gateway-host>/api/channels/mattermost/command` ; une requête GET doit renvoyer `405 Method Not Allowed`OpenClaw depuis OpenClaw, et non `404`.

  </Accordion>
  <Accordion title="MattermostListe blanche de sortie Mattermost"Mattermost>
    Si vos cibles de rappel sont des adresses privées/tailnet/internes, définissez Mattermost `ServiceSettings.AllowedUntrustedInternalConnections` pour inclure l'hôte/le domaine de rappel.

    Utilisez des entrées d'hôte/de domaine, pas des URL complètes.

    - Bon : `gateway.tailnet-name.ts.net`
    - Mauvais : `https://gateway.tailnet-name.ts.net`

  </Accordion>
</AccordionGroup>

## Variables d'environnement (compte par défaut)

Définissez-les sur l'hôte de la passerelle si vous préférez les env vars :

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

<Note>
Les env vars ne s'appliquent qu'au compte **par défaut** (`default`). Les autres comptes doivent utiliser les valeurs de configuration.

`MATTERMOST_URL` ne peut pas être défini depuis un workspace `.env` ; voir [Fichiers `.env` de l'espace de travail](/fr/gateway/security).

</Note>

## Modes de discussion

Mattermost répond automatiquement aux DMs. Le comportement du channel est contrôlé par Mattermost`chatmode` :

<Tabs>
  <Tab title="oncall (par défaut)">Répondre uniquement lorsqu'il est mentionné (@mention) dans les channels.</Tab>
  <Tab title="onmessage">Répondre à chaque message de channel.</Tab>
  <Tab title="onchar">Répondre lorsqu'un message commence par un préfixe de déclenchement.</Tab>
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

Notes :

- `onchar` répond toujours aux mentions @ explicites.
- `channels.mattermost.requireMention` est respecté pour les configurations héritées mais `chatmode` est préféré.

## Fils de discussion et sessions

Utilisez `channels.mattermost.replyToMode` pour contrôler si les réponses dans les channels et les groupes restent dans le channel principal ou commencent un fil sous le message déclencheur.

- `off` (par défaut) : ne répond dans un fil que si le message entrant est déjà dans un fil.
- `first` : pour les messages de channel/groupe de niveau supérieur, démarre un fil sous ce message et route la conversation vers une session délimitée par le fil.
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

Notes :

- Les sessions délimitées par un fil utilisent l'ID du message déclencheur comme racine du fil.
- `first` et `all` sont actuellement équivalents car une fois que Mattermost a une racine de fil, les blocs suivants et les médias continuent dans ce même fil.

## Contrôle d'accès (DMs)

- Par défaut : `channels.mattermost.dmPolicy = "pairing"` (les expéditeurs inconnus reçoivent un code d'appairage).
- Approuver via :
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- DMs publics : `channels.mattermost.dmPolicy="open"` plus `channels.mattermost.allowFrom=["*"]`.
- `channels.mattermost.allowFrom` accepte les entrées `accessGroup:<name>`. Voir [Access groups](/fr/channels/access-groups).

## Canaux (groupes)

- Par défaut : `channels.mattermost.groupPolicy = "allowlist"` (limité par mention).
- Liste blanche des expéditeurs avec `channels.mattermost.groupAllowFrom` (IDs utilisateur recommandés).
- `channels.mattermost.groupAllowFrom` accepte les entrées `accessGroup:<name>`. Voir [Access groups](/fr/channels/access-groups).
- Les remplacements de mention par channel se trouvent sous `channels.mattermost.groups.<channelId>.requireMention` ou `channels.mattermost.groups["*"].requireMention` pour une valeur par défaut.
- La correspondance `@username` est modifiable et uniquement activée lorsque `channels.mattermost.dangerouslyAllowNameMatching: true`.
- Channels ouverts : `channels.mattermost.groupPolicy="open"` (limité par mention).
- Remarque d'exécution : si `channels.mattermost` est totalement absent, l'exécution revient par défaut à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

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

Lorsque OpenClaw envoie à une cible DM Mattermost et doit d'abord résoudre le channel direct, il réessaie par défaut les échecs transitoires de création de channel direct.

Utilisez `channels.mattermost.dmChannelRetry` pour ajuster ce comportement globalement pour le plugin Mattermost, ou `channels.mattermost.accounts.<id>.dmChannelRetry` pour un compte.

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
- Les nouvelles tentatives s'appliquent aux échecs transitoires tels que les limites de débit, les réponses 5xx, et les erreurs réseau ou d'expiration.
- Les erreurs client 4xx autres que `429` sont traitées comme permanentes et ne font pas l'objet d'une nouvelle tentative.

## Aperçu du streaming

Mattermost diffuse la réflexion, l'activité des outils et le texte de réponse partiel dans un seul **brouillon de publication de prévisualisation** qui est finalisé sur place lorsque la réponse finale est prête à être envoyée. La prévisualisation se met à jour sur le même identifiant de publication au lieu de spammer le channel avec des messages par fragment. Les finales médias/erreur annulent les modifications de prévisualisation en attente et utilisent la livraison normale au lieu de vider une publication de prévisualisation jetable.

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
    - `partial` est le choix habituel : une publication de prévisualisation qui est modifiée au fur et à mesure que la réponse grandit, puis finalisée avec la réponse complète.
    - `block` utilise des fragments de brouillon de type ajout à l'intérieur de la publication de prévisualisation.
    - `progress` affiche une prévisualisation de l'état lors de la génération et ne publie la réponse finale qu'à la fin.
    - `off` désactive le streaming de prévisualisation.

  </Accordion>
  <Accordion title="Notes sur le comportement du streaming">
    - Si le flux ne peut pas être finalisé sur place (par exemple si la publication a été supprimée en cours de flux), OpenClaw se rabat sur l'envoi d'une nouvelle publication finale afin que la réponse ne soit jamais perdue.
    - Les charges utiles contenant uniquement du raisonnement sont supprimées des publications du channel, y compris le texte qui arrive sous forme de citation `> Reasoning:`. Définissez `/reasoning on` pour voir la réflexion dans d'autres interfaces ; la publication finale Mattermost ne conserve que la réponse.
    - Voir [Streaming](/fr/concepts/streaming#preview-streaming-modes) pour la matrice de mappage des channels.

  </Accordion>
</AccordionGroup>

## Réactions (outil de message)

- Utilisez `message action=react` avec `channel=mattermost`.
- `messageId` est l'identifiant de la publication Mattermost.
- `emoji` accepte les noms comme `thumbsup` ou `:+1:` (les deux-points sont facultatifs).
- Définissez `remove=true` (booléen) pour supprimer une réaction.
- Les événements d'ajout/suppression de réactions sont transférés en tant qu'événements système vers la session de l'agent acheminé.

Exemples :

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

Configuration :

- `channels.mattermost.actions.reactions` : activer/désactiver les actions de réaction (par défaut true).
- Remplacement par compte : `channels.mattermost.accounts.<id>.actions.reactions`.

## Boutons interactifs (tool de message)

Envoyez des messages avec des boutons cliquables. Lorsqu'un utilisateur clique sur un bouton, l'agent reçoit la sélection et peut répondre.

Activez les boutons en ajoutant `inlineButtons` aux capacités du channel :

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

Champs du bouton :

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
  <Step title="Boutons remplacés par une confirmation">Tous les boutons sont remplacés par une ligne de confirmation (par exemple, « ✓ **Oui** sélectionné par @utilisateur »).</Step>
  <Step title="L'agent reçoit la sélection">L'agent reçoit la sélection sous la forme d'un message entrant et répond.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Notes de mise en œuvre">
    - Les rappels de boutons utilisent la vérification HMAC-SHA256 (automatique, aucune configuration requise).
    - Mattermost supprime les données de rappel de ses réponses API (fonctionnalité de sécurité), donc tous les boutons sont supprimés lors du clic — une suppression partielle n'est pas possible.
    - Les ID d'action contenant des traits d'union ou des soulignements sont nettoyés automatiquement (limitation du routage Mattermost).

  </Accordion>
  <Accordion title="Configuration et accessibilité">
    - `channels.mattermost.capabilities` : tableau de chaînes de capacités. Ajoutez `"inlineButtons"` pour activer la description de l'outil de boutons dans le prompt système de l'agent.
    - `channels.mattermost.interactions.callbackBaseUrl` : URL de base externe facultative pour les rappels de boutons (par exemple `https://gateway.example.com`Mattermost). Utilisez ceci lorsque Mattermost ne peut pas atteindre la passerelle directement à son hôte de liaison.
    - Dans les configurations multi-comptes, vous pouvez également définir le même champ sous `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl`.
    - Si `interactions.callbackBaseUrl`OpenClaw est omis, OpenClaw dérive l'URL de rappel à partir de `gateway.customBindHost` + `gateway.port`, puis revient à `http://localhost:<port>`Mattermost.
    - Règle d'accessibilité : l'URL de rappel des boutons doit être accessible depuis le serveur Mattermost. `localhost`MattermostOpenClawMattermost ne fonctionne que lorsque Mattermost et OpenClauw s'exécutent sur le même hôte/espace de noms réseau.
    - Si votre cible de rappel est privée/tailnet/interne, ajoutez son hôte/domaine à Mattermost `ServiceSettings.AllowedUntrustedInternalConnections`.

  </Accordion>
</AccordionGroup>

### Intégration directe de l'API (scripts externes)

Les scripts externes et les webhooks peuvent poster des boutons directement via l'API REST de Mattermost au lieu de passer par l'outil MattermostAPI`message` de l'agent. Utilisez `buildButtonAttachments()` du plugin si possible ; si vous postez du JSON brut, suivez ces règles :

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
            id: "mybutton01", // alphanumeric only - see below
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

1. Les pièces jointes vont dans `props.attachments`, pas au niveau supérieur `attachments` (ignoré silencieusement).
2. Chaque action nécessite `type: "button"` - sans lui, les clics sont absorbés silencieusement.
3. Chaque action nécessite un champ `id` - Mattermost ignore les actions sans ID.
4. L'`id` de l'action doit être **uniquement alphanumérique** (`[a-zA-Z0-9]`). Les tirets et les soulignés cassent le routage des actions côté serveur de Mattermost (retourne 404). Supprimez-les avant utilisation.
5. `context.action_id` doit correspondre à l'`id` du bouton pour que le message de confirmation affiche le nom du bouton (par exemple, « Approuver ») au lieu d'un ID brut.
6. `context.action_id` est requis - le gestionnaire d'interaction renvoie 400 sans lui.

</Warning>

**Génération de jeton HMAC**

La passerelle vérifie les clics sur les boutons avec HMAC-SHA256. Les scripts externes doivent générer des jetons qui correspondent à la logique de vérification de la passerelle :

<Steps>
  <Step title="Dérivez le secret du jeton du bot">`HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`</Step>
  <Step title="Construisez l'objet de contexte">Construisez l'objet de contexte avec tous les champs **sauf** `_token`.</Step>
  <Step title="Sérialisez avec des clés triées">Sérialisez avec des **clés triées** et **sans espaces** (la passerelle utilise `JSON.stringify` avec des clés triées, ce qui produit une sortie compacte).</Step>
  <Step title="Signez la charge utile">`HMAC-SHA256(key=secret, data=serializedContext)`</Step>
  <Step title="Ajoutez le jeton">Ajoutez l'empreinte hexadécimale résultante en tant que `_token` dans le contexte.</Step>
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
  <Accordion title="Pièges courants liés au HMAC">
    - Le `json.dumps` de Python ajoute des espaces par défaut (`{"key": "val"}`). Utilisez `separators=(",", ":")` pour correspondre à la sortie compacte de JavaScript (`{"key":"val"}`).
    - Signez toujours **tous** les champs de contexte (à l'exception de `_token`). La passerelle supprime `_token` puis signe tout ce qui reste. Signer un sous-ensemble entraîne un échec silencieux de la vérification.
    - Utilisez `sort_keys=True` - la passerelle trie les clés avant de signer, et Mattermost peut réorganiser les champs de contexte lors du stockage de la charge utile.
    - Dérivez le secret du jeton du bot (déterministe), et non d'octets aléatoires. Le secret doit être identique entre le processus qui crée les boutons et la passerelle qui les vérifie.

  </Accordion>
</AccordionGroup>

## Adaptateur de répertoire

Le plugin Mattermost inclut un adaptateur de répertoire qui résout les noms de canaux et d'utilisateurs via l'Mattermost API. Cela permet les cibles `#channel-name` et `@username` dans les livraisons `openclaw message send` et cron/webhook.

Aucune configuration n'est nécessaire - l'adaptateur utilise le jeton du bot issu de la configuration du compte.

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
  <Accordion title="Aucune réponse dans les canaux">
    Assurez-vous que le bot est dans le canal et mentionnez-le (oncall), utilisez un préfixe de déclencheur (onchar), ou définissez `chatmode: "onmessage"`.
  </Accordion>
  <Accordion title="Erreurs d'authentification ou multi-compte">
    - Vérifiez le jeton du bot, l'URL de base et si le compte est activé.
    - Problèmes multi-compte : les variables d'environnement ne s'appliquent qu'au compte `default`.

  </Accordion>
  <Accordion title="Native slash commands fail">
    - `Unauthorized: invalid command token.` : OpenClaw n'a pas accepté le jeton de rappel. Causes typiques :
      - l'enregistrement de la commande slash a échoué ou n'a été que partiellement terminé au démarrage
      - le rappel atteint la mauvaise passerelle/le mauvais compte
      - Mattermost possède encore d'anciennes commandes pointant vers une cible de rappel précédente
      - la passerelle a redémarré sans réactiver les commandes slash
    - Si les commandes slash natives cessent de fonctionner, vérifiez les journaux pour `mattermost: failed to register slash commands` ou `mattermost: native slash commands enabled but no commands could be registered`.
    - Si `callbackUrl` est omis et que les journaux avertissent que le rappel a résolu vers `http://127.0.0.1:18789/...`, cette URL n'est probablement accessible que lorsque Mattermost s'exécute sur le même hôte/espace de réseau que OpenClaw. Définissez plutôt un `commands.callbackUrl` explicitement accessible de l'extérieur.

  </Accordion>
  <Accordion title="Problèmes de boutons">
    - Les boutons apparaissent comme des boîtes blanches : l'agent est peut-être en train d'envoyer des données de boutons malformées. Vérifiez que chaque bouton possède à la fois les champs `text` et `callback_data`.
    - Les boutons s'affichent mais les clics ne font rien : vérifiez que `AllowedUntrustedInternalConnections` dans la configuration du serveur Mattermost inclut `127.0.0.1 localhost`, et que `EnablePostActionIntegration` est `true` dans ServiceSettings.
    - Les boutons renvoient une erreur 404 au clic : le `id` du bouton contient probablement des tirets ou des traits de soulignement. Le routeur d'action de Mattermost ne gère pas les ID non alphanumériques. Utilisez uniquement `[a-zA-Z0-9]`.
    - Les journaux du Gateway indiquent `invalid _token` : inadéquation HMAC. Vérifiez que vous signez tous les champs de contexte (pas un sous-ensemble), que vous utilisez des clés triées et du JSON compact (sans espaces). Consultez la section HMAC ci-dessus.
    - Les journaux du Gateway indiquent `missing _token in context` : le champ `_token` n'est pas dans le contexte du bouton. Assurez-vous qu'il est inclus lors de la construction de la charge utile d'intégration.
    - La confirmation affiche l'ID brut au lieu du nom du bouton : `context.action_id` ne correspond pas au `id` du bouton. Définissez les deux avec la même valeur nettoyée.
    - L'agent ne connaît pas les boutons : ajoutez `capabilities: ["inlineButtons"]` à la configuration du channel Mattermost.

  </Accordion>
</AccordionGroup>

## Connexes

- [Channel Routing](/fr/channels/channel-routing) - routage de session pour les messages
- [Channels Overview](/fr/channels) - tous les channels pris en charge
- [Groups](/fr/channels/groups) - comportement du chat de groupe et contrôle des mentions
- [Pairing](/fr/channels/pairing) - authentification DM et flux de couplage
- [Security](/fr/gateway/security) - modèle d'accès et durcissement
