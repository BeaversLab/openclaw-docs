---
summary: "Exécuter OpenClaw via inferrs (serveur local compatible OpenAI)"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "Inferrs"
---

[inferrs](https://github.com/ericcurtin/inferrs) peut servir des modèles locaux derrière une API compatible OpenAIAPIOpenClaw`/v1`. OpenClaw fonctionne avec `inferrs` via le chemin générique `openai-completions`.

| Propriété                                   | Valeur                                                                                            |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| ID du fournisseur                           | `inferrs` (personnalisé ; configurez sous `models.providers.inferrs`)                             |
| Plugin                                      | aucun — `inferrs`OpenClaw n'est pas un plugin de fournisseur OpenClaw inclus                      |
| Variable d'environnement d'authentification | Optionnel. N'importe quelle valeur fonctionne si votre serveur inferrs n'a pas d'authentification |
| API                                         | Compatible OpenAI (`openai-completions`)                                                          |
| URL de base suggérée                        | `http://127.0.0.1:8080/v1` (ou là où réside votre serveur inferrs)                                |

<Note>
  `inferrs` est actuellement mieux traité comme un backend auto-hébergé personnalisé compatible OpenAI, et non comme un plugin de fournisseur dédié OpenClaw. Vous le configurez via `models.providers.inferrs` plutôt qu'un choix de drapeau d'intégration. Si vous avez besoin d'un vrai plugin inclus avec découverte automatique, voir [SGLang](/fr/providers/sglang) ou [vLLM](/fr/providers/vllm).
</Note>

## Getting started

<Steps>
  <Step title="Start inferrs with a model">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="Verify the server is reachable">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="Add an OpenClaw provider entry">Add an explicit provider entry and point your default model at it. See the full config example below.</Step>
</Steps>

## Exemple de configuration complète

Cet exemple utilise Gemma 4 sur un serveur local `inferrs`.

```json5
{
  agents: {
    defaults: {
      model: { primary: "inferrs/google/gemma-4-E2B-it" },
      models: {
        "inferrs/google/gemma-4-E2B-it": {
          alias: "Gemma 4 (inferrs)",
        },
      },
    },
  },
  models: {
    mode: "merge",
    providers: {
      inferrs: {
        baseUrl: "http://127.0.0.1:8080/v1",
        apiKey: "inferrs-local",
        api: "openai-completions",
        models: [
          {
            id: "google/gemma-4-E2B-it",
            name: "Gemma 4 E2B (inferrs)",
            reasoning: false,
            input: ["text"],
            cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
            contextWindow: 131072,
            maxTokens: 4096,
            compat: {
              requiresStringContent: true,
            },
          },
        ],
      },
    },
  },
}
```

## Configuration avancée

<AccordionGroup>
  <Accordion title="Pourquoi requiresStringContent est important">
    Certains itinéraires `inferrs` Chat Completions n'acceptent que des `messages[].content`
    de type chaîne, et non des tableaux de parties de contenu structuré.

    <Warning>
    Si les exécutions OpenClaw échouent avec une erreur du type :

    ```text
    messages[1].content: invalid type: sequence, expected a string
    ```

    définissez `compat.requiresStringContent: true` dans votre entrée de modèle.
    </Warning>

    ```json5
    compat: {
      requiresStringContent: true
    }
    ```

    OpenClaw aplatira les parties de contenu de texte pur en chaînes simples avant d'envoyer
    la requête.

  </Accordion>

  <Accordion title="Mise en garde concernant Gemma et le schéma d'outil">
    Certaines combinaisons actuelles `inferrs` + Gemma acceptent de petites requêtes `/v1/chat/completions`
    directes mais échouent toujours lors des tours complets de l'agent-runtime OpenClaw.

    Si cela se produit, essayez d'abord ceci :

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    Cela désactive la surface du schéma d'outil OpenClaw pour le modèle et peut réduire la pression
    sur les backends locaux plus stricts.

    Si de minuscules requêtes directes fonctionnent toujours mais que les tours d'agent normaux OpenClaw continuent de
    planter à l'intérieur `inferrs`, le problème restant est généralement lié au comportement en amont du modèle/serveur
    plutôt qu'à la couche de transport OpenClaw.

  </Accordion>

  <Accordion title="Test de fumée manuel">
    Une fois configuré, testez les deux couches :

    ```bash
    curl http://127.0.0.1:8080/v1/chat/completions \
      -H 'content-type: application/json' \
      -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'
    ```

    ```bash
    openclaw infer model run \
      --model inferrs/google/gemma-4-E2B-it \
      --prompt "What is 2 + 2? Reply with one short sentence." \
      --json
    ```

    Si la première commande fonctionne mais que la seconde échoue, consultez la section de dépannage ci-dessous.

  </Accordion>

  <Accordion title="Comportement de type proxy">
    `inferrs`OpenAI est traité comme un backend `/v1`OpenAIOpenAI compatible OpenAI de type proxy, et non comme
    un point de terminaison natif OpenAI.

    - La mise en forme des requêtes natives uniquement OpenAI ne s'applique pas ici
    - Pas de `service_tier`, pas de Réponses `store`OpenAIOpenClaw, pas d'indications de cache de prompt, et pas de
    mise en forme de payload de compatibilité de raisonnement OpenAI
    - Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`, `User-Agent`)
    ne sont pas injectés sur les URL de base `inferrs` personnalisées

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="curl /v1/models échoue">
    `inferrs` n'est pas en cours d'exécution, n'est pas accessible ou n'est pas lié à l'hôte/port
    attendu. Assurez-vous que le serveur est démarré et écoute sur l'adresse que
    vous avez configurée.
  </Accordion>

<Accordion title="messages[].content attendait une chaîne">Définissez `compat.requiresStringContent: true` dans l'entrée du modèle. Voir la section `requiresStringContent` ci-dessus pour plus de détails.</Accordion>

<Accordion title="Les appels directs /v1/chat/completions réussissent mais openclaw infer model run échoue">Essayez de définir `compat.supportsTools: false` pour désactiver la surface du schéma d'outil. Voir la mise en garde concernant le schéma d'outil Gemma ci-dessus.</Accordion>

  <Accordion title="inferrs plante encore lors des tours d'agent plus volumineux"OpenClaw>
    Si OpenClaw n'obtient plus d'erreurs de schéma mais que `inferrs` plante encore lors des tours d'agent
    plus volumineux, considérez cela comme une limitation en amont de `inferrs` ou du modèle. Réduisez
    la pression du prompt ou passez à un backend local ou à un modèle différent.
  </Accordion>
</AccordionGroup>

<Tip>Pour une aide générale, consultez [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Tip>

## Connexes

<CardGroup cols={2}>
  <Card title="Modèles locaux" href="/fr/gateway/local-models" icon="serveur">
    Exécution d'OpenClaw sur des serveurs de modèles locaux.
  </Card>
  <Card title="Dépannage du Gateway" href="/fr/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    Débogage des backends locaux compatibles OpenAI qui passent les sondes mais échouent lors des exécutions d'agent.
  </Card>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Aperçu de tous les fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
</CardGroup>
