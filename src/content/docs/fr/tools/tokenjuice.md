---
title: "Tokenjuice"
summary: "Compactez les résultats bruyants des outils exec et bash avec un plugin groupé optionnel"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to enable the bundled tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

# Tokenjuice

`tokenjuice` est un plugin groupé optionnel qui compacte les résultats bruyants des outils `exec` et `bash`
après l'exécution de la commande.

Il modifie le `tool_result` renvoyé, et non la commande elle-même. Tokenjuice ne
réécrit pas l'entrée du shell, ne relance pas les commandes et ne modifie pas les codes de sortie.

Aujourd'hui, cela s'applique aux exécutions intégrées de Pi, où tokenjuice intercepte le chemin `tool_result` intégré
et nettoie la sortie qui retourne dans la session.

## Activer le plugin

Accès rapide :

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

Équivalent :

```bash
openclaw plugins enable tokenjuice
```

OpenClaw inclut déjà le plugin. Il n'y a pas d'étape `plugins install`
ou `tokenjuice install openclaw` séparée.

Si vous préférez modifier la configuration directement :

```json5
{
  plugins: {
    entries: {
      tokenjuice: {
        enabled: true,
      },
    },
  },
}
```

## Ce que tokenjuice modifie

- Compacte les résultats bruyants de `exec` et `bash` avant qu'ils ne soient réinjectés dans la session.
- Laisse l'exécution de la commande originale intacte.
- Préserve les lectures exactes du contenu des fichiers et les autres commandes que tokenjuice doit laisser en l'état.
- Reste optionnel : désactivez le plugin si vous souhaitez une sortie textuelle partout.

## Vérifier qu'il fonctionne

1. Activez le plugin.
2. Démarrez une session qui peut appeler `exec`.
3. Exécutez une commande bruyante telle que `git status`.
4. Vérifiez que le résultat de l'outil renvoyé est plus court et plus structuré que la sortie brute du shell.

## Désactiver le plugin

```bash
openclaw config set plugins.entries.tokenjuice.enabled false
```

Ou :

```bash
openclaw plugins disable tokenjuice
```
