---
summary: "Utiliser Z.AI (modèles GLM) avec OpenClaw"
read_when:
  - You want Z.AI / GLM models in OpenClaw
  - You need a simple ZAI_API_KEY setup
title: "Z.AI"
---

Z.AI est la plateforme API pour les modèles **GLM**. Elle fournit des API REST pour GLM et utilise des clés API pour l'authentification. Créez votre clé API dans la console Z.AI. OpenClaw utilise le provider `zai` avec une clé Z.AI API.

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

## Built-in catalog

OpenClaw initialise actuellement le provider `zai` fourni avec :

| Réf du modèle        | Notes             |
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
Les modèles GLM sont disponibles en tant que `zai/<model>` (exemple : `zai/glm-5`). La référence de modèle groupée par défaut est `zai/glm-5.1`.
</Tip>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Résolution anticipée des modèles GLM-5 inconnus">
    Les ID `glm-5*` inconnus font toujours l'objet d'une résolution anticipée sur le chemin du fournisseur groupé en
    synthétisant les métadonnées propres au fournisseur à partir du modèle `glm-4.7` lorsque l'ID
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
    La réflexion Z.AI suit les contrôles `/think` de OpenClaw. Avec la réflexion désactivée,
    OpenClaw envoie `thinking: { type: "disabled" }` pour éviter les réponses qui
    dépensent le budget de sortie pour `reasoning_content` avant le texte visible.

    La réflexion préservée est optionnelle car Z.AI exige que l'historique complet
    `reasoning_content` soit rejoué, ce qui augmente les jetons de prompt. Activez-la
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
    `thinking: { type: "enabled", clear_thinking: false }` et rejoue la réflexion antérieure
    `reasoning_content` pour la même transcription compatible OpenAI.

    Les utilisateurs avancés peuvent toujours remplacer la charge utile exacte du fournisseur par
    `params.extra_body.thinking`.

  </Accordion>

  <Accordion title="Compréhension d'images">
    Le plugin Z.AI groupé enregistre la compréhension d'images.

    | Propriété      | Valeur       |
    | ------------- | ----------- |
    | Modèle         | `glm-4.6v`  |

    La compréhension d'images est résolue automatiquement à partir de l'authentification Z.AI configurée — aucune
    configuration supplémentaire n'est nécessaire.

  </Accordion>

  <Accordion title="Auth details">
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
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
</CardGroup>
