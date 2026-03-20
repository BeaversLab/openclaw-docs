---
title: "Session Pruning"
summary: "Session pruning : réduction des résultats d'outils pour limiter l'encombrement du contexte"
read_when:
  - Vous souhaitez réduire la croissance du contexte du LLM due aux sorties des outils
  - Vous réglez agents.defaults.contextPruning
---

# Session Pruning

Le session pruning supprime les **anciens résultats d'outils** du contexte en mémoire juste avant chaque appel au LLM. Cela ne réécrit **pas** l'historique de session sur disque (`*.jsonl`).

## Quand cela s'exécute

- Lorsque `mode: "cache-ttl"` est activé et que le dernier appel Anthropic pour la session est plus ancien que `ttl`.
- N'affecte que les messages envoyés au model pour cette requête.
- Actif uniquement pour les appels à l'Anthropic API (et les models OpenRouter Anthropic).
- Pour de meilleurs résultats, faites correspondre `ttl` à la politique de `cacheRetention` de votre model (`short` = 5 min, `long` = 1 h).
- Après une réduction, la fenêtre TTL est réinitialisée afin que les requêtes ultérieures conservent le cache jusqu'à ce que `ttl` expire à nouveau.

## Valeurs par défaut intelligentes (Anthropic)

- **Profils OAuth ou setup-token** : activez la réduction `cache-ttl` et définissez le heartbeat sur `1h`.
- **Profils clé d'API** : activez la réduction `cache-ttl`, définissez le heartbeat sur `30m`, et `cacheRetention: "short"` par défaut sur les models Anthropic.
- Si vous définissez explicitement l'une de ces valeurs, OpenClaw ne les remplacera pas.

## Ce que cela améliore (coût + comportement du cache)

- **Pourquoi réduire :** le cache de prompt Anthropic ne s'applique que dans le cadre de la TTL. Si une session reste inactive au-delà de la TTL, la requête suivante remet en cache le prompt complet, sauf si vous le réduisez d'abord.
- **Ce qui devient moins cher :** la réduction diminue la taille du **cacheWrite** pour cette première requête après l'expiration de la TTL.
- **Pourquoi la réinitialisation de la TTL est importante :** une fois la réduction effectuée, la fenêtre de cache est réinitialisée, afin que les requêtes de suivi puissent réutiliser le prompt nouvellement mis en cache au lieu de remettre en cache l'historique complet.
- **Ce que cela ne fait pas :** la réduction n'ajoute pas de tokens ni de coûts « doubles » ; elle modifie uniquement ce qui est mis en cache lors de cette première requête après expiration de la TTL.

## Ce qui peut être réduit

- Uniquement les messages `toolResult`.
- Les messages utilisateur et assistant ne sont **jamais** modifiés.
- Les derniers `keepLastAssistants` messages de l'assistant sont protégés ; les résultats des outils après cette limite ne sont pas élagués.
- S'il n'y a pas assez de messages de l'assistant pour établir la limite, l'élagage est ignoré.
- Les résultats des outils contenant des **blocs d'image** sont ignorés (jamais coupés/effacés).

## Estimation de la fenêtre de contexte

L'élagage utilise une fenêtre de contexte estimée (caractères ≈ tokens × 4). La fenêtre de base est résolue dans cet ordre :

1. `models.providers.*.models[].contextWindow` priorité.
2. Définition du modèle `contextWindow` (à partir du registre de modèles).
3. Par défaut `200000` tokens.

Si `agents.defaults.contextTokens` est défini, il est traité comme une limite (min) sur la fenêtre résolue.

## Mode

### cache-ttl

- L'élagage ne s'exécute que si le dernier appel Anthropic est antérieur à `ttl` (par défaut `5m`).
- Lorsqu'il s'exécute : même comportement de coupe douce et de suppression totale qu'auparavant.

## Élagage doux vs dur

- **Coupe douce** : uniquement pour les résultats d'outils trop volumineux.
  - Conserve le début et la fin, insère `...` et ajoute une note avec la taille d'origine.
  - Ignore les résultats contenant des blocs d'image.
- **Suppression totale** : remplace l'intégralité du résultat de l'outil par `hardClear.placeholder`.

## Sélection d'outils

- `tools.allow` / `tools.deny` prennent en charge les caractères génériques `*`.
- La liste de refus l'emporte.
- La correspondance ne tient pas compte de la casse.
- Liste d'autorisation vide => tous les outils autorisés.

## Interaction avec d'autres limites

- Les outils intégrés tronquent déjà leur propre sortie ; l'élagage de session est une couche supplémentaire qui empêche les conversations longues d'accumuler trop de sorties d'outils dans le contexte du modèle.
- La compression est séparée : la compression résume et persiste, l'élagage est transitoire par requête. Voir [/concepts/compaction](/fr/concepts/compaction).

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

Activer l'élagage prenant en compte le TTL :

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

Voir la référence de configuration : [Configuration de Gateway](/fr/gateway/configuration)

import en from "/components/footer/en.mdx";

<en />
