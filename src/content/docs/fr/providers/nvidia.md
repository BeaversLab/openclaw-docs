---
summary: "Utiliser l'OpenAI compatible OpenAI dans OpenClaw"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

# NVIDIA

NVIDIA fournit une OpenAI compatible API sur `https://integrate.api.nvidia.com/v1` pour
les modèles ouverts gratuitement. Authentifiez-vous avec une clé API depuis
[build.nvidia.com](https://build.nvidia.com/settings/api-keys).

## Getting started

<Steps>
  <Step title="Obtenez votre clé API">Créez une clé API sur [build.nvidia.com](https://build.nvidia.com/settings/api-keys).</Step>
  <Step title="Exportez la clé et lancez l'onboarding">```bash export NVIDIA_API_KEY="nvapi-..." openclaw onboard --auth-choice skip ```</Step>
  <Step title="Définir un modèle NVIDIA">```bash openclaw models set nvidia/nvidia/nemotron-3-super-120b-a12b ```</Step>
</Steps>

<Warning>Si vous passez `--token` au lieu de la env var, la valeur atterrit dans l'historique du shell et la sortie `ps`. Préférez la variable d'environnement `NVIDIA_API_KEY` lorsque c'est possible.</Warning>

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

## Advanced notes

<AccordionGroup>
  <Accordion title="Comportement d'activation automatique">
    Le provider s'active automatiquement lorsque la variable d'environnement `NVIDIA_API_KEY` est définie.
    Aucune configuration explicite du provider n'est requise au-delà de la clé.
  </Accordion>

<Accordion title="Catalogue et tarifs">Le catalogue inclus est statique. Les coûts sont par défaut de `0` dans la source puisque NVIDIA propose actuellement un accès gratuit à l'API pour les modèles listés.</Accordion>

  <Accordion title="Point de terminaison compatible OpenAI">
    NVIDIA utilise le point de terminaison standard de complétions `/v1`. Tout outil compatible OpenAI
    devrait fonctionner hors de la boîte avec l'URL de base NVIDIA.
  </Accordion>
</AccordionGroup>

<Tip>Les modèles NVIDIA sont actuellement gratuits à utiliser. Consultez [build.nvidia.com](https://build.nvidia.com/) pour les dernières informations sur la disponibilité et les détails de limitation de débit.</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, références de modèles et comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les fournisseurs.
  </Card>
</CardGroup>
