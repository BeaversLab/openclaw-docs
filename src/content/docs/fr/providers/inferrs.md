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
API `/v1` compatible OpenAI. OpenClaw fonctionne avec `inferrs` via le chemin générique
`openai-completions`.

`inferrs` est actuellement mieux traité comme un backend auto-hébergé personnalisé compatible OpenAI,
et non comme un plugin provider dédié à OpenClaw.

## Quick start

1. Démarrez `inferrs` avec un modèle.

Exemple :

```bash
inferrs serve google/gemma-4-E2B-it \
  --host 127.0.0.1 \
  --port 8080 \
  --device metal
```

2. Vérifiez que le serveur est accessible.

```bash
curl http://127.0.0.1:8080/health
curl http://127.0.0.1:8080/v1/models
```

3. Ajoutez une entrée explicite de provider OpenClaw et pointez votre modèle par défaut dessus.

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

## Pourquoi `requiresStringContent` est important

Certains itinéraires de Chat Completions `inferrs` n'acceptent que des
`messages[].content` de type chaîne, et non des tableaux structurés de parties de contenu.

Si les exécutions OpenClaw échouent avec une erreur telle que :

```text
messages[1].content: invalid type: sequence, expected a string
```

définissez :

```json5
compat: {
  requiresStringContent: true
}
```

OpenClap aplatira les parties de contenu en texte brut en chaînes simples avant d'envoyer
la requête.

## Mise en garde concernant Gemma et tool-schema

Certaines combinaisons actuelles `inferrs` + Gemma acceptent de petites demandes directes
`/v1/chat/completions` mais échouent toujours lors des tours complets de l'agent-runtime
OpenClaw.

Si cela se produit, essayez d'abord ceci :

```json5
compat: {
  requiresStringContent: true,
  supportsTools: false
}
```

Cela désactive la surface du schéma d'outils d'OpenClaw pour le modèle et peut réduire la pression
de prompt sur les backends locaux plus stricts.

Si de minuscules demandes directes fonctionnent toujours mais que les tours d'agent OpenClaw normaux continuent de
crasher à l'intérieur de `inferrs`, le problème restant est généralement le comportement en amont du modèle/serveur
plutôt que la couche de transport d'OpenClaw.

## Test de fumée manuel

Une fois configuré, testez les deux couches :

```bash
curl http://127.0.0.1:8080/v1/chat/completions \
  -H 'content-type: application/json' \
  -d '{"model":"google/gemma-4-E2B-it","messages":[{"role":"user","content":"What is 2 + 2?"}],"stream":false}'

openclaw infer model run \
  --model inferrs/google/gemma-4-E2B-it \
  --prompt "What is 2 + 2? Reply with one short sentence." \
  --json
```

Si la première commande fonctionne mais que la seconde échoue, utilisez les notes de dépannage
ci-dessous.

## Troubleshooting

- `curl /v1/models` échoue : `inferrs` n'est pas en cours d'exécution, n'est pas accessible, ou n'est pas
  lié à l'hôte/port attendu.
- `messages[].content ... expected a string` : définissez
  `compat.requiresStringContent: true`.
- Les appels directs `/v1/chat/completions` minimes réussissent, mais `openclaw infer model run`
  échoue : essayez `compat.supportsTools: false`.
- OpenClaw ne reçoit plus d'erreurs de schéma, mais `inferrs` plante encore lors des tours d'agent plus
  importants : considérez cela comme une limitation en amont de `inferrs` ou du modèle et réduisez
  la pression du prompt ou changez de backend/modèle local.

## Comportement de type proxy

`inferrs` est traité comme un backend `/v1` compatible OpenAI de type proxy, et non comme
un point de terminaison natif OpenAI.

- le façonnage des demandes natif uniquement pour OpenAI ne s'applique pas ici
- pas de `service_tier`, pas de Réponses `store`, pas d'indices de cache de prompt, et pas
  de façonnage de payload compatible raisonnement OpenAI
- les en-têtes d'attribution masqués de OpenClaw (`originator`, `version`, `User-Agent`)
  ne sont pas injectés sur les URL de base `inferrs` personnalisées

## Voir aussi

- [Modèles locaux](/en/gateway/local-models)
- [Dépannage Gateway](/en/gateway/troubleshooting#local-openai-compatible-backend-passes-direct-probes-but-agent-runs-fail)
- [Fournisseurs de modèles](/en/concepts/model-providers)
