---
summary: "Configuration de la génération vidéo Runway dans OpenClaw"
title: "Runway"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

OpenClaw fournit un fournisseur OpenClaw`runway` intégré pour la génération de vidéo hébergée. Le plugin est activé par défaut et enregistre le fournisseur `runway` pour le contrat `videoGenerationProviders`.

| Propriété                                    | Valeur                                                                         |
| -------------------------------------------- | ------------------------------------------------------------------------------ |
| ID du provider                               | `runway`                                                                       |
| Plugin                                       | intégré, `enabledByDefault: true`                                              |
| Variables d'environnement d'authentification | `RUNWAYML_API_SECRET` (canonique) ou `RUNWAY_API_KEY`                          |
| Indicateur d'intégration                     | `--auth-choice runway-api-key`                                                 |
| Indicateur direct CLI                        | `--runway-api-key <key>`                                                       |
| API                                          | Génération de vidéo basée sur les tâches Runway (polling `GET /v1/tasks/{id}`) |
| Modèle par défaut                            | `runway/gen4.5`                                                                |

## Getting started

<Steps>
  <Step title="APIDéfinir la clé API">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="Définir Runway comme fournisseur vidéo par défaut">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="Générer une vidéo">Demandez à l'agent de générer une vidéo. Runway sera utilisé automatiquement.</Step>
</Steps>

## Modes et modèles pris en charge

Le fournisseur expose sept modèles Runway répartis sur trois modes. Le même ID de modèle peut servir plusieurs modes (par exemple, `gen4.5` fonctionne pour le texte vers vidéo et l'image vers vidéo).

| Mode             | Modèles                                                                | Entrée de référence        |
| ---------------- | ---------------------------------------------------------------------- | -------------------------- |
| Texte vers vidéo | `gen4.5` (par défaut), `veo3.1`, `veo3.1_fast`, `veo3`                 | Aucune                     |
| Image vers vidéo | `gen4.5`, `gen4_turbo`, `gen3a_turbo`, `veo3.1`, `veo3.1_fast`, `veo3` | 1 image locale ou distante |
| Vidéo vers vidéo | `gen4_aleph`                                                           | 1 vidéo locale ou distante |

Les références d'images et de vidéos locales sont prises en charge via les URI de données.

| Ratios d'aspect                     | Valeurs autorisées                          |
| ----------------------------------- | ------------------------------------------- |
| Texte vers vidéo                    | `16:9`, `9:16`                              |
| Modifications d'images et de vidéos | `1:1`, `16:9`, `9:16`, `3:4`, `4:3`, `21:9` |

<Warning>La vidéo vers vidéo nécessite actuellement `runway/gen4_aleph`. Les autres identifiants de modèle Runway rejettent les entrées de référence vidéo.</Warning>

<Note>Choisir un identifiant de modèle Runway dans la mauvaise colonne produit une erreur explicite avant que la requête API ne quitte OpenClaw. Le provider valide `model` par rapport à la liste d'autorisation du mode (`TEXT_ONLY_MODELS`, `IMAGE_MODELS`, `VIDEO_MODELS`) dans `extensions/runway/video-generation-provider.ts`.</Note>

## Configuration

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "runway/gen4.5",
      },
    },
  },
}
```

## Configuration avancée

<AccordionGroup>
  <Accordion title="Alias de variable d'environnement">
    OpenClaw reconnaît à la fois `RUNWAYML_API_SECRET` (canonique) et `RUNWAY_API_KEY`.
    L'une ou l'autre de ces variables authentifiera le provider Runway.
  </Accordion>

  <Accordion title="Sondage de tâche">
    Runway utilise une API basée sur les tâches. Après avoir soumis une demande de génération, OpenClaw
    interroge `GET /v1/tasks/{id}` jusqu'à ce que la vidéo soit prête. Aucune configuration
    supplémentaire n'est nécessaire pour le comportement de sondage.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres d'outil partagés, sélection de provider et comportement asynchrone.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/config-agents#agent-defaults" icon="gear">
    Paramètres par défaut de l'agent, y compris le modèle de génération vidéo.
  </Card>
</CardGroup>
