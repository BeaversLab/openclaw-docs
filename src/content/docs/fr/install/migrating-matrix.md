---
summary: "Comment OpenClaw met à jour le précédent plugin Matrix à la même place, y compris les limites de récupération de l'état chiffré et les étapes de récupération manuelle."
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Matrix migration"
---

Cette page traite des mises à niveau du plugin public précédent `matrix` vers l'implémentation actuelle.

Pour la plupart des utilisateurs, la mise à niveau se fait à la même place :

- le plugin reste `@openclaw/matrix`
- le channel reste `matrix`
- votre config reste sous `channels.matrix`
- les identifiants mis en cache restent sous `~/.openclaw/credentials/matrix/`
- l'état d'exécution reste sous `~/.openclaw/matrix/`

Vous n'avez pas besoin de renommer les clés de configuration ou de réinstaller le plugin sous un nouveau nom.

## Ce que fait la migration automatiquement

Lorsque la passerelle démarre et lorsque vous exécutez [`openclaw doctor --fix`](/fr/gateway/doctor), OpenClaw essaie de réparer automatiquement l'ancien état Matrix.
Avant qu'une étape de migration Matrix ne modifie l'état sur disque, OpenClaw crée ou réutilise un instantané de récupération ciblé.

Lorsque vous utilisez `openclaw update`, le déclencheur exact dépend de la manière dont OpenClaw est installé :

- les installations à partir des sources exécutent `openclaw doctor --fix` pendant le flux de mise à jour, puis redémarrent la passerelle par défaut
- les installations via le gestionnaire de paquets mettent à jour le paquet, exécutent une passe doctor non interactive, puis s'appuient sur le redémarrage par défaut de la passerelle pour que le démarrage puisse terminer la migration Matrix
- si vous utilisez `openclaw update --no-restart`, la migration Matrix basée sur le démarrage est différée jusqu'à ce que vous exécutiez ultérieurement `openclaw doctor --fix` et redémarriez la passerelle

La migration automatique couvre :

- la création ou la réutilisation d'un instantané de pré-migration sous `~/Backups/openclaw-migrations/`
- la réutilisation de vos identifiants Matrix mis en cache
- le maintien de la même sélection de compte et de la config `channels.matrix`
- le déplacement du plus ancien magasin de synchronisation plat Matrix vers l'emplacement actuel délimité au compte
- le déplacement du plus ancien magasin de chiffrement plat Matrix vers l'emplacement actuel délimité au compte lorsque le compte cible peut être résolu en toute sécurité
- l'extraction d'une clé de déchiffrement de sauvegarde de clé de salle Matrix précédemment enregistrée à partir de l'ancien magasin de chiffrement rust, lorsque cette clé existe localement
- réutilisation de la racine de stockage de hachage de jeton existante la plus complète pour le même compte Matrix, serveur domestique et utilisateur lorsque le jeton d'accès change ultérieurement
- analyse des racines de stockage de hachage de jeton sœurs pour les métadonnées de restauration d'état chiffré en attente lorsque le jeton d'accès Matrix a changé mais que l'identité du compte/appareil est restée la même
- restauration des clés de salle sauvegardées dans le nouveau magasin de chiffrement lors du prochain démarrage Matrix

Détails de l'instantané :

- OpenClaw écrit un fichier marqueur à `~/.openclaw/matrix/migration-snapshot.json` après un instantané réussi pour que les démarrages ultérieurs et les passes de réparation puissent réutiliser la même archive.
- Ces instantanés de migration automatique Matrix sauvegardent uniquement la configuration + l'état (`includeWorkspace: false`).
- Si Matrix n'a qu'un état de migration avec avertissement uniquement, par exemple parce que `userId` ou `accessToken` est toujours manquant, OpenClaw ne crée pas encore l'instantané car aucune mutation Matrix n'est actionnable.
- Si l'étape d'instantané échoue, OpenClaw ignore la migration Matrix pour cette exécution au lieu de modifier l'état sans point de récupération.

À propos des mises à niveau multi-comptes :

- le plus ancien magasin plat Matrix (`~/.openclaw/matrix/bot-storage.json` et `~/.openclaw/matrix/crypto/`) provenait d'une disposition à magasin unique, donc OpenClaw ne peut le migrer que vers une seule cible de compte Matrix résolue
- les magasins hérités Matrix déjà délimités au compte sont détectés et préparés pour chaque compte Matrix configuré

## Ce que la migration ne peut pas faire automatiquement

Le plugin public précédent Matrix ne créait **pas** automatiquement de sauvegardes de clés de salle Matrix. Il persistait l'état de chiffrement local et demandait la vérification de l'appareil, mais ne garantissait pas que vos clés de salle étaient sauvegardées sur le serveur domestique.

Cela signifie que certaines installations chiffrées ne peuvent être migrées que partiellement.

OpenClaw ne peut pas récupérer automatiquement :

- les clés de salle locales uniquement qui n'ont jamais été sauvegardées
- l'état chiffré lorsque le compte Matrix cible ne peut pas encore être résolu parce que `homeserver`, `userId` ou `accessToken` sont toujours indisponibles
- la migration automatique d'un magasin plat partagé Matrix lorsque plusieurs comptes Matrix sont configurés mais que `channels.matrix.defaultAccount` n'est pas défini
- les installations de chemin de plugin personnalisé qui sont épinglées à un chemin de dépôt au lieu du package Matrix standard
- une clé de récupération manquante lorsque l'ancien magasin possédait des clés sauvegardées mais ne conservait pas la clé de déchiffrement localement

Portée actuelle de l'avertissement :

- les installations de plug-in de chemin personnalisé Matrix sont signalées par le démarrage de la passerelle et `openclaw doctor`

Si votre ancienne installation comportait un historique chiffré uniquement local qui n'a jamais été sauvegardé, certains anciens messages chiffrés peuvent rester illisibles après la mise à niveau.

## Flux de mise à niveau recommandé

1. Mettez à jour OpenClaw et le plug-in Matrix normalement.
   Préférez le `openclaw update` simple sans `--no-restart` afin que le démarrage puisse terminer immédiatement la migration Matrix.
2. Exécutez :

   ```bash
   openclaw doctor --fix
   ```

   Si Matrix a une tâche de migration faisable, le docteur créera ou réutilisera d'abord l'instantané de pré-migration et imprimera le chemin d'archive.

3. Démarrez ou redémarrez la passerelle.
4. Vérifiez l'état actuel de la vérification et de la sauvegarde :

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. Placez la clé de récupération du compte Matrix que vous réparez dans une variable d'environnement spécifique au compte. Pour un compte par défaut unique, `MATRIX_RECOVERY_KEY` convient. Pour plusieurs comptes, utilisez une variable par compte, par exemple `MATRIX_RECOVERY_KEY_ASSISTANT`, et ajoutez `--account assistant` à la commande.

6. Si OpenClaw vous indique qu'une clé de récupération est nécessaire, exécutez la commande pour le compte correspondant :

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify backup restore --recovery-key-stdin --account assistant
   ```

7. Si cet appareil n'est toujours pas vérifié, exécutez la commande pour le compte correspondant :

   ```bash
   printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin
   printf '%s\n' "$MATRIX_RECOVERY_KEY_ASSISTANT" | openclaw matrix verify device --recovery-key-stdin --account assistant
   ```

   Si la clé de récupération est acceptée et que la sauvegarde est utilisable, mais que `Cross-signing verified`
   est toujours `no`, effectuez l'auto-vérification depuis un autre client Matrix :

   ```bash
   openclaw matrix verify self
   ```

   Acceptez la demande dans un autre client Matrix, comparez les émojis ou les nombres décimaux,
   et tapez `yes` uniquement lorsqu'ils correspondent. La commande se termine avec succès uniquement
   une fois que `Cross-signing verified` devient `yes`.

8. Si vous abandonnez intentionnellement un vieil historique irrécupérable et souhaitez une base de sauvegarde fraîche pour les futurs messages, exécutez :

   ```bash
   openclaw matrix verify backup reset --yes
   ```

9. Si aucune sauvegarde de clé côté serveur n'existe encore, créez-en une pour de futures récupérations :

   ```bash
   openclaw matrix verify bootstrap
   ```

## Fonctionnement de la migration chiffrée

La migration chiffrée est un processus en deux étapes :

1. Le démarrage ou `openclaw doctor --fix` crée ou réutilise l'instantané de pré-migration si la migration chiffrée est faisable.
2. Le démarrage ou `openclaw doctor --fix` inspecte l'ancien magasin de chiffrement Matrix via l'installation active du plug-in Matrix.
3. Si une clé de déchiffrement de sauvegarde est trouvée, OpenClaw l'écrit dans le nouveau flux de clé de récupération et marque la restauration des clés de salle comme en attente.
4. Au prochain démarrage de Matrix, OpenClaw restaure automatiquement les clés de salle sauvegardées dans le nouveau magasin de chiffrement.

Si l'ancien magasin signale des clés de salle qui n'ont jamais été sauvegardées, OpenClaw avertit au lieu de prétendre que la récupération a réussi.

## Messages courants et leur signification

### Messages de mise à niveau et de détection

`Matrix plugin upgraded in place.`

- Signification : l'ancien état Matrix sur disque a été détecté et migré vers la disposition actuelle.
- Action à faire : rien, sauf si la même sortie contient également des avertissements.

`Matrix migration snapshot created before applying Matrix upgrades.`

- Signification : OpenClaw a créé une archive de récupération avant de modifier l'état Matrix.
- Action à faire : conservez le chemin de l'archive imprimé jusqu'à ce que vous confirmiez que la migration a réussi.

`Matrix migration snapshot reused before applying Matrix upgrades.`

- Signification : OpenClaw a trouvé un marqueur d'instantané de migration Matrix existant et a réutilisé cette archive au lieu de créer une sauvegarde en double.
- Action à faire : conservez le chemin de l'archive imprimé jusqu'à ce que vous confirmiez que la migration a réussi.

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- Signification : un ancien état Matrix existe, mais OpenClaw ne peut pas le faire correspondre à un compte Matrix actuel car Matrix n'est pas configuré.
- Action à faire : configurez `channels.matrix`, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Signification : OpenClaw a trouvé un ancien état, mais il ne peut toujours pas déterminer la racine exacte du compte/périphérique actuel.
- Action à faire : démarrez la passerelle une fois avec une connexion Matrix fonctionnelle, ou relancez `openclaw doctor --fix` une fois que les informations d'identification mises en cache existent.

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Signification : OpenClaw a trouvé un magasin Matrix plat partagé, mais il refuse de deviner quel compte Matrix nommé doit le recevoir.
- Action à faire : définissez `channels.matrix.defaultAccount` sur le compte prévu, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Matrix legacy sync store not migrated because the target already exists (...)`

- Signification : le nouvel emplacement délimité au compte possède déjà un magasin de synchronisation ou de chiffrement, donc OpenClaw ne l'a pas écrasé automatiquement.
- Action à faire : vérifiez que le compte actuel est le bon avant de supprimer ou de déplacer manuellement la cible en conflit.

`Failed migrating Matrix legacy sync store (...)` ou `Failed migrating Matrix legacy crypto store (...)`

- Signification : OpenClaw a tenté de déplacer l'ancien état Matrix, mais l'opération du système de fichiers a échoué.
- Que faire : vérifiez les autorisations du système de fichiers et l'état du disque, puis relancez `openclaw doctor --fix`.

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- Signification : OpenClaw a trouvé un ancien magasin chiffré Matrix, mais il n'y a aucune configuration Matrix actuelle à laquelle l'attacher.
- Que faire : configurez `channels.matrix`, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Signification : le magasin chiffré existe, mais OpenClaw ne peut pas décider en toute sécurité à quel compte/appareil actuel il appartient.
- Que faire : démarrez la passerelle une fois avec une connexion Matrix fonctionnelle, ou relancez `openclaw doctor --fix` une fois que les informations d'identification mises en cache sont disponibles.

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Signification : OpenClaw a trouvé un ancien magasin de chiffrement hérité partagé et plat, mais il refuse de deviner à quel compte Matrix nommé il doit l'attribuer.
- Que faire : définissez `channels.matrix.defaultAccount` sur le compte prévu, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- Signification : OpenClaw a détecté un ancien état Matrix, mais la migration est toujours bloquée par des données d'identité ou d'identification manquantes.
- Que faire : terminez la connexion ou la configuration de Matrix, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- Signification : OpenClaw a trouvé un ancien état chiffré Matrix, mais il n'a pas pu charger le point d'entrée du helper depuis le plugin Matrix qui inspecte normalement ce magasin.
- Que faire : réinstallez ou réparez le plugin Matrix (`openclaw plugins install @openclaw/matrix`, ou `openclaw plugins install ./path/to/local/matrix-plugin` pour une extraction de dépôt), puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- Signification : OpenClaw a trouvé un chemin de fichier helper qui s'échappe de la racine du plugin ou échoue aux vérifications des limites du plugin, il a donc refusé de l'importer.
- Que faire : réinstallez le plugin Matrix à partir d'un chemin approuvé, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- Signification : OpenClaw a refusé de modifier l'état Matrix car il n'a pas pu créer la snapshot de récupération au préalable.
- À faire : résolvez l'erreur de sauvegarde, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Failed migrating legacy Matrix client storage: ...`

- Signification : le repli côté client Matrix a trouvé un ancien stockage plat, mais le déplacement a échoué. OpenClaw abandonne désormais ce repli au lieu de démarrer silencieusement avec un nouveau stockage.
- À faire : vérifiez les autorisations ou les conflits du système de fichiers, gardez l'ancien état intact, et réessayez après avoir corrigé l'erreur.

`Matrix is installed from a custom path: ...`

- Signification : Matrix est épinglé (pinned) à une installation par chemin, les mises à jour principales ne le remplacent donc pas automatiquement par le paquet Matrix standard du dépôt.
- À faire : réinstallez avec `openclaw plugins install @openclaw/matrix` lorsque vous souhaitez revenir au plugin Matrix par défaut.

### Messages de récupération de l'état chiffré

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- Signification : les clés de salle sauvegardées ont été restaurées avec succès dans le nouveau magasin de chiffrement.
- À faire : généralement rien.

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- Signification : certaines anciennes clés de salle n'existaient que dans l'ancien magasin local et n'avaient jamais été téléversées vers la sauvegarde Matrix.
- À faire : attendez-vous à ce que certains anciens historiques chiffrés restent indisponibles, à moins que vous ne puissiez récupérer ces clés manuellement à partir d'un autre client vérifié.

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key-stdin" after upgrade if they have the recovery key.`

- Signification : une sauvegarde existe, mais OpenClaw n'a pas pu récupérer la clé de récupération automatiquement.
- À faire : lancez `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`.

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- Signification : OpenClaw a trouvé l'ancien magasin chiffré, mais n'a pas pu l'inspecter avec suffisamment de sécurité pour préparer la récupération.
- À faire : relancez `openclaw doctor --fix`. Si cela se répète, gardez l'ancien répertoire d'état intact et récupérez en utilisant un autre client Matrix vérifié ainsi que `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin`.

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- Signification : OpenClaw a détecté un conflit de clé de sauvegarde et a refusé d'écraser automatiquement le fichier de clé de récupération actuel.
- À faire : vérifiez quelle clé de récupération est correcte avant de réessayer toute commande de restauration.

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- Signification : il s'agit de la limite stricte de l'ancien format de stockage.
- À faire : les clés sauvegardées peuvent toujours être restaurées, mais l'historique chiffré local uniquement peut rester indisponible.

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- Signification : le nouveau plugin a tenté une restauration mais Matrix a renvoyé une erreur.
- Ce qu'il faut faire : exécutez `openclaw matrix verify backup status`, puis réessayez avec `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` si nécessaire.

### Messages de récupération manuelle

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- Signification : OpenClaw sait que vous devriez avoir une clé de sauvegarde, mais elle n'est pas active sur cet appareil.
- Ce qu'il faut faire : exécutez `openclaw matrix verify backup restore`, ou définissez `MATRIX_RECOVERY_KEY` et exécutez `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin` si nécessaire.

`Store a recovery key with 'openclaw matrix verify device --recovery-key-stdin', then run 'openclaw matrix verify backup restore'.`

- Signification : cet appareil ne possède actuellement pas la clé de récupération stockée.
- Ce qu'il faut faire : définissez `MATRIX_RECOVERY_KEY`, exécutez `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`, puis restaurez la sauvegarde.

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin' with the matching recovery key.`

- Signification : la clé stockée ne correspond pas à la sauvegarde Matrix active.
- Ce qu'il faut faire : définissez `MATRIX_RECOVERY_KEY` avec la clé correcte et exécutez `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`.

Si vous acceptez de perdre l'ancien historique chiffré irrécupérable, vous pouvez à la place réinitialiser la
ligne de base de la sauvegarde actuelle avec `openclaw matrix verify backup reset --yes`. Lorsque le
secret de sauvegarde stocké est cassé, cette réinitialisation peut également recréer le stockage des secrets afin que la
nouvelle clé de sauvegarde puisse se charger correctement après redémarrage.

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device --recovery-key-stdin'.`

- Signification : la sauvegarde existe, mais cet appareil ne fait pas encore suffisamment confiance à la chaîne de signature croisée.
- Ce qu'il faut faire : définissez `MATRIX_RECOVERY_KEY` et exécutez `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`.

`Matrix recovery key is required`

- Signification : vous avez essayé une étape de récupération sans fournir de clé de récupération alors qu'une était requise.
- Ce qu'il faut faire : relancez la commande avec `--recovery-key-stdin`, par exemple `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`.

`Invalid Matrix recovery key: ...`

- Signification : la clé fournie n'a pas pu être analysée ou ne correspondait pas au format attendu.
- Ce qu'il faut faire : réessayez avec la clé de récupération exacte de votre client Matrix ou du fichier de clé de récupération.

`Matrix recovery key was applied, but this device still lacks full Matrix identity trust.`

- Signification : OpenClaw a pu appliquer la clé de récupération, mais Matrix n'a pas encore
  établi une confiance totale en l'identité de signature croisée pour cet appareil. Vérifiez la
  sortie de la commande pour `Recovery key accepted`, `Backup usable`,
  `Cross-signing verified`, et `Device verified by owner`.
- Que faire : exécutez `openclaw matrix verify self`, acceptez la demande dans un autre client Matrix, comparez le SAS, et tapez `yes` uniquement lorsqu'ils correspondent. La commande attend une confiance totale dans l'identité Matrix avant de signaler le succès. Utilisez `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify bootstrap --recovery-key-stdin --force-reset-cross-signing` uniquement lorsque vous souhaitez intentionnellement remplacer l'identité de signature croisée actuelle.

`Matrix key backup is not active on this device after loading from secret storage.`

- Signification : le stockage des secrets n'a pas produit une session de sauvegarde active sur cet appareil.
- Que faire : vérifiez d'abord l'appareil, puis revérifiez avec `openclaw matrix verify backup status`.

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device --recovery-key-stdin' first.`

- Signification : cet appareil ne peut pas restaurer à partir du stockage des secrets tant que la vérification de l'appareil n'est pas terminée.
- Que faire : exécutez d'abord `printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify device --recovery-key-stdin`.

### Messages d'installation de plugin personnalisé

`Matrix is installed from a custom path that no longer exists: ...`

- Signification : votre enregistrement d'installation de plugin pointe vers un chemin local qui a disparu.
- Que faire : réinstallez avec `openclaw plugins install @openclaw/matrix`, ou si vous exécutez depuis une extraction de dépôt, `openclaw plugins install ./path/to/local/matrix-plugin`.

## Si l'historique chiffré ne revient toujours pas

Exécutez ces vérifications dans l'ordre :

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
printf '%s\n' "$MATRIX_RECOVERY_KEY" | openclaw matrix verify backup restore --recovery-key-stdin --verbose
```

Si la sauvegarde est restaurée avec succès mais que certains anciens salons manquent encore d'historique, ces clés manquantes n'ont probablement jamais été sauvegardées par le plugin précédent.

## Si vous souhaitez repartir à zéro pour les futurs messages

Si vous acceptez de perdre l'historique chiffré ancien irrécupérable et que vous souhaitez uniquement une base de sauvegarde propre pour l'avenir, exécutez ces commandes dans l'ordre :

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Si l'appareil n'est toujours pas vérifié après cela, terminez la vérification depuis votre client Matrix en comparant les émojis SAS ou les codes décimaux et en confirmant qu'ils correspondent.

## Pages connexes

- [Matrix](/fr/channels/matrix)
- [Doctor](/fr/gateway/doctor)
- [Migrating](/fr/install/migrating)
- [Plugins](/fr/tools/plugin)
