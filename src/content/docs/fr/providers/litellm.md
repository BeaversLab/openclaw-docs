---
summary: "Exécuter OpenClaw via le proxy LiteLLM pour un accès unifié aux modèles et le suivi des coûts"
title: "LiteLLM"
read_when:
  - You want to route OpenClaw through a LiteLLM proxy
  - You need cost tracking, logging, or model routing through LiteLLM
---

[LiteLLM](https://litellm.ai) est une passerelle LLM open source qui fournit une API unifiée pour plus de 100 fournisseurs de modèles. Acheminez OpenClaw via LiteLLM pour bénéficier d'un suivi centralisé des coûts, de la journalisation et de la flexibilité de changer de backend sans modifier votre configuration OpenClaw.

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
  <Tab title="Onboarding (recommandé)">
    **Idéal pour :** la voie la plus rapide vers une configuration LiteLLM fonctionnelle.

    <Steps>
      <Step title="Exécuter l'onboarding">
        ```bash
        openclaw onboard --auth-choice litellm-api-key
        ```

        Pour une configuration non interactive sur un proxy distant, transmettez l'URL du proxy explicitement :

        ```bash
        openclaw onboard --non-interactive --auth-choice litellm-api-key --litellm-api-key "$LITELLM_API_KEY" --custom-base-url "https://litellm.example/v1"
        ```
      </Step>
    </Steps>

  </Tab>

  <Tab title="Installation manuelle">
    **Idéal pour :** un contrôle total de l'installation et de la configuration.

    <Steps>
      <Step title="Démarrer le proxy LiteLLM">
        ```bash
        pip install 'litellm[proxy]'
        litellm --model claude-opus-4-6
        ```
      </Step>
      <Step title="OpenClawPointer OpenClaw vers LiteLLM">
        ```bash
        export LITELLM_API_KEY="your-litellm-key"

        openclaw
        ```OpenClaw

        C'est tout. OpenClaw route maintenant via LiteLLM.
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

LiteLLM peut également prendre en charge l'outil `image_generate`OpenAI via les routes
`/images/generations` et `/images/edits` compatibles OpenAI. Configurez un modèle d'image
LiteLLM sous `agents.defaults.imageGenerationModel` :

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

Les URL de rebouclage LiteLLM telles que `http://localhost:4000` fonctionnent sans substitution de réseau privé globale. Pour un proxy hébergé sur un réseau local, définissez `models.providers.litellm.request.allowPrivateNetwork: true` car la clé API sera envoyée à l'hôte du proxy configuré.

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

    Utilisez la clé générée comme `LITELLM_API_KEY`.

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

  <Accordion title="Consultation de l'utilisation">
    Consultez le tableau de bord LiteLLM ou l'API :

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
    - OpenClaw se connecte via le point de terminaison compatible OpenAI de style proxy de LiteLLM `/v1`
    - La mise en forme des requêtes native uniquement OpenAI ne s'applique pas via LiteLLM :
      pas de `service_tier`, pas de Responses `store`, pas d'indications de cache de prompt, et pas de
      mise en forme de payload de compatibilité de raisonnement OpenAI
    - Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`, `User-Agent`)
      ne sont pas injectés sur les URL de base LiteLLM personnalisées
  </Accordion>
</AccordionGroup>

<Note>Pour la configuration générale des providers et le comportement de basculement, voir [Fournisseurs de modèles](/fr/concepts/model-providers).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="LiteLLM Docs" href="https://docs.litellm.ai" icon="book" API>
    Documentation officielle LiteLLM et référence de l'API.
  </Card>
  <Card title="Model selection" href="/fr/concepts/model-providers" icon="layers">
    Vue d'ensemble de tous les providers, références de modèles et comportements de basculement.
  </Card>
  <Card title="Configuration" href="/fr/gateway/configuration" icon="gear">
    Référence complète de la configuration.
  </Card>
  <Card title="Sélection de modèle" href="/fr/concepts/models" icon="brain">
    Comment choisir et configurer des modèles.
  </Card>
</CardGroup>
