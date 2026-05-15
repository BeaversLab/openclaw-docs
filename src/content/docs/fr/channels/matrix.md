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

`plugins install` enregistre et active le plugin, donc aucune étape `openclaw plugins enable matrix` séparée n'est nécessaire. Le plugin ne fait toujours rien tant que vous ne configurez pas le canal ci-dessous. Consultez [Plugins](/fr/tools/plugin) pour le comportement général des plugins et les règles d'installation.

## Configuration

1. Créez un compte Matrix sur votre serveur d'accueil.
2. Configurez `channels.matrix` avec soit `homeserver` + `accessToken`, soit `homeserver` + `userId` + `password`.
3. Redémarrez la passerelle.
4. Démarrez un DM avec le bot, ou invitez-le dans une salle (voir [auto-join](#auto-join) - les nouvelles invitations n'aboutissent que lorsque `autoJoin` les autorise).

### Configuration interactive

```bash
openclaw channels add
openclaw configure --section channels
```

L'assistant demande : l'URL du serveur d'accueil, la méthode d'authentification (jeton d'accès ou mot de passe), l'ID utilisateur (authentification par mot de passe uniquement), le nom d'appareil facultatif, s'il faut activer E2EE, et s'il faut configurer l'accès aux salles et l'auto-join.

Si des variables d'environnement `MATRIX_*` correspondantes existent déjà et que le compte sélectionné n'a aucune authentification sauvegardée, l'assistant propose un raccourci variable d'environnement. Pour résoudre les noms de salle avant de sauvegarder une liste blanche, exécutez `openclaw channels resolve --channel matrix "Project Room"`. Lorsque E2EE est activé, l'assistant écrit la configuration et exécute le même amorçage que [`openclaw matrix encryption setup`](#encryption-and-verification).

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

- DMs (`dm.allowFrom`, `groupAllowFrom`, `groups.<room>.users`) : utilisez `@user:server`. Les noms d'affichage ne sont résolus que lorsque le répertoire du serveur d'accueil renvoie exactement une correspondance.
- Salons (`groups`, `autoJoinAllowlist`) : utilisez `!room:server` ou `#alias:server`. Les noms sont résolus au mieux par rapport aux salons rejoints ; les entrées non résolues sont ignorées lors de l'exécution.

### Normalisation de l'ID de compte

L'assistant convertit un nom convivial en un ID de compte normalisé. Par exemple, `Ops Bot` devient `ops-bot`. La ponctuation est échappée dans les noms de variables d'environnement délimitées afin que deux comptes ne puissent pas entrer en collision : `-` → `_X2D_`, donc `ops-prod` correspond à `MATRIX_OPS_X2D_PROD_*`.

### Identifiants mis en cache

Matrix stocke les identifiants mis en cache sous `~/.openclaw/credentials/matrix/` :

- compte par défaut : `credentials.json`
- comptes nommés : `credentials-<account>.json`

Lorsque des informations d'identification mises en cache existent, OpenClaw considère Matrix comme configuré même si le jeton d'accès n'est pas dans le fichier de configuration - cela couvre la configuration, `openclaw doctor` et les sondes de l'état du channel.

### Variables d'environnement

Utilisées lorsque la clé de configuration équivalente n'est pas définie. Le compte par défaut utilise des noms sans préfixe ; les comptes nommés utilisent l'ID de compte inséré avant le suffixe.

| Compte par défaut     | Compte nommé (`<ID>` est l'ID de compte normalisé) |
| --------------------- | -------------------------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`                           |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`                         |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                              |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`                             |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`                            |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`                          |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`                         |

Pour le compte `ops`, les noms deviennent `MATRIX_OPS_HOMESERVER`, `MATRIX_OPS_ACCESS_TOKEN`, et ainsi de suite. Les variables d'environnement de clé de récupération sont lues par les flux CLI conscients de la récupération (`verify backup restore`, `verify device`, `verify bootstrap`) lorsque vous canalisez la clé via `--recovery-key-stdin`.

`MATRIX_HOMESERVER` ne peut pas être défini depuis un `.env` d'espace de travail ; voir [Fichiers `.env` d'espace de travail](/fr/gateway/security).

## Exemple de configuration

Une base pratique avec l'appariement DM, la liste d'autorisation des salles et l'E2EE :

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

Le streaming de réponse Matrix est optionnel. `streaming` contrôle la manière dont OpenClaw délivre la réponse de l'assistant en cours ; `blockStreaming` contrôle si chaque bloc terminé est conservé comme son propre message Matrix.

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

Pour conserver les aperçus de réponses en direct mais masquer les lignes d'outil/progression temporaires, utilisez le formulaire
objet :

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

| `streaming`          | Comportement                                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"off"` (par défaut) | Wait for the full reply, send once. `true` ↔ `"partial"`, `false` ↔ `"off"`.                                                                                        |
| `"partial"`          | Edit one normal text message in place as the model writes the current block. Stock Matrix clients may notify on the first preview, not the final edit.              |
| `"quiet"`            | Same as `"partial"` but the message is a non-notifying notice. Recipients only get a notification once a per-user push rule matches the finalized edit (see below). |

`blockStreaming` is independent of `streaming`:

| `streaming`             | `blockStreaming: true`                                              | `blockStreaming: false` (default)                    |
| ----------------------- | ------------------------------------------------------------------- | ---------------------------------------------------- |
| `"partial"` / `"quiet"` | Live draft for the current block, completed blocks kept as messages | Live draft for the current block, finalized in place |
| `"off"`                 | One notifying Matrix message per finished block                     | One notifying Matrix message for the full reply      |

Notes:

- If a preview grows past Matrix's per-event size limit, OpenClaw stops preview streaming and falls back to final-only delivery.
- Media replies always send attachments normally. If a stale preview can no longer be reused safely, OpenClaw redacts it before sending the final media reply.
- Tool-progress preview updates are enabled by default when Matrix preview streaming is active. Set `streaming.preview.toolProgress: false` to keep preview edits for answer text but leave tool progress on the normal delivery path.
- Preview edits cost extra Matrix API calls. Leave `streaming: "off"` if you want the most conservative rate-limit profile.

## Approval metadata

Les invites d'approbation natives de Matrix sont des événements `m.room.message` normaux avec un contenu d'événement personnalisé spécifique à OpenClaw sous `com.openclaw.approval`. Matrix permet les clés de contenu d'événement personnalisées, donc les clients standards affichent toujours le corps du texte tandis que les clients conscients de OpenClaw peuvent lire l'ID d'approbation structuré, le type, l'état, les décisions disponibles et les détails exéc/plugin.

Lorsqu'une invite d'approbation est trop longue pour un seul événement Matrix, OpenClaw divise le texte visible et attache `com.openclaw.approval` uniquement au premier fragment. Les réactions pour les décisions d'autorisation/refus sont liées à ce premier événement, donc les longues invites conservent la même cible d'approbation que les invites à événement unique.

### Règles de push auto-hébergées pour les prévisualisations finalisées silencieuses

`streaming: "quiet"` notifie les destinaires uniquement une fois qu'un bloc ou un tour est finalisé - une règle de notification par utilisateur doit correspondre au marqueur d'aperçu finalisé. Consultez les [règles de notification Matrix pour les aperçus silencieux](/fr/channels/matrix-push-rules) pour la recette complète (jeton du destinataire, vérification du pusher, installation de la règle, notes par serveur domestique).

## Salons bot-à-bot

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

- `allowBots: true` accepte les messages d'autres comptes bot Matrix configurés dans les salons et DMs autorisés.
- `allowBots: "mentions"` accepte ces messages uniquement lorsqu'ils mentionnent visiblement ce bot dans les salons. Les DMs sont toujours autorisés.
- `groups.<room>.allowBots` remplace le paramètre au niveau du compte pour un salon.
- OpenClaw ignore toujours les messages provenant du même ID utilisateur Matrix pour éviter les boucles d'auto-réponse.
- Matrix n'expose pas de drapeau de bot natif ici ; OpenClaw traite « rédigé par un bot » comme « envoyé par un autre compte Matrix configuré sur cette passerelle OpenClaw ».

Utilisez des listes blanches de salles strictes et des exigences de mention lors de l'activation du trafic bot-à-bot dans les salles partagées.

## Chiffrement et vérification

Dans les salles chiffrées (E2EE), les événements d'image sortants utilisent `thumbnail_file` afin que les aperçus d'images soient chiffrés avec la pièce jointe complète. Les salles non chiffrées utilisent toujours du `thumbnail_url` en clair. Aucune configuration n'est nécessaire - le plugin détecte automatiquement l'état E2EE.

Toutes les commandes `openclaw matrix` acceptent `--verbose` (diagnostics complets), `--json` (sortie lisible par machine) et `--account <id>` (configurations multi-comptes). La sortie est concise par défaut avec une journalisation interne silencieuse du SDK. Les exemples ci-dessous montrent la forme canonique ; ajoutez les indicateurs selon les besoins.

### Activer le chiffrement

```bash
openclaw matrix encryption setup
```

Initialise le stockage des secrets et la signature croisée, crée une sauvegarde des clés de salle si nécessaire, puis imprime l'état et les étapes suivantes. Indicateurs utiles :

- `--recovery-key <key>` appliquer une clé de récupération avant l'initialisation (préférer la forme stdin documentée ci-dessous)
- `--force-reset-cross-signing` abandonner l'identité de signature croisée actuelle et en créer une nouvelle (à utiliser uniquement intentionnellement)

Pour un nouveau compte, activez l'E2EE au moment de la création :

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

### État et signaux de confiance

```bash
openclaw matrix verify status
openclaw matrix verify status --include-recovery-key --json
```

`verify status` signale trois signaux de confiance indépendants (`--verbose` les affiche tous) :

- `Locally trusted` : approuvé par ce client uniquement
- `Cross-signing verified` : le SDK signale la vérification via la signature croisée
- `Signed by owner` : signé par votre propre clé d'auto-signature (diagnostic uniquement)

`Verified by owner` devient `yes` uniquement lorsque `Cross-signing verified` est `yes`. La confiance locale ou une signature de propriétaire seule ne suffit pas.

`--allow-degraded-local-state` renvoie des diagnostics de meilleure qualité sans préparer le compte Matrix au préalable ; utile pour les sondages hors ligne ou partiellement configurés.

### Vérifier cet appareil avec une clé de récupération

La clé de récupération est sensible - transmettez-la via stdin au lieu de la passer en ligne de commande. Définissez `MATRIX_RECOVERY_KEY` (ou `MATRIX_<ID>_RECOVERY_KEY` pour un compte nommé) :

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

La commande signale trois états :

- `Recovery key accepted` : Matrix a accepté la clé pour le stockage des secrets ou la confiance de l'appareil.
- `Backup usable` : la sauvegarde des clés de salle peut être chargée avec le matériel de récupération approuvé.
- `Device verified by owner` : cet appareil dispose d'une confiance totale d'identité de signature croisée Matrix.

Elle renvoie un code non nul lorsque la confiance totale de l'identité est incomplète, même si la clé de récupération a déverrouillé le matériel de sauvegarde. Dans ce cas, terminez l'auto-vérification depuis un autre client Matrix :

```bash
openclaw matrix verify self
```

`verify self` attend `Cross-signing verified: yes` avant de se terminer avec succès. Utilisez `--timeout-ms <ms>` pour ajuster l'attente.

Le formulaire de clé littérale `openclaw matrix verify device "<recovery-key>"` est également accepté, mais la clé finit dans l'historique de votre shell.

### Amorcer ou réparer la signature croisée

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` est la commande de réparation et de configuration pour les comptes chiffrés. Dans l'ordre, elle :

- amorce le stockage des secrets, en réutilisant une clé de récupération existante si possible
- amorce la signature croisée et téléverse les clés publiques manquantes
- marque et signe de manière croisée l'appareil actuel
- crée une sauvegarde des clés de salle côté serveur si elle n'existe pas déjà

Si le serveur domestique exige l'UIA pour téléverser les clés de signature croisée, OpenClaw essaie d'abord sans authentification, puis `m.login.dummy`, puis `m.login.password` (nécessite `channels.matrix.password`).

Indicateurs utiles :

- `--recovery-key-stdin` (à associer à `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …`) ou `--recovery-key <key>`
- `--force-reset-cross-signing` pour supprimer l'identité de signature croisée actuelle (uniquement intentionnel)

### Sauvegarde des clés de salle

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` indique si une sauvegarde côté serveur existe et si cet appareil peut la déchiffrer. `backup restore` importe les clés de salle sauvegardées dans le magasin de chiffrement local ; si la clé de récupération est déjà sur le disque, vous pouvez omettre `--recovery-key-stdin`.

Pour remplacer une sauvegarde corrompue par une nouvelle base de référence (accepte de perdre l'ancien historique non récupérable ; peut également recréer le stockage de secrets si le secret de sauvegarde actuel ne peut pas être chargé) :

```bash
openclaw matrix verify backup reset --yes
```

Ajoutez `--rotate-recovery-key` uniquement lorsque vous voulez intentionnellement que la clé de récupération précédente cesse de déverrouiller la nouvelle base de référence de sauvegarde.

### Lister, demander et répondre aux vérifications

```bash
openclaw matrix verify list
```

Liste les demandes de vérification en attente pour le compte sélectionné.

```bash
openclaw matrix verify request --own-user
openclaw matrix verify request --user-id @ops:example.org --device-id ABCDEF
```

Envoie une demande de vérification depuis ce compte OpenClaw. `--own-user` demande une auto-vérification (vous acceptez l'invite dans un autre client Matrix du même utilisateur) ; `--user-id`/`--device-id`/`--room-id` ciblent quelqu'un d'autre. `--own-user` ne peut pas être combiné avec les autres indicateurs de ciblage.

Pour une gestion de cycle de vie de bas niveau - généralement lors de la duplication des demandes entrantes d'un autre client - ces commandes agissent sur une demande spécifique `<id>` (affichée par `verify list` et `verify request`) :

| Commande                                   | Objectif                                                                      |
| ------------------------------------------ | ----------------------------------------------------------------------------- |
| `openclaw matrix verify accept <id>`       | Accepter une demande entrante                                                 |
| `openclaw matrix verify start <id>`        | Démarrer le flux SAS                                                          |
| `openclaw matrix verify sas <id>`          | Afficher les émojis ou les décimales SAS                                      |
| `openclaw matrix verify confirm-sas <id>`  | Confirmer que le SAS correspond à ce que l'autre client affiche               |
| `openclaw matrix verify mismatch-sas <id>` | Rejeter le SAS lorsque les émojis ou les décimales ne correspondent pas       |
| `openclaw matrix verify cancel <id>`       | Annuler ; accepte facultativement `--reason <text>` et `--code <matrix-code>` |

`accept`, `start`, `sas`, `confirm-sas`, `mismatch-sas` et `cancel` acceptent tous `--user-id` et `--room-id` comme indices de suite DM lorsque la vérification est ancrée à une salle de message direct spécifique.

### Notes multi-comptes

Sans `--account <id>`, les commandes de la Matrix CLI utilisent le compte par défaut implicite. Si vous avez plusieurs comptes nommés et n'avez pas défini `channels.matrix.defaultAccount`, ils refuseront de deviner et vous demanderont de choisir. Lorsque le E2EE est désactivé ou indisponible pour un compte nommé, les erreurs pointent vers la clé de configuration de ce compte, par exemple `channels.matrix.accounts.assistant.encryption`.

<AccordionGroup>
  <Accordion title="Comportement au démarrage">
    Avec `encryption: true`, `startupVerification` est défini par défaut sur `"if-unverified"`. Au démarrage, un appareil non vérifié demande une auto-vérification dans un autre client Matrix, en ignorant les doublons et en appliquant un temps de recharge (24 heures par défaut). Ajustez avec `startupVerificationCooldownHours` ou désactivez avec `startupVerification: "off"`.

    Le démarrage exécute également une passe d'amorçage cryptographique conservatrice qui réutilise le stockage de secrets actuel et l'identité de signature croisée. Si l'état d'amorçage est cassé, OpenClaw tente une réparation protégée même sans `channels.matrix.password` ; si le serveur d'accueil nécessite une authentification par mot de passe (UIA), le démarrage enregistre un avertissement et reste non fatal. Les appareils déjà signés par le propriétaire sont préservés.

    Voir [Migration Matrix](/fr/channels/matrix-migration) pour le processus complet de mise à niveau.

  </Accordion>

  <Accordion title="Notifications de vérification">
    Matrix publie des notifications du cycle de vie de la vérification dans la salle de vérification DM stricte sous forme de messages `m.notice` : demande, prêt (avec les instructions "Verify by emoji"), début/achèvement, et détails SAS (emoji/décimal) lorsque disponibles.

    Les demandes entrantes d'un autre client Matrix sont suivies et acceptées automatiquement. Pour l'auto-vérification, OpenClaw lance automatiquement le processus SAS et confirme son propre côté une fois la vérification par emoji disponible - vous devez toujours comparer et confirmer "They match" dans votre client Matrix.

    Les notifications du système de vérification ne sont pas transmises au pipeline de chat de l'agent.

  </Accordion>

  <Accordion title="MatrixPériphérique Matrix supprimé ou invalide">
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

  <Accordion title="Hygiène des périphériques"OpenClaw>
    Les anciens appareils gérés par OpenClaw peuvent s'accumuler. Listez-les et supprimez-les :

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="Stockage crypto"Matrix>
    Le chiffrement de bout en bout (E2EE) de Matrix utilise le chemin de chiffrement Rust officiel `matrix-js-sdk` avec `fake-indexeddb` comme shim IndexedDB. L'état de chiffrement persiste dans `crypto-idb-snapshot.json` (permissions de fichier restrictives).

    L'état d'exécution chiffré réside sous `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/`OpenClaw et comprend le magasin de synchronisation, le magasin de chiffrement, la clé de récupération, l'instantané IDB, les liaisons de threads et l'état de vérification au démarrage. Lorsque le jeton change mais que l'identité du compte reste la même, OpenClaw réutilise la meilleure racine existante afin que l'état précédent reste visible.

  </Accordion>
</AccordionGroup>

## Gestion du profil

Mettez à jour l'auto-profil Matrix pour le compte sélectionné :

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Vous pouvez transmettre les deux options en un seul appel. Matrix accepte directement les URL d'avatar Matrix`mxc://` ; lorsque vous transmettez `http://` ou `https://`OpenClaw, OpenClaw télécharge d'abord le fichier et stocke l'URL `mxc://` résolue dans `channels.matrix.avatarUrl` (ou le remplacement par compte).

## Fils de discussion

Matrix prend en charge les fils de discussion natifs Matrix pour les réponses automatiques ainsi que pour les envois via l'outil de message. Deux paramètres indépendants contrôlent le comportement :

### Routage de session (`sessionScope`)

`dm.sessionScope` détermine comment les salons de Matrix DM sont mappés aux sessions OpenClaw :

- `"per-user"` (par défaut) : tous les salons DM avec le même pair routé partagent une seule session.
- `"per-room"` : chaque salon DM Matrix obtient sa propre clé de session, même lorsque le pair est le même.

Les liaisons de conversation explicites l'emportent toujours sur `sessionScope`, de sorte que les salons et les fils liés conservent leur session cible choisie.

### Fils de discussion de réponse (`threadReplies`)

`threadReplies` décide où le bot publie sa réponse :

- `"off"` : les réponses sont au niveau supérieur. Les messages entrants en fil restent sur la session parente.
- `"inbound"` : répondre dans un fil uniquement lorsque le message entrant était déjà dans ce fil.
- `"always"` : répondre dans un fil ancré au message déclencheur ; cette conversation est acheminée via une session délimitée au fil correspondante dès le premier déclencheur.

`dm.threadReplies` remplace cela pour les DM uniquement - par exemple, garder les fils de salon isolés tout en gardant les DM à plat.

### Héritage de fil et commandes slash

- Les messages entrants en fil incluent le message racine du fil comme contexte d'agent supplémentaire.
- Les envois via l'outil de message héritent automatiquement du fil Matrix actuel lors du ciblage du même salon (ou de la même cible d'utilisateur DM), sauf si un `threadId` explicite est fourni.
- La réutilisation de la cible d'utilisateur DM ne s'active que lorsque les métadonnées de la session actuelle prouvent le même pair DM sur le même compte Matrix ; sinon, OpenClaw revient au routage normal de portée utilisateur.
- `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` et `/acp spawn` liés au fil fonctionnent tous dans les salons et les DM Matrix.
- Le `/focus`Matrix de niveau supérieur crée un nouveau fil Matrix et le lie à la session cible lorsque `threadBindings.spawnSessions` est activé.
- L'exécution de `/focus` ou `/acp spawn --thread here`Matrix dans un fil Matrix existant lie ce fil sur place.

Lorsqu'OpenClaw détecte une collision entre une salle DM Matrix et une autre salle DM sur la même session partagée, il publie un OpenClawMatrix`m.notice` unique dans cette salle pointant vers la porte de secours `/focus` et suggérant un changement de `dm.sessionScope`. L'avis n'apparaît que lorsque les liaisons de fils sont activées.

## Liaisons de conversation ACP

Les salles Matrix, les DM et les fils Matrix existants peuvent être transformés en espaces de travail ACP durables sans changer la surface de chat.

Flux rapide pour l'opérateur :

- Exécutez `/acp spawn codex --bind here`Matrix dans le DM Matrix, la salle ou le fil existant que vous souhaitez continuer à utiliser.
- Dans un DM Matrix ou une salle de niveau supérieur, le DM/salle actuel reste la surface de chat et les futurs messages sont acheminés vers la session ACP générée.
- Dans un fil Matrix existant, Matrix`--bind here` lie ce fil actuel sur place.
- `/new` et `/reset` réinitialisent la même session ACP liée sur place.
- `/acp close` ferme la session ACP et supprime la liaison.

Notes :

- `--bind here`Matrix ne crée pas de fil Matrix enfant.
- `threadBindings.spawnSessions` conditionne `/acp spawn --thread auto|here`OpenClawMatrix, où OpenClaw doit créer ou lier un fil Matrix enfant.

### Configuration de la liaison de fils

Matrix hérite des valeurs globales par défaut de Matrix`session.threadBindings`, et prend également en charge les remplacements par canal :

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSessions`
- `threadBindings.defaultSpawnContext`

La session liée à un fil Matrix est générée par défaut sur :

- Définissez `threadBindings.spawnSessions: false` pour empêcher les `/focus` et `/acp spawn --thread auto|here`Matrix de niveau supérieur de créer/lier des fils de discussion Matrix.
- Définissez `threadBindings.defaultSpawnContext: "isolated"` lorsque les créations de fils de discussion natifs de sous-agent ne doivent pas dupliquer la transcription parente.

## Réactions

Matrix prend en charge les réactions sortantes, les notifications de réactions entrantes et les réactions d'accusé de réception.

Les outils de réaction sortante sont conditionnés par `channels.matrix.actions.reactions` :

- `react`Matrix ajoute une réaction à un événement Matrix.
- `reactions`Matrix récapitule les réactions actuelles pour un événement Matrix.
- `emoji=""` supprime les propres réactions du bot sur cet événement.
- `remove: true` supprime uniquement la réaction emoji spécifiée du bot.

**Ordre de résolution** (la première valeur définie l'emporte) :

| Paramètre               | Ordre                                                                              |
| ----------------------- | ---------------------------------------------------------------------------------- |
| `ackReaction`           | par compte → channel → `messages.ackReaction` → repli emoji d'identité de l'agent  |
| `ackReactionScope`      | par compte → channel → `messages.ackReactionScope` → `"group-mentions"` par défaut |
| `reactionNotifications` | par compte → channel → `"own"` par défaut                                          |

`reactionNotifications: "own"` transmet les événements `m.reaction`Matrix ajoutés lorsqu'ils ciblent des messages Matrix créés par le bot ; `"off"`Matrix désactive les événements système de réaction. Les suppressions de réactions ne sont pas synthétisées en événements système car Matrix les présente comme des rédactions, et non comme des suppressions `m.reaction` autonomes.

## Contexte de l'historique

- `channels.matrix.historyLimit` contrôle combien de messages récents de salle sont inclus en tant que `InboundHistory`Matrix lorsqu'un message de salle Matrix déclenche l'agent. Revient à `messages.groupChat.historyLimit` ; si les deux ne sont pas définis, la valeur par défaut effective est `0`. Définissez `0` pour désactiver.
- L'historique des salles Matrix est limité à la salle. Les DMs continuent d'utiliser l'historique de session normal.
- L'historique des salons Matrix est en attente uniquement : OpenClaw met en mémoire tampon les messages de salon qui n'ont pas encore déclenché de réponse, puis capture cette fenêtre lorsqu'une mention ou un autre déclencheur arrive.
- Le message déclencheur actuel n'est pas inclus dans `InboundHistory` ; il reste dans le corps entrant principal pour ce tour.
- Les nouvelles tentatives du même événement Matrix réutilisent la capture d'historique originale au lieu de dériver vers des messages de salon plus récents.

## Visibilité du contexte

Matrix prend en charge le contrôle partagé Matrix`contextVisibility` pour le contexte supplémentaire du salon, tel que le texte de réponse récupéré, les racines de fils de discussion et l'historique en attente.

- `contextVisibility: "all"` est la valeur par défaut. Le contexte supplémentaire est conservé tel qu'il a été reçu.
- `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés par les vérifications de liste d'autorisation de salon/utilisateur actives.
- `contextVisibility: "allowlist_quote"` se comporte comme `allowlist`, mais conserve toujours une réponse citée explicite.

Ce paramètre affecte la visibilité du contexte supplémentaire, et non si le message entrant lui-même peut déclencher une réponse.
L'autorisation du déclencheur provient toujours de `groupPolicy`, `groups`, `groupAllowFrom`, et des paramètres de stratégie de DM.

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

Pour réduire au silence tous les DM tout en gardant les salons fonctionnels, définissez `dm.enabled: false` :

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

Voir [Groupes](/fr/channels/groups) pour le comportement de filtrage des mentions et des listes d'autorisation.

Exemple d'appariement pour les DM Matrix :

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un utilisateur Matrix non approuvé continue de vous envoyer des messages avant l'approbation, OpenClaw réutilise le même code d'appariement en attente et peut envoyer une réponse de rappel après un court délai de recharge au lieu de créer un nouveau code.

Voir [Appariement](/fr/channels/pairing) pour le flux d'appariement DM partagé et la disposition du stockage.

## Réparation directe de salon

Si l'état des messages directs se désynchronise, OpenClaw peut se retrouver avec des mappages OpenClaw`m.direct` obsolètes qui pointent vers d'anciens salons en solo au lieu du DM actif. Inspectez le mappage actuel pour un homologue :

```bash
openclaw matrix direct inspect --user-id @alice:example.org
```

Réparez-le :

```bash
openclaw matrix direct repair --user-id @alice:example.org
```

Les deux commandes acceptent `--account <id>` pour les configurations multi-comptes. Le flux de réparation :

- préfère une DM stricte 1:1 qui est déjà mappée dans `m.direct`
- revient à n'importe quelle DM stricte 1:1 actuellement rejointe avec cet utilisateur
- crée un salon direct frais et réécrit `m.direct` si aucune DM saine n'existe

Il ne supprime pas automatiquement les anciens salons. Il choisit la DM saine et met à jour le mappage afin que les futurs envois Matrix, les avis de vérification et les autres flux de messages directs ciblent le bon salon.

## Approbations Exec

Matrix peut agir comme un client d'approbation natif. Configurez sous `channels.matrix.execApprovals` (ou `channels.matrix.accounts.<account>.execApprovals` pour une substitution par compte) :

- `enabled` : délivre les approbations via des invites natives Matrix. Lorsqu'il n'est pas défini ou sur `"auto"`, Matrix s'active automatiquement une fois qu'au moins un approbateur peut être résolu. Définissez `false` pour désactiver explicitement.
- `approvers` : IDs utilisateur Matrix (`@owner:example.org`) autorisés à approuver les requêtes exec. Optionnel - revient à `channels.matrix.dm.allowFrom`.
- `target` : où vont les invites. `"dm"` (défaut) envoie aux DMs des approbateurs ; `"channel"` envoie au salon ou DM Matrix d'origine ; `"both"` envoie aux deux.
- `agentFilter` / `sessionFilter` : listes blanches optionnelles pour quels agents/sessions déclenchent la livraison Matrix.

L'autorisation diffère légèrement selon le type d'approbation :

- Les **Approbations Exec** utilisent `execApprovals.approvers`, en revenant à `dm.allowFrom`.
- Les **Approbations de plugin** s'autorisent via `dm.allowFrom` uniquement.

Les deux types partagent les raccourcis de réaction Matrix et les mises à jour de message. Les approbateurs voient les raccourcis de réaction sur le message d'approbation principal :

- `✅` autoriser une fois
- `❌` refuser
- `♾️` autoriser toujours (lorsque la stratégie exec effective le permet)

Commandes barre oblique de secours : `/approve <id> allow-once`, `/approve <id> allow-always`, `/approve <id> deny`.

Seuls les approbateurs résolus peuvent approuver ou refuser. La remise par canal pour les approbations exec inclut le texte de la commande - n'activez `channel` ou `both` que dans les salons de confiance.

Connexe : [Approbations exec](/fr/tools/exec-approvals).

## Commandes barre oblique

Les commandes barre oblique (`/new`, `/reset`, `/model`, `/focus`, `/unfocus`, `/agents`, `/session`, `/acp`, `/approve`, etc.) fonctionnent directement dans les DMs. Dans les salons, OpenClawMatrix reconnaît également les commandes préfixées par la propre mention Matrix du bot, donc `@bot:server /new` déclenche le chemin de commande sans regex de mention personnalisée. Cela garde le bot réactif aux messages `@mention /command` de style salon qu'Element et les clients similaires émettent lorsqu'un utilisateur complète le bot par tabulation avant de taper la commande.

Les règles d'autorisation s'appliquent toujours : les expéditeurs de commandes doivent satisfaire les mêmes politiques de liste d'autorisation/propriétaire de DM ou de salon que les messages simples.

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

- Les valeurs `channels.matrix` de premier niveau agissent comme valeurs par défaut pour les comptes nommés, sauf si un compte les remplace.
- Délimitez une entrée de salon héritée à un compte spécifique avec `groups.<room>.account`. Les entrées sans `account` sont partagées entre les comptes ; `account: "default"` fonctionne toujours lorsque le compte par défaut est configuré au premier niveau.

**Sélection du compte par défaut :**

- Définissez `defaultAccount` pour choisir le compte nommé que le routage implicite, la sonde et les commandes CLI préfèrent.
- Si vous avez plusieurs comptes et que l'un est littéralement nommé `default`, OpenClaw l'utilise implicitement même lorsque `defaultAccount` n'est pas défini.
- Si vous avez plusieurs comptes nommés et qu'aucun par défaut n'est sélectionné, les commandes CLI refusent de deviner - définissez CLI`defaultAccount` ou passez `--account <id>`.
- Le bloc `channels.matrix.*` de premier niveau n'est traité comme le compte `default` implicite que lorsque son authentification est complète (`homeserver` + `accessToken`, ou `homeserver` + `userId` + `password`). Les comptes nommés restent découvrables à partir de `homeserver` + `userId` une fois que les identifiants mis en cache couvrent l'authentification.

**Promotion :**

- Lorsqu'OpenClaw promeut une configuration à compte unique vers un multi-compte lors d'une réparation ou d'une configuration, il préserve le compte nommé existant s'il en existe un ou si OpenClaw`defaultAccount`Matrix pointe déjà vers l'un d'eux. Seules les clés d'authentification/d'amorçage Matrix sont déplacées vers le compte promu ; les clés de stratégie de livraison partagées restent au niveau supérieur.

Voir [Référence de configuration](/fr/gateway/config-channels#multi-account-all-channels) pour le modèle de multi-compte partagé.

## Serveurs domestiques privés/LAN

Par défaut, OpenClaw bloque les serveurs domestiques Matrix privés/internes pour la protection SSRF, sauf si vous
optez explicitement pour chaque compte.

Si votre serveur domestique s'exécute sur localhost, une IP LAN/Tailscale ou un nom d'hôte interne, activez
Tailscale`network.dangerouslyAllowPrivateNetwork`Matrix pour ce compte Matrix :

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

Ce choix explicite permet uniquement les cibles privées/internes de confiance. Les serveurs domestiques publics en clair tels que
`http://matrix.example.org:8008` restent bloqués. Privilégiez `https://` chaque fois que possible.

## Proxy du trafic Matrix

Si votre déploiement Matrix nécessite un proxy HTTP(S) sortant explicite, définissez Matrix`channels.matrix.proxy` :

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

Les comptes nommés peuvent remplacer la valeur par défaut de premier niveau avec `channels.matrix.accounts.<id>.proxy`OpenClawMatrix.
OpenClaw utilise le même paramètre de proxy pour le trafic Matrix d'exécution et les sondes de statut de compte.

## Résolution de cible

Matrix accepte ces formats de cibles n'importe où OpenClaw vous demande une cible de salle ou d'utilisateur :

- Utilisateurs : `@user:server`, `user:@user:server`, ou `matrix:user:@user:server`
- Salles : `!room:server`, `room:!room:server`, ou `matrix:room:!room:server`
- Alias : `#alias:server`, `channel:#alias:server`, ou `matrix:channel:#alias:server`

Les ID de salle Matrix sont sensibles à la casse. Utilisez la casse exacte de l'ID de salle provenant de Matrix
lors de la configuration de cibles de livraison explicites, de tâches cron, de liaisons ou de listes autorisées.
OpenClaw conserve les clés de session internes sous forme canonique pour le stockage, ces clés en
minuscules ne sont donc pas une source fiable pour les ID de livraison Matrix.

La recherche en direct dans l'annuaire utilise le compte Matrix connecté :

- Les recherches d'utilisateurs interrogent l'annuaire des utilisateurs Matrix sur ce serveur d'accueil.
- Les recherches de salle acceptent directement les ID de salle explicites et les alias, puis se rabattent sur la recherche des noms des salles rejointes pour ce compte.
- La recherche par nom de salle rejointe est au mieux possible. Si un nom de salle ne peut pas être résolu en ID ou en alias, il est ignoré lors de la résolution de la liste autorisée (allowlist) à l'exécution.

## Référence de configuration

Les champs de style liste autorisée (`groupAllowFrom`, `dm.allowFrom`, `groups.<room>.users`Matrix) acceptent les ID utilisateur Matrix complets (le plus sûr). Les correspondances exactes de l'annuaire sont résolues au démarrage et à chaque fois que la liste autorisée change pendant que le moniteur est en cours d'exécution ; les entrées qui ne peuvent pas être résolues sont ignorées à l'exécution. Les listes autorisées de salles préfèrent les ID de salle ou les alias pour la même raison.

### Compte et connexion

- `enabled` : activer ou désactiver le channel.
- `name` : étiquette d'affichage facultative pour le compte.
- `defaultAccount`Matrix : ID de compte préféré lorsque plusieurs comptes Matrix sont configurés.
- `accounts` : substitutions nommées par compte. Les valeurs `channels.matrix` de premier niveau sont héritées comme valeurs par défaut.
- `homeserver` : URL du serveur d'accueil, par exemple `https://matrix.example.org`.
- `network.dangerouslyAllowPrivateNetwork` : autoriser ce compte à se connecter à `localhost`, aux IP LAN/Tailscale ou aux noms d'hôtes internes.
- `proxy` : URL du proxy HTTP(S) facultatif pour le trafic Matrix. La priorité par compte est prise en charge.
- `userId` : identifiant utilisateur complet Matrix (`@bot:example.org`).
- `accessToken` : jeton d'accès pour l'authentification par jeton. Les valeurs en texte brut et SecretRef sont prises en charge via les fournisseurs env/file/exec ([Secrets Management](/fr/gateway/secrets)).
- `password` : mot de passe pour la connexion par mot de passe. Les valeurs en texte brut et SecretRef sont prises en charge.
- `deviceId` : identifiant d'appareil Matrix explicite.
- `deviceName` : nom d'affichage de l'appareil utilisé lors de la connexion par mot de passe.
- `avatarUrl` : URL de l'auto-avatar stockée pour la synchronisation du profil et les mises à jour `profile set`.
- `initialSyncLimit` : nombre maximum d'événements récupérés lors de la synchronisation de démarrage.

### Chiffrement

- `encryption` : activer E2EE. Par défaut : `false`.
- `startupVerification` : `"if-unverified"` (par défaut lorsque E2EE est activé) ou `"off"`. Demande automatiquement l'auto-vérification au démarrage lorsque cet appareil n'est pas vérifié.
- `startupVerificationCooldownHours` : délai de refroidissement avant la prochaine demande automatique de démarrage. Par défaut : `24`.

### Accès et politique

- `groupPolicy` : `"open"`, `"allowlist"`, ou `"disabled"`. Par défaut : `"allowlist"`.
- `groupAllowFrom` : liste d'autorisation des identifiants utilisateurs pour le trafic des salons.
- `dm.enabled` : lorsque `false`, ignorer tous les DMs. Par défaut : `true`.
- `dm.policy` : `"pairing"` (par défaut), `"allowlist"`, `"open"` ou `"disabled"`. S'applique après que le bot a rejoint et classé la salle comme DM ; cela n'affecte pas la gestion des invitations.
- `dm.allowFrom` : liste blanche des ID utilisateur pour le trafic DM.
- `dm.sessionScope` : `"per-user"` (par défaut) ou `"per-room"`.
- `dm.threadReplies` : redéfinition pour les DM uniquement concernant les fils de discussion de réponse (`"off"`, `"inbound"`, `"always"`).
- `allowBots`Matrix : accepter les messages d'autres comptes bot Matrix configurés (`true` ou `"mentions"`).
- `allowlistOnly` : lorsque `true`, force toutes les stratégies DM actives (sauf `"disabled"`) et les stratégies de groupe `"open"` à `"allowlist"`. Ne modifie pas les stratégies `"disabled"`.
- `autoJoin` : `"always"`, `"allowlist"` ou `"off"`. Par défaut : `"off"`Matrix. S'applique à chaque invitation Matrix, y compris les invitations de type DM.
- `autoJoinAllowlist` : salles/alias autorisés lorsque `autoJoin` est `"allowlist"`. Les entrées d'alias sont résolues par rapport au serveur domestique, et non par rapport à l'état revendiqué par la salle invitée.
- `contextVisibility` : visibilité du contexte supplémentaire (`"all"` par défaut, `"allowlist"`, `"allowlist_quote"`).

### Comportement de réponse

- `replyToMode` : `"off"`, `"first"`, `"all"` ou `"batched"`.
- `threadReplies` : `"off"`, `"inbound"` ou `"always"`.
- `threadBindings` : remplacements par channel pour le routage et le cycle de vie des sessions liées aux fils de discussion.
- `streaming` : `"off"` (par défaut), `"partial"`, `"quiet"`, ou sous forme d'objet `{ mode, preview: { toolProgress } }`. `true` ↔ `"partial"`, `false` ↔ `"off"`.
- `blockStreaming` : lorsque `true`, les blocs d'assistant terminés sont conservés comme des messages de progression distincts.
- `markdown` : configuration optionnelle du rendu Markdown pour le texte sortant.
- `responsePrefix` : chaîne optionnelle ajoutée au début des réponses sortantes.
- `textChunkLimit` : taille des blocs sortants en caractères lorsque `chunkMode: "length"`. Par défaut : `4000`.
- `chunkMode` : `"length"` (par défaut, divise par nombre de caractères) ou `"newline"` (divise aux limites des lignes).
- `historyLimit` : nombre de messages récents de salle inclus en tant que `InboundHistory` lorsqu'un message de salle déclenche l'agent. Revient à `messages.groupChat.historyLimit` ; défaut effectif `0` (désactivé).
- `mediaMaxMb` : limite de taille des médias en Mo pour l'envoi sortant et le traitement entrant.

### Paramètres de réaction

- `ackReaction` : remplacement de la réaction d'accusé de réception pour ce channel/compte.
- `ackReactionScope` : remplacement de la portée (`"group-mentions"` par défaut, `"group-all"`, `"direct"`, `"all"`, `"none"`, `"off"`).
- `reactionNotifications` : mode de notification des réactions entrantes (`"own"` par défaut, `"off"`).

### Outils et remplacements par salle

- `actions` : filtrage des outils par action (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).
- `groups` : carte de stratégie par salon. L'identité de session utilise l'ID de salon stable après résolution. (`rooms` est un alias obsolète.)
  - `groups.<room>.account` : restreindre une entrée de salon héritée à un compte spécifique.
  - `groups.<room>.allowBots` : remplacement par salon du paramètre au niveau du canal (`true` ou `"mentions"`).
  - `groups.<room>.users` : liste d'autorisation des expéditeurs par salon.
  - `groups.<room>.tools` : remplacements d'autorisation/refus des outils par salon.
  - `groups.<room>.autoReply` : remplacement du filtrage par mention par salon. `true` désactive les exigences de mention pour ce salon ; `false` les réactive.
  - `groups.<room>.skills` : filtre de compétence par salon.
  - `groups.<room>.systemPrompt` : extrait de prompt système par salon.

### Paramètres d'approbation exec

- `execApprovals.enabled` : délivrer les approbations exec via des prompts natifs Matrix.
- `execApprovals.approvers` : ID utilisateur Matrix autorisés à approuver. Revient à `dm.allowFrom` par défaut.
- `execApprovals.target` : `"dm"` (par défaut), `"channel"` ou `"both"`.
- `execApprovals.agentFilter` / `execApprovals.sessionFilter` : listes d'autorisation optionnelles agent/session pour la livraison.

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) - tous les canaux pris en charge
- [Appairage](/fr/channels/pairing) - authentification DM et flux d'appairage
- [Groupes](/fr/channels/groups) - comportement du chat de groupe et filtrage par mention
- [Routage de canal](/fr/channels/channel-routing) - routage de session pour les messages
- [Sécurité](/fr/gateway/security) - modèle d'accès et durcissement
