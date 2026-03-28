---
title: "Volcengine (Doubao)"
summary: "Configuration de Volcano Engine (modèles Doubao, points de terminaison généraux et codage)"
read_when:
  - You want to use Volcano Engine or Doubao models with OpenClaw
  - You need the Volcengine API key setup
---

# Volcengine (Doubao)

Le fournisseur Volcengine donne accès aux modèles Doubao et aux modèles tiers
hébergés sur Volcano Engine, avec des points de terminaison distincts pour les charges de travail
générales et de codage.

- Fournisseurs : `volcengine` (général) + `volcengine-plan` (codage)
- Auth : `VOLCANO_ENGINE_API_KEY`
- API : compatible OpenAI

## Quick start

1. Définir la clé API :

```bash
openclaw onboard --auth-choice volcengine-api-key
```

2. Définir un model par défaut :

```json5
{
  agents: {
    defaults: {
      model: { primary: "volcengine-plan/ark-code-latest" },
    },
  },
}
```

## Exemple non interactif

```bash
openclaw onboard --non-interactive \
  --mode local \
  --auth-choice volcengine-api-key \
  --volcengine-api-key "$VOLCANO_ENGINE_API_KEY"
```

## Fournisseurs et points de terminaison

| Fournisseur       | Point de terminaison                      | Cas d'usage       |
| ----------------- | ----------------------------------------- | ----------------- |
| `volcengine`      | `ark.cn-beijing.volces.com/api/v3`        | Modèles généraux  |
| `volcengine-plan` | `ark.cn-beijing.volces.com/api/coding/v3` | Modèles de codage |

Les deux fournisseurs sont configurés avec une seule clé API. Le configuration enregistre les deux
automatiquement.

## Modèles disponibles

- **doubao-seed-1-8** - Doubao Seed 1.8 (général, par défaut)
- **doubao-seed-code-preview** - Modèle de codage Doubao
- **ark-code-latest** - Par défaut pour le plan de codage
- **Kimi K2.5** - Moonshot AI via Volcano Engine
- **GLM-4.7** - GLM via Volcano Engine
- **DeepSeek V3.2** - DeepSeek via Volcano Engine

La plupart des modèles prennent en charge la saisie de texte + image. Les fenêtres de contexte vont de 128K à 256K
tokens.

## Remarque sur l'environnement

Si le Gateway s'exécute en tant que démon (launchd/systemd), assurez-vous
que `VOLCANO_ENGINE_API_KEY` est disponible pour ce processus (par exemple, dans
`~/.openclaw/.env` ou via `env.shellEnv`).
