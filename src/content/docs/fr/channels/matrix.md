---
summary: "Statut du support Matrix, configuration et exemples de configuration"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (plugin)

Matrix est le plugin de canal Matrix pour OpenClaw.
Il utilise le `matrix-js-sdk` officiel et prend en charge les DMs, les salons, les fils, les médias, les réactions, les sondages, la localisation et E2EE.

## Plugin requis

Matrix est un plugin et n'est pas inclus avec le cœur d'OpenClaw.

Installer depuis npm :

```bash
openclaw plugins install @openclaw/matrix
```

Installer depuis une copie locale :

```bash
openclaw plugins install ./extensions/matrix
```

Voir [Plugins](/fr/tools/plugin) pour le comportement des plugins et les règles d'installation.

## Configuration

1. Installez le plugin.
2. Créez un compte Matrix sur votre serveur d'accueil.
3. Configurez `channels.matrix` avec soit :
   - `homeserver` + `accessToken`, ou
   - `homeserver` + `userId` + `password`.
4. Redémarrez la passerelle.
5. Démarrez un DM avec le bot ou invitez-le dans un salon.

Chemins de configuration interactifs :

```bash
openclaw channels add
openclaw configure --section channels
```

Ce que l'assistant Matrix demande réellement :

- URL du serveur d'accueil
- méthode d'authentification : jeton d'accès ou mot de passe
- ID utilisateur uniquement lorsque vous choisissez l'authentification par mot de passe
- nom d'appareil facultatif
- s'il faut activer E2EE
- s'il faut configurer l'accès aux salons Matrix maintenant

Comportement important de l'assistant :

- Si les variables d'environnement d'authentification Matrix existent déjà pour le compte sélectionné et que ce compte n'a pas déjà d'authentification sauvegardée dans la configuration, l'assistant propose un raccourci d'environnement et n'écrit que `enabled: true` pour ce compte.
- Lorsque vous ajoutez un autre compte Matrix de manière interactive, le nom de compte saisi est normalisé dans l'ID de compte utilisé dans la configuration et les variables d'environnement. Par exemple, `Ops Bot` devient `ops-bot`.
- Les invites de liste d'autorisation DM acceptent immédiatement les valeurs `@user:server` complètes. Les noms d'affichage ne fonctionnent que si la recherche en direct dans l'annuaire trouve une correspondance exacte ; sinon, l'assistant vous demande de réessayer avec un ID Matrix complet.
- Les invites de liste d'autorisation de salon acceptent directement les ID de salon et les alias. Ils peuvent également résoudre les noms de salons rejoints en direct, mais les noms non résolus ne sont conservés tels qu'ils ont été saisis lors de la configuration et sont ignorés plus tard par la résolution de la liste d'autorisation au moment de l'exécution. Préférez `!room:server` ou `#alias:server`.
- L'identité de salle/session d'exécution utilise l'ID de salle stable Matrix. Les alias déclarés par la salle sont utilisés uniquement comme entrées de recherche, et non comme clé de session à long terme ou identité de groupe stable.
- Pour résoudre les noms de salle avant de les enregistrer, utilisez `openclaw channels resolve --channel matrix "Project Room"`.

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

Équivalents de variables d'environnement (utilisés lorsque la clé de configuration n'est pas définie) :

- `MATRIX_HOMESERVER`
- `MATRIX_ACCESS_TOKEN`
- `MATRIX_USER_ID`
- `MATRIX_PASSWORD`
- `MATRIX_DEVICE_ID`
- `MATRIX_DEVICE_NAME`

Pour les comptes non par défaut, utilisez des variables d'environnement avec portée de compte :

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

- `MATRIX_OPS_BOT_HOMESERVER`
- `MATRIX_OPS_BOT_ACCESS_TOKEN`

L'assistant interactif propose le raccourci de variable d'environnement uniquement lorsque ces variables d'environnement d'authentification sont déjà présentes et que le compte sélectionné n'a pas déjà d'authentification Matrix enregistrée dans la configuration.

## Exemple de configuration

Il s'agit d'une configuration de base pratique avec l'appairage DM, la liste d'autorisation des salles et l'E2EE activé :

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
    },
  },
}
```

## Configuration de l'E2EE

## Salles de bot à bot

Par défaut, les messages Matrix provenant d'autres comptes OpenClaw Matrix configurés sont ignorés.

Utilisez `allowBots` lorsque vous souhaitez intentionnellement le trafic Matrix inter-agent :

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

- `allowBots: true` accepte les messages d'autres comptes bot Matrix configurés dans les salles autorisées et les DMs.
- `allowBots: "mentions"` n'accepte ces messages que lorsqu'ils mentionnent visiblement ce bot dans les salles. Les DMs sont toujours autorisés.
- `groups.<room>.allowBots` remplace le paramètre au niveau du compte pour une salle.
- OpenClaw ignore toujours les messages provenant du même ID utilisateur Matrix pour éviter les boucles de réponse automatique.
- Matrix n'expose pas ici de flag de bot natif ; OpenClaw traite « rédigé par un bot » comme « envoyé par un autre compte Matrix configuré sur cette passerelle OpenClaw ».

Utilisez des listes d'autorisation de salles strictes et des exigences de mention lors de l'activation du trafic bot-à-bot dans les salons partagés.

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

Vérifier le statut de vérification :

```bash
openclaw matrix verify status
```

Statut détaillé (diagnostics complets) :

```bash
openclaw matrix verify status --verbose
```

Inclure la clé de récupération stockée dans la sortie lisible par machine :

```bash
openclaw matrix verify status --include-recovery-key --json
```

Initialiser la signature croisée et l'état de vérification :

```bash
openclaw matrix verify bootstrap
```

Support multi-compte : utilisez `channels.matrix.accounts` avec des identifiants par compte et `name` en option. Voir [Référence de configuration](/fr/gateway/configuration-reference#multi-account-all-channels) pour le modèle partagé.

Diagnostics d'initialisation détaillés :

```bash
openclaw matrix verify bootstrap --verbose
```

Forcer une réinitialisation fraîche de l'identité de signature croisée avant l'initialisation :

```bash
openclaw matrix verify bootstrap --force-reset-cross-signing
```

Vérifier cet appareil avec une clé de récupération :

```bash
openclaw matrix verify device "<your-recovery-key>"
```

Détails de vérification d'appareil détaillés :

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

Restaurer les clés de salon depuis la sauvegarde serveur :

```bash
openclaw matrix verify backup restore
```

Diagnostics de restauration détaillés :

```bash
openclaw matrix verify backup restore --verbose
```

Supprimer la sauvegarde serveur actuelle et créer une nouvelle base de sauvegarde :

```bash
openclaw matrix verify backup reset --yes
```

Toutes les commandes `verify` sont concises par défaut (y compris avec la journalisation interne calme du SDK) et n'affichent des diagnostics détaillés qu'avec `--verbose`.
Utilisez `--json` pour une sortie complète lisible par machine lors de scripts.

Dans les configurations multi-comptes, les commandes Matrix CLI utilisent le compte Matrix par défaut implicite, sauf si vous passez `--account <id>`.
Si vous configurez plusieurs comptes nommés, définissez `channels.matrix.defaultAccount` d'abord, sinon ces opérations CLI implicites s'arrêteront et vous demanderont de choisir explicitement un compte.
Utilisez `--account` chaque fois que vous souhaitez que les opérations de vérification ou d'appareil ciblent explicitement un compte nommé :

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

Lorsque le chiffrement est désactivé ou indisponible pour un compte nommé, les avertissements Matrix et les erreurs de vérification pointent vers la clé de configuration de ce compte, par exemple `channels.matrix.accounts.assistant.encryption`.

### Que signifie « vérifié »

OpenClaw traite cet appareil Matrix comme vérifié uniquement s'il est vérifié par votre propre identité de signature croisée.
En pratique, `openclaw matrix verify status --verbose` expose trois signaux de confiance :

- `Locally trusted` : cet appareil est approuvé par le client actuel uniquement
- `Cross-signing verified` : le SDK signale l'appareil comme vérifié via la signature croisée
- `Signed by owner` : l'appareil est signé par votre propre clé d'auto-signature

`Verified by owner` devient `yes` uniquement lorsque la vérification par signature croisée ou la signature par le propriétaire est présente.
La confiance locale seule ne suffit pas pour qu'OpenClaw considère l'appareil comme entièrement vérifié.

### Ce que fait l'amorçage (bootstrap)

`openclaw matrix verify bootstrap` est la commande de réparation et de configuration pour les comptes Matrix chiffrés.
Elle effectue toutes les opérations suivantes dans l'ordre :

- amorce le stockage des secrets, en réutilisant une clé de récupération existante si possible
- amorce la signature croisée et téléverse les clés publiques de signature croisée manquantes
- tente de marquer et de signer croisée l'appareil actuel
- crée une nouvelle sauvegarde de clés de salon côté serveur si elle n'existe pas déjà

Si le serveur domestique nécessite une authentification interactive pour téléverser les clés de signature croisée, OpenClaw essaie d'abord le téléversement sans authentification, puis avec `m.login.dummy`, puis avec `m.login.password` lorsque `channels.matrix.password` est configuré.

Utilisez `--force-reset-cross-signing` uniquement lorsque vous souhaitez intentionnellement supprimer l'identité de signature croisée actuelle et en créer une nouvelle.

Si vous souhaitez intentionnellement supprimer la sauvegarde actuelle des clés de salon et commencer une nouvelle ligne de base de sauvegarde pour les futurs messages, utilisez `openclaw matrix verify backup reset --yes`.
Faites ceci uniquement si vous acceptez que l'historique chiffré ancien non récupérable restera indisponible.

### Nouvelle ligne de base de sauvegarde

Si vous souhaitez que les futurs messages chiffrés continuent de fonctionner et acceptez de perdre l'historique ancien non récupérable, exécutez ces commandes dans l'ordre :

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Ajoutez `--account <id>` à chaque commande lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

### Comportement au démarrage

Lorsque `encryption: true`, Matrix définit `startupVerification` à `"if-unverified"` par défaut.
Au démarrage, si cet appareil n'est toujours pas vérifié, Matrix demandera l'auto-vérification dans un autre client Matrix,
ignorera les demandes en double tant qu'une est déjà en attente, et appliquera un temps d'attente local avant de réessayer après les redémarrages.
Par défaut, les tentatives de demande échouées réessayent plus tôt que la création réussie d'une demande.
Définissez `startupVerification: "off"` pour désactiver les demandes automatiques au démarrage, ou ajustez `startupVerificationCooldownHours`
si vous souhaitez une fenêtre de réessai plus courte ou plus longue.

Le démarrage effectue également automatiquement une passe d'amorçage crypto conservatrice.
Cette passe essaie d'abord de réutiliser le stockage de secrets actuel et l'identité de signature croisée, et évite de réinitialiser la signature croisée sauf si vous exécutez un flux de réparation d'amorçage explicite.

Si le démarrage détecte un état d'amorçage cassé et que `channels.matrix.password` est configuré, OpenClaw peut tenter une voie de réparation plus stricte.
Si l'appareil actuel est déjà signé par le propriétaire, OpenClaw conserve cette identité au lieu de la réinitialiser automatiquement.

Mise à niveau à partir du plugin Matrix public précédent :

- OpenClaw réutilise automatiquement le même compte Matrix, le même jeton d'accès et la même identité d'appareil lorsque cela est possible.
- Avant que toute modification de migration Matrix actionnable ne s'exécute, OpenClaw crée ou réutilise un instantané de récupération sous `~/Backups/openclaw-migrations/`.
- Si vous utilisez plusieurs comptes Matrix, définissez `channels.matrix.defaultAccount` avant la mise à niveau à partir de l'ancienne structure de stockage plat afin qu'OpenClaw sache quel compte doit recevoir cet état hérité partagé.
- Si le plugin précédent a stocké une clé de déchiffrement de sauvegarde de clés de salle Matrix localement, le démarrage ou `openclaw doctor --fix` l'importera automatiquement dans le nouveau flux de clé de récupération.
- Si le jeton d'accès Matrix a changé après la préparation de la migration, le démarrage analyse désormais les racines de stockage de hachage de jeton sœurs pour l'état de restauration hérité en attente avant d'abandonner la restauration automatique de la sauvegarde.
- Si le jeton d'accès Matrix change ultérieurement pour le même compte, le serveur domestique et l'utilisateur, OpenClaw préfère désormais réutiliser la racine de stockage de hachage de jeton existante la plus complète au lieu de repartir d'un répertoire d'état Matrix vide.
- Au prochain démarrage de la passerelle, les clés de salle sauvegardées sont restaurées automatiquement dans le nouveau magasin de chiffrement.
- Si l'ancien plugin avait des clés de salle locales uniquement qui n'avaient jamais été sauvegardées, OpenClaw vous avertira clairement. Ces clés ne peuvent pas être exportées automatiquement depuis le précédent magasin de chiffrement rust, donc certains anciens historiques chiffrés peuvent rester indisponibles jusqu'à ce qu'ils soient récupérés manuellement.
- Voir [Matrix migration](/fr/install/migrating-matrix) pour le processus complet de mise à niveau, les limites, les commandes de récupération et les messages de migration courants.

L'état d'exécution chiffré est organisé sous des racines par compte et par hachage de jeton d'utilisateur dans
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ce répertoire contient le magasin de synchronisation (`bot-storage.json`), le magasin de chiffrement (`crypto/`),
le fichier de clé de récupération (`recovery-key.json`), l'instantané IndexedDB (`crypto-idb-snapshot.json`),
les liaisons de threads (`thread-bindings.json`) et l'état de vérification au démarrage (`startup-verification.json`)
lorsque ces fonctionnalités sont utilisées.
Lorsque le jeton change mais que l'identité du compte reste la même, OpenClaw réutilise la meilleure racine
existante pour ce tuple compte/serveur domestique/utilisateur afin que l'état de synchronisation précédent, l'état de chiffrement, les liaisons de threads
et l'état de vérification au démarrage restent visibles.

### Modèle de magasin de chiffrement Node

Le chiffrement de bout en bout (E2EE) Matrix dans ce plugin utilise le chemin officiel de chiffrement Rust `matrix-js-sdk` dans Node.
Ce chemin attend une persistance sauvegardée par IndexedDB lorsque vous voulez que l'état de chiffrement survive aux redémarrages.

OpenClaw fournit actuellement cela dans Node par :

- en utilisant `fake-indexeddb` comme le shim d'API IndexedDB attendu par le SDK
- en restaurant le contenu IndexedDB du chiffrement Rust à partir de `crypto-idb-snapshot.json` avant `initRustCrypto`
- en persistant le contenu IndexedDB mis à jour vers `crypto-idb-snapshot.json` après l'initialisation et pendant l'exécution

Il s'agit de plomberie de compatibilité/stockage, et non d'une implémentation de chiffrement personnalisée.
Le fichier d'instantané est un état d'exécution sensible et est stocké avec des autorisations de fichier restrictives.
Dans le modèle de sécurité de OpenClaw, l'hôte de la passerelle et le répertoire d'état local OpenClaw se trouvent déjà dans la limite de confiance de l'opérateur, il s'agit donc principalement d'une préoccupation de durabilité opérationnelle plutôt que d'une limite de confiance distante séparée.

Amélioration prévue :

- ajouter la prise en charge de SecretRef pour le matériel de clé Matrix persistant afin que les clés de récupération et les secrets de chiffrement du magasin associés puissent être issus des fournisseurs de secrets OpenClaw au lieu de fichiers locaux uniquement

## Notifications de vérification automatique

Matrix publie désormais des notifications de cycle de vie de vérification directement dans la salle de vérification DM stricte sous forme de messages `m.notice`.
Cela comprend :

- notifications de demande de vérification
- notifications de vérification prête (avec des instructions explicites « Vérifier par emoji »)
- notifications de début et de fin de vérification
- détails SAS (emoji et décimal) lorsque disponibles

Les demandes de vérification entrantes d'un autre client Matrix sont suivies et automatiquement acceptées par OpenClaw.
Pour les flux d'auto-vérification, OpenClaw lance également automatiquement le flux SAS lorsque la vérification par emoji devient disponible et confirme son propre côté.
Pour les demandes de vérification d'un autre utilisateur/appareil Matrix, OpenClaw accepte automatiquement la demande puis attend que le flux SAS se poursuive normalement.
Vous devez toujours comparer l'emoji ou le décimal SAS dans votre client Matrix et confirmer « Ils correspondent » ici pour terminer la vérification.

OpenClaw n'accepte pas aveuglément les flux en double auto-initiés. Le démarrage ignore la création d'une nouvelle demande lorsqu'une demande d'auto-vérification est déjà en attente.

Les notifications de protocole/système de vérification ne sont pas transmises au pipeline de discussion de l'agent, elles ne produisent donc pas `NO_REPLY`.

### Hygiène des appareils

Les anciens appareils Matrix gérés par OpenClaw peuvent s'accumuler sur le compte et rendre plus difficile la compréhension de la confiance dans les salons chiffrés.
Listez-les avec :

```bash
openclaw matrix devices list
```

Supprimez les appareils périmés gérés par OpenClaw avec :

```bash
openclaw matrix devices prune-stale
```

### Réparation de salon direct

Si l'état des messages directs (DM) se désynchronise, OpenClaw peut se retrouver avec des mappages `m.direct` périmés qui pointent vers d'anciens salons en solo au lieu du DM actif. Inspectez le mappage actuel pour un pair avec :

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

Le flux de réparation ne supprime pas automatiquement les anciens salons. Il ne sélectionne que la DM saine et met à jour le mappage afin que les nouveaux envois Matrix, les notifications de vérification et les autres flux de messages directs ciblent à nouveau le bon salon.

## Fil de discussion

Matrix prend en charge les fils de discussion natifs Matrix pour les réponses automatiques ainsi que pour les envois via l'outil de message.

- `threadReplies: "off"` garde les réponses au niveau supérieur.
- `threadReplies: "inbound"` répond dans un fil de discussion uniquement lorsque le message entrant figurait déjà dans ce fil.
- `threadReplies: "always"` conserve les réponses du salon dans un fil ancré au message déclencheur.
- Les messages entrants dans un fil incluent le message racine du fil comme contexte supplémentaire pour l'agent.
- Les envois via l'outil de message héritent désormais automatiquement du fil Matrix actuel lorsque la cible est le même salon ou le même utilisateur en DM, sauf si un `threadId` explicite est fourni.
- Les liaisons de fils à l'exécution sont prises en charge pour Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` et `/acp spawn` liés à un fil fonctionnent désormais dans les salons et les DM Matrix.
- Un `/focus` de salon/DM Matrix de niveau supérieur crée un nouveau fil Matrix et le lie à la session cible lorsque `threadBindings.spawnSubagentSessions=true`.
- L'exécution de `/focus` ou `/acp spawn --thread here` dans un fil Matrix existant lie à la place le fil actuel.

### Configuration de liaison de fil

Matrix hérite des valeurs globales par défaut de `session.threadBindings` et prend également en charge les substitutions par canal :

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Les indicateurs de génération liés aux fils Matrix sont opt-in :

- Définissez `threadBindings.spawnSubagentSessions: true` pour permettre à `/focus` de niveau supérieur de créer et lier de nouveaux fils Matrix.
- Définissez `threadBindings.spawnAcpSessions: true` pour permettre à `/acp spawn --thread auto|here` de lier les sessions ACP aux fils Matrix.

## Réactions

Matrix prend en charge les actions de réaction sortantes, les notifications de réaction entrantes et les réactions d'accusé de réception entrantes.

- Les outils de réaction sortants sont contrôlés par `channels["matrix"].actions.reactions`.
- `react` ajoute une réaction à un événement Matrix spécifique.
- `reactions` liste le résumé actuel des réactions pour un événement Matrix spécifique.
- `emoji=""` supprime les propres réactions du compte bot sur cet événement.
- `remove: true` supprime uniquement la réaction emoji spécifiée du compte bot.

Les réactions d'accusé de réception utilisent l'ordre de résolution standard OpenClaw :

- `channels["matrix"].accounts.<accountId>.ackReaction`
- `channels["matrix"].ackReaction`
- `messages.ackReaction`
- secours pour emoji d'identité d'agent

La portée de la réaction d'accusé de réception se résout dans cet ordre :

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

Le mode de notification de réaction se résout dans cet ordre :

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- par défaut : `own`

Comportement actuel :

- `reactionNotifications: "own"` transfère les événements `m.reaction` ajoutés lorsqu'ils ciblent des messages Matrix créés par le bot.
- `reactionNotifications: "off"` désactive les événements système de réaction.
- Les suppressions de réactions ne sont toujours pas synthétisées en événements système car Matrix les présente comme des rédactions, et non comme des suppressions `m.reaction` autonomes.

## Exemple de politique pour les DMs et les salons

```json5
{
  channels: {
    matrix: {
      dm: {
        policy: "allowlist",
        allowFrom: ["@admin:example.org"],
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

Voir [Groupes](/fr/channels/groups) pour le comportement de restriction des mentions et de la liste d'autorisation.

Exemple d'appairage pour les DMs Matrix :

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un utilisateur Matrix non approuvé continue à vous envoyer des messages avant l'approbation, OpenClaw réutilise le même code d'appairage en attente et peut envoyer une réponse de rappel après un court délai de recharge au lieu de créer un nouveau code.

Voir [Appairage](/fr/channels/pairing) pour le flux d'appairage DM partagé et la disposition du stockage.

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
          },
        },
      },
    },
  },
}
```

Les valeurs `channels.matrix` de niveau supérieur servent de valeurs par défaut pour les comptes nommés, sauf si un compte les remplace.
Définissez `defaultAccount` lorsque vous souhaitez qu'OpenClaw privilégie un compte Matrix nommé pour le routage implicite, la détection et les opérations CLI.
Si vous configurez plusieurs comptes nommés, définissez `defaultAccount` ou transmettez `--account <id>` pour les commandes CLI qui dépendent d'une sélection de compte implicite.
Transmettez `--account <id>` à `openclaw matrix verify ...` et `openclaw matrix devices ...` lorsque vous souhaitez remplacer cette sélection implicite pour une commande.

## Serveurs domestiques privés/LAN

Par défaut, OpenClaw bloque les serveurs domestiques Matrix privés/internes pour la protection SSRF, sauf si vous
optez explicitement pour chaque compte.

Si votre serveur domestique fonctionne sur localhost, une IP LAN/Tailscale ou un nom d'hôte interne, activez
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

Cette option d'adhésion ne permet que les cibles privées/internes de confiance. Les serveurs domestiques publics en clair tels que
`http://matrix.example.org:8008` restent bloqués. Privilégiez `https://` chaque fois que possible.

## Résolution de cible

Matrix accepte ces formes de cibles partout où OpenClaw vous demande une cible de salle ou d'utilisateur :

- Utilisateurs : `@user:server`, `user:@user:server` ou `matrix:user:@user:server`
- Salles : `!room:server`, `room:!room:server` ou `matrix:room:!room:server`
- Alias : `#alias:server`, `channel:#alias:server` ou `matrix:channel:#alias:server`

La recherche en direct dans l'annuaire utilise le compte Matrix connecté :

- Les recherches d'utilisateurs interrogent l'annuaire des utilisateurs Matrix sur ce serveur domestique.
- Les recherches de salle acceptent directement les ID de salle et les alias explicites, puis reviennent à rechercher les noms des salles rejoints pour ce compte.
- La recherche de nom de salle rejointe est de type « best-effort ». Si un nom de salle ne peut pas être résolu en ID ou en alias, il est ignoré par la résolution de liste d'autorisation (allowlist) lors de l'exécution.

## Référence de configuration

- `enabled` : activer ou désactiver le canal.
- `name` : étiquette facultative pour le compte.
- `defaultAccount` : ID de compte préféré lorsque plusieurs comptes Matrix sont configurés.
- `homeserver` : URL du serveur d'accueil, par exemple `https://matrix.example.org`.
- `allowPrivateNetwork` : autoriser ce compte Matrix à se connecter à des serveurs d'accueil privés/internes. Activez ceci lorsque le serveur d'accueil est résolu vers `localhost`, une IP LAN/Tailscale, ou un hôte interne tel que `matrix-synapse`.
- `userId` : identifiant utilisateur Matrix complet, par exemple `@bot:example.org`.
- `accessToken` : jeton d'accès pour l'authentification par jeton.
- `password` : mot de passe pour la connexion par mot de passe.
- `deviceId` : identifiant d'appareil Matrix explicite.
- `deviceName` : nom d'affichage de l'appareil pour la connexion par mot de passe.
- `avatarUrl` : URL de l'auto-avatar stockée pour la synchronisation du profil et les mises à jour `set-profile`.
- `initialSyncLimit` : limite d'événements de synchronisation au démarrage.
- `encryption` : activer E2EE.
- `allowlistOnly` : forcer le comportement de liste d'autorisation uniquement pour les DMs et les salons.
- `groupPolicy` : `open`, `allowlist`, ou `disabled`.
- `groupAllowFrom` : liste d'autorisation des identifiants utilisateurs pour le trafic de salon.
- Les entrées `groupAllowFrom` doivent être des identifiants utilisateur Matrix complets. Les noms non résolus sont ignorés lors de l'exécution.
- `replyToMode` : `off`, `first`, ou `all`.
- `threadReplies` : `off`, `inbound`, ou `always`.
- `threadBindings` : substitutions par canal pour le routage et le cycle de vie des sessions liées aux fils de discussion.
- `startupVerification` : mode de demande de vérification automatique de soi au démarrage (`if-unverified`, `off`).
- `startupVerificationCooldownHours` : temps de refroidissement avant de réessayer les demandes de vérification automatique au démarrage.
- `textChunkLimit` : taille du bloc des messages sortants.
- `chunkMode` : `length` ou `newline`.
- `responsePrefix` : préfixe de message optionnel pour les réponses sortantes.
- `ackReaction` : substitution de réaction d'accusé de réception optionnelle pour ce channel/compte.
- `ackReactionScope` : substitution de la portée de réaction d'accusé de réception optionnelle (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications` : mode de notification de réaction entrante (`own`, `off`).
- `mediaMaxMb` : limite de taille des médias sortants en Mo.
- `autoJoin` : politique de jointure automatique aux invitations (`always`, `allowlist`, `off`). Par défaut : `off`.
- `autoJoinAllowlist` : salons/alias autorisés lorsque `autoJoin` est `allowlist`. Les entrées d'alias sont résolues en ID de salon lors du traitement des invitations ; OpenClaw ne fait pas confiance à l'état de l'alias revendiqué par le salon invité.
- `dm` : bloc de stratégie DM (`enabled`, `policy`, `allowFrom`).
- Les entrées `dm.allowFrom` doivent être des IDs utilisateur Matrix complets, sauf si vous les avez déjà résolus via une recherche en direct dans l'annuaire.
- `accounts` : substitutions nommées par compte. Les valeurs `channels.matrix` de premier niveau servent de valeurs par défaut pour ces entrées.
- `groups` : carte de stratégie par salon. Privilégiez les ID de salon ou les alias ; les noms de salon non résolus sont ignorés lors de l'exécution. L'identité de session/groupe utilise l'ID de salon stable après résolution, tandis que les étiquettes lisibles par l'homme proviennent toujours des noms de salon.
- `rooms` : alias hérité pour `groups`.
- `actions` : verrouillage de l'outil par action (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).
