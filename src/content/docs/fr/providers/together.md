---
summary: "Configuration de Together AI (auth + sélection du modèle)"
title: "Together AI"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

[Together AI](https://together.ai) donne accès aux modèles open source
de premier plan, notamment Llama, DeepSeek, Kimi et autres, via une API unifiée.

| Propriété   | Valeur                        |
| ----------- | ----------------------------- |
| Fournisseur | `together`                    |
| Auth        | `TOGETHER_API_KEY`            |
| API         | compatible OpenAI             |
| URL de base | `https://api.together.xyz/v1` |

## Getting started

<Steps>
  <Step title="Obtenir une clé API">
    Créez une clé API sur
    [api.together.ai/settings/api-keys](https://api.together.ai/settings/api-keys).
  </Step>
  <Step title="Exécuter l'onboarding">
    ```bash
    openclaw onboard --auth-choice together-api-key
    ```
  </Step>
  <Step title="Définir un modèle par défaut">
    ```json5
    {
      agents: {
        defaults: {
          model: { primary: "together/moonshotai/Kimi-K2.5" },
        },
      },
    }
    ```
  </Step>
</Steps>

### Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

<Note>La préréglage d'onboarding définit `together/moonshotai/Kimi-K2.5` comme modèle par défaut.</Note>

## Catalogue intégré

OpenClaw est fourni avec ce catalogue Together inclus :

| Réf modèle                                                   | Nom                                    | Entrée       | Contexte   | Notes                                   |
| ------------------------------------------------------------ | -------------------------------------- | ------------ | ---------- | --------------------------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | texte, image | 262,144    | Modèle par défaut ; raisonnement activé |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | texte        | 202,752    | Modèle textuel polyvalent               |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | texte        | 131,072    | Modèle d'instructions rapide            |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | texte, image | 10,000,000 | Multimodal                              |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | texte, image | 20,000,000 | Multimodal                              |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | texte        | 131,072    | Modèle textuel général                  |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | texte        | 131,072    | Modèle de raisonnement                  |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | texte        | 262,144    | Modèle textuel Kimi secondaire          |

## Génération vidéo

Le plugin `together` inclus enregistre également la génération vidéo via
l'outil partagé `video_generate`.

| Propriété                 | Valeur                                   |
| ------------------------- | ---------------------------------------- |
| Modèle vidéo par défaut   | `together/Wan-AI/Wan2.2-T2V-A14B`        |
| Modes                     | texte-vers-vidéo, référence image unique |
| Paramètres pris en charge | `aspectRatio`, `resolution`              |

Pour utiliser Together comme fournisseur vidéo par défaut :

```json5
{
  agents: {
    defaults: {
      videoGenerationModel: {
        primary: "together/Wan-AI/Wan2.2-T2V-A14B",
      },
    },
  },
}
```

<Tip>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres de l'outil partagé, la sélection du fournisseur et le comportement de basculement.</Tip>

<AccordionGroup>
  <Accordion title="Note d'environnement">
    Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous
    que `TOGETHER_API_KEY` est disponible pour ce processus (par exemple, dans
    `~/.openclaw/.env` ou via `env.shellEnv`).

    <Warning>
    Les clés définies uniquement dans votre shell interactif ne sont pas visibles par les processus
    de gateway gérés par un démon. Utilisez la config `~/.openclaw/.env` ou `env.shellEnv` pour
    une disponibilité permanente.
    </Warning>

  </Accordion>

  <Accordion title="Dépannage">
    - Vérifiez que votre clé fonctionne : `openclaw models list --provider together`
    - Si les modèles n'apparaissent pas, confirmez que la clé API est définie dans le bon
      environnement pour votre processus Gateway.
    - Les références de modèles utilisent le format `together/<model-id>`.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Sélection du modèle" href="/fr/concepts/model-providers" icon="layers">
    Règles du fournisseur, références de modèles et comportement de basculement.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres de l'outil de génération vidéo partagés et sélection du fournisseur.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet incluant les paramètres du fournisseur.
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Tableau de bord Together AI, documentation de l'API et tarifs.
  </Card>
</CardGroup>
