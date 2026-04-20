---
title: "LiteLLM"
summary: "Exécuter OpenClaw via le proxy LiteLLM pour un accès unifié au modèle et le suivi des coûts"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

# LiteLLM

[LiteLLM](https://litellm.ai) est une passerelle LLM open source qui fournit une API unifiée pour plus de 100 fournisseurs de modèles. Acheminez OpenClaw via LiteLLM pour bénéficier d'un suivi centralisé des coûts, de journaux et de la flexibilité de changer de backend sans modifier votre configuration OpenClaw.

<Tip>
**Pourquoi utiliser LiteLLM avec OpenClaw ?**

- **Suivi des coûts** — Voyez exactement ce que OpenClaw dépense pour tous les modèles
- **Acheminement des modèles** — Basculez entre Claude, GPT-4, Gemini, Bedrock sans modification de configuration
- **Clés virtuelles** — Créez des clés avec des limites de dépense pour OpenClaw
- **Journalisation** — Journaux complets des requêtes/réponses pour le débogage
- **Secours** — Bascule automatique si votre fournisseur principal est en panne
  </Tip>

## Quick start

<Tabs>
  <Tab title="Onboarding (recommended)">
    **Idéal pour :** la voie la plus rapide vers une configuration LiteLLM fonctionnelle.

    <Steps>
      <Step title="Run onboarding">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Manual setup">
    **Idéal pour :** un contrôle total de l'installation et de la configuration.

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

        C'est tout. OpenClaw transite désormais par LiteLLM.
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

## Advanced topics

<AccordionGroup>
  <Accordion title="Virtual keys">
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

  <Accordion title="Model routing">
    LiteLLM peut acheminer les demandes de modèles vers différents backends. Configurez cela dans votre `config.yaml` LiteLLM :

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

    OpenClaw continue de demander `claude-opus-4-6` — LiteLLM gère l'acheminement.

  </Accordion>

  <Accordion title="Viewing usage">
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
    - OpenClaw se connecte via le point de terminaison compatible OpenAI de style proxy `/v1`
      de LiteLLM
    - La mise en forme des requêtes native exclusivement OpenAI ne s'applique pas via LiteLLM :
      pas de `service_tier`, pas de `store` Responses, pas d'indications de cache de prompt, et pas de
      mise en forme de payload compatible raisonnement OpenAI
    - Les en-têtes d'attribution masqués d'OpenClaw (`originator`, `version`, `User-Agent`)
      ne sont pas injectés sur les URL de base LiteLLM personnalisées
  </Accordion>
</AccordionGroup>

<Note>Pour la configuration générale des providers et le comportement de basculement, voir [Model Providers](/fr/concepts/model-providers).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Documentation LiteLLM" href="https://docs.litellm.ai" icon="book">
    Documentation officielle et référence de l'API LiteLLM.
  </Card>
  <Card title="Model providers" href="/fr/concepts/model-providers" icon="layers">
    Vue d'ensemble de tous les providers, références de modèles et comportements de basculement.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
  <Card title="Sélection de modèle" href="/fr/concepts/models" icon="brain">
    Comment choisir et configurer les modèles.
  </Card>
</CardGroup>
