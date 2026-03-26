---
summary: "Exécutions directes du `openclaw agent` CLI (avec livraison facultative)"
read_when:
  - Adding or modifying the agent CLI entrypoint
title: "Agent Send"
---

# `openclaw agent` (exécutions directes d'agent)

`openclaw agent` exécute un seul tour d'agent sans avoir besoin d'un message de chat entrant.
Par défaut, il passe **par le Gateway** ; ajoutez `--local` pour forcer le runtime
intégré sur la machine actuelle.

## Comportement

- Obligatoire : `--message <text>`
- Sélection de session :
  - `--to <dest>` dérive la clé de session (les cibles de groupe/canal préservent l'isolement ; les chats directs s'effondrent en `main`), **ou**
  - `--session-id <id>` réutilise une session existante par id, **ou**
  - `--agent <id>` cible un agent configuré directement (utilise la clé de session `main` de cet agent)
- Exécute le même runtime d'agent intégré que les réponses entrantes normales.
- Les indicateurs de réflexion/verbosité persistent dans le magasin de sessions.
- Sortie :
  - par défaut : imprime le texte de la réponse (plus les lignes `MEDIA:<url>`)
  - `--json` : imprime la charge utile structurée + les métadonnées
- Livraison facultative vers un canal avec `--deliver` + `--channel` (les formats cibles correspondent à `openclaw message --target`).
- Utilisez `--reply-channel`/`--reply-to`/`--reply-account` pour remplacer la livraison sans changer la session.

Si le Gateway est inaccessible, le CLI **revient** à l'exécution locale intégrée.

## Exemples

```bash
openclaw agent --to +15555550123 --message "status update"
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --to +15555550123 --message "Summon reply" --deliver
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
```

## Indicateurs

- `--local` : exécuter localement (nécessite les clés API du fournisseur de modèle dans votre shell)
- `--deliver` : envoyer la réponse au canal choisi
- `--channel` : canal de livraison (`whatsapp|telegram|discord|googlechat|slack|signal|imessage`, par défaut : `whatsapp`)
- `--reply-to` : remplacement de la cible de livraison
- `--reply-channel` : remplacement du canal de livraison
- `--reply-account` : forcer le remplacement de l'id du compte de livraison
- `--thinking <off|minimal|low|medium|high|xhigh>` : niveau de persistance de la réflexion (modèles GPT-5.2 + Codex uniquement)
- `--verbose <on|full|off>` : niveau de persistance du mode verbeux
- `--timeout <seconds>` : remplacer le délai d'attente de l'agent
- `--json` : afficher du JSON structuré

import fr from "/components/footer/fr.mdx";

<fr />
