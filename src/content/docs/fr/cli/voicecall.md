---
summary: "Référence CLI pour `openclaw voicecall` (surface de commande du plugin voice-call)"
read_when:
  - You use the voice-call plugin and want the CLI entry points
  - You want quick examples for `voicecall setup|smoke|call|continue|dtmf|status|tail|expose`
title: "Voicecall"
---

# `openclaw voicecall`

`voicecall` est une commande fournie par un plugin. Elle n'apparaît que si le plugin voice-call est installé et activé.

Documentation principale :

- Plugin Voice-call : [Voice Call](/fr/plugins/voice-call)

## Commandes courantes

```bash
openclaw voicecall setup
openclaw voicecall smoke
openclaw voicecall status --call-id <id>
openclaw voicecall call --to "+15555550123" --message "Hello" --mode notify
openclaw voicecall continue --call-id <id> --message "Any questions?"
openclaw voicecall dtmf --call-id <id> --digits "ww123456#"
openclaw voicecall end --call-id <id>
```

`setup` imprime des vérifications de lisibilité lisibles par l'homme par défaut. Utilisez `--json` pour
les scripts :

```bash
openclaw voicecall setup --json
```

Pour les fournisseurs externes (`twilio`, `telnyx`, `plivo`), la configuration doit résoudre une
URL de webhook publique à partir de `publicUrl`, d'un tunnel ou d'une exposition Tailscale. Un serveur de
rebouclage/privé de secours est rejeté car les opérateurs ne peuvent pas l'atteindre.

`smoke` exécute les mêmes vérifications de lisibilité. Il ne passera pas de véritable appel téléphonique
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

Remarque de sécurité : n'exposez le point de terminaison du webhook qu'aux réseaux de confiance. Privilégiez Tailscale Serve à Funnel lorsque cela est possible.

## Connexes

- [Référence CLI](/fr/cli)
- [Plugin Voice call](/fr/plugins/voice-call)
