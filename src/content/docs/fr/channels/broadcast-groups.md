---
summary: "Diffuser un message WhatsApp vers plusieurs agents"
read_when:
  - Configuring broadcast groups
  - Debugging multi-agent replies in WhatsApp
status: expérimental
title: "Groupes de diffusion"
sidebarTitle: "Groupes de diffusion"
---

<Note>**Statut :** Expérimental. Ajouté dans 2026.1.9.</Note>

## Aperçu

Les groupes de diffusion permettent à plusieurs agents de traiter et de répondre au même message simultanément. Cela vous permet de créer des équipes d'agents spécialisés qui travaillent ensemble dans un seul groupe WhatsApp ou un DM — le tout en utilisant un seul numéro de téléphone.

Portée actuelle : **WhatsApp uniquement** (channel web).

Les groupes de diffusion sont évalués après les listes d'autorisation de channel et les règles d'activation de groupe. Dans les groupes WhatsApp, cela signifie que les diffusions se produisent lorsque OpenClaw répondrait normalement (par exemple : sur mention, en fonction des paramètres de votre groupe).

## Cas d'usage

<AccordionGroup>
  <Accordion title="1. Équipes d'agents spécialisés">
    Déployez plusieurs agents avec des responsabilités atomiques et ciblées :

    ```
    Group: "Development Team"
    Agents:
      - CodeReviewer (reviews code snippets)
      - DocumentationBot (generates docs)
      - SecurityAuditor (checks for vulnerabilities)
      - TestGenerator (suggests test cases)
    ```

    Chaque agent traite le même message et fournit sa perspective spécialisée.

  </Accordion>
  <Accordion title="2. Support multilingue">
    ```
    Group: "International Support"
    Agents:
      - Agent_EN (responds in English)
      - Agent_DE (responds in German)
      - Agent_ES (responds in Spanish)
    ```
  </Accordion>
  <Accordion title="3. Workflows d'assurance qualité">
    ```
    Group: "Customer Support"
    Agents:
      - SupportAgent (provides answer)
      - QAAgent (reviews quality, only responds if issues found)
    ```
  </Accordion>
  <Accordion title="4. Automatisation des tâches">
    ```
    Group: "Project Management"
    Agents:
      - TaskTracker (updates task database)
      - TimeLogger (logs time spent)
      - ReportGenerator (creates summaries)
    ```
  </Accordion>
</AccordionGroup>

## Configuration

### Configuration de base

Ajoutez une section de niveau supérieur `broadcast` (à côté de `bindings`). Les clés sont les identifiants de pairs WhatsApp :

- groupes de discussion : JID de groupe (ex. `120363403215116621@g.us`)
- DMs : numéro de téléphone E.164 (ex. `+15551234567`)

```json
{
  "broadcast": {
    "120363403215116621@g.us": ["alfred", "baerbel", "assistant3"]
  }
}
```

**Résultat :** Lorsque OpenClaw répondrait dans cette discussion, il exécutera les trois agents.

### Stratégie de traitement

Contrôlez la façon dont les agents traitent les messages :

<Tabs>
  <Tab title="parallèle (par défaut)">
    Tous les agents traitent simultanément :

    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
  <Tab title="séquentiel">
    Les agents traitent dans l'ordre (un attend la fin du précédent) :

    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "120363403215116621@g.us": ["alfred", "baerbel"]
      }
    }
    ```

  </Tab>
</Tabs>

### Exemple complet

```json
{
  "agents": {
    "list": [
      {
        "id": "code-reviewer",
        "name": "Code Reviewer",
        "workspace": "/path/to/code-reviewer",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "security-auditor",
        "name": "Security Auditor",
        "workspace": "/path/to/security-auditor",
        "sandbox": { "mode": "all" }
      },
      {
        "id": "docs-generator",
        "name": "Documentation Generator",
        "workspace": "/path/to/docs-generator",
        "sandbox": { "mode": "all" }
      }
    ]
  },
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["code-reviewer", "security-auditor", "docs-generator"],
    "120363424282127706@g.us": ["support-en", "support-de"],
    "+15555550123": ["assistant", "logger"]
  }
}
```

## Fonctionnement

### Flux de messages

<Steps>
  <Step title="Arrivée du message entrant">
    Un message de groupe WhatsApp ou de DM arrive.
  </Step>
  <Step title="Vérification de diffusion">
    Le système vérifie si l'ID de pair est dans `broadcast`.
  </Step>
  <Step title="Si dans la liste de diffusion">
    - Tous les agents listés traitent le message.
    - Chaque agent possède sa propre clé de session et son contexte isolé.
    - Les agents traitent en parallèle (par défaut) ou séquentiellement.

  </Step>
  <Step title="Si pas dans la liste de diffusion">
    Le routage normal s'applique (première liaison correspondante).
  </Step>
</Steps>

<Note>Les groupes de diffusion ne contournent pas les listes d'autorisation de channel ou les règles d'activation de groupe (mentions/commandes/etc.). Ils ne modifient que _les agents qui s'exécutent_ lorsqu'un message est éligible au traitement.</Note>

### Isolement des sessions

Chaque agent dans un groupe de diffusion maintient des éléments entièrement séparés :

- **Clés de session** (`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`)
- **Historique de conversation** (l'agent ne voit pas les messages des autres agents)
- **Espace de travail** (bacs à sable séparés si configurés)
- **Accès aux outils** (listes d'autorisation/refus différentes)
- **Mémoire/contexte** (IDENTITY.md, SOUL.md, etc. séparés)
- **Tampon de contexte de groupe** (les messages récents du groupe utilisés pour le contexte) est partagé par pair, donc tous les agents de diffusion voient le même contexte lorsqu'ils sont déclenchés

Cela permet à chaque agent d'avoir :

- Des personnalités différentes
- Un accès aux outils différent (par ex., lecture seule vs lecture-écriture)
- Des modèles différents (par ex., opus vs sonnet)
- Des compétences différentes installées

### Exemple : sessions isolées

Dans le groupe `120363403215116621@g.us` avec les agents `["alfred", "baerbel"]` :

<Tabs>
  <Tab title="Contexte d'Alfred">``` Session: agent:alfred:whatsapp:group:120363403215116621@g.us History: [user message, alfred's previous responses] Workspace: /Users/user/openclaw-alfred/ Tools: read, write, exec ```</Tab>
  <Tab title="Contexte de Bärbel">``` Session: agent:baerbel:whatsapp:group:120363403215116621@g.us History: [user message, baerbel's previous responses] Workspace: /Users/user/openclaw-baerbel/ Tools: read only ```</Tab>
</Tabs>

## Bonnes pratiques

<AccordionGroup>
  <Accordion title="1. Garder les agents concentrés">
    Concevez chaque agent avec une seule responsabilité claire :

    ```json
    {
      "broadcast": {
        "DEV_GROUP": ["formatter", "linter", "tester"]
      }
    }
    ```

    ✅ **Bon :** Chaque agent a un travail. ❌ **Mauvais :** Un agent générique "dev-helper".

  </Accordion>
  <Accordion title="2. Utiliser des noms descriptifs">
    Rendez clair ce que fait chaque agent :

    ```json
    {
      "agents": {
        "security-scanner": { "name": "Security Scanner" },
        "code-formatter": { "name": "Code Formatter" },
        "test-generator": { "name": "Test Generator" }
      }
    }
    ```

  </Accordion>
  <Accordion title="3. Configurer différents accès aux outils">
    Donnez aux agents uniquement les outils dont ils ont besoin :

    ```json
    {
      "agents": {
        "reviewer": {
          "tools": { "allow": ["read", "exec"] }
        },
        "fixer": {
          "tools": { "allow": ["read", "write", "edit", "exec"] }
        }
      }
    }
    ```

    `reviewer` est en lecture seule. `fixer` peut lire et écrire.

  </Accordion>
  <Accordion title="4. Surveiller les performances">
    Avec de nombreux agents, envisagez :

    - D'utiliser `"strategy": "parallel"` (par défaut) pour la vitesse
    - De limiter les groupes de diffusion à 5-10 agents
    - D'utiliser des modèles plus rapides pour les agents plus simples

  </Accordion>
  <Accordion title="5. Handle failures gracefully">
    Agents fail independently. One agent's error doesn't block others:

    ```
    Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
    Result: Agent A and C respond, Agent B logs error
    ```

  </Accordion>
</AccordionGroup>

## Compatibilité

### Fournisseurs

Les groupes de diffusion fonctionnent actuellement avec :

- ✅ WhatsApp (implémenté)
- 🚧 Telegram (prévu)
- 🚧 Discord (prévu)
- 🚧 Slack (prévu)

### Routage

Les groupes de diffusion fonctionnent parallèlement au routage existant :

```json
{
  "bindings": [
    {
      "match": { "channel": "whatsapp", "peer": { "kind": "group", "id": "GROUP_A" } },
      "agentId": "alfred"
    }
  ],
  "broadcast": {
    "GROUP_B": ["agent1", "agent2"]
  }
}
```

- `GROUP_A` : Seul alfred répond (routage normal).
- `GROUP_B` : agent1 ET agent2 répondent (diffusion).

<Note>**Priorité :** `broadcast` est prioritaire sur `bindings`.</Note>

## Dépannage

<AccordionGroup>
  <Accordion title="Les agents ne répondent pas">
    **Vérifiez :**

    1. Les ID d'agents existent dans `agents.list`.
    2. Le format de l'ID du pair est correct (par ex., `120363403215116621@g.us`).
    3. Les agents ne sont pas dans les listes de refus.

    **Débogage :**

    ```bash
    tail -f ~/.openclaw/logs/gateway.log | grep broadcast
    ```

  </Accordion>
  <Accordion title="Un seul agent répond">
    **Cause :** L'ID du pair est peut-être dans `bindings` mais pas dans `broadcast`.

    **Correction :** Ajoutez à la configuration de diffusion ou supprimez des liaisons.

  </Accordion>
  <Accordion title="Performance issues">
    If slow with many agents:

    - Reduce number of agents per group.
    - Use lighter models (sonnet instead of opus).
    - Check sandbox startup time.

  </Accordion>
</AccordionGroup>

## Exemples

<AccordionGroup>
  <Accordion title="Exemple 1 : Équipe de révision de code">
    ```json
    {
      "broadcast": {
        "strategy": "parallel",
        "120363403215116621@g.us": [
          "code-formatter",
          "security-scanner",
          "test-coverage",
          "docs-checker"
        ]
      },
      "agents": {
        "list": [
          {
            "id": "code-formatter",
            "workspace": "~/agents/formatter",
            "tools": { "allow": ["read", "write"] }
          },
          {
            "id": "security-scanner",
            "workspace": "~/agents/security",
            "tools": { "allow": ["read", "exec"] }
          },
          {
            "id": "test-coverage",
            "workspace": "~/agents/testing",
            "tools": { "allow": ["read", "exec"] }
          },
          { "id": "docs-checker", "workspace": "~/agents/docs", "tools": { "allow": ["read"] } }
        ]
      }
    }
    ```

    **L'utilisateur envoie :** Extrait de code.

    **Réponses :**

    - code-formatter : « Indentation corrigée et indications de type ajoutées »
    - security-scanner : « ⚠️ Vulnérabilité par injection SQL à la ligne 12 »
    - test-coverage : « La couverture est de 45 %, tests manquants pour les cas d'erreur »
    - docs-checker : « Docstring manquante pour la fonction `process_data` »

  </Accordion>
  <Accordion title="Exemple 2 : Support multilingue">
    ```json
    {
      "broadcast": {
        "strategy": "sequential",
        "+15555550123": ["detect-language", "translator-en", "translator-de"]
      },
      "agents": {
        "list": [
          { "id": "detect-language", "workspace": "~/agents/lang-detect" },
          { "id": "translator-en", "workspace": "~/agents/translate-en" },
          { "id": "translator-de", "workspace": "~/agents/translate-de" }
        ]
      }
    }
    ```
  </Accordion>
</AccordionGroup>

## API reference

### Schéma de configuration

```typescript
interface OpenClawConfig {
  broadcast?: {
    strategy?: "parallel" | "sequential";
    [peerId: string]: string[];
  };
}
```

### Champs

<ParamField path="strategy" type='"parallel" | "sequential"' default='"parallel"'>
  Mode de traitement des agents. `parallel` exécute tous les agents simultanément ; `sequential` les exécute dans l'ordre du tableau.
</ParamField>
<ParamField path="[peerId]" type="string[]">
  JID de groupe WhatsApp, numéro E.164 ou autre ID de pair. La valeur est le tableau des ID d'agents qui doivent traiter les messages.
</ParamField>

## Limitations

1. **Max agents :** Aucune limite stricte, mais 10+ agents peuvent être lents.
2. **Contexte partagé :** Les agents ne voient pas les réponses des autres (par conception).
3. **Ordre des messages :** Les réponses parallèles peuvent arriver dans n'importe quel ordre.
4. **Limites de débit :** Tous les agents comptent dans les limites de débit WhatsApp.

## Améliorations futures

Fonctionnalités prévues :

- [ ] Mode de contexte partagé (les agents voient les réponses des autres)
- [ ] Coordination des agents (les agents peuvent se signaler entre eux)
- [ ] Sélection dynamique d'agents (choisir les agents en fonction du contenu du message)
- [ ] Priorités des agents (certains agents répondent avant d'autres)

## Connexes

- [Routage de canal](/fr/channels/channel-routing)
- [Groupes](/fr/channels/groups)
- [Outils de bac à sable multi-agents](/fr/tools/multi-agent-sandbox-tools)
- [Appariement](/fr/channels/pairing)
- [Gestion de session](/fr/concepts/session)
