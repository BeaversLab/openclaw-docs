---
summary: "Statut de prise en charge de Matrix, configuration et exemples de configuration"
read_when:
  - Setting up Matrix in OpenClaw
  - Configuring Matrix E2EE and verification
title: "Matrix"
---

Matrix est un plugin de canal intégré pour OpenClaw.
Il utilise le `matrix-js-sdk` officiel et prend en charge les DMs, les salles, les fils, les médias, les réactions, les sondages, la localisation et E2EE.

## Plugin intégré

Les versions packagées actuelles d'OpenClaw incluent le plugin Matrix. Vous n'avez rien à installer ; configurer `channels.matrix.*` (voir [Configuration](#setup)) est ce qui l'active.

Pour les anciennes versions ou les installations personnalisées qui excluent Matrix, installez-le d'abord manuellement :

```bash
openclaw plugins install @openclaw/matrix
# or, from a local checkout
openclaw plugins install ./path/to/local/matrix-plugin
```

`plugins install` enregistre et active le plugin, aucune étape `openclaw plugins enable matrix` distincte n'est donc nécessaire. Le plugin ne fait toujours rien tant que vous n'avez pas configuré le canal ci-dessous. Consultez [Plugins](/fr/tools/plugin) pour le comportement général des plugins et les règles d'installation.

## Configuration

1. Créez un compte Matrix sur votre serveur domestique.
2. Configurez `channels.matrix` avec soit `homeserver` + `accessToken`, soit `homeserver` + `userId` + `password`.
3. Redémarrez la passerelle.
4. Démarrez un DM avec le bot, ou invitez-le dans une salle (voir [auto-join](#auto-join) — les nouvelles invitations ne sont prises en compte que lorsque `autoJoin` les autorise).

### Configuration interactive

```bash
openclaw channels add
openclaw configure --section channels
```

L'assistant demande : l'URL du serveur domestique, la méthode d'authentification (jeton d'accès ou mot de passe), l'ID utilisateur (authentification par mot de passe uniquement), le nom d'appareil facultatif, s'il faut activer E2EE, et s'il faut configurer l'accès aux salles et l'adhésion automatique.

Si des variables d'environnement `MATRIX_*` correspondantes existent déjà et que le compte sélectionné n'a aucune authentification sauvegardée, l'assistant propose un raccourci via variable d'environnement. Pour résoudre les noms des salles avant de sauvegarder une liste blanche, exécutez `openclaw channels resolve --channel matrix "Project Room"`. Lorsque E2EE est activé, l'assistant écrit la configuration et exécute le même bootstrap que [`openclaw matrix encryption setup`](#encryption-and-verification).

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

### Adhésion automatique

`channels.matrix.autoJoin` est défini par défaut sur `off`. Avec cette valeur par défaut, le bot n'apparaîtra pas dans les nouveaux salons ou DMs provenant de nouvelles invitations tant que vous ne l'aurez pas rejoint manuellement.

OpenClaw ne peut pas déterminer au moment de l'invitation si un salon invité est un DM ou un groupe, donc toutes les invitations — y compris les invitations de type DM — passent d'abord par `autoJoin`. `dm.policy` ne s'applique que plus tard, après que le bot a rejoint le salon et que celui-ci a été classifié.

<Warning>
Définissez `autoJoin: "allowlist"` ainsi que `autoJoinAllowlist` pour restreindre les invitations que le bot accepte, ou `autoJoin: "always"` pour accepter chaque invitation.

`autoJoinAllowlist` n'accepte que les cibles stables : `!roomId:server`, `#alias:server`, ou `*`. Les noms de salons simples sont rejetés ; les entrées d'alias sont résolues par rapport au serveur d'accueil, et non par rapport à l'état revendiqué par le salon invité.

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

Les listes blanches de DMs et de salons sont préférablement remplies avec des IDs stables :

- DMs (`dm.allowFrom`, `groupAllowFrom`, `groups.<room>.users`) : utilisez `@user:server`. Les noms d'affichage ne sont résolus que lorsque le répertoire du serveur d'accueil renvoie exactement une correspondance.
- Salons (`groups`, `autoJoinAllowlist`) : utilisez `!room:server` ou `#alias:server`. Les noms sont résolus au mieux par rapport aux salons rejoints ; les entrées non résolues sont ignorées lors de l'exécution.

### Normalisation de l'ID de compte

L'assistant convertit un nom convivial en un ID de compte normalisé. Par exemple, `Ops Bot` devient `ops-bot`. La ponctuation est échappée dans les noms de variables d'environnement délimitées afin que deux comptes ne puissent pas entrer en collision : `-` → `_X2D_`, donc `ops-prod` correspond à `MATRIX_OPS_X2D_PROD_*`.

### Identifiants mis en cache

Matrix stocke les identifiants mis en cache sous `~/.openclaw/credentials/matrix/` :

- compte par défaut : `credentials.json`
- comptes nommés : `credentials-<account>.json`

Lorsque des identifiants mis en cache y existent, OpenClaw considère Matrix comme configuré, même si le jeton d'accès n'est pas dans le fichier de configuration — cela couvre la configuration, `openclaw doctor` et les sondes de statut du canal.

### Variables d'environnement

Utilisé lorsque la clé de configuration équivalente n'est pas définie. Le compte par défaut utilise des noms non préfixés ; les comptes nommés utilisent l'ID de compte inséré avant le suffixe.

| Compte par défaut     | Compte nommé (`<ID>` est l'ID de compte normalisé) |
| --------------------- | -------------------------------------------------- |
| `MATRIX_HOMESERVER`   | `MATRIX_<ID>_HOMESERVER`                           |
| `MATRIX_ACCESS_TOKEN` | `MATRIX_<ID>_ACCESS_TOKEN`                         |
| `MATRIX_USER_ID`      | `MATRIX_<ID>_USER_ID`                              |
| `MATRIX_PASSWORD`     | `MATRIX_<ID>_PASSWORD`                             |
| `MATRIX_DEVICE_ID`    | `MATRIX_<ID>_DEVICE_ID`                            |
| `MATRIX_DEVICE_NAME`  | `MATRIX_<ID>_DEVICE_NAME`                          |
| `MATRIX_RECOVERY_KEY` | `MATRIX_<ID>_RECOVERY_KEY`                         |

Pour le compte `ops`, les noms deviennent `MATRIX_OPS_HOMESERVER`, `MATRIX_OPS_ACCESS_TOKEN`, etc. Les variables d'environnement de clé de récupération sont lues par les flux CLI tenant compte de la récupération (`verify backup restore`, `verify device`, `verify bootstrap`) lorsque vous transmettez la clé via `--recovery-key-stdin`.

`MATRIX_HOMESERVER` ne peut pas être défini à partir d'un `.env` d'espace de travail ; voir [Fichiers `.env` d'espace de travail](/fr/gateway/security).

## Exemple de configuration

Une base pratique avec l'appariement DM, la liste d'autorisation des salles et E2EE :

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

Le streaming de réponse Matrix est optionnel. `streaming` contrôle la manière dont OpenClaw livre la réponse de l'assistant en cours ; `blockStreaming` contrôle si chaque bloc terminé est préservé en tant que message Matrix distinct.

```json5
{
  channels: {
    matrix: {
      streaming: "partial",
    },
  },
}
```

| `streaming`          | Comportement                                                                                                                                                                                                                                  |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `"off"` (par défaut) | Attendre la réponse complète, envoyer une seule fois. `true` ↔ `"partial"`, `false` ↔ `"off"`.                                                                                                                                                |
| `"partial"`          | Modifiez un message texte normal sur place pendant que le modèle écrit le bloc actuel. Les clients Matrix standard peuvent notifier lors de la première prévisualisation, et non de la modification finale.                                   |
| `"quiet"`            | Identique à `"partial"`, mais le message est un avis sans notification. Les destinataires ne reçoivent une notification que lorsqu'une règle de poussée (push rule) par utilisateur correspond à la modification finalisée (voir ci-dessous). |

`blockStreaming` est indépendant de `streaming` :

| `streaming`             | `blockStreaming: true`                                                                       | `blockStreaming: false` (par défaut)                        |
| ----------------------- | -------------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `"partial"` / `"quiet"` | Brouillon en direct pour le bloc actuel, les blocs terminés conservés sous forme de messages | Brouillon en direct pour le bloc actuel, finalisé sur place |
| `"off"`                 | Un message Matrix notifiant par bloc terminé                                                 | Un message Matrix notifiant pour la réponse complète        |

Notes :

- Si une prévisualisation dépasse la limite de taille par événement de Matrix, OpenClaw arrête le flux de prévisualisation et revient à la livraison finale uniquement.
- Les réponses média envoient toujours les pièces jointes normalement. Si une prévisualisation obsolète ne peut plus être réutilisée en toute sécurité, OpenClaw la supprime (redact) avant d'envoyer la réponse média finale.
- Les modifications de prévisualisation coûtent des appels Matrix API supplémentaires. Laissez `streaming: "off"` si vous souhaitez le profil de limitation de taux le plus conservateur.

### Règles de poussée (push rules) auto-hébergées pour les prévisualisations finalisées silencieuses

`streaming: "quiet"` ne notifie les destinataires qu'une fois qu'un bloc ou un tour est finalisé — une règle de poussée par utilisateur doit correspondre au marqueur de prévisualisation finalisée. Voir [Règles de poussée Matrix pour les prévisualisations silencieuses](/fr/channels/matrix-push-rules) pour la recette complète (jeton du destinataire, vérification du pusher, installation de la règle, notes par serveur domestique).

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

- `allowBots: true` accepte les messages d'autres comptes bot Matrix configurés dans les salons et DM autorisés.
- `allowBots: "mentions"` n'accepte ces messages que lorsqu'ils mentionnent visiblement ce bot dans les salons. Les DM sont toujours autorisés.
- `groups.<room>.allowBots` remplace le paramètre au niveau du compte pour un seul salon.
- OpenClaw ignore toujours les messages provenant du même identifiant utilisateur Matrix pour éviter les boucles d'auto-réponse.
- Matrix n'expose pas de drapeau de bot natif ici ; OpenClaw traite « écrit par un bot » comme « envoyé par un autre compte Matrix configuré sur cette passerelle OpenClaw ».

Utilisez des listes d'autorisation (allowlists) strictes et des exigences de mention lorsque vous activez le trafic de bot à bot dans les salons partagés.

## Chiffrement et vérification

Dans les salons chiffrés (E2EE), les événements d'image sortants utilisent `thumbnail_file` afin que les aperçus d'images soient chiffrés avec la pièce jointe complète. Les salons non chiffrés utilisent toujours `thumbnail_url` en clair. Aucune configuration n'est nécessaire — le plugin détecte automatiquement l'état E2EE.

Toutes les commandes `openclaw matrix` acceptent `--verbose` (diagnostics complets), `--json` (sortie lisible par machine) et `--account <id>` (configurations multi-comptes). La sortie est concise par défaut avec une journalisation interne discrète du SDK. Les exemples ci-dessous montrent la forme canonique ; ajoutez les drapeaux selon vos besoins.

### Activer le chiffrement

```bash
openclaw matrix encryption setup
```

Initialise le stockage des secrets et la signature croisée, crée une sauvegarde des clés de salon si nécessaire, puis affiche l'état et les prochaines étapes. Drapeaux utiles :

- `--recovery-key <key>` appliquer une clé de récupération avant l'initialisation (privilégiez la forme stdin documentée ci-dessous)
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
- `Signed by owner` : signé par votre propre clé d'auto-signature (diagnostique uniquement)

`Verified by owner` devient `yes` uniquement lorsque `Cross-signing verified` est `yes`. La confiance locale ou une signature de propriétaire seule ne suffit pas.

`--allow-degraded-local-state` retourne des diagnostics de meilleur effort sans préparer d'abord le compte Matrix ; utile pour des sondes hors ligne ou partiellement configurées.

### Vérifier cet appareil avec une clé de récupération

La clé de récupération est sensible — transmettez-la via stdin au lieu de la passer en ligne de commande. Définissez `MATRIX_RECOVERY_KEY` (ou `MATRIX_<ID>_RECOVERY_KEY` pour un compte nommé) :

```bash
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
```

La commande signale trois états :

- `Recovery key accepted` : Matrix a accepté la clé pour le stockage des secrets ou la confiance de l'appareil.
- `Backup usable` : la sauvegarde des clés de salle peut être chargée avec le matériel de récupération de confiance.
- `Device verified by owner` : cet appareil a une confiance totale d'identité de signature croisée Matrix.

Il retourne un code non nul lorsque la confiance totale de l'identité est incomplète, même si la clé de récupération a déverrouillé le matériel de sauvegarde. Dans ce cas, finalisez l'auto-vérification depuis un autre client Matrix :

```bash
openclaw matrix verify self
```

`verify self` attend `Cross-signing verified: yes` avant de se terminer avec succès. Utilisez `--timeout-ms <ms>` pour ajuster l'attente.

Le formulaire à clé littérale `openclaw matrix verify device "<recovery-key>"` est également accepté, mais la clé finit dans l'historique de votre shell.

### Initialiser ou réparer la signature croisée

```bash
openclaw matrix verify bootstrap
```

`verify bootstrap` est la commande de réparation et de configuration pour les comptes chiffrés. Dans l'ordre, il :

- initialise le stockage des secrets, en réutilisant une clé de récupération existante si possible
- initialise la signature croisée et téléverse les clés publiques manquantes
- marque et signe par croissement l'appareil actuel
- crée une sauvegarde des clés de salle côté serveur si elle n'existe pas déjà

Si le serveur d'accueil exige une UIA pour téléverser les clés de signature croisée, OpenClaw essaie d'abord sans authentification, puis `m.login.dummy`, puis `m.login.password` (nécessite `channels.matrix.password`).

Indicateurs utiles :

- `--recovery-key-stdin` (à associer avec `printf '%s\n' "$MATRIX_RECOVERY_KEY" | …`) ou `--recovery-key <key>`
- `--force-reset-cross-signing` pour abandonner l'identité de signature croisée actuelle (uniquement intentionnel)

### Sauvegarde des clés de salle

```bash
openclaw matrix verify backup status
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
```

`backup status` indique si une sauvegarde côté serveur existe et si cet appareil peut la déchiffrer. `backup restore` importe les clés de salle sauvegardées dans le stockage cryptographique local ; si la clé de récupération est déjà sur le disque, vous pouvez omettre `--recovery-key-stdin`.

Pour remplacer une sauvegarde corrompue par une nouvelle base de référence (accepte la perte de l'ancien historique non récupérable ; peut également recréer le stockage des secrets si le secret de sauvegarde actuel est non chargeable) :

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

Envoie une demande de vérification à partir de ce compte OpenClaw. `--own-user` demande une auto-vérification (vous acceptez l'invite dans un autre client Matrix du même utilisateur) ; `--user-id`/`--device-id`/`--room-id` ciblent quelqu'un d'autre. `--own-user` ne peut pas être combiné avec les autres indicateurs de ciblage.

Pour une gestion de cycle de vie de plus bas niveau — généralement lors de la mise en miroir des demandes entrantes d'un autre client — ces commandes agissent sur une demande spécifique `<id>` (affichée par `verify list` et `verify request`) :

| Commande                                   | Objectif                                                                  |
| ------------------------------------------ | ------------------------------------------------------------------------- |
| `openclaw matrix verify accept <id>`       | Accepter une demande entrante                                             |
| `openclaw matrix verify start <id>`        | Démarrer le flux SAS                                                      |
| `openclaw matrix verify sas <id>`          | Afficher l'émoji ou les décimales SAS                                     |
| `openclaw matrix verify confirm-sas <id>`  | Confirmer que le SAS correspond à ce que l'autre client affiche           |
| `openclaw matrix verify mismatch-sas <id>` | Rejeter le SAS lorsque l'émoji ou les décimales ne correspondent pas      |
| `openclaw matrix verify cancel <id>`       | Annuler ; accepte `--reason <text>` et `--code <matrix-code>` facultatifs |

`accept`, `start`, `sas`, `confirm-sas`, `mismatch-sas` et `cancel` acceptent tous `--user-id` et `--room-id` comme indices de suivi de DM lorsque la vérification est ancrée à une salle de message direct spécifique.

### Notes multi-comptes

Sans `--account <id>`, les commandes Matrix de la CLI CLI utilisent le compte par défaut implicite. Si vous avez plusieurs comptes nommés et n'avez pas défini `channels.matrix.defaultAccount`, ils refuseront de deviner et vous demanderont de choisir. Lorsque le E2EE est désactivé ou indisponible pour un compte nommé, les erreurs pointent vers la clé de configuration de ce compte, par exemple `channels.matrix.accounts.assistant.encryption`.

<AccordionGroup>
  <Accordion title="Comportement au démarrage">
    Avec `encryption: true`, `startupVerification` est défini par défaut sur `"if-unverified"`. Au démarrage, un appareil non vérifié demande une auto-vérification dans un autre client Matrix, en ignorant les doublons et en appliquant un temps de recharge (24 heures par défaut). Ajustez avec `startupVerificationCooldownHours` ou désactivez avec `startupVerification: "off"`.

    Le démarrage exécute également une passe d'amorçage crypto conservatrice qui réutilise le stockage de secrets actuel et l'identité de signature croisée. Si l'état d'amorçage est cassé, OpenClaw tente une réparation protégée même sans `channels.matrix.password` ; si le serveur d'accueil exige une authentification par mot de passe (UIA), le démarrage enregistre un avertissement et reste non fatal. Les appareils déjà signés par le propriétaire sont préservés.

    Consultez la [migration Matrix](/fr/channels/matrix-migration) pour le processus complet de mise à niveau.

  </Accordion>

  <Accordion title="Avis de vérification">
    Matrix publie des avis de cycle de vie de vérification dans la salle de vérification stricte de DM sous forme de messages `m.notice` : demande, prêt (avec la directive « Vérifier par emoji »), début/achèvement et détails SAS (emoji/décimal) si disponibles.

    Les demandes entrantes d'un autre client Matrix sont suivies et acceptées automatiquement. Pour l'auto-vérification, OpenClaw lance le flux SAS automatiquement et confirme son propre côté une fois la vérification par emoji disponible — vous devez toujours comparer et confirmer « They match » dans votre client Matrix.

    Les avis système de vérification ne sont pas transmis au pipeline de chat de l'agent.

  </Accordion>

  <Accordion title="Appareil Matrix supprimé ou invalide">
    Si `verify status` indique que l'appareil actuel n'est plus répertorié sur le serveur domestique, créez un nouvel appareil Matrix OpenClaw. Pour la connexion par mot de passe :

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --user-id '@assistant:example.org' \
  --password '<password>' \
  --device-name OpenClaw-Gateway
```

    Pour l'authentification par jeton, créez un nouveau jeton d'accès dans votre client Matrix ou l'interface d'administration, puis mettez à jour OpenClaw :

```bash
openclaw matrix account add \
  --account assistant \
  --homeserver https://matrix.example.org \
  --access-token '<token>'
```

    Remplacez `assistant` par l'ID de compte de la commande ayant échoué, ou omettez `--account` pour le compte par défaut.

  </Accordion>

  <Accordion title="Hygiène des appareils">
    Les anciens appareils gérés par OpenClaw peuvent s'accumuler. Lister et nettoyer :

```bash
openclaw matrix devices list
openclaw matrix devices prune-stale
```

  </Accordion>

  <Accordion title="Stockage de chiffrement">
    Le chiffrement de bout en bout (E2EE) de Matrix utilise le chemin de chiffrement Rust officiel `matrix-js-sdk` avec `fake-indexeddb` comme shim IndexedDB. L'état de chiffrement persiste dans `crypto-idb-snapshot.json` (autorisations de fichier restrictives).

    L'état d'exécution chiffré réside sous `~/.openclaw/matrix/accounts/<account>/<homeserver>__<user>/<token-hash>/` et inclut le magasin de synchronisation, le magasin de chiffrement, la clé de récupération, l'instantané IDB, les liaisons de threads et l'état de vérification au démarrage. Lorsque le jeton change mais que l'identité du compte reste la même, OpenClaw réutilise la meilleure racine existante afin que l'état antérieur reste visible.

  </Accordion>
</AccordionGroup>

## Gestion du profil

Mettre à jour l'auto-profil Matrix pour le compte sélectionné :

```bash
openclaw matrix profile set --name "OpenClaw Assistant"
openclaw matrix profile set --avatar-url https://cdn.example.org/avatar.png
```

Vous pouvez passer les deux options en un seul appel. Matrix accepte directement les URL d'avatar `mxc://` ; lorsque vous passez `http://` ou `https://`, OpenClaw télécharge d'abord le fichier et stocke l'URL `mxc://` résolue dans `channels.matrix.avatarUrl` (ou la remplacement par compte).

## Fil de discussion

Matrix prend en charge les fils de discussion natifs Matrix pour les réponses automatiques ainsi que pour les envois via l'outil de messagerie. deux contrôles indépendants régissent le comportement :

### Routage de session (`sessionScope`)

`dm.sessionScope` détermine comment les salons DM Matrix correspondent aux sessions OpenClaw :

- `"per-user"` (par défaut) : tous les salons DM avec le même pair routé partagent une seule session.
- `"per-room"` : chaque salon DM Matrix obtient sa propre clé de session, même lorsque le pair est le même.

Les liaisons de conversation explicites priment toujours sur `sessionScope`, de sorte que les salons et les fils liés conservent leur session cible choisie.

### Fil de discussion des réponses (`threadReplies`)

`threadReplies` détermine où le bot publie sa réponse :

- `"off"` : les réponses sont de premier niveau. Les messages entrants en fil restent sur la session parente.
- `"inbound"` : répondre dans un fil uniquement lorsque le message entrant était déjà dans ce fil.
- `"always"` : répondre dans un fil ancré au message déclencheur ; cette conversation est acheminée via une session correspondante à portée de fil à partir du premier déclencheur.

`dm.threadReplies` remplace cela pour les DM uniquement — par exemple, garder les fils de salon isolés tout en gardant les DM à plat.

### Héritage de fil et commandes barre oblique

- Les messages entrants en fil incluent le message racine du fil comme contexte supplémentaire pour l'agent.
- Les envois via l'outil de messagerie héritent automatiquement du fil Matrix actuel lors du ciblage du même salon (ou de la même cible d'utilisateur DM), à moins qu'un `threadId` explicite ne soit fourni.
- La réutilisation de la cible d'utilisateur DM ne s'active que lorsque les métadonnées de la session actuelle prouvent le même pair DM sur le même compte Matrix ; sinon, OpenClaw revient au routage normal à portée utilisateur.
- `/focus`, `/unfocus`, `/agents`, `/session idle`, `/session max-age` et les `/acp spawn` liés aux fils fonctionnent tous dans les salles et les DMs Matrix.
- `/focus` de niveau supérieur crée un nouveau fil de discussion Matrix et le lie à la session cible lorsque `threadBindings.spawnSubagentSessions: true`.
- L'exécution de `/focus` ou de `/acp spawn --thread here` dans un fil de discussion Matrix existant lie ce fil en place.

Lorsque OpenClaw détecte une salle DM Matrix entrant en collision avec une autre salle DM sur la même session partagée, il publie un `m.notice` unique dans cette salle pointant vers la porte de secours `/focus` et suggérant un changement de `dm.sessionScope`. L'avis n'apparaît que lorsque les liaisons de fils sont activées.

## Liaisons de conversation ACP

Les salles, les DMs et les fils de discussion existants Matrix peuvent être transformés en espaces de travail ACP durables sans changer la surface de chat.

Flux de l'opérateur rapide :

- Exécutez `/acp spawn codex --bind here` dans le DM, la salle ou le fil existant Matrix que vous souhaitez continuer à utiliser.
- Dans un DM ou une salle Matrix de niveau supérieur, le DM/salle actuel reste la surface de chat et les futurs messages sont acheminés vers la session ACP générée.
- Dans un fil de discussion Matrix existant, `--bind here` lie ce fil actuel en place.
- `/new` et `/reset` réinitialisent la même session ACP liée en place.
- `/acp close` ferme la session ACP et supprime la liaison.

Remarques :

- `--bind here` ne crée pas de fil de discussion Matrix enfant.
- `threadBindings.spawnAcpSessions` n'est requis que pour `/acp spawn --thread auto|here`, où OpenClaw doit créer ou lier un fil de discussion Matrix enfant.

### Configuration de la liaison de fil

Matrix hérite des valeurs globales par défaut de `session.threadBindings` et prend également en charge les substitutions par canal :

- `threadBindings.enabled`
- `threadBindings.idleHours`
- `threadBindings.maxAgeHours`
- `threadBindings.spawnSubagentSessions`
- `threadBindings.spawnAcpSessions`

Les indicateurs de génération liés aux fils de discussion Matrix sont opt-in :

- Définissez `threadBindings.spawnSubagentSessions: true` pour autoriser les `/focus` de niveau supérieur à créer et lier de nouveaux fils de discussion Matrix.
- Définissez `threadBindings.spawnAcpSessions: true` pour autoriser `/acp spawn --thread auto|here` à lier les sessions ACP aux fils de discussion Matrix.

## Réactions

Matrix prend en charge les réactions sortantes, les notifications de réactions entrantes et les accusés de réaction (ack).

Les outils de réaction sortante sont conditionnés par `channels.matrix.actions.reactions` :

- `react` ajoute une réaction à un événement Matrix.
- `reactions` liste le résumé actuel des réactions pour un événement Matrix.
- `emoji=""` supprime les propres réactions du bot sur cet événement.
- `remove: true` supprime uniquement la réaction emoji spécifiée du bot.

**Ordre de résolution** (la première valeur définie l'emporte) :

| Paramètre               | Ordre                                                                               |
| ----------------------- | ----------------------------------------------------------------------------------- |
| `ackReaction`           | par compte → channel → `messages.ackReaction` → de repli d'emoji d'identité d'agent |
| `ackReactionScope`      | par compte → channel → `messages.ackReactionScope` → `"group-mentions"` par défaut  |
| `reactionNotifications` | par compte → channel → `"own"` par défaut                                           |

`reactionNotifications: "own"` transmet les événements `m.reaction` ajoutés lorsqu'ils ciblent des messages Matrix écrits par le bot ; `"off"` désactive les événements système de réaction. Les suppressions de réactions ne sont pas synthétisées en événements système car Matrix les présente comme des rédactions, et non comme des suppressions autonomes `m.reaction`.

## Contexte d'historique

- `channels.matrix.historyLimit` contrôle le nombre de messages récents de salle inclus en tant que `InboundHistory` lorsqu'un message de salle Matrix déclenche l'agent. Revient à `messages.groupChat.historyLimit` ; si les deux ne sont pas définis, la valeur par défaut effective est `0`. Définissez `0` pour désactiver.
- L'historique de salle Matrix est limité à la salle. Les DM continuent d'utiliser l'historique de session normal.
- L'historique de salle Matrix est en attente uniquement : OpenClaw met en mémoire tampon les messages de salle qui n'ont pas encore déclenché de réponse, puis capture cette fenêtre lorsqu'une mention ou un autre déclencheur arrive.
- Le message de déclenchement actuel n'est pas inclus dans `InboundHistory` ; il reste dans le corps entrant principal pour ce tour.
- Les nouvelles tentatives du même événement Matrix réutilisent l'instantané d'historique original au lieu de dériver vers les nouveaux messages de salle.

## Visibilité du contexte

Matrix prend en charge le contrôle partagé `contextVisibility` pour le contexte supplémentaire de la salle, tel que le texte de réponse récupéré, les racines de fils et l'historique en attente.

- `contextVisibility: "all"` est la valeur par défaut. Le contexte supplémentaire est conservé tel que reçu.
- `contextVisibility: "allowlist"` filtre le contexte supplémentaire pour les expéditeurs autorisés par les vérifications de liste d'autorisation de salle/utilisateur actives.
- `contextVisibility: "allowlist_quote"` se comporte comme `allowlist`, mais conserve toujours une réponse citée explicite.

Ce paramètre affecte la visibilité du contexte supplémentaire, et non le fait que le message entrant lui-même puisse déclencher une réponse.
L'autorisation de déclenchement provient toujours de `groupPolicy`, `groups`, `groupAllowFrom` et des paramètres de stratégie de DM.

## Stratégie de DM et de salle

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

Pour faire taire entièrement les DM tout en gardant les salles fonctionnelles, définissez `dm.enabled: false` :

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

Exemple d'appairage pour les DM Matrix :

```bash
openclaw pairing list matrix
openclaw pairing approve matrix <CODE>
```

Si un utilisateur Matrix non approuvé continue à vous envoyer des messages avant l'approbation, OpenClaw réutilise le même code d'appairage en attente et peut envoyer une réponse de rappel après un court temps de recharge au lieu de générer un nouveau code.

Voir [Appairage](/fr/channels/pairing) pour le flux d'appairage DM partagé et la disposition de stockage.

## Réparation directe de salle

Si l'état des messages directs se désynchronise, OpenClaw peut se retrouver avec des mappages `m.direct` périmés qui pointent vers d'anciennes salles solo au lieu du DM actif. Inspectez le mappage actuel pour un pair :

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

Il ne supprime pas automatiquement les anciens salons. Il choisit le DM sain et met à jour le mappage pour que les futurs envois Matrix, les avis de vérification et les autres flux de messages directs ciblent le bon salon.

## Approbations Exec

Matrix peut agir comme un client d'approbation natif. Configurez sous `channels.matrix.execApprovals` (ou `channels.matrix.accounts.<account>.execApprovals` pour une substitution par compte) :

- `enabled` : délivre les approbations via des invites natives Matrix. Lorsqu'il n'est pas défini ou sur `"auto"`, Matrix s'active automatiquement une fois qu'au moins un approbateur peut être résolu. Définissez `false` pour désactiver explicitement.
- `approvers` : IDs d'utilisateurs Matrix (`@owner:example.org`) autorisés à approuver les requêtes exec. Optionnel — revient à `channels.matrix.dm.allowFrom`.
- `target` : destination des invites. `"dm"` (par défaut) envoie aux DMs des approbateurs ; `"channel"` envoie au salon Matrix d'origine ou au DM ; `"both"` envoie aux deux.
- `agentFilter` / `sessionFilter` : listes blanches optionnelles pour quels agents/sessions déclenchent la livraison Matrix.

L'autorisation diffère légèrement selon le type d'approbation :

- Les **Approbations Exec** utilisent `execApprovals.approvers`, en revenant à `dm.allowFrom`.
- Les **Approbations de plugin** s'autorisent uniquement via `dm.allowFrom`.

Les deux types partagent les raccourcis de réaction et les mises à jour de message Matrix. Les approbateurs voient les raccourcis de réaction sur le message d'approbation principal :

- `✅` autoriser une fois
- `❌` refuser
- `♾️` autoriser toujours (lorsque la stratégie exec effective le permet)

Commandes slash de secours : `/approve <id> allow-once`, `/approve <id> allow-always`, `/approve <id> deny`.

Seuls les approbateurs résolus peuvent approuver ou refuser. La livraison par canal pour les approbations exec inclut le texte de la commande — n'activez `channel` ou `both` que dans les salons de confiance.

Connexe : [Approbations Exec](/fr/tools/exec-approvals).

## Commandes slash

Les commandes slash (`/new`, `/reset`, `/model`, `/focus`, `/unfocus`, `/agents`, `/session`, `/acp`, `/approve`, etc.) fonctionnent directement dans les DMs. Dans les salons, OpenClaw reconnaît également les commandes préfixées par la mention Matrix du bot lui-même, donc `@bot:server /new` déclenche le chemin de commande sans regex de mention personnalisée. Cela permet au bot de rester réactif aux messages `@mention /command` de style salon qu'Element et les clients similaires émettent lorsqu'un utilisateur effectue une complétion par tabulation sur le bot avant de taper la commande.

Les règles d'autorisation s'appliquent toujours : les expéditeurs de commandes doivent satisfaire les mêmes stratégies de liste d'autorisation/propriétaire de DM ou de salon que les messages simples.

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

- Les valeurs `channels.matrix` de niveau supérieur servent de valeurs par défaut pour les comptes nommés, sauf si un compte les remplace.
- Définissez une entrée de salon héritée pour un compte spécifique avec `groups.<room>.account`. Les entrées sans `account` sont partagées entre les comptes ; `account: "default"` fonctionne toujours lorsque le compte par défaut est configuré au niveau supérieur.

**Sélection du compte par défaut :**

- Définissez `defaultAccount` pour choisir le compte nommé que le routage implicite, le sondage et les commandes CLI préfèrent.
- Si vous avez plusieurs comptes et que l'un d'eux est nommé littéralement `default`, OpenClaw l'utilise implicitement même lorsque `defaultAccount` n'est pas défini.
- Si vous avez plusieurs comptes nommés et qu'aucun par défaut n'est sélectionné, les commandes CLI refusent de deviner — définissez `defaultAccount` ou passez `--account <id>`.
- Le bloc `channels.matrix.*` de niveau supérieur n'est traité comme le compte implicite `default` que lorsque son authentification est complète (`homeserver` + `accessToken`, ou `homeserver` + `userId` + `password`). Les comptes nommés restent découvrables à partir de `homeserver` + `userId` une fois que les identifiants mis en cache couvrent l'authentification.

**Promotion :**

- Lorsque OpenClaw promeut une configuration mono-compte en multi-compte lors d'une réparation ou d'une configuration, il préserve le compte nommé existant si celui-ci existe ou si `defaultAccount` pointe déjà vers l'un d'eux. Seules les clés d'authentification/amorçage Matrix sont déplacées vers le compte promu ; les clés de stratégie de livraison partagées restent au niveau supérieur.

Voir [Référence de configuration](/fr/gateway/config-channels#multi-account-all-channels) pour le modèle de multi-compte partagé.

## Serveurs domestiques privés/LAN

Par défaut, OpenClaw bloque les serveurs domestiques privés/internes Matrix pour la protection SSRF, sauf si vous
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

Cette option d'adhésion ne permet que les cibles privées/internes de confiance. Les serveurs domestiques publics en clair tels que
`http://matrix.example.org:8008` restent bloqués. Privilégiez `https://` chaque fois que possible.

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

- Utilisateurs : `@user:server`, `user:@user:server` ou `matrix:user:@user:server`
- Salles : `!room:server`, `room:!room:server` ou `matrix:room:!room:server`
- Alias : `#alias:server`, `channel:#alias:server` ou `matrix:channel:#alias:server`

Les ID de salle Matrix sont sensibles à la casse. Utilisez la casse exacte de l'ID de salle provenant de Matrix
lors de la configuration de cibles de livraison explicites, de tâches cron, de liaisons ou de listes autorisées.
OpenClaw conserve les clés de session internes sous forme canonique pour le stockage, ces clés en
minuscules ne constituent donc pas une source fiable pour les ID de livraison Matrix.

La recherche en direct dans l'annuaire utilise le compte Matrix connecté :

- Les recherches d'utilisateurs interrogent l'annuaire des utilisateurs Matrix sur ce serveur domestique.
- Les recherches de salle acceptent directement les ID de salle explicites et les alias, puis reviennent à rechercher les noms des salles rejointes pour ce compte.
- La recherche de nom de salon rejoint s'effectue au mieux. Si un nom de salon ne peut pas être résolu en ID ou en alias, il est ignoré lors de la résolution de la liste d'autorisation (allowlist) à l'exécution.

## Référence de configuration

Les champs de style liste d'autorisation (`groupAllowFrom`, `dm.allowFrom`, `groups.<room>.users`) acceptent les ID utilisateur Matrix complets (le plus sûr). Les correspondances exactes de répertoire sont résolues au démarrage et à chaque modification de la liste d'autorisation pendant que le moniteur est en cours d'exécution ; les entrées qui ne peuvent pas être résolues sont ignorées à l'exécution. Les listes d'autorisation de salon préfèrent les ID de salon ou les alias pour la même raison.

### Compte et connexion

- `enabled` : active ou désactive le canal.
- `name` : libellé d'affichage facultatif pour le compte.
- `defaultAccount` : ID de compte préféré lorsque plusieurs comptes Matrix sont configurés.
- `accounts` : remplacements nommés par compte. Les valeurs `channels.matrix` de niveau supérieur sont héritées par défaut.
- `homeserver` : URL du serveur d'accueil (homeserver), par exemple `https://matrix.example.org`.
- `network.dangerouslyAllowPrivateNetwork` : autorise ce compte à se connecter à `localhost`, aux IP LAN/Tailscale, ou aux noms d'hôte internes.
- `proxy` : URL de proxy HTTP(S) facultative pour le trafic Matrix. Le remplacement par compte est pris en charge.
- `userId` : ID d'utilisateur Matrix complet (`@bot:example.org`).
- `accessToken` : jeton d'accès pour l'authentification par jeton. Les valeurs en texte brut et SecretRef sont prises en charge via les fournisseurs env/file/exec ([Gestion des secrets](/fr/gateway/secrets)).
- `password` : mot de passe pour la connexion par mot de passe. Les valeurs en texte brut et SecretRef sont prises en charge.
- `deviceId` : ID d'appareil Matrix explicite.
- `deviceName` : nom d'affichage de l'appareil utilisé lors de la connexion par mot de passe.
- `avatarUrl` : URL stockée de l'auto-avatar pour la synchronisation du profil et les mises à jour `profile set`.
- `initialSyncLimit` : nombre maximum d'événements récupérés lors de la synchronisation de démarrage.

### Chiffrement

- `encryption` : activer E2EE. Par défaut : `false`.
- `startupVerification` : `"if-unverified"` (par défaut lorsque le chiffrement de bout en bout est activé) ou `"off"`. Demande automatiquement l'auto-vérification au démarrage lorsque cet appareil n'est pas vérifié.
- `startupVerificationCooldownHours` : temps de recharge avant la prochaine demande automatique au démarrage. Par défaut : `24`.

### Accès et stratégies

- `groupPolicy` : `"open"`, `"allowlist"` ou `"disabled"`. Par défaut : `"allowlist"`.
- `groupAllowFrom` : liste d'autorisation des ID utilisateur pour le trafic de salle.
- `dm.enabled` : lorsque `false`, ignore tous les DM. Par défaut : `true`.
- `dm.policy` : `"pairing"` (par défaut), `"allowlist"`, `"open"` ou `"disabled"`. S'applique une fois que le bot a rejoint et classé la salle comme un DM ; cela n'affecte pas la gestion des invitations.
- `dm.allowFrom` : liste d'autorisation des ID utilisateur pour le trafic DM.
- `dm.sessionScope` : `"per-user"` (par défaut) ou `"per-room"`.
- `dm.threadReplies` : substitution pour les fils de discussion de réponse uniquement pour les DM (`"off"`, `"inbound"`, `"always"`).
- `allowBots` : accepter les messages d'autres comptes bot Matrix configurés (`true` ou `"mentions"`).
- `allowlistOnly` : lorsque `true`, force toutes les stratégies DM actives (à l'exception de `"disabled"`) et les stratégies de groupe `"open"` à `"allowlist"`. Ne modifie pas les stratégies `"disabled"`.
- `autoJoin` : `"always"`, `"allowlist"` ou `"off"`. Par défaut : `"off"`. S'applique à chaque invitation Matrix, y compris les invitations de type DM.
- `autoJoinAllowlist` : salons/alias autorisés lorsque `autoJoin` est `"allowlist"`. Les entrées d'alias sont résolues par rapport au serveur d'accueil (homeserver), et non par rapport à l'état déclaré par le salon invité.
- `contextVisibility` : visibilité du contexte supplémentaire (`"all"` par défaut, `"allowlist"`, `"allowlist_quote"`).

### Comportement de réponse

- `replyToMode` : `"off"`, `"first"`, `"all"`, ou `"batched"`.
- `threadReplies` : `"off"`, `"inbound"`, ou `"always"`.
- `threadBindings` : substitutions par channel pour le routage et le cycle de vie des sessions liées aux fils de discussion.
- `streaming` : `"off"` (par défaut), `"partial"`, `"quiet"`. `true` ↔ `"partial"`, `false` ↔ `"off"`.
- `blockStreaming` : lorsque `true`, les blocs d'assistant terminés sont conservés comme des messages de progression distincts.
- `markdown` : configuration optionnelle du rendu Markdown pour le texte sortant.
- `responsePrefix` : chaîne optionnelle ajoutée au début des réponses sortantes.
- `textChunkLimit` : taille des blocs sortants en caractères lorsque `chunkMode: "length"`. Par défaut : `4000`.
- `chunkMode` : `"length"` (par défaut, divise par nombre de caractères) ou `"newline"` (divise aux limites des lignes).
- `historyLimit` : nombre de messages récents du salon inclus en tant que `InboundHistory` lorsqu'un message du salon déclenche l'agent. Revient à `messages.groupChat.historyLimit` ; par défaut effectif `0` (désactivé).
- `mediaMaxMb` : limite de taille des médias en Mo pour les envois sortants et le traitement entrant.

### Paramètres de réaction

- `ackReaction` : redéfinition de la réaction d'accusation de réception pour ce channel/compte.
- `ackReactionScope` : redéfinition de la portée (`"group-mentions"` par défaut, `"group-all"`, `"direct"`, `"all"`, `"none"`, `"off"`).
- `reactionNotifications` : mode de notification de réaction entrante (`"own"` par défaut, `"off"`).

### Outils et redéfinitions par salon

- `actions` : filtrage des outils par action (`messages`, `reactions`, `pins`, `profile`, `memberInfo`, `channelInfo`, `verification`).
- `groups` : carte de stratégie par salon. L'identité de session utilise l'ID stable du salon après résolution. (`rooms` est un alias hérité.)
  - `groups.<room>.account` : restreindre une entrée de salon héritée à un compte spécifique.
  - `groups.<room>.allowBots` : redéfinition par salon du paramètre au niveau du channel (`true` ou `"mentions"`).
  - `groups.<room>.users` : liste d'autorisation des expéditeurs par salon.
  - `groups.<room>.tools` : redéfinitions d'autorisation/refus des outils par salon.
  - `groups.<room>.autoReply` : redéfinition du filtrage par mention par salon. `true` désactive les exigences de mention pour ce salon ; `false` les réactive.
  - `groups.<room>.skills` : filtre de compétence par salon.
  - `groups.<room>.systemPrompt` : extrait de prompt système par salon.

### Paramètres d'approbation Exec

- `execApprovals.enabled` : délivrer les approbations exec via des invites natifs Matrix.
- `execApprovals.approvers` : IDs utilisateur Matrix autorisés à approuver. Revient à `dm.allowFrom`.
- `execApprovals.target` : `"dm"` (par défaut), `"channel"`, ou `"both"`.
- `execApprovals.agentFilter` / `execApprovals.sessionFilter` : listes d'autorisation optionnelles d'agent/session pour la livraison.

## Connexes

- [Vue d'ensemble des canaux](/fr/channels) — tous les canaux pris en charge
- [Jumelage](/fr/channels/pairing) — authentification et flux de jumelage DM
- [Groupes](/fr/channels/groups) — comportement du chat de groupe et filtrage des mentions
- [Routage de canal](/fr/channels/channel-routing) — routage de session pour les messages
- [Sécurité](/fr/gateway/security) — modèle d'accès et durcissement
