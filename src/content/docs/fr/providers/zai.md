---
summary: "Utiliser Z.AI (modèles GLM) avec OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI est la plateforme API pour les modèles **GLM**. Elle fournit des API REST pour GLM et
utilise des clés API pour l'authentification. Créez votre clé API dans la console Z.AI.
OpenClaw utilise le fournisseur APIGLMGLMAPIAPIOpenClaw`zai`API avec une clé API Z.AI.

| Propriété   | Valeur                                        |
| ----------- | --------------------------------------------- |
| Fournisseur | `zai`                                         |
| Auth        | `ZAI_API_KEY` (alias legacy : `Z_AI_API_KEY`) |
| API         | Z.AI Chat Completions (auth Bearer)           |

## Modèles GLM

GLM est une famille de modèles, pas un fournisseur distinct. Dans OpenClaw, les modèles GLM utilisent
des références telles que GLMOpenClawGLM`zai/glm-5.1` : fournisseur `zai`, id de modèle `glm-5.1`.

## Getting started

<Tabs>
  <Tab title="Auto-detect endpoint"OpenClawAPI>
    **Idéal pour :** la plupart des utilisateurs. OpenClaw sonde les points de terminaison Z.AI pris en charge avec votre clé API et applique l'URL de base correcte automatiquement.

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="Verify the model is listed">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Explicit regional endpoint"API>
    **Idéal pour :** les utilisateurs qui souhaitent forcer un plan de codage spécifique ou une surface API générale.

    <Steps>
      <Step title="Pick the right onboarding choice">
        ```bash
        # Coding Plan Global (recommended for Coding Plan users)
        openclaw onboard --auth-choice zai-coding-global

        # Coding Plan CN (China region)
        openclaw onboard --auth-choice zai-coding-cn

        # General API
        openclaw onboard --auth-choice zai-global

        # General API CN (China region)
        openclaw onboard --auth-choice zai-cn
        ```
      </Step>
      <Step title="Verify the model is listed">
        ```bash
        openclaw models list --all --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Config example

<Tip>`zai-api-key`OpenClaw permet à OpenClaw de détecter le point de terminaison Z.AI correspondant à partir de la clé et d'appliquer automatiquement l'URL de base correcte. Utilisez les choix régionaux explicites lorsque vous souhaitez forcer un plan de codage spécifique ou une surface d'API générale.</Tip>

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  models: {
    providers: {
      zai: {
        // Example value. Onboarding writes the matching baseUrl for your endpoint.
        baseUrl: "https://api.z.ai/api/paas/v4",
      },
    },
  },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

## Catalogue intégré

OpenClaw fournit le catalogue de provider OpenClaw`zai` groupé dans le manifeste du plugin, de sorte que la liste en lecture seule
peut afficher les lignes GLM connues sans charger le runtime du provider :

```bash
openclaw models list --all --provider zai
```

Le catalogue basé sur le manifeste inclut actuellement :

| Réf de model         | Notes            |
| -------------------- | ---------------- |
| `zai/glm-5.1`        | Model par défaut |
| `zai/glm-5`          |                  |
| `zai/glm-5-turbo`    |                  |
| `zai/glm-5v-turbo`   |                  |
| `zai/glm-4.7`        |                  |
| `zai/glm-4.7-flash`  |                  |
| `zai/glm-4.7-flashx` |                  |
| `zai/glm-4.6`        |                  |
| `zai/glm-4.6v`       |                  |
| `zai/glm-4.5`        |                  |
| `zai/glm-4.5-air`    |                  |
| `zai/glm-4.5-flash`  |                  |
| `zai/glm-4.5v`       |                  |

<Tip>
Les models GLM sont disponibles en tant que `zai/<model>` (exemple : `zai/glm-5`).
</Tip>

<Note>La référence de model groupée par défaut est `zai/glm-5.1`. Les versions GLM et leur disponibilité peuvent changer ; exécutez `openclaw models list --all --provider zai` pour voir le catalogue connu de votre version installée.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Résolution directe des models GLM-5 inconnus">
    Les ids `glm-5*` inconnus sont encore résolus directement sur le chemin du provider groupé en
    synthétisant les métadonnées appartenant au provider à partir du modèle `glm-4.7` lorsque l'id
    correspond à la forme actuelle de la famille GLM-5.
  </Accordion>

  <Accordion title="Streaming des appels d'outil">
    `tool_stream` est activé par défaut pour le streaming des appels d'outil Z.AI. Pour le désactiver :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/<model>": {
              params: { tool_stream: false },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Thinking and preserved thinking"OpenClaw>
    La réflexion de Z.AI suit les contrôles `/think`OpenClaw d'OpenClaw. Avec la réflexion désactivée,
    OpenClaw envoie `thinking: { type: "disabled" }` pour éviter les réponses qui
    dépensent le budget de sortie sur `reasoning_content` avant le texte visible.

    La réflexion préservée est optionnelle car Z.AI exige que l'intégralité de l'historique
    de `reasoning_content` soit rejoué, ce qui augmente les jetons de prompt. Activez-la
    par modèle :

    ```json5
    {
      agents: {
        defaults: {
          models: {
            "zai/glm-5.1": {
              params: { preserveThinking: true },
            },
          },
        },
      },
    }
    ```OpenClaw

    Lorsqu'elle est activée et que la réflexion est activée, OpenClaw envoie
    `thinking: { type: "enabled", clear_thinking: false }` et rejoue le `reasoning_content`OpenAI
    précédent pour la même transcription compatible OpenAI.

    Les utilisateurs avancés peuvent toujours remplacer la charge utile exacte du provider avec
    `params.extra_body.thinking`.

  </Accordion>

  <Accordion title="Image understanding">
    Le plugin Z.AI inclus enregistre la compréhension d'image.

    | Property      | Value       |
    | ------------- | ----------- |
    | Modèle         | `glm-4.6v`  |

    La compréhension d'image est résolue automatiquement à partir de l'authentification Z.AI configurée — aucune
    configuration supplémentaire n'est nécessaire.

  </Accordion>

  <Accordion title="Auth details"API>
    - Z.AI utilise l'authentification Bearer avec votre clé API.
    - Le choix d'onboarding `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant en sondant les points de terminaison pris en charge avec votre clé.
    - Utilisez les choix régionaux explicites (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`API) lorsque vous souhaitez forcer une surface API spécifique.
    - La variable d'environnement (env var) héritée `Z_AI_API_KEY`OpenClaw est toujours acceptée ; OpenClaw la copie vers `ZAI_API_KEY` au démarrage si `ZAI_API_KEY` n'est pas défini.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choix des providers, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/en/gateway/configuration-reference" icon="gear" OpenClaw>
    Schéma de configuration complet d'OpenClaw, y compris les paramètres de provider et de modèle.
  </Card>
</CardGroup>
