---
title: "Groq"
summary: "Configuration de Groq (auth + sélection de modèle)"
read_when:
  - You want to use Groq with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Groq

[Groq](https://groq.com) fournit une inférence ultra-rapide sur des modèles open source
(Llama, Gemma, Mistral, et bien d'autres) grâce à un matériel LPU personnalisé. OpenClaw se connecte
à Groq via son OpenAI compatible avec API.

| Propriété   | Valeur                 |
| ----------- | ---------------------- |
| Fournisseur | `groq`                 |
| Auth        | `GROQ_API_KEY`         |
| API         | compatible avec OpenAI |

## Getting started

<Steps>
  <Step title="Obtenir une clé API">
    Créez une clé API sur [console.groq.com/keys](https://console.groq.com/keys).
  </Step>
  <Step title="Définir la clé API">
    ```bash
    export GROQ_API_KEY="gsk_..."
    ```
  </Step>
  <Step title="Définir un model par défaut">
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

## Modèles disponibles

Le catalogue de modèles de Groq change fréquemment. Exécutez `openclaw models list | grep groq`
pour voir les modèles actuellement disponibles, ou consultez
[console.groq.com/docs/models](https://console.groq.com/docs/models).

| Modèle                      | Remarques                             |
| --------------------------- | ------------------------------------- |
| **Llama 3.3 70B Versatile** | Polyvalent, grand contexte            |
| **Llama 3.1 8B Instant**    | Rapide, léger                         |
| **Gemma 2 9B**              | Compact, efficace                     |
| **Mixtral 8x7B**            | Architecture MoE, raisonnement solide |

<Tip>Utilisez `openclaw models list --provider groq` pour la liste la plus à jour des modèles disponibles sur votre compte.</Tip>

## Transcription audio

Groq fournit également une transcription audio rapide basée sur Whisper. Lorsqu'il est configuré en tant que
fournisseur de compréhension des médias, OpenClaw utilise le modèle `whisper-large-v3-turbo`
de Groq pour transcrire les messages vocaux via l'interface partagée `tools.media.audio`.

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
  <Accordion title="Détails de la transcription audio">
    | Propriété | Valeur |
    |----------|-------|
    | Chemin de config partagé | `tools.media.audio` |
    | URL de base par défaut   | `https://api.groq.com/openai/v1` |
    | Modèle par défaut      | `whisper-large-v3-turbo` |
    | Point de terminaison API       | `/audio/transcriptions` compatible OpenAI |
  </Accordion>

  <Accordion title="Note sur l'environnement">
    Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `GROQ_API_KEY` est
    disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
    `env.shellEnv`).

    <Warning>
    Les clés définies uniquement dans votre shell interactif ne sont pas visibles pour les processus de la Gateway gérés par un démon. Utilisez la config `~/.openclaw/.env` ou `env.shellEnv` pour une
    disponibilité persistante.
    </Warning>

  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choisir les providers, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet incluant les paramètres du provider et de l'audio.
  </Card>
  <Card title="Console Groq" href="https://console.groq.com" icon="arrow-up-right-from-square">
    Tableau de bord Groq, documentation API et tarifs.
  </Card>
  <Card title="Liste des modèles Groq" href="https://console.groq.com/docs/models" icon="list">
    Catalogue officiel des modèles Groq.
  </Card>
</CardGroup>
