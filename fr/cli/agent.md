---
summary: "Référence de la CLI pour `openclaw agent` (envoyer un tour d'agent via la Gateway)"
read_when:
  - Vous souhaitez exécuter un tour d'agent à partir de scripts (fournir éventuellement une réponse)
title: "agent"
---

# `openclaw agent`

Exécuter un tour d'agent via la Gateway (utiliser `--local` pour l'intégration).
Utilisez `--agent <id>` pour cibler directement un agent configuré.

Connexe :

- Outil d'envoi d'agent : [Agent send](/fr/tools/agent-send)

## Exemples

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## Notes

- Lorsque cette commande déclenche la régénération de `models.json`, les identifiants de fournisseur gérés par SecretRef sont conservés sous forme de marqueurs non secrets (par exemple, noms de variables d'environnement, `secretref-env:ENV_VAR_NAME` ou `secretref-managed`), et non sous forme de texte en clair de secret résolu.
- Les écritures de marqueurs sont autoritaires par la source : OpenClaw conserve les marqueurs provenant de l'instantané de la configuration source active, et non des valeurs de secret d'exécution résolues.

import en from "/components/footer/en.mdx";

<en />
