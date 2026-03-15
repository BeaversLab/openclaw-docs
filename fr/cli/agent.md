---
summary: "Référence CLI pour `openclaw agent` (envoyer un tour d'agent via le Gateway)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "agent"
---

# `openclaw agent`

Exécuter un tour d'agent via le Gateway (utilisez `--local` pour intégré).
Utilisez `--agent <id>` pour cibler directement un agent configuré.

Connexe :

- Outil Agent send : [Agent send](/fr/tools/agent-send)

## Exemples

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## Notes

- Lorsque cette commande déclenche la régénération de `models.json`, les identifiants provider gérés par SecretRef sont conservés sous forme de marqueurs non secrets (par exemple, noms de env var, `secretref-env:ENV_VAR_NAME` ou `secretref-managed`), et non en tant que texte brut secret résolu.
- Les écritures de marqueurs sont autoritaires par la source : OpenClaw conserve les marqueurs provenant de l'instantané de la configuration source active, et non des valeurs de secret d'exécution résolues.

import fr from '/components/footer/fr.mdx';

<fr />
