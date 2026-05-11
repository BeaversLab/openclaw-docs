---
summary: "Référence CLI pour `openclaw agent` (envoyer un tour d'agent via le Gateway)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "Agent"
---

# `openclaw agent`

Exécuter un tour d'agent via le Gateway (utilisez `--local` pour intégré).
Utilisez `--agent <id>` pour cibler directement un agent configuré.

Transmettez au moins un sélecteur de session :

- `--to <dest>`
- `--session-id <id>`
- `--agent <id>`

Connexe :

- Agent send tool : [Agent send](/fr/tools/agent-send)

## Options

- `-m, --message <text>` : corps du message requis
- `-t, --to <dest>` : destinataire utilisé pour dériver la clé de session
- `--session-id <id>` : id de session explicite
- `--agent <id>` : id d'agent ; remplace les liaisons de routage
- `--model <id>` : substitution de model pour cette exécution (`provider/model` ou id du model)
- `--thinking <level>` : niveau de réflexion de l'agent (`off`, `minimal`, `low`, `medium`, `high`, ainsi que les niveaux personnalisés pris en charge par le provider tels que `xhigh`, `adaptive` ou `max`)
- `--verbose <on|off>` : rendre persistant le niveau verbose pour la session
- `--channel <channel>` : channel de livraison ; omettre pour utiliser le channel de session principal
- `--reply-to <target>` : substitution de la cible de livraison
- `--reply-channel <channel>` : substitution du channel de livraison
- `--reply-account <id>` : substitution du compte de livraison
- `--local` : exécuter l'agent intégré directement (après le préchargement du registre des plugins)
- `--deliver` : renvoyer la réponse vers le channel/cible sélectionné
- `--timeout <seconds>` : substitution du délai d'attente de l'agent (par défaut 600 ou valeur de configuration)
- `--json` : sortie JSON

## Exemples

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## Notes

- Le mode Gateway revient à l'agent intégré lorsque la requête Gateway échoue. Utilisez `--local` pour forcer l'exécution intégrée dès le début.
- `--local` précharge toujours le registre des plugins en premier, donc les providers, tools et channels fournis par les plugins restent disponibles lors des exécutions intégrées.
- Chaque invocation de `openclaw agent` est traitée comme une exécution unique. Les serveurs MCP groupés ou configurés par l'utilisateur ouverts pour cette exécution sont fermés après la réponse, même lorsque la commande utilise le chemin Gateway, donc les processus enfants MCP stdio ne restent pas en vie entre les invocations de script.
- `--channel`, `--reply-channel` et `--reply-account` affectent la livraison de la réponse, pas le routage de la session.
- `--json` garde stdout réservé pour la réponse JSON. Les diagnostics du Gateway, du plugin et de secours intégré sont acheminés vers stderr afin que les scripts puissent analyser stdout directement.
- Le JSON de repli intégré inclut `meta.transport: "embedded"` et `meta.fallbackFrom: "gateway"` afin que les scripts puissent distinguer les exécutions de repli des exécutions du Gateway.
- Lorsque cette commande déclenche la régénération de `models.json`, les informations d'identification du fournisseur gérées par SecretRef sont persistées sous forme de marqueurs non secrets (par exemple, les noms de variables d'environnement, `secretref-env:ENV_VAR_NAME` ou `secretref-managed`), et non en tant que texte en clair de secret résolu.
- Les écritures de marqueurs sont basées sur la source : OpenClaw persiste les marqueurs à partir de l'instantané de la configuration source active, et non à partir des valeurs de secret d'exécution résolues.

## Connexes

- [Référence CLI](/fr/cli)
- [Runtime de l'Agent](/fr/concepts/agent)
