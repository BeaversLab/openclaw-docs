---
summary: "Référence du responsable pour la ligne QA Matrix basée sur Docker : CLI, profils, variables d'environnement, scénarios et artefacts de sortie."
read_when:
  - Running pnpm openclaw qa matrix locally
  - Adding or selecting Matrix QA scenarios
  - Triaging Matrix QA failures, timeouts, or stuck cleanup
title: "QA Matrix"
---

La ligne QA Matrix exécute le plugin fourni `@openclaw/matrix` contre un serveur d'accueil Tuwunel éphémère dans Docker, avec des comptes de pilote, de SUT et d'observateur temporaires ainsi que des rooms amorcées. Il s'agit de la couverture de transport réel pour Matrix.

Cet outil est réservé aux mainteneurs. Les versions packagées d'OpenClaw omettent intentionnellement OpenClaw`qa-lab`, donc `openclaw qa` n'est disponible qu'à partir d'une checkout des sources. Les checkouts des sources chargent le runner intégré directement - aucune étape d'installation de plugin n'est nécessaire.

Pour un contexte plus large sur le framework QA, voir [Vue d'ensemble QA](/fr/concepts/qa-e2e-automation).

## Quick start

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

Un `pnpm openclaw qa matrix` simple exécute `--profile all` et ne s'arrête pas au premier échec. Utilisez `--profile fast --fail-fast` pour une barrière de version ; partitionnez le catalogue avec `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli` lors de l'exécution de l'inventaire complet en parallèle.

## Ce que fait la ligne

1. Provisionne un serveur d'accueil Tuwunel éphémère dans Docker (image par défaut `ghcr.io/matrix-construct/tuwunel:v1.5.1`, nom du serveur `matrix-qa.test`, port `28008`).
2. Enregistre trois utilisateurs temporaires - `driver` (envoie du trafic entrant), `sut`OpenClawMatrix (le compte Matrix OpenClaw sous test), `observer` (capture du trafic tiers).
3. Amorce les rooms requises par les scénarios sélectionnés (principal, discussion en fil, média, redémarrage, secondaire, liste d'autorisation, E2EE, vérification DM, etc.).
4. Démarre une passerelle OpenClaw enfant avec le plugin Matrix réel délimité au compte SUT ; `qa-channel` n'est pas chargé dans l'enfant.
5. Exécute les scénarios en séquence, en observant les événements via les clients Matrix pilote/observateur.
6. Démonte le serveur d'accueil, écrit les artefacts de rapport et de résumé, puis quitte.

## CLI

```text
pnpm openclaw qa matrix [options]
```

### Drapeaux communs

| Drapeau               | Par défaut                                    | Description                                                                                                                                                     |
| --------------------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--profile <profile>` | `all`                                         | Profil de scénario. Voir [Profils](#profiles).                                                                                                                  |
| `--fail-fast`         | off                                           | Arrêter après le premier contrôle ou scénario échoué.                                                                                                           |
| `--scenario <id>`     | -                                             | Exécuter uniquement ce scénario. Répétable. Voir [Scénarios](#scenarios).                                                                                       |
| `--output-dir <path>` | `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` | Emplacement d'écriture des rapports, du résumé, des événements observés et du journal de sortie. Les chemins relatifs sont résolus par rapport à `--repo-root`. |
| `--repo-root <path>`  | `process.cwd()`                               | Racine du dépôt lors de l'appel depuis un répertoire de travail neutre.                                                                                         |
| `--sut-account <id>`  | `sut`                                         | Identifiant de compte Matrix dans la configuration de la passerelle QA.                                                                                         |

### Options du fournisseur

La voie utilise un transport Matrix réel, mais le fournisseur de modèle est configurable :

| Option                   | Par défaut            | Description                                                                                                                                                             |
| ------------------------ | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--provider-mode <mode>` | `live-frontier`       | `mock-openai` pour une répartition factice déterministe ou `live-frontier` pour les fournisseurs de pointe en direct. L'alias hérité `live-openai` fonctionne toujours. |
| `--model <ref>`          | défaut du fournisseur | Réf. `provider/model` principale.                                                                                                                                       |
| `--alt-model <ref>`      | défaut du fournisseur | Réf. `provider/model` alternative lorsque les scénarios changent en cours d'exécution.                                                                                  |
| `--fast`                 | désactivé             | Activer le mode rapide du fournisseur lorsque pris en charge.                                                                                                           |

Le QA Matrix n'accepte pas `--credential-source` ni `--credential-role`. La voie provisionne des utilisateurs jetables localement ; il n'y a pas de pool d'informations d'identification partagé à louer.

## Profils

Le profil sélectionné détermine les scénarios exécutés.

| Profil             | À utiliser pour                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `all` (par défaut) | Catalogue complet. Lent mais exhaustif.                                                                                                                                                                                                                                                                                                                                                                               |
| `fast`             | Sous-ensemble de release-gate qui exerce le contrat de transport en direct : canary, filtrage de mentions (mention gating), blocage de liste blanche (allowlist block), forme de réponse (reply shape), redémarrage et reprise (restart resume), suivi de fil de discussion (thread follow-up), isolement de fil (thread isolation), observation de réaction, et livraison des métadonnées d'approbation d'exécution. |
| `transport`        | Scénarios de discussion (threading) au niveau du transport, DM, salle, autojointure, mention/liste blanche, approbation et réaction.                                                                                                                                                                                                                                                                                  |
| `media`            | Couverture des pièces jointes : image, audio, vidéo, PDF, EPUB.                                                                                                                                                                                                                                                                                                                                                       |
| `e2ee-smoke`       | Couverture E2EE minimale - réponse chiffrée de base, suivi de fil, succès de l'amorçage (bootstrap success).                                                                                                                                                                                                                                                                                                          |
| `e2ee-deep`        | Scénarios exhaustifs de perte d'état E2EE, de sauvegarde, de clé et de récupération.                                                                                                                                                                                                                                                                                                                                  |
| `e2ee-cli`         | Scénarios CLI `openclaw matrix encryption setup` et `verify *` pilotés via le harnais de QA.                                                                                                                                                                                                                                                                                                                          |

Le mappage exact se trouve dans `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts`.

## Scénarios

La liste complète des ID de scénario est l'union `MatrixQaScenarioId` dans `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts:15`. Les catégories incluent :

- discussion (threading) - `matrix-thread-*`, `matrix-subagent-thread-spawn`
- niveau supérieur / DM / salle - `matrix-top-level-reply-shape`, `matrix-room-*`, `matrix-dm-*`
- streaming et progression de l'outil (tool progress) - `matrix-room-partial-streaming-preview`, `matrix-room-quiet-streaming-preview`, `matrix-room-tool-progress-*`, `matrix-room-block-streaming`
- média - `matrix-media-type-coverage`, `matrix-room-image-understanding-attachment`, `matrix-attachment-only-ignored`, `matrix-unsupported-media-safe`
- routage - `matrix-room-autojoin-invite`, `matrix-secondary-room-*`
- réactions - `matrix-reaction-*`
- approbations - `matrix-approval-*` (métadonnées exec/plugin, repli fragmenté, réactions de refus, fils de discussion et routage `target: "both"`)
- redémarrage et rejeu (replay) - `matrix-restart-*`, `matrix-stale-sync-replay-dedupe`, `matrix-room-membership-loss`, `matrix-homeserver-restart-resume`, `matrix-initial-catchup-then-incremental`
- mention gating, bot-to-bot, et allowlists - `matrix-mention-*`, `matrix-allowbots-*`, `matrix-allowlist-*`, `matrix-multi-actor-ordering`, `matrix-inbound-edit-*`, `matrix-mxid-prefixed-command-block`, `matrix-observer-allowlist-override`
- E2EE - `matrix-e2ee-*` (réponse basique, suivi de fil, amorçage, cycle de vie de la clé de récupération, variantes de perte d'état, comportement de sauvegarde du serveur, hygiène des appareils, vérification SAS / QR / DM, redémarrage, rétractation d'artefact)
- E2EE CLI - `matrix-e2ee-cli-*` (configuration du chiffrement, configuration idempotente, échec de l'amorçage, cycle de vie de la clé de récupération, multi-compte, aller-retour de réponse passerelle, auto-vérification)

Passez `--scenario <id>` (répétable) pour exécuter un ensemble sélectionné à la main ; combinez avec `--profile all` pour ignorer le filtrage par profil.

## Variables d'environnement

| Variable                                | Par défaut                                | Effet                                                                                                                                                                                                                                             |
| --------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_QA_MATRIX_TIMEOUT_MS`         | `1800000` (30 min)                        | Limite supérieure stricte pour l'exécution entière.                                                                                                                                                                                               |
| `OPENCLAW_QA_MATRIX_CANARY_TIMEOUT_MS`  | `45000`                                   | Limite pour la réponse canary initiale. La CI de Release augmente ceci sur les runners partagés pour qu'un premier tour de passerelle lent ne faille pas avant le début de la couverture des scénarios.                                           |
| `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` | `8000`                                    | Fenêtre de silence pour les assertions négatives de non-réponse. Limité à `≤` le délai d'exécution.                                                                                                                                               |
| `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` | `90000`                                   | Limite pour le démontage de Docker. Les surfaces d'échec incluent la commande de récupération `docker compose ... down --remove-orphans`.                                                                                                         |
| `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE`      | `ghcr.io/matrix-construct/tuwunel:v1.5.1` | Remplace l'image du serveur domestique lors de la validation contre une version différente de Tuwunel.                                                                                                                                            |
| `OPENCLAW_QA_MATRIX_PROGRESS`           | activé                                    | `0` fait taire les lignes de progression `[matrix-qa] ...` sur stderr. `1` les force.                                                                                                                                                             |
| `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT`    | rétracté                                  | `1` conserve le corps du message et `formatted_body` dans `matrix-qa-observed-events.json`. Par défaut rétracté pour garder les artefacts CI sûrs.                                                                                                |
| `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT` | désactivé                                 | `1` ignore le déterministe `process.exit` après l'écriture de l'artefact. La valeur par défaut force la sortie car les handles de chiffrement natifs de matrix-js-sdk peuvent maintenir la boucle d'événements active après la fin de l'artefact. |
| `OPENCLAW_RUN_NODE_OUTPUT_LOG`          | non défini                                | Lorsqu'il est défini par un lanceur externe (par ex. `scripts/run-node.mjs`Matrix), Matrix QA réutilise ce chemin de journalisation au lieu de démarrer son propre tee.                                                                           |

## Artefacts de sortie

Écrit dans `--output-dir` :

- `matrix-qa-report.md` - Rapport de protocole Markdown (ce qui a réussi, échoué, a été ignoré et pourquoi).
- `matrix-qa-summary.json` - Résumé structuré adapté à l'analyse par l'IC et aux tableaux de bord.
- `matrix-qa-observed-events.json`Matrix - Événements Matrix observés depuis les clients pilote et observateur. Les corps sont expurgés sauf si `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` ; les métadonnées d'approbation sont résumées avec des champs sûrs sélectionnés et un aperçu de commande tronqué.
- `matrix-qa-output.log` - Stdout/stderr combiné de l'exécution. Si `OPENCLAW_RUN_NODE_OUTPUT_LOG` est défini, le journal du lanceur externe est réutilisé à la place.

Le répertoire de sortie par défaut est `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` pour que les exécutions successives ne s'écrasent pas mutuellement.

## Conseils de triage

- **L'exécution bloque vers la fin :** les handles de chiffrement natifs de `matrix-js-sdk` peuvent survivre au harnais. La valeur par défaut force un `process.exit` propre après l'écriture de l'artefact ; si vous avez désactivé `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`, attendez-vous à ce que le processus persiste.
- **Erreur de nettoyage :** recherchez la commande de récupération imprimée (une invocation `docker compose ... down --remove-orphans`) et exécutez-la manuellement pour libérer le port du serveur domestique.
- **Fenêtres d'assertion négatives instables dans l'IC :** réduisez `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` (8 s par défaut) lorsque l'IC est rapide ; augmentez-la sur les exécuteurs partagés lents.
- **Besoin de corps expurgés pour un rapport de bogue :** relancez avec `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` et joignez `matrix-qa-observed-events.json`. Traitez l'artefact résultant comme sensible.
- **Version Tuwunel différente :** pointez `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` vers la version en cours de test. La voie ne valide que l'image par défaut épinglée.

## Contrat de transport en direct

Matrix est l'une des trois voies de transport en direct (Matrix, Telegram, Discord) qui partagent une seule liste de contrôle de contrat définie dans [QA overview → Live transport coverage](/fr/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` reste la suite synthétique large et n'est intentionnellement pas partie de cette matrice.

## Connexe

- [QA overview](/fr/concepts/qa-e2e-automation) - pile QA globale et contrat de transport en direct
- [QA Channel](/fr/channels/qa-channel) - adaptateur de canal synthétique pour les scénarios basés sur le dépôt
- [Testing](/fr/help/testing) - exécution des tests et ajout de la couverture QA
- [Matrix](/fr/channels/matrix) - le plugin de canal testé
