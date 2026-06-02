---
summary: "QwenOpenClawUtiliser Qwen Cloud via le provider qwen intégré d'OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "QwenQwen"
---

OpenClaw traite désormais Qwen comme un provider intégré de premier plan avec l'ID canonique
OpenClawQwen`qwen`Qwen. Le provider intégré cible les points de terminaison Qwen Cloud / Alibaba DashScope et
Coding Plan, maintient les IDs `modelstudio`Qwen hérités fonctionnant comme un alias de
compatibilité, et expose également le flux de jetons Qwen Portal en tant que provider `qwen-oauth`.

- Provider : `qwen`
- Provider Portal : [`qwen-oauth`](/fr/providers/qwen-oauth)
- Env var préférée : `QWEN_API_KEY`
- Également accepté pour la compatibilité : `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- Style d'API : compatible OpenAI

<Tip>Si vous voulez `qwen3.6-plus`, préférez le point de terminaison **Standard (pay-as-you-go)**. La prise en charge de Coding Plan peut prendre du retard par rapport au catalogue public.</Tip>

## Getting started

Choisissez votre type de plan et suivez les étapes de configuration.

<Tabs>
  <Tab title="Plan de codage (abonnement)"Qwen>
    **Idéal pour :** un accès par abonnement via le plan de codage Qwen.

    <Steps>
      <Step title="APIObtenez votre clé d'API"API>
        Créez ou copiez une clé d'API depuis [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Exécutez l'intégration">
        Pour le point de terminaison **Global** :

        ```bash
        openclaw onboard --auth-choice qwen-api-key
        ```

        Pour le point de terminaison **Chine** :

        ```bash
        openclaw onboard --auth-choice qwen-api-key-cn
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
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Les anciens IDs de choix d'authentification `modelstudio-*` et les références de modèle `modelstudio/...` fonctionnent
    toujours comme des alias de compatibilité, mais les nouveaux flux de configuration devraient préférer les IDs de choix d'authentification canoniques
    `qwen-*` et les références de modèle `qwen/...`. Si vous définissez une entrée personnalisée exacte
    `models.providers.modelstudio` avec une autre valeur `api`, ce
    provider personnalisé possède les références `modelstudio/...`Qwen au lieu de l'alias de compatibilité Qwen.
    </Note>

  </Tab>

  <Tab title="Standard (pay-as-you-go)">
    **Idéal pour :** un accès au paiement à l'utilisation via le point de terminaison Standard Model Studio, incluant des modèles comme `qwen3.6-plus` qui pourraient ne pas être disponibles sur le Coding Plan.

    <Steps>
      <Step title="Obtenir votre clé API">
        Créez ou copiez une clé API depuis [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys).
      </Step>
      <Step title="Exécuter l'onboarding">
        Pour le point de terminaison **Global** :

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key
        ```

        Pour le point de terminaison **China** :

        ```bash
        openclaw onboard --auth-choice qwen-standard-api-key-cn
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
      <Step title="Vérifier que le model est disponible">
        ```bash
        openclaw models list --provider qwen
        ```
      </Step>
    </Steps>

    <Note>
    Les identifiants de choix d'authentification `modelstudio-*` existants et les références de model `modelstudio/...` fonctionnent toujours
    comme alias de compatibilité, mais les nouveaux flux de configuration devraient préférer les identifiants de choix d'authentification canoniques
    `qwen-*` et les références de model `qwen/...`. Si vous définissez une entrée personnalisée exacte `models.providers.modelstudio` avec une autre valeur `api`, ce
    provider personnalisé possède les références `modelstudio/...` à la place de l'alias de compatibilité Qwen.
    </Note>

  </Tab>

  <Tab title="QwenOAuthQwen OAuth / Portal"Qwen>
    **Idéal pour :** un jeton de portail Qwen pour `https://portal.qwen.ai/v1`QwenOAuth.

    Consultez [Qwen OAuth / Portal](/fr/providers/qwen-oauth) pour la page dédiée au
    fournisseur et les notes de migration.

    <Steps>
      <Step title="Fournir votre jeton de portail">
        ```bash
        openclaw onboard --auth-choice qwen-oauth
        ```
      </Step>
      <Step title="Définir un modèle par défaut">
        ```json5
        {
          agents: {
            defaults: {
              model: { primary: "qwen-oauth/qwen3.5-plus" },
            },
          },
        }
        ```
      </Step>
      <Step title="Vérifier que le modèle est disponible">
        ```bash
        openclaw models list --provider qwen-oauth
        ```
      </Step>
    </Steps>

    <Note>
    `qwen-oauth` utilise le même nom de variable d'env `QWEN_API_KEY` que le fournisseur
    DashScope, mais stocke l'auth sous l'identifiant de fournisseur `qwen-oauth`OpenClaw lorsqu'il est configuré
    via l'intégration OpenClaw.
    </Note>

  </Tab>
</Tabs>

## Types de forfaits et points de terminaison

| Forfait                             | Région  | Choix d'auth               | Point de terminaison                             |
| ----------------------------------- | ------- | -------------------------- | ------------------------------------------------ |
| Standard (paiement à l'utilisation) | Chine   | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (paiement à l'utilisation) | Mondial | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Forfait Coding (abonnement)         | Chine   | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Forfait Coding (abonnement)         | Mondial | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |
| Portail Qwen                        | Mondial | `qwen-oauth`               | `portal.qwen.ai/v1`                              |

Le fournisseur sélectionne automatiquement le point de terminaison en fonction de votre choix d'auth. Les choix
canoniques utilisent la famille `qwen-*` ; `modelstudio-*` reste uniquement pour la compatibilité.
Vous pouvez remplacer avec un `baseUrl` personnalisé dans la configuration.

<Tip>**Gérer les clés :** [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys) | **Docs :** [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)</Tip>

## Catalogue intégré

OpenClaw fournit actuellement ce catalogue Qwen intégré. Le catalogue configuré est conscient du point de terminaison : les configurations de Coding Plan omettent les modèles connus pour fonctionner uniquement sur le point de terminaison Standard.

| Réf modèle                  | Entrée       | Contexte  | Remarques                                                                            |
| --------------------------- | ------------ | --------- | ------------------------------------------------------------------------------------ |
| `qwen/qwen3.5-plus`         | texte, image | 1 000 000 | Modèle par défaut                                                                    |
| `qwen/qwen3.6-plus`         | texte, image | 1 000 000 | Privilégiez les points de terminaison Standard lorsque vous avez besoin de ce modèle |
| `qwen/qwen3-max-2026-01-23` | texte        | 262 144   | Ligne Qwen Max                                                                       |
| `qwen/qwen3-coder-next`     | texte        | 262 144   | Codage                                                                               |
| `qwen/qwen3-coder-plus`     | texte        | 1 000 000 | Codage                                                                               |
| `qwen/MiniMax-M2.5`         | texte        | 1 000 000 | Raisonnement activé                                                                  |
| `qwen/glm-5`                | texte        | 202 752   | GLM                                                                                  |
| `qwen/glm-4.7`              | texte        | 202 752   | GLM                                                                                  |
| `qwen/kimi-k2.5`            | texte, image | 262 144   | Moonshot AI via Alibaba                                                              |
| `qwen-oauth/qwen3.5-plus`   | texte, image | 1 000 000 | Défaut Portail Qwen                                                                  |

<Note>La disponibilité peut encore varier en fonction du point de terminaison et du plan de facturation, même lorsqu'un modèle est présent dans le catalogue intégré.</Note>

## Contrôles de réflexion

Pour les modèles Qwen Cloud avec raisonnement activé, le fournisseur intégré mappe les niveaux de réflexion OpenClaw à l'indicateur de requête de niveau supérieur `enable_thinking` de DashScope. La réflexion désactivée envoie `enable_thinking: false` ; les autres niveaux de réflexion envoient `enable_thinking: true`.

## Modules multimodaux

Le plugin `qwen` expose également des capacités multimodales sur les points de terminaison DashScope **Standard** (pas sur les points de terminaison Coding Plan) :

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

<Note>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres d'outil partagés, la sélection du provider et le comportement de basculement.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Compréhension d'images et de vidéos"Qwen>
    Le plugin Qwen intégré enregistre la compréhension de média pour les images et les vidéos
    sur les points de terminaison DashScope **Standard** (et non sur les points de terminaison Coding Plan).

    | Propriété      | Valeur                 |
    | ------------- | --------------------- |
    | Modèle         | `qwen-vl-max-latest`Qwen  |
    | Entrée prise en charge | Images, vidéo       |

    La compréhension de média est résolue automatiquement à partir de l'authentification Qwen configurée — aucune
    configuration supplémentaire n'est nécessaire. Assurez-vous d'utiliser un point de terminaison Standard (pay-as-you-go)
    pour la prise en charge de la compréhension de média.

  </Accordion>

  <Accordion title="Disponibilité de Qwen 3.6 Plus">
    `qwen3.6-plus` est disponible sur les points de terminaison Model Studio Standard (pay-as-you-go)
    :

    - Chine : `dashscope.aliyuncs.com/compatible-mode/v1`
    - Global : `dashscope-intl.aliyuncs.com/compatible-mode/v1`

    Si les points de terminaison Coding Plan renvoient une erreur « modèle non pris en charge » pour
    `qwen3.6-plus`, passez à Standard (pay-as-you-go) au lieu du point de terminaison Coding Plan
    / paire de clés.

    Le catalogue OpenClaw intégré d'Qwen n'annonce pas `qwen3.6-plus` sur les points de terminaison
    Coding Plan, mais les entrées `qwen/qwen3.6-plus` explicitement configurées sous
    `models.providers.qwen.models` sont honorées sur les baseUrl Coding Plan afin que vous
    puissiez activer ce modèle si Aliyun l'active sur votre abonnement. L'API en amont
    décide toujours si l'appel aboutit.

  </Accordion>

  <Accordion title="Plan de capacité">
    Le plugin `qwen` est positionné comme la page d'accueil du fournisseur pour l'ensemble de la surface Qwen
    Cloud, et pas seulement pour les modèles de codage/texte.

    - **Modèles de texte/discussion :** regroupés maintenant
    - **Appel d'outils, sortie structurée, réflexion :** hérités du transport compatible OpenAI
    - **Génération d'images :** prévu au niveau de la couche du fournisseur-plugin
    - **Compréhension d'images/vidéos :** regroupé maintenant sur le point de terminaison Standard
    - **Discours/audio :** prévu au niveau de la couche du fournisseur-plugin
    - **Memory embeddings/reranking :** prévu via la surface de l'adaptateur d'embeddings
    - **Génération de vidéos :** regroupé maintenant via la capacité partagée de génération de vidéos

  </Accordion>

  <Accordion title="Détails de la génération vidéo">
    Pour la génération vidéo, OpenClaw mappe la région Qwen configurée sur l'hôte
    DashScope AIGC correspondant avant de soumettre la tâche :

    - Global/Intl : `https://dashscope-intl.aliyuncs.com`
    - Chine : `https://dashscope.aliyuncs.com`

    Cela signifie qu'un `models.providers.qwen.baseUrl` normal pointant vers les hôtes Qwen
    Coding Plan ou Standard maintient toujours la génération vidéo sur le bon
    point de terminaison vidéo DashScope régional.

    Limites actuelles de la génération vidéo Qwen regroupée :

    - Jusqu'à **1** vidéo de sortie par demande
    - Jusqu'à **1** image d'entrée
    - Jusqu'à **4** vidéos d'entrée
    - Jusqu'à **10 secondes** de durée
    - Prend en charge `size`, `aspectRatio`, `resolution`, `audio` et `watermark`
    - Le mode de référence image/vidéo nécessite actuellement des **URL http(s) distantes**. Les chemins de fichiers locaux sont rejetés dès le départ car le point de terminaison vidéo DashScope n'accepte pas les tampons locaux téléchargés pour ces références.

  </Accordion>

  <Accordion title="Compatibilité de l'utilisation en streaming">
    Les points de terminaison natifs de Model Studio annoncent la compatibilité de l'utilisation en streaming sur le
    transport partagé `openai-completions`OpenClaw. Les clés OpenClaw qui désactivent les capacités des
    points de terminaison maintenant, donc les ids de fournisseur personnalisés compatibles DashScope ciblant les
    mêmes hôtes natifs héritent du même comportement d'utilisation en streaming au lieu de
    nécessiter spécifiquement l'ID de fournisseur intégré `qwen`.

    La compatibilité de l'utilisation en streaming natif s'applique aux hôtes Coding Plan ainsi qu'aux
    hôtes Standard compatibles DashScope :

    - `https://coding.dashscope.aliyuncs.com/v1`
    - `https://coding-intl.dashscope.aliyuncs.com/v1`
    - `https://dashscope.aliyuncs.com/compatible-mode/v1`
    - `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Régions des points de terminaison multimodaux">
    Les surfaces multimodales (compréhension vidéo et génération vidéo Wan) utilisent les
    points de terminaison DashScope **Standard**, et non les points de terminaison Coding Plan :

    - URL de base Standard Global/Intl : `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
    - URL de base Standard Chine : `https://dashscope.aliyuncs.com/compatible-mode/v1`

  </Accordion>

  <Accordion title="Configuration de l'environnement et du démon"Gateway>
    Si la Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `QWEN_API_KEY` est
    disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
    `env.shellEnv`).
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection de modèle" href="/fr/concepts/model-providers" icon="layers">
    Choix des fournisseurs, des références de modèle et du comportement de basculement.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil vidéo partagé et sélection du fournisseur.
  </Card>
  <Card title="Alibaba (ModelStudio)" href="/fr/providers/alibaba" icon="cloud">
    Fournisseur ModelStudio hérité et notes de migration.
  </Card>
  <Card title="Troubleshooting" href="/fr/help/troubleshooting" icon="wrench">
    Dépannage général et FAQ.
  </Card>
</CardGroup>
