---
summary: "Configuration de Chutes (OAuth ou clé API, découverte de modèle, alias)"
title: "Chutes"
read_when:
  - You want to use Chutes with OpenClaw
  - You need the OAuth or API key setup path
  - You want the default model, aliases, or discovery behavior
---

[Chutes](https://chutes.ai) expose des catalogues de modèles open source via une
API compatible OpenAI. OpenClaw prend en charge à la fois l'OAuth navigateur et l'authentification
directe par clé API pour le provider `chutes` inclus.

| Propriété   | Valeur                             |
| ----------- | ---------------------------------- |
| Provider    | `chutes`                           |
| API         | Compatible OpenAI                  |
| URL de base | `https://llm.chutes.ai/v1`         |
| Auth        | OAuth ou clé API (voir ci-dessous) |

## Getting started

<Tabs>
  <Tab title="OAuth">
    <Steps>
      <Step title="Exécuter le flux d'intégration OAuth">```bash openclaw onboard --auth-choice chutes ``` OpenClaw lance le flux navigateur localement, ou affiche une URL + un flux de redirection-collage sur les hôtes distants/sans interface. Les jetons OAuth s'actualisent automatiquement via les profils d'authentification d'OpenClaw.</Step>
      <Step title="Vérifier le modèle par défaut">Après l'intégration, le modèle par défaut est défini sur `chutes/zai-org/GLM-4.7-TEE` et le catalogue Chutes inclus est enregistré.</Step>
    </Steps>
  </Tab>
  <Tab title="Clé API">
    <Steps>
      <Step title="Obtenir une clé API">Créez une clé sur [chutes.ai/settings/api-keys](https://chutes.ai/settings/api-keys).</Step>
      <Step title="Exécuter le flux d'intégration par clé API">```bash openclaw onboard --auth-choice chutes-api-key ```</Step>
      <Step title="Vérifier le modèle par défaut">Après l'intégration, le modèle par défaut est défini sur `chutes/zai-org/GLM-4.7-TEE` et le catalogue Chutes inclus est enregistré.</Step>
    </Steps>
  </Tab>
</Tabs>

<Note>Les deux méthodes d'authentification enregistrent le catalogue Chutes inclus et définissent le modèle par défaut sur `chutes/zai-org/GLM-4.7-TEE`. Variables d'environnement d'exécution : `CHUTES_API_KEY`, `CHUTES_OAUTH_TOKEN`.</Note>

## Discovery behavior

Lorsque l'authentification Chutes est disponible, OpenClaw interroge le catalogue Chutes avec ces
informations d'identification et utilise les modèles découverts. Si la découverte échoue, OpenClaw revient
à un catalogue statique intégré afin que l'onboarding et le démarrage fonctionnent toujours.

## Alias par défaut

OpenClaw enregistre trois alias pratiques pour le catalogue Chutes intégré :

| Alias           | Modèle cible                                          |
| --------------- | ----------------------------------------------------- |
| `chutes-fast`   | `chutes/zai-org/GLM-4.7-FP8`                          |
| `chutes-pro`    | `chutes/deepseek-ai/DeepSeek-V3.2-TEE`                |
| `chutes-vision` | `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506` |

## Built-in starter catalog

Le catalogue de repli intégré inclut les références Chutes actuelles :

| Référence de modèle                                   |
| ----------------------------------------------------- |
| `chutes/zai-org/GLM-4.7-TEE`                          |
| `chutes/zai-org/GLM-5-TEE`                            |
| `chutes/deepseek-ai/DeepSeek-V3.2-TEE`                |
| `chutes/deepseek-ai/DeepSeek-R1-0528-TEE`             |
| `chutes/moonshotai/Kimi-K2.5-TEE`                     |
| `chutes/chutesai/Mistral-Small-3.2-24B-Instruct-2506` |
| `chutes/Qwen/Qwen3-Coder-Next-TEE`                    |
| `chutes/openai/gpt-oss-120b-TEE`                      |

## Exemple de configuration

```json5
{
  agents: {
    defaults: {
      model: { primary: "chutes/zai-org/GLM-4.7-TEE" },
      models: {
        "chutes/zai-org/GLM-4.7-TEE": { alias: "Chutes GLM 4.7" },
        "chutes/deepseek-ai/DeepSeek-V3.2-TEE": { alias: "Chutes DeepSeek V3.2" },
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Remplacements OAuth">
    Vous pouvez personnaliser le flux OAuth avec des variables d'environnement facultatives :

    | Variable | Objectif |
    | -------- | ------- |
    | `CHUTES_CLIENT_ID` | ID client OAuth personnalisé |
    | `CHUTES_CLIENT_SECRET` | Secret client OAuth personnalisé |
    | `CHUTES_OAUTH_REDIRECT_URI` | URI de redirection personnalisée |
    | `CHUTES_OAUTH_SCOPES` | Portées OAuth personnalisées |

    Consultez la [documentation OAuth de Chutes](https://chutes.ai/docs/sign-in-with-chutes/overview)
    pour les exigences et l'aide concernant l'application de redirection.

  </Accordion>

  <Accordion title="Notes">
    - La découverte par clé d'API et OAuth utilise le même identifiant de fournisseur `chutes`.
    - Les modèles Chutes sont enregistrés en tant que `chutes/<model-id>`.
    - Si la découverte échoue au démarrage, le catalogue statique intégré est utilisé automatiquement.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Règles du fournisseur, références de modèle et comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet incluant les paramètres du provider.
  </Card>
  <Card title="Chutes" href="https://chutes.ai" icon="arrow-up-right-from-square">
    Tableau de bord Chutes et documentation API.
  </Card>
  <Card title="Clés API Chutes" href="https://chutes.ai/settings/api-keys" icon="key">
    Créez et gérez les clés API Chutes.
  </Card>
</CardGroup>
