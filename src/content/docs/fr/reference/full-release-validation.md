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

L'acceptation de package construit normalement le tarball candidat à partir du `ref` résolu, y compris les exécutions avec SHA complet distribuées avec `pnpm ci:full-release`. Après une publication bêta, passez `release_package_spec=openclaw@YYYY.M.D-beta.N` pour réutiliser le package npm expédié à travers les vérifications de version, l'acceptation de package, cross-OS, Docker du chemin de version, et le package Telegram. Utilisez `package_acceptance_package_spec` uniquement lorsque l'acceptation de package doit intentionnellement prouver un package différent.
La ligne de package en direct du plugin Codex suit le même état : les valeurs `release_package_spec` publiées dérivent `codex_plugin_spec=npm:@openclaw/codex@<version>` ; les exécutions SHA/artifact pack `extensions/codex` à partir de la référence sélectionnée ; et les opérateurs peuvent définir `codex_plugin_spec` directement pour les sources de plugin `npm:`, `npm-pack:`, ou `git:`. La ligne accorde l'approbation d'installation explicite de la CLI Codex requise par ce plugin, puis exécute les vérifications préalables de la CLI Codex et les tours de l'agent OpenAI de même session.

## Étapes de premier niveau

| Étape                    | Détails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Résolution de la cible   | **Tâche :** `Resolve target ref`<br />**Workflow enfant :** aucun<br />**Prouve :** résout la branche de version, le tag ou le SHA complet du commit et enregistre les entrées sélectionnées.<br />**Réexécution :** réexécutez l'ombrelle si cela échoue.                                                                                                                                                                                                                                                                                                               |
| Vitest et CI normale     | **Tâche :** `Run normal full CI`<br />**Workflow enfant :** `CI`<br />**Prouve :** graphe CI complet manuel contre la référence cible, y compris les lignes Node Linux, les shards de plugins groupés, les shards de contrats de plugin et de channel, la compatibilité Node 22, `check-*`, `check-additional-*`, les tests de fumée des artefacts construits, les vérifications de documentation, les compétences Python, Windows, macOS, i18n de l'interface de contrôle, et Android via l'ombrelle.<br />**Réexécution :** `rerun_group=ci`.                          |
| Prépublication de plugin | **Tâche :** `Run plugin prerelease validation`<br />**Workflow enfant :** `Plugin Prerelease`Docker<br />**Prouve :** vérifications statiques des plugins de version uniquement, couverture des plugins agentic, lots complets d'extensions de fragments, voies Docker de pré-version de plugins, et un artefact `plugin-inspector-advisory` non bloquant pour le triage de compatibilité.<br />**Réexécution :** `rerun_group=plugin-prerelease`.                                                                                                                       |
| Vérifications de release | **Tâche :** `Run release/live/Docker/QA validation`<br />**Workflow enfant :** `OpenClaw Release Checks`MatrixTelegram<br />**Prouve :** test de fumée d'installation, vérifications de packages multi-OS, Acceptation de package, parité QA Lab, Matrix en direct, et Telegram en direct. Avec `run_release_soak=true` ou `release_profile=full`Docker, exécute également des suites complètes en direct/E2E et des blocs de chemins de version Docker.<br />**Réexécution :** `rerun_group=release-checks` ou un gestionnaire de vérifications de version plus étroit. |
| Artefact de paquet       | **Tâche :** `Prepare release package artifact`<br />**Workflow enfant :** aucun<br />**Prouve :** crée l'archive tar `release-package-under-test` parente suffisamment tôt pour les vérifications orientées package qui n'ont pas besoin d'attendre `OpenClaw Release Checks`.<br />**Réexécution :** réexécuter le parapluie ou fournir `release_package_spec` pour les réexécutions de package publié.                                                                                                                                                                 |
| Paquet Telegram          | **Tâche :** `Run package Telegram E2E`<br />**Workflow enfant :** `NPM Telegram Beta E2E`Telegram<br />**Prouve :** preuve de package Telegram soutenue par l'artefact parent pour `rerun_group=all` avec `release_profile=full`Telegram, ou preuve de package Telegram publié lorsque `release_package_spec` ou `npm_telegram_package_spec` est défini.<br />**Réexécution :** `rerun_group=npm-telegram` avec `release_package_spec` ou `npm_telegram_package_spec`.                                                                                                   |
| Vérificateur parapluie   | **Tâche :** `Verify full validation`<br />**Workflow enfant :** aucun<br />**Prouve :** revérifie les conclusions d'exécution enfant enregistrées et ajoute les tables des tâches les plus lentes des workflows enfants.<br />**Réexécution :** réexécuter uniquement cette tâche après avoir réexécuté un enfant échoué pour le passer en vert.                                                                                                                                                                                                                         |

Pour `ref=main` et `rerun_group=all`, un parapluie plus récent remplace un plus ancien.
Lorsque le parent est annulé, son moniteur annule tout workflow enfant qu'il a déjà
distribué. Les exécutions de validation de branche et d'étiquette de version ne s'annulent pas mutuellement par
défaut.

## Étapes des vérifications de version

`OpenClaw Release Checks` est le plus grand workflow enfant. Il résolve la cible
une seule fois et prépare un artifact `release-package-under-test`Docker partagé lorsque les étapes de
package ou orientées Docker en ont besoin.

| Étape                        | Détails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cible de version             | **Tâche :** `Resolve target ref`<br />**Workflow de support :** aucun<br />**Tests :** référence sélectionnée, SHA attendu optionnel, profil, groupe de réexécution et filtre de suite en direct ciblé.<br />**Réexécution :** `rerun_group=release-checks`.                                                                                                                                                                                                                                                                                                                                                                                      |
| Artefact de paquet           | **Tâche :** `Prepare release package artifact`<br />**Workflow de support :** aucun<br />**Tests :** pack ou résout un tarball candidat et télécharge `release-package-under-test` pour les vérifications en aval orientées package.<br />**Réexécution :** le package affecté, le groupe multi-OS ou live/E2E.                                                                                                                                                                                                                                                                                                                                   |
| Test de fumée d'installation | **Tâche :** `Run install smoke`<br />**Workflow de support :** `Install Smoke`DockerDockerBun<br />**Tests :** chemin d'installation complet avec réutilisation de l'image smoke du Dockerfile racine, installation du package QR, smokes Docker racine et passerelle, tests Docker de l'installateur, smoke du provider d'image d'installation globale de Bun, et installation/désinstallation rapide de plugin groupé E2E.<br />**Réexécution :** `rerun_group=install-smoke`.                                                                                                                                                                  |
| Multi-OS                     | **Tâche :** `cross_os_release_checks`<br />**Workflow de support :** `OpenClaw Cross-OS Release Checks (Reusable)`LinuxWindowsmacOS<br />**Tests :** volets frais et de mise à niveau sur Linux, Windows et macOS pour le provider et le mode sélectionnés, en utilisant le tarball candidat plus un package de référence.<br />**Réexécution :** `rerun_group=cross-os`.                                                                                                                                                                                                                                                                         |
| E2E de dépôt et en direct    | **Tâche :** `Run repo/live E2E validation`<br />**Workflow de support :** `OpenClaw Live And E2E Checks (Reusable)`OpenAIDocker<br />**Tests :** E2E du dépôt, cache en direct, streaming websocket OpenAI, partitions natives de fournisseur et de plugin en direct, et harnais de modèle/backend/passerelle en mode live pris en charge par Docker, sélectionnés par `release_profile`.<br />**Exécutions :** `run_release_soak=true`, `release_profile=full`, ou `rerun_group=live-e2e` ciblée.<br />**Réexécution :** `rerun_group=live-e2e`, en option avec `live_suite_filter`.                                                             |
| Chemin de publication Docker | **Tâche :** `Run Docker release-path validation`<br />**Workflow de support :** `OpenClaw Live And E2E Checks (Reusable)`Docker<br />**Tests :** chunks Docker du chemin de publication (release-path) par rapport à l'artefact de package partagé.<br />**Exécutions :** `run_release_soak=true`, `release_profile=full`, ou `rerun_group=live-e2e` ciblée.<br />**Réexécution :** `rerun_group=live-e2e`.                                                                                                                                                                                                                                       |
| Acceptation de paquet        | **Tâche :** `Run package acceptance`<br />**Workflow de support :** `Package Acceptance`OpenAITelegramnpm<br />**Tests :** fixtures de packages de plugin hors ligne, mise à jour de plugin, acceptation de package Telegram simulant OpenAI, et contrôles de survivance de mise à niveau publiée par rapport à la même archive tar. Les contrôles de blocage de publication utilisent la ligne de base publiée la plus récente par défaut ; les contrôles de trempage (soak checks) s'étendent à chaque publication npm stable à ou après `2026.4.23` ainsi qu'aux fixtures de problèmes signalés.<br />**Réexécution :** `rerun_group=package`. |
| Parité QA                    | **Tâche :** `Run QA Lab parity lane` et `Run QA Lab parity report`<br />**Workflow de support :** tâches directes<br />**Tests :** packs de parité agentic pour le candidat et la ligne de base, puis le rapport de parité.<br />**Réexécution :** `rerun_group=qa-parity` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                   |
| QA Matrix en direct          | **Tâche :** `Run QA Lab live Matrix lane`Matrix<br />**Workflow de support :** tâche directe<br />**Tests :** profil QA Matrix rapide en mode live dans l'environnement `qa-live-shared`.<br />**Réexécution :** `rerun_group=qa-live` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                                                       |
| QA Telegram en direct        | **Tâche :** `Run QA Lab live Telegram lane`Telegram<br />**Workflow de support :** tâche directe<br />**Tests :** QA Telegram en direct avec des baux d'identification Convex CI.<br />**Réexécution :** `rerun_group=qa-live` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                                                               |
| Vérificateur de release      | **Tâche :** `Verify release checks`<br />**Workflow de support :** aucun<br />**Tests :** tâches de vérification de release requises pour le groupe de réexécution sélectionné.<br />**Réexécution :** réexécuter après que les tâches enfants ciblées ont réussi.                                                                                                                                                                                                                                                                                                                                                                                |

## Segments du chemin de release Docker

L'étape du chemin de release Docker exécute ces blocs lorsque `live_suite_filter` est
vide :

| Segment                                                   | Couverture                                                                                                                                                                 |
| --------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `core`                                                    | Lignes de contrôle de fumée (smoke lanes) du chemin de release Docker de base.                                                                                             |
| `package-update-openai`                                   | Comportement d'installation/mise à jour du package OpenAI, installation à la demande de Codex, exécutions en direct du plugin Codex et appels d'outil de Chat Completions. |
| `package-update-anthropic`                                | Comportement d'installation et de mise à jour du package Anthropic.                                                                                                        |
| `package-update-core`                                     | Comportement de package et de mise à jour neutre par rapport au fournisseur.                                                                                               |
| `plugins-runtime-plugins`                                 | Lanes de runtime de plugin qui exercent le comportement du plugin.                                                                                                         |
| `plugins-runtime-services`                                | Lanes de runtime de plugin en direct et avec support de service ; inclut OpenWebUI si demandé.                                                                             |
| `plugins-runtime-install-a` à `plugins-runtime-install-h` | Lots d'installation/runtime de plugin divisés pour la validation de release parallèle.                                                                                     |

Utilisez des `docker_lanes=<lane[,lane]>` ciblées sur le workflow réutilisable live/E2E lorsque
seule une voie Docker a échoué. Les artefacts de release incluent des commandes de réexécution par voie
avec des entrées de réutilisation d'artefact de package et d'image lorsque disponibles.

## Profils de release

`release_profile` contrôle principalement l'étendue live/provider à l'intérieur des vérifications de release.
Il ne supprime pas le CI complet normal, la prépublication de plugins, le test de fumée d'installation, l'acceptation
de package ou le QA Lab. Pour `stable`, les blocs E2E repo/live exhaustifs et du chemin de release Docker
sont une couverture de soak et s'exécutent lorsque `run_release_soak=true`.
`full` force l'activation de la couverture de soak et fait également exécuter par l'ombrelle les E2E de package Telegram
contre l'artefact de package de release parent lorsque `rerun_group=all`, afin qu'un candidat complet
pré-publication ne saute pas silencieusement cette voie de package Telegram.

| Profil    | Utilisation prévue                                     | Couverture live/fournisseur incluse                                                                                                                                                 |
| --------- | ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `minimum` | Test de fumée critique pour la release le plus rapide. | Chemin live OpenAI/core, modèles live Docker pour OpenAI, passerelle native core, profil de passerelle native OpenAI, plugin natif OpenAI, et passerelle live Docker OpenAI.        |
| `stable`  | Profil d'approbation de release par défaut.            | `minimum` plus Anthropic smoke, Google, MiniMax, backend, native live test harness, Docker live CLI backend, Docker ACP bind, Docker Codex harness, and an OpenCode Go smoke shard. |
| `full`    | Broad advisory sweep.                                  | `stable` plus advisory providers, plugin live shards, and media live shards.                                                                                                        |

## Full-only additions

These suites are skipped by `stable` and included by `full`:

| Area                             | Full-only coverage                                                                                                          |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Docker live models               | OpenCode Go, OpenRouter, xAI, Z.ai, and Fireworks.                                                                          |
| Docker live gateway              | Advisory providers split into DeepSeek/Fireworks, OpenCode Go/OpenRouter, and xAI/Z.ai shards.                              |
| Native gateway provider profiles | Full Anthropic Opus and Sonnet/Haiku shards, Fireworks, DeepSeek, full OpenCode Go model shards, OpenRouter, xAI, and Z.ai. |
| Native plugin live shards        | Plugins A-K, L-N, O-Z other, Moonshot, and xAI.                                                                             |
| Native media live shards         | Audio, Google music, MiniMax music, and video groups A-D.                                                                   |

`stable` includes `native-live-src-gateway-profiles-anthropic-smoke` and
`native-live-src-gateway-profiles-opencode-go-smoke`; `full` uses the broader
Anthropic and OpenCode Go model shards instead. Focused reruns can still use the
aggregate `native-live-src-gateway-profiles-anthropic` or
`native-live-src-gateway-profiles-opencode-go` handles.

## Focused reruns

Use `rerun_group` to avoid repeating unrelated release boxes:

| Handle              | Scope                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------- |
| `all`               | All Full Release Validation stages.                                                             |
| `ci`                | Manual full CI child only.                                                                      |
| `plugin-prerelease` | Plugin Prerelease child only.                                                                   |
| `release-checks`    | All OpenClaw Release Checks stages.                                                             |
| `install-smoke`     | Install Smoke through release checks.                                                           |
| `cross-os`          | Vérifications de version multi-OS.                                                              |
| `live-e2e`          | Validation E2E Repo/live et du chemin de publication Docker.                                    |
| `package`           | Acceptation du package.                                                                         |
| `qa`                | Parité QA plus voies live QA.                                                                   |
| `qa-parity`         | Voies de parité QA et rapport uniquement.                                                       |
| `qa-live`           | Matrix live QA et Telegram uniquement.                                                          |
| `npm-telegram`      | Published-package Telegram E2E; requires `release_package_spec` or `npm_telegram_package_spec`. |

Use `live_suite_filter` with `rerun_group=live-e2e` when one live suite failed.
Valid filter ids are defined in the reusable live/E2E workflow, including
`docker-live-models`, `live-gateway-docker`,
`live-gateway-anthropic-docker`, `live-gateway-google-docker`,
`live-gateway-minimax-docker`, `live-gateway-advisory-docker`,
`live-cli-backend-docker`, `live-acp-bind-docker`, and
`live-codex-harness-docker`.

Le handle `live-gateway-advisory-docker`Docker est un handle de réexécution agrégé pour ses
trois provider shards, il se répartit donc toujours sur tous les travaux de passerelle Docker consultatifs.

Utilisez `cross_os_suite_filter` avec `rerun_group=cross-os` lorsqu'une voie cross-OS a
échoué. Le filtre accepte un ID d'OS, un ID de suite, ou une paire OS/suite, par
exemple `windows/packaged-upgrade`, `windows`, ou `packaged-fresh`Windows. Les résumés cross-OS
incluent des minutages par phase pour les voies de mise à niveau packagées, et les commandes
à longue exécution impriment des lignes de heartbeat pour qu'une mise à jour Windows bloquée soit visible avant le
délai d'expiration du travail.

Les voies de vérification de version QA sont consultatives, à l'exception de la passerelle de couverture de l'outil d'exécution standard.
Le drift dynamique de l'outil requis OpenClaw dans le niveau standard bloque le
vérificateur de vérification de version ; les autres échecs uniquement QA sont signalés comme des avertissements. Réexécutez
`rerun_group=qa`, `qa-parity`, ou `qa-live` lorsque vous avez besoin de nouvelles preuves QA.

## Preuves à conserver

Conservez le résumé `Full Release Validation` comme index au niveau de la version. Il lie
les ID d'exécution enfants et inclut les tableaux des travaux les plus lents. En cas d'échec, inspectez d'abord le
workflow enfant, puis réexécutez le plus petit handle correspondant ci-dessus.

Artefacts utiles :

- `release-package-under-test` du parent Full Release Validation et `OpenClaw Release Checks`
- Artifacts du chemin de publication Docker sous `.artifacts/docker-tests/`
- Package Acceptance `package-under-test` et artifacts d'acceptation Docker
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
