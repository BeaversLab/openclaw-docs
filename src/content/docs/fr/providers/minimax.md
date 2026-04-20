---
summary: "Utiliser les modèles MiniMax dans OpenClaw"
read_when:
  - You want MiniMax models in OpenClaw
  - You need MiniMax setup guidance
title: "MiniMax"
---

# MiniMax

Le fournisseur OpenClaw de MiniMax est réglé par défaut sur **MiniMax M2.7**.

MiniMax fournit également :

- Synthèse vocale intégrée via T2A v2
- Compréhension d'images intégrée via `MiniMax-VL-01`
- Génération de musique intégrée via `music-2.5+`
- `web_search` intégré via l'API de recherche MiniMax Coding Plan API

Répartition du provider :

| ID du fournisseur | Auth    | Capacités                                                                          |
| ----------------- | ------- | ---------------------------------------------------------------------------------- |
| `minimax`         | Clé API | Texte, génération d'images, compréhension d'images, synthèse vocale, recherche web |
| `minimax-portal`  | OAuth   | Texte, génération d'images, compréhension d'images                                 |

## Gamme de modèles

| Modèle                   | Type                  | Description                                              |
| ------------------------ | --------------------- | -------------------------------------------------------- |
| `MiniMax-M2.7`           | Chat (raisonnement)   | Modèle de raisnement hébergé par défaut                  |
| `MiniMax-M2.7-highspeed` | Chat (raisonnement)   | Niveau de raisnement M2.7 plus rapide                    |
| `MiniMax-VL-01`          | Vision                | Modèle de compréhension d'images                         |
| `image-01`               | Génération d'images   | Synthèse et édition texte vers image et image vers image |
| `music-2.5+`             | Génération de musique | Modèle de musique par défaut                             |
| `music-2.5`              | Génération de musique | Niveau de génération de musique précédent                |
| `music-2.0`              | Génération de musique | Niveau de génération de musique hérité                   |
| `MiniMax-Hailuo-2.3`     | Génération de vidéo   | Flux texte vers vidéo et référence d'image               |

## Getting started

Choisissez votre méthode d'authentification préférée et suivez les étapes de configuration.

<Tabs>
  <Tab title="OAuth (Coding Plan)">
    **Idéal pour :** configuration rapide avec le Coding Plan MiniMax via OAuth, aucune clé OAuth requise.

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Run onboarding">
            ```bash
            openclaw onboard --auth-choice minimax-global-oauth
            ```

            This authenticates against `api.minimax.io`.
          </Step>
          <Step title="Verify the model is available">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="China">
        <Steps>
          <Step title="Run onboarding">
            ```bash
            openclaw onboard --auth-choice minimax-cn-oauth
            ```

            This authenticates against `api.minimaxi.com`.
          </Step>
          <Step title="Verify the model is available">
            ```bash
            openclaw models list --provider minimax-portal
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    <Note>
    Les configurations MiniMax utilisent l'identifiant de fournisseur `minimax-portal`. Les références de modèle suivent le format `minimax-portal/MiniMax-M2.7`.
    </Note>

    <Tip>
    Lien de parrainage pour le Coding Plan OAuth (10 % de réduction) : [Coding Plan API](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)
    </Tip>

  </Tab>

  <Tab title="Clé API">
    **Idéal pour :** MiniMax hébergé avec l'API compatible Anthropic.

    <Tabs>
      <Tab title="International">
        <Steps>
          <Step title="Exécuter l'intégration">
            ```bash
            openclaw onboard --auth-choice minimax-global-api
            ```

            Cela configure `api.minimax.io` comme URL de base.
          </Step>
          <Step title="Vérifier que le modèle est disponible">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
      <Tab title="Chine">
        <Steps>
          <Step title="Exécuter l'intégration">
            ```bash
            openclaw onboard --auth-choice minimax-cn-api
            ```

            Cela configure `api.minimaxi.com` comme URL de base.
          </Step>
          <Step title="Vérifier que le modèle est disponible">
            ```bash
            openclaw models list --provider minimax
            ```
          </Step>
        </Steps>
      </Tab>
    </Tabs>

    ### Exemple de configuration

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: { defaults: { model: { primary: "minimax/MiniMax-M2.7" } } },
      models: {
        mode: "merge",
        providers: {
          minimax: {
            baseUrl: "https://api.minimax.io/anthropic",
            apiKey: "${MINIMAX_API_KEY}",
            api: "anthropic-messages",
            models: [
              {
                id: "MiniMax-M2.7",
                name: "MiniMax M2.7",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.3, output: 1.2, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
              {
                id: "MiniMax-M2.7-highspeed",
                name: "MiniMax M2.7 Highspeed",
                reasoning: true,
                input: ["text", "image"],
                cost: { input: 0.6, output: 2.4, cacheRead: 0.06, cacheWrite: 0.375 },
                contextWindow: 204800,
                maxTokens: 131072,
              },
            ],
          },
        },
      },
    }
    ```

    <Warning>
    Sur le chemin de streaming compatible Anthropic, OpenClaw désactive la réflexion (thinking) de MiniMax par défaut, sauf si vous définissez explicitement `thinking` vous-même. Le point de terminaison de streaming de MiniMax émet `reasoning_content` dans des blocs delta de style OpenAI au lieu des blocs de réflexion natifs d'Anthropic, ce qui peut faire fuiter le raisonnement interne dans la sortie visible s'il reste activé implicitement.
    </Warning>

    <Note>
    Les configurations par clé API utilisent l'id de fournisseur `minimax`. Les références de modèles suivent la forme `minimax/MiniMax-M2.7`.
    </Note>

  </Tab>
</Tabs>

## Configurer via `openclaw configure`

Utilisez l'assistant de configuration interactif pour définir MiniMax sans modifier le JSON :

<Steps>
  <Step title="Lancer l'assistant">
    ```bash
    openclaw configure
    ```
  </Step>
  <Step title="Sélectionner Modèle/auth">
    Choisissez **Modèle/auth** dans le menu.
  </Step>
  <Step title="Choisir une option d'auth MiniMax">
    Choisissez l'une des options MiniMax disponibles :

    | Choix d'authentification | Description |
    | --- | --- |
    | `minimax-global-oauth` | MiniMax international (Coding Plan) |
    | `minimax-cn-oauth` | OAuth Chine (Coding Plan) |
    | `minimax-global-api` | Clé OAuth internationale |
    | `minimax-cn-api` | Clé API Chine |

  </Step>
  <Step title="Choisir votre modèle par défaut">
    Sélectionnez votre modèle par défaut lorsque vous y êtes invité.
  </Step>
</Steps>

## Capacités

### Génération d'images

Le plugin MiniMax enregistre le modèle `image-01` pour l'outil `image_generate`. Il prend en charge :

- **Génération de texte vers image** avec contrôle des proportions
- **Modification d'image vers image** (référence de sujet) avec contrôle des proportions
- Jusqu'à **9 images de sortie** par requête
- Jusqu'à **1 image de référence** par requête de modification
- Proportions prises en charge : `1:1`, `16:9`, `4:3`, `3:2`, `2:3`, `3:4`, `9:16`, `21:9`

Pour utiliser MiniMax pour la génération d'images, définissez-le comme fournisseur de génération d'images :

```json5
{
  agents: {
    defaults: {
      imageGenerationModel: { primary: "minimax/image-01" },
    },
  },
}
```

Le plugin utilise la même authentification `MINIMAX_API_KEY` ou OAuth que les modèles de texte. Aucune configuration supplémentaire n'est nécessaire si MiniMax est déjà configuré.

Les `minimax` et les `minimax-portal` enregistrent tous deux `image_generate` avec le même
modèle `image-01`. Les configurations avec clé API utilisent `MINIMAX_API_KEY` ; les configurations OAuth peuvent utiliser
le chemin d'auth `minimax-portal` intégré à la place.

Lors de l'onboarding ou de la configuration de la clé API écrit des entrées `models.providers.minimax` explicites, OpenClaw matérialise `MiniMax-M2.7` et `MiniMax-M2.7-highspeed` avec `input: ["text", "image"]`.

Le catalogue de texte MiniMax intégré reste lui-même des métadonnées texte uniquement jusqu'à ce que cette configuration de fournisseur explicite existe. La compréhension d'images est exposée séparément via le fournisseur multimédia `MiniMax-VL-01` appartenant au plugin.

<Note>Voir [Génération d'images](/fr/tools/image-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

### Génération de musique

Le plugin `minimax` intégré enregistre également la génération de musique via l'outil `music_generate` partagé.

- Modèle de musique par défaut : `minimax/music-2.5+`
- Prend également en charge `minimax/music-2.5` et `minimax/music-2.0`
- Contrôles de prompt : `lyrics`, `instrumental`, `durationSeconds`
- Format de sortie : `mp3`
- Les exécutions sauvegardées par session se détachent via le flux de tâche/statut partagé, y compris `action: "status"`

Pour utiliser MiniMax comme fournisseur de musique par défaut :

```json5
{
  agents: {
    defaults: {
      musicGenerationModel: {
        primary: "minimax/music-2.5+",
      },
    },
  },
}
```

<Note>Voir [Génération de musique](/fr/tools/music-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

### Génération de vidéo

Le plugin `minimax` intégré enregistre également la génération de vidéo via l'outil `video_generate` partagé.

- Modèle vidéo par défaut : `minimax/MiniMax-Hailuo-2.3`
- Modes : flux texte-vers-vidéo et flux de référence à image unique
- Prend en charge `aspectRatio` et `resolution`

Pour utiliser MiniMax comme fournisseur vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "minimax/MiniMax-Hailuo-2.3",
      },
    },
  },
}
```

<Note>Voir [Génération de vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

### Compréhension d'images

Le plugin MiniMax enregistre la compréhension d'images séparément du catalogue de texte :

| ID du fournisseur | Modèle d'image par défaut |
| ----------------- | ------------------------- |
| `minimax`         | `MiniMax-VL-01`           |
| `minimax-portal`  | `MiniMax-VL-01`           |

C'est pourquoi le routage automatique des médias peut utiliser la compréhension d'images MiniMax même
lorsque le catalogue de fournisseur de texte groupé affiche encore des références de chat M2.7 en mode texte uniquement.

### Recherche Web

Le plugin MiniMax enregistre également `web_search` via l'API de recherche Coding Plan MiniMax.

- ID du fournisseur : `minimax`
- Résultats structurés : titres, URL, extraits, requêtes connexes
- Env var préférée : `MINIMAX_CODE_PLAN_KEY`
- Alias d'env accepté : `MINIMAX_CODING_API_KEY`
- Repli de compatibilité : `MINIMAX_API_KEY` lorsqu'il pointe déjà vers un jeton de plan de codage (coding-plan)
- Réutilisation de la région : `plugins.entries.minimax.config.webSearch.region`, puis `MINIMAX_API_HOST`, puis les URL de base du fournisseur MiniMax
- La recherche reste sur l'ID de fournisseur `minimax` ; la configuration OAuth CN/mondiale peut toujours orienter indirectement la région via `models.providers.minimax-portal.baseUrl`

La configuration se trouve sous `plugins.entries.minimax.config.webSearch.*`.

<Note>Voir [Recherche MiniMax](/fr/tools/minimax-search) pour la configuration et l'utilisation complètes de la recherche Web.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Options de configuration">
    | Option | Description |
    | --- | --- |
    | `models.providers.minimax.baseUrl` | Préférer `https://api.minimax.io/anthropic` (compatible Anthropic) ; `https://api.minimax.io/v1` est facultatif pour les charges utiles compatibles OpenAI |
    | `models.providers.minimax.api` | Préférer `anthropic-messages` ; `openai-completions` est facultatif pour les charges utiles compatibles OpenAI |
    | `models.providers.minimax.apiKey` | Clé d'MiniMax API (`MINIMAX_API_KEY`) |
    | `models.providers.minimax.models` | Définir `id`, `name`, `reasoning`, `contextWindow`, `maxTokens`, `cost` |
    | `agents.defaults.models` | Modèles alias que vous souhaitez dans la liste d'autorisation |
    | `models.mode` | Conserver `merge` si vous souhaitez ajouter MiniMax en plus des modèles intégrés |
  </Accordion>

  <Accordion title="Valeurs par défaut de la réflexion">
    Sur `api: "anthropic-messages"`, OpenClaw injecte `thinking: { type: "disabled" }` sauf si la réflexion est déjà explicitement définie dans les params/config.

    Cela empêche le point de terminaison de streaming de MiniMax d'émettre `reasoning_content` dans les chunks delta de style OpenAI, ce qui divulguerait le raisonnement interne dans la sortie visible.

  </Accordion>

<Accordion title="Mode rapide">`/fast on` ou `params.fastMode: true` réécrit `MiniMax-M2.7` en `MiniMax-M2.7-highspeed` sur le chemin de flux compatible avec Anthropic.</Accordion>

  <Accordion title="Exemple de basculement">
    **Idéal pour :** conserver votre modèle le plus puissant de dernière génération comme principal, basculer vers MiniMax M2.7 en cas de défaillance. L'exemple ci-dessous utilise Opus comme principal concret ; remplacez-le par votre modèle principal de dernière génération préféré.

    ```json5
    {
      env: { MINIMAX_API_KEY: "sk-..." },
      agents: {
        defaults: {
          models: {
            "anthropic/claude-opus-4-6": { alias: "primary" },
            "minimax/MiniMax-M2.7": { alias: "minimax" },
          },
          model: {
            primary: "anthropic/claude-opus-4-6",
            fallbacks: ["minimax/MiniMax-M2.7"],
          },
        },
      },
    }
    ```

  </Accordion>

  <Accordion title="Détails d'utilisation du Coding Plan">
    - API d'utilisation du Coding Plan : `https://api.minimaxi.com/v1/api/openplatform/coding_plan/remains` (nécessite une clé de coding plan).
    - API normalise l'utilisation du coding-plan de OpenClaw vers le même affichage `% left` que celui utilisé par d'autres fournisseurs. Les champs bruts `usage_percent` / `usagePercent` de MiniMax correspondent au quota restant, non au quota consommé, donc MiniMax les inverse. Les champs basés sur le nombre prévalent lorsqu'ils sont présents.
    - Lorsque OpenClaw renvoie `model_remains`, API privilégie l'entrée du modèle de chat, dérive l'étiquette de la fenêtre à partir de `start_time` / `end_time` si nécessaire, et inclut le nom du modèle sélectionné dans l'étiquette du plan afin que les fenêtres de coding-plan soient plus faciles à distinguer.
    - Les instantanés d'utilisation traitent `minimax`, `minimax-cn` et `minimax-portal` comme la même surface de quota OpenClaw, et privilégient MiniMax MiniMax stocké avant de revenir aux env vars de clé de Coding Plan.
  </Accordion>
</AccordionGroup>

## Notes

- Les références de modèle suivent le chemin d'authentification :
  - Configuration de la clé API : `minimax/<model>`
  - Configuration OAuth : `minimax-portal/<model>`
- Modèle de chat par défaut : `MiniMax-M2.7`
- Modèle de chat alternatif : `MiniMax-M2.7-highspeed`
- L'intégration et la configuration directe avec clé API écrivent des définitions de modèle explicites avec `input: ["text", "image"]` pour les deux variantes M2.7
- Le catalogue de fournisseurs groupé expose actuellement les références de chat en tant que métadonnées textuelles jusqu'à ce qu'une configuration explicite du fournisseur MiniMax existe
- Mettez à jour les valeurs de tarification dans `models.json` si vous avez besoin d'un suivi précis des coûts
- Utilisez `openclaw models list` pour confirmer l'identifiant du fournisseur actuel, puis basculez avec `openclaw models set minimax/MiniMax-M2.7` ou `openclaw models set minimax-portal/MiniMax-M2.7`

<Tip>Lien de parrainage pour le plan de codage MiniMax (10 % de réduction) : [Plan de codage MiniMax](https://platform.minimax.io/subscribe/coding-plan?code=DbXJTRClnb&source=link)</Tip>

<Note>Voir [Fournisseurs de modèles](/fr/concepts/model-providers) pour les règles des fournisseurs.</Note>

## Dépannage

<AccordionGroup>
  <Accordion title='"Modèle inconnu : minimax/MiniMax-M2.7"'>
    Cela signifie généralement que **le fournisseur MiniMax n'est pas configuré** (aucune entrée de fournisseur correspondante et aucun profil/clé d'environnement d'authentification MiniMax trouvé). Une correction pour cette détection est prévue pour **2026.1.12**. Correction par :

    - Mise à niveau vers **2026.1.12** (ou exécution depuis la source `main`), puis redémarrage de la passerelle.
    - Exécution de `openclaw configure` et sélection d'une option d'authentification **MiniMax**, ou
    - Ajout manuel du bloc `models.providers.minimax` ou `models.providers.minimax-portal` correspondant, ou
    - Configuration de `MINIMAX_API_KEY`, `MINIMAX_OAUTH_TOKEN`, ou d'un profil d'authentification MiniMax pour que le fournisseur correspondant puisse être injecté.

    Assurez-vous que l'identifiant du modèle est **sensible à la casse** :

    - Chemin de clé API : `minimax/MiniMax-M2.7` ou `minimax/MiniMax-M2.7-highspeed`
    - Chemin OAuth : `minimax-portal/MiniMax-M2.7` ou `minimax-portal/MiniMax-M2.7-highspeed`

    Vérifiez ensuite avec :

    ```bash
    openclaw models list
    ```

  </Accordion>
</AccordionGroup>

<Note>Plus d'aide : [Dépannage](/fr/help/troubleshooting) et [FAQ](/fr/help/faq).</Note>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, références de modèles et comportement de basculement.
  </Card>
  <Card title="Génération d'images" href="/fr/tools/image-generation" icon="image">
    Paramètres partagés de l'outil image et sélection du provider.
  </Card>
  <Card title="Génération de musique" href="/fr/tools/music-generation" icon="music">
    Paramètres partagés de l'outil musique et sélection du provider.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres partagés de l'outil vidéo et sélection du provider.
  </Card>
  <Card title="Recherche MiniMax" href="/fr/tools/minimax-search" icon="magnifying-glass">
    Configuration de la recherche web via MiniMax Coding Plan.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
