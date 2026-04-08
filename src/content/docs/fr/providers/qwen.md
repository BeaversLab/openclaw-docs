---
summary: "Utilisez le cloud Qwen via le fournisseur qwen intégré de OpenClaw"
read_when:
  - You want to use Qwen with OpenClaw
  - You previously used Qwen OAuth
title: "Qwen"
---

# Qwen

<Warning>

**Le Qwen OAuth a été supprimé.** L'intégration OAuth du niveau gratuit
(`qwen-portal`) qui utilisait des points de terminaison `portal.qwen.ai` n'est plus disponible.
Consultez l'[Issue #49557](https://github.com/openclaw/openclaw/issues/49557) pour
plus d'informations.

</Warning>

## Recommandé : Cloud Qwen

OpenClaw traite désormais Qwen comme un fournisseur intégré de premier plan avec l'ID canonique
`qwen`. Le fournisseur intégré cible les points de terminaison du Cloud Qwen / Alibaba DashScope et
du Coding Plan, et conserve les IDs `modelstudio` existants en tant qu'alias de compatibilité.

- Fournisseur : `qwen`
- Variable d'environnement préférée : `QWEN_API_KEY`
- Également acceptés pour compatibilité : `MODELSTUDIO_API_KEY`, `DASHSCOPE_API_KEY`
- Style d'API : compatible OpenAI

Si vous voulez `qwen3.6-plus`, préférez le point de terminaison **Standard (pay-as-you-go)**.
La prise en charge du Coding Plan peut prendre du retard par rapport au catalogue public.

```bash
# Global Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key

# China Coding Plan endpoint
openclaw onboard --auth-choice qwen-api-key-cn

# Global Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key

# China Standard (pay-as-you-go) endpoint
openclaw onboard --auth-choice qwen-standard-api-key-cn
```

Les anciens IDs de choix d'authentification `modelstudio-*` et les références de modèle `modelstudio/...` fonctionnent toujours
en tant qu'alias de compatibilité, mais les nouveaux flux de configuration devraient préférer les IDs de choix
d'authentification canoniques `qwen-*` et les références de modèle `qwen/...`.

Après l'intégration, définissez un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "qwen/qwen3.5-plus" },
    },
  },
}
```

## Types de plans et points de terminaison

| Plan                     | Région | Choix d'authentification   | Point de terminaison                             |
| ------------------------ | ------ | -------------------------- | ------------------------------------------------ |
| Standard (pay-as-you-go) | Chine  | `qwen-standard-api-key-cn` | `dashscope.aliyuncs.com/compatible-mode/v1`      |
| Standard (pay-as-you-go) | Monde  | `qwen-standard-api-key`    | `dashscope-intl.aliyuncs.com/compatible-mode/v1` |
| Coding Plan (abonnement) | Chine  | `qwen-api-key-cn`          | `coding.dashscope.aliyuncs.com/v1`               |
| Coding Plan (abonnement) | Monde  | `qwen-api-key`             | `coding-intl.dashscope.aliyuncs.com/v1`          |

Le fournisseur sélectionne automatiquement le point de terminaison en fonction de votre choix d'authentification. Les choix
canoniques utilisent la famille `qwen-*` ; `modelstudio-*` reste uniquement pour la compatibilité.
Vous pouvez le remplacer par un `baseUrl` personnalisé dans la configuration.

Les points de terminaison natifs de Model Studio annoncent une compatibilité d'utilisation en streaming sur le transport partagé `openai-completions`. Les clés OpenClaw désactivent désormais les capacités des points de terminaison, donc les IDs de fournisseur personnalisés compatibles DashScope ciblant les mêmes hôtes natifs héritent du même comportement d'utilisation en streaming au lieu d'exiger spécifiquement l'ID de fournisseur intégré `qwen`.

## Obtenez votre clé API

- **Gérer les clés** : [home.qwencloud.com/api-keys](https://home.qwencloud.com/api-keys)
- **Docs** : [docs.qwencloud.com](https://docs.qwencloud.com/developer-guides/getting-started/introduction)

## Catalogue intégré

OpenClaw fournit actuellement ce catalogue Qwen groupé :

| Réf modèle                  | Entrée       | Contexte  | Notes                                                                                |
| --------------------------- | ------------ | --------- | ------------------------------------------------------------------------------------ |
| `qwen/qwen3.5-plus`         | texte, image | 1 000 000 | Modèle par défaut                                                                    |
| `qwen/qwen3.6-plus`         | texte, image | 1 000 000 | Privilégiez les points de terminaison Standard lorsque vous avez besoin de ce modèle |
| `qwen/qwen3-max-2026-01-23` | texte        | 262 144   | Ligne Qwen Max                                                                       |
| `qwen/qwen3-coder-next`     | texte        | 262 144   | Codage                                                                               |
| `qwen/qwen3-coder-plus`     | texte        | 1 000 000 | Codage                                                                               |
| `qwen/MiniMax-M2.5`         | texte        | 1 000 000 | Raisonnement activé                                                                  |
| `qwen/glm-5`                | texte        | 202 752   | GLM                                                                                  |
| `qwen/glm-4.7`              | texte        | 202 752   | GLM                                                                                  |
| `qwen/kimi-k2.5`            | texte, image | 262 144   | Moonshot IA via Alibaba                                                              |

La disponibilité peut toujours varier en fonction du point de terminaison et du plan de facturation, même lorsqu'un modèle est présent dans le catalogue groupé.

La compatibilité de l'utilisation en natif en streaming s'applique à la fois aux hôtes du Plan de Codage et aux hôtes Standard compatibles DashScope :

- `https://coding.dashscope.aliyuncs.com/v1`
- `https://coding-intl.dashscope.aliyuncs.com/v1`
- `https://dashscope.aliyuncs.com/compatible-mode/v1`
- `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`

## Disponibilité de Qwen 3.6 Plus

`qwen3.6-plus` est disponible sur les points de terminaison Standard (paiement à l'utilisation) de Model Studio :

- Chine : `dashscope.aliyuncs.com/compatible-mode/v1`
- Global : `dashscope-intl.aliyuncs.com/compatible-mode/v1`

Si les points de terminaison du Plan de Codage renvoient une erreur « modèle non pris en charge » pour `qwen3.6-plus`, passez à Standard (paiement à l'utilisation) au lieu de la paire point de terminaison/clé du Plan de Codage.

## Plan de capacités

L'extension `qwen` est positionnée comme le fournisseur principal pour l'ensemble de la surface Qwen Cloud, et pas seulement pour les modèles de codage/texte.

- Modèles de texte/chat : désormais regroupés
- Appel d'outil, sortie structurée, réflexion : hérités du transport compatible OpenAI
- Génération d'images : prévu au niveau du plug-in de fournisseur
- Compréhension d'image/vidéo : désormais regroupée sur le point de terminaison Standard
- Synthèse vocale/audio : prévu au niveau du plug-in de fournisseur
- Intégrations de mémoire/reranking : prévus via la surface de l'adaptateur d'intégration
- Génération de vidéo : désormais regroupée via la capacité partagée de génération de vidéo

## Modules complémentaires multimodaux

L'extension `qwen` expose désormais également :

- Compréhension vidéo via `qwen-vl-max-latest`
- Génération de vidéo Wan via :
  - `wan2.6-t2v` (par défaut)
  - `wan2.6-i2v`
  - `wan2.6-r2v`
  - `wan2.6-r2v-flash`
  - `wan2.7-r2v`

Ces surfaces multimodales utilisent les points de terminaison DashScope **Standard**, et non les
points de terminaison du plan de codage.

- URL de base Standard Mondiale/Internationale : `https://dashscope-intl.aliyuncs.com/compatible-mode/v1`
- URL de base Standard Chine : `https://dashscope.aliyuncs.com/compatible-mode/v1`

Pour la génération de vidéo, OpenClaw mappe la région Qwen configurée sur l'hôte AIGC
DashScope correspondant avant de soumettre la tâche :

- Mondiale/Internationale : `https://dashscope-intl.aliyuncs.com`
- Chine : `https://dashscope.aliyuncs.com`

Cela signifie qu'un `models.providers.qwen.baseUrl` normal pointant vers l'un ou l'autre des
hôtes Qwen (plan de codage ou Standard) maintient toujours la génération de vidéo sur le bon
point de terminaison vidéo DashScope régional.

Pour la génération de vidéo, définissez explicitement un modèle par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: { primary: "qwen/wan2.6-t2v" },
    },
  },
}
```

Limites actuelles de génération de vidéo Qwen regroupées :

- Jusqu'à **1** vidéo de sortie par demande
- Jusqu'à **1** image d'entrée
- Jusqu'à **4** vidéos d'entrée
- Durée allant jusqu'à **10 secondes**
- Prend en charge `size`, `aspectRatio`, `resolution`, `audio` et `watermark`
- Le mode image/vidéo de référence nécessite actuellement des **URL http(s) distantes**. Les chemins de fichiers
  locaux sont rejetés dès le départ car le point de terminaison vidéo DashScope n'accepte pas de
  tampons locaux téléchargés pour ces références.

Consultez [Génération de vidéo](/en/tools/video-generation) pour les paramètres d'outil
partagés, la sélection du fournisseur et le comportement de basculement.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `QWEN_API_KEY` est
accessible à ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).
