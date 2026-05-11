---
summary: "Référence CLI pour `openclaw doctor` (vérifications de santé + réparations guidées)"
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

## Options

- `--no-workspace-suggestions` : désactiver les suggestions de mémoire/recherche de l'espace de travail
- `--yes` : accepter les valeurs par défaut sans demander
- `--repair` : appliquer les réparations recommandées sans demander
- `--fix` : alias pour `--repair`
- `--force` : appliquer des réparations agressives, y compris en écrasant la configuration de service personnalisée si nécessaire
- `--non-interactive` : exécuter sans invite de commande ; migrations sûres uniquement
- `--generate-gateway-token` : générer et configurer un jeton de passerelle
- `--deep` : rechercher des installations de passerelle supplémentaires dans les services système

Notes :

- Les invites interactives (comme les correctifs de trousseau de clés/OAuth) ne s'exécutent que lorsque stdin est un TTY et que `--non-interactive` n'est **pas** défini. Les exécutions sans tête (cron, Telegram, sans terminal) ignoreront les invites.
- Performance : les exécutions non interactives de `doctor` ignorent le chargement eager des plugins afin que les contrôles de santé sans tête restent rapides. Les sessions interactives chargent toujours entièrement les plugins lorsqu'une vérification nécessite leur contribution.
- `--fix` (alias pour `--repair`) écrit une sauvegarde dans `~/.openclaw/openclaw.json.bak` et supprime les clés de configuration inconnues, en listant chaque suppression.
- Les contrôles d'intégrité de l'état détectent désormais les fichiers de transcription orphelins dans le répertoire des sessions et peuvent les archiver sous `.deleted.<timestamp>` pour récupérer de l'espace en toute sécurité.
- Doctor analyse également `~/.openclaw/cron/jobs.json` (ou `cron.store`) pour détecter les anciennes formes de tâches cron et peut les réécrire sur place avant que le planificateur ne doive les normaliser automatiquement lors de l'exécution.
- Doctor répare les dépendances d'exécution des plugins groupés manquants sans écrire dans les installations globales empaquetées. Pour les installations npm détenues par root ou les unités systemd renforcées, définissez `OPENCLAW_PLUGIN_STAGE_DIR` sur un répertoire accessible en écriture tel que `/var/lib/openclaw/plugin-runtime-deps` ; il peut également s'agir d'une liste de chemins telle que `/opt/openclaw/plugin-runtime-deps:/var/lib/openclaw/plugin-runtime-deps`, où les racines précédentes sont des couches de recherche en lecture seule et la racine finale est la cible de réparation.
- Doctor répare la configuration obsolète des plugins en supprimant les identifiants de plugins manquants de `plugins.allow`/`plugins.entries`, ainsi que la configuration de canal orpheline correspondante, les cibles de heartbeat et les substitutions de modèle de canal lorsque la découverte des plugins est saine.
- Doctor met en quarantaine la configuration de plugin invalide en désactivant l'entrée `plugins.entries.<id>` affectée et en supprimant sa charge utile `config` invalide. Le démarrage de la Gateway ignore déjà ce mauvais plugin, permettant aux autres plugins et canaux de continuer à fonctionner.
- Définissez `OPENCLAW_SERVICE_REPAIR_POLICY=external` lorsqu'un autre superviseur possède le cycle de vie de la passerelle. Doctor signale toujours l'état de santé de la passerelle/du service et applique les réparations non liées au service, mais ignore l'installation, le démarrage, le redémarrage, l'amorçage et le nettoyage du service hérité.
- Doctor migre automatiquement l'ancienne configuration plate Talk (`talk.voiceId`, `talk.modelId`, etc.) vers `talk.provider` + `talk.providers.<provider>`.
- Les exécutions répétées de `doctor --fix` ne signalent plus n'appliquent plus la normalisation Talk lorsque la seule différence est l'ordre des clés d'objet.
- Doctor comprend une vérification de préparation de la recherche en mémoire et peut recommander `openclaw configure --section model` lorsque les identifiants d'intégration sont manquants.
- Si le mode bac à sable est activé mais que Docker n'est pas disponible, doctor signale un avertissement à signal élevé avec une solution de contournement (`install Docker` ou `openclaw config set agents.defaults.sandbox.mode off`).
- Si `gateway.auth.token`/`gateway.auth.password` sont gérés par SecretRef et indisponibles dans le chemin de commande actuel, doctor signale un avertissement en lecture seule et n'écrit pas d'informations d'identification de replage en texte brut.
- Si l'inspection du SecretRef du canal échoue dans un chemin de correction, doctor continue et signale un avertissement au lieu de sortir tôt.
- La résolution automatique du nom d'utilisateur Telegram `allowFrom` (`doctor --fix`) nécessite un jeton Telegram résolvable dans le chemin de commande actuel. Si l'inspection du jeton n'est pas disponible, doctor signale un avertissement et ignore la résolution automatique pour cette passe.

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
