---
summary: "GLMOpenClawUtiliser Z.AI (modèles GLM) avec OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI est la plateforme API pour les modèles **GLM**. Elle fournit des API REST pour GLM et utilise des clés API
pour l'authentification. Créez votre clé API dans la console Z.AI. OpenClaw utilise le fournisseur APIGLMGLMAPIAPIOpenClaw`zai`API
avec une clé API Z.AI.

- Fournisseur : `zai`
- Auth : `ZAI_API_KEY`
- API : Z.AI Chat Completions (auth Bearer)

## Getting started

<Tabs>
  <Tab title="Auto-detect endpoint"OpenClaw>
    **Idéal pour :** la plupart des utilisateurs. OpenClaw détecte le point de terminaison Z.AI correspondant à partir de la clé et applique automatiquement l'URL de base correcte.

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice zai-api-key
        ```
      </Step>
      <Step title="Set a default model">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
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
    **Idéal pour :** les utilisateurs qui souhaitent forcer un Plan de Codage spécifique ou une surface API générale.

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
      <Step title="Set a default model">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
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

## Built-in catalog

OpenClaw inclut le catalogue de fournisseurs OpenClaw`zai`GLM intégré dans le manifeste du plugin, ainsi la liste
en lecture seule peut afficher les lignes GLM connues sans charger le runtime du fournisseur :

```bash
openclaw models list --all --provider zai
```

Le catalogue basé sur le manifeste inclut actuellement :

| Réf modèle           | Notes             |
| -------------------- | ----------------- |
| `zai/glm-5.1`        | Modèle par défaut |
| `zai/glm-5`          |                   |
| `zai/glm-5-turbo`    |                   |
| `zai/glm-5v-turbo`   |                   |
| `zai/glm-4.7`        |                   |
| `zai/glm-4.7-flash`  |                   |
| `zai/glm-4.7-flashx` |                   |
| `zai/glm-4.6`        |                   |
| `zai/glm-4.6v`       |                   |
| `zai/glm-4.5`        |                   |
| `zai/glm-4.5-air`    |                   |
| `zai/glm-4.5-flash`  |                   |
| `zai/glm-4.5v`       |                   |

<Tip>
Les modèles GLM sont disponibles en tant que GLM`zai/<model>` (exemple : `zai/glm-5`). La référence de modèle groupée par défaut est `zai/glm-5.1`.
</Tip>

## Configuration avancée

<AccordionGroup>
  <Accordion title="GLMRésolution directe des modèles GLM-5 inconnus">
    Les ids de modèle `glm-5*` inconnus sont toujours résolus directement sur le chemin du provider groupé en
    synthétisant les métadonnées appartenant au provider à partir du modèle `glm-4.7`GLM lorsque l'id
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

  <Accordion title="Réflexion et réflexion préservée">
    La réflexion de Z.AI suit les contrôles `/think` d'OpenClaw. Avec la réflexion désactivée,
    OpenClaw envoie `thinking: { type: "disabled" }` pour éviter les réponses qui
    dépensent le budget de sortie pour la `reasoning_content` avant le texte visible.

    La réflexion préservée est optionnelle car Z.AI exige que l'historique complet
    de la `reasoning_content` soit rejoué, ce qui augmente les jetons de prompt. Activez-la
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
    ```

    Lorsqu'elle est activée et que la réflexion est activée, OpenClaw envoie
    `thinking: { type: "enabled", clear_thinking: false }` et rejoue la `reasoning_content` antérieure
    pour la même transcription compatible OpenAI.

    Les utilisateurs avancés peuvent toujours remplacer la charge utile exacte du fournisseur avec
    `params.extra_body.thinking`.

  </Accordion>

  <Accordion title="Compréhension d'images">
    Le plugin Z.AI inclus enregistre la compréhension d'images.

    | Propriété      | Valeur       |
    | ------------- | ----------- |
    | Modèle         | `glm-4.6v`  |

    La compréhension d'images est résolue automatiquement à partir de l'authentification Z.AI configurée — aucune
    configuration supplémentaire n'est nécessaire.

  </Accordion>

  <Accordion title="Détails de l'authentification">
    - Z.AI utilise l'authentification Bearer avec votre clé API.
    - Le choix d'intégration `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant à partir du préfixe de la clé.
    - Utilisez les choix régionaux explicites (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) lorsque vous souhaitez forcer une surface API spécifique.

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Famille de modèles GLM" href="/fr/providers/glm" icon="microchip">
    Aperçu de la famille de modèles pour GLM.
  </Card>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
</CardGroup>
