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
  <Step title="Démarrer inferrs avec un modèle">```bash inferrs serve google/gemma-4-E2B-it \ --host 127.0.0.1 \ --port 8080 \ --device metal ```</Step>
  <Step title="Vérifier que le serveur est accessible">```bash curl http://127.0.0.1:8080/health curl http://127.0.0.1:8080/v1/models ```</Step>
  <Step title="Ajouter une entrée de fournisseur OpenClaw">Ajoutez une entrée de fournisseur explicite et pointez votre modèle par défaut vers celle-ci. Voir l'exemple de configuration complet ci-dessous.</Step>
</Steps>

## Exemple de configuration complet

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
    Certaines routes de Chat Completions `inferrs` n'acceptent que des
    `messages[].content` de type chaîne, et non des tableaux de parties de contenu structuré.

    <Warning>
    Si les exécutions OpenClaw échouent avec une erreur telle que :

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

    OpenClaw aplatira les parties de contenu texte pur en chaînes simples avant d'envoyer
    la requête.

  </Accordion>

  <Accordion title="Mise en garde concernant Gemma et le schéma d'outils">
    Certaines combinaisons actuelles de `inferrs` + Gemma acceptent de petites demandes `/v1/chat/completions` directes
    mais échouent toujours lors des tours complets de l'agent-runtime OpenClaw.

    Si cela se produit, essayez d'abord ceci :

    ```json5
    compat: {
      requiresStringContent: true,
      supportsTools: false
    }
    ```

    Cela désactive la surface du schéma d'outils d'OpenClaw pour le modèle et peut réduire la pression
    sur les backends locaux plus stricts.

    Si de minuscules demandes directes fonctionnent toujours mais que les tours d'agent OpenClaw normaux continuent de
    planter à l'intérieur de `inferrs`, le problème restant est généralement le comportement en amont du modèle/serveur
    plutôt que la couche de transport d'OpenClaw.

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
    `inferrs` est traité comme un backend `/v1` compatible OpenAI de type proxy, et non comme
    un point de terminaison OpenAI natif.

    - Le façonnage des requères natif uniquement OpenAI ne s'applique pas ici
    - Pas de `service_tier`, pas de `store` Responses, pas d'indices de cache de prompt, et pas
    de façonnage de payload de compatibilité de raisonnement OpenAI
    - Les en-têtes d'attribution OpenClaw masqués (`originator`, `version`, `User-Agent`)
      ne sont pas injectés sur les URL de base `inferrs` personnalisées

  </Accordion>
</AccordionGroup>

## Dépannage

<AccordionGroup>
  <Accordion title="curl /v1/models échoue">
    `inferrs` n'est pas en cours d'exécution, n'est pas joignable ou n'est pas lié à l'hôte/port
    attendu. Assurez-vous que le serveur est démarré et écoute sur l'adresse que vous
    avez configurée.
  </Accordion>

<Accordion title="messages[].content attendait une chaîne">Définissez `compat.requiresStringContent: true` dans l'entrée du modèle. Consultez la section `requiresStringContent` ci-dessus pour plus de détails.</Accordion>

<Accordion title="Les appels directs /v1/chat/completions fonctionnent mais l'exécution du modèle openclaw infer échoue">Essayez de définir `compat.supportsTools: false` pour désactiver la surface du schéma d'outil. Voir la mise en garde concernant le schéma d'outil Gemma ci-dessus.</Accordion>

  <Accordion title="inferrs plante toujours lors des tours d'agent plus volumineux">
    Si OpenClaw n'obtient plus d'erreurs de schéma mais que `inferrs` plante toujours lors des tours d'agent
    plus volumineux, considérez cela comme une limitation en amont de `inferrs` ou du modèle. Réduisez
    la pression du prompt ou passez à un backend ou modèle local différent.
  </Accordion>
</AccordionGroup>

<Tip>Pour une aide générale, consultez la section [Dépannage](/fr/help/troubleshooting) et la [FAQ](/fr/help/faq).</Tip>

## Voir aussi

<CardGroup cols={2}>
  <Card title="Modèles locaux" href="/fr/gateway/local-models" icon="serveur">
    Exécution d'OpenClaw sur des serveurs de modèles locaux.
  </Card>
  <Card title="Dépannage du Gateway" href="/fr/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail" icon="wrench">
    Débogage des backends locaux compatibles OpenAI qui réussissent les sondes mais échouent lors des exécutions d'agent.
  </Card>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Vue d'ensemble de tous les fournisseurs, références de modèles et comportements de basculement.
  </Card>
</CardGroup>
