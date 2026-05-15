---
summary: "code_execution : exécuter une analyse Python à distance sandboxed avec xAI"
read_when:
  - You want to enable or configure code_execution
  - You want remote analysis without local shell access
  - You want to combine x_search or web_search with remote Python analysis
title: "Exécution de code"
---

`code_execution`API exécute une analyse Python à distance sandboxed sur l'API Responses de xAI. Il est enregistré par le plugin `xai` inclus (sous le contrat `tools`) et envoie vers le même point de terminaison `https://api.x.ai/v1/responses` utilisé par `x_search`.

| Propriété                     | Valeur                                                                                         |
| ----------------------------- | ---------------------------------------------------------------------------------------------- |
| Nom de l'outil                | `code_execution`                                                                               |
| Plugin fournisseur            | `xai` (inclus, `enabledByDefault: true`)                                                       |
| Auth                          | Profil d'authentification xAI, `XAI_API_KEY`, ou `plugins.entries.xai.config.webSearch.apiKey` |
| Modèle par défaut             | `grok-4-1-fast`                                                                                |
| Délai d'expiration par défaut | 30 secondes                                                                                    |
| `maxTurns` par défaut         | non défini (xAI applique sa propre limite interne)                                             |

Ceci est différent de [`exec`](/fr/tools/exec) local :

- `exec` exécute des commandes shell sur votre machine ou un nœud appairé.
- `code_execution` exécute Python dans le sandbox distant de xAI.

Utilisez `code_execution` pour :

- Calculs.
- Tableaux.
- Statistiques rapides.
- Analyse de style graphique.
- Analyse des données renvoyées par `x_search` ou `web_search`.

N'utilisez **pas** cet outil lorsque vous avez besoin de fichiers locaux, de votre shell, de votre dépôt ou d'appareils appairés. Utilisez [`exec`](/fr/tools/exec) pour cela.

## Configuration

<Steps>
  <Step title="APIFournir une clé API xAI">
    Exécutez `openclaw onboard --auth-choice xai-api-key` pour `code_execution` et
    `x_search`, ou définissez `XAI_API_KEY` / configurez la clé sous le plugin xAI
    lorsque vous voulez également que la recherche web Grok utilise les mêmes identifiants :

    ```bash
    export XAI_API_KEY=xai-...
    ```

    Ou via la configuration :

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              webSearch: {
                apiKey: "xai-...",
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="Activer et régler code_execution">
    L'outil est conditionné par `plugins.entries.xai.config.codeExecution.enabled`. Il est désactivé par défaut.

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast", // override the default xAI code-execution model
                maxTurns: 2,            // optional cap on internal tool turns
                timeoutSeconds: 30,     // request timeout (default: 30)
              },
            },
          },
        },
      },
    }
    ```

  </Step>

  <Step title="Redémarrer le Gateway">
    ```bash
    openclaw gateway restart
    ```

    `code_execution` apparaît dans la liste des outils de l'agent une fois que le plugin xAI s'est réenregistré auprès de `enabled: true`.

  </Step>
</Steps>

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

En interne, l'outil prend un seul paramètre `task`. L'agent doit donc envoyer la demande d'analyse complète et toutes les données en ligne dans une seule invite.

## Erreurs

Lorsque l'outil s'exécute sans authentification, il renvoie une erreur structurée `missing_xai_api_key` pointant vers le profil d'authentification, la variable d'environnement et les options de configuration. L'erreur est au format JSON et non une exception levée, l'agent peut donc se corriger lui-même :

```json
{
  "error": "missing_xai_api_key",
  "message": "code_execution needs an xAI API key. Run openclaw onboard --auth-choice xai-api-key, set XAI_API_KEY in the Gateway environment, or configure plugins.entries.xai.config.webSearch.apiKey.",
  "docs": "https://docs.openclaw.ai/tools/code-execution"
}
```

## Limites

- Il s'agit d'une exécution distante sur xAI, et non d'une exécution de processus local.
- Traitez les résultats comme une analyse éphémère, et non comme une session de notebook persistante.
- Ne supposez pas l'accès aux fichiers locaux ou à votre espace de travail.
- Pour obtenir des données X fraîches, utilisez d'abord [`x_search`](/fr/tools/web#x_search) et redirigez le résultat vers `code_execution`.

## Connexes

<CardGroup cols={2}>
  <Card title="Outil Exec" href="/fr/tools/exec" icon="terminal">
    Exécution de shell local sur votre machine ou le nœud associé.
  </Card>
  <Card title="Approbations Exec" href="/fr/tools/exec-approvals" icon="shield">
    Stratégie d'autorisation/refus pour l'exécution du shell.
  </Card>
  <Card title="Outils Web" href="/fr/tools/web" icon="globe">
    `web_search`, `x_search` et `web_fetch`.
  </Card>
  <Card title="Fournisseur xAI" href="/fr/providers/xai" icon="microchip">
    Modèles Grok, recherche web/x et configuration de l'exécution de code.
  </Card>
</CardGroup>
