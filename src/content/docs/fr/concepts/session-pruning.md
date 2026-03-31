---
title: "Élagage de session"
summary: "Élagage de session : réduction des résultats des outils pour limiter l'expansion du contexte"
read_when:
  - You want to reduce LLM context growth from tool outputs
  - You are tuning agents.defaults.contextPruning
---

# Élagage de session

L'élagage de session supprime les **anciens résultats des outils** du contexte en mémoire juste avant chaque appel LLM. Cela ne **réécrit pas** l'historique de session sur disque (`*.jsonl`).

## Quand il s'exécute

- Lorsque `mode: "cache-ttl"` est activé et que le dernier appel Anthropic pour la session est antérieur à `ttl`.
- N'affecte que les messages envoyés au modèle pour cette demande.
- Actif uniquement pour les appels Anthropic API (et les modèles OpenRouter Anthropic).
- Pour de meilleurs résultats, faites correspondre `ttl` à votre stratégie de `cacheRetention` du modèle (`short` = 5 m, `long` = 1 h).
- Après un élagage, la fenêtre TTL est réinitialisée, de sorte que les demandes ultérieures conservent le cache jusqu'à ce que `ttl` expire à nouveau.

## Valeurs par défaut intelligentes (Anthropic)

- Profils **OAuth ou setup-token** : activez l'élagage `cache-ttl` et définissez le heartbeat sur `1h`.
- Profils **clé API** : activez l'élagage `cache-ttl`, définissez le heartbeat sur `30m` et `cacheRetention: "short"` par défaut sur les modèles Anthropic.
- Si vous définissez explicitement l'une de ces valeurs, OpenClaw ne les remplacera pas.

## Ce que cela améliore (coût + comportement du cache)

- **Pourquoi élaguer :** la mise en cache du prompt Anthropic ne s'applique que dans la limite du TTL. Si une session reste inactive au-delà du TTL, la prochaine demande remet en cache le prompt complet, sauf si vous le réduisez d'abord.
- **Ce qui devient moins cher :** l'élagage réduit la taille **cacheWrite** pour cette première demande après l'expiration du TTL.
- **Pourquoi la réinitialisation du TTL est importante :** une fois l'élagage effectué, la fenêtre de cache est réinitialisée, ce qui permet aux demandes suivantes de réutiliser le prompt fraîchement mis en cache au lieu de remettre en cache l'historique complet.
- **Ce qu'il ne fait pas :** l'élagage n'ajoute pas de jetons ou de coûts « doubles » ; il modifie uniquement ce qui est mis en cache lors de cette première demande post‑TTL.

## Ce qui peut être élagué

- Seulement les messages `toolResult`.
- Les messages utilisateur + assistant ne sont **jamais** modifiés.
- Les derniers messages de l'assistant `keepLastAssistants` sont protégés ; les résultats des outils après cette limite ne sont pas élagués.
- S'il n'y a pas assez de messages d'assistant pour établir la limite, l'élagage est ignoré.
- Les résultats des outils contenant des **blocs d'image** sont ignorés (jamais taillés/effacés).

## Estimation de la fenêtre contextuelle

L'élagage utilise une fenêtre contextuelle estimée (caractères ≈ jetons × 4). La fenêtre de base est résolue dans cet ordre :

1. Remplacement `models.providers.*.models[].contextWindow`.
2. Définition du modèle `contextWindow` (à partir du registre de modèles).
3. `200000` jetons par défaut.

Si `agents.defaults.contextTokens` est défini, il est traité comme une limite (min) sur la fenêtre résolue.

## Mode

### cache-ttl

- L'élagage ne s'exécute que si le dernier appel Anthropic est antérieur à `ttl` (par défaut `5m`).
- Lorsqu'il s'exécute : même comportement de découpage souple + effacement dur qu'auparavant.

## Élagage souple vs dur

- **Découpage souple** : uniquement pour les résultats d' outils trop volumineux.
  - Conserve le début + la fin, insère `...`, et ajoute une note avec la taille originale.
  - Ignore les résultats avec des blocs d'image.
- **Effacement dur** : remplace tout le résultat de l'outil par `hardClear.placeholder`.

## Sélection d'outils

- `tools.allow` / `tools.deny` prennent en charge les caractères génériques `*`.
- Le refus l'emporte.
- La correspondance ne tient pas compte de la casse.
- Liste d'autorisation vide => tous les outils autorisés.

## Interaction avec d'autres limites

- Les outils intégrés tronquent déjà leur propre sortie ; l'élagage de session est une couche supplémentaire qui empêche les conversations de longue durée d'accumuler trop de résultats d'outils dans le contexte du modèle.
- La compaction est distincte : la compaction résume et rend persistant, tandis que l'élagage est transitoire par requête. Voir [/concepts/compaction](/en/concepts/compaction).

## Valeurs par défaut (lorsqu'activé)

- `ttl` : `"5m"`
- `keepLastAssistants` : `3`
- `softTrimRatio` : `0.3`
- `hardClearRatio` : `0.5`
- `minPrunableToolChars` : `50000`
- `softTrim` : `{ maxChars: 4000, headChars: 1500, tailChars: 1500 }`
- `hardClear` : `{ enabled: true, placeholder: "[Old tool result content cleared]" }`

## Exemples

Par défaut (désactivé) :

```json5
{
  agents: { defaults: { contextPruning: { mode: "off" } } },
}
```

Activer l'élagage sensible au TTL :

```json5
{
  agents: { defaults: { contextPruning: { mode: "cache-ttl", ttl: "5m" } } },
}
```

Limiter l'élagage à des outils spécifiques :

```json5
{
  agents: {
    defaults: {
      contextPruning: {
        mode: "cache-ttl",
        tools: { allow: ["exec", "read"], deny: ["*image*"] },
      },
    },
  },
}
```

Voir la référence de configuration : [Configuration du Gateway](/en/gateway/configuration)
