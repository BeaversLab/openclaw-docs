---
summary: "code_execution -- exécuter une analyse Python distante sandboxed avec xAI"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "Code Execution"
---

# Code Execution

`code_execution` exécute une analyse Python distante sandboxed sur l'API Responses de xAI.
Ceci est différent de [`exec`](/en/tools/exec) local :

- `exec` exécute des commandes shell sur votre machine ou nœud
- `code_execution` exécute Python dans le bac à sable distant de xAI

Utilisez `code_execution` pour :

- des calculs
- la tabulation
- des statistiques rapides
- l'analyse de style graphique
- analyser les données renvoyées par `x_search` ou `web_search`

N'utilisez **pas** cette fonctionnalité lorsque vous avez besoin de fichiers locaux, de votre shell, de votre dépôt ou d'appareils jumelés. Utilisez [`exec`](/en/tools/exec) pour cela.

## Configuration

Vous avez besoin d'une clé xAI API. N'importe laquelle de celles-ci fonctionne :

- `XAI_API_KEY`
- `plugins.entries.xai.config.webSearch.apiKey`

Exemple :

```json5
{
  plugins: {
    entries: {
      xai: {
        config: {
          webSearch: {
            apiKey: "xai-...",
          },
          codeExecution: {
            enabled: true,
            model: "grok-4-1-fast",
            maxTurns: 2,
            timeoutSeconds: 30,
          },
        },
      },
    },
  },
}
```

## Comment l'utiliser

Posez des questions de manière naturelle et explicitez l'intention de l'analyse :

```text
Use code_execution to calculate the 7-day moving average for these numbers: ...
```

```text
Use x_search to find posts mentioning OpenClaw this week, then use code_execution to count them by day.
```

```text
Use web_search to gather the latest AI benchmark numbers, then use code_execution to compare percent changes.
```

L'outil prend en interne un seul paramètre `task`, l'agent doit donc envoyer
la demande d'analyse complète et toutes les données intégrées en une seule invite.

## Limites

- Il s'agit d'une exécution xAI à distance, et non d'une exécution de processus locale.
- Cela doit être considéré comme une analyse éphémère, et non comme un notebook persistant.
- Ne supposez pas l'accès aux fichiers locaux ou à votre espace de travail.
- Pour des données X fraîches, utilisez d'abord [`x_search`](/en/tools/web#x_search).

## Voir aussi

- [Outils Web](/en/tools/web)
- [Exec](/en/tools/exec)
- [xAI](/en/providers/xai)
