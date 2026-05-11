---
summary: "code_execution -- exécuter une analyse Python distante sandboxed avec xAI"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "Exécution de code"
---

`code_execution` exécute une analyse Python distante sandboxed sur les API de réponses d'xAI.
Ceci est différent du local [`exec`](/fr/tools/exec) :

- `exec` exécute des commandes shell sur votre machine ou nœud
- `code_execution` exécute Python dans le sandbox distant d'xAI

Utilisez `code_execution` pour :

- calculs
- tableaux
- statistiques rapides
- analyse de style graphique
- analyser les données renvoyées par `x_search` ou `web_search`

N'**utilisez pas** cet outil lorsque vous avez besoin de fichiers locaux, de votre shell, de votre dépôt ou d'appareils jumelés.
Utilisez [`exec`](/fr/tools/exec) pour cela.

## Configuration

Vous avez besoin d'une clé API xAI. N'importe laquelle fonctionne :

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
la requête d'analyse complète et toutes les données en ligne dans une seule invite.

## Limites

- Il s'agit d'une exécution distante xAI, et non d'une exécution de processus locale.
- Elle doit être traitée comme une analyse éphémère, et non comme un bloc-notes persistant.
- Ne supposez pas l'accès aux fichiers locaux ou à votre espace de travail.
- Pour les données X fraîches, utilisez d'abord [`x_search`](/fr/tools/web#x_search).

## Connexes

- [Outil Exec](/fr/tools/exec)
- [Approbations Exec](/fr/tools/exec-approvals)
- [Outil apply_patch](/fr/tools/apply-patch)
- [Outils Web](/fr/tools/web)
- [xAI](/fr/providers/xai)
