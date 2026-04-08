---
summary: "Référence CLI pour `openclaw agent` (envoyer un tour d'agent via le Gateway)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

Exécuter un tour d'agent via le Gateway (utilisez `--local` pour intégré).
Utilisez `--agent <id>` pour cibler directement un agent configuré.

Transmettez au moins un sélecteur de session :

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

Connexe :

- Outil d'envoi d'agent : [Agent send](/en/tools/agent-send)

## Options

- `-m, --message <text>` : corps du message requis
- `-t, --to <dest>` : destinataire utilisé pour dériver la clé de session
- `--session-id <id>` : id de session explicite
- `--agent <id>` : id d'agent ; remplace les liaisons de routage
- `--thinking <off|minimal|low|medium|high|xhigh>` : niveau de réflexion de l'agent
- `--verbose <on|off>` : conserver le niveau verbose pour la session
- `--channel <channel>` : canal de livraison ; omettre pour utiliser le canal de session principal
- `--reply-to <target>` : remplacement de la cible de livraison
- `--reply-channel <channel>` : remplacement du canal de livraison
- `--reply-account <id>` : remplacement du compte de livraison
- `--local` : exécuter l'agent intégré directement (après le préchargement du registre des plugins)
- `--deliver` : renvoyer la réponse au canal/cible sélectionné
- `--timeout <seconds>` : remplacer le délai d'attente de l'agent (par défaut 600 ou valeur de configuration)
- `--json` : afficher JSON

## Exemples

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## Notes

- Le mode Gateway revient à l'agent intégré lorsque la requête Gateway échoue. Utilisez `--local` pour forcer l'exécution intégrée dès le départ.
- `--local` précharge toujours le registre des plugins en premier, donc les providers, outils et canaux fournis par les plugins restent disponibles lors des exécutions intégrées.
- `--channel`, `--reply-channel` et `--reply-account` affectent la livraison de la réponse, pas le routage de session.
- Lorsque cette commande déclenche la régénération `models.json`, les identifiants de provider gérés par SecretRef sont conservés comme marqueurs non secrets (par exemple les noms des env var, `secretref-env:ENV_VAR_NAME` ou `secretref-managed`), et non comme du texte secret résolu.
- Les écritures de marqueurs sont basées sur la source : OpenClaw conserve les marqueurs à partir de l'instantané de la configuration source active, et non à partir des valeurs secrètes résolues au moment de l'exécution.
