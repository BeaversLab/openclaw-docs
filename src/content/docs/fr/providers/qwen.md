---
summary: "Utiliser le cloud Qwen via le fournisseur qwen intégré de OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

<Warning>

**Qwen OAuth a été supprimé.** L'intégration OAuth de niveau gratuit
(QwenOAuthOAuth`qwen-portal`) qui utilisait les points de terminaison `portal.qwen.ai` n'est plus disponible.
Voir [Issue #49557](https://github.com/openclaw/openclaw/issues/49557) pour
plus de contexte.

</Warning>

OpenClaw considère désormais Qwen comme un fournisseur intégré de premier plan avec l'ID canonique
`qwen`. Le fournisseur intégré cible les points de terminaison Qwen Cloud / Alibaba DashScope et
Coding Plan et maintient les anciens ID `modelstudio` fonctionnels comme un
alias de compatibilité.

- Fournisseur : `qwen`
- Variable d'environnement préférée : `QWEN_API_KEY`
- Également accepté pour la compatibilité : `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- Style d'API : compatible OpenAI

<Tip>Si vous voulez `qwen3.6-plus`, préférez le point de terminaison **Standard (paiement à l'usage)**. La prise en charge de Coding Plan peut prendre du retard par rapport au catalogue public.</Tip>

## Getting started

Choisissez votre type de plan et suivez les étapes de configuration.

<Tabs>
  <Tab title="Coding Plan (subscription)"Qwen>
    **Idéal pour :** l'accès par abonnement via le Qwen Coding Plan.

    <Steps>
      <Step title="APIObtenez votre clé API"API>
        Créez ou copiez une clé API depuis [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Exécutez l'intégration">
        Pour le point de terminaison **Global** :

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        Pour le point de terminaison **China** :

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
        ```
      </Step>
      <Step title="Définir un model par défaut">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifiez que le model est disponible">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Les identifiants de choix d'authentification `modelstudio-*` hérités et les références de model `modelstudio/...` fonctionnent

toujours comme alias de compatibilité, mais les nouveaux flux de configuration devraient préférer les identifiants de choix d'authentification canoniques
`qwen-*` et les références de model `qwen/...`. Si vous définissez une entrée personnalisée exacte
`models.providers.modelstudio` avec une autre valeur `api`, ce
provider personnalisé possède les références `modelstudio/...`Qwen à la place de l'alias de compatibilité
Qwen.
</Note>

  </Tab>

  <Tab title="Standard (pay-as-you-go)">
    **Idéal pour :** un accès à la demande via le point de terminaison Standard Model Studio, incluant des modèles comme `qwen3.6-plus` qui peuvent ne pas être disponibles sur le Coding Plan.

    <Steps>
      <Step title="APIObtenir votre clé d'API"API>
        Créez ou copiez une clé d'API depuis [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Exécuter l'intégration (onboarding)">
        Pour le point de terminaison **Global** :

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        Pour le point de terminaison **China** :

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
        ```
      </Step>
      <Step title="Définir un modèle par défaut">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifier la disponibilité du modèle">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Les anciens identifiants de choix d'authentification `modelstudio-*` et les références de modèle `modelstudio/...` fonctionnent toujours
    comme alias de compatibilité, mais les nouveaux flux de configuration doivent privilégier les identifiants de choix d'authentification canoniques
    `qwen-*` et les références de modèle `qwen/...`. Si vous définissez une entrée personnalisée exacte
    `models.providers.modelstudio` avec une autre valeur `api`, ce
    fournisseur personnalisé possède les références `modelstudio/...` à la place de l'alias de compatibilité
    Qwen.
    </Note>

  </Tab>
</Tabs>

## Types de plans et points de terminaison

| Plan                     | Région | Choix d'authentification   | Point de terminaison                             |
| ------------------------ | ------ | -------------------------- | ------------------------------------------------ |
| Standard (pay-as-you-go) | Chine  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (pay-as-you-go) | Monde  | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (abonnement) | Chine  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (abonnement) | Monde  | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

Le fournisseur sélectionne automatiquement le point de terminaison en fonction de votre choix d'authentification. Les choix canoniques utilisent la famille `qwen-*` ; `modelstudio-*` reste uniquement pour la compatibilité.
Vous pouvez remplacer cela par un `baseUrl` personnalisé dans la configuration.

<Tip>**Gérer les clés :** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **Documentation :** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## Catalogue intégré

OpenClaw inclut actuellement ce catalogue Qwen intégré. Le catalogue configuré est conscient du point de terminaison (endpoint-aware) : les configurations du Coding Plan omettent les modèles qui sont connus pour ne fonctionner que sur le point de terminaison Standard.

| Réf modèle                  | Entrée       | Contexte  | Notes                                                                             |
| --------------------------- | ------------ | --------- | --------------------------------------------------------------------------------- |
| `qwen/qwen3.5-plus`         | texte, image | 1 000 000 | Modèle par défaut                                                                 |
| `qwen/qwen3.6-plus`         | texte, image | 1 000 000 | Préférez les points de terminaison Standard lorsque vous avez besoin de ce modèle |
| `qwen/qwen3-max-2026-01-23` | texte        | 262 144   | Gamme Qwen Max                                                                    |
| `qwen/qwen3-coder-next`     | texte        | 262 144   | Codage                                                                            |
| `qwen/qwen3-coder-plus`     | texte        | 1 000 000 | Codage                                                                            |
| `qwen/MiniMax-M2.5`         | texte        | 1 000 000 | Raisonnement activé                                                               |
| `qwen/glm-5`                | texte        | 202 752   | GLM                                                                               |
| `qwen/glm-4.7`              | texte        | 202 752   | GLM                                                                               |
| `qwen/kimi-k2.5`            | texte, image | 262 144   | Moonshot AI via Alibaba                                                           |

<Note>La disponibilité peut toujours varier en fonction du point de terminaison et du plan de facturation, même lorsqu'un modèle est présent dans le catalogue intégré.</Note>

## Contrôles de réflexion

Pour les modèles Cloud Qwen avec raisonnement activé, le fournisseur intégré mappe les niveaux de réflexion de OpenClaw sur l'indicateur de requête de niveau supérieur `enable_thinking` de DashScope. La réflexion désactivée envoie `enable_thinking: false` ; les autres niveaux de réflexion envoient `enable_thinking: true`.

## Extensions multimodales

Le plugin `qwen` expose également les capacités multimodales sur les points de terminaison DashScope **Standard** (pas sur les points de terminaison du Coding Plan) :

- **Compréhension vidéo** via `qwen-vl-max-latest`
- **Génération vidéo Wan** via `wan2.6-t2v` (par défaut), `wan2.6-i2v`, `wan2.6-r2v`, `wan2.6-r2v-flash`, `wan2.7-r2v`

Pour utiliser Qwen comme fournisseur vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

<Note>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du fournisseur et le comportement de basculement.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Compréhension d'images et de vidéos">
    Le plugin Qwen intégré enregistre la compréhension de média pour les images et les vidéos
    sur les points de terminaison DashScope **Standard** (pas les points de terminaison du Coding Plan).

    | Propriété      | Valeur                 |
    | ------------- | --------------------- |
    | Modèle         | `qwen-vl-max-latest`  |
    | Entrée prise en charge | Images, vidéo       |

    La compréhension de média est résolue automatiquement à partir de l'authentification Qwen configurée — aucune
    configuration supplémentaire n'est nécessaire. Assurez-vous d'utiliser un point de terminaison Standard (pay-as-you-go)
    pour bénéficier de la prise en charge de la compréhension de média.

  </Accordion>

  <Accordion title="Disponibilité de Qwen 3.6 Plus">
    `qwen3.6-plus` est disponible sur les points de terminaison Standard (pay-as-you-go) du Model Studio :

    - Chine : `dashscope.aliyuncs.com/compatible-mode/v1`
    - Global : `dashscope-intl.aliyuncs.com/compatible-mode/v1`

    Si les points de terminaison du Coding Plan renvoient une erreur « model non pris en charge » pour `qwen3.6-plus`, passez à Standard (pay-as-you-go) au lieu de la paire point de terminaison/clé du Coding Plan.

    Le catalogue intégré OpenClaw de Qwen n'annonce pas `qwen3.6-plus` sur les points de terminaison du Coding Plan, mais les entrées `qwen/qwen3.6-plus` explicitement configurées sous `models.providers.qwen.models` sont honorées sur les baseUrl du Coding Plan, vous pouvez donc activer ce model si Aliyun l'active pour votre abonnement. L'API en amont décide toujours si l'appel aboutit.

  </Accordion>

  <Accordion title="Plan de fonctionnalités">
    Le plugin `qwen` est positionné comme la base du fournisseur pour l'ensemble de la surface Qwen Cloud, et pas seulement pour les modèles de codage/texte.

    - **Modèles de texte/discussion :** intégrés maintenant
    - **Appel d'outils, sortie structurée, réflexion :** hérités du transport compatible OpenAI
    - **Génération d'images :** prévu au niveau du plugin de fournisseur
    - **Compréhension d'images/vidéos :** intégré maintenant sur le point de terminaison Standard
    - **Synthèse vocale/audio :** prévu au niveau du plugin de fournisseur
    - **Embeddings de mémoire/reranking :** prévus via la surface de l'adaptateur d'embeddings
    - **Génération de vidéos :** intégrée maintenant via la capacité de génération de vidéos partagée

  </Accordion>

  <Accordion title="Détails de la génération vidéo">
    Pour la génération vidéo, OpenClaw mappe la région Qwen configurée sur l'hôte AIGC DashScope correspondant avant de soumettre la tâche :

    - Global/Intl : `https://dashscope-intl.aliyuncs.com`
    - Chine : `https://dashscope.aliyuncs.com`

    Cela signifie qu'un `models.providers.qwen.baseUrl` normal pointant vers les hôtes du Coding Plan ou les hôtes standards Qwen maintient toujours la génération vidéo sur le point de terminaison vidéo DashScope régional correct.

    Limites actuelles de la génération vidéo pour le Qwen intégré :

    - Jusqu'à **1** vidéo de sortie par requête
    - Jusqu'à **1** image d'entrée
    - Jusqu'à **4** vidéos d'entrée
    - Durée maximale de **10 secondes**
    - Prend en charge `size`, `aspectRatio`, `resolution`, `audio` et `watermark`
    - Le mode image/vidéo de référence nécessite actuellement des **URL http(s) distantes**. Les chemins de fichiers locaux sont rejetés immédiatement car le point de terminaison vidéo DashScope n'accepte pas les tampons locaux téléchargés pour ces références.

  </Accordion>

  <Accordion title="Compatibilité de l'utilisation en streaming">
    Les points de terminaison natifs de Model Studio annoncent une compatibilité de l'utilisation en streaming sur le transport partagé `openai-completions`. Les clés OpenClaw désactivent désormais les capacités du point de terminaison, donc les identifiants de fournisseur personnalisés compatibles DashScope ciblant les mêmes hôtes natifs héritent du même comportement d'utilisation en streaming au lieu d'exiger spécifiquement l'identifiant de fournisseur intégré `qwen`.

    La compatibilité de l'utilisation en streaming natif s'applique à la fois aux hôtes du Coding Plan et aux hôtes compatibles Standard DashScope :

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Régions de point de terminaison multimodales">
    Les surfaces multimodales (compréhension vidéo et génération vidéo Wan) utilisent les
    points de terminaison **Standard** DashScope, et non les points de terminaison Coding Plan :

    - URL de base Standard internationale : `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - URL de base Standard Chine : `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Configuration de l'environnement et du démon">
    Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `QWEN_API_KEY` est
    disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
    `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des providers, références de modèle et comportement de basculement.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagés et sélection du provider.
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/fr/providers/alibaba" icon="cloud">
    Provider ModelStudio hérité et notes de migration.
  </Card>
  <Card title="Dépannage" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
