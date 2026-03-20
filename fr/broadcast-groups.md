---
summary: "Diffuser un message WhatsApp vers plusieurs agents"
read_when:
  - Configuration des groupes de diffusion
  - Débogage des réponses multi-agents dans WhatsApp
status: experimental
title: "Broadcast Groups"
---

# Groupes de diffusion

**Statut :** Expérimental  
**Version :** Ajouté dans la 2026.1.9

## Aperçu

Les groupes de diffusion permettent à plusieurs agents de traiter et de répondre au même message simultanément. Cela vous permet de créer des équipes d'agents spécialisés qui travaillent ensemble dans un seul groupe WhatsApp ou DM — le tout en utilisant un seul numéro de téléphone.

Portée actuelle : **WhatsApp uniquement** (canal web).

Les groupes de diffusion sont évalués après les listes d'autorisation de canal et les règles d'activation de groupe. Dans les groupes WhatsApp, cela signifie que les diffusions ont lieu lorsque OpenClaw répondrait normalement (par exemple : sur mention, en fonction de vos paramètres de groupe).

## Cas d'usage

### 1. Équipes d'agents spécialisés

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

### 2. Support multilingue

```
Group: "International Support"
Agents:
  - Agent_EN (responds in English)
  - Agent_DE (responds in German)
  - Agent_ES (responds in Spanish)
```

### 3. Workflows d'assurance qualité

```
Group: "Customer Support"
Agents:
  - SupportAgent (provides answer)
  - QAAgent (reviews quality, only responds if issues found)
```

### 4. Automatisation des tâches

```
Group: "Project Management"
Agents:
  - TaskTracker (updates task database)
  - TimeLogger (logs time spent)
  - ReportGenerator (creates summaries)
```

## Configuration

### Configuration de base

Ajoutez une section `broadcast` de premier niveau (à côté de `bindings`). Les clés sont les ID de pairs WhatsApp :

- group chats : JID de groupe (ex. `120363403215116621@g.us`)
- DMs : Numéro de téléphone E.164 (ex. `+15551234567`)

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

#### Parallèle (Par défaut)

Tous les agents traitent simultanément :

```json
{
  "broadcast": {
    "strategy": "parallel",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

#### Séquentiel

Les agents traitent dans l'ordre (un attend la fin du précédent) :

```json
{
  "broadcast": {
    "strategy": "sequential",
    "120363403215116621@g.us": ["alfred", "baerbel"]
  }
}
```

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

1. **Message entrant** arrive dans un groupe WhatsApp
2. **Vérification de diffusion** : Le système vérifie si l'ID du pair est dans `broadcast`
3. **Si dans la liste de diffusion** :
   - Tous les agents répertoriés traitent le message
   - Chaque agent possède sa propre clé de session et son propre contexte isolé
   - Les agents traitent en parallèle (par défaut) ou séquentiellement
4. **Si pas dans la liste de diffusion** :
   - Le routage normal s'applique (première liaison correspondante)

Remarque : les groupes de diffusion ne contournent pas les listes d'autorisation de channel ou les règles d'activation de groupe (mentions/commandes/etc.). Ils ne modifient que _les agents qui s'exécutent_ lorsqu'un message est éligible au traitement.

### Isolement des sessions

Chaque agent dans un groupe de diffusion maintient des éléments entièrement séparés :

- **Clés de session** (`agent:alfred:whatsapp:group:120363...` vs `agent:baerbel:whatsapp:group:120363...`)
- **Historique des conversations** (l'agent ne voit pas les messages des autres agents)
- **Espace de travail** (bacs à sable séparés si configurés)
- **Accès aux tool** (listes d'autorisation/refus différentes)
- **Mémoire/contexte** (IDENTITY.md, SOUL.md, etc. séparés)
- **Tampon de contexte de groupe** (messages de groupe récents utilisés pour le contexte) est partagé par pair, donc tous les agents de diffusion voient le même contexte lorsqu'ils sont déclenchés

Cela permet à chaque agent d'avoir :

- Différentes personnalités
- Différents accès aux tool (par exemple, lecture seule vs lecture-écriture)
- Différents modèles (par exemple, opus vs sonnet)
- Différentes compétences installées

### Exemple : Sessions isolées

Dans le groupe `120363403215116621@g.us` avec les agents `["alfred", "baerbel"]` :

**Contexte d'Alfred :**

```
Session: agent:alfred:whatsapp:group:120363403215116621@g.us
History: [user message, alfred's previous responses]
Workspace: /Users/pascal/openclaw-alfred/
Tools: read, write, exec
```

**Contexte de Bärbel :**

```
Session: agent:baerbel:whatsapp:group:120363403215116621@g.us
History: [user message, baerbel's previous responses]
Workspace: /Users/pascal/openclaw-baerbel/
Tools: read only
```

## Bonnes pratiques

### 1. Garder les agents concentrés

Concevez chaque agent avec une responsabilité unique et claire :

```json
{
  "broadcast": {
    "DEV_GROUP": ["formatter", "linter", "tester"]
  }
}
```

✅ **Bon :** Chaque agent a une seule tâche  
❌ **Mauvais :** Un seul agent générique "dev-helper"

### 2. Utiliser des noms descriptifs

Clarifiez ce que fait chaque agent :

```json
{
  "agents": {
    "security-scanner": { "name": "Security Scanner" },
    "code-formatter": { "name": "Code Formatter" },
    "test-generator": { "name": "Test Generator" }
  }
}
```

### 3. Configurer différents accès aux tool

Donnez aux agents uniquement les tool dont ils ont besoin :

```json
{
  "agents": {
    "reviewer": {
      "tools": { "allow": ["read", "exec"] } // Read-only
    },
    "fixer": {
      "tools": { "allow": ["read", "write", "edit", "exec"] } // Read-write
    }
  }
}
```

### 4. Surveiller les performances

Avec de nombreux agents, envisagez :

- Utilisation de `"strategy": "parallel"` (par défaut) pour la vitesse
- Limiter les groupes de diffusion à 5 à 10 agents
- Utiliser des modèles plus rapides pour les agents plus simples

### 5. Gérer les échecs avec élégance

Les agents échouent indépendamment. L'erreur d'un agent ne bloque pas les autres :

```
Message → [Agent A ✓, Agent B ✗ error, Agent C ✓]
Result: Agent A and C respond, Agent B logs error
```

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

- `GROUP_A` : Seul alfred répond (routage normal)
- `GROUP_B` : agent1 ET agent2 répondent (diffusion)

**Priorité :** `broadcast` est prioritaire sur `bindings`.

## Dépannage

### Les agents ne répondent pas

**Vérification :**

1. Les ID d'agents existent dans `agents.list`
2. Le format de l'ID de pair est correct (ex., `120363403215116621@g.us`)
3. Les agents ne sont pas dans les listes de refus

**Débogage :**

```bash
tail -f ~/.openclaw/logs/gateway.log | grep broadcast
```

### Un seul agent répond

**Cause :** L'ID de pair peut être dans `bindings` mais pas dans `broadcast`.

**Correction :** Ajouter à la configuration de diffusion ou retirer des liaisons.

### Problèmes de performance

**En cas de lenteur avec de nombreux agents :**

- Réduire le nombre d'agents par groupe
- Utiliser des modèles plus légers (sonnet au lieu d'opus)
- Vérifier le temps de démarrage du bac à sable

## Exemples

### Exemple 1 : Équipe de révision de code

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

**Utilisateur envoie :** Extrait de code  
**Réponses :**

- code-formatter : "Indentation corrigée et indications de type ajoutées"
- security-scanner : "⚠️ Vulnérabilité d'injection SQL à la ligne 12"
- test-coverage : "La couverture est de 45 %, tests manquants pour les cas d'erreur"
- docs-checker : "Docstring manquante pour la fonction `process_data`"

### Exemple 2 : Support multilingue

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

## Référence de l'API

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

- `strategy` (optionnel) : Comment traiter les agents
  - `"parallel"` (par défaut) : Tous les agents traitent simultanément
  - `"sequential"` : Les agents traitent dans l'ordre du tableau
- `[peerId]` : JID de groupe WhatsApp, numéro E.164 ou autre ID de pair
  - Valeur : Tableau des IDs d'agents qui doivent traiter les messages

## Limitations

1. **Max agents :** Aucune limite stricte, mais 10+ agents peuvent être lents
2. **Contexte partagé :** Les agents ne voient pas les réponses des autres (par conception)
3. **Ordre des messages :** Les réponses parallèles peuvent arriver dans n'importe quel ordre
4. **Limites de débit :** Tous les agents comptent dans les limites de débit WhatsApp

## Améliorations futures

Fonctionnalités prévues :

- [ ] Mode de contexte partagé (les agents voient les réponses des autres)
- [ ] Coordination des agents (les agents peuvent se signaler)
- [ ] Sélection dynamique d'agents (choisir les agents en fonction du contenu du message)
- [ ] Priorités des agents (certains agents répondent avant d'autres)

## Voir aussi

- [Configuration Multi-Agent](/fr/multi-agent-sandbox-tools)
- [Configuration du Routage](/fr/concepts/channel-routing)
- [Gestion des Sessions](/fr/concepts/sessions)

import en from "/components/footer/en.mdx";

<en />
