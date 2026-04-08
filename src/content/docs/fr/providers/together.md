---
title: "Together AI"
summary: "Configuration Together AI (auth + sélection de model)"
read_when:
  - You want to use Together AI with OpenClaw
  - You need the API key env var or CLI auth choice
---

# Together AI

Le [Together AI](https://together.ai) donne accès aux modèles open source de premier plan, notamment Llama, DeepSeek, Kimi, et plus encore, via une API unifiée.

- Fournisseur : `together`
- Auth : `TOGETHER_API_KEY`
- API : compatible OpenAI
- URL de base : `https://api.together.xyz/v1`

## Quick start

1. Définissez la clé API (recommandé : stockez-la pour le Gateway) :

```bash
openclaw onboard --auth-choice together-api-key
```

2. Définir un model par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "together/moonshotai/Kimi-K2.5" },
    },
  },
}
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice together-api-key \
  --together-api-key "$TOGETHER_API_KEY"
```

Cela définira `together/moonshotai/Kimi-K2.5` comme le model par défaut.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous que `TOGETHER_API_KEY`
est disponible pour ce processus (par exemple, dans `~/.openclaw/.env` ou via
`env.shellEnv`).

## Catalogue intégré

OpenClaw fournit actuellement ce catalogue Together intégré :

| Réf model                                                    | Nom                                    | Entrée       | Contexte   | Remarques                              |
| ------------------------------------------------------------ | -------------------------------------- | ------------ | ---------- | -------------------------------------- |
| `together/moonshotai/Kimi-K2.5`                              | Kimi K2.5                              | texte, image | 262 144    | Model par défaut ; raisonnement activé |
| `together/zai-org/GLM-4.7`                                   | GLM 4.7 Fp8                            | texte        | 202 752    | Model textique polyvalent              |
| `together/meta-llama/Llama-3.3-70B-Instruct-Turbo`           | Llama 3.3 70B Instruct Turbo           | texte        | 131 072    | Model d'instruction rapide             |
| `together/meta-llama/Llama-4-Scout-17B-16E-Instruct`         | Llama 4 Scout 17B 16E Instruct         | texte, image | 10 000 000 | Multimodal                             |
| `together/meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8` | Llama 4 Maverick 17B 128E Instruct FP8 | texte, image | 20 000 000 | Multimodal                             |
| `together/deepseek-ai/DeepSeek-V3.1`                         | DeepSeek V3.1                          | texte        | 131 072    | Model textique général                 |
| `together/deepseek-ai/DeepSeek-R1`                           | DeepSeek R1                            | texte        | 131 072    | Model de raisonnement                  |
| `together/moonshotai/Kimi-K2-Instruct-0905`                  | Kimi K2-Instruct 0905                  | texte        | 262 144    | Model textique Kimi secondaire         |

Le préréglage d'onboarding définit `together/moonshotai/Kimi-K2.5` comme le model par défaut.

## Génération vidéo

Le plugin `together` inclus enregistre également la génération vidéo via l'outil `video_generate` partagé.

- Model vidéo par défaut : `together/Wan-AI/Wan2.2-T2V-A14B`
- Modes : flux texte-vers-vidéo et référence image unique
- Prend en charge `aspectRatio` et `resolution`

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

Voir [Génération vidéo](/en/tools/video-generation) pour les paramètres de l'outil
partagés, la sélection du fournisseur et le comportement de basculement.
