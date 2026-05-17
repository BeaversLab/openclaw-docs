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
- `--session-id <id>`
- `--agent <id>`

Connexe :

- Outil d'envoi d'agent : [Agent send](/fr/tools/agent-send)

## Options

- `-m, --message <text>` : corps du message requis
- `-t, --to <dest>` : destinataire utilisé pour dériver la clé de session
- `--session-id <id>` : identifiant de session explicite
- `--agent <id>` : identifiant de l'agent ; remplace les liaisons de routage
- `--model <id>` : substitution de modèle pour cette exécution (`provider/model` ou identifiant de modèle)
- `--thinking <level>` : niveau de réflexion de l'agent (`off`, `minimal`, `low`, `medium`, `high`, plus les niveaux personnalisés pris en charge par le fournisseur tels que `xhigh`, `adaptive` ou `max`)
- `--verbose <on|off>` : rendre persistant le niveau verbose pour la session
- `--channel <channel>` : canal de livraison ; omettre pour utiliser le canal de session principal
- `--reply-to <target>` : substitution de la cible de livraison
- `--reply-channel <channel>` : substitution du canal de livraison
- `--reply-account <id>` : substitution du compte de livraison
- `--local` : exécuter l'agent intégré directement (après le préchargement du registre des plugins)
- `--deliver` : renvoyer la réponse au canal/cible sélectionné
- `--timeout <seconds>` : substituer le délai d'expiration de l'agent (par défaut 600 ou valeur de configuration)
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

- Le mode Gateway revient à l'agent intégré lorsque la requête Gateway échoue. Utilisez `--local` pour forcer l'exécution intégrée dès le départ.
- `--local` précharge toujours d'abord le registre des plugins, de sorte que les providers, outils et canaux fournis par les plugins restent disponibles lors des exécutions intégrées.
- `--local` et les exécutions de repli intégrées sont traitées comme des exécutions ponctuelles. Les ressources de bouclage MCP groupées et les sessions stdio Claude chaudes ouvertes pour ce processus local sont fermées après la réponse, de sorte que les invocations de script ne maintiennent pas les processus enfants locaux en vie.
- Les exécutions prises en charge par Gateway laissent les ressources de bouclage MCP possédées par Gateway sous le processus Gateway en cours d'exécution ; les clients plus anciens peuvent toujours envoyer l'indicateur de nettoyage historique, mais le Gateway l'accepte comme une absence d'opération de compatibilité.
- `--channel`, `--reply-channel` et `--reply-account` affectent la livraison de la réponse, pas le routage de session.
- `--json` réserve stdout pour la réponse JSON. Les diagnostics du Gateway, des plugins et du repli intégré sont acheminés vers stderr, ce qui permet aux scripts d'analyser stdout directement.
- Le JSON de repli intégré inclut `meta.transport: "embedded"` et `meta.fallbackFrom: "gateway"` afin que les scripts puissent distinguer les exécutions de repli des exécutions Gateway.
- Si le Gateway accepte une exécution d'agent mais que la CLI expire en attendant la réponse finale, le repli intégré utilise un identifiant session/exécution `gateway-fallback-*` explicite nouveau et signale `meta.fallbackReason: "gateway_timeout"` ainsi que les champs de session de repli. Cela évite de concurrencer le verrou de transcription propriété du Gateway ou de remplacer silencieusement la session de conversation routée d'origine.
- Lorsque cette commande déclenche la régénération `models.json`, les identifiants de provider gérés par SecretRef sont conservés sous forme de marqueurs non secrets (par exemple, les noms des variables d'environnement, `secretref-env:ENV_VAR_NAME` ou `secretref-managed`), et non sous forme de texte en clair de secrets résolus.
- Les écritures de marqueurs sont basées sur la source : OpenClaw persiste les marqueurs à partir de l'instantané de la configuration source active, et non à partir des valeurs de secret d'exécution résolues.

## État de livraison JSON

Lorsque `--json --deliver` est utilisé, la réponse JSON de la CLI peut inclure `deliveryStatus` de niveau supérieur afin que les scripts puissent distinguer les envois livrés, supprimés, partiels et échoués :

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

`deliveryStatus.status` est l'un de `sent`, `suppressed`, `partial_failed` ou `failed`. `suppressed` signifie que la livraison n'a pas été envoyée intentionnellement, par exemple un hook d'envoi de message l'a annulée ou il n'y avait aucun résultat visible ; c'est toujours un résultat terminal sans nouvelle tentative. `partial_failed` signifie qu'au moins une charge utile a été envoyée avant l'échec d'une charge ultérieure. `failed` signifie qu'aucun envoi durable n'a été terminé ou que la pré-vérification de livraison a échoué.

Les réponses CLI prises en charge par Gateway conservent également la forme brute du résultat Gateway, où le même objet est disponible à GatewayCLIGateway`result.deliveryStatus`.

Champs communs :

- `requested` : toujours `true` lorsque l'objet est présent.
- `attempted` : `true` après l'exécution du chemin d'envoi durable ; `false` pour les échecs de pré-vérification ou l'absence de charges utiles visibles.
- `succeeded` : `true`, `false` ou `"partial"` ; `"partial"` s'associe à `status: "partial_failed"`.
- `reason` : une raison en minuscules snake_case issue de la livraison durable ou de la validation de pré-vérification. Les raisons connues incluent `cancelled_by_message_sending_hook`, `no_visible_payload`, `no_visible_result`, `channel_resolved_to_internal`, `unknown_channel`, `invalid_delivery_target` et `no_delivery_target` ; les envois durables ayant échoué peuvent également signaler l'étape ayant échoué. Traitez les valeurs inconnues comme opaques car l'ensemble peut s'étendre.
- `resultCount` : nombre de résultats d'envoi de canal lorsque disponibles.
- `sentBeforeError` : `true` lorsqu'un échec partiel a envoyé au moins une charge utile avant l'erreur.
- `error` : booléen `true` pour les envois ayant échoué ou partiellement échoué.
- `errorMessage` : inclus uniquement lorsqu'un message d'erreur de livraison sous-jacent est capturé. Les échecs de pré-vol transportent `error` et `reason` mais pas `errorMessage`.
- `payloadOutcomes` : résultats par charge utile facultatifs avec `index`, `status`, `reason`, `resultCount`, `error`, `stage`, `sentBeforeError`, ou les métadonnées du hook lorsqu'elles sont disponibles.

## Connexes

- [Référence CLI](/fr/cli)
- [Runtime de l'agent](/fr/concepts/agent)
