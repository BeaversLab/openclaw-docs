---
summary: "Configuration du bot Mattermost et d'OpenClaw"
read_when:
  - Setting up Mattermost
  - Debugging Mattermost routing
title: "Mattermost"
---

# Mattermost

Statut : plugin inclus (jeton bot + événements WebSocket). Les salons, les groupes et les DMs sont pris en charge.
Mattermost est une plateforme de messagerie d'équipe auto-hébergeable ; consultez le site officiel à
[mattermost.com](https://mattermost.com) pour plus de détails sur le produit et les téléchargements.

## Plugin inclus

Mattermost est fourni en tant que plugin inclus dans les versions actuelles d'OpenClaw, les builds
packagés normaux n'ont donc pas besoin d'une installation séparée.

Si vous êtes sur une ancienne version ou une installation personnalisée qui exclut Mattermost,
installez-le manuellement :

Installer via CLI (registre npm) :

```bash
openclaw plugins install @openclaw/mattermost
```

Extraction locale (lors de l'exécution depuis un dépôt git) :

```bash
openclaw plugins install ./path/to/local/mattermost-plugin
```

Détails : [Plugins](/en/tools/plugin)

## Configuration rapide

1. Assurez-vous que le plugin Mattermost est disponible.
   - Les versions packagées actuelles d'OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Créez un compte bot Mattermost et copiez le **jeton bot**.
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

Les commandes slash natives sont facultatives. Lorsqu'elles sont activées, OpenClaw enregistre les commandes slash `oc_*` via
l'API Mattermost et reçoit les POST de rappel sur le serveur HTTP de la passerelle.

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
  `channels.mattermost.accounts.<id>.commands` (les valeurs de compte remplacent les champs de niveau supérieur).
- Les rappels de commande sont validés avec les jetons par commande renvoyés par
  Mattermost lorsqu'OpenClaw enregistre les commandes `oc_*`.
- Les rappels slash échouent de manière fermée lorsque l'enregistrement a échoué, le démarrage était partiel, ou
  que le jeton de rappel ne correspond pas à l'une des commandes enregistrées.
- Exigence d'accessibilité : le point de terminaison de rappel doit être accessible depuis le serveur Mattermost.
  - Ne définissez pas `callbackUrl` sur `localhost` sauf si Mattermost s'exécute sur le même hôte/namespace réseau que OpenClaw.
  - Ne définissez pas `callbackUrl` sur l'URL de base de votre Mattermost sauf si cette URL fait un proxy inverse de `/api/channels/mattermost/command` vers OpenClaw.
  - Un contrôle rapide est `curl https://<gateway-host>/api/channels/mattermost/command` ; un GET doit renvoyer `405 Method Not Allowed` depuis OpenClaw, et non `404`.
- Exigence de liste blanche (allowlist) de sortie Mattermost :
  - Si vos cibles de rappel sont des adresses privées/tailnet/interne, définissez Mattermost
    `ServiceSettings.AllowedUntrustedInternalConnections` pour inclure l'hôte/domaine de rappel.
  - Utilisez des entrées d'hôte/domaine, pas des URL complètes.
    - Bon : `gateway.tailnet-name.ts.net`
    - Mauvais : `https://gateway.tailnet-name.ts.net`

## Variables d'environnement (compte par défaut)

Définissez-les sur l'hôte de la passerelle si vous préférez les variables d'environnement :

- `MATTERMOST_BOT_TOKEN=...`
- `MATTERMOST_URL=https://chat.example.com`

Les variables d'environnement s'appliquent uniquement au compte **par défaut** (`default`). Les autres comptes doivent utiliser les valeurs de configuration.

## Modes de discussion

Mattermost répond automatiquement aux DMs. Le comportement des salons est contrôlé par `chatmode` :

- `oncall` (par défaut) : répondre uniquement lors d'une mention (@mention) dans les salons.
- `onmessage` : répondre à chaque message de salon.
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

Remarques :

- `onchar` répond toujours aux mentions (@mentions) explicites.
- `channels.mattermost.requireMention` est respecté pour les configurations héritées, mais `chatmode` est préféré.

## Fils de discussion et sessions

Utilisez `channels.mattermost.replyToMode` pour contrôler si les réponses de salon et de groupe restent dans le
salon principal ou démarrent un fil sous le message déclencheur.

- `off` (par défaut) : répondre dans un fil uniquement lorsque le message entrant en fait déjà partie.
- `first` : pour les messages de niveau supérieur dans les salons/groupes, démarrer un fil sous ce message et acheminer la
  conversation vers une session étendue au fil.
- `all` : même comportement que `first` pour Mattermost aujourd'hui.
- Les messages directs ignorent ce paramètre et restent non-threadés (sans fil).

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

- Les sessions délimitées par fil utilisent l'ID du message déclencheur comme racine du fil.
- `first` et `all` sont actuellement équivalents car une fois que Mattermost a une racine de fil,
  les blocs de suivi et les médias continuent dans ce même fil.

## Contrôle d'accès (DMs)

- Par défaut : `channels.mattermost.dmPolicy = "pairing"` (les expéditeurs inconnus reçoivent un code d'appariement).
- Approuver via :
  - `openclaw pairing list mattermost`
  - `openclaw pairing approve mattermost <CODE>`
- DMs publics : `channels.mattermost.dmPolicy="open"` plus `channels.mattermost.allowFrom=["*"]`.

## Canaux (groupes)

- Par défaut : `channels.mattermost.groupPolicy = "allowlist"` (accès restreint par mention).
- Autoriser les expéditeurs avec `channels.mattermost.groupAllowFrom` (IDs utilisateur recommandés).
- Les remplacements de mention par canal se trouvent sous `channels.mattermost.groups.<channelId>.requireMention`
  ou `channels.mattermost.groups["*"].requireMention` pour une valeur par défaut.
- La correspondance `@username` est modifiable et activée uniquement lorsque `channels.mattermost.dangerouslyAllowNameMatching: true`.
- Canaux ouverts : `channels.mattermost.groupPolicy="open"` (accès restreint par mention).
- Note d'exécution : si `channels.mattermost` est complètement manquant, l'exécution revient à `groupPolicy="allowlist"` pour les vérifications de groupe (même si `channels.defaults.groupPolicy` est défini).

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

- `channel:<id>` pour un canal
- `user:<id>` pour un DM
- `@username` pour un DM (résolu via l'Mattermost API)

Les ID opaques bruts (comme `64ifufp...`) sont **ambigus** dans Mattermost (ID utilisateur vs ID canal).

OpenClaw les résout en **priorité utilisateur** :

- Si l'ID existe en tant qu'utilisateur (`GET /api/v4/users/<id>` réussit), OpenClaw envoie un **DM** en résolvant le canal direct via `/api/v4/channels/direct`.
- Sinon, l'ID est traité comme un **ID de canal**.

Si vous avez besoin d'un comportement déterministe, utilisez toujours les préfixes explicites (`user:<id>` / `channel:<id>`).

## Nouvelle tentative de canal DM

Lorsque OpenClaw envoie à une cible DM Mattermost et doit résoudre d'abord le canal direct, il
réessaie par défaut les échecs temporaires de création de canal direct.

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

- Cela s'applique uniquement à la création de canal DM (`/api/v4/channels/direct`), et non à chaque appel Mattermost API.
- Les nouvelles tentatives s'appliquent aux échecs transitoires tels que les limites de taux, les réponses 5xx, et les erreurs réseau ou d'expiration.
- Les erreurs client 4xx autres que `429` sont considérées comme permanentes et ne font pas l'objet d'une nouvelle tentative.

## Réactions (outil de message)

- Utilisez `message action=react` avec `channel=mattermost`.
- `messageId` est l'identifiant du billet Mattermost.
- `emoji` accepte les noms comme `thumbsup` ou `:+1:` (les deux-points sont facultatifs).
- Définissez `remove=true` (booléen) pour supprimer une réaction.
- Les événements d'ajout/suppression de réactions sont transmis en tant qu'événements système à la session de l'agent acheminé.

Exemples :

```
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup
message action=react channel=mattermost target=channel:<channelId> messageId=<postId> emoji=thumbsup remove=true
```

Config :

- `channels.mattermost.actions.reactions` : activer/désactiver les actions de réaction (vrai par défaut).
- Remplacement par compte : `channels.mattermost.accounts.<id>.actions.reactions`.

## Boutons interactifs (outil de message)

Envoyez des messages avec des boutons cliquables. Lorsqu'un utilisateur clique sur un bouton, l'agent reçoit la sélection et peut répondre.

Activez les boutons en ajoutant `inlineButtons` aux fonctionnalités du canal :

```json5
{
  channels: {
    mattermost: {
      capabilities: ["inlineButtons"],
    },
  },
}
```

Utilisez `message action=send` avec un paramètre `buttons`. Les boutons sont un tableau 2D (lignes de boutons) :

```
message action=send channel=mattermost target=channel:<channelId> buttons=[[{"text":"Yes","callback_data":"yes"},{"text":"No","callback_data":"no"}]]
```

Champs du bouton :

- `text` (requis) : étiquette d'affichage.
- `callback_data` (requis) : valeur renvoyée lors du clic (utilisée comme identifiant d'action).
- `style` (facultatif) : `"default"`, `"primary"` ou `"danger"`.

Lorsqu'un utilisateur clique sur un bouton :

1. Tous les boutons sont remplacés par une ligne de confirmation (par exemple, "✓ **Yes** sélectionné par @user").
2. L'agent reçoit la sélection sous forme de message entrant et répond.

Notes :

- Les rappels de boutons utilisent la vérification HMAC-SHA256 (automatique, aucune configuration requise).
- Mattermost supprime les données de rappel de ses réponses API (fonctionnalité de sécurité), donc tous les boutons sont supprimés lors du clic — une suppression partielle n'est pas possible.
- Les ID d'action contenant des tirets ou des traits de soulignement sont nettoyés automatiquement
  (limitation du routage Mattermost).

Config :

- `channels.mattermost.capabilities` : tableau de chaînes de capacités. Ajoutez `"inlineButtons"` pour
  activer la description de l'outil de boutons dans le prompt système de l'agent.
- `channels.mattermost.interactions.callbackBaseUrl` : URL de base externe facultative pour les
  rappels de boutons (par exemple `https://gateway.example.com`). Utilisez ceci lorsque Mattermost ne peut
  pas atteindre la passerelle directement à son hôte de liaison.
- Dans les configurations multi-comptes, vous pouvez également définir le même champ sous
  `channels.mattermost.accounts.<id>.interactions.callbackBaseUrl`.
- Si `interactions.callbackBaseUrl` est omis, OpenClaw dérive l'URL de rappel de
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

1. Les pièces jointes vont dans `props.attachments`, pas `attachments` de premier niveau (ignoré silencieusement).
2. Chaque action a besoin de `type: "button"` — sans cela, les clics sont absorbés silencieusement.
3. Chaque action a besoin d'un champ `id` — Mattermost ignore les actions sans ID.
4. L'`id` de l'action doit être **uniquement alphanumérique** (`[a-zA-Z0-9]`). Les tirets et les traits de soulignement brisent
   le routage des actions côté serveur de Mattermost (retourne 404). Supprimez-les avant utilisation.
5. `context.action_id` doit correspondre à l'`id` du bouton afin que le message de confirmation affiche le
   nom du bouton (par exemple, « Approuver ») au lieu d'un ID brut.
6. `context.action_id` est requis — le gestionnaire d'interaction renvoie 400 sans cela.

**Génération du jeton HMAC :**

La passerelle vérifie les clics sur les boutons avec HMAC-SHA256. Les scripts externes doivent générer des jetons
qui correspondent à la logique de vérification de la passerelle :

1. Dériver le secret du jeton du bot :
   `HMAC-SHA256(key="openclaw-mattermost-interactions", data=botToken)`
2. Construire l'objet de contexte avec tous les champs **sauf** `_token`.
3. Sérialiser avec des **clés triées** et **sans espaces** (la passerelle utilise `JSON.stringify`
   avec des clés triées, ce qui produit une sortie compacte).
4. Signer : `HMAC-SHA256(key=secret, data=serializedContext)`
5. Ajouter l'empreinte hexadécimale résultante en tant que `_token` dans le contexte.

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

Pièges courants HMAC :

- Le `json.dumps` de Python ajoute des espaces par défaut (`{"key": "val"}`). Utilisez
  `separators=(",", ":")` pour correspondre à la sortie compacte de JavaScript (`{"key":"val"}`).
- Signez toujours **tous** les champs de contexte (moins `_token`). La passerelle supprime `_token` puis
  signe tout ce qui reste. Signer un sous-ensemble provoque un échec silencieux de la vérification.
- Utilisez `sort_keys=True` — la passerelle trie les clés avant de signer, et Mattermost peut
  réordonner les champs de contexte lors du stockage de la charge utile.
- Dérivez le secret du jeton du bot (déterministe), et non d'octets aléatoires. Le secret
  doit être identique entre le processus qui crée les boutons et la passerelle qui vérifie.

## Adaptateur d'annuaire

Le plugin Mattermost inclut un adaptateur d'annuaire qui résout les noms de channel et d'utilisateur
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

- Pas de réponses dans les channels : assurez-vous que le bot est dans le channel et mentionnez-le (oncall), utilisez un préfixe de déclencheur (onchar), ou définissez `chatmode: "onmessage"`.
- Erreurs d'authentification : vérifiez le jeton du bot, l'URL de base, et si le compte est activé.
- Problèmes multi-comptes : les env vars ne s'appliquent qu'au compte `default`.
- Les commandes slash natives renvoient `Unauthorized: invalid command token.` : OpenClaw
  n'a pas accepté le jeton de rappel. Causes typiques :
  - l'enregistrement de la commande slash a échoué ou n'a été que partiellement terminé au démarrage
  - le rappel atteint la mauvaise passerelle/le mauvais compte
  - Mattermost possède encore d'anciennes commandes pointant vers une cible de rappel précédente
  - la passerelle a redémarré sans réactiver les commandes slash
- Si les commandes slash natives cessent de fonctionner, vérifiez les journaux pour
  `mattermost: failed to register slash commands` ou
  `mattermost: native slash commands enabled but no commands could be registered`.
- Si `callbackUrl` est omis et que les journaux avertissent que le rappel a résolu vers
  `http://127.0.0.1:18789/...`, cette URL n'est probablement accessible que lorsque
  Mattermost s'exécute sur le même hôte/le même espace de noms réseau que OpenClaw. Définissez plutôt
  un `commands.callbackUrl` explicitement accessible de l'extérieur.
- Les boutons apparaissent comme des cases blanches : l'agent peut envoyer des données de bouton malformées. Vérifiez que chaque bouton possède les champs `text` et `callback_data`.
- Les boutons s'affichent mais les clics ne font rien : vérifiez que `AllowedUntrustedInternalConnections` dans la configuration du serveur Mattermost inclut `127.0.0.1 localhost` et que `EnablePostActionIntegration` est `true` dans ServiceSettings.
- Les boutons renvoient 404 lors du clic : le `id` du bouton contient probablement des traits d'union ou des tirets du bas. Le routeur d'action de Mattermost ne fonctionne pas avec les ID non alphanumériques. Utilisez uniquement `[a-zA-Z0-9]`.
- Les journaux de Gateway indiquent `invalid _token` : inadéquation HMAC. Vérifiez que vous signez tous les champs de contexte (pas un sous-ensemble), utilisez des clés triées et du JSON compact (sans espaces). Voir la section HMAC ci-dessus.
- Les journaux de Gateway indiquent `missing _token in context` : le champ `_token` n'est pas dans le contexte du bouton. Assurez-vous qu'il est inclus lors de la construction de la charge utile d'intégration.
- La confirmation affiche l'ID brut au lieu du nom du bouton : `context.action_id` ne correspond pas au `id` du bouton. Définissez les deux avec la même valeur nettoyée.
- L'agent ne connaît pas les boutons : ajoutez `capabilities: ["inlineButtons"]` à la configuration du canal Mattermost.

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appairage](/en/channels/pairing) — flux d'authentification et d'appairage par DM
- [Groupes](/en/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Routage des canaux](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
