---
summary: "État de la prise en charge de Matrix, configuration et exemples"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix est un plugin de canal inclus pour OpenClaw.
Il utilise le `matrix-js-sdk` officiel et prend en charge les DMs, les salons, les fils de discussion, les médias, les réactions, les sondages, la localisation et l'E2EE.

## Plugin fourni

Matrix est fourni en tant que plugin intégré dans les versions actuelles d'OpenClaw, les versions
packagées standard n'ont donc pas besoin d'une installation séparée.

Si vous utilisez une ancienne version ou une installation personnalisée qui exclut Matrix, installez-le
manuellement :

Installer depuis npm :

```bash
openclaw plugins install @openclaw/matrix
```

Installer depuis un checkout local :

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

Consultez la page [Plugins](/fr/tools/plugin) pour le comportement des plugins et les règles d'installation.

## Configuration

1. Assurez-vous que le plugin Matrix est disponible.
   - Les versions packagées actuelles d'OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Créez un compte Matrix sur votre serveur d'accueil (homeserver).
3. Configurez `channels.matrix` avec l'une des options suivantes :
   - `homeserver` + `accessToken`, ou
   - `homeserver` + `userId` + `password`.
4. Redémarrez la passerelle.
5. Démarrez un DM avec le bot ou invitez-le dans un salon.
   - Les nouvelles invitations Matrix ne fonctionnent que lorsque `channels.matrix.autoJoin` les autorise.

Chemins de configuration interactive :

```bash
openclaw channels add
openclaw configure --section channels
```

L'assistant Matrix demande :

- URL du serveur d'accueil
- méthode d'authentification : jeton d'accès ou mot de passe
- ID utilisateur (authentification par mot de passe uniquement)
- nom d'appareil facultatif
- s'il faut activer l'E2EE
- s'il faut configurer l'accès aux salons et rejoindre automatiquement les invitations

Comportements clés de l'assistant :

- Si les variables d'environnement d'authentification Matrix existent déjà et que ce compte n'a pas déjà d'authentification sauvegardée dans la configuration, l'assistant propose un raccourci d'environnement pour conserver l'authentification dans les variables d'environnement.
- Les noms de compte sont normalisés vers l'ID de compte. Par exemple, `Ops Bot` devient `ops-bot`.
- Les entrées de la liste d'autorisation DM acceptent `@user:server` directement ; les noms d'affichage ne fonctionnent que si la recherche en direct dans l'annuaire trouve une correspondance exacte.
- Les entrées de la liste d'autorisation de salon acceptent directement les ID de salon et les alias. Privilégiez `!room:server` ou `#alias:server` ; les noms non résolus sont ignorés lors de l'exécution par la résolution de la liste d'autorisation.
- En mode de liste d'autorisation de jointure automatique par invitation, n'utilisez que des cibles d'invitation stables : `!roomId:server`, `#alias:server` ou `*`. Les noms simples de salon sont rejetés.
- Pour résoudre les noms de salon avant de sauvegarder, utilisez `openclaw channels resolve --channel matrix "Project Room"`.

<Warning>
`channels.matrix.autoJoin` est `off` par défaut.

Si vous le laissez non défini, le bot ne rejoindra pas les salons invités ou les nouvelles invitations de style DM, il n'apparaîtra donc pas dans les nouveaux groupes ou les DM invités à moins que vous ne le rejoigniez manuellement d'abord.

Définissez `autoJoin: "allowlist"` avec `autoJoinAllowlist` pour restreindre les invitations qu'il accepte, ou définissez `autoJoin: "always"` si vous souhaitez qu'il rejoigne chaque invitation.

En mode `allowlist`, `autoJoinAllowlist` n'accepte que `!roomId:server`, `#alias:server` ou `*`.

</Warning>

Exemple de liste d'autorisation :

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

Rejoindre chaque invitation :

```json5
{
  channels: {
    matrix: {
      autoJoin: "always",
    },
  },
}
```

Configuration minimale basée sur un jeton :

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      dm: { policy: "pairing" },
    },
  },
}
```

Configuration basée sur un mot de passe (le jeton est mis en cache après la connexion) :

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      userId: "@bot:example.org",
      password: "replace-me", // pragma: allowlist secret
      deviceName: "OpenClaw Gateway",
    },
  },
}
```

Matrix stocke les informations d'identification mises en cache dans `~/.openclaw/credentials/matrix/`.
Le compte par défaut utilise `credentials.json` ; les comptes nommés utilisent `credentials-<account>.json`.
Lorsque des informations d'identification mises en cache existent à cet endroit, OpenClaw considère Matrix comme configuré pour la configuration, le diagnostic et la découverte de l'état du channel, même si l'authentification actuelle n'est pas définie directement dans la configuration.

Équivalents de variables d'environnement (utilisés lorsque la clé de configuration n'est pas définie) :

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

Pour les comptes non par défaut, utilisez les env vars avec portée de compte :

- `MATRIX_<ACCOUNT_ID>_HOMESERVER`
- `MATRIX_<ACCOUNT_ID>_ACCESS_TOKEN`
- `MATRIX_<ACCOUNT_ID>_USER_ID`
- `MATRIX_<ACCOUNT_ID>_PASSWORD`
- `MATRIX_<ACCOUNT_ID>_DEVICE_ID`
- `MATRIX_<ACCOUNT_ID>_DEVICE_NAME`

Exemple pour le compte `ops` :

- `MATRIX_OPS_HOMESERVER`
- `MATRIX_OPS_ACCESS_TOKEN`

Pour l'ID de compte normalisé `ops-bot`, utilisez :

- `MATRIX_OPS_X2D_BOT_HOMESERVER`
- `MATRIX_OPS_X2D_BOT_ACCESS_TOKEN`

Matrix échappe la ponctuation dans les ID de compte pour éviter les collisions entre les env vars avec portée.
Par exemple, `-` devient `_X2D_`, donc `ops-prod` correspond à `MATRIX_OPS_X2D_PROD_*`.

L'assistant interactif ne propose le raccourci env-var que lorsque ces env vars d'auth sont déjà présents et que le compte sélectionné n'a pas déjà l'auth Matrix enregistrée dans la configuration.

## Exemple de configuration

Voici une configuration de base pratique avec l'appariement DM, la liste d'autorisation des salles et l'E2EE activé :

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,

      dm: {
        policy: "pairing",
        sessionScope: "per-room",
        threadReplies: "off",
      },

      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },

      autoJoin: "allowlist",
      autoJoinAllowlist: ["!roomid:example.org"],
      threadReplies: "inbound",
      replyToMode: "off",
      streaming: "partial",
    },
  },
}
```

`autoJoin` s'applique à toutes les invitations Matrix, y compris les invitations de style DM. OpenClaw ne peut pas classer de manière fiable
une salle invitée comme DM ou groupe au moment de l'invitation, donc toutes les invitations passent d'abord par `autoJoin`.
`dm.policy` s'applique une fois que le bot a rejoint et que la salle est classée comme DM.

## Aperçus en continu

Le streaming de réponse Matrix est optionnel.

Définissez `channels.matrix.streaming` sur `"partial"` lorsque vous souhaitez qu'OpenClaw envoie une seule réponse de prévisualisation en direct, modifie cette prévisualisation sur place pendant que le modèle génère le texte, puis la finalise lorsque la réponse est terminée :

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` est la valeur par défaut. OpenClaw attend la réponse finale et l'envoie une fois.
- `streaming: "partial"` crée un message de prévisualisation modifiable pour le bloc d'assistant actuel en utilisant les messages texte normaux de Matrix. Cela préserve le comportement de notification hérité de prévisualisation en priorité de Matrix, les clients standard peuvent donc notifier lors du premier texte de prévisualisation diffusé au lieu du bloc terminé.
- `streaming: "quiet"` crée un avis de prévisualisation silencieux modifiable pour le bloc d'assistant actuel. N'utilisez ceci que si vous configurez également des règles de push de destinataire pour les modifications de prévisualisation finalisées.
- `blockStreaming: true` active des messages de progression distincts pour Matrix. Avec la diffusion de prévisualisation activée, Matrix conserve le brouillon en direct pour le bloc actuel et préserve les blocs terminés comme des messages distincts.
- Lorsque la diffusion de prévisualisation est activée et que `blockStreaming` est désactivé, Matrix modifie le brouillon en direct sur place et finalise le même événement lorsque le bloc ou le tour se termine.
- Si la prévisualisation ne tient plus dans un seul événement Matrix, OpenClaw arrête la diffusion de prévisualisation et revient à la livraison finale normale.
- Les réponses multimédias envoient toujours les pièces jointes normalement. Si une prévisualisation obsolète ne peut plus être réutilisée en toute sécurité, OpenClaw la rédige avant d'envoyer la réponse multimédia finale.
- Les modifications de prévisualisation coûtent des appels d'Matrix API supplémentaires. Désactivez la diffusion si vous souhaitez le comportement de limitation de taux le plus conservateur.

`blockStreaming` n'active pas les prévisualisations de brouillon par lui-même.
Utilisez `streaming: "partial"` ou `streaming: "quiet"` pour les modifications de prévisualisation ; puis ajoutez `blockStreaming: true` uniquement si vous souhaitez également que les blocs d'assistant terminés restent visibles comme des messages de progression distincts.

Si vous avez besoin des notifications standard de Matrix sans règles de push personnalisées, utilisez `streaming: "partial"` pour le comportement de prévisualisation en priorité ou laissez `streaming` désactivé pour une livraison finale uniquement. Avec `streaming: "off"` :

- `blockStreaming: true` envoie chaque bloc terminé comme un message Matrix de notification normal.
- `blockStreaming: false` n'envoie que la réponse finale complète sous la forme d'un message de notification Matrix normal.

### Règles de push auto-hébergées pour les aperçus en mode silencieux finalisés

Si vous gérez votre propre infrastructure Matrix et que vous souhaitez que les aperçus en mode silencieux ne notifient que lorsqu'un bloc ou la réponse finale est terminé, définissez `streaming: "quiet"` et ajoutez une règle de push par utilisateur pour les modifications d'aperçu finalisées.

Il s'agit généralement d'une configuration au niveau de l'utilisateur destinataire, et non d'une modification globale de la configuration du serveur domestique :

Plan rapide avant de commencer :

- utilisateur destinataire = la personne qui doit recevoir la notification
- utilisateur bot = le compte OpenClaw Matrix qui envoie la réponse
- utilisez le jeton d'accès de l'utilisateur destinataire pour les appels à l'API ci-dessous
- faites correspondre `sender` dans la règle de push avec le MXID complet de l'utilisateur bot

1. Configurez OpenClaw pour utiliser les aperçus en mode silencieux :

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. Assurez-vous que le compte destinataire reçoit déjà les notifications push normales Matrix. Les règles d'aperçu en mode silencieux ne fonctionnent que si cet utilisateur dispose déjà de pushers/appareils fonctionnels.

3. Obtenez le jeton d'accès de l'utilisateur destinataire.
   - Utilisez le jeton de l'utilisateur receveur, pas celui du bot.
   - La réutilisation d'un jeton de session client existant est généralement la plus simple.
   - Si vous devez créer un nouveau jeton, vous pouvez vous connecter via l'API standard Client-Server Matrix API :

```bash
curl -sS -X POST \
  "https://matrix.example.org/_matrix/client/v3/login" \
  -H "Content-Type: application/json" \
  --data '{
    "type": "m.login.password",
    "identifier": {
      "type": "m.id.user",
      "user": "@alice:example.org"
    },
    "password": "REDACTED"
  }'
```

4. Vérifiez que le compte destinataire possède déjà des pushers :

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

Si cela ne renvoie aucun pusher/appareil actif, corrigez d'abord les notifications normales Matrix avant d'ajouter la règle OpenClaw ci-dessous.

OpenClaw marque les modifications d'aperçu finalisées texte uniquement par :

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. Créez une règle de push de substitution pour chaque compte destinataire qui doit recevoir ces notifications :

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

Remplacez ces valeurs avant d'exécuter la commande :

- `https://matrix.example.org` : l'URL de base de votre serveur domestique
- `$USER_ACCESS_TOKEN` : le jeton d'accès de l'utilisateur receveur
- `openclaw-finalized-preview-botname` : un ID de règle unique à ce bot pour cet utilisateur receveur
- `@bot:example.org` : votre MXID de bot OpenClaw Matrix, et non le MXID de l'utilisateur receveur

Important pour les configurations multi-bots :

- Les règles de push sont indexées par `ruleId`. La réexécution de `PUT` avec le même ID de règle met à jour cette règle.
- Si un utilisateur receveur doit notifier pour plusieurs comptes de bot OpenClaw Matrix, créez une règle par bot avec un ID de règle unique pour chaque correspondance d'expéditeur.
- Un modèle simple est `openclaw-finalized-preview-<botname>`, tel que `openclaw-finalized-preview-ops` ou `openclaw-finalized-preview-support`.

La règle est évaluée par rapport à l'expéditeur de l'événement :

- s'authentifier avec le jeton de l'utilisateur récepteur
- faire correspondre `sender` avec le MXID du bot OpenClaw

6. Vérifiez que la règle existe :

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. Testez une réponse diffusée (streamed). En mode silencieux, la salle doit afficher un aperçu de brouillon silencieux et l'édition
   finale sur place doit notifier une fois le bloc ou le tour terminé.

Si vous devez supprimer la règle ultérieurement, supprimez cet identifiant de règle avec le jeton de l'utilisateur récepteur :

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

Notes :

- Créez la règle avec le jeton d'accès de l'utilisateur récepteur, et non celui du bot.
- Les nouvelles règles `override` définies par l'utilisateur sont insérées avant les règles de suppression par défaut, aucun paramètre d'ordonnancement supplémentaire n'est donc nécessaire.
- Cela n'affecte que les modifications d'aperçu texte uniquement que OpenClaw peut finaliser en toute sécurité sur place. Les solutions de repli pour les médias et les aperçus obsolètes utilisent toujours la livraison normale Matrix.
- Si `GET /_matrix/client/v3/pushers` n'affiche aucun émetteur (pusher), l'utilisateur ne dispose pas encore d'une livraison de push Matrix fonctionnelle pour ce compte/appareil.

#### Synapse

Pour Synapse, la configuration ci-dessus suffit généralement à elle seule :

- Aucune modification spéciale de `homeserver.yaml` n'est requise pour les notifications d'aperçu finalisées OpenClaw.
- Si votre déploiement Synapse envoie déjà des notifications push normales Matrix, le jeton utilisateur + l'appel `pushrules` ci-dessus constituent la principale étape de configuration.
- Si vous exécutez Synapse derrière un proxy inverse ou des workers, assurez-vous que `/_matrix/client/.../pushrules/` atteint bien Synapse.
- Si vous utilisez des workers Synapse, assurez-vous que les émetteurs (pushers) sont en bonne santé. La livraison des push est gérée par le processus principal ou `synapse.app.pusher` / les workers émetteurs configurés.

#### Tuwunel

Pour Tuwunel, utilisez le même flux de configuration et le même appel à l'API de règle de push API présentés ci-dessus :

- Aucune configuration spécifique à Tuwunel n'est requise pour le marqueur d'aperçu finalisé lui-même.
- Si les notifications normales Matrix fonctionnent déjà pour cet utilisateur, le jeton utilisateur + l'appel `pushrules` ci-dessus constituent la principale étape de configuration.
- Si les notifications semblent disparaître alors que l'utilisateur est actif sur un autre appareil, vérifiez si `suppress_push_when_active` est activé. Tuwunel a ajouté cette option dans Tuwunel 1.4.2 le 12 septembre 2025, et elle peut intentionnellement supprimer les envois vers d'autres appareils lorsqu'un appareil est actif.

## Salons bot-à-bot

Par défaut, les messages Matrix provenant d'autres comptes OpenClaw Matrix configurés sont ignorés.

Utilisez `allowBots` lorsque vous souhaitez intentionnellement du trafic Matrix inter-agent :

```json5
{
  channels: {
    matrix: {
      allowBots: "mentions", // true | "mentions"
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

- `allowBots: true` accepte les messages d'autres comptes bot Matrix configurés dans les salons et DMs autorisés.
- `allowBots: "mentions"` accepte ces messages uniquement lorsqu'ils mentionnent visiblement ce bot dans les salons. Les DMs sont toujours autorisés.
- `groups.<room>.allowBots` remplace le paramètre au niveau du compte pour un salon.
- OpenClaw ignore toujours les messages provenant du même identifiant utilisateur Matrix pour éviter les boucles de réponse automatique.
- Matrix n'expose pas ici d'indicateur de bot natif ; OpenClaw traite « créé par un bot » comme « envoyé par un autre compte Matrix configuré sur cette passerelle OpenClaw ».

Utilisez des listes d'autorisation de salons strictes et des exigences de mention lors de l'activation du trafic bot-à-bot dans les salons partagés.

## Chiffrement et vérification

Dans les salons chiffrés (E2EE), les événements d'image sortants utilisent `thumbnail_file` afin que les aperçus d'images soient chiffrés avec la pièce jointe complète. Les salons non chiffrés utilisent toujours `thumbnail_url` en clair. Aucune configuration n'est nécessaire — le plugin détecte automatiquement l'état E2EE.

Activer le chiffrement :

```json5
{
  channels: {
    matrix: {
      enabled: true,
      homeserver: "https://matrix.example.org",
      accessToken: "syt_xxx",
      encryption: true,
      dm: { policy: "pairing" },
    },
  },
}
```

Vérifier l'état de vérification :

```bash
openclaw matrix verify status
```

État détaillé (diagnostics complets) :

```bash
openclaw matrix verify status --verbose
```

Inclure la clé de récupération stockée dans la sortie lisible par machine :

```bash
openclaw matrix verify status --include-recovery-key --json
```

Initialiser l'état de signature croisée et de vérification :

```bash
openclaw matrix verify bootstrap
```

Diagnostics d'initialisation détaillés :

```bash
openclaw matrix verify bootstrap --verbose
```

Forcer une réinitialisation de l'identité de signature croisée avant l'initialisation :

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

Vérifier cet appareil avec une clé de récupération :

```bash
openclaw matrix verify device "<your-recovery-key>"
```

Détails de vérification de l'appareil détaillés :

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

Vérifier l'état de santé de la sauvegarde des clés de salon :

```bash
openclaw matrix verify backup status
```

Diagnostics de santé de la sauvegarde détaillés :

```bash
openclaw matrix verify backup status --verbose
```

Restaurer les clés de salon depuis la sauvegarde du serveur :

```bash
openclaw matrix verify backup restore
```

Diagnostics de restauration détaillés :

```bash
openclaw matrix verify backup restore --verbose
```

Supprimer la sauvegarde actuelle du serveur et créer une nouvelle base de sauvegarde. Si la clé de
sauvegarde stockée ne peut pas être chargée proprement, cette réinitialisation peut également recréer le stockage
secret afin que les futurs démarrages à froid puissent charger la nouvelle clé de sauvegarde :

```bash
openclaw matrix verify backup reset --yes
```

Toutes les commandes `verify` sont concises par défaut (y compris la journalisation interne silencieuse du SDK) et n'affichent des diagnostics détaillés qu'avec `--verbose`.
Utilisez `--json` pour une sortie complète lisible par machine lors de l'écriture de scripts.

Dans les configurations multi-comptes, les commandes Matrix CLI utilisent le compte Matrix par défaut implicite, sauf si vous passez `--account <id>`.
Si vous configurez plusieurs comptes nommés, définissez `channels.matrix.defaultAccount` d'abord, sinon ces opérations CLI implicites s'arrêteront et vous demanderont de choisir explicitement un compte.
Utilisez `--account` chaque fois que vous voulez que les opérations de vérification ou d'appareil ciblent explicitement un compte nommé :

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

Lorsque le chiffrement est désactivé ou indisponible pour un compte nommé, les avertissements Matrix et les erreurs de vérification pointent vers la clé de configuration de ce compte, par exemple `channels.matrix.accounts.assistant.encryption`.

### Signification de « vérifié »

OpenClaw considère cet appareil Matrix comme vérifié uniquement lorsqu'il est vérifié par votre propre identité de signature croisée.
En pratique, `openclaw matrix verify status --verbose` expose trois signaux de confiance :

- `Locally trusted` : cet appareil est approuvé par le client actuel uniquement
- `Cross-signing verified` : le SDK signale l'appareil comme vérifié via la signature croisée
- `Signed by owner` : l'appareil est signé par votre propre clé d'auto-signature

`Verified by owner` ne devient `yes` que lorsqu'une vérification par signature croisée ou une signature de propriétaire est présente.
La confiance locale seule ne suffit pas pour que OpenClaw considère l'appareil comme entièrement vérifié.

### Ce que fait bootstrap

`openclaw matrix verify bootstrap` est la commande de réparation et de configuration pour les comptes Matrix chiffrés.
Elle effectue toutes les opérations suivantes dans l'ordre :

- initialise le stockage des secrets, en réutilisant une clé de récupération existante si possible
- initialise la signature croisée et téléverse les clés publiques de signature croisée manquantes
- tente de marquer et de signer croisé l'appareil actuel
- crée une nouvelle sauvegarde des clés de salle côté serveur si elle n'existe pas déjà

Si le serveur d'accès (homeserver) nécessite une authentification interactive pour téléverser les clés de signature croisée, OpenClaw essaie d'abord le téléversement sans authentification, puis avec `m.login.dummy`, puis avec `m.login.password` lorsque `channels.matrix.password` est configuré.

Utilisez `--force-reset-cross-signing` uniquement lorsque vous souhaitez intentionnellement abandonner l'identité de signature croisée actuelle et en créer une nouvelle.

Si vous souhaitez intentionnellement abandonner la sauvegarde des clés de salle actuelle et commencer une nouvelle
ligne de base de sauvegarde pour les futurs messages, utilisez `openclaw matrix verify backup reset --yes`.
Ne faites cela que si vous acceptez que l'ancien historique crypté irrécupérable restera
indisponible et que OpenClaw peut recréer le stockage de secrets si le secret de sauvegarde
courant ne peut pas être chargé en toute sécurité.

### Nouvelle ligne de base de sauvegarde

Si vous souhaitez que les futurs messages cryptés continuent de fonctionner et acceptez de perdre l'ancien historique irrécupérable, exécutez ces commandes dans l'ordre :

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Ajoutez `--account <id>` à chaque commande lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

### Comportement au démarrage

Lorsque `encryption: true`, Matrix définit `startupVerification` par défaut sur `"if-unverified"`.
Au démarrage, si cet appareil n'est toujours pas vérifié, Matrix demandera une auto-vérification dans un autre client Matrix,
sautera les demandes en double tant qu'une est déjà en attente, et appliquera un temps d'attente local avant de réessayer après les redémarrages.
Les tentatives de demande échouées réessayent plus rapidement que la création de demande réussie par défaut.
Définissez `startupVerification: "off"` pour désactiver les demandes automatiques au démarrage, ou ajustez `startupVerificationCooldownHours`
si vous souhaitez une fenêtre de réessai plus courte ou plus longue.

Le démarrage effectue également automatiquement une passe conservatrice d'amorçage cryptographique.
Cette passe essaie d'abord de réutiliser le stockage de secrets actuel et l'identité de signature croisée, et évite de réinitialiser la signature croisée à moins que vous n'exécutiez un flux de réparation d'amorçage explicite.

Si le démarrage détecte toujours un état d'amorçage défaillant, OpenClaw peut tenter une voie de réparation protégée même lorsque `channels.matrix.password` n'est pas configuré.
Si le serveur d'accueil nécessite une IUA basée sur un mot de passe pour cette réparation, OpenClaw enregistre un avertissement et rend le démarrage non fatal au lieu d'interrompre le bot.
Si l'appareil actuel est déjà signé par le propriétaire, OpenClaw préserve cette identité au lieu de la réinitialiser automatiquement.

Consultez la page [Migration Matrix](/fr/install/migrating-matrix) pour le processus complet de mise à niveau, les limites, les commandes de récupération et les messages de migration courants.

### Notifications de vérification

Matrix publie les notifications du cycle de vie de la vérification directement dans la salle de vérification DM stricte sous forme de messages `m.notice`.
Cela comprend :

- les notifications de demande de vérification
- les notifications de vérification prête (avec les instructions explicites « Vérifier par emoji »)
- notifications de début et de fin de vérification
- détails SAS (émojis et décimales) lorsqu'ils sont disponibles

Les demandes de vérification entrantes d'un autre client Matrix sont suivies et automatiquement acceptées par OpenClaw.
Pour les flux d'auto-vérification, OpenClaw lance également automatiquement le flux SAS lorsque la vérification par émojis devient disponible et confirme son propre côté.
Pour les demandes de vérification d'un autre utilisateur/appareil Matrix, OpenClaw accepte automatiquement la demande, puis attend que le flux SAS se déroule normalement.
Vous devez toujours comparer les émojis ou les décimales SAS dans votre client Matrix et confirmer « Ils correspondent » ici pour terminer la vérification.

OpenClaw n'accepte pas aveuglément les flux en double auto-initiés. Au démarrage, la création d'une nouvelle demande est ignorée si une demande d'auto-vérification est déjà en attente.

Les notifications de protocole/système de vérification ne sont pas transmises au pipeline de discussion de l'agent, elles ne produisent donc pas `NO_REPLY`.

### Hygiène des appareils

Les anciens appareils OpenClaw gérés par Matrix peuvent s'accumuler sur le compte et rendre plus difficile la compréhension de la confiance dans les salons chiffrés.
Listez-les avec :

```bash
openclaw matrix devices list
```

Supprimez les appareils obsolètes gérés par OpenClaw avec :

```bash
openclaw matrix devices prune-stale
```

### Stockage crypto

Le chiffrement de bout en bout Matrix utilise le chemin de chiffrement Rust officiel `matrix-js-sdk` dans Node, avec `fake-indexeddb` comme shim IndexedDB. L'état de chiffrement est persisté dans un fichier d'instantané (`crypto-idb-snapshot.json`) et restauré au démarrage. Le fichier d'instantané est un état d'exécution sensible stocké avec des permissions de fichiers restrictives.

L'état d'exécution chiffré réside sous des racines par compte et par hachage de jeton d'utilisateur dans
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ce répertoire contient le magasin de synchronisation (`bot-storage.json`), le magasin crypto (`crypto/`),
le fichier de clé de récupération (`recovery-key.json`), l'instantané IndexedDB (`crypto-idb-snapshot.json`),
les liaisons de fils de discussion (`thread-bindings.json`) et l'état de vérification au démarrage (`startup-verification.json`).
Lorsque le jeton change mais que l'identité du compte reste la même, OpenClaw réutilise la meilleure racine
existante pour ce tuple compte/serveur d'accueil/utilisateur afin que les états de synchronisation précédents, les états crypto, les liaisons de fils de discussion
et l'état de vérification au démarrage restent visibles.

## Gestion du profil

Mettez à jour le profil personnel Matrix pour le compte sélectionné avec :

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Ajoutez `--account <id>` lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

Matrix accepte directement les URLs d'avatar `mxc://`. Lorsque vous transmettez une URL d'avatar `http://` ou `https://`, OpenClaw la télécharge d'abord sur Matrix et stocke l'URL `mxc://` résolue dans `channels.matrix.avatarUrl` (ou le remplacement du compte sélectionné).

## Threads

Matrix prend en charge les fils de discussion natifs Matrix pour les réponses automatiques ainsi que pour les envois via l'outil de message.

- `dm.sessionScope: "per-user"` (par défaut) garde le routage des DM Matrix limité à l'expéditeur, de sorte que plusieurs salons DM peuvent partager une seule session lorsqu'ils correspondent au même pair.
- `dm.sessionScope: "per-room"` isole chaque salon DM Matrix dans sa propre clé de session tout en utilisant les vérifications d'autorisation et de liste blanche DM normales.
- Les liaisons de conversation explicites Matrix priment toujours sur `dm.sessionScope`, donc les salons et fils liés conservent leur session cible choisie.
- `threadReplies: "off"` garde les réponses au niveau supérieur et conserve les messages entrants en fil de discussion sur la session parente.
- `threadReplies: "inbound"` répond dans un fil uniquement si le message entrant était déjà dans ce fil.
- `threadReplies: "always"` conserve les réponses du salon dans un fil ancré au message déclencheur et achemine cette conversation via la session à portée de fil correspondante provenant du premier message déclencheur.
- `dm.threadReplies` remplace le paramètre de niveau supérieur uniquement pour les DM. Par exemple, vous pouvez garder les fils de salle isolés tout en gardant les DM à plat.
- Les messages entrants en fil de discussion incluent le message racine du fil comme contexte supplémentaire pour l'agent.
- Les envois via l'outil de message héritent automatiquement du fil Matrix actuel lorsque la cible est le même salon ou le même utilisateur DM, à moins qu'un `threadId` explicite ne soit fourni.
- La réutilisation de la cible utilisateur DM de même session ne s'active que lorsque les métadonnées de la session actuelle prouvent qu'il s'agit du même pair DM sur le même compte Matrix ; sinon, OpenClaw revient au routage normal à portée utilisateur.
- Lorsque OpenClaw détecte qu'une salle DM Matrix entre en collision avec une autre salle DM sur la même session DM Matrix partagée, il publie un `m.notice` unique dans cette salle avec la échappatoire `/focus` lorsque les liaisons de threads sont activées et l'indice `dm.sessionScope`.
- Les liaisons de threads d'exécution sont prises en charge pour Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`, et les `/acp spawn` liés aux threads fonctionnent dans les salles et DM Matrix.
- Un `/focus` de salle/DM Matrix de premier niveau crée un nouveau thread Matrix et le lie à la session cible lorsque `threadBindings.spawnSubagentSessions=true`.
- L'exécution de `/focus` ou `/acp spawn --thread here` dans un thread Matrix existant lie plutôt ce thread actuel.

## Liaisons de conversation ACP

Les salles, les DM et les threads Matrix existants peuvent être transformés en espaces de travail ACP durables sans modifier la surface de chat.

Flux de l'opérateur rapide :

- Exécutez `/acp spawn codex --bind here` dans le DM, la salle ou le thread Matrix existant que vous souhaitez continuer à utiliser.
- Dans un DM ou une salle Matrix de premier niveau, le DM/la salle actuel reste la surface de chat et les futurs messages sont acheminés vers la session ACP générée.
- Dans un thread Matrix existant, `--bind here` lie ce thread actuel en place.
- `/new` et `/reset` réinitialisent la même session ACP liée en place.
- `/acp close` ferme la session ACP et supprime la liaison.

Remarques :

- `--bind here` ne crée pas de thread Matrix enfant.
- `threadBindings.spawnAcpSessions` est uniquement requis pour `/acp spawn --thread auto|here`, où OpenClaw doit créer ou lier un thread Matrix enfant.

### Configuration de la liaison de thread

Matrix hérite des valeurs globales par défaut de `session.threadBindings` et prend également en charge les remplacements par canal :

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Les drapeaux de génération liés aux threads Matrix sont optionnels :

- Définissez `threadBindings.spawnSubagentSessions: true` pour permettre aux `/focus` de niveau supérieur de créer et de lier de nouveaux fils de discussion Matrix.
- Définissez `threadBindings.spawnAcpSessions: true` pour permettre aux `/acp spawn --thread auto|here` de lier les sessions ACP aux fils de discussion Matrix.

## Réactions

Matrix prend en charge les actions de réaction sortantes, les notifications de réaction entrantes et les réactions d'accusé de réception entrantes.

- Les outils de réaction sortante sont conditionnés par `channels["matrix"].actions.reactions`.
- `react` ajoute une réaction à un événement Matrix spécifique.
- `reactions` résume les réactions actuelles pour un événement Matrix spécifique.
- `emoji=""` supprime les propres réactions du compte bot sur cet événement.
- `remove: true` supprime uniquement la réaction emoji spécifiée du compte bot.

Les réactions d'accusé de réception utilisent l'ordre de résolution standard OpenClaw :

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- secours emoji pour l'identité de l'agent

La portée de la réaction d'accusé de réception se résout dans cet ordre :

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

Le mode de notification de réaction se résout dans cet ordre :

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- par défaut : `own`

Comportement :

- `reactionNotifications: "own"` transfère les événements `m.reaction` ajoutés lorsqu'ils ciblent des messages Matrix créés par le bot.
- `reactionNotifications: "off"` désactive les événements système de réaction.
- Les suppressions de réactions ne sont pas synthétisées en événements système car Matrix les présente sous forme de rédactions, et non de suppressions `m.reaction` autonomes.

## Contexte de l'historique

- `channels.matrix.historyLimit` contrôle combien de messages de salle récents sont inclus sous forme de `InboundHistory` lorsqu'un message de salle Matrix déclenche l'agent. Revient à `messages.groupChat.historyLimit` ; si les deux ne sont pas définis, la valeur par défaut effective est `0`. Définissez `0` pour désactiver.
- L'historique des salles Matrix est limité à la salle. Les MD continuent d'utiliser l'historique de session normal.
- Matrix room history is pending-only: OpenClaw buffers room messages that did not trigger a reply yet, then snapshots that window when a mention or other trigger arrives.
- The current trigger message is not included in `InboundHistory`; it stays in the main inbound body for that turn.
- Retries of the same Matrix event reuse the original history snapshot instead of drifting forward to newer room messages.

## Context visibility

Matrix supports the shared `contextVisibility` control for supplemental room context such as fetched reply text, thread roots, and pending history.

- `contextVisibility: "all"` is the default. Supplemental context is kept as received.
- `contextVisibility: "allowlist"` filters supplemental context to senders allowed by the active room/user allowlist checks.
- `contextVisibility: "allowlist_quote"` behaves like `allowlist`, but still keeps one explicit quoted reply.

This setting affects supplemental context visibility, not whether the inbound message itself can trigger a reply.
Trigger authorization still comes from `groupPolicy`, `groups`, `groupAllowFrom`, and DM policy settings.

## DM and room policy

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
        threadReplies: "off",
      },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
      groups: {
        "!roomid:example.org": {
          requireMention: true,
        },
      },
    },
  },
}
```

Consultez la page [Groupes](/fr/channels/groups) pour le comportement de filtrage des mentions et des listes d'autorisation.

Pairing example for Matrix DMs:

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

If an unapproved Matrix user keeps messaging you before approval, OpenClaw reuses the same pending pairing code and may send a reminder reply again after a short cooldown instead of minting a new code.

Consultez la page [Jumelage](/fr/channels/pairing) pour le processus de jumelage DM partagé et la disposition du stockage.

## Direct room repair

If direct-message state gets out of sync, OpenClaw can end up with stale `m.direct` mappings that point at old solo rooms instead of the live DM. Inspect the current mapping for a peer with:

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Repair it with:

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

The repair flow:

- prefers a strict 1:1 DM that is already mapped in `m.direct`
- falls back to any currently joined strict 1:1 DM with that user
- creates a fresh direct room and rewrites `m.direct` if no healthy DM exists

Le processus de réparation ne supprime pas automatiquement les anciens salons. Il ne sélectionne que la DM saine et met à jour le mappage afin que les nouveaux envois Matrix, les notifications de vérification et autres flux de messages directs ciblent à nouveau le bon salon.

## Approbations Exec

Matrix peut agir comme un client d'approbation natif pour un compte Matrix. Les contrôles de routage natifs DM/channel se trouvent toujours sous la configuration de l'approbation exec :

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers` (optionnel ; revient à `channels.matrix.dm.allowFrom`)
- `channels.matrix.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

Les approbateurs doivent être des IDs utilisateur Matrix tels que `@owner:example.org`. Matrix active automatiquement les approbations natives lorsque `enabled` n'est pas défini ou `"auto"` et qu'au moins un approbateur peut être résolu. Les approbations Exec utilisent d'abord `execApprovals.approvers` et peuvent revenir à `channels.matrix.dm.allowFrom`. Les approbations de plugin s'autorisent via `channels.matrix.dm.allowFrom`. Définissez `enabled: false` pour désactiver explicitement Matrix en tant que client d'approbation natif. Sinon, les demandes d'approbation reviennent aux autres routes d'approbation configurées ou à la politique de repli d'approbation.

Le routage natif Matrix prend en charge les deux types d'approbation :

- `channels.matrix.execApprovals.*` contrôle le mode de diffusion DM/channel natif pour les invites d'approbation Matrix.
- Les approbations Exec utilisent l'ensemble d'approbateurs exec défini par `execApprovals.approvers` ou `channels.matrix.dm.allowFrom`.
- Les approbations de plugin utilisent la liste d'autorisation DM Matrix issue de `channels.matrix.dm.allowFrom`.
- Les raccourcis de réaction Matrix et les mises à jour de message s'appliquent aux approbations exec et plugin.

Règles de livraison :

- `target: "dm"` envoie les invites d'approbation aux DM des approbateurs
- `target: "channel"` renvoie l'invite au salon Matrix ou à la DM d'origine
- `target: "both"` envoie aux DM des approbateurs et au salon Matrix ou à la DM d'origine

Les invites d'approbation Matrix amorcent les raccourcis de réaction sur le message d'approbation principal :

- `✅` = autoriser une fois
- `❌` = refuser
- `♾️` = autoriser toujours lorsque cette décision est autorisée par la stratégie d'exécution effective

Les approbateurs peuvent réagir à ce message ou utiliser les commandes slash de secours : `/approve <id> allow-once`, `/approve <id> allow-always` ou `/approve <id> deny`.

Seuls les approbateurs résolus peuvent approuver ou refuser. Pour les approbations d'exécution, la livraison par le canal inclut le texte de la commande, alors n'activez `channel` ou `both` que dans les salons de confiance.

Remplacement par compte :

- `channels.matrix.accounts.<account>.execApprovals`

Documentation connexe : [Approbations d'exécution](/fr/tools/exec-approvals)

## Multi-compte

```json5
{
  channels: {
    matrix: {
      enabled: true,
      defaultAccount: "assistant",
      dm: { policy: "pairing" },
      accounts: {
        assistant: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_assistant_xxx",
          encryption: true,
        },
        alerts: {
          homeserver: "https://matrix.example.org",
          accessToken: "syt_alerts_xxx",
          dm: {
            policy: "allowlist",
            allowFrom: ["@ops:example.org"],
            threadReplies: "off",
          },
        },
      },
    },
  },
}
```

Les valeurs de premier niveau `channels.matrix` agissent comme valeurs par défaut pour les comptes nommés, sauf si un compte les remplace.
Vous pouvez limiter les entrées de salle héritées à un compte Matrix avec `groups.<room>.account`.
Les entrées sans `account` restent partagées entre tous les comptes Matrix, et les entrées avec `account: "default"` fonctionnent toujours lorsque le compte par défaut est configuré directement au niveau supérieur `channels.matrix.*`.
Les valeurs par défaut d'authentification partagée partielles ne créent pas par elles-mêmes un compte par défaut implicite séparé. OpenClaw synthétise uniquement le compte de premier niveau `default` lorsque cette valeur par défaut dispose d'une authentification fraîche (`homeserver` plus `accessToken`, ou `homeserver` plus `userId` et `password`) ; les comptes nommés peuvent toujours rester détectables à partir de `homeserver` plus `userId` lorsque les identifiants mis en cache satisfont l'authentification ultérieurement.
Si Matrix possède déjà exactement un compte nommé, ou si `defaultAccount` pointe vers une clé de compte nommé existante, la promotion de réparation/configuration de compte unique à comptes multiples préserve ce compte au lieu de créer une nouvelle entrée `accounts.default`. Seules les clés d'authentification/d'amorçage Matrix sont déplacées vers ce compte promu ; les clés de stratégie de livraison partagées restent au niveau supérieur.
Définissez `defaultAccount` lorsque vous souhaitez que OpenClaw préfère un compte Matrix nommé pour le routage implicite, la sonde et les opérations CLI.
Si plusieurs comptes Matrix sont configurés et qu'un id de compte est `default`, OpenClaw utilise ce compte implicitement même lorsque `defaultAccount` n'est pas défini.
Si vous configurez plusieurs comptes nommés, définissez `defaultAccount` ou passez `--account <id>` pour les commandes CLI qui dépendent de la sélection implicite de compte.
Passez `--account <id>` à `openclaw matrix verify ...` et `openclaw matrix devices ...` lorsque vous souhaitez remplacer cette sélection implicite pour une commande.

Voir [Référence de configuration](/fr/gateway/configuration-reference#multi-account-all-channels) pour le modèle multi-compte partagé.

## Serveurs d'accueil privés/LAN

Par défaut, OpenClaw bloque les serveurs d'accueil Matrix privés/internes pour la protection SSRF, sauf si vous
optez explicitement pour chaque compte.

Si votre serveur domestique s'exécute sur localhost, une IP LAN/Tailscale ou un nom d'hôte interne, activez `network.dangerouslyAllowPrivateNetwork` pour ce compte Matrix :

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      network: {
        dangerouslyAllowPrivateNetwork: true,
      },
      accessToken: "syt_internal_xxx",
    },
  },
}
```

Exemple de configuration CLI :

```bash
openclaw matrix account add \
  --account ops \
  --homeserver http://matrix-synapse:8008 \
  --allow-private-network \
  --access-token syt_ops_xxx
```

Cette option ne permet que les cibles privées/internal de confiance. Les serveurs domestiques publics en texte clair tels que `http://matrix.example.org:8008` restent bloqués. Privilégiez `https://` chaque fois que possible.

## Proxying du trafic Matrix

Si votre déploiement Matrix nécessite un proxy HTTP(S) sortant explicite, définissez `channels.matrix.proxy` :

```json5
{
  channels: {
    matrix: {
      homeserver: "https://matrix.example.org",
      accessToken: "syt_bot_xxx",
      proxy: "http://127.0.0.1:7890",
    },
  },
}
```

Les comptes nommés peuvent remplacer la valeur par défaut de niveau supérieur par `channels.matrix.accounts.<id>.proxy`. OpenClaw utilise le même paramètre de proxy pour le trafic d'exécution Matrix et les sondes de statut de compte.

## Résolution de cible

Matrix accepte ces formes de cibles partout où OpenClaw vous demande une cible de salle ou d'utilisateur :

- Utilisateurs : `@user:server`, `user:@user:server` ou `matrix:user:@user:server`
- Salons : `!room:server`, `room:!room:server` ou `matrix:room:!room:server`
- Alias : `#alias:server`, `channel:#alias:server` ou `matrix:channel:#alias:server`

La recherche en direct dans l'annuaire utilise le compte Matrix connecté :

- Les recherches d'utilisateurs interrogent l'annuaire des utilisateurs Matrix sur ce serveur domestique.
- Les recherches de salle acceptent directement les ID de salle explicites et les alias, puis se rabattent sur la recherche des noms des salles rejointes pour ce compte.
- La recherche de nom de salle rejointe est basée sur le meilleur effort. Si un nom de salle ne peut pas être résolu en un ID ou un alias, il est ignoré par la résolution de la liste d'autorisation d'exécution.

## Référence de configuration

- `enabled` : activer ou désactiver le channel.
- `name` : étiquette facultative pour le compte.
- `defaultAccount` : ID de compte préféré lorsque plusieurs comptes Matrix sont configurés.
- `homeserver` : URL du serveur domestique, par exemple `https://matrix.example.org`.
- `network.dangerouslyAllowPrivateNetwork` : autoriser ce compte Matrix à se connecter aux serveurs domestiques privés/internal. Activez ceci lorsque le serveur domestique résout vers `localhost`, une IP LAN/Tailscale ou un hôte interne tel que `matrix-synapse`.
- `proxy` : URL de proxy HTTP(S) facultative pour le trafic Matrix. Les comptes nommés peuvent remplacer la valeur par défaut de niveau supérieur par leur propre `proxy`.
- `userId` : ID complet de l'utilisateur Matrix, par exemple `@bot:example.org`.
- `accessToken` : jeton d'accès pour l'authentification par jeton. Les valeurs en texte clair et les valeurs SecretRef sont prises en charge pour `channels.matrix.accessToken` et `channels.matrix.accounts.<id>.accessToken` sur les fournisseurs env/file/exec. Voir [Secrets Management](/fr/gateway/secrets).
- `password` : mot de passe pour la connexion par mot de passe. Les valeurs en texte brut et les valeurs SecretRef sont prises en charge.
- `deviceId` : ID d'appareil Matrix explicite.
- `deviceName` : nom d'affichage de l'appareil pour la connexion par mot de passe.
- `avatarUrl` : URL de l'avatar auto-stocké pour la synchronisation du profil et les mises à jour `profile set`.
- `initialSyncLimit` : nombre maximum d'événements récupérés lors de la synchronisation au démarrage.
- `encryption` : activer le chiffrement de bout en bout (E2EE).
- `allowlistOnly` : lorsque `true`, met à niveau la stratégie de salle `open` vers `allowlist` et force toutes les stratégies DM actives, à l'exception de `disabled` (y compris `pairing` et `open`), vers `allowlist`. N'affecte pas les stratégies `disabled`.
- `allowBots` : autoriser les messages provenant d'autres comptes OpenClaw Matrix configurés (`true` ou `"mentions"`).
- `groupPolicy` : `open`, `allowlist` ou `disabled`.
- `contextVisibility` : mode de visibilité du contexte de salle supplémentaire (`all`, `allowlist`, `allowlist_quote`).
- `groupAllowFrom` : liste d'autorisation des identifiants utilisateurs pour le trafic de la salle. Les identifiants utilisateurs Matrix complets sont les plus sûrs ; les correspondances exactes de répertoire sont résolues au démarrage et lorsque la liste d'autorisation change pendant que le moniteur est en cours d'exécution. Les noms non résolus sont ignorés.
- `historyLimit` : nombre maximum de messages de salle à inclure comme contexte de l'historique du groupe. Revient à `messages.groupChat.historyLimit` ; si les deux ne sont pas définis, la valeur par défaut effective est `0`. Définissez `0` pour désactiver.
- `replyToMode` : `off`, `first`, `all` ou `batched`.
- `markdown` : configuration facultative du rendu Markdown pour le texte Matrix sortant.
- `streaming` : `off` (par défaut), `"partial"`, `"quiet"`, `true`, ou `false`. `"partial"` et `true` activent les mises à jour de brouillon par aperçu préalable avec des messages texte Matrix normaux. `"quiet"` utilise des avis d'aperçu sans notification pour les configurations de règles de push auto-hébergées. `false` est équivalent à `"off"`.
- `blockStreaming` : `true` active des messages de progression distincts pour les blocs d'assistant terminés lorsque le streaming d'aperçu de brouillon est actif.
- `threadReplies` : `off`, `inbound`, ou `always`.
- `threadBindings` : substitutions par canal pour le routage et le cycle de vie des sessions liées aux fils.
- `startupVerification` : mode de demande de vérification automatique au démarrage (`if-unverified`, `off`).
- `startupVerificationCooldownHours` : temps de refroidissement avant de réessayer les demandes de vérification automatique au démarrage.
- `textChunkLimit` : taille des blocs de messages sortants en caractères (s'applique lorsque `chunkMode` est `length`).
- `chunkMode` : `length` divise les messages par nombre de caractères ; `newline` divise aux limites des lignes.
- `responsePrefix` : chaîne optionnelle ajoutée devant toutes les réponses sortantes pour ce canal.
- `ackReaction` : substitution de réaction d'accusé de réception optionnelle pour ce canal/compte.
- `ackReactionScope` : substitution de portée de réaction d'accusé de réception optionnelle (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications` : mode de notification de réaction entrante (`own`, `off`).
- `mediaMaxMb` : limite de taille des médias en Mo pour les envois sortants et le traitement des médias entrants.
- `autoJoin` : politique de rejoindre automatiquement les invitations (`always`, `allowlist`, `off`). Par défaut : `off`. S'applique à toutes les invitations Matrix, y compris les invitations de style DM.
- `autoJoinAllowlist` : salons/alias autorisés lorsque `autoJoin` est `allowlist`. Les entrées d'alias sont résolues en ID de salon lors du traitement de l'invitation ; OpenClaw ne fait pas confiance à l'état de l'alias revendiqué par le salon invité.
- `dm` : bloc de stratégie de DM (`enabled`, `policy`, `allowFrom`, `sessionScope`, `threadReplies`).
- `dm.policy` : contrôle l'accès aux DM après que OpenClaw a rejoint le salon et l'a classé comme DM. Cela ne modifie pas si une invitation est rejointe automatiquement.
- `dm.allowFrom` : liste d'autorisation des identifiants utilisateurs pour le trafic DM. Les identifiants utilisateurs Matrix complets sont les plus sûrs ; les correspondances exactes de répertoire sont résolues au démarrage et lorsque la liste d'autorisation change pendant que le moniteur est en cours d'exécution. Les noms non résolus sont ignorés.
- `dm.sessionScope` : `per-user` (par défaut) ou `per-room`. Utilisez `per-room` lorsque vous souhaitez que chaque salon DM Matrix conserve un contexte distinct, même si l'interlocuteur est le même.
- `dm.threadReplies` : remplacement de la stratégie de filtre pour DM uniquement (`off`, `inbound`, `always`). Il remplace le paramètre `threadReplies` de niveau supérieur pour le placement des réponses et l'isolement de session dans les DM.
- `execApprovals` : livraison d'approbation d'exécution native Matrix (`enabled`, `approvers`, `target`, `agentFilter`, `sessionFilter`).
- `execApprovals.approvers` : ID d'utilisateurs Matrix autorisés à approuver les demandes d'exécution. Optionnel lorsque `dm.allowFrom` identifie déjà les approbateurs.
- `execApprovals.target` : `dm | channel | both` (par défaut : `dm`).
- `accounts` : remplacements nommés par compte. Les valeurs `channels.matrix` de niveau supérieur servent de valeurs par défaut pour ces entrées.
- `groups` : carte de stratégie par salle. Préférez les ID ou alias de salle ; les noms de salle non résolus sont ignorés lors de l'exécution. L'identité de session/groupe utilise l'ID de salle stable après résolution.
- `groups.<room>.account` : restreindre une entrée de salle héritée à un compte Matrix spécifique dans les configurations multi-comptes.
- `groups.<room>.allowBots` : remplacement au niveau de la salle pour les expéditeurs de bots configurés (`true` ou `"mentions"`).
- `groups.<room>.users` : liste d'autorisation des expéditeurs par salle.
- `groups.<room>.tools` : remplacements d'autorisation/refus d'outils par salle.
- `groups.<room>.autoReply` : remplacement de filtrage par mention au niveau de la salle. `true` désactive les exigences de mention pour cette salle ; `false` les réactive.
- `groups.<room>.skills` : filtre de compétences facultatif au niveau de la salle.
- `groups.<room>.systemPrompt` : extrait d'invite système facultatif au niveau de la salle.
- `rooms` : alias hérité pour `groups`.
- `actions` : filtrage d'outils par action (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).

## Connexes

- [Présentation des canaux](/fr/channels) — tous les canaux pris en charge
- [Appairage](/fr/channels/pairing) — authentification par DM et flux d'appairage
- [Groupes](/fr/channels/groups) — comportement de chat de groupe et filtrage par mention
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
