---
summary: "CLIRéférence CLI pour `openclaw sessions` (liste des sessions stockées + utilisation)"
read_when:
  - You want to list stored sessions and see recent activity
title: "Sessions"
---

# `openclaw sessions`

Lister les sessions de conversation stockées.

Les listes de sessions ne sont pas des vérifications de disponibilité des channel/provider. Elles affichent les lignes de conversation persistantes provenant des magasins de sessions. Un Discord, Slack, Telegram ou autre channel calme peut se reconnecter avec succès sans créer de nouvelle ligne de session tant qu'un message n'est pas traité. Utilisez DiscordSlackTelegram`openclaw channels status --probe`, `openclaw status --deep` ou `openclaw health --verbose` lorsque vous avez besoin d'une connectivité channel en direct.

Les réponses `openclaw sessions`Gateway et Gateway `sessions.list`CLIGatewayCLI sont limitées par défaut afin que les grands magasins à longue durée de vie ne puissent pas monopoliser le processus CLI ou la boucle d'événements Gateway. La CLI renvoie les 100 sessions les plus récentes par défaut ; passez `--limit <n>` pour une fenêtre plus petite ou plus grande, ou `--limit all` lorsque vous avez intentionnellement besoin du magasin complet. Les réponses JSON incluent `totalCount`, `limitApplied` et `hasMore` lorsque les appelants doivent montrer qu'il existe plus de lignes.

Les clients RPC peuvent passer RPC`configuredAgentsOnly: true` pour conserver la source de découverte combinée large mais ne renvoyer que les lignes des agents actuellement présents dans la configuration. L'interface de contrôle utilise ce mode par défaut afin que les magasins d'agents supprimés ou sur disque uniquement ne réapparaissent pas dans la vue Sessions.

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --limit 25
openclaw sessions --verbose
openclaw sessions --json
```

Sélection de la portée :

- par défaut : magasin d'agents par défaut configuré
- `--verbose` : journalisation détaillée
- `--agent <id>` : un magasin d'agents configuré
- `--all-agents` : agréger tous les magasins d'agents configurés
- `--store <path>` : chemin de magasin explicite (ne peut pas être combiné avec `--agent` ou `--all-agents`)
- `--limit <n|all>` : nombre maximum de lignes à afficher (par défaut `100` ; `all` restaure l'affichage complet)

Exporter un bundle de trajectoire pour une session stockée :

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

C'est le chemin de commande utilisé par la commande slash `/export-trajectory` après
que le propriétaire a approuvé la demande d'exécution. Le répertoire de sortie est toujours résolu
à l'intérieur de `.openclaw/trajectory-exports/` sous l'espace de travail sélectionné.

`openclaw sessions --all-agents` lit les magasins d'agents configurés. La découverte de Gateway et de session ACP
est plus large : elle inclut également les magasins sur disque uniquement trouvés sous
la racine `agents/` par défaut ou une racine `session.store` basée sur un modèle. Ces
magasins découverts doivent correspondre à des fichiers `sessions.json` réguliers à l'intérieur de
la racine de l'agent ; les liens symboliques et les chemins hors racine sont ignorés.

Exemples JSON :

`openclaw sessions --all-agents --json` :

```json
{
  "path": null,
  "stores": [
    { "agentId": "main", "path": "/home/user/.openclaw/agents/main/sessions/sessions.json" },
    { "agentId": "work", "path": "/home/user/.openclaw/agents/work/sessions/sessions.json" }
  ],
  "allAgents": true,
  "count": 2,
  "totalCount": 2,
  "limitApplied": 100,
  "hasMore": false,
  "activeMinutes": null,
  "sessions": [
    { "agentId": "main", "key": "agent:main:main", "model": "gpt-5" },
    { "agentId": "work", "key": "agent:work:main", "model": "claude-opus-4-6" }
  ]
}
```

## Maintenance de nettoyage

Exécuter la maintenance maintenant (au lieu d'attendre le prochain cycle d'écriture) :

```bash
openclaw sessions cleanup --dry-run
openclaw sessions cleanup --agent work --dry-run
openclaw sessions cleanup --all-agents --dry-run
openclaw sessions cleanup --enforce
openclaw sessions cleanup --enforce --active-key "agent:main:telegram:direct:123"
openclaw sessions cleanup --dry-run --fix-dm-scope
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` utilise les paramètres `session.maintenance` de la configuration :

- Remarque sur la portée : `openclaw sessions cleanup` maintient les magasins de sessions, les transcriptions et les sidecars de trajectoire. Il ne nettoie pas les journaux d'exécution cron (`cron/runs/<jobId>.jsonl`), qui sont gérés par `cron.runLog.maxBytes` et `cron.runLog.keepLines` dans la [Configuration Cron](/fr/automation/cron-jobs#configuration) et expliqués dans la [Maintenance Cron](/fr/automation/cron-jobs#maintenance).
- Le nettoyage supprime également les transcriptions primaires non référencées, les points de contrôle de compactage et les sidecars de trajectoire plus anciens que `session.maintenance.pruneAfter` ; les fichiers encore référencés par `sessions.json` sont conservés.

- `--dry-run` : prévisualiser le nombre d'entrées qui seraient supprimées/limitées sans écriture.
  - En mode texte, dry-run affiche un tableau d'actions par session (`Action`, `Key`, `Age`, `Model`, `Flags`) afin que vous puissiez voir ce qui serait conservé ou supprimé.
- `--enforce` : appliquer la maintenance même si `session.maintenance.mode` est `warn`.
- `--fix-missing` : supprimer les entrées dont les fichiers de transcription sont manquants, même si elles ne seraient normalement pas encore obsolètes ou décomptées.
- `--fix-dm-scope` : lorsque `session.dmScope` est `main`, supprime les lignes obsolètes de DM directs indexées par homologue laissées par les routages précédents `per-peer`, `per-channel-peer` ou `per-account-channel-peer`. Utilisez d'abord `--dry-run` ; l'application du nettoyage supprime ces lignes de `sessions.json` et conserve leurs transcriptions en tant qu'archives supprimées.
- `--active-key <key>` : protéger une clé active spécifique contre l'expulsion due au budget disque. Les pointeurs de conversation externe durables, tels que les sessions de groupe et les sessions de discussion délimitées par un fil, sont également conservés par la maintenance de l'âge/nombre/budget disque.
- `--agent <id>` : exécuter le nettoyage pour un magasin d'agents configuré.
- `--all-agents` : exécuter le nettoyage pour tous les magasins d'agents configurés.
- `--store <path>` : exécuter sur un fichier `sessions.json` spécifique.
- `--json` : afficher un résumé JSON. Avec `--all-agents`, la sortie inclut un résumé par magasin.

Lorsqu'un Gateway est accessible, le nettoyage hors mode simulation (non-dry-run) pour les magasins d'agents configurés est envoyé via le Gateway afin qu'il partage le même enregistreur de magasin de sessions que le trafic d'exécution. Utilisez `--store <path>` pour une réparation hors ligne explicite d'un fichier de magasin.

`openclaw sessions cleanup --all-agents --dry-run --json` :

```json
{
  "allAgents": true,
  "mode": "warn",
  "dryRun": true,
  "stores": [
    {
      "agentId": "main",
      "storePath": "/home/user/.openclaw/agents/main/sessions/sessions.json",
      "beforeCount": 120,
      "afterCount": 80,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "missing": 0,
      "dmScopeRetired": 0,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

Connexes :

- Configuration de session : [Référence de configuration](/fr/gateway/config-agents#session)

## Connexes

- [Référence CLI](/fr/cli)
- [Gestion de session](/fr/concepts/session)
