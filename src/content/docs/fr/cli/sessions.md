---
summary: "Référence CLI pour `openclaw sessions` (liste des sessions stockées + utilisation)"
read_when:
  - You want to list stored sessions and see recent activity
title: "sessions"
---

# `openclaw sessions`

Lister les sessions de conversation stockées.

```bash
openclaw sessions
openclaw sessions --agent work
openclaw sessions --all-agents
openclaw sessions --active 120
openclaw sessions --json
```

Sélection de la portée :

- default : magasin d'agents par défaut configuré
- `--agent <id>` : un magasin d'agents configuré
- `--all-agents` : agréger tous les magasins d'agents configurés
- `--store <path>` : chemin de magasin explicite (ne peut pas être combiné avec `--agent` ou `--all-agents`)

`openclaw sessions --all-agents` lit les magasins d'agents configurés. La découverte de sessions Gateway et ACP est plus large : elle inclut également les magasins sur disque uniquement trouvés sous la racine `agents/` par défaut ou une racine `session.store` modélisée. Ces magasins découverts doivent correspondre à des fichiers `sessions.json` réguliers dans la racine de l'agent ; les liens symboliques et les chemins hors racine sont ignorés.

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
openclaw sessions cleanup --json
```

`openclaw sessions cleanup` utilise les paramètres `session.maintenance` de la configuration :

- Remarque sur la portée : `openclaw sessions cleanup` assure uniquement la maintenance des magasins/transcriptions de sessions. Il ne nettoie pas les journaux d'exécution cron (`cron/runs/<jobId>.jsonl`), qui sont gérés par `cron.runLog.maxBytes` et `cron.runLog.keepLines` dans la [Configuration Cron](/fr/automation/cron-jobs#configuration) et expliqués dans la [Maintenance Cron](/fr/automation/cron-jobs#maintenance).

- `--dry-run` : prévisualiser le nombre d'entrées qui seraient élaguées/plafonnées sans écrire.
  - En mode texte, dry-run imprime un tableau d'actions par session (`Action`, `Key`, `Age`, `Model`, `Flags`) afin que vous puissiez voir ce qui serait conservé par rapport à ce qui serait supprimé.
- `--enforce` : applique la maintenance même quand `session.maintenance.mode` est `warn`.
- `--active-key <key>` : protège une clé active spécifique contre l'expulsion due au budget disque.
- `--agent <id>` : exécute le nettoyage pour un magasin d'agents configuré.
- `--all-agents` : exécute le nettoyage pour tous les magasins d'agents configurés.
- `--store <path>` : exécute sur un fichier `sessions.json` spécifique.
- `--json` : affiche un résumé JSON. Avec `--all-agents`, la sortie inclut un résumé par magasin.

`openclaw sessions cleanup --all-agents --dry-run --json` :

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
      "pruned": 40,
      "capped": 0
    },
    {
      "agentId": "work",
      "storePath": "/home/user/.openclaw/agents/work/sessions/sessions.json",
      "beforeCount": 18,
      "afterCount": 18,
      "pruned": 0,
      "capped": 0
    }
  ]
}
```

Connexes :

- Configuration de session : [Référence de configuration](/fr/gateway/configuration-reference#session)
