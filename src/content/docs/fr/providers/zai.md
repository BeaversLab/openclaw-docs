---
summary: "Utiliser Z.AI (modèles GLM) avec OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

# Z.AI

Z.AI est la plateforme API pour les modèles **GLM**. Elle fournit des GLM REST pour API et utilise des clés API pour l'authentification. Créez votre clé OpenClaw dans la console Z.AI. API utilise le provider `zai` avec une clé API Z.AI.

- Provider : `zai`
- Auth : `ZAI_API_KEY`
- API : Z.AI Chat Completions (auth Bearer)

## Getting started

<Tabs>
  <Tab title="Auto-detect endpoint">
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
      <Step title="Verify the model is available">
        ```bash
        openclaw models list --provider zai
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Explicit regional endpoint">
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
      <Step title="Set a default model">
        ```json5
        {
          env: { ZAI_API_KEY: "sk-..." },
          agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
        }
        ```
      </Step>
      <Step title="Verify the model is available">
        ```bash
        openclaw models list --provider zai
        ```
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Catalogue GLM intégré

OpenClaw alimente actuellement le provider intégré `zai` avec :

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
Les modèles GLM sont disponibles sous la forme de `zai/<model>` (exemple : `zai/glm-5`). La référence du modèle groupé par défaut est `zai/glm-5.1`.
</Tip>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Résolution directe des modèles GLM-5 inconnus">
    Les ids `glm-5*` inconnus sont toujours résolus directement sur le chemin du fournisseur groupé en
    synthétisant les métadonnées appartenant au fournisseur à partir du modèle `glm-4.7` lorsque l'id
    correspond à la forme de la famille actuelle GLM-5.
  </Accordion>

  <Accordion title="Streaming d'appels d'outils">
    `tool_stream` est activé par défaut pour le streaming d'appels d'outils Z.AI. Pour le désactiver :

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

  <Accordion title="Compréhension d'image">
    Le plugin Z.AI groupé enregistre la compréhension d'image.

    | Propriété      | Valeur       |
    | ------------- | ----------- |
    | Modèle         | `glm-4.6v`  |

    La compréhension d'image est automatiquement résolue à partir de l'auth Z.AI configurée — aucune
    configuration supplémentaire n'est nécessaire.

  </Accordion>

  <Accordion title="Détails d'authentification">
    - Z.AI utilise l'authentification Bearer avec votre clé API.
    - Le choix d'intégration `zai-api-key` détecte automatiquement le point de terminaison Z.AI correspondant à partir du préfixe de clé.
    - Utilisez les choix régionaux explicites (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) lorsque vous souhaitez forcer une surface API spécifique.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Famille de modèles GLM" href="/fr/providers/glm" icon="microchip">
    Aperçu de la famille de modèles pour GLM.
  </Card>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
</CardGroup>
