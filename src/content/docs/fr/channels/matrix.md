---
summary: "Statut de support de Matrix, configuration et exemples de configuration"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

# Matrix (plugin)

Matrix est le plugin de canal Matrix pour OpenClaw.
Il utilise le `matrix-js-sdk` officiel et prend en charge les DMs, les salons, les fils, les médias, les réactions, les sondages, la localisation et l'E2EE.

## Plugin requis

Matrix est un plugin et n'est pas inclus avec le cœur d'OpenClaw.

Installer depuis npm :

```bash
openclaw plugins install @openclaw/matrix
```

Installer depuis une copie locale :

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

Voir [Plugins](/en/tools/plugin) pour le comportement des plugins et les règles d'installation.

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
- Les invites de liste d'autorisation de DM acceptent immédiatement les valeurs complètes `@user:server`. Les noms d'affichage ne fonctionnent que lorsque la recherche en direct dans l'annuaire trouve une correspondance exacte ; sinon, l'assistant vous demande de réessayer avec un ID Matrix complet.
- Les invites de liste d'autorisation de salon acceptent directement les ID et alias de salon. Ils peuvent également résoudre les noms de salons rejoints en direct, mais les noms non résolus ne sont conservés que tels qu'ils ont été saisis lors de la configuration et sont ignorés plus tard lors de la résolution de la liste d'autorisation au moment de l'exécution. Préférez `!room:server` ou `#alias:server`.
- L'identité de salle/session d'exécution utilise l'ID de salle stable Matrix. Les alias déclarés par la salle sont utilisés uniquement comme entrées de recherche, et non comme clé de session à long terme ou identité de groupe stable.
- Pour résoudre les noms de salon avant de les sauvegarder, utilisez `openclaw channels resolve --channel matrix "Project Room"`.

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

Définissez `channels.matrix.streaming` sur `"partial"` lorsque vous voulez que OpenClaw envoie une seule réponse brouillon,
modifie ce brouillon sur place pendant que le modèle génère le texte, puis le finalise lorsque la réponse est
terminée :

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
- `streaming: "partial"` crée un message d'aperçu modifiable au lieu d'envoyer plusieurs messages partiels.
- Si l'aperçu ne tient plus dans un événement Matrix, OpenClaw arrête le flux d'aperçu et revient à la livraison finale normale.
- Les réponses multimédias envoient toujours les pièces jointes normalement. Si un aperçu périmé ne peut plus être réutilisé en toute sécurité, OpenClaw le supprime avant d'envoyer la réponse multimédia finale.
- Les modifications d'aperçu nécessitent des appels supplémentaires à l'Matrix API. Désactivez le flux si vous souhaitez le comportement le plus conservateur en matière de limitation de débit.

## Chiffrement et vérification

Dans les salons chiffrés (E2EE), les événements d'image sortants utilisent `thumbnail_file` afin que les aperçus d'image soient chiffrés avec la pièce jointe complète. Les salons non chiffrés utilisent toujours du `thumbnail_url` brut. Aucune configuration n'est nécessaire — le plugin détecte automatiquement l'état E2EE.

### Salons bot à bot

Par défaut, les messages Matrix provenant d'autres comptes OpenClaw Matrix configurés sont ignorés.

Utilisez `allowBots` lorsque vous souhaitez intentionnellement un trafic inter-agent Matrix :

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

- `allowBots: true` accepte les messages provenant d'autres comptes bot Matrix configurés dans les salons et DM autorisés.
- `allowBots: "mentions"` accepte ces messages uniquement lorsqu'ils mentionnent visiblement ce bot dans les salons. Les DM sont toujours autorisés.
- `groups.<room>.allowBots` remplace le paramètre au niveau du compte pour un seul salon.
- OpenClaw ignore toujours les messages provenant du même ID utilisateur Matrix pour éviter les boucles d'auto-réponse.
- Matrix n'expose pas ici d'indicateur de bot natif ; OpenClaw traite "bot-authored" comme "envoyé par un autre compte Matrix configuré sur cette passerelle OpenClaw".

Utilisez des listes d'autorisation de salles strictes et des exigences de mention lors de l'activation du trafic de bot à bot dans les salles partagées.

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

Statut détaillé (diagnostics complets) :

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

Support multi-compte : utilisez `channels.matrix.accounts` avec des identifiants par compte et `name` facultatif. Voir [Configuration reference](/en/gateway/configuration-reference#multi-account-all-channels) pour le modèle partagé.

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

Vérifier l'état de santé de la sauvegarde des clés de salle :

```bash
openclaw matrix verify backup status
```

Diagnostics de santé de la sauvegarde détaillés :

```bash
openclaw matrix verify backup status --verbose
```

Restaurer les clés de salle à partir de la sauvegarde du serveur :

```bash
openclaw matrix verify backup restore
```

Diagnostics de restauration détaillés :

```bash
openclaw matrix verify backup restore --verbose
```

Supprimer la sauvegarde actuelle du serveur et créer une nouvelle ligne de base de sauvegarde :

```bash
openclaw matrix verify backup reset --yes
```

Toutes les commandes `verify` sont concises par défaut (y compris la journalisation interne silencieuse du SDK) et n'affichent des diagnostics détaillés qu'avec `--verbose`.
Utilisez `--json` pour une sortie complète lisible par machine lors de l'écriture de scripts.

Dans les configurations multi-comptes, les commandes Matrix CLI utilisent le compte par défaut implicite Matrix sauf si vous passez `--account <id>`.
Si vous configurez plusieurs comptes nommés, définissez `channels.matrix.defaultAccount` d'abord, sinon ces opérations CLI implicites s'arrêteront et vous demanderont de choisir explicitement un compte.
Utilisez `--account` chaque fois que vous souhaitez que les opérations de vérification ou d'appareil ciblent explicitement un compte nommé :

```bash
openclaw matrix verify status --account assistant
openclaw matrix verify backup restore --account assistant
openclaw matrix devices list --account assistant
```

Lorsque le chiffrement est désactivé ou indisponible pour un compte nommé, les avertissements Matrix et les erreurs de vérification pointent vers la clé de configuration de ce compte, par exemple `channels.matrix.accounts.assistant.encryption`.

### Que signifie "vérifié"

OpenClaw considère cet appareil Matrix comme vérifié uniquement lorsqu'il est vérifié par votre propre identité de signature croisée.
En pratique, `openclaw matrix verify status --verbose` expose trois signaux de confiance :

- `Locally trusted` : cet appareil est approuvé par le client actuel uniquement
- `Cross-signing verified` : le SDK signale l'appareil comme vérifié via la signature croisée
- `Signed by owner` : l'appareil est signé par votre propre clé d'auto-signature

`Verified by owner` devient `yes` uniquement lorsqu'une vérification par signature croisée ou une signature de propriétaire est présente.
La confiance locale seule ne suffit pas pour qu'OpenClaw considère l'appareil comme entièrement vérifié.

### Ce que fait le bootstrap

`openclaw matrix verify bootstrap` est la commande de réparation et de configuration pour les comptes Matrix chiffrés.
Elle effectue toutes les opérations suivantes dans l'ordre :

- initialise le stockage des secrets, en réutilisant une clé de récupération existante si possible
- initialise la signature croisée et téléverse les clés publiques de signature croisée manquantes
- tente de marquer et de signer croisée l'appareil actuel
- crée une nouvelle sauvegarde de clés de salon côté serveur si elle n'existe pas déjà

Si le serveur d'accueil nécessite une authentification interactive pour téléverser les clés de signature croisée, OpenClaw essaie d'abord le téléversement sans authentification, puis avec `m.login.dummy`, puis avec `m.login.password` lorsque `channels.matrix.password` est configuré.

Utilisez `--force-reset-cross-signing` uniquement lorsque vous souhaitez intentionnellement supprimer l'identité de signature croisée actuelle et en créer une nouvelle.

Si vous souhaitez intentionnellement supprimer la sauvegarde des clés de salon actuelle et commencer une nouvelle ligne de base de sauvegarde pour les futurs messages, utilisez `openclaw matrix verify backup reset --yes`.
Faites cela uniquement si vous acceptez que l'ancien historique chiffré irrécupérable restera indisponible.

### Nouvelle ligne de base de sauvegarde

Si vous souhaitez que les futurs messages chiffrés continuent de fonctionner et acceptez de perdre l'ancien historique irrécupérable, exécutez ces commandes dans l'ordre :

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Ajoutez `--account <id>` à chaque commande lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

### Comportement au démarrage

Lorsque `encryption: true`, Matrix définit `startupVerification` par défaut à `"if-unverified"`.
Au démarrage, si cet appareil n'est toujours pas vérifié, Matrix demandera une auto-vérification dans un autre client Matrix,
ignorera les demandes en double tant qu'une est déjà en attente, et appliquera un temps de recharge local avant de réessayer après des redémarrages.
Par défaut, les tentatives de demande échouées sont réessayées plus rapidement que la création réussie d'une demande.
Définissez `startupVerification: "off"` pour désactiver les demandes automatiques au démarrage, ou ajustez `startupVerificationCooldownHours`
si vous souhaitez une fenêtre de nouvelle tentative plus courte ou plus longue.

Le démarrage effectue également automatiquement une passe conservatrice d'amorçage cryptographique.
Cette passe essaie d'abord de réutiliser le stockage de secret actuel et l'identité de signature croisée, et évite de réinitialiser la signature croisée sauf si vous exécutez un flux de réparation d'amorçage explicite.

Si le démarrage détecte un état d'amorçage cassé et que `channels.matrix.password` est configuré, OpenClaw peut tenter une voie de réparation plus stricte.
Si l'appareil actuel est déjà signé par le propriétaire, OpenClaw préserve cette identité au lieu de la réinitialiser automatiquement.

Mise à niveau à partir du plugin Matrix public précédent :

- OpenClaw réutilise automatiquement le même compte Matrix, le même jeton d'accès et la même identité d'appareil lorsque cela est possible.
- Avant que toute modification de migration Matrix exploitable ne s'exécute, OpenClaw crée ou réutilise un instantané de récupération sous `~/Backups/openclaw-migrations/`.
- Si vous utilisez plusieurs comptes Matrix, définissez `channels.matrix.defaultAccount` avant la mise à niveau à partir de l'ancienne disposition de stockage plat afin qu'OpenClaw sache quel compte doit recevoir cet état hérité partagé.
- Si le plugin précédent a stocké localement une clé de déchiffrement de sauvegarde de clés de salle Matrix, le démarrage ou `openclaw doctor --fix` l'importera automatiquement dans le nouveau flux de clé de récupération.
- Si le jeton d'accès Matrix a changé après la préparation de la migration, le démarrage analyse désormais les racines de stockage de hachage de jeton sœurs pour l'état de restauration hérité en attente avant d'abandonner la restauration automatique de la sauvegarde.
- Si le jeton d'accès Matrix change ultérieurement pour le même compte, le serveur domestique et l'utilisateur, OpenClaw préfère désormais réutiliser la racine de stockage de hachage de jeton existante la plus complète au lieu de recommencer à partir d'un répertoire d'état Matrix vide.
- Au prochain démarrage de la passerelle, les clés de salle sauvegardées sont restaurées automatiquement dans le nouveau magasin de chiffrement.
- Si l'ancien plugin possédait des clés de salle locales uniquement qui n'avaient jamais été sauvegardées, OpenClaw vous avertira clairement. Ces clés ne peuvent pas être exportées automatiquement depuis l'ancien stockage de chiffrement Rust, donc une partie de l'historique chiffré ancien pourrait rester indisponible jusqu'à ce qu'il soit récupéré manuellement.
- Consultez la [migration Matrix](/en/install/migrating-matrix) pour connaître le processus complet de mise à niveau, les limites, les commandes de récupération et les messages de migration courants.

L'état d'exécution chiffré est organisé sous des racines par compte, par hachage de jeton d'utilisateur dans
`~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`.
Ce répertoire contient le magasin de synchronisation (`bot-storage.json`), le magasin de chiffrement (`crypto/`),
le fichier de clé de récupération (`recovery-key.json`), l'instantané IndexedDB (`crypto-idb-snapshot.json`),
les liaisons de fils (`thread-bindings.json`) et l'état de vérification au démarrage (`startup-verification.json`)
lorsque ces fonctionnalités sont utilisées.
Lorsque le jeton change mais que l'identité du compte reste la même, OpenClaw réutilise la meilleure racine
existante pour ce tuple compte/serveur d'accueil/utilisateur afin que l'état de synchronisation antérieur, l'état de chiffrement, les liaisons de fils,
et l'état de vérification au démarrage restent visibles.

### Modèle de magasin de chiffrement Node

Le chiffrement de bout en bout (E2EE) Matrix dans ce plugin utilise le chemin de chiffrement Rust officiel `matrix-js-sdk` dans Node.
Ce chemin s'attend à une persistance sauvegardée par IndexedDB lorsque vous souhaitez que l'état de chiffrement survive aux redémarrages.

OpenClaw fournit actuellement cela dans Node en :

- utilisant `fake-indexeddb` comme shim de l'API IndexedDB attendu par le SDK
- restaurant le contenu IndexedDB du chiffrement Rust à partir de `crypto-idb-snapshot.json` avant `initRustCrypto`
- persistant le contenu IndexedDB mis à jour vers `crypto-idb-snapshot.json` après l'initialisation et pendant l'exécution

Il s'agit de plomberie de compatibilité/stockage, et non d'une implémentation de chiffrement personnalisée.
Le fichier d'instantané est un état d'exécution sensible et est stocké avec des permissions de fichiers restrictives.
Dans le modèle de sécurité d'OpenClaw, l'hôte de la passerelle et le répertoire d'état local OpenClaw se trouvent déjà dans la limite de l'opérateur de confiance, il s'agit donc principalement d'une préoccupation de durabilité opérationnelle plutôt que d'une limite de confiance distante séparée.

Amélioration prévue :

- ajouter la prise en charge de SecretRef pour le matériel de clés Matrix persistant, afin que les clés de récupération et les secrets associés au chiffrement du magasin puissent être provenus des fournisseurs de secrets OpenClaw au lieu des fichiers locaux uniquement

## Gestion du profil

Mettez à jour le profil personnel Matrix pour le compte sélectionné avec :

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Ajoutez `--account <id>` lorsque vous souhaitez cibler explicitement un compte Matrix nommé.

Matrix accepte directement les URL d'avatar `mxc://`. Lorsque vous transmettez une URL d'avatar `http://` ou `https://`, OpenClaw la téléverse d'abord vers Matrix et stocke l'URL `mxc://` résolue dans `channels.matrix.avatarUrl` (ou le remplacement du compte sélectionné).

## Notifications automatiques de vérification

Matrix publie désormais des notifications de cycle de vie de vérification directement dans la salle de vérification DM stricte sous forme de messages `m.notice`.
Cela comprend :

- notifications de demande de vérification
- notifications de disponibilité de la vérification (avec la directive explicite « Vérifier par emoji »)
- notifications de début et de fin de vérification
- détails SAS (emoji et décimal) lorsqu'ils sont disponibles

Les demandes de vérification entrantes d'un autre client Matrix sont suivies et acceptées automatiquement par OpenClaw.
Pour les flux d'auto-vérification, OpenClaw lance également automatiquement le flux SAS lorsque la vérification par emoji devient disponible et confirme son propre côté.
Pour les demandes de vérification d'un autre utilisateur/appareil Matrix, OpenClaw accepte automatiquement la demande puis attend que le flux SAS se poursuive normalement.
Vous devez toujours comparer les emoji ou le SAS décimal dans votre client Matrix et confirmer « Ils correspondent » pour terminer la vérification.

OpenClaw n'accepte pas aveuglément les flux en double auto-initiés. Le démarrage ignore la création d'une nouvelle demande lorsqu'une demande d'auto-vérification est déjà en attente.

Les notifications de protocole/système de vérification ne sont pas transmises au pipeline de discussion de l'agent, elles ne produisent donc pas `NO_REPLY`.

### Hygiène des appareils

Les anciens appareils Matrix gérés par OpenClaw peuvent s'accumuler sur le compte et rendre la confiance dans les salons chiffrés plus difficile à évaluer.
Listez-les avec :

```bash
openclaw matrix devices list
```

Supprimez les appareils obsolètes gérés par OpenClaw avec :

```bash
openclaw matrix devices prune-stale
```

### Réparation directe de salon

Si l'état des messages directs se désynchronise, OpenClaw peut se retrouver avec des mappages `m.direct` obsolètes pointant vers d'anciens salons individuels au lieu du DM actif. Inspectez le mappage actuel pour un pair avec :

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Réparez-le avec :

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

La réparation conserve la logique spécifique à Matrix à l'intérieur du plugin :

- il privilégie un DM strict 1:1 qui est déjà mappé dans `m.direct`
- sinon, il revient à n'importe quel DM strict 1:1 actuellement rejoint avec cet utilisateur
- si aucun DM sain n'existe, il crée un nouveau salon direct et réécrit `m.direct` pour qu'il pointe vers celui-ci

Le flux de réparation ne supprime pas automatiquement les anciens salons. Il choisit simplement le DM sain et met à jour le mappage afin que les nouveaux envois Matrix, les avis de vérification et les autres flux de messages directs ciblent à nouveau le bon salon.

## Fils de discussion

Matrix prend en charge les fils de discussion natifs Matrix pour les réponses automatiques ainsi que pour les envois via l'outil de message.

- `threadReplies: "off"` conserve les réponses au niveau supérieur et conserve les messages entrants en fil sur la session parente.
- `threadReplies: "inbound"` répond dans un fil uniquement lorsque le message entrant était déjà dans ce fil.
- `threadReplies: "always"` conserve les réponses du salon dans un fil ancré au message déclencheur et achemine cette conversation via la session étendue au fil correspondante issue du premier message déclencheur.
- `dm.threadReplies` remplace le paramètre de niveau supérieur uniquement pour les DM. Par exemple, vous pouvez garder les fils de salon isolés tout en gardant les DM à plat.
- Les messages entrants en fil incluent le message racine du fil comme contexte supplémentaire pour l'agent.
- Les envois via l'outil de message héritent désormais automatiquement du fil Matrix actuel lorsque la cible est le même salon, ou le même utilisateur cible de DM, à moins qu'un `threadId` explicite ne soit fourni.
- Les liaisons de fil à l'exécution sont prises en charge pour Matrix. `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age`, et les `/acp spawn` liés à un fil fonctionnent désormais dans les salons et les DM Matrix.
- Le `/focus` de salon/DM de niveau supérieur Matrix crée un nouveau fil Matrix et le lie à la session cible lors du `threadBindings.spawnSubagentSessions=true`.
- L'exécution de `/focus` ou `/acp spawn --thread here` dans un fil de discussion Matrix existant lie plutôt ce fil actuel.

## Liaisons de conversation ACP

Les salons Matrix, les DMs, et les fils de discussion Matrix existants peuvent être transformés en espaces de travail ACP durables sans changer la surface de chat.

Flux rapide pour l'opérateur :

- Exécutez `/acp spawn codex --bind here` dans le DM Matrix, le salon, ou le fil de discussion existant que vous souhaitez continuer à utiliser.
- Dans un DM ou un salon Matrix de premier niveau, le DM/salon actuel reste la surface de chat et les futurs messages sont acheminés vers la session ACP générée.
- Dans un fil de discussion Matrix existant, `--bind here` lie ce fil actuel en place.
- `/new` et `/reset` réinitialisent la même session ACP liée en place.
- `/acp close` ferme la session ACP et supprime la liaison.

Notes :

- `--bind here` ne crée pas de fil de discussion Matrix enfant.
- `threadBindings.spawnAcpSessions` est uniquement requis pour `/acp spawn --thread auto|here`, où OpenClaw doit créer ou lier un fil de discussion Matrix enfant.

### Configuration de la liaison de fil (Thread Binding)

Matrix hérite des valeurs globales par défaut de `session.threadBindings`, et prend également en charge les redéfinitions par canal :

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Les indicateurs de génération liés aux fils Matrix sont opt-in :

- Définissez `threadBindings.spawnSubagentSessions: true` pour autoriser `/focus` de premier niveau à créer et lier de nouveaux fils de discussion Matrix.
- Définissez `threadBindings.spawnAcpSessions: true` pour autoriser `/acp spawn --thread auto|here` à lier des sessions ACP aux fils de discussion Matrix.

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
- secours pour l'emoji d'identité de l'agent

La portée de la réaction d'accusé de réception se résout dans cet ordre :

- `channels["matrix"].accounts.<accountId>.ackReactionScope`
- `channels["matrix"].ackReactionScope`
- `messages.ackReactionScope`

Le mode de notification de réaction se résout dans cet ordre :

- `channels["matrix"].accounts.<accountId>.reactionNotifications`
- `channels["matrix"].reactionNotifications`
- par défaut : `own`

Comportement actuel :

- `reactionNotifications: "own"` transmet les événements `m.reaction` ajoutés lorsqu'ils ciblent des messages Matrix créés par le bot.
- `reactionNotifications: "off"` désactive les événements système de réaction.
- Les suppressions de réactions ne sont toujours pas synthétisées en événements système car Matrix les présente comme des suppressions (redactions), et non comme des suppressions autonomes de `m.reaction`.

## Contexte de l'historique

- `channels.matrix.historyLimit` contrôle combien de messages récents de salle sont inclus en tant que `InboundHistory` lorsqu'un message de salle Matrix déclenche l'agent.
- Il revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver.
- L'historique des salles Matrix est limité à la salle. Les DMs continuent d'utiliser l'historique de session normal.
- L'historique des salles Matrix est en attente uniquement : OpenClaw met en tampon les messages de salle qui n'ont pas encore déclenché de réponse, puis capture cette fenêtre lorsqu'une mention ou un autre déclencheur arrive.
- Le message déclencheur actuel n'est pas inclus dans `InboundHistory` ; il reste dans le corps entrant principal pour ce tour.
- Les nouvelles tentatives du même événement Matrix réutilisent la capture d'historique originale au lieu de dériver vers des messages de salle plus récents.
- Le contexte de salle récupéré (y compris les recherches de contexte de réponse et de fil de discussion) est filtré par les listes d'autorisation d'expéditeurs (`groupAllowFrom`), de sorte que les messages non autorisés sont exclus du contexte de l'agent.

## Exemple de politique pour les DMs et les salles

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

Voir [Groupes](/en/channels/groups) pour le comportement de filtrage par mention et de liste d'autorisation.

Exemple d'appariement pour les DMs Matrix :

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un utilisateur Matrix non approuvé continue à vous envoyer des messages avant l'approbation, OpenClaw réutilise le même code d'appariement en attente et peut envoyer une réponse de rappel après un court délai de recharge au lieu de générer un nouveau code.

Voir [Appairage](/en/channels/pairing) pour le processus d'appairage DM partagé et la disposition du stockage.

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

Les valeurs `channels.matrix` de niveau supérieur agissent comme valeurs par défaut pour les comptes nommés, sauf si un compte les remplace.
Définissez `defaultAccount` lorsque vous souhaitez qu'OpenClaw privilégie un compte Matrix nommé pour le routage implicite, la sonde et les opérations CLI.
Si vous configurez plusieurs comptes nommés, définissez `defaultAccount` ou passez `--account <id>` pour les commandes CLI qui reposent sur une sélection de compte implicite.
Passez `--account <id>` à `openclaw matrix verify ...` et `openclaw matrix devices ...` lorsque vous souhaitez remplacer cette sélection implicite pour une commande.

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

Ce choix explicite autorise uniquement les cibles privées/internes de confiance. Les serveurs domestiques publics en clair tels que
`http://matrix.example.org:8008` restent bloqués. Privilégiez `https://` whenever possible.

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
OpenClaw utilise le même paramètre de proxy pour le trafic d'exécution Matrix et les sondes d'état de compte.

## Résolution de cible

Matrix accepte ces formulaires de cible partout où OpenClaw vous demande une cible de salle ou d'utilisateur :

- Utilisateurs : `@user:server`, `user:@user:server` ou `matrix:user:@user:server`
- Salles : `!room:server`, `room:!room:server` ou `matrix:room:!room:server`
- Alias : `#alias:server`, `channel:#alias:server` ou `matrix:channel:#alias:server`

La recherche en direct dans l'annuaire utilise le compte Matrix connecté :

- Les recherches d'utilisateurs interrogent l'annuaire des utilisateurs Matrix sur ce serveur domestique.
- Les recherches de salle acceptent directement les ID de salle explicites et les alias, puis se rabattent sur la recherche des noms de salles rejoints pour ce compte.
- La recherche par nom de salle rejointe est de type « best-effort ». Si un nom de salle ne peut pas être résolu en ID ou alias, il est ignoré lors de la résolution de la liste d'autorisation (allowlist) à l'exécution.

## Référence de configuration

- `enabled` : active ou désactive le canal.
- `name` : libellé facultatif pour le compte.
- `defaultAccount` : ID de compte préféré lorsque plusieurs comptes Matrix sont configurés.
- `homeserver` : URL du serveur d'accueil (homeserver), par exemple `https://matrix.example.org`.
- `allowPrivateNetwork` : autoriser ce compte Matrix à se connecter à des serveurs d'accueil privés/internes. Activez cette option lorsque le serveur d'accueil résout vers `localhost`, une IP LAN/Tailscale, ou un hôte interne tel que `matrix-synapse`.
- `proxy` : URL de proxy HTTP(S) facultative pour le trafic Matrix. Les comptes nommés peuvent remplacer la valeur par défaut de premier niveau par leur propre `proxy`.
- `userId` : ID d'utilisateur complet Matrix, par exemple `@bot:example.org`.
- `accessToken` : jeton d'accès pour l'authentification par jeton. Les valeurs en texte clair et les valeurs SecretRef sont prises en charge pour `channels.matrix.accessToken` et `channels.matrix.accounts.<id>.accessToken` sur les fournisseurs env/file/exec. Voir [Gestion des secrets](/en/gateway/secrets).
- `password` : mot de passe pour la connexion par mot de passe. Les valeurs en texte clair et les valeurs SecretRef sont prises en charge.
- `deviceId` : ID d'appareil explicite Matrix.
- `deviceName` : nom d'affichage de l'appareil pour la connexion par mot de passe.
- `avatarUrl` : URL de l'avatar auto-stocké pour la synchronisation du profil et les mises à jour `set-profile`.
- `initialSyncLimit` : limite d'événements de synchronisation au démarrage.
- `encryption` : activer E2EE.
- `allowlistOnly` : forcer le comportement de liste d'autorisation uniquement (allowlist-only) pour les DMs et les salles.
- `groupPolicy` : `open`, `allowlist`, ou `disabled`.
- `groupAllowFrom` : liste d'autorisation des identifiants utilisateurs pour le trafic de salle.
- Les entrées `groupAllowFrom` doivent être des identifiants utilisateur Matrix complets. Les noms non résolus sont ignorés lors de l'exécution.
- `historyLimit` : nombre maximum de messages de salle à inclure en tant que contexte d'historique de groupe. Revient à `messages.groupChat.historyLimit`. Définissez `0` pour désactiver.
- `replyToMode` : `off`, `first` ou `all`.
- `streaming` : `off` (par défaut) ou `partial`. `partial` active les aperçus de brouillon à message unique avec des mises à jour sur place.
- `threadReplies` : `off`, `inbound` ou `always`.
- `threadBindings` : remplacements par canal pour le routage et le cycle de vie de session liés aux fils.
- `startupVerification` : mode de demande de vérification automatique au démarrage (`if-unverified`, `off`).
- `startupVerificationCooldownHours` : temps de refroidissement avant de réessayer les demandes de vérification automatique au démarrage.
- `textChunkLimit` : taille du bloc de message sortant.
- `chunkMode` : `length` ou `newline`.
- `responsePrefix` : préfixe de message optionnel pour les réponses sortantes.
- `ackReaction` : remplacement de réaction d'accusé de réception optionnel pour ce canal/compte.
- `ackReactionScope` : remplacement de la portée de réaction d'accusé de réception optionnel (`group-mentions`, `group-all`, `direct`, `all`, `none`, `off`).
- `reactionNotifications` : mode de notification de réaction entrante (`own`, `off`).
- `mediaMaxMb` : limite de taille des médias en Mo pour la gestion des médias Matrix. Elle s'applique aux envois sortants et au traitement des médias entrants.
- `autoJoin` : politique de rejoindre automatiquement les invitations (`always`, `allowlist`, `off`). Par défaut : `off`.
- `autoJoinAllowlist` : salons/alias autorisés lorsque `autoJoin` est `allowlist`. Les entrées d'alias sont résolues en ID de salon lors du traitement des invitations ; OpenClaw ne fait pas confiance à l'état de l'alias réclamé par le salon invité.
- `dm` : bloc de politique de DM (`enabled`, `policy`, `allowFrom`, `threadReplies`).
- Les entrées `dm.allowFrom` doivent être des ID utilisateur complets Matrix, sauf si vous les avez déjà résolus via une recherche en direct dans l'annuaire.
- `dm.threadReplies` : substitution de la politique de fil de discussion DM uniquement (`off`, `inbound`, `always`). Elle remplace le paramètre de niveau supérieur `threadReplies` pour à la fois le placement des réponses et l'isolement de session dans les DMs.
- `accounts` : substitutions nommées par compte. Les valeurs `channels.matrix` de niveau supérieur servent de valeurs par défaut pour ces entrées.
- `groups` : carte de politique par salon. Préférez les ID de salon ou les alias ; les noms de salon non résolus sont ignorés lors de l'exécution. L'identité de session/groupe utilise l'ID de salon stable après résolution, tandis que les étiquettes lisibles par l'homme proviennent toujours des noms de salon.
- `rooms` : alias historique pour `groups`.
- `actions` : blocage d'outil par action (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).

## Connexes

- [Vue d'ensemble des canaux](/en/channels) — tous les canaux pris en charge
- [Appairage](/en/channels/pairing) — authentification DM et flux d'appairage
- [Groupes](/en/channels/groups) — comportement de chat de groupe et blocage des mentions
- [Channel Routing](/en/channels/channel-routing) — routage de session pour les messages
- [Security](/en/gateway/security) — modèle d'accès et durcissement
