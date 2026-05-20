---
summary: "Étapes de validation complète de la release, workflows enfants, profils de release, handles de réexécution et preuves"
title: "Validation complète de la release"
read_when:
  - Running or rerunning Full Release Validation
  - Comparing stable and full release validation profiles
  - Debugging release validation stage failures
---

`Full Release Validation` est le parapluie de la release. C'est le point d'entrée manuel unique pour la pré-validation, mais la plupart du travail a lieu dans les workflows enfants afin qu'une case échouée puisse être réexécutée sans redémarrer toute la release.

Exécutez-le à partir d'une référence de workflow de confiance, normalement `main`, et passez la branche de release, le tag, ou le SHA de commit complet en tant que `ref` :

```bash
gh workflow run full-release-validation.yml \
  --ref main \
  -f ref=release/YYYY.M.D \
  -f provider=openai \
  -f mode=both \
  -f release_profile=stable
```

Les workflows enfants utilisent la référence de workflow de confiance pour le harnais et l'entrée `ref` pour le candidat à tester. Cela permet de garder la nouvelle logique de validation disponible lors de la validation d'une branche de release ou d'un tag plus ancien.

Par défaut, `release_profile=stable`Docker exécute les volets bloquant la release et ignore le test de charge approfondi en live/Docker. Passez `run_release_soak=true` pour inclure les volets de test de charge sur une exécution stable. `release_profile=full` active toujours les volets de test de charge afin que le profil consultatif large ne réduise jamais silencieusement la couverture.

Package Acceptance construit normalement le tarball candidat à partir du `ref` résolu, y compris les exécutions avec SHA complet envoyées via `pnpm ci:full-release`. Après une publication bêta, passez `release_package_spec=openclaw@YYYY.M.D-beta.N` pour réutiliser le package npm publié à travers les vérifications de release, Package Acceptance, cross-OS, Docker release-path, et le package Telegram. Utilisez `package_acceptance_package_spec` uniquement lorsque Package Acceptance doit intentionnellement prouver un package différent.

## Étapes de premier niveau

| Étape                    | Détails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Résolution de la cible   | **Tâche :** `Resolve target ref`<br />**Workflow enfant :** aucun<br />**Prouve :** résout la branche de release, le tag ou le SHA complet du commit et enregistre les entrées sélectionnées.<br />**Réexécution :** réexécutez l'umbrella si cela échoue.                                                                                                                                                                                                                                                                                                                                          |
| Vitest et CI normale     | **Tâche :** `Run normal full CI`<br />**Workflow enfant :** `CI`Linux<br />**Prouve :** le graphe CI complet manuel par rapport à la référence cible, y compris les voies Linux Node, les fragments de plugin groupés, les fragments de contrat de plugin et de channel, la compatibilité Node 22, `check-*`, `check-additional-*`WindowsmacOSAndroid, les tests de fumée des artefacts construits, les vérifications de documentation, les compétences Python, Windows, macOS, l'i18n de l'interface utilisateur de contrôle et Android via le parapluie.<br />**Réexécution :** `rerun_group=ci`. |
| Prépublication de plugin | **Tâche :** `Run plugin prerelease validation`<br />**Workflow enfant :** `Plugin Prerelease`<br />**Prouve :** vérifications statiques de plugin release-only, couverture de plugin agentic, shards de lot d'extension complète, voies Docker de prérelease de plugin, et un artefact `plugin-inspector-advisory` non bloquant pour le triage de compatibilité.<br />**Réexécution :** `rerun_group=plugin-prerelease`.                                                                                                                                                                            |
| Vérifications de release | **Tâche :** `Run release/live/Docker/QA validation`<br />**Workflow enfant :** `OpenClaw Release Checks`MatrixTelegram<br />**Prouve :** tests de fumée d'installation, vérifications de paquets multi-OS, Acceptation de paquet, parité QA Lab, Matrix en direct et Telegram en direct. Avec `run_release_soak=true` ou `release_profile=full`Docker, exécute également des suites exhaustives live/E2E et les chunks de chemin de release Docker.<br />**Réexécution :** `rerun_group=release-checks` ou un gestionnaire release-checks plus ciblé.                                               |
| Artefact de paquet       | **Tâche :** `Prepare release package artifact`<br />**Workflow enfant :** aucun<br />**Prouve :** crée le tarball parent `release-package-under-test` suffisamment tôt pour les vérifications orientées package qui n'ont pas besoin d'attendre `OpenClaw Release Checks`.<br />**Réexécution :** réexécutez l'umbrella ou fournissez `release_package_spec` pour les réexécutions de package publié.                                                                                                                                                                                               |
| Paquet Telegram          | **Tâche :** `Run package Telegram E2E`<br />**Workflow enfant :** `NPM Telegram Beta E2E`Telegram<br />**Prouve :** preuve de paquet Telegram soutenue par l'artefact parent pour `rerun_group=all` avec `release_profile=full`Telegram, ou preuve de paquet Telegram publié lorsque `release_package_spec` ou `npm_telegram_package_spec` est défini.<br />**Réexécution :** `rerun_group=npm-telegram` avec `release_package_spec` ou `npm_telegram_package_spec`.                                                                                                                                |
| Vérificateur parapluie   | **Tâche :** `Verify full validation`<br />**Workflow enfant :** aucun<br />**Prouve :** vérifie à nouveau les conclusions d'exécution enfant enregistrées et ajoute les tableaux des tâches les plus lentes des workflows enfants.<br />**Réexécution :** réexécuter uniquement cette tâche après avoir réexécuté un enfant échoué pour le faire passer au vert.                                                                                                                                                                                                                                    |

Pour `ref=main` et `rerun_group=all`, un parapluie plus récent remplace un ancien.
Lorsque le parent est annulé, son moniteur annule tout workflow enfant qu'il a déjà
distribué. Les exécutions de validation de la branche et de la balise de version ne s'annulent pas mutuellement par
défaut.

## Étapes des vérifications de version

`OpenClaw Release Checks` est le plus grand workflow enfant. Il résolve la cible
une seule fois et prépare un artefact `release-package-under-test`Docker partagé lorsque les étapes de paquet
ou orientées Docker en ont besoin.

| Étape                        | Détails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cible de version             | **Tâche :** `Resolve target ref`<br />**Workflow de soutien :** aucun<br />**Tests :** référence sélectionnée, SHA attendu facultatif, profil, groupe de réexécution et filtre de suite active ciblée.<br />**Réexécution :** `rerun_group=release-checks`.                                                                                                                                                                                                                                                                                                                                                      |
| Artefact de paquet           | **Tâche :** `Prepare release package artifact`<br />**Workflow de soutien :** aucun<br />**Tests :** empaquette ou résout un fichier tar candidat et téléverse `release-package-under-test` pour les vérifications en aval orientées paquet.<br />**Réexécution :** le groupe de paquets concerné, multi-OS ou actif/E2E.                                                                                                                                                                                                                                                                                        |
| Test de fumée d'installation | **Tâche :** `Run install smoke`<br />**Workflow de support :** `Install Smoke`DockerDocker<br />**Tests :** chemin d'installation complet avec réutilisation de l'image smoke du Dockerfile racine, installation du package QR, smokes Docker racine et passerelle, tests Docker de l'installateur, smoke du fournisseur d'image d'installation globale Bun, et install/désinstallation rapide de plugin groupé E2E.<br />**Réexécution :** `rerun_group=install-smoke`.                                                                                                                                         |
| Multi-OS                     | **Tâche :** `cross_os_release_checks`<br />**Workflow de support :** `OpenClaw Cross-OS Release Checks (Reusable)`<br />**Tests :** volets frais et de mise à niveau sur Linux, Windows et macOS pour le fournisseur et le mode sélectionnés, en utilisant le tarball candidat plus un package de base.<br />**Réexécution :** `rerun_group=cross-os`.                                                                                                                                                                                                                                                           |
| E2E de dépôt et en direct    | **Tâche :** `Run repo/live E2E validation`<br />**Workflow de support :** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests :** E2E de référentiel, cache en direct, streaming websocket OpenAI, fragments natifs de fournisseur et plugin en direct, et harnais live modèle/backend/passerelle pris en charge par Docker sélectionnés par `release_profile`.<br />**Exécutions :** `run_release_soak=true`, `release_profile=full`, ou `rerun_group=live-e2e` ciblé.<br />**Réexécution :** `rerun_group=live-e2e`, en option avec `live_suite_filter`.                                                    |
| Chemin de publication Docker | **Tâche :** `Run Docker release-path validation`<br />**Workflow de support :** `OpenClaw Live And E2E Checks (Reusable)`<br />**Tests :** morceaux Docker du chemin de publication par rapport à l'artefact de package partagé.<br />**Exécutions :** `run_release_soak=true`, `release_profile=full`, ou `rerun_group=live-e2e` ciblé.<br />**Réexécution :** `rerun_group=live-e2e`.                                                                                                                                                                                                                          |
| Acceptation de paquet        | **Tâche :** `Run package acceptance`<br />**Workflow de support :** `Package Acceptance`<br />**Tests :** fixtures de package de plugin hors ligne, mise à jour de plugin, acceptation de package Telegram mock-OpenAI Telegram, et vérifications de survie de mise à niveau publiée par rapport au même tarball. Les vérifications de blocage de release utilisent la ligne de base publiée la plus récente par défaut ; les vérifications de trempage s'étendent à chaque publication stable npm à ou après `2026.4.23` plus les fixtures de problèmes signalés.<br />**Réexécution :** `rerun_group=package`. |
| Parité QA                    | **Tâche :** `Run QA Lab parity lane` et `Run QA Lab parity report`<br />**Workflow de support :** tâches directes<br />**Tests :** packs de parité agentic candidats et de base, puis le rapport de parité.<br />**Réexécution :** `rerun_group=qa-parity` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                  |
| QA Matrix en direct          | **Tâche :** `Run QA Lab live Matrix lane`<br />**Workflow de support :** tâche directe<br />**Tests :** profil rapide de QA Matrix en direct dans l'environnement `qa-live-shared`.<br />**Réexécution :** `rerun_group=qa-live` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                            |
| QA Telegram en direct        | **Tâche :** `Run QA Lab live Telegram lane`<br />**Workflow de support :** tâche directe<br />**Tests :** QA Telegram en direct avec des baux d'informations d'identification Convex CI.<br />**Réexécution :** `rerun_group=qa-live` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                       |
| Vérificateur de release      | **Tâche :** `Verify release checks`<br />**Workflow de support :** aucun<br />**Tests :** tâches de vérification de release requises pour le groupe de réexécution sélectionné.<br />**Réexécution :** réexécuter après la réussite des tâches enfants ciblées.                                                                                                                                                                                                                                                                                                                                                  |

## Segments du chemin de release Docker

L'étape de chemin de publication Docker exécute ces blocs lorsque `live_suite_filter` est vide :

| Segment                                                   | Couverture                                                                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| `core`                                                    | Lignes de contrôle de fumée (smoke lanes) du chemin de release Docker de base.                                                       |
| `package-update-openai`                                   | Comportement d'installation/mise à jour du package OpenAI, installation à la demande de Codex et appels d'outil de Chat Completions. |
| `package-update-anthropic`                                | Comportement d'installation et de mise à jour du package Anthropic.                                                                  |
| `package-update-core`                                     | Comportement de package et de mise à jour neutre par rapport au fournisseur.                                                         |
| `plugins-runtime-plugins`                                 | Lanes de runtime de plugin qui exercent le comportement du plugin.                                                                   |
| `plugins-runtime-services`                                | Lanes de runtime de plugin en direct et avec support de service ; inclut OpenWebUI si demandé.                                       |
| `plugins-runtime-install-a` à `plugins-runtime-install-h` | Lots d'installation/runtime de plugin divisés pour la validation de release parallèle.                                               |

Utilisez des `docker_lanes=<lane[,lane]>`Docker ciblées sur le workflow réutilisable live/E2E lorsqu'une seule voie Docker a échoué. Les artefacts de publication incluent des commandes de réexécution par voie avec des entrées de réutilisation d'artefacts de package et d'image lorsque disponible.

## Profils de release

`release_profile` contrôle principalement l'étendue live/provider dans les vérifications de publication. Il ne supprime pas le CI complet normal, la prépublication de plugins, les tests d'installation, l'acceptation des packages ou le Lab QA. Pour `stable`, les chunks de chemin de publication Docker exhaustifs repo/live E2E et Docker constituent une couverture de soak et s'exécutent lorsque `run_release_soak=true`. `full` force l'activation de la couverture de soak et fait également en sorte que l'umbrella exécute le E2E package Telegram sur l'artefact de package de publication parent lorsque `rerun_group=all`, afin qu'un candidat complet de pré-publication ne saute pas silencieusement cette voie de package Telegram.

| Profil    | Utilisation prévue                                     | Couverture live/fournisseur incluse                                                                                                                                                                                           |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | Test de fumée critique pour la release le plus rapide. | Chemin live OpenAI/core, modèles live Docker pour OpenAI, passerelle native core, profil de passerelle native OpenAI, plugin natif OpenAI, et passerelle live Docker OpenAI.                                                  |
| `stable`  | Profil d'approbation de release par défaut.            | `minimum` plus les tests de fumée Anthropic, Google, MiniMax, le backend, le harnais de test live natif, le backend Docker live CLI, la liaison ACP Docker, le harnais Codex Docker et un shard de test de fumée Go OpenCode. |
| `full`    | Broad advisory sweep.                                  | `stable` plus les fournisseurs consultatifs, les shards plugin live et les shards media live.                                                                                                                                 |

## Full-only additions

Ces suites sont ignorées par `stable` et incluses par `full` :

| Area                             | Full-only coverage                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Docker live models               | OpenCode Go, OpenRouter, xAI, Z.ai, and Fireworks.                                                                          |
| Docker live gateway              | Advisory providers split into DeepSeek/Fireworks, OpenCode Go/OpenRouter, and xAI/Z.ai shards.                              |
| Native gateway provider profiles | Full Anthropic Opus and Sonnet/Haiku shards, Fireworks, DeepSeek, full OpenCode Go model shards, OpenRouter, xAI, and Z.ai. |
| Native plugin live shards        | Plugins A-K, L-N, O-Z other, Moonshot, and xAI.                                                                             |
| Native media live shards         | Audio, Google music, MiniMax music, and video groups A-D.                                                                   |

`stable` inclut `native-live-src-gateway-profiles-anthropic-smoke` et `native-live-src-gateway-profiles-opencode-go-smoke` ; `full` utilise à la place les shards de modèle plus larges Anthropic et OpenCode Go. Les réexécutions ciblées peuvent toujours utiliser les handles d'agrégation `native-live-src-gateway-profiles-anthropic` ou `native-live-src-gateway-profiles-opencode-go`.

## Focused reruns

Utilisez `rerun_group` pour éviter de répéter des boîtes de publication non liées :

| Handle              | Scope                                                                                                         |
| ------------------- | ------------------------------------------------------------------------------------------------------------- |
| `all`               | All Full Release Validation stages.                                                                           |
| `ci`                | Manual full CI child only.                                                                                    |
| `plugin-prerelease` | Plugin Prerelease child only.                                                                                 |
| `release-checks`    | All OpenClaw Release Checks stages.                                                                           |
| `install-smoke`     | Install Smoke through release checks.                                                                         |
| `cross-os`          | Vérifications de version multi-OS.                                                                            |
| `live-e2e`          | Validation E2E Repo/live et du chemin de publication Docker.                                                  |
| `package`           | Acceptation du package.                                                                                       |
| `qa`                | Parité QA plus voies live QA.                                                                                 |
| `qa-parity`         | Voies de parité QA et rapport uniquement.                                                                     |
| `qa-live`           | Matrix live QA et Telegram uniquement.                                                                        |
| `npm-telegram`      | E2E de package publié sur Telegram ; nécessite Telegram`release_package_spec` ou `npm_telegram_package_spec`. |

Utilisez `live_suite_filter` avec `rerun_group=live-e2e` lorsqu'une suite en direct échoue.
Les identifiants de filtre valides sont définis dans le workflow live/E2E réutilisable, y compris
`docker-live-models`, `live-gateway-docker`,
`live-gateway-anthropic-docker`, `live-gateway-google-docker`,
`live-gateway-minimax-docker`, `live-gateway-advisory-docker`,
`live-cli-backend-docker`, `live-acp-bind-docker`, et
`live-codex-harness-docker`.

Le gestionnaire `live-gateway-advisory-docker`Docker est un gestionnaire de réexécution agrégé pour ses
trois shards de provider ; il se déploie donc toujours vers tous les jobs de passerelle Docker consultatifs.

Utilisez `cross_os_suite_filter` avec `rerun_group=cross-os` lorsqu'un canal cross-OS
a échoué. Le filtre accepte un identifiant d'OS, un identifiant de suite ou une paire OS/suite, par
exemple `windows/packaged-upgrade`, `windows`, ou `packaged-fresh`Windows. Les
résumés cross-OS incluent des durées par phase pour les canaux de mise à niveau packagés, et les
commandes de longue durée impriment des lignes de pulsation afin qu'une mise à jour Windows bloquée soit visible avant le
timeout du job.

Les voies de vérification de version QA sont consultables, à l'exception de la porte de couverture de l'outil d'exécution standard. La dérive dynamique de l'outil requise pour OpenClaw dans le niveau standard bloque le vérificateur de vérification de version ; les autres échecs propres à QA sont signalés en tant qu'avertissements. Réexécutez `rerun_group=qa`, `qa-parity` ou `qa-live` lorsque vous avez besoin de preuves QA fraîches.

## Preuves à conserver

Conservez le résumé `Full Release Validation` comme index au niveau de la version. Il lie
les identifiants d'exécution enfants et inclut les tableaux des jobs les plus lents. En cas d'échec, inspectez d'abord le workflow
enfant, puis réexécutez le plus petit gestionnaire correspondant ci-dessus.

Artefacts utiles :

- `release-package-under-test` du parent Full Release Validation et `OpenClaw Release Checks`
- Artefacts du chemin de publication Docker sous Docker`.artifacts/docker-tests/`
- Acceptation de package `package-under-test`Docker et artefacts d'acceptation Docker
- Artefacts de vérification de publication multi-OS pour chaque système d'exploitation et suite
- Artefacts de parité QA, Matrix et Telegram

## Fichiers de workflow

- `.github/workflows/full-release-validation.yml`
- `.github/workflows/openclaw-release-checks.yml`
- `.github/workflows/openclaw-live-and-e2e-checks-reusable.yml`
- `.github/workflows/plugin-prerelease.yml`
- `.github/workflows/install-smoke.yml`
- `.github/workflows/openclaw-cross-os-release-checks-reusable.yml`
- `.github/workflows/package-acceptance.yml`
