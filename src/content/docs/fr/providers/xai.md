---
summary: "Utiliser les modèles Grok xAI dans OpenClaw"
read_when:
  - You want to use Grok models in OpenClaw
  - You are configuring xAI auth or model ids
title: "xAI"
---

# xAI

OpenClaw est fourni avec un plugin de fournisseur `xai` groupé pour les modèles Grok.

## Getting started

<Steps>
  <Step title="Créer une clé API">
    Créez une clé API dans la [console xAI](https://console.x.ai/).
  </Step>
  <Step title="Définir votre clé API">
    Définissez `XAI_API_KEY`, ou exécutez :

    ```bash
    openclaw onboard --auth-choice xai-api-key
    ```

  </Step>
  <Step title="Choisir un modèle">
    ```json5
    {
      agents: { defaults: { model: { primary: "xai/grok-4" } } },
    }
    ```
  </Step>
</Steps>

<Note>
  OpenClaw utilise l'API Responses xAI comme transport xAI groupé. La même `XAI_API_KEY` peut également alimenter des `web_search` soutenues par Grok, des `x_search` de première classe, et des `code_execution` distantes. Si vous stockez une clé xAI sous `plugins.entries.xai.config.webSearch.apiKey`, le fournisseur de modèle xAI groupé réutilise également cette clé en guise de solution de secours.
  Le réglage des `code_execution` se trouve sous `plugins.entries.xai.config.codeExecution`.
</Note>

## Catalogue de modèles groupés

OpenClaw inclut ces familles de modèles xAI prêtes à l'emploi :

| Famille        | ID de modèle                                                             |
| -------------- | ------------------------------------------------------------------------ |
| Grok 3         | `grok-3`, `grok-3-fast`, `grok-3-mini`, `grok-3-mini-fast`               |
| Grok 4         | `grok-4`, `grok-4-0709`                                                  |
| Grok 4 Fast    | `grok-4-fast`, `grok-4-fast-non-reasoning`                               |
| Grok 4.1 Fast  | `grok-4-1-fast`, `grok-4-1-fast-non-reasoning`                           |
| Grok 4.20 Beta | `grok-4.20-beta-latest-reasoning`, `grok-4.20-beta-latest-non-reasoning` |
| Grok Code      | `grok-code-fast-1`                                                       |

Le plugin résout également par anticipation les ID de `grok-4*` et de `grok-code-fast*` plus récents lorsqu'ils
suivent la même forme d'API.

<Tip>`grok-4-fast`, `grok-4-1-fast`, et les variantes `grok-4.20-beta-*` sont les références Grok actuelles compatibles avec les images dans le catalogue groupé.</Tip>

### Mappings en mode rapide

`/fast on` ou `agents.defaults.models["xai/<model>"].params.fastMode: true`
réécrit les requêtes xAI natives comme suit :

| Modèle source | Cible en mode rapide |
| ------------- | -------------------- |
| `grok-3`      | `grok-3-fast`        |
| `grok-3-mini` | `grok-3-mini-fast`   |
| `grok-4`      | `grok-4-fast`        |
| `grok-4-0709` | `grok-4-fast`        |

### Alias de compatibilité hérités

Les alias hérités sont toujours normalisés vers les ids groupés canoniques :

| Alias hérité              | Id canonique                          |
| ------------------------- | ------------------------------------- |
| `grok-4-fast-reasoning`   | `grok-4-fast`                         |
| `grok-4-1-fast-reasoning` | `grok-4-1-fast`                       |
| `grok-4.20-reasoning`     | `grok-4.20-beta-latest-reasoning`     |
| `grok-4.20-non-reasoning` | `grok-4.20-beta-latest-non-reasoning` |

## Fonctionnalités

<AccordionGroup>
  <Accordion title="Recherche Web">
    Le provider de recherche Web `grok` groupé utilise également `XAI_API_KEY` :

    ```bash
    openclaw config set tools.web.search.provider grok
    ```

  </Accordion>

  <Accordion title="Génération vidéo">
    Le plugin `xai` groupé enregistre la génération vidéo via l'outil partagé
    `video_generate`.

    - Modèle vidéo par défaut : `xai/grok-imagine-video`
    - Modes : texte-vers-vidéo, image-vers-vidéo, et flux d'édition/extention vidéo à distance
    - Prend en charge `aspectRatio` et `resolution`

    <Warning>
    Les tampons vidéo locaux ne sont pas acceptés. Utilisez des URLs `http(s)` distantes pour
    les entrées de référence vidéo et d'édition.
    </Warning>

    Pour utiliser xAI comme provider vidéo par défaut :

    ```json5
    {
      agents: {
        defaults: {
          videoGenerationModel: {
            primary: "xai/grok-imagine-video",
          },
        },
      },
    }
    ```

    <Note>
    Voir [Video Generation](/en/tools/video-generation) pour les paramètres d'outil partagés,
    la sélection de provider, et le comportement de basculement.
    </Note>

  </Accordion>

  <Accordion title="x_search configuration">
    Le plugin xAI intégré expose `x_search` en tant qu'outil OpenClaw pour rechercher
    du contenu X (anciennement Twitter) via Grok.

    Chemin de configuration : `plugins.entries.xai.config.xSearch`

    | Clé                | Type    | Par défaut            | Description                          |
    | ------------------ | ------- | ------------------ | ------------------------------------ |
    | `enabled`          | boolean | —                  | Activer ou désactiver x_search           |
    | `model`            | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes x_search     |
    | `inlineCitations`  | boolean | —                  | Inclure des citations en ligne dans les résultats  |
    | `maxTurns`         | number  | —                  | Tours de conversation maximum           |
    | `timeoutSeconds`   | number  | —                  | Délai d'expiration de la requête en secondes           |
    | `cacheTtlMinutes`  | number  | —                  | Durée de vie du cache en minutes        |

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              xSearch: {
                enabled: true,
                model: "grok-4-1-fast",
                inlineCitations: true,
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Code execution configuration">
    Le plugin xAI intégré expose `code_execution` en tant qu'outil OpenClaw pour
    l'exécution de code à distance dans l'environnement de bac à sable (sandbox) xAI.

    Chemin de configuration : `plugins.entries.xai.config.codeExecution`

    | Clé               | Type    | Par défaut            | Description                              |
    | ----------------- | ------- | ------------------ | ---------------------------------------- |
    | `enabled`         | boolean | `true` (si clé disponible) | Activer ou désactiver l'exécution de code  |
    | `model`           | string  | `grok-4-1-fast`    | Modèle utilisé pour les requêtes d'exécution de code   |
    | `maxTurns`        | number  | —                  | Tours de conversation maximum               |
    | `timeoutSeconds`  | number  | —                  | Délai d'expiration de la requête en secondes               |

    <Note>
    Il s'agit d'une exécution à distance dans le bac à sable xAI, et non d'une exécution locale [`exec`](/en/tools/exec).
    </Note>

    ```json5
    {
      plugins: {
        entries: {
          xai: {
            config: {
              codeExecution: {
                enabled: true,
                model: "grok-4-1-fast",
              },
            },
          },
        },
      },
    }
    ```

  </Accordion>

<Accordion title="Limites connues">- L'authentification se fait uniquement par clé d'API aujourd'hui. Il n'y a pas encore de flux xAI OAuth ou de code d'appareil dans OpenClaw. - `grok-4.20-multi-agent-experimental-beta-0304` n'est pas pris en charge sur le chemin normal du fournisseur xAI car il nécessite une surface API en amont différente du transport xAI standard de OpenClaw.</Accordion>

  <Accordion title="Notes avancées">
    - OpenClaw applique automatiquement les correctifs de compatibilité tool-schema et tool-call spécifiques à xAI
      sur le chemin d'exécution partagé.
    - Les requêtes xAI natives définissent `tool_stream: true` par défaut. Définissez
      `agents.defaults.models["xai/<model>"].params.tool_stream` sur `false` pour
      le désactiver.
    - Le wrapper xAI intégré supprime les indicateurs tool-schema stricts non pris en charge et
      les clés de payload de raisonnement avant d'envoyer des requêtes xAI natives.
    - `web_search`, `x_search` et `code_execution` sont exposés en tant qu'outils OpenClaw.
      OpenClaw active l'intégré xAI spécifique dont il a besoin à l'intérieur de chaque requête d'outil
      au lieu d'attacher tous les outils natifs à chaque tour de discussion.
    - `x_search` et `code_execution` sont détenus par le plugin xAI intégré plutôt
      que codés en dur dans le moteur d'exécution du modèle central.
    - `code_execution` est une exécution de bac à sable xAI distante, et non locale
      [`exec`](/en/tools/exec).
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/en/concepts/model-providers" icon="layers">
    Choisir les fournisseurs, les références de modèle et le comportement de basculement.
  </Card>
  <Card title="Génération vidéo" href="/en/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du fournisseur.
  </Card>
  <Card title="Tous les fournisseurs" href="/en/providers/index" icon="grid-2">
    La vue d'ensemble des fournisseurs plus large.
  </Card>
  <Card title="Dépannage" href="/en/help/troubleshooting" icon="wrench">
    Problèmes courants et solutions.
  </Card>
</CardGroup>
