---
summary: "Configuration de Groq (auth + sélection de modèle + transcription Whisper)"
title: "Groq"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
  - You are configuring Whisper audio transcription on Groq
---

[Groq](https://groq.com) fournit une inférence ultra-rapide sur des modèles à poids ouverts (Llama, Gemma, Kimi, Qwen, GPT OSS, et plus) grâce à un matériel LPU personnalisé. OpenClaw inclut un plugin Groq intégré qui enregistre à la fois un fournisseur de chat compatible OpenAI et un fournisseur de compréhension média audio.

| Propriété                                   | Valeur                                   |
| ------------------------------------------- | ---------------------------------------- |
| ID du fournisseur                           | `groq`                                   |
| Plugin                                      | intégré, `enabledByDefault: true`        |
| Variable d'environnement d'authentification | `GROQ_API_KEY`                           |
| Indicateur d'intégration                    | `--auth-choice groq-api-key`             |
| API                                         | Compatible OpenAI (`openai-completions`) |
| URL de base                                 | `https://api.groq.com/openai/v1`         |
| Transcription audio                         | `whisper-large-v3-turbo` (par défaut)    |
| Conversation par défaut suggérée            | `groq/llama-3.3-70b-versatile`           |

## Getting started

<Steps>
  <Step title="Obtenir une clé API">
    Créez une clé API sur [console.groq.com/keys](https://console.groq.com/keys).
  </Step>
  <Step title="Définir la clé API">
    <CodeGroup>

```bash Onboarding
openclaw onboard --auth-choice groq-api-key
```

```bash Env only
export GROQ_API_KEY=gsk_...
```

    </CodeGroup>

  </Step>
  <Step title="Set a default model">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/llama-3.3-70b-versatile" },
        },
      },
    }
    ```
  </Step>
  <Step title="Verify the catalog is reachable">
    ```bash
    openclaw models list --provider groq
    ```
  </Step>
</Steps>

### Exemple de fichier de configuration

```json5
{
  env: { GROQ_API_KEY: "gsk_..." },
  agents: {
    defaults: {
      model: { primary: "groq/llama-3.3-70b-versatile" },
    },
  },
}
```

## Catalogue intégré

OpenClaw fournit un catalogue Groq basé sur un manifeste, avec des entrées de raisonnement et non raisonnement. Exécutez `openclaw models list --provider groq` pour voir les lignes incluses dans votre version installée, ou consultez [console.groq.com/docs/models](https://console.groq.com/docs/models) pour la liste officielle de Groq.

| Réf modèle                                       | Nom                     | Raisonnement | Entrée        | Contexte |
| ------------------------------------------------ | ----------------------- | ------------ | ------------- | -------- |
| `groq/llama-3.3-70b-versatile`                   | Llama 3.3 70B Versatile | non          | texte         | 131 072  |
| `groq/llama-3.1-8b-instant`                      | Llama 3.1 8B Instant    | non          | texte         | 131 072  |
| `groq/meta-llama/llama-4-scout-17b-16e-instruct` | Llama 4 Scout 17B       | non          | texte + image | 131 072  |
| `groq/openai/gpt-oss-120b`                       | GPT OSS 120B            | yes          | text          | 131 072  |
| `groq/openai/gpt-oss-20b`                        | GPT OSS 20B             | yes          | texte         | 131,072  |
| `groq/openai/gpt-oss-safeguard-20b`              | Safety GPT OSS 20B      | yes          | texte         | 131,072  |
| `groq/qwen/qwen3-32b`                            | Qwen3 32B               | yes          | texte         | 131,072  |
| `groq/groq/compound`                             | Compound                | yes          | texte         | 131,072  |
| `groq/groq/compound-mini`                        | Compound Mini           | yes          | texte         | 131 072  |

<Tip>Le catalogue évolue avec chaque version de OpenClaw. `openclaw models list --provider groq` affiche les lignes connues de votre version installée ; vérifiez auprès de [console.groq.com/docs/models](https://console.groq.com/docs/models) pour les modèles nouvellement ajoutés ou obsolètes.</Tip>

## Modèles de raisonnement

OpenClaw mappe ses niveaux partagés `/think` aux valeurs `reasoning_effort` spécifiques aux modèles de Groq :

- Pour `qwen/qwen3-32b`, la réflexion désactivée envoie `none` et la réflexion activée envoie `default`.
- Pour les modèles de raisonnement Groq GPT OSS (`openai/gpt-oss-*`OpenClaw), OpenClaw envoie `low`, `medium` ou `high` en fonction du niveau `/think`. La pensée désactivée omet `reasoning_effort` car ces modèles ne prennent pas en charge une valeur désactivée.
- DeepSeek R1 Distill, Qwen QwQ et Compound utilisent la surface de raisonnement native de Groq ; Qwen`/think` contrôle la visibilité mais le modèle raisonne toujours.

Consultez [Modes de pensée](/fr/tools/thinking) pour les niveaux `/think`OpenClaw partagés et la manière dont OpenClaw les traduit pour chaque fournisseur.

## Transcription audio

Le plugin fourni par Groq enregistre également un **fournisseur de compréhension de média audio** afin que les messages vocaux puissent être transcrits via la surface partagée `tools.media.audio`.

| Propriété                       | Valeur                                          |
| ------------------------------- | ----------------------------------------------- |
| Chemin de configuration partagé | `tools.media.audio`                             |
| URL de base par défaut          | `https://api.groq.com/openai/v1`                |
| Modèle par défaut               | `whisper-large-v3-turbo`                        |
| Priorité automatique            | 20                                              |
| Point de terminaison API        | OpenAI`/audio/transcriptions` compatible OpenAI |

Pour faire de Groq le backend audio par défaut :

```json5
{
  tools: {
    media: {
      audio: {
        models: [{ provider: "groq" }],
      },
    },
  },
}
```

<AccordionGroup>
  <Accordion title="Disponibilité de l'environnement pour le démon"GatewayDocker>
    Si la Gateway s'exécute en tant que service géré (launchd, systemd, Docker), `GROQ_API_KEY` doit être visible pour ce processus — et pas seulement pour votre shell interactif.

    <Warning>
      Une clé exportée uniquement dans un shell interactif n'aidera pas un démon launchd ou systemd à moins que cet environnement ne soit également importé là-bas. Définissez la clé dans `~/.openclaw/.env` ou via `env.shellEnv` pour la rendre lisible depuis le processus de la passerelle.
    </Warning>

  </Accordion>

  <Accordion title="Custom Groq model ids"OpenClaw>
    OpenClaw accepte n'importe quel id de modèle Groq lors de l'exécution. Utilisez l'ID exact affiché par Groq et préfixez-le avec `groq/`. Le catalogue intégré couvre les cas courants ; les ID non répertoriés reviennent au modèle compatible OpenAI par défaut.

    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "groq/<your-model-id>" },
        },
      },
    }
    ```

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Model providers" href="/fr/concepts/model-providers" icon="layers">
    Choisir les providers, les références de modèles et le comportement de basculement.
  </Card>
  <Card title="Thinking modes" href="/fr/tools/thinking" icon="brain">
    Niveaux d'effort de raisonnement et interaction avec la stratégie du provider.
  </Card>
  <Card title="Configuration reference" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet, y compris les paramètres du provider et de l'audio.
  </Card>
  <Card title="Groq Console" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Tableau de bord Groq, documentation de l'API et tarifs.
  </Card>
</CardGroup>
