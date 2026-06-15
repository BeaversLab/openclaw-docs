---
summary: "CLIRéférence de la CLI pour `openclaw doctor` (contrôles de santé + réparations guidées)"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "Doctor"
---

# `openclaw doctor`

Vérifications de santé + correctifs rapides pour la passerelle et les canaux.

Connexes :

- Dépannage : [Dépannage](/fr/gateway/troubleshooting)
- Audit de sécurité : [Sécurité](/fr/gateway/security)

## Pourquoi l'utiliser

`openclaw doctor`OpenClaw est la surface de santé d'OpenClaw. Utilisez-la lorsque la passerelle,
les canaux, les plugins, les compétences, le routage de modèle, l'état local ou les migrations de configuration
ne se comportent pas comme prévu et que vous souhaitez une seule commande capable d'expliquer ce qui
ne va pas.

Doctor propose trois postures :

| Posture | Commande                 | Comportement                                                                                                        |
| ------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| Inspect | `openclaw doctor`        | Contrôles orientés humain et invites guidées.                                                                       |
| Repair  | `openclaw doctor --fix`  | Applique les réparations prises en charge, en utilisant des invites sauf si la réparation non interactive est sûre. |
| Lint    | `openclaw doctor --lint` | Résultats structurés en lecture seule pour l'intégration continue, les pré-vols et les portes de révision.          |

Privilégiez `--lint` lorsque l'automatisation a besoin d'un résultat stable. Privilégiez `--fix` lorsqu'un
opérateur humain souhaite intentionnellement que doctor modifie la configuration ou l'état.

## Exemples

```bash
openclaw doctor
openclaw doctor --lint
openclaw doctor --lint --json
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --allow-exec
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
openclaw doctor --post-upgrade
openclaw doctor --post-upgrade --json
```

Pour les autorisations spécifiques à un canal, utilisez les sondes de canal au lieu de `doctor` :

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

La sonde ciblée des capacités Discord signale les autorisations effectives de canal du bot ; la sonde d'état audit les canaux Discord configurés et les cibles d'auto-join vocal.

## Options

- `--no-workspace-suggestions` : désactiver les suggestions de mémoire/recherche de l'espace de travail
- `--yes` : accepter les valeurs par défaut sans invite
- `--repair` : appliquer les réparations non-service recommandées sans invite ; les installations et réécritures de service de passerelle nécessitent toujours une confirmation interactive ou des commandes explicites de passerelle
- `--fix` : alias pour `--repair`
- `--force` : appliquer des réparations agressives, y compris en écrasant la configuration de service personnalisée si nécessaire
- `--non-interactive` : exécuter sans invites ; uniquement les migrations sûres et les réparations non-service
- `--generate-gateway-token` : générer et configurer un jeton de passerelle
- `--allow-exec` : autoriser le docteur à exécuter les exec SecretRefs configurés lors de la vérification des secrets
- `--deep` : rechercher des services système pour des installations supplémentaires de Gateway et signaler les transferts de redémarrage récents du superviseur Gateway
- `--lint` : exécuter des contrôles de santé modernisés en mode lecture seule et émettre des résultats de diagnostic
- `--post-upgrade` : exécuter des sondes de compatibilité des plugins après mise à niveau ; émet les résultats vers stdout ; quitte avec le code 1 si des résultats de niveau erreur sont présents
- `--json` : avec `--lint`, émet des résultats JSON au lieu d'une sortie humaine ; avec `--post-upgrade`, émet une enveloppe JSON lisible par machine (`{ probesRun, findings }`)
- `--severity-min <level>` : avec `--lint`, ignore les résultats inférieurs à `info`, `warning` ou `error`
- `--skip <id>` : avec `--lint`, ignore un ID de vérification ; répéter pour en ignorer plusieurs
- `--only <id>` : avec `--lint`, exécutez uniquement un ID de vérification ; répétez pour exécuter un petit ensemble sélectionné

## Mode Lint

`openclaw doctor --lint` est la posture d'automatisation en lecture seule pour les vérifications du docteur.
Il utilise le chemin de vérification de santé structuré, ne demande pas d'entrée, et ne répare
ni ne réécrit la configuration/l'état. Utilisez-le dans l'CI, les scripts préalables et les workflows de révision
lorsque vous voulez des résultats lisibles par machine au lieu de invites de réparation guidée.
Les options de sortie Lint telles que `--json`, `--severity-min`, `--only`, et `--skip`
ne sont acceptées qu'avec `--lint`.

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --allow-exec
openclaw doctor --lint --only core/doctor/gateway-config --json
```

La sortie humaine est compacte :

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`.
```

La sortie JSON est l'interface de script pour les exécutions Lint :

```json
{
  "ok": false,
  "checksRun": 5,
  "checksSkipped": 0,
  "findings": [
    {
      "checkId": "core/doctor/gateway-config",
      "severity": "warning",
      "message": "gateway.mode is unset; gateway start will be blocked.",
      "path": "gateway.mode",
      "fixHint": "Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`."
    }
  ]
}
```

Comportement de sortie :

- `0` : aucun résultat au-dessus du seuil de gravité sélectionné
- `1` : au moins une constatation répond au seuil sélectionné
- `2` : échec de la commande/exécution avant que les constatations de lint ne puissent être produites

`--severity-min` contrôle à la fois les constatations visibles et le seuil de sortie. Par exemple, `openclaw doctor --lint --severity-min error` peut n'afficher aucune constatation et quitter avec `0` même lorsqu'il existe des constatations `info` ou `warning` de moindre gravité.

## Vérifications de santé structurées

Les vérifications doctor modernes utilisent un petit contrat structuré :

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` alimente `doctor --lint`. `repair()` est facultatif et n'est pris en compte
que par `doctor --fix` / `doctor --repair`. Les vérifications qui n'ont pas migré vers cette
forme continuent d'utiliser le flux de contribution doctor hérité.

La séparation est intentionnelle : `detect()` gère le diagnostic, tandis que `repair()` gère
le rapport de ce qu'il a modifié ou modifierait. Les contextes de réparation peuvent transporter
des requêtes `dryRun`/`diff`, et les résultats de réparation peuvent renvoyer des `diffs` structurés pour
les modifications de configuration/fichier ainsi que des `effects` pour les services, processus, packages, états ou autres
effets secondaires. Cela permet aux vérifications converties d'évoluer vers `doctor --fix --dry-run`
et le rapport de différences sans déplacer la planification des mutations dans `detect()`.

`repair()` indique s'il a tenté la réparation demandée avec `status:
"repaired" | "skipped" | "failed"`. Omitted status means `repaired`, de sorte que les
vérifications de réparation simples n'ont besoin de renvoyer que les modifications. Lorsque la réparation renvoie `skipped` ou
`failed`, doctor signale la raison et n'exécute pas la validation pour cette vérification.

Après une réparation structurée réussie, doctor réexécute `detect()` avec les
résultats de réparation comme portée. Les vérifications peuvent utiliser les résultats sélectionnés, les chemins ou les valeurs `ocPath`
pour une validation ciblée. Si le résultat est toujours présent, doctor signale un
avertissement de réparation au lieu de traiter le changement comme silencieusement terminé.

Un résultat inclut :

| Champ             | Objectif                                                                   |
| ----------------- | -------------------------------------------------------------------------- |
| `checkId`         | Identifiant stable pour les filtres skip/only et les listes autorisées CI. |
| `severity`        | `info`, `warning`, ou `error`.                                             |
| `message`         | Énoncé du problème lisible par l'homme.                                    |
| `path`            | Chemin de configuration, de fichier ou logique lorsque disponible.         |
| `line` / `column` | Emplacement source lorsque disponible.                                     |
| `ocPath`          | Adresse `oc://` précise lorsqu'une vérification peut en indiquer une.      |
| `fixHint`         | Action suggérée pour l'opérateur ou résumé de la réparation.               |

Cette version enregistre les vérifications centrales modernisées du docteur sur le chemin d'accès à la santé structuré. Le sous-chemin `openclaw/plugin-sdk/health` expose le même contrat pour les consommateurs de suivi intégrés, mais les vérifications basées sur des plugins ne s'exécutent qu'après l'enregistrement de leur package propriétaire dans le chemin de commande actif.

## Sélection des vérifications

Utilisez `--only` et `--skip` lorsqu'un workflow souhaite une porte ciblée :

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` et `--skip` acceptent les ID complets de vérification et peuvent être répétés. Si un ID `--only` n'est pas enregistré, aucune vérification ne s'exécute pour cet ID ; utilisez les champs `checksRun` et `checksSkipped` de la commande pour vérifier qu'une porte ciblée sélectionne les vérifications que vous attendez.

## Mode post-mise à jour

`openclaw doctor --post-upgrade` exécute des sondes de compatibilité de plugins destinées à être chaînées après une compilation ou une mise à niveau. Les résultats sont émis vers stdout ; la commande se termine avec le code 1 si un résultat a `level: "error"`. Ajoutez `--json` pour recevoir une enveloppe lisible par machine (`{ probesRun, findings }`) adaptée à l'CI, à la compétence `fork-upgrade` de la communauté et à d'autres outils de test de fumée post-mise à niveau. Si l'index des plugins installés est manquant ou malformé, le mode JSON émet toujours cette enveloppe avec un résultat d'erreur `plugin.index_unavailable`.

Remarques :

- En mode Nix (Nix) (`OPENCLAW_NIX_MODE=1`), les vérifications en lecture seule du docteur fonctionnent toujours, mais `doctor --fix`, `doctor --repair`, `doctor --yes` et `doctor --generate-gateway-token` sont désactivés car `openclaw.json` est immuable. Modifiez plutôt la source Nix pour cette installation ; pour nix-openclaw, utilisez le [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) avec priorité à l'agent.
- Les invites interactives (comme les correctifs de trousseau de clés/OAuth) ne s'exécutent que lorsque stdin est un TTY et que `--non-interactive` n'est **pas** défini. Les exécutions sans tête (cron, Telegram, sans terminal) ignoreront les invites.
- Performance : les exécutions `doctor` non interactives ignorent le chargement impatient des plugins afin que les contrôles de santé sans tête restent rapides. Les sessions interactives du docteur chargent toujours les surfaces de plug-in nécessaires au flux de santé et de réparation hérité.
- `--lint` est plus strict que `--non-interactive` : il est toujours en lecture seule, ne demande jamais et n'applique jamais de migrations sûres. Exécutez `doctor --fix` ou `doctor --repair` lorsque vous souhaitez que le docteur apporte des modifications.
- Par défaut, le docteur n'exécute pas les SecretRefs `exec` lors de la vérification des secrets. Utilisez `openclaw doctor --allow-exec` ou `openclaw doctor --lint --allow-exec` uniquement lorsque vous souhaitez intentionnellement que le docteur exécute ces résolveurs de secrets configurés.
- `--fix` (alias pour `--repair`) écrit une sauvegarde dans `~/.openclaw/openclaw.json.bak` et supprime les clés de configuration inconnues, en listant chaque suppression.
- Les contrôles de santé modernisés peuvent exposer un chemin `repair()` pour `doctor --fix` ; les contrôles qui n'en exposent pas continuent via le flux de réparation du docteur existant.
- `doctor --fix --non-interactive` signale les définitions de service de passerelle manquantes ou obsolètes, mais ne les installe pas ou ne les réécrit pas en dehors du mode de réparation de mise à jour. Exécutez `openclaw gateway install` pour un service manquant, ou `openclaw gateway install --force` lorsque vous souhaitez intentionnellement remplacer le lanceur.
- Les contrôles d'intégrité de l'état détectent désormais les fichiers de transcription orphelins dans le répertoire des sessions. Les archiver sous `.deleted.<timestamp>` nécessite une confirmation interactive ; `--fix`, `--yes` et les exécutions sans tête les laissent en place.
- Le docteur analyse également `~/.openclaw/cron/jobs.json` (ou `cron.store`) pour rechercher les formes de tâches cron héritées et les réécrire avant d'importer les lignes canoniques dans SQLite.
- Doctor signale les tâches cron avec des substitutions `payload.model` explicites, y compris les comptes d'espaces de noms de provider et les incohérences avec `agents.defaults.model`, afin que les tâches planifiées qui n'héritent pas du modèle par défaut soient visibles lors des enquêtes d'authentification ou de facturation.
- Sur Linux, doctor avertit lorsque la crontab de l'utilisateur exécute encore l'ancien `~/.openclaw/bin/ensure-whatsapp.sh` ; ce script n'est plus maintenu et peut journaliser de fausses pannes de la Gateway WhatsApp lorsque cron manque de l'environnement de bus utilisateur systemd.
- Lorsque WhatsApp est activé, doctor vérifie la présence d'une boucle d'événements dégradée de la Gateway avec des clients locaux `openclaw-tui` encore actifs. `doctor --fix` n'arrête que les clients TUI locaux vérifiés afin que les réponses WhatsApp ne soient pas mises en file d'attente derrière des boucles de rafraîchissement TUI obsolètes.
- Doctor réécrit les références de modèle `openai-codex/*` héritées en références canoniques `openai/*` pour les modèles principaux, les solutions de repli, les modèles de génération d'images/vidéos, les substitutions de heartbeat/subagent/compaction, les hooks, les substitutions de modèle de channel, et les épinglages de route de session obsolètes. `--fix` migre également les profils d'authentification `openai-codex:*` hérités et les entrées `auth.order.openai-codex` vers `openai:*`, déplace l'intention Codex vers des entrées `agentRuntime.id: "codex"` scope provider/model, supprime les épinglages d'exécution whole-agent/session obsolètes, et conserve les références d'agent OpenAI réparées sur le routage d'authentification Codex au lieu de l'authentification par clé API OpenAI API directe.
- Doctor nettoie l'état de mise en attente des dépendances de plugins hérités créé par les anciennes versions d'OpenClaw et relie le package hôte OpenClaw`openclaw`npm pour les plugins npm gérés qui le déclarent comme dépendance pair. Il répare également les plugins téléchargeables manquants référencés par la configuration, tels que `plugins.entries`, les canaux configurés, les paramètres de fournisseur/recherche configurés, ou les runtimes d'agent configurés. Lors des mises à jour de package, doctor saute la réparation des plugins du gestionnaire de packages jusqu'à ce que l'échange de package soit terminé ; réexécutez `openclaw doctor --fix` par la suite si un plugin configuré a encore besoin d'une récupération. Si le téléchargement échoue, doctor signale l'erreur d'installation et conserve l'entrée du plugin configuré pour la prochaine tentative de réparation.
- Doctor répare la configuration obsolète des plugins en supprimant les identifiants de plugins manquants de `plugins.allow`/`plugins.deny`/`plugins.entries`, ainsi que la configuration de canal en suspens correspondante, les cibles de heartbeat et les remplacements de modèle de canal lorsque la découverte de plugins est saine.
- Doctor met en quarantaine la configuration non valide des plugins en désactivant l'entrée `plugins.entries.<id>` concernée et en supprimant sa charge utile `config`Gateway non valide. Le démarrage du Gateway ignore déjà uniquement ce plugin défectueux afin que les autres plugins et canaux puissent continuer à fonctionner.
- Définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsqu'un autre superviseur possède le cycle de vie de la passerelle. Doctor signale toujours l'état de santé de la passerelle/du service et applique les réparations non liées au service, mais ignore l'installation/le démarrage/le redémarrage/l'amorçage du service et le nettoyage des services hérités.
- Sur Linux, doctor ignore les unités systemd supplémentaires inactives de type passerelle et ne réécrit pas les métadonnées de commande/point d'entrée pour un service de passerelle systemd en cours d'exécution pendant la réparation. Arrêtez d'abord le service ou utilisez Linux`openclaw gateway install --force` lorsque vous souhaitez intentionnellement remplacer le lanceur actif.
- Doctor migre automatiquement l'ancienne configuration plate de Talk (`talk.voiceId`, `talk.modelId`, et leurs amis) vers `talk.provider` + `talk.providers.<provider>`.
- Les exécutions répétées de `doctor --fix` ne signalent plus ni n'appliquent la normalisation Talk lorsque la seule différence réside dans l'ordre des clés d'objet.
- Doctor inclut une vérification de disponibilité de la recherche mémoire et peut recommander `openclaw configure --section model` lorsque les informations d'identification d'intégration sont manquantes.
- Doctor avertit lorsqu'aucun propriétaire de commande n'est configuré. Le propriétaire de commande est le compte d'opérateur humain autorisé à exécuter des commandes réservées au propriétaire et à approuver des actions dangereuses. L'appariement DM permet uniquement à quelqu'un de parler au bot ; si vous avez approuvé un expéditeur avant l'existence de l'amorçage par le premier propriétaire, définissez `commands.ownerAllowFrom` explicitement.
- Doctor signale une note d'information lorsque les agents en mode Codex sont configurés et que des ressources personnelles Codex CLI existent dans le répertoire personnel Codex de l'opérateur. Les lancements locaux du serveur d'application Codex utilisent des répertoires personnels isolés par agent, installez donc d'abord le plugin Codex si nécessaire, puis utilisez `openclaw migrate plan codex` pour inventorier les ressources qui doivent être promues délibérément.
- Doctor supprime les `plugins.entries.codex.config.codexDynamicToolsProfile` obsolètes ; le serveur d'application Codex conserve toujours les outils d'espace de travail natifs Codex comme natifs.
- Doctor avertit lorsque les compétences autorisées pour l'agent par défaut ne sont pas disponibles dans l'environnement d'exécution actuel car des binaires, des variables d'environnement, des configurations ou des exigences OS sont manquants. `doctor --fix` peut désactiver ces compétences indisponibles avec `skills.entries.<skill>.enabled=false` ; installez/configurez plutôt la exigence manquante lorsque vous souhaitez garder la compétence active.
- Si le mode bac à sable est activé mais que Docker n'est pas disponible, doctor signale un avertissement à fort signal avec une solution de contournement (`install Docker` ou `openclaw config set agents.defaults.sandbox.mode off`).
- Si des fichiers de registre de bac à sable hérités (`~/.openclaw/sandbox/containers.json` ou `~/.openclaw/sandbox/browsers.json`) sont présents, doctor les signale ; `openclaw doctor --fix` migre les entrées valides vers des répertoires de registre partitionnés et met en quarantaine les fichiers hérités non valides.
- Si `gateway.auth.token`/`gateway.auth.password` sont gérés par SecretRef et indisponibles dans le chemin de commande actuel, doctor signale un avertissement en lecture seule et n'écrit pas d'informations d'identification de repli en texte brut. Pour les SecretRefs basés sur exec, doctor ignore l'exécution sauf si `--allow-exec` est présent.
- Si l'inspection du SecretRef du canal échoue dans un chemin de correction, doctor continue et signale un avertissement au lieu de quitter prématurément.
- Après les migrations du répertoire d'état, doctor avertit lorsque les comptes Telegram ou Discord par défaut activés dépendent du repli d'environnement et que TelegramDiscord`TELEGRAM_BOT_TOKEN` ou `DISCORD_BOT_TOKEN` n'est pas disponible pour le processus doctor.
- La résolution automatique du nom d'utilisateur Telegram`allowFrom` de Telegram (`doctor --fix`Telegram) nécessite un jeton Telegram résolvable dans le chemin de commande actuel. Si l'inspection du jeton n'est pas disponible, doctor signale un avertissement et ignore la résolution automatique pour cette passe.

## macOS : macOS`launchctl` remplacements de l'environnement

Si vous avez précédemment exécuté `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (ou `...PASSWORD`), cette valeur remplace votre fichier de configuration et peut provoquer des erreurs persistantes « non autorisées ».

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## Connexes

- [Référence CLI](CLI/en/cli)
- [Doctor Gateway](Gateway/en/gateway/doctor)
