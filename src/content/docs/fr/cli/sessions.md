---
summary: "CLIRéférence CLI pour `openclaw sessions` (liste des sessions stockées + utilisation)"
read_when:
  - You want to list stored sessions and see recent activity
title: "Sessions"
---

# `openclaw sessions`

Lister les sessions de conversation stockées.

Les listes de sessions ne sont pas des vérifications de vivacité du canal/provider. Elles affichent les lignes de conversation persistantes provenant des magasins de sessions. Un Discord, Slack, Telegram ou autre canal calme peut se reconnecter avec succès sans créer de nouvelle ligne de session tant qu'un message n'est pas traité. Utilisez `openclaw channels status --probe`, `openclaw status --deep` ou `openclaw health --verbose` lorsque vous avez besoin d'une connectivité en direct avec le canal.

Les réponses `openclaw sessions` et Gateway `sessions.list` sont limitées par défaut, afin que les grands magasins à long terme ne puissent pas monopoliser le processus CLI ou la boucle d'événements Gateway. La CLI renvoie les 100 sessions les plus récentes par défaut ; passez `--limit <n>` pour une fenêtre plus petite ou plus grande, ou `--limit all` lorsque vous avez intentionnellement besoin du magasin complet. Les réponses JSON incluent `totalCount`, `limitApplied` et `hasMore` lorsque les appelants doivent montrer que d'autres lignes existent.

Les clients RPC peuvent passer `configuredAgentsOnly: true` pour conserver la source de découverte combinée large, mais ne renvoyer que les lignes des agents actuellement présents dans la configuration. L'interface de contrôle utilise ce mode par défaut afin que les magasins d'agents supprimés ou uniquement sur disque ne réapparaissent pas dans la vue Sessions.

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
- `--verbose` : journalisation détaillée
- `--agent <id>` : un magasin d'agents configuré
- `--all-agents` : agréger tous les magasins d'agents configurés
- `--store <path>` : chemin de magasin explicite (ne peut pas être combiné avec `--agent` ou `--all-agents`)
- `--limit <n|all>` : nombre maximal de lignes à afficher (par défaut `100` ; `all` restaure l'affichage complet)

Suivre la progression de trajectoire lisible par l'humain pour les sessions stockées :

```bash
openclaw sessions tail
openclaw sessions tail --follow
openclaw sessions tail --session-key "agent:main:telegram:direct:123" --tail 25
openclaw sessions --agent work tail --follow
openclaw sessions --all-agents tail --follow
```

`openclaw sessions tail` restitue les événements JSONL de trajectoire récents sous forme de lignes de progression compactes. Sans `--session-key`, il suit d'abord les sessions en cours d'exécution, puis la dernière session stockée. `--tail <count>` contrôle le nombre d'événements existants affichés avant le mode suivi ; la valeur par défaut est `80`, et `0` commence à la fin actuelle. `--follow` continue à surveiller les fichiers de trajectoire sélectionnés, y compris les fichiers déplacés référencés par `<session>.trajectory-path.json`.

La vue de progression est intentionnellement conservatrice : le texte du prompt, les arguments des outils et les corps des résultats des outils ne sont pas imprimés. Les appels d'outils affichent le nom de l'outil avec `{...redacted...}` ; les résultats des outils affichent un statut tel que `ok`, `error` ou `done` ; les lignes de complétion de modèle affichent le fournisseur/modèle et le statut final.

Exporter un bundle de trajectoire pour une session stockée :

```bash
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --workspace .
openclaw sessions export-trajectory --session-key "agent:main:telegram:direct:123" --output bug-123 --json
```

C'est le chemin de commande utilisé par la commande slash `/export-trajectory` après
que le propriétaire a approuvé la demande d'exécution. Le répertoire de sortie est toujours résolu
à l'intérieur de `.openclaw/trajectory-exports/` sous l'espace de travail sélectionné.

`openclaw sessions --all-agents` lit les magasins d'agents configurés. La découverte de sessions Gateway et ACP
est plus large : elle inclut également les magasins sur disque uniquement trouvés sous
la racine `agents/` par défaut ou une racine `session.store` modélisée. Ces
magasins découverts doivent résoudre en fichiers `sessions.json` réguliers à l'intérieur de
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

- Note de portée : `openclaw sessions cleanup` maintient les magasins de sessions, les transcriptions et les fichiers annexes de trajectoire. Il ne nettoie pas l'historique des exécutions cron, qui est géré par `cron.runLog.keepLines` dans [Configuration Cron](/fr/automation/cron-jobs#configuration) et expliqué dans [Maintenance Cron](/fr/automation/cron-jobs#maintenance).
- Le nettoyage supprime également les transcriptions primaires non référencées, les points de contrôle de compactage et les fichiers annexes de trajectoire plus anciens que `session.maintenance.pruneAfter` ; les fichiers encore référencés par `sessions.json` sont conservés.

- `--dry-run` : prévisualiser le nombre d'entrées qui seraient supprimées/limitées sans écrire.
  - En mode texte, dry-run affiche un tableau d'actions par session (`Action`, `Key`, `Age`, `Model`, `Flags`) afin que vous puissiez voir ce qui serait conservé par rapport à ce qui serait supprimé.
- `--enforce` : appliquer la maintenance même lorsque `session.maintenance.mode` est `warn`.
- `--fix-missing` : supprimer les entrées dont les fichiers de transcription sont manquants ou ne contiennent que des en-têtes/sont vides, même si elles ne seraient normalement pas encore expirées ou éliminées par comptage.
- `--fix-dm-scope` : lorsque `session.dmScope` est `main`, mettre hors service les lignes obsolètes de DM directs indexées par homologue laissées par l'ancien routage `per-peer`, `per-channel-peer` ou `per-account-channel-peer`. Utilisez d'abord `--dry-run` ; l'application du nettoyage supprime ces lignes de `sessions.json` et préserve leurs transcriptions en tant qu'archives supprimées.
- `--active-key <key>` : protéger une clé active spécifique contre l'expulsion due au budget disque. Les pointeurs de conversation externe durables, tels que les sessions de groupe et les sessions de discussion délimitées par fil, sont également conservés par la maintenance basée sur l'âge, le nombre ou le budget disque.
- `--agent <id>` : exécuter le nettoyage pour un magasin d'agents configuré.
- `--all-agents` : exécuter le nettoyage pour tous les magasins d'agents configurés.
- `--store <path>` : exécuter sur un fichier `sessions.json` spécifique.
- `--json` : imprimer un résumé JSON. Avec `--all-agents`, la sortie inclut un résumé par magasin.

Lorsqu'un Gateway est accessible, le nettoyage effectif (non dry-run) pour les magasins d'agents configurés est envoyé via le Gateway afin qu'il partage le même enregistreur de magasin de sessions que le trafic d'exécution. Utilisez `--store <path>` pour une réparation hors ligne explicite d'un fichier de magasin.

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

Connexe :

- Configuration de session : [Référence de configuration](/fr/gateway/config-agents#session)

## Connexe

- [Référence CLI](/fr/cli)
- [Gestion de session](/fr/concepts/session)
