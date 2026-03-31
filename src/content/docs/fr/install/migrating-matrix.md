---
summary: "Comment OpenClaw met à niveau le plugin Matrix précédent en place, y compris les limites de récupération de l'état chiffré et les étapes de récupération manuelle."
read_when:
  - Upgrading an existing Matrix installation
  - Migrating encrypted Matrix history and device state
title: "Matrix migration"
---

# Matrix migration

Cette page couvre les mises à niveau du plugin public `matrix` précédent vers l'implémentation actuelle.

Pour la plupart des utilisateurs, la mise à niveau s'effectue en place :

- le plugin reste `@openclaw/matrix`
- le canal reste `matrix`
- votre configuration reste sous `channels.matrix`
- les identifiants mis en cache restent sous `~/.openclaw/credentials/matrix/`
- l'état d'exécution reste sous `~/.openclaw/matrix/`

Vous n'avez pas besoin de renommer les clés de configuration ou de réinstaller le plugin sous un nouveau nom.

## Ce que fait automatiquement la migration

Lorsque la passerelle démarre et lorsque vous exécutez [`openclaw doctor --fix`](/en/gateway/doctor), OpenClaw tente de réparer automatiquement l'ancien état Matrix.
Avant qu'une étape de migration Matrix ne modifie l'état sur disque, OpenClaw crée ou réutilise un instantané de récupération ciblé.

Lorsque vous utilisez `openclaw update`, le déclencheur exact dépend de la manière dont OpenClaw est installé :

- les installations source exécutent `openclaw doctor --fix` pendant le flux de mise à jour, puis redémarrent la passerelle par défaut
- les installations via le gestionnaire de paquets mettent à jour le paquet, exécutent une passe de diagnostic non interactive, puis s'appuient sur le redémarrage par défaut de la passerelle pour que le démarrage puisse terminer la migration Matrix
- si vous utilisez `openclaw update --no-restart`, la migration Matrix soutenue par le démarrage est différée jusqu'à ce que vous exécutiez plus tard `openclaw doctor --fix` et redémarriez la passerelle

La migration automatique couvre :

- la création ou la réutilisation d'un instantané de pré-migration sous `~/Backups/openclaw-migrations/`
- la réutilisation de vos identifiants Matrix mis en cache
- le maintien de la même sélection de compte et de la configuration `channels.matrix`
- le déplacement du plus ancien magasin de synchronisation plat Matrix vers l'emplacement actuel délimité au compte
- le déplacement du plus ancien magasin de chiffrement plat Matrix vers l'emplacement actuel délimité au compte lorsque le compte cible peut être résolu en toute sécurité
- l'extraction d'une clé de déchiffrement de sauvegarde de clé de salle Matrix précédemment sauvegardée à partir de l'ancien magasin de chiffrement rust, lorsque cette clé existe localement
- en réutilisant la racine de stockage du hachage de jeton existant la plus complète pour le même compte Matrix, serveur d'accueil et utilisateur lorsque le jeton d'accès change ultérieurement
- en scannant les racines de stockage de hachage de jeton sœurs pour les métadonnées de restauration d'état chiffré en attente lorsque le jeton d'accès Matrix a changé mais que l'identité du compte/périphérique est restée la même
- en restaurant les clés de salle sauvegardées dans le nouveau magasin de chiffrement au prochain démarrage de Matrix

Détails de l'instantané :

- OpenClaw écrit un fichier marqueur à `~/.openclaw/matrix/migration-snapshot.json` après un instantané réussi afin que les démarrages et les passes de réparation ultérieurs puissent réutiliser la même archive.
- Ces instantanés de migration Matrix automatiques sauvegardent uniquement la configuration + l'état (`includeWorkspace: false`).
- Si Matrix n'a qu'un état de migration avec avertissement uniquement, par exemple parce que `userId` ou `accessToken` est toujours manquant, OpenClaw ne crée pas encore l'instantané car aucune mutation Matrix n'est actionnable.
- Si l'étape d'instantané échoue, OpenClaw ignore la migration Matrix pour cette exécution au lieu de modifier l'état sans point de récupération.

À propos des mises à niveau multi-comptes :

- le plus ancien magasin Matrix plat (`~/.openclaw/matrix/bot-storage.json` et `~/.openclaw/matrix/crypto/`) provenait d'une disposition à magasin unique, donc OpenClaw ne peut le migrer que vers une seule cible de compte Matrix résolue
- les magasins Matrix hérités déjà délimités au compte sont détectés et préparés par compte Matrix configuré

## Ce que la migration ne peut pas faire automatiquement

Le plugin Matrix public précédent ne créait **pas** automatiquement de sauvegardes de clés de salle Matrix. Il persistait l'état de chiffrement local et demandait la vérification des périphériques, mais il ne garantissait pas que vos clés de salle étaient sauvegardées sur le serveur d'accueil.

Cela signifie que certaines installations chiffrées ne peuvent être migrées que partiellement.

OpenClaw ne peut pas récupérer automatiquement :

- les clés de salle locales uniquement qui n'ont jamais été sauvegardées
- l'état chiffré lorsque le compte Matrix cible ne peut pas encore être résolu parce que `homeserver`, `userId` ou `accessToken` sont toujours indisponibles
- la migration automatique d'un magasin Matrix plat partagé lorsque plusieurs comptes Matrix sont configurés mais que `channels.matrix.defaultAccount` n'est pas défini
- les installations de chemin de plugin personnalisé qui sont épinglées à un chemin de dépôt au lieu du package Matrix standard
- une clé de récupération manquante lorsque l'ancien magasin avait des clés sauvegardées mais ne conservait pas la clé de déchiffrement localement

Portée actuelle de l'avertissement :

- les installations de plug-in Matrix avec un chemin personnalisé sont signalées à la fois par le démarrage de la passerelle et `openclaw doctor`

Si votre ancienne installation avait un historique chiffré uniquement en local qui n'a jamais été sauvegardé, certains anciens messages chiffrés peuvent rester illisibles après la mise à niveau.

## Flux de mise à niveau recommandé

1. Mettez à jour OpenClaw et le plug-in Matrix normalement.
   Préférez le simple `openclaw update` sans `--no-restart` afin que le démarrage puisse terminer immédiatement la migration de Matrix.
2. Exécutez :

   ```bash
   openclaw doctor --fix
   ```

   Si Matrix a une tâche de migration réalisable, le médecin créera ou réutilisera d'abord l'instantané pré-migration et imprimera le chemin d'archive.

3. Démarrez ou redémarrez la passerelle.
4. Vérifiez l'état actuel de la vérification et de la sauvegarde :

   ```bash
   openclaw matrix verify status
   openclaw matrix verify backup status
   ```

5. Si OpenClaw vous indique qu'une clé de récupération est nécessaire, exécutez :

   ```bash
   openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"
   ```

6. Si cet appareil n'est toujours pas vérifié, exécutez :

   ```bash
   openclaw matrix verify device "<your-recovery-key>"
   ```

7. Si vous abandonnez intentionnellement l'ancien historique irrécupérable et que vous souhaitez une nouvelle base de sauvegarde pour les futurs messages, exécutez :

   ```bash
   openclaw matrix verify backup reset --yes
   ```

8. Si aucune sauvegarde de clé côté serveur n'existe encore, créez-en une pour les récupérations futures :

   ```bash
   openclaw matrix verify bootstrap
   ```

## Fonctionnement de la migration chiffrée

La migration chiffrée est un processus en deux étapes :

1. Le démarrage ou `openclaw doctor --fix` crée ou réutilise l'instantané pré-migration si la migration chiffrée est réalisable.
2. Le démarrage ou `openclaw doctor --fix` inspecte l'ancien magasin de chiffrement Matrix via l'installation active du plug-in Matrix.
3. Si une clé de déchiffrement de sauvegarde est trouvée, OpenClaw l'écrit dans le nouveau flux de clés de récupération et marque la restauration des clés de salle comme en attente.
4. Au prochain démarrage de Matrix, OpenClaw restaure automatiquement les clés de salle sauvegardées dans le nouveau magasin de chiffrement.

Si l'ancien magasin signale des clés de salle qui n'ont jamais été sauvegardées, OpenClaw avertit au lieu de prétendre que la récupération a réussi.

## Messages courants et leur signification

### Messages de mise à niveau et de détection

`Matrix plugin upgraded in place.`

- Signification : l'ancien état Matrix sur disque a été détecté et migré vers la disposition actuelle.
- Que faire : rien, sauf si la même sortie comprend également des avertissements.

`Matrix migration snapshot created before applying Matrix upgrades.`

- Signification : OpenClaw a créé une archive de récupération avant de modifier l'état Matrix.
- Que faire : conservez le chemin d'archive imprimé jusqu'à ce que vous confirmiez que la migration a réussi.

`Matrix migration snapshot reused before applying Matrix upgrades.`

- Signification : OpenClaw a trouvé un marqueur de instantané de migration Matrix existant et a réutilisé cette archive au lieu de créer une sauvegarde en double.
- Action à effectuer : conservez le chemin de l'archive affiché jusqu'à ce que vous confirmiez que la migration a réussi.

`Legacy Matrix state detected at ... but channels.matrix is not configured yet.`

- Signification : un ancien état Matrix existe, mais OpenClaw ne peut pas le faire correspondre à un compte Matrix actuel car Matrix n'est pas configuré.
- Action à effectuer : configurez `channels.matrix`, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Legacy Matrix state detected at ... but the new account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Signification : OpenClaw a trouvé un ancien état, mais il ne peut toujours pas déterminer la racine exacte du compte/périphérique actuel.
- Action à effectuer : démarrez la passerelle une fois avec une connexion Matrix fonctionnelle, ou relancez `openclaw doctor --fix` une fois que les identifiants mis en cache sont disponibles.

`Legacy Matrix state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Signification : OpenClaw a trouvé un magasin partagé et plat Matrix, mais il refuse de deviner à quel compte nommé Matrix il doit l'attribuer.
- Action à effectuer : définissez `channels.matrix.defaultAccount` sur le compte concerné, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Matrix legacy sync store not migrated because the target already exists (...)`

- Signification : le nouveau emplacement délimité au compte possède déjà un magasin de synchronisation ou de chiffrement, donc OpenClaw ne l'a pas écrasé automatiquement.
- Action à effectuer : vérifiez que le compte actuel est le bon avant de supprimer ou de déplacer manuellement la cible en conflit.

`Failed migrating Matrix legacy sync store (...)` ou `Failed migrating Matrix legacy crypto store (...)`

- Signification : OpenClaw a essayé de déplacer l'ancien état Matrix mais l'opération du système de fichiers a échoué.
- Action à effectuer : vérifiez les autorisations du système de fichiers et l'état du disque, puis relancez `openclaw doctor --fix`.

`Legacy Matrix encrypted state detected at ... but channels.matrix is not configured yet.`

- Signification : OpenClaw a trouvé un ancien magasin chiffré Matrix, mais il n'y a aucune configuration Matrix actuelle à laquelle l'attacher.
- Action à effectuer : configurez `channels.matrix`, puis relancez `openclaw doctor --fix` ou redémarrez la passerelle.

`Legacy Matrix encrypted state detected at ... but the account-scoped target could not be resolved yet (need homeserver, userId, and access token for channels.matrix...).`

- Signification : le magasin chiffré existe, mais OpenClaw ne peut pas décider en toute sécurité à quel compte/périphérique actuel il appartient.
- Action à effectuer : démarrez la passerelle une fois avec une connexion Matrix fonctionnelle, ou relancez `openclaw doctor --fix` une fois que les identifiants mis en cache sont disponibles.

`Legacy Matrix encrypted state detected at ... but multiple Matrix accounts are configured and channels.matrix.defaultAccount is not set.`

- Signification : OpenClaw a trouvé un magasin de chiffrement hérité plat partagé, mais il refuse de deviner à quel compte Matrix nommé il doit l'attribuer.
- Que faire : définissez `channels.matrix.defaultAccount` sur le compte prévu, puis réexécutez `openclaw doctor --fix` ou redémarrez la passerelle.

`Matrix migration warnings are present, but no on-disk Matrix mutation is actionable yet. No pre-migration snapshot was needed.`

- Signification : OpenClaw a détecté un ancien état Matrix, mais la migration est toujours bloquée par des données d'identité ou d'authentification manquantes.
- Que faire : terminez la connexion ou la configuration de Matrix, puis réexécutez `openclaw doctor --fix` ou redémarrez la passerelle.

`Legacy Matrix encrypted state was detected, but the Matrix plugin helper is unavailable. Install or repair @openclaw/matrix so OpenClaw can inspect the old rust crypto store before upgrading.`

- Signification : OpenClaw a trouvé un ancien état chiffré Matrix, mais il n'a pas pu charger le point d'entrée du helper depuis le plugin Matrix qui inspecte normalement ce magasin.
- Que faire : réinstallez ou réparez le plugin Matrix (`openclaw plugins install @openclaw/matrix`, ou `openclaw plugins install ./extensions/matrix` pour une extraction du dépôt), puis réexécutez `openclaw doctor --fix` ou redémarrez la passerelle.

`Matrix plugin helper path is unsafe: ... Reinstall @openclaw/matrix and try again.`

- Signification : OpenClaw a trouvé un chemin de fichier d'aide qui s'échappe de la racine du plugin ou échoue aux vérifications des limites du plugin, il a donc refusé de l'importer.
- Que faire : réinstallez le plugin Matrix à partir d'un chemin de confiance, puis réexécutez `openclaw doctor --fix` ou redémarrez la passerelle.

`- Failed creating a Matrix migration snapshot before repair: ...`

`- Skipping Matrix migration changes for now. Resolve the snapshot failure, then rerun "openclaw doctor --fix".`

- Signification : OpenClaw a refusé de modifier l'état Matrix car il n'a pas pu créer d'abord la capture de récupération.
- Que faire : résolvez l'erreur de sauvegarde, puis réexécutez `openclaw doctor --fix` ou redémarrez la passerelle.

`Failed migrating legacy Matrix client storage: ...`

- Signification : le repli côté client Matrix a trouvé un ancien stockage plat, mais le déplacement a échoué. OpenClaw abandonne désormais ce repli au lieu de démarrer silencieusement avec un nouveau magasin.
- Que faire : inspectez les autorisations ou les conflits du système de fichiers, gardez l'ancien état intact, et réessayez après avoir corrigé l'erreur.

`Matrix is installed from a custom path: ...`

- Signification : Matrix est épinglé à une installation par chemin, les mises à jour principales ne le remplacent donc pas automatiquement par le package Matrix standard du dépôt.
- Que faire : réinstallez avec `openclaw plugins install @openclaw/matrix` lorsque vous souhaitez revenir au plugin Matrix par défaut.

### Messages de récupération de l'état chiffré

`matrix: restored X/Y room key(s) from legacy encrypted-state backup`

- Signification : les clés de salle sauvegardées ont été restaurées avec succès dans le nouveau magasin de chiffrement.
- Quoi faire : habituellement rien.

`matrix: N legacy local-only room key(s) were never backed up and could not be restored automatically`

- Signification : certaines anciennes clés de salle n'existaient que dans l'ancien stockage local et n'avaient jamais été téléchargées vers la sauvegarde Matrix.
- Quoi faire : attendez-vous à ce que certains anciens historiques chiffrés restent indisponibles, sauf si vous pouvez récupérer ces clés manuellement à partir d'un autre client vérifié.

`Legacy Matrix encrypted state for account "..." has backed-up room keys, but no local backup decryption key was found. Ask the operator to run "openclaw matrix verify backup restore --recovery-key <key>" after upgrade if they have the recovery key.`

- Signification : une sauvegarde existe, mais OpenClaw n'a pas pu récupérer la clé de récupération automatiquement.
- Quoi faire : exécutez `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"`.

`Failed inspecting legacy Matrix encrypted state for account "..." (...): ...`

- Signification : OpenClaw a trouvé l'ancien stockage chiffré, mais n'a pas pu l'inspecter avec suffisamment de sécurité pour préparer la récupération.
- Quoi faire : relancez `openclaw doctor --fix`. Si cela se répète, gardez l'ancien répertoire d'état intact et récupérez en utilisant un autre client Matrix vérifié plus `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"`.

`Legacy Matrix backup key was found for account "...", but .../recovery-key.json already contains a different recovery key. Leaving the existing file unchanged.`

- Signification : OpenClaw a détecté un conflit de clé de sauvegarde et a refusé d'écraser automatiquement le fichier de clé de récupération actuel.
- Quoi faire : vérifiez quelle clé de récupération est correcte avant de réessayer toute commande de restauration.

`Legacy Matrix encrypted state for account "..." cannot be fully converted automatically because the old rust crypto store does not expose all local room keys for export.`

- Signification : c'est la limite stricte de l'ancien format de stockage.
- Quoi faire : les clés sauvegardées peuvent toujours être restaurées, mais l'historique chiffré uniquement local peut rester indisponible.

`matrix: failed restoring room keys from legacy encrypted-state backup: ...`

- Signification : le nouveau plugin a tenté une restauration mais Matrix a renvoyé une erreur.
- Quoi faire : exécutez `openclaw matrix verify backup status`, puis réessayez avec `openclaw matrix verify backup restore --recovery-key "<your-recovery-key>"` si nécessaire.

### Messages de récupération manuelle

`Backup key is not loaded on this device. Run 'openclaw matrix verify backup restore' to load it and restore old room keys.`

- Signification : OpenClaw sait que vous devriez avoir une clé de sauvegarde, mais elle n'est pas active sur cet appareil.
- Quoi faire : exécutez `openclaw matrix verify backup restore`, ou passez `--recovery-key` si nécessaire.

`Store a recovery key with 'openclaw matrix verify device <key>', then run 'openclaw matrix verify backup restore'.`

- Signification : cet appareil n'a pas actuellement la clé de récupération stockée.
- Quoi faire : vérifiez d'abord l'appareil avec votre clé de récupération, puis restaurez la sauvegarde.

`Backup key mismatch on this device. Re-run 'openclaw matrix verify device <key>' with the matching recovery key.`

- Signification : la clé stockée ne correspond pas à la sauvegarde Matrix active.
- Quoi faire : relancez `openclaw matrix verify device "<your-recovery-key>"` avec la bonne clé.

Si vous acceptez de perdre l'ancien historique chiffré irrécupérable, vous pouvez à la place réinitialiser la ligne de base de la sauvegarde actuelle avec `openclaw matrix verify backup reset --yes`.

`Backup trust chain is not verified on this device. Re-run 'openclaw matrix verify device <key>'.`

- Signification : la sauvegarde existe, mais cet appareil ne fait pas encore suffisamment confiance à la chaîne de signatures croisées.
- Que faire : relancez `openclaw matrix verify device "<your-recovery-key>"`.

`Matrix recovery key is required`

- Signification : vous avez essayé une étape de récupération sans fournir de clé de récupération alors qu'une était requise.
- Que faire : relancez la commande avec votre clé de récupération.

`Invalid Matrix recovery key: ...`

- Signification : la clé fournie n'a pas pu être analysée ou ne correspondait pas au format attendu.
- Que faire : réessayez avec la clé de récupération exacte provenant de votre client Matrix ou du fichier de clé de récupération.

`Matrix device is still unverified after applying recovery key. Verify your recovery key and ensure cross-signing is available.`

- Signification : la clé a été appliquée, mais l'appareil n'a toujours pas pu terminer la vérification.
- Que faire : confirmez que vous avez utilisé la bonne clé et que les signatures croisées sont disponibles sur le compte, puis réessayez.

`Matrix key backup is not active on this device after loading from secret storage.`

- Signification : le stockage des secrets n'a pas produit une session de sauvegarde active sur cet appareil.
- Que faire : vérifiez d'abord l'appareil, puis revérifiez avec `openclaw matrix verify backup status`.

`Matrix crypto backend cannot load backup keys from secret storage. Verify this device with 'openclaw matrix verify device <key>' first.`

- Signification : cet appareil ne peut pas restaurer à partir du stockage des secrets tant que la vérification de l'appareil n'est pas terminée.
- Que faire : exécutez d'abord `openclaw matrix verify device "<your-recovery-key>"`.

### Messages d'installation de plugin personnalisé

`Matrix is installed from a custom path that no longer exists: ...`

- Signification : votre enregistrement d'installation de plugin pointe vers un chemin local qui a disparu.
- Que faire : réinstallez avec `openclaw plugins install @openclaw/matrix`, ou si vous lancez depuis un checkout de dépôt, `openclaw plugins install ./extensions/matrix`.

## Si l'historique chiffré ne revient toujours pas

Exécutez ces vérifications dans l'ordre :

```bash
openclaw matrix verify status --verbose
openclaw matrix verify backup status --verbose
openclaw matrix verify backup restore --recovery-key "<your-recovery-key>" --verbose
```

Si la sauvegarde est restaurée avec succès mais que certains anciens salons manquent encore d'historique, ces clés manquantes n'ont probablement jamais été sauvegardées par le plugin précédent.

## Si vous souhaitez repartir à zéro pour les futurs messages

Si vous acceptez de perdre l'historique chiffré ancien irrécupérable et que vous souhaitez uniquement une ligne de base de sauvegarde propre à l'avenir, exécutez ces commandes dans l'ordre :

```bash
openclaw matrix verify backup reset --yes
openclaw matrix verify backup status --verbose
openclaw matrix verify status
```

Si l'appareil est toujours non vérifié après cela, terminez la vérification depuis votre client Matrix en comparant les émojis SAS ou les codes décimaux et en confirmant qu'ils correspondent.

## Pages connexes

- [Matrix](/en/channels/matrix)
- [Doctor](/en/gateway/doctor)
- [Migrating](/en/install/migrating)
- [Plugins](/en/tools/plugin)
