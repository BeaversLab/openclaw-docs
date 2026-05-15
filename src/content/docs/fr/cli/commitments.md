---
summary: "CLIRéférence CLI pour `openclaw commitments` (inspecter et ignorer les suites déduites)"
read_when:
  - You want to inspect inferred follow-up commitments
  - You want to dismiss pending check-ins
  - You are auditing what heartbeat may deliver
title: "`openclaw commitments`"
---

Répertorier et gérer les engagements de suite déduits.

Les engagements sont des mémoires de suite opt-in et éphémères créées à partir du contexte de conversation. Voir [Engagements déduits](/fr/concepts/commitments) pour le guide conceptuel.

Sans sous-commande, `openclaw commitments` répertorie les engagements en attente.

## Utilisation

```bash
openclaw commitments [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments list [--all] [--agent <id>] [--status <status>] [--json]
openclaw commitments dismiss <id...> [--json]
```

## Options

- `--all` : afficher tous les statuts au lieu des seuls engagements en attente.
- `--agent <id>` : filtrer par un ID d'agent.
- `--status <status>` : filtrer par statut. Valeurs : `pending`, `sent`,
  `dismissed`, `snoozed` ou `expired`.
- `--json` : afficher du JSON lisible par machine.

## Exemples

Répertorier les engagements en attente :

```bash
openclaw commitments
```

Répertorier chaque engagement stocké :

```bash
openclaw commitments --all
```

Filtrer par un agent :

```bash
openclaw commitments --agent main
```

Trouver les engagements reportés :

```bash
openclaw commitments --status snoozed
```

Ignorer un ou plusieurs engagements :

```bash
openclaw commitments dismiss cm_abc123 cm_def456
```

Exporter en JSON :

```bash
openclaw commitments --all --json
```

## Sortie

La sortie texte inclut :

- ID d'engagement
- statut
- type
- heure d'échéance au plus tôt
- portée
- texte de point suggéré

La sortie JSON inclut également le chemin du magasin d'engagements et les enregistrements stockés complets.

## Connexes

- [Engagements déduits](/fr/concepts/commitments)
- [Aperçu de la mémoire](/fr/concepts/memory)
- [Heartbeat](/fr/gateway/heartbeat)
- [Tâches planifiées](/fr/automation/cron-jobs)
