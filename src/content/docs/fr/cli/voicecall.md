---
summary: "Référence CLI pour `openclaw voicecall` (surface de commande du plugin voice-call)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall setup|smoke|call|continue|dtmf|status|tail|expose`
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` est une commande fournie par un plugin. Elle n'apparaît que si le plugin voice-call est installé et activé.

Lorsque le Gateway est en cours d'exécution, les commandes opérationnelles (`call`, `start`,
`continue`, `speak`, `dtmf`, `end` et `status`) sont envoyées au runtime d'appel vocal de ce Gateway.
Si aucun Gateway n'est accessible, elles reviennent par défaut à un runtime CLI autonome.

Documentation principale :

- Plugin d'appel vocal : [Voice Call](/fr/plugins/voice-call)

## Commandes courantes

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --json
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

`setup` affiche des vérifications de disponibilité lisibles par l'humain par défaut. Utilisez `--json` pour
les scripts :

```bash
openclaw voicecall setup --json
```

`status` affiche les appels actifs au format JSON par défaut. Passez `--call-id <id>` pour inspecter
un appel.

Pour les fournisseurs externes (`twilio`, `telnyx`, `plivo`), la configuration doit résoudre une URL de webhook publique à partir de `publicUrl`, d'un tunnel ou d'une exposition Tailscale. Un repli sur un serveur de bouclement/privé est rejeté car les opérateurs ne peuvent pas l'atteindre.

`smoke` exécute les mêmes vérifications de disponibilité. Il ne passera pas de véritable appel téléphonique
à moins que `--to` et `--yes` ne soient tous deux présents :

```bash
openclaw voicecall smoke --to "+15555550123"        # dry run
openclaw voicecall smoke --to "+15555550123" --yes  # live notify call
```

## Exposition des webhooks (Tailscale)

```bash
openclaw voicecall expose --mode serve
openclaw voicecall expose --mode funnel
openclaw voicecall expose --mode off
```

Note de sécurité : n'exposez le point de terminaison du webhook qu'aux réseaux de confiance. Préférez Tailscale Serve à Funnel lorsque cela est possible.

## Connexes

- [Référence CLI](/fr/cli)
- [Plugin d'appel vocal](/fr/plugins/voice-call)
