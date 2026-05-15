---
summary: "OpenAIAPIOpenClawUtiliser l'API OpenAI compatible de NVIDIA dans OpenClaw"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

NVIDIA fournit une API compatible OpenAI sur OpenAIAPI`https://integrate.api.nvidia.com/v1`API pour
les modèles ouverts gratuitement. Authentifiez-vous avec une clé API
provenant de [build.nvidia.com](https://build.nvidia.com/settings/api-keys).

## Getting started

<Steps>
  <Step title="APIObtenez votre clé API" API>
    Créez une clé API sur [build.nvidia.com](https://build.nvidia.com/settings/api-keys).
  </Step>
  <Step title="Exportez la clé et lancez l'intégration">```bash export NVIDIA_API_KEY="nvapi-..." openclaw onboard --auth-choice nvidia-api-key ```</Step>
  <Step title="Définissez un modèle NVIDIA">```bash openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b ```</Step>
</Steps>

<Warning>Si vous transmettez `--nvidia-api-key` au lieu de la variable d'environnement, la valeur est stockée dans l'historique du shell et la sortie `ps`. Privilégiez la variable d'environnement `NVIDIA_API_KEY` lorsque possible.</Warning>

Pour une configuration non interactive, vous pouvez également transmettre la clé directement :

```bash
openclaw onboard --auth-choice nvidia-api-key --nvidia-api-key "nvapi-..."
```

## Config example

```json5
{
  env: { NVIDIA_API_KEY: "nvapi-..." },
  models: {
    providers: {
      nvidia: {
        baseUrl: "https://integrate.api.nvidia.com/v1",
        api: "openai-completions",
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "nvidia/nvidia/nemotron-3-super-120b-a12b" },
    },
  },
}
```

## Built-in catalog

| Modèle réf                                 | Nom                          | Contexte | Sortie max |
| ------------------------------------------ | ---------------------------- | -------- | ---------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144  | 8,192      |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144  | 8,192      |
| `nvidia/minimaxai/minimax-m2.5`            | Minimax M2.5                 | 196,608  | 8,192      |
| `nvidia/z-ai/glm5`                         | GLM 5                        | 202,752  | 8,192      |

## Configuration avancée

<AccordionGroup>
  <Accordion title="Comportement d'activation automatique">
    Le fournisseur s'active automatiquement lorsque la variable d'environnement `NVIDIA_API_KEY` est définie.
    Aucune configuration explicite du fournisseur n'est requise au-delà de la clé.
  </Accordion>

<Accordion title="Catalogue et tarifs">Le catalogue inclus est statique. Les coûts sont par défaut de `0`API dans la source, car NVIDIA propose actuellement un accès gratuit à l'API pour les modèles répertoriés.</Accordion>

<Accordion title="OpenAIPoint de terminaison compatible OpenAI">NVIDIA utilise le point de terminaison de complétions standard `/v1`OpenAI. Tout outil compatible OpenAI devrait fonctionner immédiatement avec l'URL de base NVIDIA.</Accordion>

  <Accordion title="Réponses lentes des fournisseurs personnalisés">
    Certains modèles personnalisés hébergés par NVIDIA peuvent prendre plus de temps que le modèle de veille d'inactivité par défaut
    avant d'émettre le premier bloc de réponse. Pour les entrées de fournisseur NVIDIA personnalisées,
    augmentez le délai d'attente du fournisseur au lieu d'augmenter le délai d'exécution global de l'agent :

    ```json5
    {
      models: {
        providers: {
          "custom-integrate-api-nvidia-com": {
            baseUrl: "https://integrate.api.nvidia.com/v1",
            api: "openai-completions",
            apiKey: "NVIDIA_API_KEY",
            timeoutSeconds: 300,
          },
        },
      },
      agents: {
        defaults: {
          models: {
            "custom-integrate-api-nvidia-com/meta/llama-3.1-70b-instruct": {
              params: { thinking: "off" },
            },
          },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

<Tip>Les modèles NVIDIA sont actuellement gratuits à utiliser. Consultez [build.nvidia.com](https://build.nvidia.com/) pour les dernières informations sur la disponibilité et les détails de la limite de débit.</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèle et comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
