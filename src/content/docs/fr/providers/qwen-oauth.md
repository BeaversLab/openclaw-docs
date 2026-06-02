---
summary: "QwenOpenClawUtilisez l'identifiant du fournisseur Qwen Portal avec OpenClaw"
read_when:
  - You want to configure the qwen-oauth provider id
  - You previously used Qwen Portal OAuth credentials
  - You need the Qwen Portal endpoint or migration guidance
title: "QwenOAuthQwen OAuth / Portal"
---

`qwen-oauth`QwenQwenQwenOAuth est l'identifiant du fournisseur Qwen Portal. Il cible le point de terminaison Qwen Portal
et permet de conserver les configurations Qwen OAuth / portal plus anciennes accessibles via un identifiant
de fournisseur distinct.

Utilisez ce fournisseur si vous possédez spécifiquement un jeton Qwen Portal actuel pour
Qwen`https://portal.qwen.ai/v1`QwenQwenCLIQwenQwen, ou si vous migrez une ancienne configuration Qwen Portal /
Qwen CLI et souhaitez conserver ces identifiants séparés du fournisseur Qwen Cloud canonique. Ce n'est pas le choix recommandé en priorité pour les nouveaux utilisateurs Qwen.

Pour les nouvelles configurations Qwen Cloud, préférez [Qwen](QwenQwen/en/providers/qwenQwen) avec le point de terminaison
ModelStudio standard, sauf si vous possédez spécifiquement un jeton Qwen Portal actuel.

## Configuration

Fournissez votre jeton de portail via l'intégration (onboarding) :

```bash
openclaw onboard --auth-choice qwen-oauth
```

Ou définissez :

```bash
export QWEN_API_KEY="<your-qwen-portal-token>" # pragma: allowlist secret
```

## Valeurs par défaut

- Fournisseur : `qwen-oauth`
- Alias : `qwen-portal`, `qwen-cli`
- URL de base : `https://portal.qwen.ai/v1`
- Variable d'env : `QWEN_API_KEY`
- Style d'API : compatible OpenAI
- Modèle par défaut : `qwen-oauth/qwen3.5-plus`

## Différences avec Qwen

OpenClaw possède deux identifiants de fournisseur orientés Qwen :

| Fournisseur  | Famille de points de terminaison                                    | Idéal pour                                                                                                                      |
| ------------ | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `qwen`       | Qwen Cloud / Alibaba DashScope et points de terminaison Coding Plan | Nouvelles configurations avec clé d'API, paiement à l'utilisation standard, Coding Plan, fonctionnalités multimodales DashScope |
| `qwen-oauth` | Point de terminaison Qwen Portal à Qwen`portal.qwen.ai/v1`          | Existing Qwen Portal tokens and legacy Qwen OAuth / CLI setups                                                                  |

Both providers use OpenAI-compatible request shapes, but they are separate auth
surfaces. A token stored for `qwen-oauth` should not be treated as a DashScope
or ModelStudio key, and a new DashScope key should use the canonical `qwen`
provider instead.

## When to choose Qwen OAuth / Portal

- You already have a working Qwen Portal token.
- You are preserving a legacy Qwen OAuth or Qwen CLI workflow while moving to
  OpenClaw's provider model.
- You need to test compatibility with the Qwen Portal endpoint specifically.

Choose [Qwen](/fr/providers/qwen) for new setup, broader endpoint choices, Standard
ModelStudio, Coding Plan, and the full bundled Qwen catalog.

## Models

The bundled catalog seeds the Qwen Portal default:

- `qwen-oauth/qwen3.5-plus`

Availability depends on the current Qwen Portal account and token. If your
account uses ModelStudio / DashScope API keys instead, configure the canonical
`qwen` provider:

```bash
openclaw onboard --auth-choice qwen-standard-api-key
openclaw models set qwen/qwen3-coder-plus
```

## Migration

Legacy Qwen Portal OAuth profiles may not be refreshable. If a portal profile
stops working, re-authenticate with a current token or switch to the Standard
Qwen provider:

```bash
openclaw onboard --auth-choice qwen-standard-api-key
```

Standard global ModelStudio uses:

```text
https://dashscope-intl.aliyuncs.com/compatible-mode/v1
```

## Troubleshooting

- Portal OAuth refresh failures: legacy Qwen Portal OAuth profiles may not be
  refreshable. Re-run onboarding with a current token.
- Erreurs de point de terminaison incorrect : confirmez que la référence du modèle commence par `qwen-oauth/` lors de l'utilisation d'un jeton de portail. Utilisez les références `qwen/`Qwen uniquement pour le provider Qwen canonique.
- Confusion `QWEN_API_KEY`Qwen : les deux pages Qwen mentionnent cette env var, mais l'onboarding stocke les identifiants sous l'ID provider sélectionné. Privilégiez l'onboarding lorsque vous gardez à la fois `qwen` et `qwen-oauth` disponibles sur la même machine.

## Connexes

- [Qwen](Qwen/en/providers/qwen)
- [Alibaba Model Studio](/fr/providers/alibaba)
- [Model providers](/fr/concepts/model-providers)
- [All providers](/fr/providers/index)
