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
```

Notes :

- Les invites interactives (telles que les correctifs de trousseau de clés/OAuth) ne s'exécutent que lorsque stdin est un TTY et que `--non-interactive` n'est **pas** défini. Les exécutions sans tête (cron, Telegram, sans terminal) ignoreront les invites.
- `--fix` (alias pour `--repair`) écrit une sauvegarde dans `~/.openclaw/openclaw.json.bak` et supprime les clés de configuration inconnues, en listant chaque suppression.
- Les vérifications d'intégrité de l'état détectent désormais les fichiers de transcription orphelins dans le répertoire des sessions et peuvent les archiver sous `.deleted.<timestamp>` pour récupérer de l'espace en toute sécurité.
- Doctor analyse également `~/.openclaw/cron/jobs.json` (ou `cron.store`) à la recherche de formes de tâches cron héritées et peut les réécrire sur place avant que le planificateur ait à les normaliser automatiquement lors de l'exécution.
- Doctor inclut une vérification de disponibilité de la recherche mémoire et peut recommander `openclaw configure --section model` lorsque les identifiants d'intégration sont manquants.
- Si le mode bac à sable est activé mais que Docker n'est pas disponible, doctor signale un avertissement à fort signal avec une solution de contournement (`install Docker` ou `openclaw config set agents.defaults.sandbox.mode off`).

## macOS : `launchctl` env overrides

Si vous avez précédemment exécuté `launchctl setenv OPENCLAW_GATEWAY_TOKEN ...` (ou `...PASSWORD`), cette valeur remplace votre fichier de configuration et peut provoquer des erreurs persistantes « non autorisé ».

```bash
launchctl getenv OPENCLAW_GATEWAY_TOKEN
launchctl getenv OPENCLAW_GATEWAY_PASSWORD

launchctl unsetenv OPENCLAW_GATEWAY_TOKEN
launchctl unsetenv OPENCLAW_GATEWAY_PASSWORD
```

import fr from '/components/footer/fr.mdx';

<fr />
