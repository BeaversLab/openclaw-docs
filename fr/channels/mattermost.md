---
summary: "Configuration du bot Mattermost et d'OpenClaw"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost (plugin)

Statut : pris en charge via un plugin (jeton de bot + événements WebSocket). Les canaux, les groupes et les DMs sont pris en charge.
Mattermost est une plateforme de messagerie d'équipe auto-hébergeable ; consultez le site officiel à
[mattermost.com](https://mattermost.com) pour plus de détails sur le produit et les téléchargements.

## Plugin requis

Mattermost est fourni sous forme de plugin et n'est pas inclus dans l'installation principale.

Installation via CLI (registre npm) :

```bash
openclaw plugins install @openclaw/mattermost
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./extensions/mattermost
```

Si vous choisissez Mattermost lors de la configuration et qu'une extraction git est détectée,
OpenClaw proposera automatiquement le chemin d'installation local.

Détails : [Plugins](/fr/tools/plugin)

## Configuration rapide

1. Installez le plugin Mattermost.
2. Créez un compte bot Mattermost et copiez le **jeton de bot (bot token)**.
3. Copiez l'**URL de base** de Mattermost (par exemple, `https://chat.example.com`).
4. Configurez OpenClaw et démarrez la passerelle.

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

## Commandes slash natives

Les commandes slash natives sont optionnelles. Lorsqu'elles sont activées, OpenClaw enregistre des commandes slash `oc_*` via
l'API Mattermost et reçoit des POST de rappel sur le serveur HTTP de la passerelle.

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

Notes :

- `native: "auto"` est désactivé par défaut pour Mattermost. Définissez `native: true` pour activer.
- Si `callbackUrl` est omis, OpenClaw en dérive un à partir de l'hôte/port de la passerelle + `callbackPath`.
- Pour les configurations multi-comptes, `commands` peut être défini au niveau supérieur ou sous
  `channels.mattermost.accounts.<id>.commands` (les valeurs du compte remplacent les champs de niveau supérieur).
- Les rappels de commandes sont validés avec des jetons par commande et échouent en mode fermé lorsque les vérifications de jeton échouent.
- Exigence d'accessibilité : le point de terminaison de rappel doit être accessible depuis le serveur Mattermost.
  - Ne définissez pas `callbackUrl` sur `localhost` à moins que Mattermost ne s'exécute sur le même hôte/le même espace de réseau que OpenClaw.
  - Ne définissez pas `callbackUrl` sur l'URL de base de votre Mattermost à moins que cette URL ne fasse un proxy inverse de `/api/channels/mattermost/command` vers OpenClaw.
  - Une vérification rapide est `curl https://<gateway-host>/api/channels/mattermost/command` ; un GET doit renvoyer `405 Method Not Allowed` depuis OpenClaw, et non `404`.
- Exigence de liste d'autorisation de sortie Mattermost :
  - Si vos cibles de rappel sont des adresses privées/tailnet/interne, définissez Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` pour inclure l'hôte/le domaine de rappel.
  - Utilisez des entrées d'hôte/de domaine, pas des URL complètes.
    - Bon : `gateway.tailnet-name.ts.net`
    - Mauvais : `https://gateway.tailnet-name.ts.net`

## Variables d'environnement (compte par défaut)

Définissez-les sur l'hôte de la passerelle si vous préférez les variables d'environnement :

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

Les variables d'environnement ne s'appliquent qu'au compte **par défaut** (`default`). Les autres comptes doivent utiliser les valeurs de configuration.

## Modes de discussion

Mattermost répond automatiquement aux DMs. Le comportement du canal est contrôlé par `chatmode` :

- `oncall` (par défaut) : répondre uniquement lorsqu'on est @mentionné dans les canaux.
- `onmessage` : répondre à chaque message de canal.
- `onchar` : répondre lorsqu'un message commence par un préfixe de déclenchement.

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

- `onchar` répond toujours aux @mentions explicites.
- `channels.mattermost.requireMention` est honoré pour les configurations héritées, mais `chatmode` est préféré.

## Fils de discussion et sessions

Utilisez `channels.mattermost.replyToMode` pour contrôler si les réponses de canal et de groupe restent dans le
canal principal ou commencent un fil sous le message déclencheur.

- `off` (par défaut) : répondre dans un fil uniquement lorsque le message entrant est déjà dans un fil.
- `first` : pour les publications de canal/groupe de premier niveau, lancez un fil sous cette publication et acheminez la conversation vers une session délimitée par un fil.
- `all` : même comportement que `first` pour Mattermost aujourd'hui.
- Les messages directs ignorent ce paramètre et restent non fils de discussion.

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

- Les sessions délimitées par un fil utilisent l'ID de la publication déclencheuse comme racine du fil.
- `first` et `all` sont actuellement équivalents car une fois que Mattermost a une racine de fil, les blocs suivants et les médias continuent dans ce même fil.

## Contrôle d'accès (DMs)

- Par défaut : `channels.mattermost.dmPolicy = "pairing"` (les expéditeurs inconnus reçoivent un code d'appariement).
- Approuver via :
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- DMs publics : `channels.mattermost.dmPolicy="open"` plus `channels.mattermost.allowFrom=["*"]`.

## Canaux (groupes)

- Par défaut : `channels.mattermost.groupPolicy = "allowlist"` (mention-gated).
- Autoriser les expéditeurs avec `channels.mattermost.groupAllowFrom` (user IDs recommandés).
- La correspondance `@username` est modifiable et uniquement activée lorsque `channels.mattermost.dangerouslyAllowNameMatching: true`.
- Canaux ouverts : `channels.mattermost.groupPolicy="open"` (mention-gated).
- Note d'exécution : si `channels.mattermost` est complètement manquant, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

## Cibles pour la livraison sortante

Utilisez ces formats de cible avec `openclaw message send` ou cron/webhooks :

- `channel:<id>` pour un canal
- `user:<id>` pour un DM
- `@username` pour un DM (résolu via Mattermost API)

Les ID opaques nus (comme `64ifufp...`) sont **ambigus** dans Mattermost (user ID vs channel ID).

OpenClaw les résout **user-first** :

- Si l'ID existe en tant qu'utilisateur (`GET /api/v4/users/<id>` réussit), OpenClaw envoie un **DM** en résolvant le canal direct via `/api/v4/channels/direct`.
- Sinon, l'ID est traité comme un **ID de channel**.

Si vous avez besoin d'un comportement déterministe, utilisez toujours les préfixes explicites (`user:<id>` / `channel:<id>`).

## Réactions (tool de message)

- Utilisez `message action=react` avec `channel=mattermost`.
- `messageId` est l'ID de post Mattermost.
- `emoji` accepte les noms comme `thumbsup` ou `:+1:` (les deux-points sont facultatifs).
- Définissez `remove=true` (booléen) pour supprimer une réaction.
- Les événements d'ajout/suppression de réaction sont transférés en tant qu'événements système vers la session de l'agent routé.

Exemples :

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

Configuration :

- `channels.mattermost.actions.reactions` : activer/désactiver les actions de réaction (vrai par défaut).
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

Utilisez `message action=send` avec un paramètre `buttons`. Les boutons sont un tableau à 2 dimensions (lignes de boutons) :

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

Champs du bouton :

- `text` (requis) : libellé d'affichage.
- `callback_data` (requis) : valeur renvoyée lors du clic (utilisée comme ID d'action).
- `style` (facultatif) : `"default"`, `"primary"` ou `"danger"`.

Lorsqu'un utilisateur clique sur un bouton :

1. Tous les boutons sont remplacés par une ligne de confirmation (par exemple, "✓ **Oui** sélectionné par @utilisateur").
2. L'agent reçoit la sélection en tant que message entrant et répond.

Remarques :

- Les rappels de boutons utilisent une vérification HMAC-SHA256 (automatique, aucune configuration requise).
- Mattermost supprime les données de rappel de ses réponses API (fonctionnalité de sécurité), donc tous les boutons sont supprimés au clic — une suppression partielle est impossible.
- Les ID d'action contenant des traits d'union ou des tirets du bas sont nettoyés automatiquement (limitation du routage Mattermost).

Configuration :

- `channels.mattermost.capabilities` : tableau de chaînes de capacités. Ajoutez `"inlineButtons"` pour
  activer la description de l'outil de boutons dans le prompt système de l'agent.
- `channels.mattermost.interactions.callbackBaseUrl` : URL de base externe facultative pour les
  rappels de boutons (par exemple `https://gateway.example.com`). Utilisez ceci lorsque Mattermost ne peut pas
  atteindre directement la passerelle à son hôte de liaison.
- Dans les configurations multi-comptes, vous pouvez également définir le même champ sous
  `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl`.
- Si `interactions.callbackBaseUrl` est omis, OpenClaw dérive l'URL de rappel à partir de
  `gateway.customBindHost` + `gateway.port`, puis revient à `http://localhost:<port>`.
- Règle d'accessibilité : l'URL de rappel du bouton doit être accessible depuis le serveur Mattermost.
  `localhost` ne fonctionne que lorsque Mattermost et OpenClaw s'exécutent sur le même hôte/espace de noms réseau.
- Si votre cible de rappel est privée/tailnet/interne, ajoutez son hôte/domaine à Mattermost
  `ServiceSettings.AllowedUntrustedInternalConnections`.

### Intégration directe de l'API (scripts externes)

Les scripts externes et les webhooks peuvent publier des boutons directement via l'Mattermost REST API
au lieu de passer par l'outil `message` de l'agent. Utilisez `buildButtonAttachments()` de
l'extension lorsque cela est possible ; si vous publiez du JSON brut, suivez ces règles :

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

**Règles critiques :**

1. Les pièces jointes vont dans `props.attachments`, pas au niveau supérieur `attachments` (ignoré silencieusement).
2. Chaque action a besoin de `type: "button"` — sans elle, les clics sont ignorés silencieusement.
3. Chaque action a besoin d'un champ `id` — Mattermost ignore les actions sans ID.
4. L'action `id` doit être **uniquement alphanumérique** (`[a-zA-Z0-9]`). Les traits d'union et les soulignements cassent
   le routage des actions côté serveur de Mattermost (renvoie 404). Supprimez-les avant utilisation.
5. `context.action_id` doit correspondre au `id` du bouton afin que le message de confirmation affiche
   le nom du bouton (par exemple, « Approuver ») au lieu d'un ID brut.
6. `context.action_id` est requis — le gestionnaire d'interactions renvoie 400 sans lui.

**Génération du jeton HMAC :**

La passerelle vérifie les clics sur les boutons avec HMAC-SHA256. Les scripts externes doivent générer des jetons
qui correspondent à la logique de vérification de la passerelle :

1. Dérivez le secret du jeton du bot :
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. Construisez l'objet de contexte avec tous les champs **sauf** `_token`.
3. Sérialisez avec des **clés triées** et **sans espaces** (la passerelle utilise `JSON.stringify`
   avec des clés triées, ce qui produit une sortie compacte).
4. Signez : `HMAC-SHA256(key=secret, data=serializedContext)`
5. Ajoutez l'empreinte hexadécimale résultante en tant que `_token` dans le contexte.

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

Pièges courants liés à HMAC :

- Le `json.dumps` de Python ajoute des espaces par défaut (`{"key": "val"}`). Utilisez
  `separators=(",", ":")` pour correspondre à la sortie compacte de JavaScript (`{"key":"val"}`).
- Signez toujours **tous** les champs de contexte (à l'exception de `_token`). La passerelle supprime `_token` puis
  signe tout ce qui reste. Signer un sous-ensemble entraîne un échec silencieux de la vérification.
- Utilisez `sort_keys=True` — la passerelle trie les clés avant de signer, et Mattermost peut
  réorganiser les champs de contexte lors du stockage de la charge utile.
- Dérivez le secret du jeton du bot (déterministe), et non d'octets aléatoires. Le secret
  doit être identique entre le processus qui crée les boutons et la passerelle qui vérifie.

## Adaptateur de répertoire

Le plugin Mattermost inclut un adaptateur de répertoire qui résout les noms des canaux et des utilisateurs
via l'Mattermost API. Cela permet les cibles `#channel-name` et `@username` dans
les livraisons `openclaw message send` et cron/webhook.

Aucune configuration n'est nécessaire — l'adaptateur utilise le jeton du bot depuis la configuration du compte.

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

- Pas de réponse dans les channels : assurez-vous que le bot est dans le channel et mentionnez-le (oncall), utilisez un préfixe de déclencheur (onchar), ou définissez `chatmode: "onmessage"`.
- Erreurs d'authentification : vérifiez le jeton du bot, l'URL de base, et si le compte est activé.
- Problèmes multi-comptes : les env vars ne s'appliquent qu'au compte `default`.
- Les boutons apparaissent comme des cases blanches : l'agent peut envoyer des données de bouton malformées. Vérifiez que chaque bouton possède à la fois les champs `text` et `callback_data`.
- Les boutons s'affichent mais les clics ne font rien : vérifiez que `AllowedUntrustedInternalConnections` dans la configuration du serveur Mattermost inclut `127.0.0.1 localhost`, et que `EnablePostActionIntegration` est `true` dans ServiceSettings.
- Les boutons renvoient une erreur 404 au clic : le `id` du bouton contient probablement des traits d'union ou des tirets du bas. Le routeur d'action de Mattermost échoue avec les ID non alphanumériques. Utilisez uniquement `[a-zA-Z0-9]`.
- Gateway logs `invalid _token` : inadéquation HMAC. Vérifiez que vous signez tous les champs de contexte (pas un sous-ensemble), utilisez des clés triées, et utilisez JSON compact (sans espaces). Voir la section HMAC ci-dessus.
- Gateway logs `missing _token in context` : le champ `_token` n'est pas dans le contexte du bouton. Assurez-vous qu'il est inclus lors de la construction du payload d'intégration.
- La confirmation affiche l'ID brut au lieu du nom du bouton : `context.action_id` ne correspond pas au `id` du bouton. Définissez les deux sur la même valeur nettoyée.
- L'agent ne connaît pas les boutons : ajoutez `capabilities: ["inlineButtons"]` à la configuration du channel Mattermost.

import fr from "/components/footer/fr.mdx";

<fr />
