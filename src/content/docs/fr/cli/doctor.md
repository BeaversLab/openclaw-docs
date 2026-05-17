---
summary: "CLIRéférence CLI pour `openclaw doctor` (vérifications de santé + réparations guidées)"
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

## Exemples

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
openclaw doctor --repair --non-interactive
openclaw doctor --generate-gateway-token
```

Pour les permissions spécifiques au channel, utilisez les sondes de canal au lieu de `doctor` :

```bash
openclaw channels capabilities --channel discord --target channel:<channel-id>
openclaw channels status --probe
```

La sonde des capacités Discord ciblée signale les permissions effectives du channel du bot ; la sonde d'état audit les canaux Discord configurés et les cibles de rejoindre automatiquement la voix.

## Options

- `--no-workspace-suggestions` : désactiver les suggestions de mémoire/recherche de l'espace de travail
- `--yes` : accepter les valeurs par défaut sans demander
- `--repair` : appliquer les réparations non-service recommandées sans demander ; les installations et réécritures du service Gateway nécessitent toujours une confirmation interactive ou des commandes Gateway explicites
- `--fix` : alias pour `--repair`
- `--force` : appliquer des réparations agressives, y compris l'écrasement de la configuration personnalisée du service si nécessaire
- `--non-interactive` : exécuter sans invite ; migrations sûres et réparations non-service uniquement
- `--generate-gateway-token` : générer et configurer un jeton Gateway
- `--deep`Gateway : scanner les services système pour les installations Gateway supplémentaires et signaler les transferts de redémarrage récents du superviseur Gateway

Notes :

- En mode Nix (`OPENCLAW_NIX_MODE=1`), les vérifications du médecin en lecture seule fonctionnent toujours, mais `doctor --fix`, `doctor --repair`, `doctor --yes` et `doctor --generate-gateway-token` sont désactivés car `openclaw.json` est immuable. Modifiez plutôt la source Nix pour cette installation ; pour nix-openclaw, utilisez le [Quick Start](https://github.com/openclaw/nix-openclaw#quick-start) orienté agent.
- Les invites interactives (comme les corrections de trousseau de clés/OAuth) ne s'exécutent que lorsque stdin est un TTY et que OAuth`--non-interactive`Telegram n'est **pas** défini. Les exécutions sans tête (cron, Telegram, sans terminal) ignoreront les invites.
- Performance : les exécutions non interactives de `doctor` ignorent le chargement impatient des plugins afin que les contrôles de santé sans tête restent rapides. Les sessions interactives chargent toujours entièrement les plugins lorsqu'un contrôle a besoin de leur contribution.
- `--fix` (alias pour `--repair`) écrit une sauvegarde dans `~/.openclaw/openclaw.json.bak` et supprime les clés de configuration inconnues, en listant chaque suppression.
- `doctor --fix --non-interactive` signale les définitions de service Gateway manquantes ou obsolètes mais ne les installe ou ne les réécrit pas en dehors du mode de réparation de mise à jour. Exécutez `openclaw gateway install` pour un service manquant, ou `openclaw gateway install --force` lorsque vous souhaitez intentionnellement remplacer le lanceur.
- Les contrôles d'intégrité de l'état détectent désormais les fichiers de transcription orphelins dans le répertoire des sessions. Les archiver sous `.deleted.<timestamp>` nécessite une confirmation interactive ; `--fix`, `--yes` et les exécutions sans tête les laissent en place.
- Doctor analyse également `~/.openclaw/cron/jobs.json` (ou `cron.store`) à la recherche de formes de tâches cron héritées et peut les réécrire sur place avant que le planificateur n'ait à les normaliser automatiquement lors de l'exécution.
- Sur Linux, doctor avertit lorsque la crontab de l'utilisateur exécute toujours le Linux`~/.openclaw/bin/ensure-whatsapp.sh`WhatsApp hérité ; ce script n'est plus maintenu et peut enregistrer de fausses pannes de la passerelle WhatsApp lorsque cron manque de l'environnement de bus utilisateur systemd.
- Lorsque WhatsApp est activé, doctor vérifie la présence d'une boucle d'événements Gateway dégradée avec des clients TUI locaux WhatsAppGateway`openclaw-tui` toujours en cours d'exécution. `doctor --fix`TUIWhatsAppTUI n'arrête que les clients TUI locaux vérifiés afin que les réponses WhatsApp ne soient pas mises en file d'attente derrière des boucles de rafraîchissement TUI obsolètes.
- Le médecin réécrit les références de modèle héritées `openai-codex/*` en références canoniques `openai/*` pour les modèles principaux, les fallbacks, les remplacements de heartbeat/subagent/compaction, les hooks, les remplacements de modèle de channel et les épinglages de route de session obsolètes. `--fix` déplace l'intention Codex vers les entrées `agentRuntime.id: "codex"` définies par fournisseur/modèle, préserve les épinglages de profil d'auth de session tels que `openai-codex:...`, supprime les épinglages d'exécution obsolètes d'agent entier/session, et conserve les références d'agent OpenAI réparées sur le routage d'auth Codex au lieu de l'auth directe par clé OpenAI de l'API.
- Le médecin nettoie l'état de préparation des dépendances de plugin hérité créé par d'anciennes versions OpenClaw et relie le package hôte `openclaw` pour les plugins gérés npm qui le déclarent comme dépendance homologue. Il répare également les plugins téléchargeables manquants qui sont référencés par la configuration, tels que `plugins.entries`, les channels configurés, les paramètres de fournisseur/recherche configurés, ou les runtimes d'agent configurés. Durant les mises à jour de package, le médecin ignore la réparation des plugins du gestionnaire de packages jusqu'à ce que l'échange de package soit terminé ; relancez `openclaw doctor --fix` ensuite si un plugin configuré a encore besoin de récupération. Si le téléchargement échoue, le médecin signale l'erreur d'installation et conserve l'entrée de plugin configurée pour la prochaine tentative de réparation.
- Doctor répare la configuration obsolète des plugins en supprimant les ID de plugins manquants de `plugins.allow`/`plugins.deny`/`plugins.entries`, ainsi que la configuration orpheline correspondante des canaux, les cibles de battement de cœur et les substitutions de modèle de canal lorsque la découverte des plugins est saine.
- Doctor met en quarantaine la configuration invalide des plugins en désactivant l'entrée `plugins.entries.<id>` concernée et en supprimant sa charge utile `config` invalide. Le démarrage du Gateway ignore déjà ce mauvais plugin, permettant ainsi aux autres plugins et canaux de continuer à fonctionner.
- Définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsqu'un autre superviseur gère le cycle de vie de la passerelle. Doctor signale toujours l'état de santé de la passerelle/service et applique les réparations non liées au service, mais ignore l'installation/démarrage/redémarrage/amorçage du service ainsi que le nettoyage des services hérités.
- Sur Linux, doctor ignore les unités systemd inactives supplémentaires de type passerelle et ne réécrit pas les métadonnées de commande/point d'entrée pour un service de passerelle systemd en cours d'exécution pendant la réparation. Arrêtez d'abord le service ou utilisez `openclaw gateway install --force` si vous souhaitez intentionnellement remplacer le lanceur actif.
- Doctor migre automatiquement l'ancienne configuration plate Talk (`talk.voiceId`, `talk.modelId`, et leurs amis) vers `talk.provider` + `talk.providers.<provider>`.
- Les exécutions répétées de `doctor --fix` ne signalent plus n'appliquent plus la normalisation Talk lorsque la seule différence réside dans l'ordre des clés d'objet.
- Doctor inclut une vérification de disponibilité de la recherche mémoire et peut recommander `openclaw configure --section model` lorsque les informations d'identification d'intégration sont manquantes.
- Doctor avertit lorsqu'aucun propriétaire de commande n'est configuré. Le propriétaire de commande est le compte opérateur humain autorisé à exécuter des commandes réservées au propriétaire et à approuver des actions dangereuses. L'appairage DM permet uniquement à quelqu'un de parler au bot ; si vous avez approuvé un expéditeur avant l'existence de l'amorçage par le premier propriétaire, définissez `commands.ownerAllowFrom` explicitement.
- Doctor avertit lorsque les agents en mode Codex sont configurés et que les assets personnels du CLI Codex existent dans le domicile Codex de l'opérateur. Les lancements locaux du serveur d'application Codex utilisent des domiciles isolés par agent, utilisez donc `openclaw migrate codex --dry-run` pour inventorier les assets qui doivent être promus délibérément.
- Doctor supprime les `plugins.entries.codex.config.codexDynamicToolsProfile` obsolètes ; Codex app-server garde toujours les outils de workspace natifs Codex natifs.
- Doctor avertit lorsque les compétences autorisées pour l'agent par défaut ne sont pas disponibles dans l'environnement d'exécution actuel car des binaires, des env vars, une configuration ou des exigences OS sont manquants. `doctor --fix` peut désactiver ces compétences indisponibles avec `skills.entries.<skill>.enabled=false` ; installez/configurez plutôt la exigence manquante lorsque vous souhaitez garder la compétence active.
- Si le mode bac à sable est activé mais que Docker est indisponible, doctor signale un avertissement prioritaire avec une solution (`install Docker` ou `openclaw config set agents.defaults.sandbox.mode off`).
- Si les fichiers de registre de bac à sable hérités (`~/.openclaw/sandbox/containers.json` ou `~/.openclaw/sandbox/browsers.json`) sont présents, doctor les signale ; `openclaw doctor --fix` migre les entrées valides vers des répertoires de registre partitionnés et met en quarantaine les fichiers hérités non valides.
- Si `gateway.auth.token`/`gateway.auth.password` sont gérés par SecretRef et indisponibles dans le chemin de commande actuel, doctor signale un avertissement en lecture seule et n'écrit pas d'informations d'identification de repli en texte brut.
- Si l'inspection du SecretRef du canal échoue dans un chemin de correction, doctor continue et signale un avertissement au lieu de quitter prématurément.
- Après les migrations de répertoires d'état, doctor avertit lorsque les comptes Telegram ou Discord activés par défaut dépendent du repli d'env et que `TELEGRAM_BOT_TOKEN` ou `DISCORD_BOT_TOKEN` est indisponible pour le processus doctor.
- La résolution automatique du nom d'utilisateur `allowFrom` Telegram (`doctor --fix`) nécessite un jeton Telegram résolvable dans le chemin de commande actuel. Si l'inspection du jeton est indisponible, doctor signale un avertissement et ignore la résolution automatique pour cette passe.

## macOS : remplacements d'env `launchctl`

Si vous avez précédemment exécuté `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (ou `...PASSWORD`), cette valeur remplace votre fichier de configuration et peut provoquer des erreurs persistantes « non autorisées ».

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

## Connexes

- [Référence CLI](/fr/cli)
- [Doctor Gateway](/fr/gateway/doctor)
