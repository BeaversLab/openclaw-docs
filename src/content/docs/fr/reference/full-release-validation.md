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

L'acceptation de paquet construit normalement l'archive du candidat à partir du `ref` résolu, y compris les exécutions avec SHA complet distribuées avec `pnpm ci:full-release`. Après publication, passez `package_acceptance_package_spec=openclaw@YYYY.M.D` (ou `openclaw@beta`/`openclaw@latest`npm) pour exécuter la même matrice de paquet/mise à jour contre le paquet npm publié à la place.

## Étapes de premier niveau

| Étape                    | Détails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Résolution de la cible   | **Tâche :** `Resolve target ref`<br />**Workflow enfant :** aucun<br />**Prouve :** résout la branche de release, le tag, ou le SHA de commit complet et enregistre les entrées sélectionnées.<br />**Réexécution :** réexécuter le parapluie si cela échoue.                                                                                                                                                                                                                                                                                         |
| Vitest et CI normale     | **Tâche :** `Run normal full CI`<br />**Workflow enfant :** `CI`Linux<br />**Prouve :** graphe CI complet manuel par rapport à la référence cible, y compris les volets Node Linux, les shards de plugins regroupés, les contrats de channel, la compatibilité Node 22, `check`, `check-additional`WindowsmacOSAndroid, tests de fumée de build, vérifications de docs, compétences Python, Windows, macOS, i18n de l'interface de contrôle et Android via l'ombrelle.<br />**Réexécution :** `rerun_group=ci`.                                       |
| Prépublication de plugin | **Tâche :** `Run plugin prerelease validation`<br />**Workflow enfant :** `Plugin Prerelease`Docker<br />**Prouve :** vérifications statiques de plugin uniquement pour la release, couverture de plugin agentic, shards de batch d'extensions complets et volets Docker de prépublication de plugin.<br />**Réexécution :** `rerun_group=plugin-prerelease`.                                                                                                                                                                                         |
| Vérifications de release | **Tâche :** `Run release/live/Docker/QA validation`<br />**Workflow enfant :** `OpenClaw Release Checks`MatrixTelegram<br />**Prouve :** tests de fumée d'installation, vérifications de paquets multi-OS, Acceptation de paquet, parité QA Lab, Matrix en direct et Telegram en direct. Avec `run_release_soak=true` ou `release_profile=full`Docker, exécute également des suites exhaustives live/E2E et les chunks de chemin de release Docker.<br />**Réexécution :** `rerun_group=release-checks` ou un gestionnaire release-checks plus ciblé. |
| Artefact de paquet       | **Tâche :** `Prepare release package artifact`<br />**Workflow enfant :** aucun<br />**Prouve :** crée l'archive tar `release-package-under-test` parente suffisamment tôt pour les vérifications orientées paquet qui n'ont pas besoin d'attendre `OpenClaw Release Checks`.<br />**Réexécution :** réexécuter l'ombrelle ou fournir `npm_telegram_package_spec` pour `rerun_group=npm-telegram`.                                                                                                                                                    |
| Paquet Telegram          | **Tâche :** `Run package Telegram E2E`<br />**Workflow enfant :** `NPM Telegram Beta E2E`<br />**Prouve :** preuve de paquet Telegram basée sur l'artefact parent pour `rerun_group=all` avec `release_profile=full`, ou preuve Telegram de paquet publié lorsque `npm_telegram_package_spec` est défini.<br />**Réexécution :** `rerun_group=npm-telegram` avec `npm_telegram_package_spec`.                                                                                                                                                         |
| Vérificateur parapluie   | **Tâche :** `Verify full validation`<br />**Workflow enfant :** aucun<br />**Prouve :** vérifie à nouveau les conclusions d'exécution enfants enregistrées et ajoute les tableaux des tâches les plus lentes des workflows enfants.<br />**Réexécution :** réexécuter uniquement cette tâche après avoir réexécuté un enfant en échec pour repasser au vert.                                                                                                                                                                                          |

Pour `ref=main` et `rerun_group=all`, un parapluie plus récent remplace un plus ancien.
Lorsque le parent est annulé, son moniteur annule tout workflow enfant qu'il a déjà
dispatché. Les exécutions de validation de branche et de balise de version ne s'annulent pas mutuellement par
défaut.

## Étapes des vérifications de version

`OpenClaw Release Checks` est le plus grand workflow enfant. Il résolve la cible
une seule fois et prépare un artefact `release-package-under-test` partagé lorsque les étapes
de paquet ou orientées Docker en ont besoin.

| Étape                        | Détails                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cible de version             | **Tâche :** `Resolve target ref`<br />**Workflow de support :** aucun<br />**Tests :** ref sélectionné, SHA attendu facultatif, profil, groupe de réexécution et filtre de suite active ciblée.<br />**Réexécution :** `rerun_group=release-checks`.                                                                                                                                                                                                                                                                                                                                                            |
| Artefact de paquet           | **Tâche :** `Prepare release package artifact`<br />**Workflow de support :** aucun<br />**Tests :** empaquette ou résout un fichier tar candidat et télécharge `release-package-under-test` pour les vérifications en aval orientées paquet.<br />**Réexécution :** le paquet affecté, le groupe multi-OS ou le groupe live/E2E.                                                                                                                                                                                                                                                                               |
| Test de fumée d'installation | **Tâche :** `Run install smoke`<br />**Workflow de support :** `Install Smoke`DockerDockerBun<br />**Tests :** chemin d'installation complet avec réutilisation de l'image de test du Dockerfile racine, installation du paquet QR, tests Docker racine et passerelle, tests Docker de l'installateur, test du fournisseur d'image pour l'installation globale de Bun, et installation/désinstallation rapide de plugin groupé en E2E.<br />**Réexécution :** `rerun_group=install-smoke`.                                                                                                                      |
| Multi-OS                     | **Tâche :** `cross_os_release_checks`<br />**Workflow de support :** `OpenClaw Cross-OS Release Checks (Reusable)`LinuxWindowsmacOS<br />**Tests :** volets de frais et de mise à niveau sur Linux, Windows et macOS pour le fournisseur et le mode sélectionnés, en utilisant l'archive candidate plus un paquet de base.<br />**Réexécution :** `rerun_group=cross-os`.                                                                                                                                                                                                                                       |
| E2E de dépôt et en direct    | **Tâche :** `Run repo/live E2E validation`<br />**Workflow de support :** `OpenClaw Live And E2E Checks (Reusable)`OpenAIDocker<br />**Tests :** E2E de dépôt, cache en direct, streaming websocket OpenAI, partitions natives de fournisseur et de plugin en direct, et harnais modèle/backend/passerelle en direct pris en charge par Docker, sélectionnés par `release_profile`.<br />**Exécutions :** `run_release_soak=true`, `release_profile=full`, ou `rerun_group=live-e2e` ciblé.<br />**Réexécution :** `rerun_group=live-e2e`, en option avec `live_suite_filter`.                                  |
| Chemin de publication Docker | **Tâche :** `Run Docker release-path validation`<br />**Workflow de support :** `OpenClaw Live And E2E Checks (Reusable)`Docker<br />**Tests :** fragments Docker de chemin de publication par rapport à l'artefact de paquet partagé.<br />**Exécutions :** `run_release_soak=true`, `release_profile=full`, ou `rerun_group=live-e2e` ciblé.<br />**Réexécution :** `rerun_group=live-e2e`.                                                                                                                                                                                                                   |
| Acceptation de paquet        | **Tâche :** `Run package acceptance`<br />**Workflow de support :** `Package Acceptance`<br />**Tests :** fixtures de package de plugin hors ligne, mise à jour de plugin, acceptation de package Telegram mock-OpenAI Telegram, et vérifications de survie de mise à niveau publiée par rapport à la même archive. Les vérifications de blocage de release utilisent la base de référence publiée la plus récente par défaut ; les checks de trempage s'étendent à chaque release npm stable à ou après `2026.4.23` ainsi qu'aux fixtures de problèmes signalés.<br />**Réexécution :** `rerun_group=package`. |
| Parité QA                    | **Tâche :** `Run QA Lab parity lane` et `Run QA Lab parity report`<br />**Workflow de support :** tâches directes<br />**Tests :** packs de parité agentic candidat et base de référence, puis le rapport de parité.<br />**Réexécution :** `rerun_group=qa-parity` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                        |
| QA Matrix en direct          | **Tâche :** `Run QA Lab live Matrix lane`<br />**Workflow de support :** tâche directe<br />**Tests :** profil QA rapide Matrix en direct dans l'environnement `qa-live-shared`.<br />**Réexécution :** `rerun_group=qa-live` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                              |
| QA Telegram en direct        | **Tâche :** `Run QA Lab live Telegram lane`<br />**Workflow de support :** tâche directe<br />**Tests :** QA Telegram en direct avec des baux d'informations d'identification CI Convex.<br />**Réexécution :** `rerun_group=qa-live` ou `rerun_group=qa`.                                                                                                                                                                                                                                                                                                                                                      |
| Vérificateur de release      | **Tâche :** `Verify release checks`<br />**Workflow de support :** aucun<br />**Tests :** tâches de vérification de release requises pour le groupe de réexécution sélectionné.<br />**Réexécution :** réexécuter après la réussite des tâches enfants ciblées.                                                                                                                                                                                                                                                                                                                                                 |

## Segments du chemin de release Docker

L'étape du chemin de release Docker exécute ces segments lorsque `live_suite_filter` est vide :

| Segment                                                   | Couverture                                                                                                 |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `core`                                                    | Lignes de contrôle de fumée (smoke lanes) du chemin de release Docker de base.                             |
| `package-update-openai`                                   | Comportement d'installation/mise à jour du package OpenAI, y compris l'installation à la demande de Codex. |
| `package-update-anthropic`                                | Comportement d'installation et de mise à jour du package Anthropic.                                        |
| `package-update-core`                                     | Comportement de package et de mise à jour neutre par rapport au fournisseur.                               |
| `plugins-runtime-plugins`                                 | Lanes de runtime de plugin qui exercent le comportement du plugin.                                         |
| `plugins-runtime-services`                                | Lanes de runtime de plugin en direct et avec support de service ; inclut OpenWebUI si demandé.             |
| `plugins-runtime-install-a` à `plugins-runtime-install-h` | Lots d'installation/runtime de plugin divisés pour la validation de release parallèle.                     |

Utilisez `docker_lanes=<lane[,lane]>` ciblées sur le workflow réutilisable live/E2E lorsqu'une seule lane Docker a échoué. Les artefacts de release incluent des commandes de réexécution par lane avec des entrées de réutilisation d'artefacts de package et d'image lorsque disponibles.

## Profils de release

`release_profile` contrôle principalement l'étendue live/fournisseur dans les vérifications de release. Il ne supprime pas la CI complète normale, la prépublication de plugin, le test de fumée d'installation, l'acceptation de package ou le Lab QA. Pour `stable`, les E2E repo/live exhaustifs et les segments de chemin de release Docker sont une couverture de trempage et s'exécutent lorsque `run_release_soak=true`. `full`Telegram force l'activation de la couverture de trempage et fait également exécuter par l'ombrelle les E2E Telegram de package sur l'artefact de package de release parent lorsque `rerun_group=all`, afin qu'un candidat complet de pré-publication ne saute pas silencieusement cette lane de package Telegram.

| Profil    | Utilisation prévue                                     | Couverture live/fournisseur incluse                                                                                                                                                                                      |
| --------- | ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `minimum` | Test de fumée critique pour la release le plus rapide. | Chemin live OpenAI/core, modèles live Docker pour OpenAI, passerelle native core, profil de passerelle native OpenAI, plugin natif OpenAI, et passerelle live Docker OpenAI.                                             |
| `stable`  | Profil d'approbation de release par défaut.            | `minimum`AnthropicMiniMaxDockerCLIDockerDocker plus Anthropic smoke, Google, MiniMax, backend, native live test harness, Docker live CLI backend, Docker ACP bind, Docker Codex harness, and an OpenCode Go smoke shard. |
| `full`    | Broad advisory sweep.                                  | `stable` plus advisory providers, plugin live shards, and media live shards.                                                                                                                                             |

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
`native-live-src-gateway-profiles-opencode-go-smoke`; `full`Anthropic uses the broader
Anthropic and OpenCode Go model shards instead. Focused reruns can still use the
aggregate `native-live-src-gateway-profiles-anthropic` or
`native-live-src-gateway-profiles-opencode-go` handles.

## Focused reruns

Use `rerun_group` to avoid repeating unrelated release boxes:

| Handle              | Scope                                                                   |
| ------------------- | ----------------------------------------------------------------------- |
| `all`               | All Full Release Validation stages.                                     |
| `ci`                | Manual full CI child only.                                              |
| `plugin-prerelease` | Plugin Prerelease child only.                                           |
| `release-checks`    | All OpenClaw Release Checks stages.                                     |
| `install-smoke`     | Install Smoke through release checks.                                   |
| `cross-os`          | Vérifications de version multi-OS.                                      |
| `live-e2e`          | Validation E2E Repo/live et du chemin de publication Docker.            |
| `package`           | Acceptation du package.                                                 |
| `qa`                | Parité QA plus voies live QA.                                           |
| `qa-parity`         | Voies de parité QA et rapport uniquement.                               |
| `qa-live`           | Matrix live QA et Telegram uniquement.                                  |
| `npm-telegram`      | E2E Telegram de package publié ; nécessite `npm_telegram_package_spec`. |

Utilisez `live_suite_filter` avec `rerun_group=live-e2e` lorsqu'une suite live a échoué.
Les IDs de filtre valides sont définis dans le workflow réutilisable live/E2E, y compris
`docker-live-models`, `live-gateway-docker`,
`live-gateway-anthropic-docker`, `live-gateway-google-docker`,
`live-gateway-minimax-docker`, `live-gateway-advisory-docker`,
`live-cli-backend-docker`, `live-acp-bind-docker`, et
`live-codex-harness-docker`.

Le handle `live-gateway-advisory-docker` est un handle de réexécution agrégé pour ses
trois shards provider ; il se répartit donc toujours sur tous les travaux de passerelle Docker consultatifs.

Utilisez `cross_os_suite_filter` avec `rerun_group=cross-os` lorsqu'une voie multi-OS
a échoué. Le filtre accepte un ID d'OS, un ID de suite ou une paire OS/suite, par
exemple `windows/packaged-upgrade`, `windows`, ou `packaged-fresh`. Les résumés
multi-OS incluent les timings par phase pour les voies de mise à niveau packagées, et les
commandes longue durée impriment des lignes de pulsation de sorte qu'une mise à jour Windows bloquée soit visible avant le
dépassement de délai du travail.

Les voies de vérification de version QA sont consultatives. Un échec QA uniquement est signalé comme un avertissement
et ne bloque pas le vérificateur de vérification de version ; réexécutez `rerun_group=qa`,
`qa-parity`, ou `qa-live` lorsque vous avez besoin de preuves QA fraîches.

## Preuves à conserver

Conservez le résumé `Full Release Validation` en tant qu'index au niveau de la publication. Il lie les IDs d'exécution enfants et inclut les tableaux des tâches les plus lentes. En cas d'échec, inspectez d'abord le workflow enfant, puis relancez le plus petit handle correspondant ci-dessus.

Artefacts utiles :

- `release-package-under-test` du parent Full Release Validation et `OpenClaw Release Checks`
- Artefacts du chemin de publication Docker sous Docker`.artifacts/docker-tests/`
- Acceptation de paquet `package-under-test` et artefacts d'acceptation Docker
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
