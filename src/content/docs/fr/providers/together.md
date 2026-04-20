---
title: "Together AI"
summary: "Configuration Together AI (auth + sélection de model)"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

[Together AI](https://together.ai) donne accès aux modèles open source de pointe, notamment Llama, DeepSeek, Kimi, et bien d'autres, via une API unifiée.

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
  <Step title="Exécuter l'intégration">
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

<Note>Le préréglage d'onboarding définit `together/moonshotai/Kimi-K2.5` comme le model par défaut.</Note>

## Catalogue intégré

OpenClaw inclut ce catalogue Together groupé :

| Réf model                                                    | Nom                                    | Entrée      | Contexte   | Remarques                              |
| ------------------------------------------------------------ | -------------------------------------- | ----------- | ---------- | -------------------------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | text, image | 262 144    | Model par défaut ; raisonnement activé |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | text        | 202 752    | Model texte polyvalent                 |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | text        | 131 072    | Model d'instructions rapide            |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | text, image | 10 000 000 | Multimodal                             |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | text, image | 20 000 000 | Multimodal                             |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | text        | 131 072    | Model texte général                    |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | text        | 131 072    | Model de raisonnement                  |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | text        | 262 144    | Model texte Kimi secondaire            |

## Génération vidéo

Le plugin groupé `together` enregistre également la génération vidéo via l'outil partagé `video_generate`.

| Propriété                 | Valeur                                   |
| ------------------------- | ---------------------------------------- |
| Model vidéo par défaut    | `together/Wan-AI/Wan2.2-T2V-A14B`        |
| Modes                     | texte vers vidéo, référence image unique |
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

<Tip>Voir [Génération vidéo](/fr/tools/video-generation) pour les paramètres partagés de l'outil, la sélection du fournisseur et le comportement de basculement.</Tip>

<AccordionGroup>
  <Accordion title="Note d'environnement">
    Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous
    que `TOGETHER_API_KEY` est disponible pour ce processus (par exemple, dans
    `~/.openclaw/.env` ou via `env.shellEnv`).

    <Warning>
    Les clés définies uniquement dans votre shell interactif ne sont pas visibles pour les processus de
    Gateway gérés par un démon. Utilisez la configuration `~/.openclaw/.env` ou `env.shellEnv` pour
    une disponibilité persistante.
    </Warning>

  </Accordion>

  <Accordion title="Dépannage">
    - Vérifiez que votre clé fonctionne : `openclaw models list --provider together`
    - Si les modèles n'apparaissent pas, confirmez que la clé API est définie dans le bon
      environnement pour votre processus Gateway.
    - Les références de modèle utilisent le formulaire `together/<model-id>`.
  </Accordion>
</AccordionGroup>

## Connexes

<CardGroup cols={2}>
  <Card title="Fournisseurs de modèles" href="/fr/concepts/model-providers" icon="layers">
    Règles de fournisseur, références de modèle et comportement de basculement.
  </Card>
  <Card title="Génération vidéo" href="/fr/tools/video-generation" icon="video">
    Paramètres partagés de l'outil de génération vidéo et sélection du fournisseur.
  </Card>
  <Card title="Référence de configuration" href="/fr/gateway/configuration-reference" icon="gear">
    Schéma de configuration complet incluant les paramètres du fournisseur.
  </Card>
  <Card title="Together AI" href="https://together.ai" icon="arrow-up-right-from-square">
    Tableau de bord Together AI, documentation de l'API et tarifs.
  </Card>
</CardGroup>
