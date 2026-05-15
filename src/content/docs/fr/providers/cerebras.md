---
summary: "Configuration de Cerebras (auth + sélection de model)"
title: "Cerebras"
read_when:
  - You want to use Cerebras with OpenClaw
  - You need the Cerebras API key env var or CLI auth choice
---

[Cerebras](https://www.cerebras.ai) fournit une inférence haute vitesse compatible OpenAI sur du matériel d'inférence personnalisé. OpenClaw inclut un plugin de provider Cerebras intégré avec un catalogue statique de quatre models.

| Propriété                | Valeur                                   |
| ------------------------ | ---------------------------------------- |
| ID du provider           | `cerebras`                               |
| Plugin                   | intégré, `enabledByDefault: true`        |
| Variable d'env auth      | `CEREBRAS_API_KEY`                       |
| Indicateur d'intégration | `--auth-choice cerebras-api-key`         |
| Indicateur CLI direct    | `--cerebras-api-key <key>`               |
| API                      | Compatible OpenAI (`openai-completions`) |
| URL de base              | `https://api.cerebras.ai/v1`             |
| Model par défaut         | `cerebras/zai-glm-4.7`                   |

## Getting started

<Steps>
  <Step title="Obtenir une clé API">
    Créez une clé API dans la [Cerebras Cloud Console](https://cloud.cerebras.ai).
  </Step>
  <Step title="Exécuter l'intégration">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice cerebras-api-key
```

```bash Direct flag
openclaw onboard --non-interactive \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

```bash Env only
export CEREBRAS_API_KEY=csk-...
```

    </CodeGroup>

  </Step>
  <Step title="Vérifier que les models sont disponibles">
    ```bash
    openclaw models list --provider cerebras
    ```

    La liste doit inclure les quatre models intégrés. Si `CEREBRAS_API_KEY` n'est pas résolu, `openclaw models status --json` signale l'identifiant manquant sous `auth.unusableProfiles`.

  </Step>
</Steps>

## Configuration non interactive

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice cerebras-api-key \
  --cerebras-api-key "$CEREBRAS_API_KEY"
```

## Catalogue intégré

OpenClaw fournit un catalogue statique Cerebras qui reflète le point de terminaison public compatible OpenAI. Les quatre models partagent un contexte de 128k et 8 192 jetons de sortie max.

| Réf du model                              | Nom                  | Raisonnement | Notes                                             |
| ----------------------------------------- | -------------------- | ------------ | ------------------------------------------------- |
| `cerebras/zai-glm-4.7`                    | Z.ai GLM 4.7         | oui          | Model par défaut ; model de raisonnement d'aperçu |
| `cerebras/gpt-oss-120b`                   | GPT OSS 120B         | oui          | Model de raisonnement de production               |
| `cerebras/qwen-3-235b-a22b-instruct-2507` | Qwen 3 235B Instruct | non          | Model non-reasoning d'aperçu                      |
| `cerebras/llama3.1-8b`                    | Llama 3.1 8B         | non          | Model de production axé sur la vitesse            |

<Warning>Cerebras marque `zai-glm-4.7` et `qwen-3-235b-a22b-instruct-2507` comme modèles de prévisualisation, et `llama3.1-8b` ainsi que `qwen-3-235b-a22b-instruct-2507` sont documentés pour être abandonnés le 27 mai 2026. Vérifiez la page des modèles pris en charge de Cerebras avant de vous y fier pour les charges de travail de production.</Warning>

## Configuration manuelle

Le plugin intégré signifie généralement que vous n'avez besoin que de la clé API. Utilisez une configuration explicite `models.providers.cerebras` lorsque vous souhaitez remplacer les métadonnées du modèle ou exécuter en `mode: "merge"` par rapport au catalogue statique :

```json5
{
  env: { CEREBRAS_API_KEY: "csk-..." },
  agents: {
    defaults: {
      model: { primary: "cerebras/zai-glm-4.7" },
    },
  },
  models: {
    mode: "merge",
    providers: {
      cerebras: {
        baseUrl: "https://api.cerebras.ai/v1",
        apiKey: "${CEREBRAS_API_KEY}",
        api: "openai-completions",
        models: [
          { id: "zai-glm-4.7", name: "Z.ai GLM 4.7" },
          { id: "gpt-oss-120b", name: "GPT OSS 120B" },
        ],
      },
    },
  },
}
```

<Note>Si le Gateway s'exécute en tant que démon (launchd, systemd, Docker), assurez-vous que `CEREBRAS_API_KEY` est disponible pour ce processus — par exemple dans `~/.openclaw/.env` ou via `env.shellEnv`. Une clé présente uniquement dans `~/.profile` n'aidera pas un service géré, sauf si l'environnement est importé séparément.</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Choisir des fournisseurs, des références de modèle et le comportement de basculement.
  </Card>
  <Card title="Modes de réflexion" href="/fr/tools/thinking" icon="brain">
    Niveaux d'effort de raisonnement pour les deux modèles Cerebras capables de raisonnement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/config-agents#agent-defaults" icon="gear">
    Valeurs par défaut de l'agent et configuration du modèle.
  </Card>
  <Card title="FAQ sur les modèles" href="/fr/help/faq-models" icon="circle-question">
    Profils d'authentification, changement de modèles et résolution des erreurs « aucun profil ».
  </Card>
</CardGroup>
