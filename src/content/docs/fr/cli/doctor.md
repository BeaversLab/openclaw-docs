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
openclaw doctor --deep
openclaw doctor --fix
openclaw doctor --fix --non-interactive
openclaw doctor --generate-gateway-token
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
- `--deep` : rechercher des services système supplémentaires pour les installations de passerelle et signaler les transferts de redémarrage récents du superviseur Gateway
- `--lint` : exécuter des contrôles de santé modernisés en mode lecture seule et émettre des résultats de diagnostic
- `--json` : avec `--lint`, émettre des résultats JSON au lieu d'une sortie pour humains
- `--severity-min <level>` : avec `--lint`, ignorer les résultats inférieurs à `info`, `warning` ou `error`
- `--skip <id>` : avec `--lint`, ignorer un ID de contrôle ; répéter pour en ignorer plusieurs
- `--only <id>` : avec `--lint`, n'exécuter qu'un ID de contrôle ; répéter pour exécuter un petit ensemble sélectionné

## Mode Lint

`openclaw doctor --lint` est la posture d'automatisation en lecture seule pour les vérifications du doctor.
Elle utilise le chemin de vérification de santé structuré, ne demande rien, et ne répare
ni ne réécrit la configuration/l'état. Utilisez-la dans l'CI, les scripts de pré-vol et les workflows de révision
lorsque vous souhaitez des résultats lisibles par machine au lieu de invites de réparation guidées.
Les options de sortie de Lint telles que `--json`, `--severity-min`, `--only` et `--skip`
sont uniquement acceptées avec `--lint`.

```bash
openclaw doctor --lint
openclaw doctor --lint --severity-min warning
openclaw doctor --lint --json
openclaw doctor --lint --only core/doctor/gateway-config --json
```

La sortie humaine est compacte :

```text
doctor --lint: ran 6 check(s), 1 finding(s)
  [warning] core/doctor/gateway-config gateway.mode - gateway.mode is unset; gateway start will be blocked.
    fix: Run `openclaw configure` and set Gateway mode (local/remote), or `openclaw config set gateway.mode local`.
```

La sortie JSON est la surface de scriptage pour les exécutions de lint :

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

- `0` : aucun résultat au-dessus ou au seuil de gravité sélectionné
- `1` : au moins un résultat répond au seuil sélectionné
- `2` : échec de la commande/exécution avant que les résultats de lint ne puissent être produits

`--severity-min` contrôle à la fois les résultats visibles et le seuil de sortie. Par exemple, `openclaw doctor --lint --severity-min error` peut n'afficher aucun résultat et quitter avec `0` même lorsque des résultats `info` ou `warning` de moindre gravité existent.

## Contrôles de santé structurés

Les contrôles de doctor modernes utilisent un petit contrat structuré :

```ts
detect(ctx, scope?) -> HealthFinding[]
repair?(ctx, findings) -> HealthRepairResult
```

`detect()` alimente `doctor --lint`. `repair()` est facultatif et n'est pris en compte
que par `doctor --fix` / `doctor --repair`. Les vérifications qui n'ont pas migré vers ce
format continuent d'utiliser l'ancien flux de contribution doctor.

La séparation est intentionnelle : `detect()` gère le diagnostic, tandis que `repair()` gère
le rapport de ce qu'il a modifié ou modifierait. Les contextes de réparation peuvent transporter
des requêtes `dryRun`/`diff`, et les résultats de réparation peuvent renvoyer des `diffs` structurés pour
les modifications de config/fichier ainsi que `effects` pour les services, processus, packages, états ou autres
effets secondaires. Cela permet aux vérifications converties d'évoluer vers `doctor --fix --dry-run`
et le rapport de différences sans déplacer la planification des mutations dans `detect()`.

`repair()` indique s'il a tenté la réparation demandée avec `status:
"repaired" | "skipped" | "failed"`. Omitted status means `repaired`, donc les vérifications
de réparation simples n'ont besoin que de renvoyer les modifications. Lorsque la réparation renvoie `skipped` ou
`failed`, doctor rapporte la raison et n'exécute pas la validation pour cette vérification.

Après une réparation structurée réussie, doctor relance `detect()` avec
les résultats réparés comme portée. Les vérifications peuvent utiliser les résultats, chemins ou valeurs `ocPath`
sélectionnés pour une validation ciblée. Si le résultat est toujours présent, doctor signale un
avertissement de réparation au lieu de traiter le changement comme terminé silencieusement.

Un résultat inclut :

| Champ             | Objet                                                                 |
| ----------------- | --------------------------------------------------------------------- |
| `checkId`         | ID stable pour les filtres skip/only et les listes d'autorisation CI. |
| `severity`        | `info`, `warning`, ou `error`.                                        |
| `message`         | Déclaration du problème lisible par l'homme.                          |
| `path`            | Chemin de configuration, de fichier ou logique si disponible.         |
| `line` / `column` | Emplacement source si disponible.                                     |
| `ocPath`          | Adresse `oc://` précise lorsqu'une vérification peut en pointer une.  |
| `fixHint`         | Action suggérée pour l'opérateur ou résumé de la réparation.          |

Cette version enregistre les vérifications principales du doctor modernisées sur le chemin de santé structuré. Le sous-chemin `openclaw/plugin-sdk/health` expose le même contrat pour les consommateurs de suivi groupés, mais les vérifications soutenues par des plugins ne s'exécutent qu'après que leur package propriétaire les a enregistrées dans le chemin de commande actif.

## Sélection des vérifications

Utilisez `--only` et `--skip` lorsqu'un workflow souhaite une porte ciblée :

```bash
openclaw doctor --lint --only core/doctor/gateway-config --json
openclaw doctor --lint --skip core/doctor/skills-readiness
```

`--only` et `--skip` acceptent les identifiants complets des vérifications et peuvent être répétés. Si un identifiant `--only` n'est pas enregistré, aucune vérification ne s'exécute pour cet identifiant ; utilisez les champs `checksRun` et `checksSkipped` de la commande pour vérifier qu'une porte ciblée sélectionne bien les vérifications que vous attendez.

Notes :

- En mode Nix (`OPENCLAW_NIX_MODE=1`), les vérifications du doctor en lecture seule fonctionnent toujours, mais `doctor --fix`, `doctor --repair`, `doctor --yes` et `doctor --generate-gateway-token` sont désactivés car `openclaw.json` est immuable. Modifiez plutôt la source Nix pour cette installation ; pour nix-openclaw, utilisez le [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) orienté agent.
- Les invites interactives (comme les correctifs de trousseau de clés/OAuth) ne s'exécutent que lorsque stdin est un TTY et que `--non-interactive` n'est **pas** défini. Les exécutions sans tête (cron, Telegram, sans terminal) ignoreront les invites.
- Performance : les exécutions `doctor` non interactives ignorent le chargement impatient des plugins afin que les vérifications de santé sans tête restent rapides. Les sessions interactives du doctor chargent toujours les surfaces de plugin nécessaires au flux de santé et de réparation hérité.
- `--lint` est plus strict que `--non-interactive` : il est toujours en lecture seule, ne demande jamais et n'applique jamais de migrations sûres. Exécutez `doctor --fix` ou `doctor --repair` lorsque vous voulez que le doctor apporte des modifications.
- `--fix` (alias for `--repair`) écrit une sauvegarde dans `~/.openclaw/openclaw.json.bak` et supprime les clés de configuration inconnues, en listant chaque suppression.
- Les vérifications de santé modernisées peuvent exposer un chemin `repair()` pour `doctor --fix` ; les vérifications qui n'en exposent pas continuent via le flux de réparation doctor existant.
- `doctor --fix --non-interactive` signale les définitions de service de gateway manquantes ou obsolètes mais ne les installe pas ou ne les réécrit pas en dehors du mode de réparation de mise à jour. Exécutez `openclaw gateway install` pour un service manquant, ou `openclaw gateway install --force` lorsque vous souhaitez intentionnellement remplacer le lanceur.
- Les vérifications d'intégrité de l'état détectent désormais les fichiers de transcription orphelins dans le répertoire des sessions. Les archiver sous forme de `.deleted.<timestamp>` nécessite une confirmation interactive ; les exécutions `--fix`, `--yes` et sans tête les laissent en place.
- Doctor analyse également `~/.openclaw/cron/jobs.json` (ou `cron.store`) pour les formes de tâches cron héritées et peut les réécrire sur place avant que le planificateur n'ait à les normaliser automatiquement lors de l'exécution.
- Doctor signale les tâches cron avec des substitutions `payload.model` explicites, y compris les comptes d'espaces de noms de fournisseur et les incohérences avec `agents.defaults.model`, afin que les tâches planifiées qui n'héritent pas du modèle par défaut soient visibles lors des investigations d'authentification ou de facturation.
- Sur Linux, doctor avertit lorsque la crontab de l'utilisateur exécute encore le `~/.openclaw/bin/ensure-whatsapp.sh` hérité ; ce script n'est plus maintenu et peut enregistrer de fausses pannes de gateway WhatsApp lorsque cron manque de l'environnement de bus utilisateur systemd.
- Lorsque WhatsApp est activé, doctor vérifie la présence d'une boucle d'événements du Gateway dégradée avec des clients `openclaw-tui` locaux toujours en cours d'exécution. `doctor --fix` n'arrête que les clients TUI locaux vérifiés afin que les réponses WhatsApp ne soient pas mises en file d'attente derrière des boucles de rafraîchissement TUI obsolètes.
- Doctor réécrit les références de modèle `openai-codex/*` héritées en références `openai/*` canoniques pour les modèles principaux, les replis, les remplacements de heartbeat/subagent/compaction, les hooks, les remplacements de modèle de canal, et les épinglements d'itinéraire de session obsolètes. `--fix` déplace l'intention Codex vers les entrées `agentRuntime.id: "codex"` étendues au fournisseur/au modèle, préserve les épinglements de profil d'authentification de session tels que `openai-codex:...`, supprime les épinglements d'exécution obsolètes de l'agent/session entière, et conserve les références d'agent OpenAI réparées sur le routage d'authentification Codex au lieu de l'authentification directe par clé OpenAI de l'API.
- Doctor nettoie l'état de mise en zone de préparation des dépendances de plugins hérité créé par d'anciennes versions OpenClaw et relie le package hôte `openclaw` pour les plugins npm gérés qui le déclarent comme dépendance homologue. Il répare également les plugins téléchargeables manquants qui sont référencés par la configuration, tels que `plugins.entries`, les canaux configurés, les paramètres de fournisseur/recherche configurés, ou les runtimes d'agent configurés. Pendant les mises à jour de packages, doctor saute la réparation des plugins de gestionnaire de packages jusqu'à ce que l'échange de packages soit terminé ; relancez `openclaw doctor --fix` par la suite si un plugin configuré a toujours besoin de récupération. Si le téléchargement échoue, doctor signale l'erreur d'installation et conserve l'entrée de plugin configurée pour la prochaine tentative de réparation.
- Doctor répare la configuration obsolète des plugins en supprimant les ids de plugins manquants de `plugins.allow`/`plugins.deny`/`plugins.entries`, ainsi que la configuration de canal en suspens correspondante, les cibles de heartbeat et les remplacements de modèle de canal lorsque la découverte de plugins est saine.
- Doctor met en quarantaine la configuration de plugin invalide en désactivant l'entrée `plugins.entries.<id>` affectée et en supprimant sa charge utile `config` invalide. Le démarrage du Gateway ignore déjà uniquement ce mauvais plugin afin que les autres plugins et canaux puissent continuer à fonctionner.
- Définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsqu'un autre superviseur possède le cycle de vie de la passerelle. Doctor signale toujours l'état de santé de la passerelle/du service et applique des réparations non liées au service, mais ignore l'installation/le démarrage/le redémarrage/l'amorçage du service et le nettoyage des services hérités.
- Sur Linux, doctor ignore les unités systemd supplémentaires inactives de type passerelle et ne réécrit pas les métadonnées de commande/point d'entrée pour un service de passerelle systemd en cours d'exécution pendant la réparation. Arrêtez d'abord le service ou utilisez `openclaw gateway install --force` lorsque vous souhaitez intentionnellement remplacer le lanceur actif.
- Doctor migre automatiquement l'ancienne configuration plate de Talk (`talk.voiceId`, `talk.modelId`, etc.) vers `talk.provider` + `talk.providers.<provider>`.
- Les exécutions répétées de `doctor --fix` ne signalent plus et n'appliquent plus la normalisation Talk lorsque la seule différence réside dans l'ordre des clés d'objet.
- Doctor inclut une vérification de disponibilité de la recherche en mémoire et peut recommander `openclaw configure --section model` lorsque les informations d'identification d'intégration sont manquantes.
- Doctor avertit lorsqu'aucun propriétaire de commande n'est configuré. Le propriétaire de commande est le compte d'opérateur humain autorisé à exécuter des commandes réservées au propriétaire et à approuver des actions dangereuses. Le jumelage DM permet seulement à quelqu'un de parler au bot ; si vous avez approuvé un expéditeur avant l'existence de l'amorçage par le premier propriétaire, définissez `commands.ownerAllowFrom` explicitement.
- Doctor signale une note d'information lorsque les agents en mode Codex sont configurés et que des ressources personnelles Codex CLI existent dans le répertoire Codex de l'opérateur. Les lancements locaux de serveur d'application Codex utilisent des répertoires isolés par agent, installez donc le plugin Codex au préalable si nécessaire, puis utilisez `openclaw migrate plan codex` pour inventorier les ressources qui doivent être promues délibérément.
- Doctor supprime les `plugins.entries.codex.config.codexDynamicToolsProfile` retirés ; le serveur d'application Codex garde toujours les outils d'espace de travail natifs Codex natifs.
- Doctor avertit lorsque les compétences autorisées pour l'agent par défaut ne sont pas disponibles dans l'environnement d'exécution actuel car des exécutables, des variables d'environnement, une configuration ou des exigences OS sont manquants. `doctor --fix` peut désactiver ces compétences indisponibles avec `skills.entries.<skill>.enabled=false` ; installez/configurez plutôt la exigence manquante lorsque vous souhaitez garder la compétence active.
- Si le mode sandbox est activé mais que Docker n'est pas disponible, doctor signale un avertissement prioritaire avec des actions correctives (`install Docker` ou `openclaw config set agents.defaults.sandbox.mode off`).
- Si des fichiers de registre sandbox hérités (`~/.openclaw/sandbox/containers.json` ou `~/.openclaw/sandbox/browsers.json`) sont présents, doctor les signale ; `openclaw doctor --fix` migre les entrées valides vers des répertoires de registre partitionnés et met en quarantaine les fichiers hérités non valides.
- Si `gateway.auth.token`/`gateway.auth.password` sont gérés par SecretRef et indisponibles dans le chemin de commande actuel, doctor signale un avertissement en lecture seule et n'écrit pas d'informations d'identification de repli en clair.
- Si l'inspection SecretRef du canal échoue dans un chemin de correction, doctor continue et signale un avertissement au lieu de quitter prématurément.
- Après les migrations de répertoires d'état, doctor avertit lorsque les comptes Telegram ou Discord activés par défaut dépendent du repli de variables d'environnement et que `TELEGRAM_BOT_TOKEN` ou `DISCORD_BOT_TOKEN` est indisponible pour le processus doctor.
- La résolution automatique du nom d'utilisateur Telegram `allowFrom` (`doctor --fix`) nécessite un jeton Telegram résoluble dans le chemin de commande actuel. Si l'inspection du jeton n'est pas disponible, doctor signale un avertissement et ignore la résolution automatique pour cette passe.

## macOS : Remplacements d'env `launchctl`

Si vous avez précédemment exécuté `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (ou `...PASSWORD`), cette valeur remplace votre fichier de configuration et peut provoquer des erreurs persistantes « non autorisé ».

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## Connexes

- [Référence CLI](/fr/cli)
- [Doctor Gateway](/fr/gateway/doctor)
