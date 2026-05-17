---
summary: "Restrictions de sandbox et d'outils par agent, priorité et exemples"
title: "Sandbox et outils multi-agents"
sidebarTitle: "Sandbox et outils multi-agents"
read_when: "Vous souhaitez un sandboxing par agent ou des stratégies d'autorisation/refus d'outils par agent dans une passerelle multi-agent."
status: active
---

Chaque agent dans une configuration multi-agent peut remplacer le sandbox global et la stratégie d'outils. Cette page couvre la configuration par agent, les règles de priorité et les exemples.

<CardGroup cols={3}>
  <Card title="Sandboxing" href="/fr/gateway/sandboxing">
    Backends et modes — référence complète du sandbox.
  </Card>
  <Card title="Sandbox vs stratégie d'outils vs élevé" href="/fr/gateway/sandbox-vs-tool-policy-vs-elevated">
    Déboguer "pourquoi ceci est bloqué ?"
  </Card>
  <Card title="Mode élevé" href="/fr/tools/elevated">
    Exec élevé pour les expéditeurs de confiance.
  </Card>
</CardGroup>

<Warning>
L'authentification est limitée par agent : chaque agent possède son propre magasin d'authentification `agentDir` à `~/.openclaw/agents/<agentId>/agent/auth-profiles.json`. Ne réutilisez jamais `agentDir`OAuth entre les agents. Les agents peuvent accéder aux profils d'authentification de l'agent par défaut/principal lorsqu'ils n'ont pas de profil local, mais les jetons d'actualisation OAuth ne sont pas clonés dans les magasins des agents secondaires. Si vous copiez des identifiants manuellement, ne copiez que des profils statiques portables `api_key` ou `token`.
</Warning>

---

## Exemples de configuration

<AccordionGroup>
  <Accordion title="Exemple 1 : Agent personnel + restreint pour la famille">
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
              "allow": ["read", "message"],
              "deny": ["exec", "write", "edit", "apply_patch", "process", "browser"],
              "message": {
                "crossContext": {
                  "allowWithinProvider": false,
                  "allowAcrossProviders": false
                }
              }
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

    - `main` agent : s'exécute sur l'hôte, accès complet aux tools.
    - `family` agent : s'exécute dans Docker (un conteneur par agent), uniquement `read` et les envois de messages de la conversation en cours.

  </Accordion>
  <Accordion title="Exemple 2 : Agent de travail avec sandbox partagé">
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
  </Accordion>
  <Accordion title="Exemple 2b : Profil de codage global + agent uniquement messagerie">
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

    - les agents par défaut obtiennent des outils de codage.
    - l'agent `support` est uniquement messagerie (+ outil Slack).

  </Accordion>
  <Accordion title="Exemple 3 : Différents modes de bac à sable par agent">
    ```json
    {
      "agents": {
        "defaults": {
          "sandbox": {
            "mode": "non-main",
            "scope": "session"
          }
        },
        "list": [
          {
            "id": "main",
            "workspace": "~/.openclaw/workspace",
            "sandbox": {
              "mode": "off"
            }
          },
          {
            "id": "public",
            "workspace": "~/.openclaw/workspace-public",
            "sandbox": {
              "mode": "all",
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
  </Accordion>
</AccordionGroup>

---

## Configuration precedence

Lorsque des configurations globales (`agents.defaults.*`) et spécifiques à l'agent (`agents.list[].*`) existent simultanément :

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

<Note>
`agents.list[].sandbox.{docker,browser,prune}.*` remplace `agents.defaults.sandbox.{docker,browser,prune}.*` pour cet agent (ignoré lorsque la portée du bac à sable est résolue à `"shared"`).
</Note>

### Restrictions d'outils

L'ordre de filtrage est le suivant :

<Steps>
  <Step title="Tool profile">`tools.profile` ou `agents.list[].tools.profile`.</Step>
  <Step title="Provider tool profile">`tools.byProvider[provider].profile` ou `agents.list[].tools.byProvider[provider].profile`.</Step>
  <Step title="Stratégie globale d'outils">`tools.allow` / `tools.deny`.</Step>
  <Step title="Stratégie d'outils du fournisseur">`tools.byProvider[provider].allow/deny`.</Step>
  <Step title="Stratégie d'outils spécifique à l'agent">`agents.list[].tools.allow/deny`.</Step>
  <Step title="Stratégie du fournisseur de l'agent">`agents.list[].tools.byProvider[provider].allow/deny`.</Step>
  <Step title="Stratégie d'outils du Sandbox">`tools.sandbox.tools` ou `agents.list[].tools.sandbox.tools`.</Step>
  <Step title="Stratégie d'outils du sous-agent">`tools.subagents.tools`, le cas échéant.</Step>
</Steps>

<AccordionGroup>
  <Accordion title="Règles de priorité">
    - Chaque niveau peut restreindre davantage les outils, mais ne peut pas rétablir les outils refusés des niveaux précédents.
    - Si `agents.list[].tools.sandbox.tools` est défini, il remplace `tools.sandbox.tools` pour cet agent.
    - Si `agents.list[].tools.profile` est défini, il remplace `tools.profile` pour cet agent.
    - Les clés d'outil du fournisseur acceptent soit `provider` (par ex. `google-antigravity`) soit `provider/model` (par ex. `openai/gpt-5.4`).

  </Accordion>
  <Accordion title="Comportement de la liste blanche vide">
    Si une liste blanche explicite de cette chaîne laisse l'exécution sans outils appelables, OpenClaw s'arrête avant de soumettre le prompt au modèle. C'est intentionnel : un agent configuré avec un outil manquant tel que `agents.list[].tools.allow: ["query_db"]` doit échouer de manière visible jusqu'à ce que le plugin qui enregistre `query_db` soit activé, et non continuer comme un agent texte uniquement.
  </Accordion>
</AccordionGroup>

Les stratégies d'outil prennent en charge les raccourcis `group:*` qui s'étendent à plusieurs outils. Consultez [Groupes d'outils](/fr/gateway/sandbox-vs-tool-policy-vs-elevated#tool-groups-shorthands) pour la liste complète.

Les remplacements élevés par agent (`agents.list[].tools.elevated`) peuvent restreindre davantage l'exécution élevée pour des agents spécifiques. Consultez [Mode élevé](/fr/tools/elevated) pour plus de détails.

---

## Migration depuis un agent unique

<Tabs>
  <Tab title="Avant (agent unique)">
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
  </Tab>
  <Tab title="Après (multi-agent)">
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
  </Tab>
</Tabs>

<Note>Les configurations héritées `agent.*` sont migrées par `openclaw doctor` ; privilégiez `agents.defaults` + `agents.list` à l'avenir.</Note>

---

## Exemples de restrictions d'outils

<Tabs>
  <Tab title="Agent en lecture seule">
    ```json
    {
      "tools": {
        "allow": ["read"],
        "deny": ["exec", "write", "edit", "apply_patch", "process"]
      }
    }
    ```
  </Tab>
  <Tab title="Exécution du shell avec les outils de système de fichiers désactivés">
    ```json
    {
      "tools": {
        "allow": ["read", "exec", "process"],
        "deny": ["write", "edit", "apply_patch", "browser", "gateway"]
      }
    }
    ```

    <Warning>
    Cette stratégie désactive les outils de système de fichiers OpenClaw, mais `exec` est toujours un shell et peut écrire des fichiers où que ce soit, tant que l'hôte sélectionné ou le système de fichiers du bac à sable le permet. Pour un agent en lecture seule, refusez `exec` et `process`, ou combinez l'accès au shell avec des contrôles du système de fichiers du bac à sable tels que `agents.defaults.sandbox.workspaceAccess: "ro"` ou `"none"`.
    </Warning>

  </Tab>
  <Tab title="Communication-only">
    ```json
    {
      "tools": {
        "sessions": { "visibility": "tree" },
        "allow": ["sessions_list", "sessions_send", "sessions_history", "session_status"],
        "deny": ["exec", "write", "edit", "apply_patch", "read", "browser"]
      }
    }
    ```

    `sessions_history` dans ce profil renvoie toujours une vue de rappel limitée et nettoyée plutôt qu'un vidage brut de la transcription. Le rappel de l'assistant supprime les balises de réflexion, l'échafaudage `<relevant-memories>`, les charges utiles XML d'appel d'outil en texte brut (y compris `<tool_call>...</tool_call>`, `<function_call>...</function_call>`, `<tool_calls>...</tool_calls>`, `<function_calls>...</function_calls>`, et les blocs d'appel d'outil tronqués), l'échafaudage d'appel d'outil rétrogradé, les jetons de contrôle de modèle ASCII/pleine largeur fuités, et les XML d'appel d'outil MiniMax malformés avant la rédaction/troncation.

  </Tab>
</Tabs>

---

## Piège courant : « non-main »

<Warning>`agents.defaults.sandbox.mode: "non-main"` est basé sur `session.mainKey` (défaut `"main"`), et non sur l'id de l'agent. Les sessions de groupe/de obtiennent toujours leurs propres clés, elles sont donc traitées comme non-main et seront . Si vous souhaitez qu'un agent ne soit jamais , définissez `agents.list[].sandbox.mode: "off"`.</Warning>

---

## Test

Après avoir configuré le bac à sable multi-agent et les outils :

<Steps>
  <Step title="Check agent resolution">
    ```bash
    openclaw agents list --bindings
    ```
  </Step>
  <Step title="Verify sandbox containers">
    ```bash
    docker ps --filter "name=openclaw-sbx-"
    ```
  </Step>
  <Step title="Test tool restrictions">
    - Envoyez un message nécessitant des outils restreints.
    - Vérifiez que l'agent ne peut pas utiliser les outils refusés.

  </Step>
  <Step title="Monitor logs">
    ```bash
    tail -f "${OPENCLAW_STATE_DIR:-$HOME/.openclaw}/logs/gateway.log" | grep -E "routing|sandbox|tools"
    ```
  </Step>
</Steps>

---

## Dépannage

<AccordionGroup>
  <Accordion title="Agent not sandboxed despite `mode: 'all'`">
    - Vérifiez s'il existe un `agents.defaults.sandbox.mode` global qui le remplace.
    - La configuration spécifique à l'agent est prioritaire, définissez donc `agents.list[].sandbox.mode: "all"`.

  </Accordion>
  <Accordion title="Outils toujours disponibles malgré la liste de refus">
    - Vérifiez l'ordre de filtrage des outils : global → agent → sandbox → sous-agent.
    - Chaque niveau ne peut que restreindre davantage, pas rétablir.
    - Vérifiez avec les journaux : `[tools] filtering tools for agent:${agentId}`.

  </Accordion>
  <Accordion title="Conteneur non isolé par agent">
    - Définissez `scope: "agent"` dans la configuration du sandbox spécifique à l'agent.
    - La valeur par défaut est `"session"`, qui crée un conteneur par session.

  </Accordion>
</AccordionGroup>

---

## Connexes

- [Mode élevé](/fr/tools/elevated)
- [Routage multi-agent](/fr/concepts/multi-agent)
- [Configuration du Sandbox](/fr/gateway/config-agents#agentsdefaultssandbox)
- [Sandbox vs stratégie d'outil vs élevé](/fr/gateway/sandbox-vs-tool-policy-vs-elevated) — débogage de "pourquoi cela est-il bloqué ?"
- [Sandboxing](/fr/gateway/sandboxing) — référence complète du sandbox (modes, portées, backends, images)
- [Gestion de session](/fr/concepts/session)
