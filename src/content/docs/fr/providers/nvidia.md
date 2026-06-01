---
summary: "OpenAIAPIOpenClawUtiliser l'API OpenAI compatible de NVIDIA dans OpenClaw"
read_when:
  - You want to use open models in OpenClaw for free
  - You need NVIDIA_API_KEY setup
title: "NVIDIA"
---

NVIDIA fournit une API compatible OpenAI à OpenAIAPI`https://integrate.api.nvidia.com/v1`API pour
les modèles ouverts gratuitement. Authentifiez-vous avec une clé API
obtenue sur [build.nvidia.com](https://build.nvidia.com/settings/api-keys).

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

## Catalogue en vedette

Lorsqu'une clé API NVIDIA est configurée, les chemins de configuration et de sélection de modèle d'OpenClaw
essaient le catalogue public de modèles en vedette de NVIDIA provenant de
APIOpenClaw`https://assets.ngc.nvidia.com/products/api-catalog/featured-models.json`OpenClaw et
mettent en cache le résultat classé pendant 24 heures. Les nouveaux modèles en vedette de build.nvidia.com
apparaissent donc dans les surfaces de configuration et de sélection de modèle sans attendre de
nouvelle version d'OpenClaw.

La récupération utilise une stratégie d'hôte HTTPS fixe pour `assets.ngc.nvidia.com`APIOpenClaw. Si aucune
clé API NVIDIA n'est configurée, ou si ce catalogue public n'est pas disponible ou
mal formé, OpenClaw revient au catalogue fourni ci-dessous.

## Catalogue de repli inclus

| Réf du modèle                              | Nom                          | Contexte | Max sortie | Notes                                    |
| ------------------------------------------ | ---------------------------- | -------- | ---------- | ---------------------------------------- |
| `nvidia/nvidia/nemotron-3-super-120b-a12b` | NVIDIA Nemotron 3 Super 120B | 262,144  | 8,192      | Repli en vedette                         |
| `nvidia/moonshotai/kimi-k2.5`              | Kimi K2.5                    | 262,144  | 8,192      | Repli en vedette                         |
| `nvidia/minimaxai/minimax-m2.7`            | Minimax M2.7                 | 196,608  | 8,192      | Repli en vedette                         |
| `nvidia/z-ai/glm-5.1`                      | GLM 5.1                      | 202,752  | 8,192      | Repli en vedette                         |
| `nvidia/minimaxai/minimax-m2.5`            | MiniMax M2.5                 | 196,608  | 8,192      | Obsolète, compatibilité de mise à niveau |
| `nvidia/z-ai/glm5`                         | GLM-5                        | 202,752  | 8,192      | Obsolète, compatibilité de mise à niveau |

## Configuration avancée

<AccordionGroup>
  <Accordion title="Comportement d'activation automatique">
    Le fournisseur s'active automatiquement lorsque la variable d'environnement `NVIDIA_API_KEY` est définie.
    Aucune configuration explicite du fournisseur n'est requise au-delà de la clé.
  </Accordion>

<Accordion title="Catalogue et tarifs">
  OpenClaw privilégie le catalogue public de modèles en vedette de NVIDIA lorsque l'authentification NVIDIA est configurée et le met en cache pendant 24 heures. Le catalogue de repli intégré est statique et conserve les références expédiées dépréciées pour la compatibilité des mises à niveau. Les coûts sont par défaut de `0` dans la source puisque NVIDIA propose actuellement un accès gratuit à
  l'API pour les modèles listés.
</Accordion>

<Accordion title="Point de terminaison compatible OpenAI">NVIDIA utilise le point de terminaison standard de complétions `/v1`. Tout outil compatible avec OpenAI devrait fonctionner immédiatement avec l'URL de base de NVIDIA.</Accordion>

  <Accordion title="Réponses lentes de provider personnalisé">
    Certains modèles personnalisés hébergés par NVIDIA peuvent mettre plus de temps que le chien de garde d'inactivité du modèle par défaut
    avant d'émettre le premier bloc de réponse. Pour les entrées de provider NVIDIA personnalisées,
    augmentez le délai d'attente du provider au lieu d'augmenter le délai d'exécution global de l'agent :

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
    Choisir les providers, les références de modèles et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Référence complète de la configuration pour les agents, les modèles et les providers.
  </Card>
</CardGroup>
