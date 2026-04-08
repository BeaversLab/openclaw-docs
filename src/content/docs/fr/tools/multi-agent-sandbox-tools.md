---
summary: « Restrictions de Sandbox et d'outils par agent, priorité et exemples »
title: Multi-Agent Sandbox & Tools
read_when: « Vous souhaitez un sandboxing par agent ou des stratégies d'autorisation/refus d'outils par agent dans une passerelle multi-agent. »
status: active
---

# Configuration du Multi-Agent Sandbox & Tools

Chaque agent dans une configuration multi-agent peut remplacer la stratégie globale de Sandbox et d'outils. Cette page couvre la configuration par agent, les règles de priorité et les exemples.

- **Backends et modes de Sandbox** : voir [Sandboxing](/en/gateway/sandboxing).
- **Débogage des outils bloqués** : voir [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) et `openclaw sandbox explain`.
- **Exec élevé** : voir [Elevated Mode](/en/tools/elevated).

L'authentification est par agent : chaque agent lit depuis son propre magasin d'auth `agentDir` à
`~/.openclaw/agents/<agentId>/agent/auth-profiles.json`.
Les identifiants ne sont **pas** partagés entre les agents. Ne réutilisez jamais `agentDir` entre les agents.
Si vous souhaitez partager des identifiants, copiez `auth-profiles.json` dans le `agentDir` de l'autre agent.

---

## Exemples de configuration

### Exemple 1 : Agent personnel + Agent familial restreint

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
- agent `family` : S'exécute dans Docker (un conteneur par agent), seul l'outil `read`

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
- l'agent `support` est de messagerie uniquement (+ outil Slack)

---

### Exemple 3 : Différents modes de Sandbox par agent

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

Lorsque les configurations globales (`agents.defaults.*`) et spécifiques à l'agent (`agents.list[].*`) existent toutes les deux :

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

- `agents.list[].sandbox.{docker,browser,prune}.*` remplace `agents.defaults.sandbox.{docker,browser,prune}.*` pour cet agent (ignoré lorsque la portée du Sandbox est résolue à `"shared"`).

### Restrictions d'outils

L'ordre de filtrage est :

1. **Profil d'outils** (`tools.profile` ou `agents.list[].tools.profile`)
2. **Profil d'outils du fournisseur** (`tools.byProvider[provider].profile` ou `agents.list[].tools.byProvider[provider].profile`)
3. **Stratégie globale d'outils** (`tools.allow` / `tools.deny`)
4. **Stratégie d'outil du fournisseur** (`tools.byProvider[provider].allow/deny`)
5. **Stratégie d'outil spécifique à l'agent** (`agents.list[].tools.allow/deny`)
6. **Stratégie de fournisseur de l'agent** (`agents.list[].tools.byProvider[provider].allow/deny`)
7. **Stratégie d'outil du Sandbox** (`tools.sandbox.tools` ou `agents.list[].tools.sandbox.tools`)
8. **Stratégie d'outil du sous-agent** (`tools.subagents.tools`, si applicable)

Chaque niveau peut restreindre davantage les outils, mais ne peut pas rétablir les outils refusés des niveaux précédents.
Si `agents.list[].tools.sandbox.tools` est défini, il remplace `tools.sandbox.tools` pour cet agent.
Si `agents.list[].tools.profile` est défini, il remplace `tools.profile` pour cet agent.
Les clés d'outils du fournisseur acceptent soit `provider` (par ex. `google-antigravity`) soit `provider/model` (par ex. `openai/gpt-5.4`).

Les stratégies d'outils prennent en charge les raccourcis `group:*` qui s'étendent à plusieurs outils. Voir [Tool groups](/en/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands) pour la liste complète.

Les remplacements élevés par agent (`agents.list[].tools.elevated`) peuvent restreindre davantage l'exec élevé pour des agents spécifiques. Voir [Elevated Mode](/en/tools/elevated) pour plus de détails.

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

Les configurations héritées `agent.*` sont migrées par `openclaw doctor` ; préférez `agents.defaults` + `agents.list` à l'avenir.

---

## Exemples de restrictions d'outils

### Agent en lecture seule

```json
{
  "tools": {
    "allow": ["read"],
    "deny": ["exec", "write", "edit", "apply_patch", "process"]
  }
}
```

### Agent d'exécution sécurisée (sans modification de fichiers)

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
    "sessions": { "visibility": "tree" },
    "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
    "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
  }
}
```

`sessions_history` dans ce profil renvoie toujours une vue de rappel bornée et nettoyée
plutôt qu'un vidage brut de la transcription. Le rappel de l'assistant supprime les balises de réflexion,
la scaffolding `<relevant-memories>`, les payloads XML d'appels d'outils en texte brut
(y compris `<tool_call>...</tool_call>`,
`<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`,
`<function_calls>...</function_calls>`, et les blocs d'appels d'outils tronqués),
la scaffolding d'appels d'outils dégradée, les jetons de contrôle de modèle ASCII/full-width divulgués
et les payloads XML d'appels d'outils MiniMax malformés avant la rédaction/troncature.

---

## Piège courant : "non-main"

`agents.defaults.sandbox.mode: "non-main"` est basé sur `session.mainKey` (défaut `"main"`),
non sur l'identifiant de l'agent. Les sessions de groupe/canal obtiennent toujours leurs propres clés, elles sont donc
traitées comme non-main et seront sandboxées. Si vous souhaitez qu'un agent ne soit jamais
sandbox, définissez `agents.list[].sandbox.mode: "off"`.

---

## Test

Après avoir configuré le sandbox multi-agent et les outils :

1. **Vérifier la résolution de l'agent :**

   ```exec
   openclaw agents list --bindings
   ```

2. **Vérifier les conteneurs de sandbox :**

   ```exec
   docker ps --filter "name=openclaw-sbx-"
   ```

3. **Tester les restrictions d'outils :**
   - Envoyer un message nécessitant des outils restreints
   - Vérifiez que l'agent ne peut pas utiliser les outils refusés

4. **Surveillez les journaux :**

   ```exec
   tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
   ```

---

## Dépannage

### L'agent n'est pas sandboxé malgré `mode: "all"`

- Vérifiez s'il existe un `agents.defaults.sandbox.mode` global qui le remplace
- La configuration spécifique à l'agent est prioritaire, définissez donc `agents.list[].sandbox.mode: "all"`

### Outils toujours disponibles malgré la liste de refus

- Vérifiez l'ordre de filtrage des outils : global → agent → sandbox → sous-agent
- Chaque niveau ne peut que restreindre davantage, pas rétablir
- Vérifiez avec les journaux : `[tools] filtering tools for agent:${agentId}`

### Conteneur non isolé par agent

- Définissez `scope: "agent"` dans la configuration du sandbox spécifique à l'agent
- La valeur par défaut est `"session"`, qui crée un conteneur par session

---

## Voir aussi

- [Sandboxing](/en/gateway/sandboxing) -- référence complète du sandbox (modes, portées, backends, images)
- [Sandbox vs Tool Policy vs Elevated](/en/gateway/sandbox-vs-tool-policy-vs-elevated) -- débogage de "pourquoi cela est-il bloqué ?"
- [Mode élevé](/en/tools/elevated)
- [Routage multi-agent](/en/concepts/multi-agent)
- [Configuration du sandbox](/en/gateway/configuration-reference#agentsdefaultssandbox)
- [Gestion de session](/en/concepts/session)
