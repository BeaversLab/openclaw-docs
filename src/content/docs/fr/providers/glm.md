---
summary: "GLMOpenClawAperçu de la famille de modèles GLM et comment l'utiliser dans OpenClaw"
read_when:
  - You want GLM models in OpenClaw
  - You need the model naming convention and setup
title: "GLMGLM (Zhipu)"
---

GLM est une famille de modèles (et non une entreprise) disponible via la plateforme [Z.AI](https://z.ai). Dans OpenClaw, les modèles GLM sont accessibles via le provider `zai` fourni avec des références telles que `zai/glm-5.1`.

| Propriété                        | Valeur                                                                      |
| -------------------------------- | --------------------------------------------------------------------------- |
| ID du fournisseur                | `zai`                                                                       |
| Plugin                           | inclus, `enabledByDefault: true`                                            |
| Variables d'environnement d'auth | `ZAI_API_KEY` ou `Z_AI_API_KEY`                                             |
| Choix d'intégration              | `zai-api-key`, `zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn` |
| API                              | compatible OpenAI                                                           |
| URL de base par défaut           | `https://api.z.ai/api/paas/v4`                                              |
| Par défaut suggéré               | `zai/glm-5.1`                                                               |
| Modèle d'image par défaut        | `zai/glm-4.6v`                                                              |

## Getting started

<Steps>
  <Step title="Choose an auth route and run onboarding">
    Choisissez l'option d'intégration qui correspond à votre forfait et votre région Z.AI. L'option générique `zai-api-key` détecte automatiquement le point de terminaison correspondant en fonction de la forme de la clé ; utilisez les options régionales explicites lorsque vous souhaitez forcer un Coding Plan spécifique ou une surface API générale.

    | Auth choice         | Best for                                            |
    | ------------------- | --------------------------------------------------- |
    | `zai-api-key`       | Clé API générique avec détection automatique du point de terminaison        |
    | `zai-coding-global` | Utilisateurs du Coding Plan (mondial)                          |
    | `zai-coding-cn`     | Utilisateurs du Coding Plan (région Chine)                    |
    | `zai-global`        | API générale (mondiale)                                |
    | `zai-cn`            | API générale (région Chine)                          |

    <CodeGroup>

```bash Auto-detect
openclaw onboard --auth-choice zai-api-key
```

```bash Coding Plan (global)
openclaw onboard --auth-choice zai-coding-global
```

```bash Coding Plan (China)
openclaw onboard --auth-choice zai-coding-cn
```

```bash General API (global)
openclaw onboard --auth-choice zai-global
```

```bash General API (China)
openclaw onboard --auth-choice zai-cn
```

    </CodeGroup>

  </Step>
  <Step title="Définir GLM comme le modèle par défaut">
    ```bash
    openclaw config set agents.defaults.model.primary "zai/glm-5.1"
    ```
  </Step>
  <Step title="Vérifier que les modèles sont disponibles">
    ```bash
    openclaw models list --provider zai
    ```
  </Step>
</Steps>

## Exemple de configuration

```json5
{
  env: { ZAI_API_KEY: "sk-..." },
  agents: { defaults: { model: { primary: "zai/glm-5.1" } } },
}
```

<Tip>`zai-api-key` permet à OpenClaw de détecter le point de terminaison Z.AI correspondant à partir de la forme de la clé et d'appliquer automatiquement l'URL de base correcte. Utilisez les choix régionaux explicites lorsque vous souhaitez épingler un plan de codage spécifique ou une surface d'API générale.</Tip>

## Catalogue intégré

Le provider `zai`GLM inclus fournit 13 références de model GLM. Toutes les entrées prennent en charge le raisonnement, sauf indication contraire ; `glm-5v-turbo` et `glm-4.6v` acceptent les entrées d'image ainsi que le texte.

| Référence du modèle  | Remarques                                                           |
| -------------------- | ------------------------------------------------------------------- |
| `zai/glm-5.1`        | Model par défaut. Raisonnement, texte uniquement, contexte de 202k. |
| `zai/glm-5`          | Raisonnement, texte uniquement, contexte 202k.                      |
| `zai/glm-5-turbo`    | Raisonnement, texte uniquement, 200k de contexte.                   |
| `zai/glm-5v-turbo`   | Raisonnement, texte + image, contexte 200k.                         |
| `zai/glm-4.7`        | Raisonnement, texte uniquement, contexte 204k.                      |
| `zai/glm-4.7-flash`  | Raisonnement, texte uniquement, 200k de contexte.                   |
| `zai/glm-4.7-flashx` | Raisonnement, texte uniquement.                                     |
| `zai/glm-4.6`        | Raisonnement, texte uniquement.                                     |
| `zai/glm-4.6v`       | Raisonnement, texte + image. Modèle d'image par défaut.             |
| `zai/glm-4.5`        | Raisonnement, texte uniquement.                                     |
| `zai/glm-4.5-air`    | Raisonnement, texte uniquement.                                     |
| `zai/glm-4.5-flash`  | Raisonnement, texte uniquement.                                     |
| `zai/glm-4.5v`       | Raisonnement, texte + image.                                        |

<Note>Les versions et la disponibilité de GLM peuvent changer. Exécutez `openclaw models list --provider zai` pour voir les lignes du catalogue connues de votre version installée, et consultez la documentation de Z.AI pour les modèles nouvellement ajoutés ou obsolètes.</Note>

## Configuration avancée

<AccordionGroup>
  <Accordion title="Endpoint auto-detection">
    Lorsque vous utilisez le choix d'authentification `zai-api-key`, OpenClaw inspecte la forme de la clé pour déterminer l'URL de base Z.AI correcte. Les choix régionaux explicites (`zai-coding-global`, `zai-coding-cn`, `zai-global`, `zai-cn`) remplacent la détection automatique et fixent directement le point de terminaison.
  </Accordion>

  <Accordion title="Détails du fournisseur"GLM>
    Les modèles GLM sont servis par le fournisseur d'exécution `zai`. Pour la configuration complète du fournisseur, les points de terminaison régionaux et les fonctionnalités supplémentaires, consultez la [page du fournisseur Z.AI](/fr/providers/zai).
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="provider Z.AI" href="/fr/providers/zai" icon="serveur">
    Configuration complète du provider Z.AI et points de terminaison régionaux.
  </Card>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="couches">
    Choix des fournisseurs, des références de modèles et du comportement de basculement.
  </Card>
  <Card title="Modes de pensée" href="/fr/tools/thinking" icon="brain">
    Niveaux `/think` pour la famille GLM capable de raisonnement.
  </Card>
  <Card title="FAQ sur les modèles" href="/fr/help/faq-models" icon="circle-question">
    Profils d'authentification, changement de modèles et résolution des erreurs "no profile".
  </Card>
</CardGroup>
