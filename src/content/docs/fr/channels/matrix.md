---
summary: "État de la prise en charge de Matrix, configuration et exemples"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix

Matrix est le plugin de channel Matrix inclus pour OpenClaw.
Il utilise le `matrix-js-sdk` officiel et prend en charge les DMs, les salles, les fils, les médias, les réactions, les sondages, la localisation et l'E2EE.

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

Voir [Plugins](/en/tools/plugin) pour le comportement des plugins et les règles d'installation.

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

Ce que l'assistant Matrix demande réellement :

- URL du serveur d'accueil
- méthode d'authentification : jeton d'accès ou mot de passe
- identifiant utilisateur uniquement si vous choisissez l'authentification par mot de passe
- nom d'appareil facultatif
- s'il faut activer l'E2EE
- s'il faut configurer l'accès aux salles Matrix maintenant
- s'il faut configurer la jonction automatique des invitations Matrix maintenant
- lorsque la jonction automatique est activée, si elle doit être `allowlist`, `always` ou `off`

Comportement important de l'assistant :

- Si les variables d'environnement d'authentification Matrix existent déjà pour le compte sélectionné et que ce compte n'a pas déjà d'authentification sauvegardée dans la configuration, l'assistant propose un raccourci d'env pour que la configuration puisse garder l'authentification dans les variables d'environnement au lieu de copier les secrets dans la configuration.
- Lorsque vous ajoutez un autre compte Matrix de manière interactive, le nom de compte saisi est normalisé en identifiant de compte utilisé dans la configuration et les variables d'environnement. Par exemple, `Ops Bot` devient `ops-bot`.
- Les invites de liste d'autorisation de DM acceptent immédiatement les valeurs complètes `@user:server`. Les noms d'affichage ne fonctionnent que lorsque la recherche en direct dans l'annuaire trouve une correspondance exacte ; sinon, l'assistant vous demande de réessayer avec un identifiant Matrix complet.
- Les invites de liste d'autorisation de salle acceptent directement les identifiants et alias de salle. Ils peuvent également résoudre les noms de salles rejoints en direct, mais les noms non résolus ne sont conservés que tels qu'ils ont été saisis lors de la configuration et sont ignorés plus tard par la résolution de la liste d'autorisation lors de l'exécution. Privilégiez `!room:server` ou `#alias:server`.
- L'assistant affiche désormais un avertissement explicite avant l'étape de jointure automatique des invitations car `channels.matrix.autoJoin` est réglé par défaut sur `off` ; les agents ne rejoindront pas les salons invités ni les nouvelles invitations de type DM, sauf si vous le configurez.
- En mode allowlist (liste blanche) de jointure automatique des invitations, utilisez uniquement des cibles d'invitation stables : `!roomId:server`, `#alias:server` ou `*`. Les noms de salons simples sont rejetés.
- L'identité d'exécution salon/session utilise l'ID de salon stable Matrix. Les alias déclarés par le salon ne sont utilisés que comme entrées de recherche, et non comme clé de session à long terme ou identité de groupe stable.
- Pour résoudre les noms de salon avant de les enregistrer, utilisez `openclaw channels resolve --channel matrix "Project Room"`.

<Warning>
`channels.matrix.autoJoin` est réglé par défaut sur `off`.

Si vous le laissez non configuré, le bot ne rejoindra pas les salons invités ni les nouvelles invitations de type DM, il n'apparaîtra donc pas dans les nouveaux groupes ou les DM invités, sauf si vous rejoignez manuellement d'abord.

Définissez `autoJoin: "allowlist"` avec `autoJoinAllowlist` pour restreindre les invitations qu'il accepte, ou définissez `autoJoin: "always"` si vous voulez qu'il rejoigne chaque invitation.

En mode `allowlist`, `autoJoinAllowlist` n'accepte que `!roomId:server`, `#alias:server` ou `*`.

</Warning>

Exemple de liste blanche :

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

Matrix stocke les identifiants mis en cache dans `~/.openclaw/credentials/matrix/`.
Le compte par défaut utilise `credentials.json` ; les comptes nommés utilisent `credentials-<account>.json`.
Lorsque des identifiants mis en cache existent à cet endroit, OpenClaw considère Matrix comme configuré pour la configuration, le diagnostic et la découverte du statut du canal, même si l'authentification actuelle n'est pas définie directement dans la configuration.

Équivalents de variables d'environnement (utilisés lorsque la clé de configuration n'est pas définie) :

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

Pour les comptes non par défaut, utilisez des variables d'environnement délimitées par compte :

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

Matrix échappe la ponctuation dans les ID de compte pour éviter les collisions des env vars délimités.
Par exemple, `-` devient `_X2D_`, donc `ops-prod` correspond à `MATRIX_OPS_X2D_PROD_*`.

L'assistant interactif n'offre le raccourci env-var que lorsque ces env vars d'authentification sont déjà présents et que le compte sélectionné n'a pas déjà l'auth Matrix enregistrée dans la configuration.

## Exemple de configuration

Voici une configuration de base pratique avec l'appariement DM, la liste d'autorisation de salons et E2EE activé :

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

`autoJoin` s'applique aux invitations Matrix en général, et pas seulement aux invitations de salons/groupes.
Cela inclut les invitations de style DM frais. Au moment de l'invitation, OpenClaw ne sait pas de manière fiable si le
salon invité finira par être traité comme un DM ou un groupe, donc toutes les invitations passent par la même
décision `autoJoin` en premier. `dm.policy` s'applique toujours après que le bot a rejoint et que le salon est
classifié comme un DM, donc `autoJoin` contrôle le comportement de jointure tandis que `dm.policy` contrôle le comportement de réponse/d'accès.

## Aperçus en streaming

Le streaming de réponse Matrix est opt-in.

Définissez `channels.matrix.streaming` sur `"partial"` lorsque vous voulez que OpenClaw envoie une seule réponse de prévisualisation en direct,
modifie cette prévisualisation sur place pendant que le modèle génère le texte, puis la finalise lorsque la
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
- `streaming: "partial"` crée un message de prévisualisation modifiable pour le bloc d'assistant actuel en utilisant les messages texte normaux Matrix. Cela préserve le comportement de notification hérité prioritaire à la prévisualisation de Matrix, donc les clients standards peuvent notifier sur le premier texte de prévisualisation en streaming au lieu du bloc terminé.
- `streaming: "quiet"` crée une seule notification de prévisualisation silencieuse modifiable pour le bloc d'assistant actuel. N'utilisez ceci que si vous configurez également des règles de push de destinataire pour les modifications de prévisualisation finalisées.
- `blockStreaming: true` active des messages de progression Matrix séparés. Avec le streaming de prévisualisation activé, Matrix conserve le brouillon en direct pour le bloc actuel et préserve les blocs terminés sous forme de messages séparés.
- Lorsque le streaming de prévisualisation est activé et que `blockStreaming` est désactivé, Matrix modifie le brouillon en direct sur place et finalise le même événement lorsque le bloc ou le tour se termine.
- Si la prévisualisation ne tient plus dans un seul événement Matrix, OpenClaw arrête le streaming de prévisualisation et revient à la livraison finale normale.
- Les réponses multimédia envoient toujours les pièces jointes normalement. Si une prévisualisation obsolète ne peut plus être réutilisée en toute sécurité, OpenClaw la réduit avant d'envoyer la réponse multimédia finale.
- Les modifications de prévisualisation entraînent des appels Matrix API supplémentaires. Désactivez le streaming si vous souhaitez le comportement le plus conservateur en matière de limitation de débit.

`blockStreaming` n'active pas les prévisualisations de brouillon par lui-même.
Utilisez `streaming: "partial"` ou `streaming: "quiet"` pour les modifications de prévisualisation ; puis ajoutez `blockStreaming: true` uniquement si vous souhaitez également que les blocs d'assistant terminés restent visibles sous forme de messages de progression séparés.

Si vous avez besoin des notifications standard Matrix sans règles de push personnalisées, utilisez `streaming: "partial"` pour un comportement de prévisualisation en premier ou laissez `streaming` désactivé pour une livraison finale uniquement. Avec `streaming: "off"` :

- `blockStreaming: true` envoie chaque bloc terminé sous forme de message de notification normal Matrix.
- `blockStreaming: false` envoie uniquement la réponse finale terminée sous forme de message de notification normal Matrix.

### Règles de push auto-hébergées pour les prévisualisations finalisées silencieuses

Si vous gérez votre propre infrastructure Matrix et souhaitez que les prévisualisations silencieuses ne notifient que lorsqu'un bloc ou la réponse finale est terminé, définissez `streaming: "quiet"` et ajoutez une règle de push par utilisateur pour les modifications de prévisualisation finalisées.

Il s'agit généralement d'une configuration au niveau de l'utilisateur destinataire, et non d'un changement de configuration global du serveur domestique :

Carte rapide avant de commencer :

- utilisateur destinataire = la personne qui doit recevoir la notification
- utilisateur bot = le compte OpenClaw Matrix qui envoie la réponse
- utilisez le jeton d'accès de l'utilisateur destinataire pour les appels API ci-dessous
- faire correspondre `sender` dans la règle de push au MXID complet de l'utilisateur du bot

1. Configurer OpenClaw pour utiliser les aperçus silencieux :

```json5
{
  channels: {
    matrix: {
      streaming: "quiet",
    },
  },
}
```

2. Assurez-vous que le compte destinataire reçoit déjà les notifications push normales de Matrix. Les règles d'aperçu
   silencieux ne fonctionnent que si cet utilisateur a déjà des pushers/appareils fonctionnels.

3. Obtenez le jeton d'accès de l'utilisateur destinataire.
   - Utilisez le jeton de l'utilisateur récepteur, pas celui du bot.
   - Il est généralement plus facile de réutiliser un jeton de session client existant.
   - Si vous devez créer un nouveau jeton, vous pouvez vous connecter via l'API Client-Server standard de Matrix API :

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

Si cela ne renvoie aucun pusher/appareil actif, corrigez d'abord les notifications normales de Matrix avant d'ajouter la
règle OpenClaw ci-dessous.

OpenClaw marque les modifications d'aperçu finalisées texte uniquement par :

```json
{
  "com.openclaw.finalized_preview": true
}
```

5. Créez une règle de push de remplacement pour chaque compte destinataire qui doit recevoir ces notifications :

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

- `https://matrix.example.org` : votre URL de base de homeserver
- `$USER_ACCESS_TOKEN` : le jeton d'accès de l'utilisateur récepteur
- `openclaw-finalized-preview-botname` : un ID de règle unique pour ce bot et cet utilisateur récepteur
- `@bot:example.org` : le MXID du bot OpenClaw de Matrix, et non le MXID de l'utilisateur récepteur

Important pour les configurations multi-bot :

- Les règles de push sont indexées par `ruleId`. Réexécuter `PUT` avec le même ID de règle met à jour cette règle.
- Si un utilisateur récepteur doit être notifié pour plusieurs comptes bot OpenClaw de Matrix, créez une règle par bot avec un ID de règle unique pour chaque correspondance d'expéditeur.
- Un modèle simple est `openclaw-finalized-preview-<botname>`, tel que `openclaw-finalized-preview-ops` ou `openclaw-finalized-preview-support`.

La règle est évaluée par rapport à l'expéditeur de l'événement :

- s'authentifier avec le jeton de l'utilisateur récepteur
- faire correspondre `sender` au MXID du bot OpenClaw

6. Vérifiez que la règle existe :

```bash
curl -sS \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

7. Testez une réponse diffusée. En mode silencieux, la salle doit afficher un aperçu de brouillon silencieux et la modification
   finale sur place doit notifier une fois le bloc ou le tour terminé.

Si vous devez supprimer la règle ultérieurement, supprimez ce même ID de règle avec le jeton de l'utilisateur récepteur :

```bash
curl -sS -X DELETE \
  -H "Authorization: Bearer $USER_ACCESS_TOKEN" \
  "https://matrix.example.org/_matrix/client/v3/pushrules/global/override/openclaw-finalized-preview-botname"
```

Remarques :

- Créez la règle avec le jeton d'accès de l'utilisateur récepteur, et non celui du bot.
- Les nouvelles règles `override` définies par l'utilisateur sont insérées avant les règles de suppression par défaut, aucun paramètre d'ordre supplémentaire n'est donc nécessaire.
- Cela n'affecte que les modifications d'aperçu texte uniquement qu'OpenClaw peut finaliser en toute sécurité sur place. Les replis média et les replis d'aperçus obsolètes utilisent toujours la distribution Matrix normale.
- Si `GET /_matrix/client/v3/pushers` n'affiche aucun émetteur (pusher), l'utilisateur ne dispose pas encore d'une distribution de push Matrix fonctionnelle pour ce compte/appareil.

#### Synapse

Pour Synapse, la configuration ci-dessus suffit généralement à elle seule :

- Aucune modification `homeserver.yaml` spéciale n'est requise pour les notifications d'aperçu finalisées d'OpenClaw.
- Si votre déploiement Synapse envoie déjà des notifications push Matrix normales, le jeton utilisateur + l'appel `pushrules` ci-dessus constituent la principale étape de configuration.
- Si vous faites fonctionner Synapse derrière un proxy inverse ou des workers, assurez-vous que `/_matrix/client/.../pushrules/` atteint correctement Synapse.
- Si vous utilisez des workers Synapse, assurez-vous que les émetteurs (pushers) sont en bonne santé. La distribution des push est gérée par le processus principal ou `synapse.app.pusher` / les workers émetteurs configurés.

#### Tuwunel

Pour Tuwunel, utilisez le même processus de configuration et le même appel à l'API de règles de push (push-rule) illustrés ci-dessus :

- Aucune configuration spécifique à Tuwunel n'est requise pour le marqueur d'aperçu finalisé lui-même.
- Si les notifications Matrix normales fonctionnent déjà pour cet utilisateur, le jeton utilisateur + l'appel `pushrules` ci-dessus constituent la principale étape de configuration.
- Si les notifications semblent disparaître pendant que l'utilisateur est actif sur un autre appareil, vérifiez si `suppress_push_when_active` est activé. Tuwunel a ajouté cette option dans Tuwunel 1.4.2 le 12 septembre 2025, et elle peut intentionnellement supprimer les pushes vers les autres appareils lorsqu'un appareil est actif.

## Chiffrement et vérification

Dans les salons chiffrés (E2EE), les événements d'image sortants utilisent `thumbnail_file` afin que les aperçus d'images soient chiffrés avec la pièce jointe complète. Les salons non chiffrés utilisent toujours `thumbnail_url` en clair. Aucune configuration n'est nécessaire — le plugin détecte automatiquement l'état E2EE.

### Salons bot à bot

Par défaut, les messages Matrix provenant d'autres comptes Matrix OpenClaw configurés sont ignorés.

Utilisez `allowBots` lorsque vous souhaitez intentionnellement un trafic Matrix inter-agent :

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

- `allowBots: true` accepte les messages d'autres comptes bot Matrix configurés dans les salons autorisés et les DMs.
- `allowBots: "mentions"` n'accepte ces messages que lorsque ce bot est mentionné explicitement dans les salons. Les DMs restent autorisés.
- `groups.<room>.allowBots` remplace le paramètre au niveau du compte pour un salon.
- OpenClaw ignore toujours les messages provenant du même identifiant utilisateur Matrix pour éviter les boucles de réponse automatique.
- Matrix n'expose pas d'indicateur de bot natif ici ; OpenClaw traite "créé par un bot" comme "envoyé par un autre compte Matrix configuré sur cette passerelle OpenClaw".

Utilisez des listes d'autorisation de salons strictes et des exigences de mention lorsque vous activez le trafic bot-à-bot dans les salons partagés.

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

Support multi-compte : utilisez `channels.matrix.accounts` avec des informations d'identification par compte et `name` en option. Voir [Référence de configuration](/en/gateway/configuration-reference#multi-account-all-channels) pour le modèle partagé.

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

Restaurer les clés de salon à partir de la sauvegarde du serveur :

```bash
openclaw matrix verify backup restore
```

Diagnostics de restauration détaillés :

```bash
openclaw matrix verify backup restore --verbose
```

Supprimer la sauvegarde actuelle du serveur et créer une nouvelle base de sauvegarde. Si la clé de
sauvegarde stockée ne peut pas être chargée proprement, cette réinitialisation peut également recréer
le stockage des secrets afin que les prochains démarrages à froid puissent charger la nouvelle clé de
sauvegarde :

```bash
openclaw matrix verify backup reset --yes
```

Toutes les commandes `verify` sont concises par défaut (y compris la journalisation silencieuse du SDK interne) et n'affichent des diagnostics détaillés qu'avec `--verbose`.
Utilisez `--json` pour une sortie complète lisible par machine lors de l'écriture de scripts.

Dans les configurations multi-comptes, les commandes Matrix de CLI Matrix utilisent le compte CLI par défaut implicite, sauf si vous passez `--account <id>`.
Si vous configurez plusieurs comptes nommés, définissez `channels.matrix.defaultAccount` d'abord, sinon ces opérations CLI implicites s'arrêteront et vous demanderont de choisir explicitement un compte.
Utilisez `--account` chaque fois que vous souhaitez que les opérations de vérification ou d'appareil ciblent explicitement un compte nommé :

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

Lorsque le chiffrement est désactivé ou indisponible pour un compte nommé, les avertissements et les erreurs de vérification Matrix pointent vers la clé de configuration de ce compte, par exemple `channels.matrix.accounts.assistant.encryption`.

### Signification de « vérifié »

OpenClaw considère cet appareil Matrix comme vérifié uniquement lorsqu'il est vérifié par votre propre identité de signature croisée.
En pratique, `openclaw matrix verify status --verbose` expose trois signaux de confiance :

- `Locally trusted` : cet appareil est approuvé uniquement par le client actuel
- `Cross-signing verified` : le SDK signale l'appareil comme vérifié via la signature croisée
- `Signed by owner` : l'appareil est signé par votre propre clé d'auto-signature

`Verified by owner` ne devient `yes` que lorsqu'une vérification par signature croisée ou une signature de propriétaire est présente.
La confiance locale seule ne suffit pas pour que OpenClaw considère l'appareil comme entièrement vérifié.

### Ce que fait le bootstrap

`openclaw matrix verify bootstrap` est la commande de réparation et de configuration pour les comptes Matrix chiffrés.
Il effectue toutes les opérations suivantes dans l'ordre :

- initialise le stockage des secrets, en réutilisant une clé de récupération existante si possible
- initialise la signature croisée et téléverse les clés publiques de signature croisée manquantes
- tente de marquer et de signer l'appareil actuel par signature croisée
- crée une nouvelle sauvegarde des clés de salle côté serveur si elle n'existe pas déjà

Si le serveur d'accueil nécessite une authentification interactive pour téléverser les clés de signature croisée, OpenClaw essaie d'abord le téléversement sans authentification, puis avec `m.login.dummy`, puis avec `m.login.password` lorsque `channels.matrix.password` est configuré.

Utilisez `--force-reset-cross-signing` uniquement lorsque vous souhaitez intentionnellement supprimer l'identité de signature croisée actuelle et en créer une nouvelle.

Si vous souhaitez intentionnellement abandonner la sauvegarde actuelle des clés de salle et commencer une nouvelle
ligne de base de sauvegarde pour les futurs messages, utilisez `openclaw matrix verify backup reset --yes`.
Ne faites cela que si vous acceptez que l'historique crypté ancien irrécupérable reste
indisponible et que OpenClaw puisse recréer le stockage secret si le secret de sauvegarde
actuel ne peut pas être chargé en toute sécurité.

### Nouvelle ligne de base de sauvegarde

Si vous souhaitez que les futurs messages cryptés continuent de fonctionner et acceptez de perdre l'historique ancien irrécupérable, exécutez ces commandes dans l'ordre :

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Ajoutez `--account <id>` à chaque commande lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

### Comportement au démarrage

Lorsque `encryption: true`, Matrix définit `startupVerification` à `"if-unverified"`.
Au démarrage, si cet appareil est toujours non vérifié, Matrix demandera l'auto-vérification dans un autre client Matrix,
skippa les demandes en double tant qu'une est déjà en attente, et appliquera un temps de recharge local avant de réessayer après des redémarrages.
Les tentatives de demandes échouées réessayent plus tôt que la création réussie de demandes par défaut.
Définissez `startupVerification: "off"` pour désactiver les demandes automatiques au démarrage, ou ajustez `startupVerificationCooldownHours`
si vous souhaitez une fenêtre de réessai plus courte ou plus longue.

Le démarrage effectue également automatiquement une passe d'amorçage cryptographique conservatrice.
Cette passe essaie de réutiliser d'abord le stockage secret actuel et l'identité de signature croisée, et évite de réinitialiser la signature croisée à moins que vous ne exécutiez un flux de réparation d'amorçage explicite.

Si le démarrage détecte un état d'amorçage cassé et que `channels.matrix.password` est configuré, OpenClaw peut tenter un chemin de réparation plus strict.
Si l'appareil actuel est déjà signé par le propriétaire, OpenClaw préserve cette identité au lieu de la réinitialiser automatiquement.

Mise à niveau à partir de l'ancien plugin public Matrix :

- OpenClaw réutilise automatiquement le même compte Matrix, le jeton d'accès et l'identité de l'appareil lorsque cela est possible.
- Avant que toute modification de migration Matrix exploitable ne s'exécute, OpenClaw crée ou réutilise un instantané de récupération sous `~/Backups/openclaw-migrations/`.
- Si vous utilisez plusieurs comptes Matrix, définissez `channels.matrix.defaultAccount` avant de mettre à niveau à partir de l'ancien agencement de stockage plat afin que OpenClaw sache quel compte doit recevoir cet état hérité partagé.
- Si le plugin précédent stockait une clé de déchiffrement de sauvegarde de clés de salle Matrix localement, le démarrage ou `openclaw doctor --fix` l'importera automatiquement dans le nouveau flux de clé de récupération.
- Si le jeton d'accès Matrix a changé après la préparation de la migration, le démarrage scanne désormais les racines de stockage de hachage de jeton sœurs pour un état de restauration hérité en attente avant d'abandonner la restauration automatique de la sauvegarde.
- Si le jeton d'accès Matrix change ultérieurement pour le même compte, le serveur domestique et l'utilisateur, OpenClaw préfère désormais réutiliser la racine de stockage de hachage de jeton existante la plus complète au lieu de commencer à partir d'un répertoire d'état Matrix vide.
- Au prochain démarrage de la passerelle, les clés de salle sauvegardées sont restaurées automatiquement dans le nouveau magasin de chiffrement.
- Si l'ancien plugin avait des clés de salle locales uniquement qui n'ont jamais été sauvegardées, OpenClaw vous avertira clairement. Ces clés ne peuvent pas être exportées automatiquement à partir de l'ancien magasin de chiffrement Rust, donc une partie de l'historique crypté ancien peut rester indisponible jusqu'à ce qu'elle soit récupérée manuellement.
- Voir [Migration Matrix](/en/install/migrating-matrix) pour le flux complet de mise à niveau, les limites, les commandes de récupération et les messages de migration courants.

L'état d'exécution chiffré est organisé sous des racines de hachage de jeton par compte et par utilisateur dans
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ce répertoire contient le magasin de synchronisation (`bot-storage.json`), le magasin de chiffrement (`crypto/`),
le fichier de clé de récupération (`recovery-key.json`), l'instantané IndexedDB (`crypto-idb-snapshot.json`),
les liaisons de thread (`thread-bindings.json`) et l'état de vérification au démarrage (`startup-verification.json`)
lorsque ces fonctionnalités sont utilisées.
Lorsque le jeton change mais que l'identité du compte reste la même, OpenClaw réutilise la meilleure racine existante
pour ce tuple compte/serveur domestique/utilisateur afin que l'état de synchronisation précédent, l'état de chiffrement, les liaisons de thread
et l'état de vérification au démarrage restent visibles.

### Modèle de magasin de chiffrement Node

Le chiffrement de bout en bout Matrix dans ce plugin utilise le chemin de chiffrement Rust officiel `matrix-js-sdk` dans Node.
Ce chemin s'attend à une persistance sauvegardée par IndexedDB lorsque vous souhaitez que l'état de chiffrement survive aux redémarrages.

OpenClaw fournit actuellement cela dans Node par :

- utilisation de `fake-indexeddb` comme shim d'API IndexedDB attendu par le SDK
- restauration du contenu IndexedDB du chiffrement Rust depuis `crypto-idb-snapshot.json` avant `initRustCrypto`
- persistance du contenu mis à jour de l'IndexedDB vers `crypto-idb-snapshot.json` après l'initialisation et pendant l'exécution
- sérialisation de la restauration et de la persistance des instantanés par rapport à `crypto-idb-snapshot.json` avec un verrou de fichier consultatif afin que la persistance de l'exécution de la passerelle et la maintenance CLI n'entrent pas en compétition sur le même fichier d'instantané

Il s'agit de plomberie de compatibilité/stockage, et non d'une implémentation de chiffrement personnalisée.
Le fichier d'instantané est un état d'exécution sensible et est stocké avec des permissions de fichier restrictives.
Selon le modèle de sécurité de OpenClaw, l'hôte de la passerelle et le répertoire d'état local OpenClaw se trouvent déjà dans la limite de confiance de l'opérateur, il s'agit donc principalement d'une préoccupation de durabilité opérationnelle plutôt que d'une limite de confiance distante séparée.

Amélioration prévue :

- ajouter la prise en charge de SecretRef pour le matériel de clé persistant Matrix afin que les clés de récupération et les secrets de chiffrement de stockage associés puissent être provenir des fournisseurs de secrets OpenClaw au lieu de fichiers locaux uniquement

## Gestion du profil

Mettre à jour l'auto-profil Matrix pour le compte sélectionné avec :

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Ajoutez `--account <id>` lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

Matrix accepte les URL d'avatar `mxc://` directement. Lorsque vous transmettez une URL d'avatar `http://` ou `https://`, OpenClaw la télécharge d'abord sur Matrix et stocke l'URL `mxc://` résolue dans `channels.matrix.avatarUrl` (ou le remplacement du compte sélectionné).

## Notifications de vérification automatique

Matrix publie désormais des notifications de cycle de vie de vérification directement dans la salle de vérification DM stricte sous forme de messages `m.notice`.
Cela inclut :

- notifications de demande de vérification
- notifications de vérification prête (avec une instruction explicite « Vérifier par emoji »)
- notifications de début et de fin de vérification
- détails SAS (emoji et décimal) lorsque disponibles

Les demandes de vérification entrantes provenant d'un autre client Matrix sont suivies et acceptées automatiquement par OpenClaw.
Pour les flux d'auto-vérification, OpenClaw lance également automatiquement le flux SAS lorsque la vérification par emoji devient disponible et confirme son propre côté.
Pour les demandes de vérification provenant d'un autre utilisateur/appareil Matrix, OpenClaw accepte automatiquement la demande puis attend que le flux SAS se poursuive normalement.
Vous devez toujours comparer les emojis ou le SAS décimal dans votre client Matrix et confirmer « Ils correspondent » ici pour terminer la vérification.

OpenClaw n'accepte pas aveuglément les flux en double auto-initiés. Le démarrage ignore la création d'une nouvelle demande lorsqu'une demande d'auto-vérification est déjà en attente.

Les notices de protocole/système de vérification ne sont pas transmises au pipeline de discussion de l'agent, elles ne produisent donc pas `NO_REPLY`.

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

### Réparation directe de salon

Si l'état des messages directs se désynchronise, OpenClaw peut se retrouver avec des mappages `m.direct` obsolètes qui pointent vers d'anciens salons solo au lieu du DM en direct. Inspectez le mappage actuel pour un pair avec :

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Réparez-le avec :

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

La réparation conserve la logique spécifique à Matrix dans le plugin :

- elle privilégie un DM 1:1 strict qui est déjà mappé dans `m.direct`
- sinon, elle revient à n'importe quel DM 1:1 strict actuellement rejoint avec cet utilisateur
- si aucun DM sain n'existe, elle crée un nouveau salon direct et réécrit `m.direct` pour pointer vers celui-ci

Le flux de réparation ne supprime pas automatiquement les anciens salons. Il choisit uniquement le DM sain et met à jour le mappage afin que les nouveaux envois Matrix, les notices de vérification et les autres flux de messages directs ciblent à nouveau le bon salon.

## Fils de discussion

Matrix prend en charge les fils de discussion natifs Matrix pour les réponses automatiques ainsi que pour les envois d'outils de message.

- `dm.sessionScope: "per-user"` (par défaut) garde le routage DM Matrix limité à l'expéditeur, de sorte que plusieurs salons DM peuvent partager une seule session lorsqu'ils résolvent au même pair.
- `dm.sessionScope: "per-room"` isole chaque salon DM Matrix dans sa propre clé de session tout en utilisant toujours les vérifications d'authentification et de liste d'autorisation DM normales.
- Les liaisons de conversation explicites Matrix priment toujours sur `dm.sessionScope`, donc les salles et fils liés conservent leur session cible choisie.
- `threadReplies: "off"` conserve les réponses au niveau supérieur et garde les messages entrants en fil sur la session parente.
- `threadReplies: "inbound"` répond à l'intérieur d'un fil uniquement lorsque le message entrant est déjà dans ce fil.
- `threadReplies: "always"` conserve les réponses de salle dans un fil ancré au message déclencheur et achemine cette conversation via la session à portée de fil correspondante issue du premier message déclencheur.
- `dm.threadReplies` remplace le paramètre de niveau supérieur uniquement pour les DMs. Par exemple, vous pouvez isoler les fils de salle tout en gardant les DMs à plat.
- Les messages entrants en fil incluent le message racine du fil comme contexte d'agent supplémentaire.
- Les envois de l'outil de message héritent désormais automatiquement du fil Matrix actuel lorsque la cible est la même salle, ou la même cible d'utilisateur DM, sauf si un `threadId` explicite est fourni.
- La réutilisation de la cible d'utilisateur DM de même session ne s'active que lorsque les métadonnées de la session actuelle prouvent le même DM correspondant sur le même compte Matrix ; sinon OpenClaw revient au routage à portée utilisateur normal.
- Lorsqu'OpenClaw voit une salle DM Matrix entrer en collision avec une autre salle DM sur la même session DM Matrix partagée, il publie un `m.notice` unique dans cette salle avec la `/focus` de secours lorsque les liaisons de fil sont activées et l'indicateur `dm.sessionScope`.
- Les liaisons de fil d'exécution sont prises en charge pour Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` et les `/acp spawn` liées à un fil fonctionnent désormais dans les salles et les DMs Matrix.
- Le `/focus` de salle/DM Matrix de niveau supérieur crée un nouveau fil Matrix et le lie à la session cible lorsqu'il est `threadBindings.spawnSubagentSessions=true`.
- L'exécution de `/focus` ou `/acp spawn --thread here` à l'intérieur d'un fil Matrix existant lie ce fil actuel à la place.

## Liaisons de conversation ACP

Les salles Matrix, les DMs et les fils Matrix existants peuvent être transformés en espaces de travail ACP durables sans changer la surface de chat.

Flux rapide de l'opérateur :

- Exécutez `/acp spawn codex --bind here` dans le MP Matrix, la salle ou le fil de discussion existant que vous souhaitez continuer à utiliser.
- Dans un MP ou une salle Matrix de premier niveau, le MP/la salle actuel reste la surface de discussion et les futurs messages sont routés vers la session ACP générée.
- Dans un fil de discussion Matrix existant, `--bind here` lie ce fil de discussion actuel en place.
- `/new` et `/reset` réinitialisent la même session ACP liée en place.
- `/acp close` ferme la session ACP et supprime la liaison.

Notes :

- `--bind here` ne crée pas de fil de discussion Matrix enfant.
- `threadBindings.spawnAcpSessions` est uniquement requis pour `/acp spawn --thread auto|here`, où OpenClaw doit créer ou lier un fil de discussion Matrix enfant.

### Configuration de liaison de fil de discussion

Matrix hérite des paramètres globaux par défaut de `session.threadBindings`, et prend également en charge les redéfinitions par canal :

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Les indicateurs de génération liés aux fils de discussion Matrix sont opt-in :

- Définissez `threadBindings.spawnSubagentSessions: true` pour autoriser `/focus` de premier niveau à créer et lier de nouveaux fils de discussion Matrix.
- Définissez `threadBindings.spawnAcpSessions: true` pour autoriser `/acp spawn --thread auto|here` à lier les sessions ACP aux fils de discussion Matrix.

## Réactions

Matrix prend en charge les actions de réaction sortantes, les notifications de réaction entrantes et les réactions d'accusé de réception entrantes.

- Les outils de réaction sortante sont limités par `channels["matrix"].actions.reactions`.
- `react` ajoute une réaction à un événement Matrix spécifique.
- `reactions` liste le résumé actuel des réactions pour un événement Matrix spécifique.
- `emoji=""` supprime les propres réactions du compte bot sur cet événement.
- `remove: true` supprime uniquement la réaction emoji spécifiée du compte bot.

Les réactions d'accusé de réception utilisent l'ordre de résolution standard OpenClaw :

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- solution de repli emoji d'identité d'agent

La portée de la réaction d'accusé de réception se résout dans cet ordre :

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

Le mode de notification de réaction est résolu dans cet ordre :

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- par défaut : `own`

Comportement actuel :

- `reactionNotifications: "own"` transmet les événements `m.reaction` ajoutés lorsqu'ils ciblent des messages Matrix créés par le bot.
- `reactionNotifications: "off"` désactive les événements système de réaction.
- Les suppressions de réactions ne sont toujours pas synthétisées en événements système car Matrix les présente sous forme de suppressions (redactions), et non comme des suppressions `m.reaction` autonomes.

## Historique du contexte

- `channels.matrix.historyLimit` contrôle le nombre de messages récents de la salle inclus en tant que `InboundHistory` lorsqu'un message de salle Matrix déclenche l'agent.
- Il revient à `messages.groupChat.historyLimit`. Si les deux ne sont pas définis, la valeur par défaut effective est `0`, donc les messages de salle soumis à mention ne sont pas mis en tampon. Définissez `0` pour désactiver.
- L'historique des salles Matrix est limité à la salle. Les DMs continuent d'utiliser l'historique de session normal.
- L'historique des salles Matrix est en attente uniquement : OpenClaw met en tampon les messages de salle qui n'ont pas encore déclenché de réponse, puis capture cette fenêtre lorsqu'une mention ou un autre déclencheur arrive.
- Le message déclencheur actuel n'est pas inclus dans `InboundHistory` ; il reste dans le corps entrant principal pour ce tour.
- Les nouvelles tentatives du même événement Matrix réutilisent la capture d'historique originale au lieu de dériver vers des messages de salle plus récents.

## Visibilité du contexte

Matrix prend en charge le contrôle partagé `contextVisibility` pour le contexte supplémentaire de la salle, tel que le texte de réponse récupéré, les racines de fils de discussion et l'historique en attente.

- `contextVisibility: "all"` est la valeur par défaut. Le contexte supplémentaire est conservé tel qu'il a été reçu.
- `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés par les vérifications actives de la liste blanche de salle/utilisateur.
- `contextVisibility: "allowlist_quote"` se comporte comme `allowlist`, mais conserve toujours une réponse citée explicite.

Ce paramètre affecte la visibilité du contexte supplémentaire, et non le fait que le message entrant lui-même peut déclencher une réponse.
L'autorisation de déclenchement provient toujours de `groupPolicy`, `groups`, `groupAllowFrom`, et des paramètres de politique de DM.

## Exemple de politique pour les DM et les salons

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

Voir [Groups](/en/channels/groups) pour le comportement de filtrage des mentions et des listes d'autorisation.

Exemple d'appairage pour les DM Matrix :

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un utilisateur Matrix non approuvé continue à vous envoyer des messages avant l'approbation, OpenClaw réutilise le même code d'appairage en attente et peut envoyer une réponse de rappel après un court délai de recharge au lieu de générer un nouveau code.

Voir [Pairing](/en/channels/pairing) pour le flux d'appairage DM partagé et la disposition du stockage.

## Approbations Exec

Matrix peut agir en tant que client d'approbation natif pour un compte Matrix. Les boutons de routage natifs DM/channel se trouvent toujours sous la configuration d'approbation exec :

- `channels.matrix.execApprovals.enabled`
- `channels.matrix.execApprovals.approvers` (facultatif ; revient à `channels.matrix.dm.allowFrom`)
- `channels.matrix.execApprovals.target` (`dm` | `channel` | `both`, par défaut : `dm`)
- `channels.matrix.execApprovals.agentFilter`
- `channels.matrix.execApprovals.sessionFilter`

Les approbateurs doivent être des ID d'utilisateur Matrix tels que `@owner:example.org`. Matrix active automatiquement les approbations natives lorsque `enabled` n'est pas défini ou `"auto"` et qu'au moins un approbateur peut être résolu. Les approbations Exec utilisent `execApprovals.approvers` en premier et peuvent revenir à `channels.matrix.dm.allowFrom`. Les approbations de plugin s'autorisent via `channels.matrix.dm.allowFrom`. Définissez `enabled: false` pour désactiver explicitement Matrix en tant que client d'approbation natif. Sinon, les demandes d'approbation reviennent aux autres routes d'approbation configurées ou à la politique de repli d'approbation.

Le routage natif Matrix prend désormais en charge les deux types d'approbation :

- `channels.matrix.execApprovals.*` contrôle le mode de diffusion natif DM/channel pour les invites d'approbation Matrix.
- Les approbations Exec utilisent l'ensemble d'approbateurs exec défini par `execApprovals.approvers` ou `channels.matrix.dm.allowFrom`.
- Les approbations de plugin utilisent la liste d'autorisation DM Matrix à partir de `channels.matrix.dm.allowFrom`.
- Les raccourcis de réaction Matrix et les mises à jour de messages s'appliquent aux approbations exec et plugin.

Règles de diffusion :

- `target: "dm"` envoie les invites d'approbation aux DM des approbateurs
- `target: "channel"` renvoie l'invite à la salle Matrix d'origine ou au DM
- `target: "both"` envoie aux DM des approbateurs et à la salle Matrix d'origine ou au DM

Les invites d'approbation Matrix amorcent les raccourcis de réaction sur le message d'approbation principal :

- `✅` = autoriser une fois
- `❌` = refuser
- `♾️` = autoriser toujours lorsque cette décision est autorisée par la politique exec effective

Les approbateurs peuvent réagir à ce message ou utiliser les commandes slash de repli : `/approve <id> allow-once`, `/approve <id> allow-always` ou `/approve <id> deny`.

Seuls les approbateurs résolus peuvent approuver ou refuser. Pour les approbations exec, la diffusion de channel inclut le texte de la commande, n'activez donc `channel` ou `both` que dans les salles de confiance.

Les invites d'approbation Matrix réutilisent le planificateur d'approbation central partagé. La surface native spécifique à Matrix gère le routage salle/DM, les réactions et le comportement d'envoi/mise à jour/suppression de messages pour les approbations exec et plugin.

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

Les valeurs `channels.matrix` de premier niveau servent de valeurs par défaut pour les comptes nommés, sauf si un compte les remplace.
Vous pouvez limiter les entrées de salles héritées à un compte Matrix avec `groups.<room>.account` (ou l'ancien `rooms.<room>.account`).
Les entrées sans `account` restent partagées entre tous les comptes Matrix, et les entrées avec `account: "default"` fonctionnent toujours lorsque le compte par défaut est configuré directement au niveau supérieur `channels.matrix.*`.
Les valeurs par défaut d'authentification partagée partielles ne créent pas par elles-mêmes un compte par défaut implicite séparé. OpenClaw ne synthétise le compte `default` de premier niveau que lorsque cette valeur par défaut dispose d'une authentification fraîche (`homeserver` plus `accessToken`, ou `homeserver` plus `userId` et `password`) ; les comptes nommés peuvent rester détectables à partir de `homeserver` plus `userId` lorsque les informations d'identification en cache satisfont l'authentification ultérieurement.
Si Matrix possède déjà exactement un compte nommé, ou si `defaultAccount` pointe vers une clé de compte nommé existante, la promotion de réparation/configuration de compte unique vers compte multiple préserve ce compte au lieu de créer une nouvelle entrée `accounts.default`. Seules les clés d'authentification/amorçage Matrix sont déplacées vers ce compte promu ; les clés de stratégie de livraison partagées restent au niveau supérieur.
Définissez `defaultAccount` lorsque vous souhaitez que OpenClaw préfère un compte Matrix nommé pour le routage implicite, la sonde et les opérations CLI.
Si vous configurez plusieurs comptes nommés, définissez `defaultAccount` ou passez `--account <id>` pour les commandes CLI qui dépendent de la sélection implicite de compte.
Passez `--account <id>` à `openclaw matrix verify ...` et `openclaw matrix devices ...` lorsque vous souhaitez remplacer cette sélection implicite pour une commande.

## Serveurs domestiques privés/LAN

Par défaut, OpenClaw bloque les serveurs domestiques Matrix privés/internes pour la protection SSRF, sauf si vous
optez explicitement pour chaque compte.

Si votre serveur domestique s'exécute sur localhost, une IP LAN/Tailscale ou un nom d'hôte interne, activez
`network.dangerouslyAllowPrivateNetwork` pour ce compte Matrix :

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

Cette option autorise uniquement les cibles privées/internal de confiance. Les serveurs de domiciliation publics en clair tels que
`http://matrix.example.org:8008` restent bloqués. Privilégiez `https://` dans la mesure du possible.

## Proxy du trafic Matrix

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

- Les recherches d'utilisateurs interrogent l'annuaire des utilisateurs Matrix sur ce serveur de domiciliation.
- Les recherches de salles acceptent directement les ID et alias de salle explicites, puis se rabattent sur la recherche des noms de salle rejoints pour ce compte.
- La recherche de nom de salle rejointée est effectuée au mieux. Si un nom de salle ne peut pas être résolu en ID ou alias, il est ignoré lors de la résolution de la liste d'autorisation d'exécution.

## Référence de configuration

- `enabled` : activer ou désactiver le canal.
- `name` : étiquette facultative pour le compte.
- `defaultAccount` : ID de compte préféré lorsque plusieurs comptes Matrix sont configurés.
- `homeserver` : URL du serveur de domiciliation, par exemple `https://matrix.example.org`.
- `network.dangerouslyAllowPrivateNetwork` : autoriser ce compte Matrix à se connecter à des serveurs de domiciliation privés/internal. Activez cette option lorsque le serveur de domiciliation résout vers `localhost`, une IP LAN/Tailscale, ou un hôte interne tel que `matrix-synapse`.
- `proxy` : URL de proxy HTTP(S) facultative pour le trafic Matrix. Les comptes nommés peuvent remplacer la valeur par défaut de niveau supérieur par leur propre `proxy`.
- `userId` : identifiant utilisateur complet Matrix, par exemple `@bot:example.org`.
- `accessToken` : jeton d'accès pour l'authentification par jeton. Les valeurs en texte brut et SecretRef sont prises en charge pour `channels.matrix.accessToken` et `channels.matrix.accounts.<id>.accessToken` sur les fournisseurs env/file/exec. Voir [Gestion des secrets](/en/gateway/secrets).
- `password` : mot de passe pour la connexion par mot de passe. Les valeurs en texte brut et SecretRef sont prises en charge.
- `deviceId` : identifiant d'appareil explicite Matrix.
- `deviceName` : nom d'affichage de l'appareil pour la connexion par mot de passe.
- `avatarUrl` : URL de l'auto-avatar stockée pour la synchronisation du profil et les mises à jour `set-profile`.
- `initialSyncLimit` : limite d'événements de synchronisation au démarrage.
- `encryption` : activer le chiffrement de bout en bout (E2EE).
- `allowlistOnly` : forcer le comportement uniquement liste d'autorisation pour les DMs et les salons.
- `allowBots` : autoriser les messages provenant d'autres comptes OpenClaw Matrix configurés (`true` ou `"mentions"`).
- `groupPolicy` : `open`, `allowlist`, ou `disabled`.
- `contextVisibility` : mode de visibilité du contexte de salon supplémentaire (`all`, `allowlist`, `allowlist_quote`).
- `groupAllowFrom` : liste d'autorisation des identifiants utilisateurs pour le trafic du salon.
- Les entrées `groupAllowFrom` doivent être des identifiants utilisateur complets Matrix. Les noms non résolus sont ignorés lors de l'exécution.
- `historyLimit` : nombre maximum de messages de salon à inclure en tant que contexte d'historique de groupe. Se rabat sur `messages.groupChat.historyLimit` ; si les deux ne sont pas définis, la valeur par défaut effective est `0`. Définissez `0` pour désactiver.
- `replyToMode` : `off`, `first`, `all`, ou `batched`.
- `markdown` : configuration optionnelle du rendu Markdown pour le texte sortant Matrix.
- `streaming` : `off` (par défaut), `partial`, `quiet`, `true` ou `false`. `partial` et `true` activent les mises à jour de brouillon avec aperçu prioritaire via des messages texte Matrix normaux. `quiet` utilise des avis d'aperçu sans notification pour les configurations de règles de_push en auto-hébergement.
- `blockStreaming` : `true` active des messages de progression distincts pour les blocs d'assistant terminés pendant que le streaming d'aperçu de brouillon est actif.
- `threadReplies` : `off`, `inbound` ou `always`.
- `threadBindings` : substitutions par canal pour le routage et le cycle de vie des sessions liées aux fils de discussion.
- `startupVerification` : mode de demande de vérification automatique au démarrage (`if-unverified`, `off`).
- `startupVerificationCooldownHours` : délai avant de réessayer les demandes de vérification automatique au démarrage.
- `textChunkLimit` : taille des blocs de messages sortants.
- `chunkMode` : `length` ou `newline`.
- `responsePrefix` : préfixe de message optionnel pour les réponses sortantes.
- `ackReaction` : substitution de réaction d'accusé de réception optionnelle pour ce canal/compte.
- `ackReactionScope` : substitution de la portée de la réaction d'accusé de réception optionnelle (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications` : mode de notification de réaction entrante (`own`, `off`).
- `mediaMaxMb` : limite de taille des médias en Mo pour la gestion des médias Matrix. Elle s'applique aux envois sortants et au traitement des médias entrants.
- `autoJoin` : politique d'adhésion automatique aux invitations (`always`, `allowlist`, `off`). Défaut : `off`. Cela s'applique aux invitations Matrix en général, y compris les invitations de type DM, et pas seulement aux invitations de salon/groupe. OpenClaw prend cette décision au moment de l'invitation, avant de pouvoir classer de manière fiable le salon rejoint comme une DM ou un groupe.
- `autoJoinAllowlist` : salons/alias autorisés lorsque `autoJoin` est `allowlist`. Les entrées d'alias sont résolues en ID de salon lors du traitement de l'invitation ; OpenClaw ne fait pas confiance à l'état de l'alias revendiqué par le salon invité.
- `dm` : bloc de stratégie DM (`enabled`, `policy`, `allowFrom`, `sessionScope`, `threadReplies`).
- `dm.policy` : contrôle l'accès DM une fois que OpenClaw a rejoint le salon et l'a classé comme une DM. Cela ne change pas le fait qu'une invitation soit acceptée automatiquement.
- Les entrées `dm.allowFrom` doivent être des IDs utilisateur Matrix complets, sauf si vous les avez déjà résolus via une recherche en direct dans l'annuaire.
- `dm.sessionScope` : `per-user` (par défaut) ou `per-room`. Utilisez `per-room` lorsque vous voulez que chaque salon DM Matrix conserve un contexte distinct, même si l'interlocuteur est le même.
- `dm.threadReplies` : substitution de la stratégie de fil de discussion uniquement pour les DM (`off`, `inbound`, `always`). Elle remplace le paramètre de niveau supérieur `threadReplies` à la fois pour le placement des réponses et l'isolement de session dans les DM.
- `execApprovals` : livraison d'approbation d'exécution native Matrix (`enabled`, `approvers`, `target`, `agentFilter`, `sessionFilter`).
- `execApprovals.approvers` : IDs utilisateur Matrix autorisés à approuver les demandes d'exécution. Facultatif lorsque `dm.allowFrom` identifie déjà les approbateurs.
- `execApprovals.target` : `dm | channel | both` (par défaut : `dm`).
- `accounts` : substitutions nommées par compte. Les valeurs `channels.matrix` de premier niveau servent de valeurs par défaut pour ces entrées.
- `groups` : carte de stratégies par salle. Privilégiez les identifiants ou les alias de salle ; les noms de salle non résolus sont ignorés lors de l'exécution. L'identité de session/groupe utilise l'identifiant stable de la salle après résolution, tandis que les étiquettes lisibles par l'homme proviennent toujours des noms de salle.
- `groups.<room>.account` : restreindre une entrée de salle héritée à un compte Matrix spécifique dans les configurations multi-comptes.
- `groups.<room>.allowBots` : substitution au niveau de la salle pour les expéditeurs de bot configurés (`true` ou `"mentions"`).
- `groups.<room>.users` : liste d'autorisation d'expéditeurs par salle.
- `groups.<room>.tools` : substitutions d'autorisation/refus d'outils par salle.
- `groups.<room>.autoReply` : substitution de filtrage par mention au niveau de la salle. `true` désactive les exigences de mention pour cette salle ; `false` les réactive.
- `groups.<room>.skills` : filtre de compétence optionnel au niveau de la salle.
- `groups.<room>.systemPrompt` : extrait d'invite système optionnel au niveau de la salle.
- `rooms` : ancien alias pour `groups`.
- `actions` : filtrage d'outils par action (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).

## Connexes

- [Aperçu des canaux](/en/channels) — tous les canaux pris en charge
- [Appairage](/en/channels/pairing) — authentification par DM et flux d'appairage
- [Groupes](/en/channels/groups) — comportement du chat de groupe et filtrage par mention
- [Routage de canal](/en/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/en/gateway/security) — modèle d'accès et durcissement
