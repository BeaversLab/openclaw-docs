---
summary: "Exécuter OpenClaw via inferrs (serveur local compatible OpenAI)"
read_when:
  - You want to run OpenClaw against a local inferrs server
  - You are serving Gemma or another model through inferrs
  - You need the exact OpenClaw compat flags for inferrs
title: "inferrs"
---

# inferrs

[inferrs](https://github.com/ericcurtin/inferrs) peut servir des modèles locaux derrière une
OpenAI `/v1` compatible avec API. OpenClaw fonctionne avec `inferrs` via le chemin générique
`openai-completions`.

`inferrs` est actuellement mieux considéré comme un backend auto-hébergé personnalisé compatible avec OpenAI,
plutôt que comme un plugin de fournisseur dédié pour OpenClaw.

## Getting started

<Steps>
  <Step title="Start inferrs with a model">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="Verify the server is reachable">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="Ajouter une entrée de fournisseur OpenClaw">Ajoutez une entrée de fournisseur explicite et pointez votre modèle par défaut vers celle-ci. Voir l'exemple de configuration complet ci-dessous.</Step>
</Steps>

## Exemple de configuration complète

Cet exemple utilise Gemma 4 sur un serveur `inferrs` local.

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

## Avancé

<AccordionGroup>
  <Accordion title="Pourquoi requiresStringContent est important">
    Certains itinéraires de Chat Completions `inferrs` n'acceptent que des
    `messages[].content` de type chaîne, et non des tableaux de parties de contenu structuré.

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

    OpenClaw aplanira les parties de contenu en texte brut en chaînes simples avant d'envoyer
    la requête.

  </Accordion>

  <Accordion title="Mise en garde concernant Gemma et le schéma d'outils">
    Certaines combinaisons actuelles `inferrs` + Gemma acceptent de petites requêtes directes
    `/v1/chat/completions` mais échouent toujours lors des tours complets du runtime d'agent OpenClaw.

    Si cela se produit, essayez d'abord ceci :

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    Cela désactive la surface du schéma d'outils de OpenClaw pour le modèle et peut réduire la pression
    sur les backends locaux plus stricts.

    Si de minuscules requêtes directes fonctionnent toujours mais que les tours d'agent normaux OpenClaw continuent de
    planter à l'intérieur de `inferrs`, le problème restant provient généralement du comportement du modèle/serveur en amont
    plutôt que de la couche de transport de OpenClaw.

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

    Si la première commande fonctionne mais que la seconde échoue, consultez la section de résolution de problèmes ci-dessous.

  </Accordion>

  <Accordion title="Comportement de type proxy">
    `inferrs` est traité comme un backend OpenAI-compatible de type proxy `/v1`, et non comme
    un point de terminaison natif OpenAI.

    - Le façonnage des requêtes exclusivement pour OpenAI natif ne s'applique pas ici
    - Pas de `service_tier`, pas de `store` Responses, pas d'indications de cache de prompt, et pas de
    façonnage de payload compatible avec le raisonnement OpenAI
    - Les en-têtes d'attribution masqués de OpenClaw (`originator`, `version`, `User-Agent`)
      ne sont pas injectés sur les URL de base `inferrs` personnalisées

  </Accordion>
</AccordionGroup>

## Troubleshooting

<AccordionGroup>
  <Accordion title="curl /v1/models échoue">
    `inferrs` n'est pas en cours d'exécution, n'est pas accessible ou n'est pas lié à l'hôte/port
    attendu. Assurez-vous que le serveur est démarré et écoute sur l'adresse que vous
    avez configurée.
  </Accordion>

<Accordion title="messages[].content attendait une chaîne">Définissez `compat.requiresStringContent: true` dans l'entrée du model. Consultez la section `requiresStringContent` ci-dessus pour plus de détails.</Accordion>

<Accordion title="Les appels directs /v1/chat/completions fonctionnent mais l'exécution du model openclaw infer échoue">Essayez de définir `compat.supportsTools: false` pour désactiver la surface du schéma d'outil. Consultez la mise en garde concernant le schéma d'outil de Gemma ci-dessus.</Accordion>

  <Accordion title="inferrs plante toujours sur les tours d'agent plus volumineux">
    Si OpenClaw n'a plus d'erreurs de schéma mais que `inferrs` plante toujours sur les
    tours d'agent plus volumineux, considérez cela comme une limitation en amont de `inferrs` ou du model. Réduisez
    la pression sur le prompt ou passez à un backend local ou à un model différent.
  </Accordion>
</AccordionGroup>

<Tip>Pour une aide générale, consultez la section [Troubleshooting](/fr/help/troubleshooting) et la [FAQ](/fr/help/faq).</Tip>

## Voir aussi

<CardGroup cols={2}>
  <Card title="Modèles locaux" href="/fr/gateway/local-models" icon="server">
    Exécution d'OpenClaw sur des serveurs de modèles locaux.
  </Card>
  <Card title="Dépannage Gateway" href="/fr/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    Débogage de backends locaux compatibles avec OpenAI qui passent les sondes mais échouent lors des exécutions d'agent.
  </Card>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Vue d'ensemble de tous les fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
</CardGroup>
