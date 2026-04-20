---
summary: "Référence CLI pour `openclaw doctor` (vérifications de santé + réparations guidées)"
read_when:
  - You have connectivity/auth issues and want guided fixes
  - You updated and want a sanity check
title: "doctor"
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
- `--fix` (alias pour `--repair`) écrit une sauvegarde dans `~/.openclaw/openclaw.json.bak` et supprime les clés de configuration inconnues, en listant chaque suppression.
- Les contrôles d'intégrité de l'état détectent désormais les fichiers de transcription orphelins dans le répertoire des sessions et peuvent les archiver sous `.deleted.<timestamp>` pour récupérer de l'espace en toute sécurité.
- Doctor scanne également `~/.openclaw/cron/jobs.json` (ou `cron.store`) pour détecter les anciennes formes de tâches cron et peut les réécrire sur place avant que le planificateur n'ait à les normaliser automatiquement lors de l'exécution.
- Doctor migre automatiquement l'ancienne configuration plate de Talk (`talk.voiceId`, `talk.modelId`, etc.) vers `talk.provider` + `talk.providers.<provider>`.
- Les exécutions répétées de `doctor --fix` ne signalent plus n'appliquent plus la normalisation Talk lorsque la seule différence réside dans l'ordre des clés d'objet.
- Doctor comprend une vérification de préparation de la recherche de mémoire et peut recommander `openclaw configure --section model` lorsque les identifiants d'intégration sont manquants.
- Si le mode bac à sable est activé mais que Docker est indisponible, doctor signale un avertissement à fort signal avec une solution (`install Docker` ou `openclaw config set agents.defaults.sandbox.mode off`).
- Si `gateway.auth.token`/`gateway.auth.password` sont gérés par SecretRef et indisponibles dans le chemin de commande actuel, doctor signale un avertissement en lecture seule et n'écrit pas les identifiants de repli en texte brut.
- Si l'inspection du SecretRef de channel échoue dans un chemin de correction, doctor continue et signale un avertissement au lieu de quitter prématurément.
- La résolution automatique du nom d'utilisateur `allowFrom` Telegram (`doctor --fix`) nécessite un jeton Telegram résolvable dans le chemin de commande actuel. Si l'inspection du jeton n'est pas disponible, doctor signale un avertissement et ignore la résolution automatique pour cette passe.

## macOS : substitutions d'environnement `launchctl`

Si vous avez précédemment exécuté `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (ou `...PASSWORD`), cette valeur remplace votre fichier de configuration et peut provoquer des erreurs persistantes « non autorisé ».

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```
