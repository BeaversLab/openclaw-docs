---
summary: "Statut du support Matrix, configuration et exemples de configuration"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix est le plugin de canal Matrix fourni avec OpenClaw.
Il utilise le SDK officiel `matrix-js-sdk` et prend en charge les DMs, les salons, les fils de discussion, les médias, les réactions, les sondages, la localisation et l'E2EE.

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

Consultez [Plugins](/en/tools/plugin) pour connaître le comportement des plugins et les règles d'installation.

## Configuration

1. Assurez-vous que le plugin Matrix est disponible.
   - Les versions packagées actuelles d'OpenClaw l'incluent déjà.
   - Les installations anciennes/personnalisées peuvent l'ajouter manuellement avec les commandes ci-dessus.
2. Créez un compte Matrix sur votre serveur d'accueil (homeserver).
3. Configurez `channels.matrix` avec soit :
   - `homeserver` + `accessToken`, ou
   - `homeserver` + `userId` + `password`.
4. Redémarrez la passerelle.
5. Démarrez un DM avec le bot ou invitez-le dans un salon.

Chemins de configuration interactive :

```bash
openclaw channels add
openclaw configure --section channels
```

Ce que l'assistant Matrix demande réellement :

- URL du serveur d'accueil (homeserver)
- méthode d'authentification : jeton d'accès ou mot de passe
- ID utilisateur uniquement si vous choisissez l'authentification par mot de passe
- nom d'appareil facultatif
- s'il faut activer l'E2EE
- s'il faut configurer l'accès aux salons Matrix maintenant

Comportement important de l'assistant :

- Si les variables d'environnement d'authentification Matrix existent déjà pour le compte sélectionné et que ce compte n'a pas déjà d'authentification sauvegardée dans la configuration, l'assistant propose un raccourci d'environnement et n'écrit que `enabled: true` pour ce compte.
- Lorsque vous ajoutez un autre compte Matrix de manière interactive, le nom de compte saisi est normalisé dans l'ID de compte utilisé dans la configuration et les variables d'environnement. Par exemple, `Ops Bot` devient `ops-bot`.
- Les invites de la liste d'autorisation DM acceptent immédiatement les valeurs complètes `@user:server`. Les noms d'affichage ne fonctionnent que si la recherche en direct dans l'annuaire trouve une correspondance exacte ; sinon, l'assistant vous demande de réessayer avec un ID Matrix complet.
- Les invites de liste d'autorisation de salons acceptent directement les ID et alias de salons. Ils peuvent également résoudre en direct les noms des salons rejoints, mais les noms non résolus ne sont conservés que tels quels lors de la configuration et sont ignorés plus tard par la résolution de la liste d'autorisation lors de l'exécution. Privilégiez `!room:server` ou `#alias:server`.
- L'identité de salon/session lors de l'exécution utilise l'ID de salon stable Matrix. Les alias déclarés par le salon ne sont utilisés que comme entrées de recherche, et non comme clé de session à long terme ou identité de groupe stable.
- Pour résoudre les noms de salons avant de les enregistrer, utilisez `openclaw channels resolve --channel matrix "Project Room"`.

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
Lorsque des informations d'identification mises en cache existent à cet endroit, OpenClaw considère Matrix comme configuré pour la configuration, le diagnostic et la découverte du statut du canal, même si l'authentification actuelle n'est pas définie directement dans la configuration.

Équivalents de variables d'environnement (utilisés lorsque la clé de configuration n'est pas définie) :

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

Pour les comptes non définis par défaut, utilisez des variables d'environnement délimitées au compte :

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

Matrix échappe la ponctuation dans les ID de compte pour éviter les collisions dans les variables d'environnement délimitées.
Par exemple, `-` devient `_X2D_`, donc `ops-prod` correspond à `MATRIX_OPS_X2D_PROD_*`.

L'assistant interactif n'offre le raccourci de variable d'environnement que lorsque ces variables d'authentification sont déjà présentes et que le compte sélectionné n'a pas déjà l'authentification Matrix enregistrée dans la configuration.

## Exemple de configuration

Il s'agit d'une configuration de base pratique avec l'appariement DM, la liste d'autorisation des salles et l'E2EE activé :

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

## Aperçus en continu

Le flux de réponse Matrix est optionnel.

Définissez `channels.matrix.streaming` sur `"partial"` lorsque vous voulez que OpenClaw envoie une seule réponse d'aperçu en direct,
modifie cet aperçu sur place pendant que le modèle génère le texte, puis le finalise lorsque la
réponse est terminée :

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

- `streaming: "off"` est la valeur par défaut. OpenClaw attend la réponse finale et l'envoie une seule fois.
- `streaming: "partial"` crée un message d'aperçu modifiable pour le bloc d'assistant actuel en utilisant des messages texte normaux Matrix. Cela préserve le comportement de notification hérité d'aperçu en priorité de Matrix, de sorte que les clients standard peuvent notifier lors du premier texte d'aperçu diffusé au lieu du bloc terminé.
- `streaming: "quiet"` crée un avis d'aperçu silencieux modifiable pour le bloc d'assistant actuel. Utilisez ceci uniquement lorsque vous configurez également des règles de push de destinataire pour les modifications d'aperçu finalisées.
- `blockStreaming: true` active des messages de progression Matrix séparés. Avec le flux d'aperçu activé, Matrix conserve le brouillon en direct pour le bloc actuel et préserve les blocs terminés en tant que messages séparés.
- Lorsque le flux d'aperçu est activé et que `blockStreaming` est désactivé, Matrix modifie le brouillon en place et finalise le même événement lorsque le bloc ou le tour se termine.
- Si l'aperçu ne tient plus dans un seul événement Matrix, OpenClaw arrête le flux d'aperçu et revient à la livraison finale normale.
- Les réponses média envoient encore normalement les pièces jointes. Si un aperçu périmé ne peut plus être réutilisé en toute sécurité, OpenClaw le rétracte avant d'envoyer la réponse média finale.
- Les modifications d'aperçu coûtent des appels Matrix supplémentaires API. Désactivez le flux si vous voulez le comportement le plus conservateur en matière de limitation de débit.

`blockStreaming` n'active pas les aperçus de brouillon par lui-même.
Utilisez `streaming: "partial"` ou `streaming: "quiet"` pour les modifications d'aperçu ; puis ajoutez `blockStreaming: true` uniquement si vous voulez aussi que les blocs d'assistant terminés restent visibles sous forme de messages de progression séparés.

Si vous avez besoin des notifications standard Matrix sans règles de push personnalisées, utilisez `streaming: "partial"` pour un comportement d'aperçu en priorité ou laissez `streaming` désactivé pour une livraison finale uniquement. Avec `streaming: "off"` :

- `blockStreaming: true` envoie chaque bloc terminé sous forme de message Matrix normal de notification.
- `blockStreaming: false` envoie uniquement la réponse finale terminée sous forme de message Matrix normal de notification.

### Règles de push auto-hébergées pour les aperçus finalisés silencieux

Si vous gérez votre propre infrastructure Matrix et souhaitez que les aperçus silencieux nenotifient que lorsqu'un bloc ou une réponse finale est terminé, définissez `streaming: "quiet"` et ajoutez une règle de push par utilisateur pour les modifications d'aperçu finalisées.

Il s'agit généralement d'une configuration au niveau de l'utilisateur destinataire, et non d'une modification globale de la configuration du serveur d'accueil :

Plan rapide avant de commencer :

- utilisateur destinataire = la personne qui doit recevoir la notification
- utilisateur bot = le compte OpenClaw Matrix qui envoie la réponse
- utilisez le jeton d'accès de l'utilisateur destinataire pour les appels API ci-dessous
- faites correspondre `sender` dans la règle de push avec le MXID complet de l'utilisateur bot

1. Configurez OpenClaw pour utiliser des aperçus silencieux :

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. Assurez-vous que le compte destinataire reçoit déjà les notifications push normales Matrix. Les règles d'aperçu silencieux ne fonctionnent que si cet utilisateur dispose déjà de pushers/appareils fonctionnels.

3. Obtenez le jeton d'accès de l'utilisateur destinataire.
   - Utilisez le jeton de l'utilisateur récepteur, pas celui du bot.
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

4. Vérifiez que le compte destinataire dispose déjà de pushers :

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushers"
```

Si cela ne renvoie aucun pusher/appareil actif, corrigez d'abord les notifications normales Matrix avant d'ajouter la règle OpenClaw ci-dessous.

OpenClaw marque les modifications d'aperçu finalisées en texte seul par :

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

- `https://matrix.example.org` : l'URL de base de votre serveur d'accueil
- `$USER_ACCESS_TOKEN` : le jeton d'accès de l'utilisateur récepteur
- `openclaw-finalized-preview-botname` : un ID de règle unique pour ce bot pour cet utilisateur récepteur
- `@bot:example.org` : le MXID de votre bot OpenClaw Matrix, et non le MXID de l'utilisateur récepteur

Important pour les configurations multi-bots :

- Les règles de push sont indexées par `ruleId`. L'exécution répétée de `PUT` sur le même ID de règle met à jour cette règle.
- Si un utilisateur récepteur doit recevoir des notifications pour plusieurs comptes de bot OpenClaw Matrix, créez une règle par bot avec un ID de règle unique pour chaque correspondance d'expéditeur.
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

7. Testez une réponse en continu. En mode silencieux, la salle doit afficher un aperçu de brouillon silencieux et l'édition
   finale sur place doit notifier une fois le bloc ou le tour terminé.

Si vous devez supprimer la règle plus tard, supprimez ce même ID de règle avec le jeton de l'utilisateur récepteur :

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

Notes :

- Créez la règle avec le jeton d'accès de l'utilisateur récepteur, et non celui du bot.
- Les nouvelles règles `override` définies par l'utilisateur sont insérées avant les règles de suppression par défaut, aucun paramètre d'ordonnancement supplémentaire n'est donc nécessaire.
- Cela n'affecte que les modifications d'aperçu texte uniquement que OpenClaw peut finaliser en toute sécurité sur place. Les solutions de repli pour les médias et les aperçus périmés utilisent toujours la livraison normale Matrix.
- Si `GET /_matrix/client/v3/pushers` n'affiche aucun pusher, l'utilisateur ne dispose pas encore d'une livraison de push Matrix fonctionnelle pour ce compte/appareil.

#### Synapse

Pour Synapse, la configuration ci-dessus suffit généralement à elle seule :

- Aucun changement spécial de `homeserver.yaml` n'est requis pour les notifications d'aperçu finalisées OpenClaw.
- Si votre déploiement Synapse envoie déjà des notifications push normales Matrix, le jeton utilisateur + l'appel `pushrules` ci-dessus constituent la principale étape de configuration.
- Si vous exécutez Synapse derrière un proxy inverse ou des workers, assurez-vous que `/_matrix/client/.../pushrules/` atteint correctement Synapse.
- Si vous exécutez des workers Synapse, assurez-vous que les pushers sont en bonne santé. La livraison des push est gérée par le processus principal ou `synapse.app.pusher` / les workers pusher configurés.

#### Tuwunel

Pour Tuwunel, utilisez le même flux de configuration et le même appel à l'API de règle de push API indiqués ci-dessus :

- Aucune configuration spécifique à Tuwunel n'est requise pour le marqueur d'aperçu finalisé lui-même.
- Si les notifications normales Matrix fonctionnent déjà pour cet utilisateur, le jeton utilisateur + l'appel `pushrules` ci-dessus constituent la principale étape de configuration.
- Si les notifications semblent disparaître pendant que l'utilisateur est actif sur un autre appareil, vérifiez si `suppress_push_when_active` est activé. Tuwunel a ajouté cette option dans Tuwunel 1.4.2 le 12 septembre 2025, et elle peut intentionnellement supprimer les notifications push vers d'autres appareils pendant qu'un appareil est actif.

## Chiffrement et vérification

Dans les salons chiffrés (E2EE), les événements d'image sortants utilisent `thumbnail_file` afin que les aperçus d'images soient chiffrés avec la pièce jointe complète. Les salons non chiffrés utilisent toujours `thumbnail_url` en clair. Aucune configuration n'est nécessaire — le plugin détecte automatiquement l'état E2EE.

### Salons bot à bot

Par défaut, les messages Matrix provenant d'autres comptes OpenClaw Matrix configurés sont ignorés.

Utilisez `allowBots` lorsque vous voulez intentionnellement du trafic Matrix inter-agent :

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

- `allowBots: true` accepte les messages provenant d'autres comptes bot Matrix configurés dans les salons et DMs autorisés.
- `allowBots: "mentions"` n'accepte ces messages que lorsqu'ils mentionnent visiblement ce bot dans les salons. Les DMs sont toujours autorisés.
- `groups.<room>.allowBots` remplace le paramètre au niveau du compte pour un salon.
- OpenClaw ignore toujours les messages provenant du même identifiant utilisateur Matrix pour éviter les boucles de réponse automatique.
- Matrix n'expose pas d'indicateur de bot natif ici ; OpenClaw traite "créé par un bot" comme "envoyé par un autre compte Matrix configuré sur cette passerelle OpenClaw".

Utilisez des listes d'autorisation de salons strictes et des exigences de mention lorsque vous activez le trafic bot à bot dans les salons partagés.

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

Support multi-compte : utilisez `channels.matrix.accounts` avec des identifiants par compte et `name` en option. Voir [Référence de configuration](/en/gateway/configuration-reference#multi-account-all-channels) pour le modèle partagé.

Diagnostics détaillés de l'initialisation :

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

Détails détaillés de la vérification de l'appareil :

```bash
openclaw matrix verify device "<your-recovery-key>" --verbose
```

Vérifier l'état de santé de la sauvegarde des clés de salon :

```bash
openclaw matrix verify backup status
```

Diagnostics détaillés de l'état de la sauvegarde :

```bash
openclaw matrix verify backup status --verbose
```

Restaurer les clés de salon à partir de la sauvegarde du serveur :

```bash
openclaw matrix verify backup restore
```

Diagnostics détaillés de la restauration :

```bash
openclaw matrix verify backup restore --verbose
```

Supprimez la sauvegarde actuelle du serveur et créez une nouvelle ligne de base de sauvegarde. Si la clé de sauvegarde stockée ne peut pas être chargée proprement, cette réinitialisation peut également recréer le stockage des secrets afin que les futurs démarrages à froid puissent charger la nouvelle clé de sauvegarde :

```bash
openclaw matrix verify backup reset --yes
```

Toutes les commandes `verify` sont concises par défaut (y compris la journalisation interne silencieuse du SDK) et n'affichent des diagnostics détaillés qu'avec `--verbose`.
Utilisez `--json` pour une sortie complète lisible par machine lors de l'écriture de scripts.

Dans les configurations multi-comptes, les commandes Matrix CLI utilisent le compte Matrix par défaut implicite, sauf si vous passez `--account <id>`.
Si vous configurez plusieurs comptes nommés, définissez `channels.matrix.defaultAccount` d'abord, sinon ces opérations implicites CLI s'arrêteront et vous demanderont de choisir explicitement un compte.
Utilisez `--account` chaque fois que vous voulez que la vérification ou les opérations d'appareil ciblent explicitement un compte nommé :

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

`Verified by owner` ne devient `yes` que lorsqu'une vérification par signature croisée ou une signature par le propriétaire est présente.
La confiance locale seule ne suffit pas pour que OpenClaw considère l'appareil comme entièrement vérifié.

### Ce que fait l'amorçage (bootstrap)

`openclaw matrix verify bootstrap` est la commande de réparation et de configuration pour les comptes Matrix chiffrés.
Il effectue toutes les opérations suivantes dans l'ordre :

- amorce le stockage des secrets, en réutilisant une clé de récupération existante si possible
- amorce la signature croisée et téléverse les clés publiques de signature croisée manquantes
- tente de marquer et signer croisé l'appareil actuel
- crée une nouvelle sauvegarde de clés de salle côté serveur si elle n'existe pas déjà

Si le serveur d'accueil nécessite une authentification interactive pour télécharger les clés de signature croisée, OpenClaw essaie d'abord le téléchargement sans authentification, puis avec `m.login.dummy`, puis avec `m.login.password` lorsque `channels.matrix.password` est configuré.

Utilisez `--force-reset-cross-signing` uniquement lorsque vous souhaitez intentionnellement abandonner l'identité de signature croisée actuelle et en créer une nouvelle.

Si vous souhaitez intentionnellement abandonner la sauvegarde des clés de salle actuelle et commencer une nouvelle
ligne de base de sauvegarde pour les futurs messages, utilisez `openclaw matrix verify backup reset --yes`.
Ne faites cela que si vous acceptez que l'ancien historique chiffré irrécupérable restera
indisponible et que OpenClaw peut recréer le stockage des secrets si le secret de sauvegarde
courant ne peut pas être chargé en toute sécurité.

### Nouvelle ligne de base de sauvegarde

Si vous souhaitez que les futurs messages chiffrés continuent de fonctionner et acceptez de perdre l'ancien historique irrécupérable, exécutez ces commandes dans l'ordre :

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Ajoutez `--account <id>` à chaque commande lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

### Comportement au démarrage

Lorsque `encryption: true`, Matrix définit `startupVerification` sur `"if-unverified"`.
Au démarrage, si cet appareil n'est toujours pas vérifié, Matrix demandera l'auto-vérification dans un autre client Matrix,
ignorera les demandes en double tant qu'une est déjà en attente, et appliquera un temps d'attente local avant de réessayer après les redémarrages.
Les tentatives de demandes échouées réessayent plus tôt que la création réussie de demandes par défaut.
Définissez `startupVerification: "off"` pour désactiver les demandes automatiques au démarrage, ou ajustez `startupVerificationCooldownHours`
si vous souhaitez une fenêtre de réessai plus courte ou plus longue.

Le démarrage effectue également automatiquement une passe conservatrice d'amorçage crypto.
Cette passe essaie d'abord de réutiliser le stockage des secrets actuel et l'identité de signature croisée, et évite de réinitialiser la signature croisée à moins que vous ne lanciez un flux de réparation d'amorçage explicite.

Si le démarrage détecte un état d'amorçage cassé et que `channels.matrix.password` est configuré, OpenClaw peut tenter une voie de réparation plus stricte.
Si l'appareil actuel est déjà signé par le propriétaire, OpenClaw préserve cette identité au lieu de la réinitialiser automatiquement.

Mise à niveau depuis le plugin public Matrix précédent :

- OpenClaw réutilise automatiquement le même compte Matrix, le jeton d'accès et l'identité de l'appareil lorsque cela est possible.
- Avant que toute modification de migration Matrix exécutable ne soit exécutée, OpenClaw crée ou réutilise un instantané de récupération sous `~/Backups/openclaw-migrations/`.
- Si vous utilisez plusieurs comptes Matrix, définissez `channels.matrix.defaultAccount` avant de passer de l'ancien agencement de stockage plat afin que OpenClaw sache quel compte doit recevoir cet état hérité partagé.
- Si le plugin précédent avait stocké localement une clé de déchiffrement de sauvegarde de clés de salle Matrix, le démarrage ou `openclaw doctor --fix` l'importera automatiquement dans le nouveau flux de clés de récupération.
- Si le jeton d'accès Matrix a changé après que la migration a été préparée, le démarrage scanne désormais les racines de stockage de hachage de jeton sœurs pour un état de restauration hérité en attente avant d'abandonner la restauration automatique de sauvegarde.
- Si le jeton d'accès Matrix change ultérieurement pour le même compte, serveur domestique et utilisateur, OpenClaw préfère désormais réutiliser la racine de stockage de hachage de jeton existante la plus complète au lieu de commencer à partir d'un répertoire d'état Matrix vide.
- Au prochain démarrage de la passerelle, les clés de salle sauvegardées sont restaurées automatiquement dans le nouveau magasin de chiffrement.
- Si l'ancien plugin avait des clés de salle locales uniquement qui n'ont jamais été sauvegardées, OpenClaw vous avertira clairement. Ces clés ne peuvent pas être exportées automatiquement à partir de l'ancien magasin de chiffrement Rust, donc une partie de l'historique crypté ancien peut rester indisponible jusqu'à ce qu'il soit récupéré manuellement.
- Voir [migration Matrix](/en/install/migrating-matrix) pour le flux complet de mise à niveau, les limites, les commandes de récupération et les messages de migration courants.

L'état d'exécution chiffré est organisé sous des racines de hachage de jeton par compte et par utilisateur dans
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ce répertoire contient le magasin de synchronisation (`bot-storage.json`), le magasin de chiffrement (`crypto/`),
le fichier de clé de récupération (`recovery-key.json`), l'instantané IndexedDB (`crypto-idb-snapshot.json`),
les liaisons de fils (`thread-bindings.json`) et l'état de vérification au démarrage (`startup-verification.json`)
lorsque ces fonctionnalités sont utilisées.
Lorsque le jeton change mais que l'identité du compte reste la même, OpenClaw réutilise la meilleure racine
existante pour ce tuple compte/serveur domestique/utilisateur afin que l'état de synchronisation antérieur, l'état de chiffrement, les liaisons de fils,
et l'état de vérification au démarrage restent visibles.

### Modèle de magasin de chiffrement Node

Le chiffrement E2EE Matrix dans ce plugin utilise le chemin de chiffrement Rust officiel `matrix-js-sdk` dans Node.
Ce chemin attend une persistence basée sur IndexedDB lorsque vous voulez que l'état de chiffrement survive aux redémarrages.

OpenClaw fournit actuellement cela dans Node en :

- utilisant `fake-indexeddb` comme shim de l'API IndexedDB attendu par le SDK
- restaurant le contenu IndexedDB du chiffrement Rust depuis `crypto-idb-snapshot.json` avant `initRustCrypto`
- persistant le contenu IndexedDB mis à jour vers `crypto-idb-snapshot.json` après l'initialisation et pendant l'exécution
- sérialisant la restauration et la persistence des instantanés par rapport à `crypto-idb-snapshot.json` avec un verrou de fichier consultatif afin que la persistence de l'exécution de la passerelle et la maintenance CLI n'entrent pas en conflit sur le même fichier d'instantané

Il s'agit de plomberie de compatibilité/stockage, et non d'une implémentation de chiffrement personnalisée.
Le fichier d'instantané est un état d'exécution sensible et est stocké avec des permissions de fichier restrictives.
Sous le modèle de sécurité d'OpenClaw, l'hôte de la passerelle et le répertoire d'état local OpenClaw sont déjà à l'intérieur de la frontière de confiance de l'opérateur, il s'agit donc principalement d'une préoccupation opérationnelle de durabilité plutôt que d'une frontière de confiance distante séparée.

Amélioration prévue :

- ajouter la prise en charge de SecretRef pour le matériel de clé persistant Matrix afin que les clés de récupération et les secrets de chiffrement de magasin associés puissent être sourcés depuis les fournisseurs de secrets OpenClaw au lieu de fichiers locaux uniquement

## Gestion du profil

Mettre à jour l'auto-profil Matrix pour le compte sélectionné avec :

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Ajoutez `--account <id>` lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

Matrix accepte les URLs d'avatar `mxc://` directement. Lorsque vous passez une URL d'avatar `http://` ou `https://`, OpenClaw la télécharge d'abord sur Matrix et stocke l'URL `mxc://` résolue dans `channels.matrix.avatarUrl` (ou le remplacement du compte sélectionné).

## Avis de vérification automatique

Matrix publie désormais des avis de cycle de vie de vérification directement dans la salle de vérification DM stricte sous forme de messages `m.notice`.
Cela inclut :

- les avis de demande de vérification
- les avis de vérification prête (avec des instructions explicites « Vérifier par emoji »)
- les avis de début et de fin de vérification
- Détails SAS (emoji et décimal) lorsque disponibles

Les demandes de vérification entrantes d'un autre Matrix client sont suivies et acceptées automatiquement par OpenClaw.
Pour les flux d'auto-vérification, OpenClaw lance également automatiquement le flux SAS lorsque la vérification par emoji devient disponible et confirme son propre côté.
Pour les demandes de vérification provenant d'un autre utilisateur/appareil Matrix, OpenClaw accepte automatiquement la demande puis attend que le flux SAS se poursuive normalement.
Vous devez toujours comparer l'emoji ou le décimal SAS dans votre client Matrix et confirmer « Ils correspondent » ici pour terminer la vérification.

OpenClaw n'accepte pas aveuglément les flux en double auto-initiés. Le démarrage ignore la création d'une nouvelle demande lorsqu'une demande d'auto-vérification est déjà en attente.

Les notices de protocole/système de vérification ne sont pas transmises au pipeline de discussion de l'agent, elles ne produisent donc pas `NO_REPLY`.

### Hygiène des appareils

Les anciens appareils OpenClaw gérés par Matrix peuvent s'accumuler sur le compte et rendre plus difficile la compréhension de la confiance des salons chiffrés.
Listez-les avec :

```bash
openclaw matrix devices list
```

Supprimez les appareils obsolètes gérés par OpenClaw avec :

```bash
openclaw matrix devices prune-stale
```

### Réparation directe de salon

Si l'état des messages directs se désynchronise, OpenClaw peut se retrouver avec des mappings `m.direct` périmés qui pointent vers d'anciens salons solo au lieu du DM actif. Inspectez le mappage actuel pour un pair avec :

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Réparez-le avec :

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

La réparation conserve la logique spécifique à Matrix à l'intérieur du plugin :

- il préfère un DM strict 1:1 qui est déjà mappé dans `m.direct`
- sinon, il revient à n'importe quel DM strict 1:1 actuellement rejoint avec cet utilisateur
- si aucun DM sain n'existe, il crée un nouveau salon direct et réécrit `m.direct` pour pointer vers celui-ci

Le flux de réparation ne supprime pas automatiquement les anciens salons. Il ne fait que choisir le DM sain et mettre à jour le mappage pour que les nouveaux envois Matrix, les notices de vérification et les autres flux de messages directs ciblent à nouveau le bon salon.

## Fils de discussion

Matrix prend en charge les fils de discussion natifs Matrix pour les réponses automatiques ainsi que pour les envois via l'outil de message.

- `dm.sessionScope: "per-user"` (par défaut) garde le routage DM Matrix délimité à l'expéditeur, de sorte que plusieurs salons DM peuvent partager une même session lorsqu'ils correspondent au même pair.
- `dm.sessionScope: "per-room"` isole chaque salon DM Matrix dans sa propre clé de session tout en utilisant les vérifications d'authentification et de liste d'autorisation DM normales.
- Les liaisons de conversation explicites Matrix l'emportent toujours sur `dm.sessionScope`, les salles et fils liés conservant donc leur session cible choisie.
- `threadReplies: "off"` maintient les réponses au niveau supérieur et conserve les messages entrants filés sur la session parente.
- `threadReplies: "inbound"` répond dans un fil uniquement lorsque le message entrant figure déjà dans ce fil.
- `threadReplies: "always"` conserve les réponses de la salle dans un fil ancré au message déclencheur et achemine cette conversation via la session à portée de fil correspondante issue du premier message déclencheur.
- `dm.threadReplies` remplace le paramètre de niveau supérieur pour les DMs uniquement. Par exemple, vous pouvez garder les fils de salle isolés tout en gardant les DMs à plat.
- Les messages entrants filés incluent le message racine du fil comme contexte supplémentaire pour l'agent.
- Les envois de l'outil de message héritent désormais automatiquement du fil Matrix actuel lorsque la cible est la même salle ou la même cible d'utilisateur DM, sauf si un `threadId` explicite est fourni.
- La réutilisation de la cible d'utilisateur DM de même session ne s'active que lorsque les métadonnées de la session actuelle prouvent qu'il s'agit du même pair DM sur le même compte Matrix ; sinon OpenClaw revient au routage à portée utilisateur normale.
- Lorsque OpenClaw détecte une salle DM Matrix entrer en collision avec une autre salle DM sur la même session DM Matrix partagée, il publie un `m.notice` unique dans cette salle avec la sortie de secours `/focus` lorsque les liaisons de fil sont activées et l'indice `dm.sessionScope`.
- Les liaisons de fil à l'exécution sont prises en charge pour Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` et les `/acp spawn` liés à un fil fonctionnent désormais dans les salles et les DMs Matrix.
- Un `/focus` de salle/DM Matrix de niveau supérieur crée un nouveau fil Matrix et le lie à la session cible lorsqu'il est `threadBindings.spawnSubagentSessions=true`.
- L'exécution de `/focus` ou `/acp spawn --thread here` dans un fil Matrix existant lie plutôt le fil actuel.

## Liaisons de conversation ACP

Les salles Matrix, les DMs et les fils Matrix existants peuvent être transformés en espaces de travail ACP durables sans modifier la surface de chat.

Flux de l'opérateur rapide :

- Exécutez `/acp spawn codex --bind here` dans le DM Matrix, la salle ou le fil de discussion existant que vous souhaitez continuer à utiliser.
- Dans un DM ou une salle Matrix de premier niveau, le DM/salle actuel reste la surface de discussion et les futurs messages sont acheminés vers la session ACP générée.
- À l'intérieur d'un fil de discussion Matrix existant, `--bind here` lie ce fil de discussion actuel en place.
- `/new` et `/reset` réinitialisent la même session ACP liée en place.
- `/acp close` ferme la session ACP et supprime la liaison.

Notes :

- `--bind here` ne crée pas de fil de discussion Matrix enfant.
- `threadBindings.spawnAcpSessions` n'est requis que pour `/acp spawn --thread auto|here`, où OpenClaw doit créer ou lier un fil de discussion Matrix enfant.

### Configuration de la liaison de fil de discussion

Matrix hérite des paramètres globaux par défaut de `session.threadBindings` et prend également en charge les remplacements par canal :

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Les indicateurs de génération liés aux fils de discussion Matrix sont opt-in :

- Définissez `threadBindings.spawnSubagentSessions: true` pour permettre aux `/focus` de premier niveau de créer et lier de nouveaux fils de discussion Matrix.
- Définissez `threadBindings.spawnAcpSessions: true` pour permettre à `/acp spawn --thread auto|here` de lier les sessions ACP aux fils de discussion Matrix.

## Réactions

Matrix prend en charge les actions de réaction sortantes, les notifications de réaction entrantes et les réactions d'accusé de réception entrantes.

- Les outils de réaction sortante sont limités par `channels["matrix"].actions.reactions`.
- `react` ajoute une réaction à un événement Matrix spécifique.
- `reactions` liste le résumé actuel des réactions pour un événement Matrix spécifique.
- `emoji=""` supprime les propres réactions du compte bot sur cet événement.
- `remove: true` supprime uniquement la réaction emoji spécifiée du compte bot.

Les réactions d'accusé de réception utilisent l'ordre de résolution standard d'OpenClaw :

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- solution de repli emoji d'identité de l'agent

La portée de la réaction d'accusé de réception se résout dans cet ordre :

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

Le mode de notification des réactions est résolu dans cet ordre :

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- par défaut : `own`

Comportement actuel :

- `reactionNotifications: "own"` transfère les événements `m.reaction` ajoutés lorsqu'ils ciblent des messages Matrix provenant du bot.
- `reactionNotifications: "off"` désactive les événements système de réaction.
- Les suppressions de réactions ne sont toujours pas synthétisées en événements système car Matrix les présente sous forme de rédactions, et non comme des suppressions `m.reaction` autonomes.

## Contexte de l'historique

- `channels.matrix.historyLimit` contrôle le nombre de messages de salle récents inclus sous forme de `InboundHistory` lorsqu'un message de salle Matrix déclenche l'agent.
- Il revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver.
- L'historique de salle Matrix est limité à la salle. Les DMs continuent d'utiliser l'historique de session normal.
- L'historique de salle Matrix est uniquement en attente : OpenClaw met en tampon les messages de salle qui n'ont pas encore déclenché de réponse, puis capture cette fenêtre lorsqu'une mention ou un autre déclencheur arrive.
- Le message de déclenchement actuel n'est pas inclus dans `InboundHistory` ; il reste dans le corps entrant principal pour ce tour.
- Les nouvelles tentatives du même événement Matrix réutilisent l'instantané d'historique original au lieu de dériver vers des messages de salle plus récents.

## Visibilité du contexte

Matrix prend en charge le contrôle partagé `contextVisibility` pour le contexte de salle supplémentaire tel que le texte de réponse récupéré, les racines de fils et l'historique en attente.

- `contextVisibility: "all"` est la valeur par défaut. Le contexte supplémentaire est conservé tel qu'il est reçu.
- `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés par les vérifications actives de liste d'autorisation de salle/utilisateur.
- `contextVisibility: "allowlist_quote"` se comporte comme `allowlist`, mais conserve toujours une réponse citée explicite.

Ce paramètre affecte la visibilité du contexte supplémentaire, et non si le message entrant lui-même peut déclencher une réponse.
L'autorisation de déclenchement provient toujours de `groupPolicy`, `groups`, `groupAllowFrom` et des paramètres de stratégie de DM.

## Exemple de stratégie DM et de salle

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

Voir [Groups](/en/channels/groups) pour le comportement de mention-gating et d'allowlist.

Exemple d'appairage pour les Matrix DMs :

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un utilisateur Matrix non approuvé continue de vous envoyer des messages avant approbation, OpenClaw réutilise le même code d'appairage en attente et peut envoyer une réponse de rappel après un court délai au lieu de générer un nouveau code.

Voir [Pairing](/en/channels/pairing) pour le flux d'appairage DM partagé et la structure de stockage.

## Approbations Exec

Matrix peut agir comme un client d'approbation exec pour un compte Matrix.

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers` (optionnel ; revient à `channels.matrix.dm.allowFrom`)
- `channels.matrix.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

Les approbateurs doivent être des ID utilisateur Matrix tels que `@owner:example.org`. Matrix active automatiquement les approbations exec natives lorsque `enabled` n'est pas défini ou `"auto"` et qu'au moins un approbateur peut être résolu, soit depuis `execApprovals.approvers` soit depuis `channels.matrix.dm.allowFrom`. Définissez `enabled: false` pour désactiver explicitement Matrix en tant que client d'approbation natif. Sinon, les demandes d'approbation reviennent aux autres routes d'approbation configurées ou à la politique de repli d'approbation exec.

Le routage natif Matrix est aujourd'hui exclusivement pour les exec :

- `channels.matrix.execApprovals.*` contrôle le routage natif DM/channel pour les approbations exec uniquement.
- Les approbations de plugin utilisent toujours le `/approve` de même chat partagé plus tout transfert `approvals.plugin` configuré.
- Matrix peut toujours réutiliser `channels.matrix.dm.allowFrom` pour l'autorisation d'approbation de plugin lorsqu'il peut déduire les approbateurs en toute sécurité, mais il n'expose pas de chemin de diffusion DM/channel natif distinct pour l'approbation de plugin.

Règles de livraison :

- `target: "dm"` envoie les invites d'approbation aux DMs des approbateurs
- `target: "channel"` renvoie l'invite à la salle Matrix ou au DM d'origine
- `target: "both"` envoie aux DMs des approbateurs et à la salle Matrix ou au DM d'origine

Les invites d'approbation Matrix amorcent des raccourcis de réaction sur le message d'approbation principal :

- `✅` = autoriser une fois
- `❌` = refuser
- `♾️` = toujours autoriser lorsque cette décision est autorisée par la stratégie d'exécution effective

Les approbateurs peuvent réagir à ce message ou utiliser les commandes slash de secours : `/approve <id> allow-once`, `/approve <id> allow-always` ou `/approve <id> deny`.

Seuls les approbateurs résolus peuvent approuver ou refuser. La livraison du canal comprend le texte de la commande, n'activez donc `channel` ou `both` que dans des salons de confiance.

Les invites d'approbation Matrix réutilisent le planificateur d'approbation central partagé. L'interface native spécifique à Matrix sert uniquement de transport pour les approbations d'exécution : routage salon/DM et comportement d'envoi/mise à jour/suppression de message.

Remplacement par compte :

- `channels.matrix.accounts.<account>.execApprovals`

Documentation connexe : [Exec approvals](/en/tools/exec-approvals)

## Exemple multi-compte

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

Les valeurs `channels.matrix` de premier niveau agissent comme valeurs par défaut pour les comptes nommés, sauf si un compte les remplace.
Vous pouvez limiter les entrées de salon héritées à un compte Matrix avec `groups.<room>.account` (ou l'ancien `rooms.<room>.account`).
Les entrées sans `account` restent partagées entre tous les comptes Matrix, et les entrées avec `account: "default"` fonctionnent toujours lorsque le compte par défaut est configuré directement au niveau supérieur `channels.matrix.*`.
Les valeurs par défaut d'auth partagée partielles ne créent pas par elles-mêmes de compte par défaut implicite distinct. OpenClaw ne synthétise le compte `default` de premier niveau que lorsque cette valeur par défaut possède une authentification fraîche (`homeserver` plus `accessToken`, ou `homeserver` plus `userId` et `password`) ; les comptes nommés peuvent toujours être découvrables à partir de `homeserver` plus `userId` lorsque les identifiants en cache satisfont l'authentification ultérieurement.
Si Matrix possède déjà exactement un compte nommé, ou si `defaultAccount` pointe vers une clé de compte nommé existant, la promotion de réparation/configuration de compte unique vers plusieurs comptes préserve ce compte au lieu de créer une nouvelle entrée `accounts.default`. Seules les clés d'authentification/amorçage Matrix sont déplacées vers ce compte promu ; les clés de stratégie de livraison partagées restent au niveau supérieur.
Définissez `defaultAccount` lorsque vous souhaitez que OpenClaw privilégie un compte Matrix nommé pour le routage implicite, la détection et les opérations CLI.
Si vous configurez plusieurs comptes nommés, définissez `defaultAccount` ou passez `--account <id>` pour les commandes CLI qui dépendent de la sélection implicite de compte.
Passez `--account <id>` à `openclaw matrix verify ...` et `openclaw matrix devices ...` lorsque vous souhaitez remplacer cette sélection implicite pour une commande.

## Serveurs domestiques privés/LAN

Par défaut, OpenClaw bloque les serveurs domestiques Matrix privés/internes pour la protection SSRF, sauf si vous
optez explicitement pour chaque compte.

Si votre serveur domestique s'exécute sur localhost, une IP LAN/Tailscale ou un nom d'hôte interne, activez
`allowPrivateNetwork` pour ce compte Matrix :

```json5
{
  channels: {
    matrix: {
      homeserver: "http://matrix-synapse:8008",
      allowPrivateNetwork: true,
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

Cette option autorise uniquement les cibles privées/internal de confiance. Les serveurs de domicile publics en clair tels que `http://matrix.example.org:8008` restent bloqués. Privilégiez `https://` chaque fois que possible.

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

Les comptes nommés peuvent remplacer la valeur par défaut de niveau supérieur avec `channels.matrix.accounts.<id>.proxy`.
OpenClaw utilise le même paramètre de proxy pour le trafic d'exécution Matrix et les sondes de statut de compte.

## Résolution de cible

Matrix accepte ces formes de cible partout où OpenClaw vous demande une cible de salle ou d'utilisateur :

- Utilisateurs : `@user:server`, `user:@user:server`, ou `matrix:user:@user:server`
- Salles : `!room:server`, `room:!room:server`, ou `matrix:room:!room:server`
- Alias : `#alias:server`, `channel:#alias:server`, ou `matrix:channel:#alias:server`

La recherche en direct dans l'annuaire utilise le compte Matrix connecté :

- Les recherches d'utilisateurs interrogent l'annuaire des utilisateurs Matrix sur ce serveur de domicile.
- Les recherches de salle acceptent directement les ID de salle explicites et les alias, puis reviennent à rechercher les noms des salles rejoints pour ce compte.
- La recherche par nom de salle rejointe est au mieux-effort. Si un nom de salle ne peut pas être résolu en un ID ou un alias, il est ignoré par la résolution de la liste d'autorisation d'exécution.

## Référence de configuration

- `enabled` : activer ou désactiver le canal.
- `name` : étiquette optionnelle pour le compte.
- `defaultAccount` : ID de compte préféré lorsque plusieurs comptes Matrix sont configurés.
- `homeserver` : URL du serveur de domicile, par exemple `https://matrix.example.org`.
- `allowPrivateNetwork` : autoriser ce compte Matrix à se connecter à des serveurs de domicile privés/internal. Activez ceci lorsque le serveur de domicile est résolu en `localhost`, une IP LAN/Tailscale, ou un hôte interne tel que `matrix-synapse`.
- `proxy` : URL de proxy HTTP(S) optionnelle pour le trafic Matrix. Les comptes nommés peuvent remplacer la valeur par défaut de niveau supérieur par leur propre `proxy`.
- `userId` : identifiant complet de l'utilisateur Matrix, par exemple `@bot:example.org`.
- `accessToken` : jeton d'accès pour l'authentification par jeton. Les valeurs en texte brut et les valeurs SecretRef sont prises en charge pour `channels.matrix.accessToken` et `channels.matrix.accounts.<id>.accessToken` via les fournisseurs env/file/exec. Voir [Gestion des secrets](/en/gateway/secrets).
- `password` : mot de passe pour la connexion par mot de passe. Les valeurs en texte brut et les valeurs SecretRef sont prises en charge.
- `deviceId` : identifiant explicite de l'appareil Matrix.
- `deviceName` : nom d'affichage de l'appareil pour la connexion par mot de passe.
- `avatarUrl` : URL de l'auto-avatar stockée pour la synchronisation du profil et les mises à jour `set-profile`.
- `initialSyncLimit` : limite d'événements de synchronisation au démarrage.
- `encryption` : activer E2EE.
- `allowlistOnly` : forcer le comportement uniquement pour la liste d'autorisation pour les DMs et les salons.
- `allowBots` : autoriser les messages provenant d'autres comptes Matrix OpenClaw configurés (`true` ou `"mentions"`).
- `groupPolicy` : `open`, `allowlist`, ou `disabled`.
- `contextVisibility` : mode de visibilité du contexte de salon supplémentaire (`all`, `allowlist`, `allowlist_quote`).
- `groupAllowFrom` : liste d'autorisation des identifiants utilisateur pour le trafic du salon.
- Les entrées `groupAllowFrom` doivent être des identifiants utilisateur Matrix complets. Les noms non résolus sont ignorés lors de l'exécution.
- `historyLimit` : nombre maximal de messages de salon à inclure en tant que contexte d'historique de groupe. Revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver.
- `replyToMode` : `off`, `first`, ou `all`.
- `markdown` : configuration de rendu Markdown facultative pour le texte Matrix sortant.
- `streaming` : `off` (par défaut), `partial`, `quiet`, `true` ou `false`. `partial` et `true` activent les mises à jour de brouillon avec prévisualisation en priorité via des messages texte Matrix normaux. `quiet` utilise des avis de prévisualisation sans notification pour les configurations de règles de push auto-hébergées.
- `blockStreaming` : `true` active des messages de progression séparés pour les blocs d'assistant terminés tandis que le flux de prévisualisation du brouillon est actif.
- `threadReplies` : `off`, `inbound` ou `always`.
- `threadBindings` : remplacements par channel pour le routage et le cycle de vie des sessions liées aux fils.
- `startupVerification` : mode de demande de vérification automatique au démarrage (`if-unverified`, `off`).
- `startupVerificationCooldownHours` : délai avant de réessayer les demandes de vérification automatique au démarrage.
- `textChunkLimit` : taille des blocs de messages sortants.
- `chunkMode` : `length` ou `newline`.
- `responsePrefix` : préfixe de message optionnel pour les réponses sortantes.
- `ackReaction` : remplacement optionnel de la réaction d'accusé de réception pour ce channel/compte.
- `ackReactionScope` : remplacement optionnel de la portée de la réaction d'accusé de réception (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications` : mode de notification des réactions entrantes (`own`, `off`).
- `mediaMaxMb` : limite de taille des médias en Mo pour la gestion des médias Matrix. Elle s'applique aux envois sortants et au traitement des médias entrants.
- `autoJoin` : politique d'adhésion automatique aux invitations (`always`, `allowlist`, `off`). Par défaut : `off`.
- `autoJoinAllowlist` : salons/alias autorisés lorsque `autoJoin` est `allowlist`. Les entrées d'alias sont résolues en ID de salon lors du traitement des invitations ; OpenClaw ne fait pas confiance à l'état de l'alias déclaré par le salon invité.
- `dm` : bloc de stratégie DM (`enabled`, `policy`, `allowFrom`, `sessionScope`, `threadReplies`).
- Les entrées `dm.allowFrom` doivent être des ID utilisateur Matrix complets, sauf si vous les avez déjà résolus via une recherche en direct dans l'annuaire.
- `dm.sessionScope` : `per-user` (par défaut) ou `per-room`. Utilisez `per-room` lorsque vous souhaitez que chaque salon DM Matrix conserve un contexte distinct, même si l'interlocuteur est le même.
- `dm.threadReplies` : remplacement de la stratégie de fil uniquement pour les DM (`off`, `inbound`, `always`). Cela remplace le paramètre `threadReplies` de niveau supérieur pour le placement des réponses et l'isolement de session dans les DM.
- `execApprovals` : livraison d'approbation d'exécution native Matrix (`enabled`, `approvers`, `target`, `agentFilter`, `sessionFilter`).
- `execApprovals.approvers` : ID utilisateur Matrix autorisés à approuver les requêtes d'exécution. Optionnel lorsque `dm.allowFrom` identifie déjà les approbateurs.
- `execApprovals.target` : `dm | channel | both` (par défaut : `dm`).
- `accounts` : remplacements nommés par compte. Les valeurs `channels.matrix` de niveau supérieur servent de valeurs par défaut pour ces entrées.
- `groups` : mappage de règles par salon. Privilégiez les ID ou alias de salon ; les noms de salon non résolus sont ignorés lors de l'exécution. L'identité de session/groupe utilise l'ID de salon stable après résolution, tandis que les étiquettes lisibles par l'humain proviennent toujours des noms de salon.
- `groups.<room>.account` : restreint une entrée de salon héritée à un compte Matrix spécifique dans les configurations multi-comptes.
- `groups.<room>.allowBots` : substitution au niveau du salon pour les expéditeurs bots configurés (`true` ou `"mentions"`).
- `groups.<room>.users` : liste d'autorisation des expéditeurs par salon.
- `groups.<room>.tools` : substitutions d'autorisation/refus d'outils par salon.
- `groups.<room>.autoReply` : substitution de filtrage par mention au niveau du salon. `true` désactive les exigences de mention pour ce salon ; `false` les réactive.
- `groups.<room>.skills` : filtre de compétence optionnel au niveau du salon.
- `groups.<room>.systemPrompt` : extrait de prompt système optionnel au niveau du salon.
- `rooms` : alias historique pour `groups`.
- `actions` : filtrage d'outils par action (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appairage](/en/channels/pairing) — authentification par DM et flux d'appairage
- [Groupes](/en/channels/groups) — comportement du chat de groupe et filtrage par mention
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
