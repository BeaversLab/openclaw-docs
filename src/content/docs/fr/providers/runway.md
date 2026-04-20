---
title: "Runway"
summary: "Configuration de la génération vidéo Runway dans OpenClaw"
read_when:
  - You want to use Runway video generation in OpenClaw
  - You need the Runway API key/env setup
  - You want to make Runway the default video provider
---

# Runway

OpenClaw est livré avec un provider `runway` intégré pour la génération de vidéos hébergée.

| Propriété      | Valeur                                                                            |
| -------------- | --------------------------------------------------------------------------------- |
| ID du provider | `runway`                                                                          |
| Auth           | `RUNWAYML_API_SECRET` (canonique) ou `RUNWAY_API_KEY`                             |
| API            | Génération vidéo basée sur des tâches Runway (interrogation `GET /v1/tasks/{id}`) |

## Getting started

<Steps>
  <Step title="Définir la clé API">```bash openclaw onboard --auth-choice runway-api-key ```</Step>
  <Step title="Définir Runway comme provider vidéo par défaut">```bash openclaw config set agents.defaults.videoGenerationModel.primary "runway/gen4.5" ```</Step>
  <Step title="Générer une vidéo">Demandez à l'agent de générer une vidéo. Runway sera utilisé automatiquement.</Step>
</Steps>

## Modes pris en charge

| Mode             | Modèle                | Référence d'entrée         |
| ---------------- | --------------------- | -------------------------- |
| Texte vers vidéo | `gen4.5` (par défaut) | Aucun                      |
| Image vers vidéo | `gen4.5`              | 1 image locale ou distante |
| Vidéo vers vidéo | `gen4_aleph`          | 1 vidéo locale ou distante |

<Note>Les références d'images et de vidéos locales sont prises en charge via des URI de données. Les exécutions en mode texte uniquement exposent actuellement les formats d'aspect `16:9` et `9:16`.</Note>

<Warning>Le mode Vidéo vers vidéo nécessite actuellement spécifiquement `runway/gen4_aleph`.</Warning>

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

## Notes avancées

<AccordionGroup>
  <Accordion title="Alias des variables d'environnement">
    OpenClaw reconnaît à la fois `RUNWAYML_API_SECRET` (canonique) et `RUNWAY_API_KEY`.
    L'une ou l'autre de ces variables authentifiera le provider Runway.
  </Accordion>

  <Accordion title="Sondage des tâches">
    Runway utilise une API basée sur les tâches. Après avoir soumis une demande de génération, OpenClaw
    interroge `GET /v1/tasks/{id}` jusqu'à ce que la vidéo soit prête. Aucune configuration
    supplémentaire n'est nécessaire pour le comportement de sondage.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres d'outil partagés, sélection du provider et comportement asynchrone.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference#agent-defaults" icon="gear">
    Paramètres par défaut de l'agent, y compris le modèle de génération vidéo.
  </Card>
</CardGroup>
