---
summary: "Aperçu de la famille de modèles GLM + comment l'utiliser dans OpenClaw"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLM (Zhipu)"
---

# Modèles GLM

GLM est une **famille de modèles** (et non une entreprise) disponible via la plateforme Z.AI. Dans OpenClaw, les modèles GLM sont accessibles via le provider `zai` et des ID de modèle comme `zai/glm-5`.

## Getting started

<Steps>
  <Step title="Choose an auth route and run onboarding">
    Choisissez l'option d'intégration correspondant à votre offre Z.AI et à votre région :

    | Choix d'auth | Idéal pour |
    | ----------- | -------- |
    | `zai-api-key` | Configuration générique de clé API avec détection automatique du point de terminaison |
    | `zai-coding-global` | Utilisateurs du Coding Plan (mondial) |
    | `zai-coding-cn` | Utilisateurs du Coding Plan (région Chine) |
    | `zai-global` | API générale (mondial) |
    | `zai-cn` | API générale (région Chine) |

    ```bash
    # Example: generic auto-detect
    openclaw onboard --auth-choice zai-api-key

    # Example: Coding Plan global
    openclaw onboard --auth-choice zai-coding-global
    ```

  </Step>
  <Step title="Set GLM as the default model">
    ```bash
    openclaw config set agents.defaults.model.primary "zai/glm-5.1"
    ```
  </Step>
  <Step title="Verify models are available">
    ```bash
    openclaw models list --provider zai
    ```
  </Step>
</Steps>

## Exemple de configuration

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

<Tip>`zai-api-key` permet à OpenClaw de détecter le point de terminaison Z.AI correspondant à partir de la clé et d'appliquer automatiquement l'URL de base correcte. Utilisez les choix régionaux explicites lorsque vous souhaitez forcer un Coding Plan spécifique ou une surface d'API générale.</Tip>

## Modèles GLM inclus

OpenClaw fournit actuellement le provider `zai` inclus avec ces références GLM :

| Modèle          | Modèle           |
| --------------- | ---------------- |
| `glm-5.1`       | `glm-4.7`        |
| `glm-5`         | `glm-4.7-flash`  |
| `glm-5-turbo`   | `glm-4.7-flashx` |
| `glm-5v-turbo`  | `glm-4.6`        |
| `glm-4.5`       | `glm-4.6v`       |
| `glm-4.5-air`   |                  |
| `glm-4.5-flash` |                  |
| `glm-4.5v`      |                  |

<Note>La référence de modèle par défaut est `zai/glm-5.1`. Les versions et la disponibilité des GLM puvent changer ; consultez la documentation de Z.AI pour les dernières informations.</Note>

## Notes avancées

<AccordionGroup>
  <Accordion title="Détection automatique du point de terminaison">
    Lorsque vous utilisez le choix d'authentification `zai-api-key`, OpenClaw inspecte le format de la clé
    pour déterminer l'URL de base Z.AI correcte. Les choix régionaux explicites
    (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) remplacent
    la détection automatique et fixent directement le point de terminaison.
  </Accordion>

  <Accordion title="Détails du provider">
    Les modèles GLM sont fournis par le provider d'exécution `zai`. Pour la configuration complète du provider,
    les points de terminaison régionaux et les capacités supplémentaires, consultez
    [Z.AI provider docs](/fr/providers/zai).
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Provider Z.AI" href="/fr/providers/zai" icon="server">
    Configuration complète du provider Z.AI et points de terminaison régionaux.
  </Card>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, références de modèle et comportement de basculement.
  </Card>
</CardGroup>
