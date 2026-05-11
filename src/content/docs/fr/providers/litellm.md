---
summary: "Exécuter OpenClaw via le proxy LiteLLM pour un accès unifié aux modèles et le suivi des coûts"
title: "LiteLLM"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

[LiteLLM](https://litellm.ai) est une passerelle LLM open source qui fournit une API unifiée à plus de 100 fournisseurs de modèles. Acheminez OpenClaw via LiteLLM pour obtenir un centralisé suivi des coûts, des journaux et la flexibilité de changer de backend sans modifier votre configuration OpenClaw.

<Tip>
**Pourquoi utiliser LiteLLM avec OpenClaw ?**

- **Suivi des coûts** — Voyez exactement ce que OpenClaw dépense pour tous les modèles
- **Acheminement de modèle** — Basculez entre Claude, GPT-4, Gemini, Bedrock sans modifier la configuration
- **Clés virtuelles** — Créez des clés avec des limites de dépenses pour OpenClaw
- **Journalisation** — Journaux complets des requêtes/réponses pour le débogage
- **Replis** — Bascule automatique si votre fournisseur principal est en panne

</Tip>

## Quick start

<Tabs>
  <Tab title="Onboarding (recommended)">
    **Idéal pour :** le chemin le plus rapide vers une configuration LiteLLM fonctionnelle.

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Manual setup">
    **Idéal pour :** un contrôle total sur l'installation et la configuration.

    <Steps>
      <Step title="Start LiteLLM Proxy">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="Point OpenClaw to LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"

        openclaw
        ```

        C'est tout. OpenClaw transite maintenant via LiteLLM.
      </Step>
    </Steps>

  </Tab>
</Tabs>

## Configuration

### Environment variables

```bash
export LITELLM_API_KEY="sk-litellm-key"
```

### Config file

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
        api: "openai-completions",
        models: [
          {
            id: "claude-opus-4-6",
            name: "Claude Opus 4.6",
            reasoning: true,
            input: ["text", "image"],
            contextWindow: 200000,
            maxTokens: 64000,
          },
          {
            id: "gpt-4o",
            name: "GPT-4o",
            reasoning: false,
            input: ["text", "image"],
            contextWindow: 128000,
            maxTokens: 8192,
          },
        ],
      },
    },
  },
  agents: {
    defaults: {
      model: { primary: "litellm/claude-opus-4-6" },
    },
  },
}
```

## Advanced configuration

### Image generation

LiteLLM peut également prendre en charge l'outil `image_generate` via les routes OpenAI-compatibles
`/images/generations` et `/images/edits`. Configurez un modèle d'image LiteLLM
sous `agents.defaults.imageGenerationModel` :

```json5
{
  models: {
    providers: {
      litellm: {
        baseUrl: "http://localhost:4000",
        apiKey: "${LITELLM_API_KEY}",
      },
    },
  },
  agents: {
    defaults: {
      imageGenerationModel: {
        primary: "litellm/gpt-image-2",
        timeoutMs: 180_000,
      },
    },
  },
}
```

Les URL de bouclage LiteLLM telles que `http://localhost:4000` fonctionnent sans redéfinition
de réseau privé global. Pour un proxy hébergé sur un LAN, définissez
`models.providers.litellm.request.allowPrivateNetwork: true` car la clé API
sera envoyée à l'hôte du proxy configuré.

<AccordionGroup>
  <Accordion title="Clés virtuelles">
    Créez une clé dédiée pour OpenClaw avec des limites de dépense :

    ```bash
    curl -X POST "http://localhost:4000/key/generate" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY" \
      -H "Content-Type: application/json" \
      -d '{
        "key_alias": "openclaw",
        "max_budget": 50.00,
        "budget_duration": "monthly"
      }'
    ```

    Utilisez la clé générée en tant que `LITELLM_API_KEY`.

  </Accordion>

  <Accordion title="Routage de modèle">
    LiteLLM peut router les demandes de modèle vers différents backends. Configurez-le dans votre `config.yaml` LiteLLM :

    ```yaml
    model_list:
      - model_name: claude-opus-4-6
        litellm_params:
          model: claude-opus-4-6
          api_key: os.environ/ANTHROPIC_API_KEY

      - model_name: gpt-4o
        litellm_params:
          model: gpt-4o
          api_key: os.environ/OPENAI_API_KEY
    ```

    OpenClaw continue de demander `claude-opus-4-6` — LiteLLM gère le routage.

  </Accordion>

  <Accordion title="Affichage de l'utilisation">
    Vérifiez le tableau de bord ou l'API de LiteLLM :

    ```bash
    # Key info
    curl "http://localhost:4000/key/info" \
      -H "Authorization: Bearer sk-litellm-key"

    # Spend logs
    curl "http://localhost:4000/spend/logs" \
      -H "Authorization: Bearer $LITELLM_MASTER_KEY"
    ```

  </Accordion>

  <Accordion title="Notes sur le comportement du proxy">
    - LiteLLM s'exécute sur `http://localhost:4000` par défaut
    - OpenClaw se connecte via le point de terminaison `/v1` compatible OpenAI de style proxy de LiteLLM
    - Le formatage des demandes natif uniquement OpenAI ne s'applique pas via LiteLLM :
      pas de `service_tier`, pas de `store` de réponses, pas d'indications de cache de prompt, et pas de
      formatage de payload compatible avec le raisonnement OpenAI
    - Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`, `User-Agent`)
      ne sont pas injectés sur les URL de base LiteLLM personnalisées
  </Accordion>
</AccordionGroup>

<Note>Pour la configuration générale des fournisseurs et le comportement de basculement, consultez [Model Providers](/fr/concepts/model-providers).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Docs LiteLLM" href="https://docs.litellm.ai" icon="book">
    Documentation officielle et référence de l'API LiteLLM.
  </Card>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Aperçu de tous les fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
  <Card title="Model selection" href="/fr/concepts/models" icon="brain">
    Comment choisir et configurer des modèles.
  </Card>
</CardGroup>
