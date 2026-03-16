---
summary: "Restrictions de Sandbox + tool par agent, précédence et exemples"
title: Multi-Agent Sandbox & Tools
read_when: "Vous souhaitez un sandboxing par agent ou des politiques d'autorisation/refus de tool par agent dans une passerelle multi-agent."
status: active
---

# Configuration Multi-Agent Sandbox & Tools

## Vue d'ensemble

Chaque agent dans une configuration multi-agent peut désormais avoir son propre :

- **Configuration du Sandbox** (`agents.list[].sandbox` remplace `agents.defaults.sandbox`)
- **Restrictions de tool** (`tools.allow` / `tools.deny`, plus `agents.list[].tools`)

Cela vous permet d'exécuter plusieurs agents avec différents profils de sécurité :

- Assistant personnel avec accès complet
- Agents famille/travail avec outils restreints
- Agents publics dans des sandboxes

`setupCommand` appartient sous `sandbox.docker` (global ou par agent) et s'exécute une fois
lorsque le conteneur est créé.

L'auth est par agent : chaque agent lit depuis son propre magasin d'auth `agentDir` à :

```
~/.openclaw/agents/<agentId>/agent/auth-profiles.json
```

Les identifiants ne sont **pas** partagés entre les agents. Ne réutilisez jamais `agentDir` entre les agents.
Si vous souhaitez partager des identifiants, copiez `auth-profiles.json` dans le `agentDir` de l'autre agent.

Pour savoir comment le sandboxing se comporte à l'exécution, consultez [Sandboxing](/fr/gateway/sandboxing).
Pour le débogage de "pourquoi est-ce bloqué ?", consultez [Sandbox vs Tool Policy vs Elevated](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) et `openclaw sandbox explain`.

---

## Exemples de configuration

### Exemple 1 : Agent personnel + Agent famille restreint

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "name": "Personal Assistant",
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "family",
        "name": "Family Bot",
        "workspace": "~/.openclaw/workspace-family",
        "sandbox": {
          "mode": "all",
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"]
        }
      }
    ]
  },
  "bindings": [
    {
      "agentId": "family",
      "match": {
        "provider": "whatsapp",
        "accountId": "*",
        "peer": {
          "kind": "group",
          "id": "120363424282127706@g.us"
        }
      }
    }
  ]
}
```

**Résultat :**

- agent `main` : S'exécute sur l'hôte, accès complet aux outils
- agent `family` : S'exécute dans Docker (un conteneur par agent), uniquement le tool `read`

---

### Exemple 2 : Agent de travail avec Sandbox partagé

```json
{
  "agents": {
    "list": [
      {
        "id": "personal",
        "workspace": "~/.openclaw/workspace-personal",
        "sandbox": { "mode": "off" }
      },
      {
        "id": "work",
        "workspace": "~/.openclaw/workspace-work",
        "sandbox": {
          "mode": "all",
          "scope": "shared",
          "workspaceRoot": "/tmp/work-sandboxes"
        },
        "tools": {
          "allow": ["read", "write", "apply_patch", "exec"],
          "deny": ["browser", "gateway", "discord"]
        }
      }
    ]
  }
}
```

---

### Exemple 2b : Profil de codage global + agent de messagerie uniquement

```json
{
  "tools": { "profile": "coding" },
  "agents": {
    "list": [
      {
        "id": "support",
        "tools": { "profile": "messaging", "allow": ["slack"] }
      }
    ]
  }
}
```

**Résultat :**

- les agents par défaut obtiennent les outils de codage
- l'agent `support` est uniquement de messagerie (+ outil Slack)

---

### Exemple 3 : Différents modes de Sandbox par Agent

```json
{
  "agents": {
    "defaults": {
      "sandbox": {
        "mode": "non-main", // Global default
        "scope": "session"
      }
    },
    "list": [
      {
        "id": "main",
        "workspace": "~/.openclaw/workspace",
        "sandbox": {
          "mode": "off" // Override: main never sandboxed
        }
      },
      {
        "id": "public",
        "workspace": "~/.openclaw/workspace-public",
        "sandbox": {
          "mode": "all", // Override: public always sandboxed
          "scope": "agent"
        },
        "tools": {
          "allow": ["read"],
          "deny": ["exec", "write", "edit", "apply_patch"]
        }
      }
    ]
  }
}
```

---

## Priorité de la configuration

Lorsque les configurations globales (`agents.defaults.*`) et spécifiques à l'agent (`agents.list[].*`) existent toutes deux :

### Configuration du Sandbox

Les paramètres spécifiques à l'agent remplacent les paramètres globaux :

```
agents.list[].sandbox.mode > agents.defaults.sandbox.mode
agents.list[].sandbox.scope > agents.defaults.sandbox.scope
agents.list[].sandbox.workspaceRoot > agents.defaults.sandbox.workspaceRoot
agents.list[].sandbox.workspaceAccess > agents.defaults.sandbox.workspaceAccess
agents.list[].sandbox.docker.* > agents.defaults.sandbox.docker.*
agents.list[].sandbox.browser.* > agents.defaults.sandbox.browser.*
agents.list[].sandbox.prune.* > agents.defaults.sandbox.prune.*
```

**Notes :**

- `agents.list[].sandbox.{docker,browser,prune}.*` remplace `agents.defaults.sandbox.{docker,browser,prune}.*` pour cet agent (ignoré lorsque la portée du sandbox est résolue à `"shared"`).

### Restrictions d'outils

L'ordre de filtrage est le suivant :

1. **Profil d'outil** (`tools.profile` ou `agents.list[].tools.profile`)
2. **Profil d'outil de provider** (`tools.byProvider[provider].profile` ou `agents.list[].tools.byProvider[provider].profile`)
3. **Stratégie d'outil globale** (`tools.allow` / `tools.deny`)
4. **Stratégie d'outil de provider** (`tools.byProvider[provider].allow/deny`)
5. **Stratégie d'outil spécifique à l'agent** (`agents.list[].tools.allow/deny`)
6. **Stratégie de provider d'agent** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **Stratégie d'outil de Sandbox** (`tools.sandbox.tools` ou `agents.list[].tools.sandbox.tools`)
8. **Stratégie d'outil de sous-agent** (`tools.subagents.tools`, le cas échéant)

Chaque niveau peut restreindre davantage les outils, mais ne peut pas rétablir les outils refusés des niveaux précédents.
Si `agents.list[].tools.sandbox.tools` est défini, il remplace `tools.sandbox.tools` pour cet agent.
Si `agents.list[].tools.profile` est défini, il remplace `tools.profile` pour cet agent.
Les clés d'outil de provider acceptent soit `provider` (par ex. `google-antigravity`) soit `provider/model` (par ex. `openai/gpt-5.2`).

### Groupes d'outils (raccourcis)

Les stratégies d'outil (globale, agent, sandbox) prennent en charge les entrées `group:*` qui s'étendent à plusieurs outils concrets :

- `group:runtime` : `exec`, `bash`, `process`
- `group:fs` : `read`, `write`, `edit`, `apply_patch`
- `group:sessions` : `sessions_list`, `sessions_history`, `sessions_send`, `sessions_spawn`, `session_status`
- `group:memory` : `memory_search`, `memory_get`
- `group:ui` : `browser`, `canvas`
- `group:automation` : `cron`, `gateway`
- `group:messaging` : `message`
- `group:nodes` : `nodes`
- `group:openclaw` : tous les outils OpenClaw intégrés (exclut les plugins provider)

### Mode élevé

`tools.elevated` est la base globale (liste blanche basée sur l'expéditeur). `agents.list[].tools.elevated` peut restreindre davantage le mode élevé pour des agents spécifiques (les deux doivent autoriser).

Modèles d'atténuation :

- Refuser `exec` pour les agents non fiables (`agents.list[].tools.deny: ["exec"]`)
- Évitez de mettre sur liste blanche les expéditeurs qui acheminent vers des agents restreints
- Désactiver le mode élevé globalement (`tools.elevated.enabled: false`) si vous ne voulez que l'exécution sandboxed
- Désactiver le mode élevé par agent (`agents.list[].tools.elevated.enabled: false`) pour les profils sensibles

---

## Migration depuis un agent unique

**Avant (agent unique) :**

```json
{
  "agents": {
    "defaults": {
      "workspace": "~/.openclaw/workspace",
      "sandbox": {
        "mode": "non-main"
      }
    }
  },
  "tools": {
    "sandbox": {
      "tools": {
        "allow": ["read", "write", "apply_patch", "exec"],
        "deny": []
      }
    }
  }
}
```

**Après (multi-agent avec différents profils) :**

```json
{
  "agents": {
    "list": [
      {
        "id": "main",
        "default": true,
        "workspace": "~/.openclaw/workspace",
        "sandbox": { "mode": "off" }
      }
    ]
  }
}
```

Les configurations `agent.*` héritées sont migrées par `openclaw doctor` ; privilégiez `agents.defaults` + `agents.list` à l'avenir.

---

## Exemples de restriction d'outils

### Agent en lecture seule

```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### Agent à exécution sécurisée (pas de modification de fichiers)

```json
{
  "tools": {
    "allow": ["read", "exec", "process"],
    "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
  }
}
```

### Agent de communication uniquement

```json
{
  "tools": {
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

---

## Piège courant : "non-main"

`agents.defaults.sandbox.mode: "non-main"` est basé sur `session.mainKey` (par défaut `"main"`),
non sur l'identifiant de l'agent. Les sessions de groupe/canal obtiennent toujours leurs propres clés, elles sont donc traitées comme non principales et seront sandboxées. Si vous ne voulez pas qu'un agent soit jamais sandboxé, définissez `agents.list[].sandbox.mode: "off"`.

---

## Tests

Après avoir configuré le sandbox multi-agent et les outils :

1. **Vérifier la résolution de l'agent :**

   ```exec
   openclaw agents list --bindings
   ```

2. **Vérifier les conteneurs sandbox :**

   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **Tester les restrictions d'outils :**
   - Envoyer un message nécessitant des outils restreints
   - Vérifier que l'agent ne peut pas utiliser les outils refusés

4. **Surveiller les journaux :**
   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## Dépannage

### Agent non sandboxé malgré `mode: "all"`

- Vérifiez s'il existe un `agents.defaults.sandbox.mode` global qui le remplace
- La configuration spécifique à l'agent est prioritaire, définissez donc `agents.list[].sandbox.mode: "all"`

### Outils toujours disponibles malgré la liste de refus

- Vérifiez l'ordre de filtrage des outils : global → agent → sandbox → sous-agent
- Chaque niveau peut uniquement restreindre davantage, pas rétablir
- Vérifiez avec les journaux : `[tools] filtering tools for agent:${agentId}`

### Conteneur non isolé par agent

- Définissez `scope: "agent"` dans la configuration sandbox spécifique à l'agent
- La valeur par défaut est `"session"` qui crée un conteneur par session

---

## Voir aussi

- [Routage multi-agent](/fr/concepts/multi-agent)
- [Configuration du Sandbox](/fr/gateway/configuration#agentsdefaults-sandbox)
- [Gestion de session](/fr/concepts/session)

import fr from "/components/footer/fr.mdx";

<fr />
