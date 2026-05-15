---
summary: "Exécuter des tours d'agent depuis le CLI et livrer facultativement les réponses aux channels"
read_when:
  - You want to trigger agent runs from scripts or the command line
  - You need to deliver agent replies to a chat channel programmatically
title: "Envoi d'agent"
---

`openclaw agent` exécute un seul tour d'agent à partir de la ligne de commande sans avoir besoin
d'un message de chat entrant. Utilisez-le pour les flux de travail scriptés, les tests et la
livraison programmatique.

## Quick start

<Steps>
  <Step title="Exécuter un tour d'agent simple">
    ```bash
    openclaw agent --message "What is the weather today?"
    ```

    Cela envoie le message via le Gateway et imprime la réponse.

  </Step>

  <Step title="Cibler un agent ou une session spécifique">
    ```bash
    # Target a specific agent
    openclaw agent --agent ops --message "Summarize logs"

    # Target a phone number (derives session key)
    openclaw agent --to +15555550123 --message "Status update"

    # Reuse an existing session
    openclaw agent --session-id abc123 --message "Continue the task"
    ```

  </Step>

  <Step title="Envoyer la réponse à un channel">
    ```bash
    # Deliver to WhatsApp (default channel)
    openclaw agent --to +15555550123 --message "Report ready" --deliver

    # Deliver to Slack
    openclaw agent --agent ops --message "Generate report" \
      --deliver --reply-channel slack --reply-to "#reports"
    ```

  </Step>
</Steps>

## Flags

| Flag                          | Description                                                            |
| ----------------------------- | ---------------------------------------------------------------------- |
| `--message \<text\>`          | Message à envoyer (requis)                                             |
| `--to \<dest\>`               | Dériver la clé de session à partir d'une cible (téléphone, id de chat) |
| `--agent \<id\>`              | Ciblez un agent configuré (utilise sa session `main`)                  |
| `--session-id \<id\>`         | Réutiliser une session existante par id                                |
| `--local`                     | Forcer l'exécution locale intégrée (ignorer le Gateway)                |
| `--deliver`                   | Envoyer la réponse à un channel de chat                                |
| `--channel \<name\>`          | Channel de livraison (whatsapp, telegram, discord, slack, etc.)        |
| `--reply-to \<target\>`       | Remplacement de la cible de livraison                                  |
| `--reply-channel \<name\>`    | Remplacement du channel de livraison                                   |
| `--reply-account \<id\>`      | Remplacement de l'id de compte de livraison                            |
| `--thinking \<level\>`        | Définir le niveau de réflexion pour le profil de model sélectionné     |
| `--verbose \<on\|full\|off\>` | Définir le niveau verbosité                                            |
| `--timeout \<seconds\>`       | Remplacer le délai d'expiration de l'agent                             |
| `--json`                      | Sortie JSON structurée                                                 |

## Comportement

- Par défaut, la CLI passe **par le Gateway**. Ajoutez `--local` pour forcer
  le runtime embarqué sur la machine actuelle.
- Si le Gateway est inaccessible, la CLI **revient** à l'exécution locale intégrée.
- Sélection de session : `--to` dérive la clé de session (les cibles de groupe/channel
  préservent l'isolement ; les chats directs se réduisent à `main`).
- Les flags de réflexion et de verbosité sont conservés dans le magasin de session.
- Sortie : texte brut par défaut, ou `--json` pour une charge utile structurée + métadonnées.

## Exemples

```bash
# Simple turn with JSON output
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json

# Turn with thinking level
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium

# Deliver to a different channel than the session
openclaw agent --agent ops --message "Alert" --deliver --reply-channel telegram --reply-to "@admin"
```

## Connexes

<CardGroup cols={2}>
  <Card title="CLIRéférence CLI de l'agent" href="/fr/cli/agent" icon="terminal">
    Référence complète des indicateurs et options `openclaw agent`.
  </Card>
  <Card title="Sous-agents" href="/fr/tools/subagents" icon="users">
    Génération de sous-agents en arrière-plan.
  </Card>
  <Card title="Sessions" href="/fr/concepts/session" icon="comments">
    Fonctionnement des clés de session et comment `--to`, `--agent` et `--session-id` les résolvent.
  </Card>
  <Card title="Commandes slash" href="/fr/tools/slash-commands" icon="slash">
    Catalogue de commandes natif utilisé dans les sessions d'agent.
  </Card>
</CardGroup>
