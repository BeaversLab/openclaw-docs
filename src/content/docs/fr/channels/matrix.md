---
summary: "MatrixStatut de support Matrix, configuration et exemples de configuration"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "MatrixMatrix"
---

Matrix est un plugin de canal téléchargeable pour OpenClaw.
Il utilise le MatrixOpenClaw`matrix-js-sdk` officiel et prend en charge les DMs, les salles, les fils de discussion, les médias, les réactions, les sondages, la localisation et E2EE.

## Installer

Installez Matrix depuis ClawHub avant de configurer le canal :

```bash
openclaw plugins install @openclaw/matrix
```

Les spécifications nues de plugins essaient d'abord ClawHub, puis npm en secours. Pour forcer la source du registre, utilisez ClawHubnpm`openclaw plugins install clawhub:@openclaw/matrix` ou `openclaw plugins install npm:@openclaw/matrix`.

À partir d'une extraction locale :

```bash
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` enregistre et active le plugin, aucune étape séparée `openclaw plugins enable matrix` n'est donc nécessaire. Le plugin ne fait toujours rien tant que vous n'avez pas configuré le channel ci-dessous. Consultez la page [Plugins](/fr/tools/plugin) pour connaître le comportement général des plugins et les règles d'installation.

## Configuration

1. Créez un compte Matrix sur votre serveur d'accueil.
2. Configurez `channels.matrix` avec soit `homeserver` + `accessToken`, soit `homeserver` + `userId` + `password`.
3. Redémarrez la passerelle.
4. Démarrez une DM avec le bot, ou invitez-le dans une salle (voir [auto-join](#auto-join) - les nouvelles invitations ne sont prises en compte que lorsque `autoJoin` les autorise).

### Configuration interactive

```bash
openclaw channels add
openclaw configure --section channels
```

L'assistant demande : l'URL du serveur d'accueil, la méthode d'authentification (jeton d'accès ou mot de passe), l'ID utilisateur (authentification par mot de passe uniquement), le nom d'appareil facultatif, s'il faut activer E2EE, et s'il faut configurer l'accès aux salles et l'auto-join.

Si des variables d'environnement correspondantes à `MATRIX_*` existent déjà et que le compte sélectionné n'a aucune authentification sauvegardée, l'assistant propose un raccourci via variable d'environnement. Pour résoudre les noms des salles avant d'enregistrer une liste d'autorisation, exécutez `openclaw channels resolve --channel matrix "Project Room"`. Lorsque le E2EE est activé, l'assistant écrit la configuration et exécute le même amorçage que [`openclaw matrix encryption setup`](#encryption-and-verification).

### Configuration minimale

Basé sur un jeton :

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

Basé sur un mot de passe (le jeton est mis en cache après la première connexion) :

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

### Rejoindre automatiquement

`channels.matrix.autoJoin` vaut `off` par défaut. Avec cette valeur par défaut, le bot n'apparaîtra pas dans les nouveaux salons ou DM issus d'invitations fraîches tant que vous ne l'aurez pas rejoint manuellement.

OpenClaw ne peut pas déterminer au moment de l'invitation si un salon invité est un DM ou un groupe, donc toutes les invitations — y compris celles de type DM — passent d'abord par `autoJoin`. `dm.policy` ne s'applique que plus tard, une fois que le bot a rejoint le salon et qu'il a été classé.

<Warning>
Définissez `autoJoin: "allowlist"` ainsi que `autoJoinAllowlist` pour restreindre les invitations que le bot accepte, ou `autoJoin: "always"` pour accepter chaque invitation.

`autoJoinAllowlist` n'accepte que les cibles stables : `!roomId:server`, `#alias:server` ou `*`. Les noms de salon simples sont rejetés ; les entrées d'alias sont résolues par rapport au serveur d'accueil (homeserver), et non par rapport à l'état revendiqué par le salon invité.

</Warning>

```json5
{
  channels: {
    matrix: {
      autoJoin: "allowlist",
      autoJoinAllowlist: ["!ops:example.org", "#support:example.org"],
      groups: {
        "!ops:example.org": { requireMention: true },
      },
    },
  },
}
```

Pour accepter chaque invitation, utilisez `autoJoin: "always"`.

### Formats des cibles de liste blanche

Les listes blanches de DM et de salon sont idéalement remplies avec des IDs stables :

- DMs (`dm.allowFrom`, `groupAllowFrom`, `groups.<room>.users`) : utilisez `@user:server`. Les noms d'affichage sont ignorés par défaut car ils sont modifiables ; ne définissez `dangerouslyAllowNameMatching: true` que si vous avez explicitement besoin de compatibilité avec les entrées basées sur les noms d'affichage.
- Clés de liste blanche de salon (`groups`, `rooms` hérité) : utilisez `!room:server` ou `#alias:server`. Les noms de salon simples sont ignorés par défaut ; ne définissez `dangerouslyAllowNameMatching: true` que si vous avez explicitement besoin de compatibilité avec la recherche par nom de salon rejoint.
- Listes blanches d'invitation (`autoJoinAllowlist`) : utilisez `!room:server`, `#alias:server`, ou `*`. Les noms de salon simples sont rejetés.

### Normalisation de l'ID de compte

L'assistant convertit un nom convivial en ID de compte normalisé. Par exemple, `Ops Bot` devient `ops-bot`. La ponctuation est échappée dans les noms de variables d'environnement délimitées (scoped) pour éviter que deux comptes n'entrent en collision : `-` → `_X2D_`, donc `ops-prod` correspond à `MATRIX_OPS_X2D_PROD_*`.

### Identifiants mis en cache

Matrix stocke les identifiants mis en cache sous `~/.openclaw/credentials/matrix/` :

- compte par défaut : `credentials.json`
- comptes nommés : `credentials-<account>.json`

Lorsque des informations d'identification mises en cache sont présentes, OpenClaw considère Matrix comme configuré même si le jeton d'accès n'est pas dans le fichier de configuration - cela couvre la configuration, `openclaw doctor` et les sondages de l'état du channel.

### Variables d'environnement

Utilisé lorsque la clé de configuration équivalente n'est pas définie. Le compte par défaut utilise des noms sans préfixe ; les comptes nommés utilisent l'ID de compte inséré avant le suffixe.

| Compte par défaut     | Compte nommé (`<ID>` est l'ID de compte normalisé) |
| --------------------- | -------------------------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`                           |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`                         |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                              |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`                             |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`                            |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`                          |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`                         |

Pour le compte `ops`, les noms deviennent `MATRIX_OPS_HOMESERVER`, `MATRIX_OPS_ACCESS_TOKEN`, et ainsi de suite. Les variables d'environnement de clé de récupération sont lues par les flux CLI conscients de la récupération (`verify backup restore`, `verify device`, `verify bootstrap`) lorsque vous transférez la clé via `--recovery-key-stdin`.

`MATRIX_HOMESERVER` ne peut pas être défini depuis un fichier `.env` de workspace ; consultez la section [Fichiers `.env` de Workspace](/fr/gateway/security).

## Exemple de configuration

Une base pratique avec le couplage DM, la liste d'autorisation des salles et E2EE :

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
        "!roomid:example.org": { requireMention: true },
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

Le flux de réponse Matrix est optionnel. `streaming` contrôle la manière dont OpenClaw livre la réponse de l'assistant en cours ; `blockStreaming` contrôle si chaque bloc terminé est préservé comme son propre message Matrix.

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

Pour conserver les aperçus de réponses en direct mais masquer les lignes d'outils/progression temporaires, utilisez la forme d'objet :

```json5
{
  channels: {
    matrix: {
      streaming: {
        mode: "partial",
        preview: {
          toolProgress: false,
        },
      },
    },
  },
}
```

| `streaming`          | Comportement                                                                                                                                                                                                                   |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `"off"` (par défaut) | Attendre la réponse complète, envoyer une seule fois. `true` ↔ `"partial"`, `false` ↔ `"off"`.                                                                                                                                 |
| `"partial"`          | Modifier un message texte normal en place pendant que le modèle écrit le bloc actuel. Les clients Matrix standard peuvent notifier lors de la première prévisualisation, et non de la modification finale.                     |
| `"quiet"`            | Identique à `"partial"`, mais le message est un avis sans notification. Les destinataires ne reçoivent une notification que lorsqu'une règle de push par utilisateur correspond à la modification finalisée (voir ci-dessous). |

`blockStreaming` est indépendant de `streaming` :

| `streaming`             | `blockStreaming: true`                                                                            | `blockStreaming: false` (par défaut)                       |
| ----------------------- | ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `"partial"` / `"quiet"` | Brouillon en direct pour le bloc actuel, les blocs terminés sont conservés sous forme de messages | Brouillon en direct pour le bloc actuel, finalisé en place |
| `"off"`                 | Un message de notification Matrix par bloc terminé                                                | Un message de notification Matrix pour la réponse complète |

Notes :

- Si une prévisualisation dépasse la limite de taille par événement de Matrix, OpenClaw arrête le streaming de prévisualisation et revient à la livraison finale uniquement.
- Les réponses multimédias envoient toujours les pièces jointes normalement. Si une prévisualisation obsolète ne peut plus être réutilisée en toute sécurité, OpenClaw la rédige avant d'envoyer la réponse multimédia finale.
- Les mises à jour de prévisualisation de la progression des outils sont activées par défaut lorsque le streaming de prévisualisation Matrix est actif. Définissez Matrix`streaming.preview.toolProgress: false` pour conserver les modifications de prévisualisation pour le texte de la réponse mais laisser la progression des outils sur le chemin de livraison normal.
- Les modifications de prévisualisation coûtent des appels d'API Matrix supplémentaires. Laissez MatrixAPI`streaming: "off"` si vous souhaitez le profil de limitation de débit le plus conservateur.

## Métadonnées d'approbation

Les invites d'approbation natives de Matrix sont des événements Matrix`m.room.message`OpenClaw normaux avec un contenu d'événement personnalisé spécifique à OpenClaw sous `com.openclaw.approval`MatrixOpenClaw. Matrix autorise les clés de contenu d'événement personnalisées, donc les clients standard affichent toujours le corps du texte tandis que les clients compatibles OpenClaw peuvent lire l'ID d'approbation structuré, le type, l'état, les décisions disponibles et les détails exec/plugin.

Lorsqu'une invite d'approbation est trop longue pour un seul événement Matrix, OpenClaw divise le texte visible et attache MatrixOpenClaw`com.openclaw.approval` uniquement au premier fragment. Les réactions pour les décisions d'autorisation/refus sont liées à ce premier événement, de sorte que les longues invites conservent la même cible d'approbation que les invites à événement unique.

### Règles de notification auto-hébergées pour les aperçus finalisés silencieux

`streaming: "quiet"` notifie les destinataires uniquement une fois qu'un bloc ou un tour est finalisé - une règle de notification push par utilisateur doit correspondre au marqueur d'aperçu finalisé. Consultez la page [Règles de notification push Matrix pour les aperçus silencieux](/fr/channels/matrix-push-rules) pour la recette complète (jeton du destinataire, vérification du pusher, installation de la règle, notes par serveur domestique).

## Salons bot-à-bot

Par défaut, les messages Matrix provenant d'autres comptes Matrix OpenClaw configurés sont ignorés.

Utilisez `allowBots`Matrix lorsque vous souhaitez intentionnellement le trafic Matrix inter-agent :

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

- `allowBots: true`Matrix accepte les messages provenant d'autres comptes bot Matrix configurés dans les salons et DMs autorisés.
- `allowBots: "mentions"` n'accepte ces messages que lorsqu'ils mentionnent visiblement ce bot dans les salons. Les DMs sont toujours autorisés.
- `groups.<room>.allowBots` remplace le paramètre au niveau du compte pour un salon.
- Les messages acceptés de bots configurés utilisent une [protection de boucle de bot](/fr/channels/bot-loop-protection) partagée. Configurez `channels.defaults.botLoopProtection`, puis remplacez-le par `channels.matrix.botLoopProtection` ou `channels.matrix.groups.<room>.botLoopProtection` lorsqu'une salle a besoin d'un budget différent.
- OpenClaw ignore toujours les messages provenant du même ID utilisateur Matrix pour éviter les boucles de réponse à soi-même.
- Matrix n'expose pas d'indicateur de bot natif ici ; OpenClaw traite "créé par un bot" comme "envoyé par un autre compte Matrix configuré sur cette passerelle OpenClaw".

Utilisez des listes d'autorisation de salles strictes et des exigences de mention lors de l'activation du trafic bot-à-bot dans les salles partagées.

## Chiffrement et vérification

Dans les salons chiffrés (E2EE), les événements d'image sortants utilisent `thumbnail_file` afin que les aperçus d'images soient chiffrés en même temps que la pièce jointe complète. Les salons non chiffrés utilisent toujours du `thumbnail_url` en clair. Aucune configuration n'est nécessaire — le plugin détecte automatiquement l'état E2EE.

Toutes les commandes `openclaw matrix` acceptent `--verbose` (diagnostics complets), `--json` (sortie lisible par machine) et `--account <id>` (configurations multi-comptes). La sortie est concise par défaut avec une journalisation interne discrète du SDK. Les exemples ci-dessous montrent la forme canonique ; ajoutez les indicateurs selon vos besoins.

### Activer le chiffrement

```bash
openclaw matrix encryption setup
```

Initialise le stockage des secrets et la signature croisée, crée une sauvegarde des clés de salon si nécessaire, puis affiche l'état et les prochaines étapes. Indicateurs utiles :

- `--recovery-key <key>` appliquer une clé de récupération avant l'initialisation (privilégier le formulaire stdin documenté ci-dessous)
- `--force-reset-cross-signing` supprimer l'identité de signature croisée actuelle et en créer une nouvelle (à utiliser uniquement intentionnellement)

Pour un nouveau compte, activez E2EE au moment de la création :

```bash
openclaw matrix account add \
  --homeserver https://matrix.example.org \
  --access-token syt_xxx \
  --enable-e2ee
```

`--encryption` est un alias pour `--enable-e2ee`.

Équivalent de configuration manuelle :

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

### Statut et signaux de confiance

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

`verify status` signale trois signaux de confiance indépendants (`--verbose` les affiche tous) :

- `Locally trusted` : approuvé uniquement par ce client
- `Cross-signing verified` : le SDK signale la vérification via la signature croisée
- `Signed by owner` : signé par votre propre clé d'auto-signature (diagnostic uniquement)

`Verified by owner` ne devient `yes` que lorsque `Cross-signing verified` est `yes`. La confiance locale ou une signature de propriétaire seule ne suffit pas.

`--allow-degraded-local-state`Matrix renvoie des diagnostics de meilleure effort sans préparer le compte Matrix au préalable ; utile pour des sondages hors ligne ou partiellement configurés.

### Vérifier cet appareil avec une clé de récupération

La clé de récupération est sensible — transmettez-la via stdin au lieu de la passer en ligne de commande. Définissez `MATRIX_RECOVERY_KEY` (ou `MATRIX_<ID>_RECOVERY_KEY` pour un compte nommé) :

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

La commande signale trois états :

- `Recovery key accepted` : Matrix a accepté la clé pour le stockage des secrets ou la confiance de l'appareil.
- `Backup usable` : la sauvegarde des clés de salle peut être chargée avec le matériel de récupération approuvé.
- `Device verified by owner` : cet appareil dispose d'une confiance complète pour l'identité de signature croisée Matrix.

Il renvoie une valeur non nulle lorsque la confiance totale de l'identité est incomplète, même si la clé de récupération a déverrouillé le matériel de sauvegarde. Dans ce cas, terminez l'auto-vérification depuis un autre client Matrix :

```bash
openclaw matrix verify self
```

`verify self` attend `Cross-signing verified: yes` avant de se terminer avec succès. Utilisez `--timeout-ms <ms>` pour ajuster l'attente.

Le formulaire de clé littérale `openclaw matrix verify device "<recovery-key>"` est également accepté, mais la clé finit dans l'historique de votre shell.

### Initialiser ou réparer la signature croisée

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` est la commande de réparation et de configuration pour les comptes chiffrés. Dans l'ordre, il :

- initialise le stockage des secrets, en réutilisant une clé de récupération existante si possible
- initialise la signature croisée et téléverse les clés publiques manquantes
- marque et signe de manière croisée l'appareil actuel
- crée une sauvegarde des clés de salon côté serveur si elle n'existe pas déjà

Si le serveur d'accueil nécessite une UIA pour téléverser les clés de signature croisée, OpenClaw essaie d'abord sans authentification, puis `m.login.dummy`, puis `m.login.password` (nécessite `channels.matrix.password`).

Indicateurs utiles :

- `--recovery-key-stdin` (à associer avec `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …`) ou `--recovery-key <key>`
- `--force-reset-cross-signing` pour supprimer l'identité de signature croisée actuelle (uniquement intentionnel)

### Sauvegarde des clés de salon

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` indique si une sauvegarde côté serveur existe et si cet appareil peut la déchiffrer. `backup restore` importe les clés de salon sauvegardées dans le stockage de chiffrement local ; si la clé de récupération est déjà sur le disque, vous pouvez omettre `--recovery-key-stdin`.

Pour remplacer une sauvegarde corrompue par une nouvelle base de référence (accepte de perdre l'ancien historique irrécupérable ; peut aussi recréer le stockage des secrets si le secret de sauvegarde actuel n'est pas chargeable) :

```bash
openclaw matrix verify backup reset --yes
```

Ajoutez `--rotate-recovery-key` uniquement lorsque vous souhaitez intentionnellement que la clé de récupération précédente cesse de déverrouiller la nouvelle base de sauvegarde.

### Répertorier, demander et répondre aux vérifications

```bash
openclaw matrix verify list
```

Répertorie les demandes de vérification en attente pour le compte sélectionné.

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

Envoie une demande de vérification depuis ce compte OpenClaw. `--own-user` demande une auto-vérification (vous acceptez l'invite dans un autre client Matrix du même utilisateur) ; `--user-id`/`--device-id`/`--room-id` ciblent quelqu'un d'autre. `--own-user` ne peut pas être combiné avec les autres indicateurs de ciblage.

Pour une gestion de cycle de vie de niveau inférieur - généralement lors de la réplication des demandes entrantes d'un autre client - ces commandes agissent sur une demande spécifique `<id>` (affichée par `verify list` et `verify request`) :

| Commande                                   | Objet                                                                   |
| ------------------------------------------ | ----------------------------------------------------------------------- |
| `openclaw matrix verify accept <id>`       | Accepter une demande entrante                                           |
| `openclaw matrix verify start <id>`        | Démarrer le flux SAS                                                    |
| `openclaw matrix verify sas <id>`          | Afficher les émojis ou décimales SAS                                    |
| `openclaw matrix verify confirm-sas <id>`  | Confirmer que le SAS correspond à ce que l'autre client affiche         |
| `openclaw matrix verify mismatch-sas <id>` | Rejeter le SAS lorsque les émojis ou décimales ne correspondent pas     |
| `openclaw matrix verify cancel <id>`       | Annuler ; accepte `--reason <text>` et `--code <matrix-code>` en option |

`accept`, `start`, `sas`, `confirm-sas`, `mismatch-sas` et `cancel` acceptent tous `--user-id` et `--room-id` comme indices de suivi de DM lorsque la vérification est ancrée à une salle de message direct spécifique.

### Notes multi-comptes

Sans `--account <id>`, les commandes de la CLI MatrixCLI utilisent le compte par défaut implicite. Si vous avez plusieurs comptes nommés et n'avez pas défini `channels.matrix.defaultAccount`, ils refuseront de deviner et vous demanderont de choisir. Lorsque le chiffrement de bout en bout est désactivé ou indisponible pour un compte nommé, les erreurs pointent vers la clé de configuration de ce compte, par exemple `channels.matrix.accounts.assistant.encryption`.

<AccordionGroup>
  <Accordion title="Comportement au démarrage">
    Avec `encryption: true`, `startupVerification` est défini par défaut sur `"if-unverified"`. Au démarrage, un appareil non vérifié demande une auto-vérification dans un autre client Matrix, en ignorant les doublons et en appliquant un temps de recharge (24 heures par défaut). Ajustez avec `startupVerificationCooldownHours` ou désactivez avec `startupVerification: "off"`.

    Le démarrage exécute également une passe d'amorçage cryptographique conservatrice qui réutilise le stockage secret actuel et l'identité de signature croisée. Si l'état d'amorçage est cassé, OpenClaw tente une réparation protégée même sans `channels.matrix.password` ; si le serveur domestique exige une UIA par mot de passe, le démarrage enregistre un avertissement et reste non fatal. Les appareils déjà signés par le propriétaire sont préservés.

    Voir [Migration Matrix](/fr/channels/matrix-migration) pour le processus complet de mise à niveau.

  </Accordion>

  <Accordion title="Notifications de vérification">
    Matrix publie des notifications du cycle de vie de la vérification dans la salle de vérification DM stricte sous forme de messages `m.notice` : demande, prêt (avec les instructions "Vérifier par emoji"), début/achèvement, et détails SAS (emoji/décimal) si disponibles.

    Les demandes entrantes d'un autre client Matrix sont suivies et acceptées automatiquement. Pour l'auto-vérification, OpenClaw lance automatiquement le flux SAS et confirme son propre côté une fois la vérification par emoji disponible - vous devez toujours comparer et confirmer "Ils correspondent" dans votre client Matrix.

    Les notifications du système de vérification ne sont pas transmises au pipeline de chat de l'agent.

  </Accordion>

  <Accordion title="MatrixAppareil Matrix supprimé ou invalide">
    Si `verify status`OpenClawMatrix indique que l'appareil actuel n'est plus répertorié sur le serveur d'accueil, créez un nouvel appareil OpenClaw Matrix. Pour la connexion par mot de passe :

````bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```MatrixOpenClaw

    Pour l'authentification par jeton, créez un nouveau jeton d'accès dans votre client Matrix ou l'interface d'administration, puis mettez à jour OpenClaw :

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
````

    Remplacez `assistant` par l'ID de compte de la commande ayant échoué, ou omettez `--account` pour le compte par défaut.

  </Accordion>

  <Accordion title="Hygiène des appareils"OpenClaw>
    Les anciens appareils gérés par OpenClaw peuvent s'accumuler. Liste et nettoyage :

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="Magasin de chiffrement"Matrix>
    Le chiffrement de bout en bout (E2EE) de Matrix utilise le chemin officiel de chiffrement Rust `matrix-js-sdk` avec `fake-indexeddb` comme shim IndexedDB. L'état de chiffrement est persisté dans `crypto-idb-snapshot.json` (autorisations de fichier restrictives).

    L'état chiffré du runtime se trouve sous `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`OpenClaw et inclut le magasin de synchronisation, le magasin de chiffrement, la clé de récupération, l'instantané IDB, les liaisons de threads et l'état de vérification au démarrage. Lorsque le jeton change mais que l'identité du compte reste la même, OpenClaw réutilise la meilleure racine existante afin que l'état précédent reste visible.

  </Accordion>
</AccordionGroup>

## Gestion du profil

Mettre à jour le profil Matrix du compte sélectionné :

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Vous pouvez passer les deux options en un seul appel. Matrix accepte les URL d'avatar Matrix`mxc://` directement ; lorsque vous passez `http://` ou `https://`OpenClaw, OpenClaw télécharge d'abord le fichier et stocke l'URL `mxc://` résolue dans `channels.matrix.avatarUrl` (ou le remplacement par compte).

## Threads

Matrix prend en charge les fils de discussion natifs Matrix pour les réponses automatiques ainsi que pour les envois via l'outil de message. Deux paramètres indépendants contrôlent le comportement :

### Routage de session (`sessionScope`)

`dm.sessionScope`MatrixOpenClaw décide comment les salons Matrix DM correspondent aux sessions OpenClaw :

- `"per-user"` (par défaut) : tous les salons DM avec le même pair routé partagent une seule session.
- `"per-room"`Matrix : chaque salon Matrix DM dispose de sa propre clé de session, même lorsque le pair est le même.

Les liaisons de conversation explicites priment toujours sur `sessionScope`, les salons et fils liés conservant donc leur session cible choisie.

### Fils de réponse (`threadReplies`)

`threadReplies` décide où le bot publie sa réponse :

- `"off"` : les réponses sont de premier niveau. Les messages entrants dans un fil restent sur la session parente.
- `"inbound"` : répondre dans un fil uniquement lorsque le message entrant était déjà dans ce fil.
- `"always"` : répondre dans un fil ancré au message déclencheur ; cette conversation est acheminée via une session à portée de fil correspondante à partir du premier déclencheur.

`dm.threadReplies` remplace ce paramètre uniquement pour les DM — par exemple, isoler les fils de salon tout en gardant les DM à plat.

### Héritage de fil et commandes slash

- Les messages entrants dans un fil incluent le message racine du fil comme contexte supplémentaire pour l'agent.
- Les envois via l'outil de message héritent automatiquement du fil Matrix actuel lors du ciblage du même salon (ou du même utilisateur DM), sauf si un Matrix`threadId` explicite est fourni.
- La réutilisation de la cible utilisateur DM ne s'active que lorsque les métadonnées de la session actuelle prouvent le même pair DM sur le même compte Matrix ; sinon OpenClaw revient au routage normal à portée utilisateur.
- `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` et `/acp spawn`Matrix liés à un fil fonctionnent tous dans les salons Matrix et les DM.
- Top-level `/focus`Matrix creates a new Matrix thread and binds it to the target session when `threadBindings.spawnSessions` is enabled.
- Running `/focus` or `/acp spawn --thread here`Matrix inside an existing Matrix thread binds that thread in place.

When OpenClaw detects a Matrix DM room colliding with another DM room on the same shared session, it posts a one-time OpenClawMatrix`m.notice` in that room pointing to the `/focus` escape hatch and suggesting a `dm.sessionScope` change. The notice only appears when thread bindings are enabled.

## ACP conversation bindings

Matrix rooms, DMs, and existing Matrix threads can be turned into durable ACP workspaces without changing the chat surface.

Fast operator flow:

- Run `/acp spawn codex --bind here`Matrix inside the Matrix DM, room, or existing thread you want to keep using.
- In a top-level Matrix DM or room, the current DM/room stays the chat surface and future messages route to the spawned ACP session.
- Inside an existing Matrix thread, Matrix`--bind here` binds that current thread in place.
- `/new` and `/reset` reset the same bound ACP session in place.
- `/acp close` closes the ACP session and removes the binding.

Notes:

- `--bind here`Matrix does not create a child Matrix thread.
- `threadBindings.spawnSessions` gates `/acp spawn --thread auto|here`OpenClawMatrix, where OpenClaw needs to create or bind a child Matrix thread.

### Thread binding config

Matrix inherits global defaults from Matrix`session.threadBindings`, and also supports per-channel overrides:

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

Matrix thread-bound session spawns default on:

- Définissez `threadBindings.spawnSessions: false` pour bloquer les `/focus` et `/acp spawn --thread auto|here`Matrix de premier niveau de la création/liaison de fils Matrix.
- Définissez `threadBindings.defaultSpawnContext: "isolated"` lorsque les créations de fils de sous-agents natifs ne doivent pas dupliquer la transcription parente.

## Réactions

Matrix prend en charge les réactions sortantes, les notifications de réactions entrantes et les réactions d'accusé de réception.

Les outils de réaction sortante sont limités par `channels.matrix.actions.reactions` :

- `react`Matrix ajoute une réaction à un événement Matrix.
- `reactions`Matrix résume les réactions actuelles pour un événement Matrix.
- `emoji=""` supprime les propres réactions du bot sur cet événement.
- `remove: true` supprime uniquement la réaction emoji spécifiée du bot.

**Ordre de résolution** (la première valeur définie l'emporte) :

| Paramètre               | Ordre                                                                                |
| ----------------------- | ------------------------------------------------------------------------------------ |
| `ackReaction`           | par compte → channel → `messages.ackReaction` → emoji de repli d'identité de l'agent |
| `ackReactionScope`      | par compte → channel → `messages.ackReactionScope` → `"group-mentions"` par défaut   |
| `reactionNotifications` | par compte → channel → `"own"` par défaut                                            |

`reactionNotifications: "own"` transmet les événements `m.reaction`Matrix ajoutés lorsqu'ils ciblent des messages Matrix créés par le bot ; `"off"`Matrix désactive les événements système de réaction. Les suppressions de réactions ne sont pas synthétisées en événements système car Matrix les présente sous forme de rédactions, et non comme des suppressions autonomes de `m.reaction`.

## Historique du contexte

- `channels.matrix.historyLimit` contrôle le nombre de messages de salle récents inclus en tant que `InboundHistory`Matrix lorsqu'un message de salle Matrix déclenche l'agent. Revient à `messages.groupChat.historyLimit` ; si les deux ne sont pas définis, la valeur par défaut effective est `0`. Définissez `0` pour désactiver.
- L'historique des salles Matrix est limité à la salle. Les DMs continuent d'utiliser l'historique de session normal.
- L'historique des salons Matrix est en attente uniquement : OpenClaw met en mémoire tampon les messages de salon qui n'ont pas encore déclenché de réponse, puis capture cette fenêtre lorsqu'une mention ou un autre déclencheur arrive.
- Le message déclencheur actuel n'est pas inclus dans `InboundHistory` ; il reste dans le corps entrant principal pour ce tour.
- Les nouvelles tentatives du même événement Matrix réutilisent la capture d'historique originale au lieu de dériver vers des messages de salon plus récents.

## Visibilité du contexte

Matrix prend en charge le contrôle partagé Matrix`contextVisibility` pour le contexte supplémentaire du salon tel que le texte de réponse récupéré, les racines de fils de discussion et l'historique en attente.

- `contextVisibility: "all"` est la valeur par défaut. Le contexte supplémentaire est conservé tel qu'il a été reçu.
- `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés par les vérifications actives de liste blanche de salon/utilisateur.
- `contextVisibility: "allowlist_quote"` se comporte comme `allowlist`, mais conserve toujours une réponse citée explicite.

Ce paramètre affecte la visibilité du contexte supplémentaire, et non le fait que le message entrant lui-même puisse déclencher une réponse.
L'autorisation de déclenchement provient toujours de `groupPolicy`, `groups`, `groupAllowFrom`, et des paramètres de stratégie de DM.

## Stratégie de DM et de salon

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
        "!roomid:example.org": { requireMention: true },
      },
    },
  },
}
```

Pour faire taire complètement les DM tout en gardant les salons fonctionnels, définissez `dm.enabled: false` :

```json5
{
  channels: {
    matrix: {
      dm: { enabled: false },
      groupPolicy: "allowlist",
      groupAllowFrom: ["@admin:example.org"],
    },
  },
}
```

Voir [Groups](/fr/channels/groups) pour le comportement de filtrage des mentions et des listes blanches.

Exemple d'appairage pour les DM Matrix :

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un utilisateur Matrix non approuvé continue à vous envoyer des messages avant l'approbation, OpenClaw réutilise le même code d'appariage en attente et peut envoyer une réponse de rappel après un court délai de recharge au lieu de générer un nouveau code.

Voir [Pairing](/fr/channels/pairing) pour le flux d'appairage DM partagé et la disposition du stockage.

## Réparation directe de salon

Si l'état des messages directs se désynchronise, OpenClaw peut se retrouver avec des mappages OpenClaw`m.direct` périmés qui pointent vers d'anciens salons en solo au lieu du DM actif. Inspectez le mappage actuel pour un pair :

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Réparez-le :

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

Les deux commandes acceptent `--account <id>` pour les configurations multi-comptes. Le flux de réparation :

- préfère un DM 1:1 strict déjà mappé dans `m.direct`
- revient à n'importe quel DM 1:1 strict actuellement rejoint avec cet utilisateur
- crée une nouvelle salle directe et réécrit `m.direct` si aucun DM sain n'existe

Il ne supprime pas automatiquement les anciennes salles. Il choisit le DM sain et met à jour le mappage pour que les futurs envois Matrix, les avis de vérification et les autres flux de messages directs ciblent la bonne salle.

## Approbations Exec

Matrix peut agir comme un client d'approbation natif. Configurez sous `channels.matrix.execApprovals` (ou `channels.matrix.accounts.<account>.execApprovals` pour une substitution par compte) :

- `enabled` : délivre les approbations via des invites natives Matrix. Lorsqu'il est non défini ou sur `"auto"`, Matrix s'active automatiquement une fois qu'au moins un approbateur peut être résolu. Définissez `false` pour désactiver explicitement.
- `approvers` : ID utilisateur Matrix (`@owner:example.org`) autorisés à approuver les requêtes exec. Facultatif - revient à `channels.matrix.dm.allowFrom`.
- `target` : destination des invites. `"dm"` (par défaut) envoie aux DMs des approbateurs ; `"channel"` envoie à la salle ou au DM Matrix d'origine ; `"both"` envoie aux deux.
- `agentFilter` / `sessionFilter` : listes d'autorisation (allowlists) facultatives pour lesquels agents/sessions déclenchent la livraison Matrix.

L'autorisation diffère légèrement selon le type d'approbation :

- **Les approbations Exec** utilisent `execApprovals.approvers`, en revenant à `dm.allowFrom`.
- **Les approbations de plugin** s'autorisent uniquement via `dm.allowFrom`.

Les deux types partagent les raccourcis de réaction Matrix et les mises à jour de messages. Les approbateurs voient les raccourcis de réaction sur le message d'approbation principal :

- `✅` autoriser une fois
- `❌` refuser
- `♾️` autoriser toujours ( lorsque la stratégie exec effective le permet)

Commandes slash de repli : `/approve <id> allow-once`, `/approve <id> allow-always`, `/approve <id> deny`.

Seuls les approbateurs résolus peuvent approuver ou refuser. La diffusion sur le canal pour les approbations d'exécution inclut le texte de la commande - n'activez `channel` ou `both` que dans les salons de confiance.

Connexe : [Approbations d'exécution](/fr/tools/exec-approvals).

## Commandes slash

Les commandes slash (`/new`, `/reset`, `/model`, `/focus`, `/unfocus`, `/agents`, `/session`, `/acp`, `/approve`, etc.) fonctionnent directement dans les DMs. Dans les salons, OpenClaw reconnaît également les commandes préfixées par la propre mention Matrix du bot, donc `@bot:server /new` déclenche le chemin de commande sans regex de mention personnalisée. Cela maintient le bot réactif aux publications de style salon `@mention /command` qu'Element et les clients similaires émettent lorsqu'un utilisateur complète le bot par tabulation avant de taper la commande.

Les règles d'autorisation s'appliquent toujours : les expéditeurs de commandes doivent satisfaire aux mêmes stratégies de liste d'autorisation/de propriétaire de DM ou de salon que les messages simples.

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

**Héritage :**

- Les valeurs `channels.matrix` de premier niveau servent de valeurs par défaut pour les comptes nommés, sauf si un compte les remplace.
- Délimitez une entrée de salon héritée à un compte spécifique avec `groups.<room>.account`. Les entrées sans `account` sont partagées entre les comptes ; `account: "default"` fonctionne toujours lorsque le compte par défaut est configuré au premier niveau.

**Sélection du compte par défaut :**

- Définissez `defaultAccount` pour choisir le compte nommé que le routage implicite, la sonde et les commandes CLI préfèrent.
- Si vous avez plusieurs comptes et que l'un d'eux est littéralement nommé `default`, OpenClaw l'utilise implicitement même lorsque `defaultAccount` n'est pas défini.
- Si vous avez plusieurs comptes nommés et qu'aucun n'est sélectionné par défaut, les commandes CLI refusent de deviner - définissez `defaultAccount` ou passez `--account <id>`.
- Le bloc `channels.matrix.*` de premier niveau n'est traité comme le compte `default` implicite que lorsque son authentification est complète (`homeserver` + `accessToken`, ou `homeserver` + `userId` + `password`). Les comptes nommés restent découvrables via `homeserver` + `userId` une fois que les informations d'identification mises en cache couvrent l'authentification.

**Promotion :**

- Lorsque OpenClaw promeut une configuration à compte unique vers une configuration multi-compte lors d'une réparation ou d'une configuration, il conserve le compte nommé existant s'il y en a un ou si `defaultAccount` pointe déjà vers l'un d'eux. Seules les clés d'authentification/d'amorçage Matrix sont déplacées vers le compte promu ; les clés de stratégie de livraison partagées restent au niveau supérieur.

Voir [Référence de configuration](/fr/gateway/config-channels#multi-account-all-channels) pour le modèle multi-compte partagé.

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

Cette option autorise uniquement les cibles privées/internes de confiance. Les serveurs domestiques publics en clair tels que
`http://matrix.example.org:8008` restent bloqués. Privilégiez `https://` autant que possible.

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

Les comptes nommés peuvent remplacer la valeur par défaut de premier niveau avec `channels.matrix.accounts.<id>.proxy`.
OpenClaw utilise le même paramètre de proxy pour le trafic d'exécution Matrix et les sondes de statut de compte.

## Résolution de cible

Matrix accepte ces formes de cibles n'importe où OpenClaw vous demande une cible de salle ou d'utilisateur :

- Utilisateurs : `@user:server`, `user:@user:server`, ou `matrix:user:@user:server`
- Salles : `!room:server`, `room:!room:server`, ou `matrix:room:!room:server`
- Alias : `#alias:server`, `channel:#alias:server`, ou `matrix:channel:#alias:server`

Les ID de salle Matrix sont sensibles à la casse. Utilisez la casse exacte de l'ID de salle provenant de Matrix
lors de la configuration de cibles de livraison explicites, de tâches cron, de liaisons ou de listes autorisées.
OpenClaw conserve les clés de session internes sous forme canonique pour le stockage, ces clés en
minuscules ne constituent donc pas une source fiable pour les ID de livraison Matrix.

La recherche dans l'annuaire en direct utilise le compte Matrix connecté :

- Les recherches d'utilisateurs interrogent l'annuaire des utilisateurs Matrix sur ce serveur d'accueil.
- Les recherches de salle acceptent directement les ID de salle explicites et les alias. La recherche par nom de salle rejointe est effectuée au mieux et ne s'applique qu'aux listes autorisées de salle à l'exécution lorsque `dangerouslyAllowNameMatching: true` est défini.
- Si un nom de salle ne peut pas être résolu en un ID ou un alias, il est ignoré lors de la résolution de la liste autorisée à l'exécution.

## Référence de configuration

Les champs utilisateur de style liste autorisée (`groupAllowFrom`, `dm.allowFrom`, `groups.<room>.users`Matrix) acceptent les ID d'utilisateur Matrix complets (le plus sûr). Les entrées utilisateur sans ID sont ignorées par défaut. Si vous définissez `dangerouslyAllowNameMatching: true`Matrix, les correspondances exactes de noms d'affichage de l'annuaire Matrix sont résolues au démarrage et à chaque fois que la liste autorisée change pendant que le moniteur est en cours d'exécution ; les entrées qui ne peuvent pas être résolues sont ignorées à l'exécution.

Les clés de liste autorisée de salle (`groups`, `rooms` obsolète) doivent être des ID de salle ou des alias. Les clés de nom de salle brut sont ignorées par défaut ; `dangerouslyAllowNameMatching: true` rétablit la recherche au mieux sur les noms des salles rejointes.

### Compte et connexion

- `enabled` : activer ou désactiver le channel.
- `name` : libellé d'affichage optionnel pour le compte.
- `defaultAccount` : ID de compte préféré lorsque plusieurs comptes Matrix sont configurés.
- `accounts` : remplacements nommés par compte. Les valeurs de niveau supérieur `channels.matrix` sont héritées par défaut.
- `homeserver` : URL du serveur d'accueil (homeserver), par exemple `https://matrix.example.org`.
- `network.dangerouslyAllowPrivateNetwork` : autoriser ce compte à se connecter à `localhost`, aux IP LAN/Tailscale, ou aux noms d'hôtes internes.
- `proxy` : URL de proxy HTTP(S) optionnelle pour le trafic Matrix. Une remplacement par compte est pris en charge.
- `userId` : ID utilisateur complet Matrix (`@bot:example.org`).
- `accessToken` : jeton d'accès pour l'authentification par jeton. Les valeurs en texte clair et SecretRef sont prises en charge via les fournisseurs env/file/exec ([Secrets Management](/fr/gateway/secrets)).
- `password` : mot de passe pour la connexion par mot de passe. Les valeurs en texte clair et SecretRef sont prises en charge.
- `deviceId` : ID d'appareil Matrix explicite.
- `deviceName` : nom d'affichage de l'appareil utilisé lors de la connexion par mot de passe.
- `avatarUrl` : URL stockée de l'auto-avatar pour la synchronisation du profil et les mises à jour `profile set`.
- `initialSyncLimit` : nombre maximum d'événements récupérés lors de la synchronisation au démarrage.

### Chiffrement

- `encryption` : activer le chiffrement de bout en bout (E2EE). Par défaut : `false`.
- `startupVerification` : `"if-unverified"` (par défaut lorsque E2EE est activé) ou `"off"`. Demande automatiquement l'auto-vérification au démarrage lorsque cet appareil n'est pas vérifié.
- `startupVerificationCooldownHours` : temps de refroidissement avant la prochaine demande automatique au démarrage. Par défaut : `24`.

### Accès et politique

- `groupPolicy` : `"open"`, `"allowlist"`, ou `"disabled"`. Par défaut : `"allowlist"`.
- `groupAllowFrom` : liste d'autorisation des IDs utilisateur pour le trafic de salle.
- `dm.enabled` : lorsque `false`, ignore tous les DMs. Par défaut : `true`.
- `dm.policy` : `"pairing"` (par défaut), `"allowlist"`, `"open"`, ou `"disabled"`. S'applique une fois que le bot a rejoint et classifié la salle comme un DM ; n'affecte pas la gestion des invitations.
- `dm.allowFrom` : liste d'autorisation des IDs utilisateur pour le trafic DM.
- `dm.sessionScope` : `"per-user"` (par défaut) ou `"per-room"`.
- `dm.threadReplies` : substitution pour les DM uniquement pour le threading des réponses (`"off"`, `"inbound"`, `"always"`).
- `allowBots` : accepter les messages d'autres comptes bot Matrix configurés (`true` ou `"mentions"`).
- `allowlistOnly` : lorsque `true`, force toutes les stratégies DM actives (à l'exception de `"disabled"`) et les stratégies de groupe `"open"` à `"allowlist"`. Ne modifie pas les stratégies `"disabled"`.
- `dangerouslyAllowNameMatching` : lorsque `true`, permet la recherche par nom d'affichage Matrix pour les entrées de liste d'autorisation utilisateur et la recherche par nom de salle rejointe pour les clés de liste d'autorisation de salle. Préférez les IDs `@user:server` complets et les IDs ou alias de salle.
- `autoJoin` : `"always"`, `"allowlist"`, ou `"off"`. Par défaut : `"off"`. S'applique à chaque invitation Matrix, y compris les invitations de type DM.
- `autoJoinAllowlist` : salles/alias autorisés lorsque `autoJoin` est `"allowlist"`. Les entrées d'alias sont résolues par rapport au serveur domestique, et non par rapport à l'état déclaré par la salle invitée.
- `contextVisibility` : visibilité du contexte supplémentaire (`"all"` par défaut, `"allowlist"`, `"allowlist_quote"`).

### Comportement de réponse

- `replyToMode` : `"off"`, `"first"`, `"all"`, ou `"batched"`.
- `threadReplies` : `"off"`, `"inbound"`, ou `"always"`.
- `threadBindings` : substitutions par channel pour le routage et le cycle de vie des sessions liées aux fils.
- `streaming` : `"off"` (par défaut), `"partial"`, `"quiet"`, ou sous forme d'objet `{ mode, preview: { toolProgress } }`. `true` ↔ `"partial"`, `false` ↔ `"off"`.
- `blockStreaming` : lorsque `true`, les blocs d'assistant terminés sont conservés sous forme de messages de progression distincts.
- `markdown` : configuration optionnelle du rendu Markdown pour le texte sortant.
- `responsePrefix` : chaîne optionnelle ajoutée au début des réponses sortantes.
- `textChunkLimit` : taille des blocs sortants en caractères lorsque `chunkMode: "length"`. Par défaut : `4000`.
- `chunkMode` : `"length"` (par défaut, divise par nombre de caractères) ou `"newline"` (divise aux limites de ligne).
- `historyLimit` : nombre de messages récents de la salle inclus en tant que `InboundHistory` lorsqu'un message de salle déclenche l'agent. Revient à `messages.groupChat.historyLimit` ; par défaut effectif `0` (désactivé).
- `mediaMaxMb` : limite de taille du média en Mo pour l'envoi sortant et le traitement entrant.

### Paramètres de réaction

- `ackReaction` : substitution de la réaction d'accusé de réception pour ce channel/compte.
- `ackReactionScope` : remplacement de la portée (`"group-mentions"` par défaut, `"group-all"`, `"direct"`, `"all"`, `"none"`, `"off"`).
- `reactionNotifications` : mode de notification des réactions entrantes (`"own"` par défaut, `"off"`).

### Outils et remplacements par salle

- `actions` : filtrage des outils par action (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).
- `groups` : carte de stratégie par salle. L'identité de session utilise l'ID stable de la salle après résolution. (`rooms` est un alias hérité.)
  - `groups.<room>.account` : restreindre une entrée de salle héritée à un compte spécifique.
  - `groups.<room>.allowBots` : remplacement par salle du paramètre au niveau du channel (`true` ou `"mentions"`).
  - `groups.<room>.users` : liste d'autorisation des expéditeurs par salle.
  - `groups.<room>.tools` : remplacements d'autorisation/refus des outils par salle.
  - `groups.<room>.autoReply` : remplacement du filtrage des mentions par salle. `true` désactive les exigences de mention pour cette salle ; `false` les réactive.
  - `groups.<room>.skills` : filtre de compétence par salle.
  - `groups.<room>.systemPrompt` : extrait de prompt système par salle.

### Paramètres d'approbation Exec

- `execApprovals.enabled` : délivrer les approbations exec via des invites natives Matrix.
- `execApprovals.approvers` : ID utilisateur Matrix autorisés à approuver. Revient à `dm.allowFrom`.
- `execApprovals.target` : `"dm"` (par défaut), `"channel"` ou `"both"`.
- `execApprovals.agentFilter` / `execApprovals.sessionFilter` : listes d'autorisation optionnelles d'agent/session pour la livraison.

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) - tous les canaux pris en charge
- [Appariement](/fr/channels/pairing) - authentification par DM et flux d'appariement
- [Groupes](/fr/channels/groups) - comportement des discussions de groupe et filtrage des mentions
- [Routage des canaux](/fr/channels/channel-routing) - routage de session pour les messages
- [Sécurité](/fr/gateway/security) - modèle d'accès et durcissement
