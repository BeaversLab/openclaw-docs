---
summary: "CLIRéférence CLI pour `openclaw agent`Gateway (envoyer un tour d'agent via le Gateway)"
read_when:
  - You want to run one agent turn from scripts (optionally deliver reply)
title: "Agent"
---

# `openclaw agent`

Exécuter un tour d'agent via le Gateway (utiliser Gateway`--local` pour l'intégré).
Utiliser `--agent <id>` pour cibler directement un agent configuré.

Transmettez au moins un sélecteur de session :

- `--to <dest>`
- `--session-key <key>`
- `--session-id <id>`
- `--agent <id>`

Connexes :

- Outil d'envoi d'agent : [Agent send](/fr/tools/agent-send)

## Options

- `-m, --message <text>` : corps du message requis
- `-t, --to <dest>` : destinataire utilisé pour dériver la clé de session
- `--session-key <key>` : clé de session explicite à utiliser pour le routage
- `--session-id <id>` : identifiant de session explicite
- `--agent <id>` : identifiant de l'agent ; remplace les liaisons de routage
- `--model <id>` : remplacement du model pour cette exécution (`provider/model` ou identifiant de model)
- `--thinking <level>` : niveau de réflexion de l'agent (`off`, `minimal`, `low`, `medium`, `high`, plus les niveaux personnalisés pris en charge par le provider tels que `xhigh`, `adaptive` ou `max`)
- `--verbose <on|off>` : conserver le niveau verbosité pour la session
- `--channel <channel>` : channel de livraison ; omettre pour utiliser le channel de session principal
- `--reply-to <target>` : remplacement de la cible de livraison
- `--reply-channel <channel>` : remplacement du channel de livraison
- `--reply-account <id>` : remplacement du compte de livraison
- `--local` : exécuter l'agent intégré directement (après le préchargement du registre des plugins)
- `--deliver` : renvoyer la réponse au channel/cible sélectionné
- `--timeout <seconds>` : remplacer le délai d'expiration de l'agent (par défaut 600 ou valeur de configuration)
- `--json` : sortie JSON

## Exemples

```bash
openclaw agent --to +15555550123 --message "status update" --deliver
openclaw agent --agent ops --message "Summarize logs"
openclaw agent --agent ops --model openai/gpt-5.4 --message "Summarize logs"
openclaw agent --session-key agent:ops:incident-42 --message "Summarize status"
openclaw agent --agent ops --session-key incident-42 --message "Summarize status"
openclaw agent --session-id 1234 --message "Summarize inbox" --thinking medium
openclaw agent --to +15555550123 --message "Trace logs" --verbose on --json
openclaw agent --agent ops --message "Generate report" --deliver --reply-channel slack --reply-to "#reports"
openclaw agent --agent ops --message "Run locally" --local
```

## Notes

- Le mode Gateway revient à l'agent intégré lorsque la demande Gateway échoue. Utilisez GatewayGateway`--local` pour forcer l'exécution intégrée dès le début.
- `--local` précharge toujours d'abord le registre des plugins, de sorte que les providers, tools et channels fournis par les plugins restent disponibles lors des exécutions intégrées.
- Les exécutions `--local` et de repli intégré sont traitées comme des exécutions ponctuelles. Les ressources de bouclage MCP groupées et les sessions stdio Claude chaudes ouvertes pour ce processus local sont fermées après la réponse, de sorte que les appels de script ne maintiennent pas les processus enfants locaux en vie.
- Les exécutions prises en charge par Gateway laissent les ressources de bouclage MCP détenues par Gateway sous le processus Gateway en cours d'exécution ; les clients plus anciens peuvent encore envoyer l'indicateur de nettoyage historique, mais Gateway l'accepte comme une compatibilité sans effet.
- `--channel`, `--reply-channel` et `--reply-account` affectent la livraison de la réponse, et non le routage de session.
- `--session-key` sélectionne une clé de session explicite. Les clés préfixées par agent doivent utiliser `agent:<agent-id>:<session-key>`, et `--agent` doit correspondre à l'identifiant de l'agent de la clé lorsque les deux sont fournis. Les clés nues non sentinelles sont délimitées à `--agent` lorsqu'elles sont fournies, ou sinon à l'agent par défaut configuré ; par exemple, `--agent ops --session-key incident-42` achemine vers `agent:ops:incident-42`. Les littéraux `global` et `unknown` restent sans portée uniquement lorsqu'aucun `--agent` n'est fourni ; dans ce cas, le repli intégré et la propriété du magasin utilisent l'agent par défaut configuré.
- `--json` garde stdout réservé pour la réponse JSON. Les diagnostics de Gateway, des plugins et du repli intégré sont acheminés vers stderr, afin que les scripts puissent analyser stdout directement.
- Le JSON de repli intégré inclut `meta.transport: "embedded"` et `meta.fallbackFrom: "gateway"` afin que les scripts puissent distinguer les exécutions de repli des exécutions Gateway.
- Si le Gateway accepte une exécution d'agent mais que le CLI expire en attendant la réponse finale, le repli intégré utilise un identifiant d'exécution/de session `gateway-fallback-*` explicite frais et signale `meta.fallbackReason: "gateway_timeout"` ainsi que les champs de session de repli. Cela évite de concurrencer le verrou de transcription détenu par Gateway ou de remplacer silencieusement la session de conversation acheminée d'origine.
- Pour les exécutions prises en charge par le Gateway, Gateway`SIGTERM` et `SIGINT`CLIGatewayCLI interrompent la requête CLI en attente. Si le Gateway a déjà accepté l'exécution, la CLI envoie également `chat.abort` pour cet identifiant d'exécution accepté avant de quitter. Les exécutions locales `--local` et les exécutions de repli intégrées reçoivent le même signal d'abandon, mais n'envoient pas `chat.abort`. Si un `--run-id`Gateway en double atteint le Gateway pendant que l'exécution de l'agent d'origine est toujours active, la réponse en double signale `status: "in_flight"`CLI et l'interface CLI non-JSON imprime un diagnostic stderr au lieu d'une réponse vide. Pour les wrappers externes cron/systemd, gardez un filet de sécurité d'arrêt forcé externe tel que `timeout -k 60 600 openclaw agent ...` afin que le superviseur puisse toujours récolter le processus si l'arrêt ne peut pas drainer.
- Lorsque cette commande déclenche la régénération de `models.json`, les identifiants de fournisseur gérés par SecretRef sont conservés sous forme de marqueurs non secrets (par exemple des noms de variables d'environnement, `secretref-env:ENV_VAR_NAME` ou `secretref-managed`), et non en tant que texte brut de secrets résolus.
- Les écritures de marqueurs sont autoritaires par rapport à la source : OpenClaw conserve les marqueurs à partir de l'instantané de la configuration source active, et non à partir des valeurs de secrets d'exécution résolus.

## Statut de livraison JSON

Lorsque `--json --deliver`CLI est utilisé, la réponse JSON de la CLI peut inclure un `deliveryStatus` de premier niveau afin que les scripts puissent distinguer les envois réussis, supprimés, partiels et échoués :

```json
{
  "payloads": [{ "text": "Report ready", "mediaUrl": null }],
  "meta": { "durationMs": 1200 },
  "deliveryStatus": {
    "requested": true,
    "attempted": true,
    "status": "sent",
    "succeeded": true,
    "resultCount": 1
  }
}
```

`deliveryStatus.status` est l'un des éléments suivants : `sent`, `suppressed`, `partial_failed` ou `failed`. `suppressed` signifie que la livraison n'a pas été envoyée intentionnellement, par exemple un hook d'envoi de message l'a annulée ou il n'y avait aucun résultat visible ; c'est toujours un résultat terminal sans nouvelle tentative. `partial_failed` signifie qu'au moins une charge utile a été envoyée avant l'échec d'une charge ultérieure. `failed` signifie qu'aucun envoi durable n'a été terminé ou que la pré-vérification de livraison a échoué.

Les réponses CLI soutenues par GatewayCLI préservent également la forme du résultat brut de Gateway, où le même objet est disponible sur `result.deliveryStatus`.

Champs courants :

- `requested` : toujours `true` lorsque l'objet est présent.
- `attempted` : `true` après l'exécution du chemin d'envoi durable ; `false` pour les échecs de pré-vol ou aucun charge utile visible.
- `succeeded` : `true`, `false`, ou `"partial"` ; `"partial"` va de pair avec `status: "partial_failed"`.
- `reason` : une raison en snake_case minuscule issue de la livraison durable ou de la validation de pré-vol. Les raisons connues incluent `cancelled_by_message_sending_hook`, `no_visible_payload`, `no_visible_result`, `channel_resolved_to_internal`, `unknown_channel`, `invalid_delivery_target` et `no_delivery_target` ; les envois durables échoués peuvent également signaler l'étape échouée. Traitez les valeurs inconnues comme opaques car l'ensemble peut s'étendre.
- `resultCount` : nombre de résultats d'envoi de channel lorsque disponibles.
- `sentBeforeError` : `true` lorsqu'un échec partiel a envoyé au moins une charge utile avant l'erreur.
- `error` : booléen `true` pour les envois échoués ou partiellement échoués.
- `errorMessage` : inclus uniquement lorsqu'un message d'erreur de livraison sous-jacent est capturé. Les échecs de pré-vol comportent `error` et `reason` mais pas `errorMessage`.
- `payloadOutcomes` : résultats optionnels par charge utile avec `index`, `status`, `reason`, `resultCount`, `error`, `stage`, `sentBeforeError`, ou les métadonnées de hook lorsque disponibles.

## Connexes

- [Référence CLI](/fr/cli)
- [Runtime de l'agent](/fr/concepts/agent)
