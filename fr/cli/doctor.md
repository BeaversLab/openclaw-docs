---
summary: "Référence de CLI pour `openclaw doctor` (contrôles de santé + réparations guidées)"
read_when:
  - Vous rencontrez des problèmes de connectivité/d'authentification et souhaitez des corrections guidées
  - Vous avez effectué une mise à jour et souhaitez un contrôle de santé
title: "doctor"
---

# `openclaw doctor`

Contrôles de santé + corrections rapides pour la passerelle et les channels.

Connexes :

- Dépannage : [Dépannage](/fr/gateway/troubleshooting)
- Audit de sécurité : [Sécurité](/fr/gateway/security)

## Exemples

```bash
openclaw doctor
openclaw doctor --repair
openclaw doctor --deep
```

Remarques :

- Les invites interactives (telles que les corrections de trousseau de clés/OAuth) ne s'exécutent que lorsque stdin est un TTY et que `--non-interactive` n'est **pas** défini. Les exécutions sans tête (cron, Telegram, sans terminal) ignoreront les invites.
- `--fix` (alias pour `--repair`) écrit une sauvegarde dans `~/.openclaw/openclaw.json.bak` et supprime les clés de configuration inconnues, en listant chaque suppression.
- Les contrôles d'intégrité de l'état détectent désormais les fichiers de transcription orphelins dans le répertoire des sessions et peuvent les archiver en tant que `.deleted.<timestamp>` pour récupérer de l'espace en toute sécurité.
- Doctor analyse également `~/.openclaw/cron/jobs.json` (ou `cron.store`) pour les anciennes formes de tâches cron et peut les réécrire sur place avant que le planificateur ne doive les normaliser automatiquement lors de l'exécution.
- Doctor comprend un contrôle de préparation de la recherche mémoire et peut recommander `openclaw configure --section model` lorsque les identifiants d'intégration sont manquants.
- Si le mode bac à sable est activé mais que Docker n'est pas disponible, doctor signale un avertissement à signal fort avec une solution de contournement (`install Docker` ou `openclaw config set agents.defaults.sandbox.mode off`).
- Si `gateway.auth.token`/`gateway.auth.password` sont gérés par SecretRef et indisponibles dans le chemin de commande actuel, doctor signale un avertissement en lecture seule et n'écrit pas d'identifiants de repli en texte brut.
- Si l'inspection SecretRef du channel échoue dans un chemin de correction, doctor continue et signale un avertissement au lieu de quitter prématurément.
- La résolution automatique du nom d'utilisateur `allowFrom` Telegram (`doctor --fix`) nécessite un jeton Telegram résoluble dans le chemin de commande actuel. Si l'inspection du jeton n'est pas disponible, doctor signale un avertissement et ignore la résolution automatique pour cette passe.

## macOS : Remplacements des variables d'env `launchctl`

Si vous avez précédemment exécuté `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (ou `...PASSWORD`), cette valeur remplace votre fichier de configuration et peut provoquer des erreurs persistantes « non autorisé ».

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

import fr from "/components/footer/fr.mdx";

<fr />
