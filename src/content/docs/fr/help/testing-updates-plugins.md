---
summary: "Comment OpenClaw valide les chemins de mise à jour, les migrations de packages et le comportement d'installation/mise à jour des plugins"
read_when:
  - Changing OpenClaw update, doctor, package acceptance, or plugin install behavior
  - Preparing or approving a release candidate
  - Debugging package update, plugin dependency cleanup, or plugin install regressions
title: "Tests : mises à jour et plugins"
sidebarTitle: "Tests de mises à jour et de plugins"
---

Il s'agit de la liste de contrôle dédiée à la validation des mises à jour et des plugins. L'objectif est
simple : prouver que le package installable peut mettre à jour l'état réel de l'utilisateur, réparer l'état
obsolète de l'héritage via `doctor`, et toujours installer, charger, mettre à jour et désinstaller
les plugins depuis les sources prises en charge.

Pour la carte globale des lanceurs de tests, consultez [Testing](/fr/help/testing). Pour les clés de provider en direct et les suites touchant au réseau, consultez [Testing live](/fr/help/testing-live).

## Ce que nous protégeons

Les tests de mise à jour et de plugins protègent ces contrats :

- Une archive tar de package est complète, possède un `dist/postinstall-inventory.json` valide,
  et ne dépend pas de fichiers de dépôt non compressés.
- Un utilisateur peut passer d'un ancien package publié au package candidat
  sans perdre sa configuration, ses agents, ses sessions, ses espaces de travail, ses listes d'autorisation de plugins
  ou sa configuration de channel.
- `openclaw doctor --fix --non-interactive` possède les chemins de nettoyage et de réparation
  de l'héritage. Le démarrage ne doit pas accumuler de migrations de compatibilité cachées pour l'état
  obsolète des plugins.
- Les installations de plugins fonctionnent à partir des répertoires locaux, des dépôts git, des packages npm et du
  chemin de registre ClawHub.
- Les dépendances npm des plugins sont installées à la racine npm gérée, analysées avant
  la confiance, et supprimées via npm lors de la désinstallation afin que les dépendances hissées ne
  restent pas en suspend.
- La mise à jour des plugins est stable lorsque rien n'a changé : les enregistrements d'installation, la source
  résolue, la disposition des dépendances installées et l'état activé restent intacts.

## Preuve locale pendant le développement

Commencez de manière ciblée :

```bash
pnpm changed:lanes --json
pnpm check:changed
pnpm test:changed
```

Pour les modifications d'installation, de désinstallation, de dépendance ou d'inventaire de packages, exécutez
également les tests ciblés qui couvrent la jonction modifiée :

```bash
pnpm test src/plugins/uninstall.test.ts src/infra/package-dist-inventory.test.ts test/scripts/package-acceptance-workflow.test.ts
```

Avant que chaque voie Docker de package ne consomme une archive tar, prouvez l'artefact du package :

```bash
pnpm release:check
```

`release:check` exécute les contrôles de dérive config/docs/API, écrit l'inventaire de la distribution du package, exécute `npm pack --dry-run`, rejette les fichiers empaquetés interdits, installe l'archive tar dans un préfixe temporaire, exécute postinstall et teste les points d'entrée de canal groupés.

## Voies Docker

Les voies Docker constituent la preuve au niveau du produit. Elles installent ou mettent à jour un véritable package à l'intérieur de conteneurs Linux et vérifient le comportement via les commandes CLI, le démarrage du Gateway, les sondes HTTP, le statut RPC et l'état du système de fichiers.

Utilisez des voies ciblées lors de l'itération :

```bash
pnpm test:docker:plugins
pnpm test:docker:plugin-lifecycle-matrix
pnpm test:docker:plugin-update
pnpm test:docker:upgrade-survivor
pnpm test:docker:published-upgrade-survivor
pnpm test:docker:update-restart-auth
pnpm test:docker:update-migration
```

Voies importantes :

- `test:docker:plugins` valide la smoke test de l'installation de plugins, les installations de dossiers locaux, le comportement de saut de mise à jour de dossier local, les dossiers locaux avec des dépendances préinstallées, les installations de paquets `file:`CLInpmnpmnpmClawHub, les installations git avec exécution CLI, les mises à jour de références mouvantes git, les installations de registre npm avec des dépendances transitives hissées, les no-ops de mise à jour npm, le rejet de métadonnées de paquet npm malformées, les installations de fixtures ClawHub locaux et les no-ops de mise à jour, le comportement de mise à jour de la place de marché, et l'activation/inspection de Claude-bundle. Définissez `OPENCLAW_PLUGINS_E2E_CLAWHUB=0`ClawHub pour garder le bloc ClawHub hermétique/hors ligne.
- `test:docker:plugin-lifecycle-matrix` installe le package candidat dans un conteneur brut, exécute un plugin npm via install, inspect, disable, enable, explicit upgrade, explicit downgrade et uninstall après avoir supprimé le code du plugin. Il enregistre les métriques RSS et CPU pour chaque phase.
- `test:docker:plugin-update` valide qu'un plugin installé inchangé ne se réinstalle pas et ne perd pas ses métadonnées d'installation pendant `openclaw plugins update`.
- `test:docker:upgrade-survivor` installe le fichier tar candidat sur un appareil utilisateur ancien non nettoyé, exécute la mise à jour du package ainsi qu'un doctor non interactif, puis démarre une boucle de retour Gateway et vérifie la préservation de l'état.
- `test:docker:published-upgrade-survivor` installe d'abord une ligne de base publiée,
  la configure via une recette `openclaw config set` intégrée, la met à jour vers le
  tarball candidat, exécute le docteur, vérifie le nettoyage de l'ancienne version, démarre le Gateway, et
  sonde `/healthz`, `/readyz`, et le statut RPC.
- `test:docker:update-restart-auth` installe le paquet candidat, démarre un
  Gateway géré avec auth par jeton, désactive l'env d'auth passerelle de l'appelant pour
  `openclaw update --yes --json`, et exige que la commande de mise à jour candidate
  redémarre le Gateway avant les sondages normaux.
- `test:docker:update-migration` est la voie de mise à jour publiée axée sur le nettoyage. Elle
  part d'un état utilisateur de style Discord/Telegram configuré, exécute le docteur de ligne de base
  pour que les dépendances de plugin configurées aient une chance de se matérialiser, sème
  des débris de dépendances de plugin obsolètes pour un plugin empaqueté configuré, met à jour vers
  le tarball candidat, et exige que le docteur de post-mise à jour supprime les racines
  des dépendances obsolètes.

Variantes survivantes utiles de mise à niveau publiée :

```bash
OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@2026.4.23 \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=versioned-runtime-deps \
pnpm test:docker:published-upgrade-survivor

OPENCLAW_UPGRADE_SURVIVOR_BASELINE_SPEC=openclaw@latest \
OPENCLAW_UPGRADE_SURVIVOR_SCENARIO=bootstrap-persona \
pnpm test:docker:published-upgrade-survivor
```

Les scénarios disponibles sont `base`, `feishu-channel`, `bootstrap-persona`,
`plugin-deps-cleanup`, `configured-plugin-installs`,
`stale-source-plugin-shadow`, `tilde-log-path`, et `versioned-runtime-deps`. Dans les exécutions agrégées,
`OPENCLAW_UPGRADE_SURVIVOR_SCENARIOS=reported-issues` s'étend à tous les scénarios
de forme d'issue signalés, y compris la migration d'installation du plugin configuré.

La migration complète de mise à jour est intentionnellement séparée de l'IC de version complète. Utilisez le
workflow manuel `Update Migration` lorsque la question de version est « chaque
version stable publiée à partir du 23.04.2026 peut-elle passer à ce candidat et
nettoyer les débris de dépendances de plugin ? » :

```bash
gh workflow run update-migration.yml \
  --ref main \
  -f workflow_ref=main \
  -f package_ref=main \
  -f baselines=all-since-2026.4.23 \
  -f scenarios=plugin-deps-cleanup
```

## Acceptation du paquet

Package Acceptance est la porte d'entrée native GitHub pour les packages. Elle résout un package candidat en une archive tar `package-under-test`, enregistre la version et le SHA-256, puis exécute des pistes E2E réutilisables Docker sur cette archive exacte. La référence du harnais de workflow est distincte de la référence source du package, ce qui permet à la logique de test actuelle de valider des versions de confiance plus anciennes.

Sources candidates :

- `source=npm` : valide `openclaw@beta`, `openclaw@latest`, ou une version publiée exacte.
- `source=ref` : emballe une branche de confiance, une étiquette ou un commit avec le harnais actuel sélectionné.
- `source=url` : validez une archive tar HTTPS publique avec `package_sha256` requis.
  Ce chemin rejette les identifiants d'URL, les ports HTTPS non par défaut, les noms d'hôte
  privés/internes ou les résultats DNS/IP, l'espace IP à usage spécial et les redirections non sécurisées.
- `source=trusted-url` : validez une archive tar HTTPS avec
  `package_sha256` et `trusted_source_id` requis par rapport à la stratégie détenue par le mainteneur
  dans `.github/package-trusted-sources.json`. Utilisez ceci pour les miroirs d'entreprise/privés
  au lieu d'affaiblir `source=url` avec un commutateur allow-private au niveau de l'entrée.
  L'authentification Bearer, lorsqu'elle est configurée par la stratégie, utilise le secret fixe
  `OPENCLAW_TRUSTED_PACKAGE_TOKEN`.
- `source=artifact` : réutilisez une archive tar téléchargée par une autre exécution Actions.

La validation complète de version utilise `source=artifact` par défaut, construite à partir du
SHA de version résolu. Pour une vérification après publication, passez
`package_acceptance_package_spec=openclaw@YYYY.M.D` afin que la même matrice de mise à niveau
cible le paquet npm livré à la place.

Les vérifications de version appellent l'acceptation des paquets avec l'ensemble paquet/mise à jour/redémarrage/plugin :

```text
doctor-switch update-channel-switch update-corrupt-plugin upgrade-survivor published-upgrade-survivor update-restart-auth plugins-offline plugin-update
```

Lorsque le trempage de version est activé, ils passent également :

```text
published_upgrade_survivor_baselines=last-stable-4 2026.4.23 2026.5.2 2026.4.15
published_upgrade_survivor_scenarios=reported-issues
telegram_mode=mock-openai
```

Cela permet de garder la migration des paquets, le changement de canal de mise à jour, la tolérance aux plug-ins gérés corrompus,
le nettoyage des dépendances de plug-ins obsolètes, la couverture des plugeurs hors ligne, le comportement
de mise à jour des plug-ins et les QA du paquet Telegram sur le même artefact résolu sans
obliger la barrière de paquet de version par défaut à parcourir chaque version publiée.

`last-stable-4` correspond aux quatre dernières versions stables d'npm publiées sur OpenClaw. L'acceptation du package de release fige `2026.4.23` comme première limite de compatibilité de mise à jour des plugins, `2026.5.2` comme limite de changement d'architecture des plugins, et `2026.4.15` comme une base de mise à jour publiée plus ancienne (2026.4.1x) ; le résolveur déduplique les épingles qui figurent déjà dans les quatre dernières. Pour une couverture exhaustive de la migration des mises à jour publiées, utilisez `all-since-2026.4.23` dans le workflow de mise à jour distinct au lieu du CI de publication complète. `release-history` reste disponible pour un échantillonnage manuel plus large lorsque vous souhaitez également l'ancre héritée de pré-date.

Lorsque plusieurs bases de référence survivantes de mise à niveau publiées sont sélectionnées, le workflow réutilisable Docker fractionne chaque base en son propre job de runner ciblé. Chaque fraction de base exécute toujours le scénario sélectionné, mais les journaux et les artefacts restent spécifiques à la base, et le temps d'exécution est limité par le fraction le plus lent au lieu d'un grand job série unique.

Exécutez manuellement un profil de package lors de la validation d'un candidat avant la publication :

```bash
gh workflow run package-acceptance.yml \
  --ref main \
  -f workflow_ref=main \
  -f source=npm \
  -f package_spec=openclaw@beta \
  -f suite_profile=package \
  -f published_upgrade_survivor_baselines="last-stable-4 2026.4.23 2026.5.2 2026.4.15" \
  -f published_upgrade_survivor_scenarios=reported-issues \
  -f telegram_mode=mock-openai
```

Utilisez `suite_profile=product` lorsque la question de publication concerne les canaux MCP, le nettoyage cron/subagent, la recherche web OpenAI ou OpenWebUI. Utilisez `suite_profile=full` uniquement lorsque vous avez besoin d'une couverture complète du chemin de publication Docker.

## Par défaut de publication

Pour les candidats à la publication, la pile de preuve par défaut est :

1. `pnpm check:changed` et `pnpm test:changed` pour les régressions au niveau du code source.
2. `pnpm release:check` pour l'intégrité des artefacts du package.
3. Profil d'acceptation de package `package` ou les voies de package personnalisées release-check pour les contrats d'installation/mise à jour/redémarrage/plugin.
4. Vérifications de publication multi-OS pour l'installateur spécifique à l'OS, l'intégration et le comportement de la plateforme.
5. Suites en direct uniquement lorsque la surface modifiée touche au comportement du fournisseur ou du service hébergé.

Sur les machines des mainteneurs, les portes larges et les produits Docker/package doivent s'exécuter dans Testbox, sauf si une preuve locale est explicitement effectuée.

## Compatibilité héritée

La tolérance de compatibilité est étroite et limitée dans le temps :

- Les packages via `2026.4.25`, y compris `2026.4.25-beta.*`, peuvent tolérer des lacunes dans les métadonnées de package déjà expédiées lors de l'acceptation des packages.
- Le package `2026.4.26` publié peut avertir pour les fichiers d'horodatage des métadonnées de build local déjà expédiés.
- Les packages ultérieurs doivent respecter les contrats modernes. Les mêmes lacunes échouent au lieu d'avertir ou d'être ignorées.

N'ajoutez pas de nouvelles migrations de démarrage pour ces anciennes formes. Ajoutez ou étendez une réparation du doctor, puis prouvez-la avec `upgrade-survivor`, `published-upgrade-survivor` ou `update-restart-auth` lorsque la commande de mise à jour gère le redémarrage.

## Ajout de couverture

Lorsque vous modifiez le comportement de la mise à jour ou du plugin, ajoutez une couverture au niveau le plus bas qui peut échouer pour la bonne raison :

- Logique pure de chemin ou de métadonnées : test unitaire à côté de la source.
- Comportement de l'inventaire des packages ou des fichiers empaquetés : test `package-dist-inventory` ou vérificateur d'archive tar.
- Comportement d'installation/mise à jour CLI : assertion ou fixture de voie Docker.
- Comportement de migration de version publiée : scénario `published-upgrade-survivor`.
- Comportement de redémarrage géré par la mise à jour : `update-restart-auth`.
- Comportement de la source de registre/package : fixture `test:docker:plugins` ou serveur de fixture ClawHub.
- Comportement de la disposition ou du nettoyage des dépendances : assertez à la fois l'exécution du runtime et la limite du système de fichiers. Les dépendances npm peuvent être hissées sous la racine npm gérée, donc les tests doivent prouver que la racine est analysée/nettoyée au lieu d'assumer un arbre `node_modules` local au package.

Gardez les nouvelles fixtures Docker hermétiques par défaut. Utilisez des registres de fixtures locaux et de faux packages sauf si le point du test est le comportement du registre en direct.

## Tri des échecs

Commencez par l'identité de l'artefact :

- Résumé `resolve_package` de l'acceptation des packages : source, version, SHA-256 et nom de l'artefact.
- Artefacts Docker : `.artifacts/docker-tests/**/summary.json`, `failures.json`, journaux de voie et commandes de réexécution.
- Résumé du survivant de mise à niveau : `.artifacts/upgrade-survivor/summary.json`,
  y compris la version de référence, la version candidate, le scénario,
  les timings des phases et les étapes de la recette.

Privilégiez le réexécution de la voie exacte ayant échoué avec le même
artefact de paquet plutôt que de réexécuter l'ensemble du parapluie de
publication.
