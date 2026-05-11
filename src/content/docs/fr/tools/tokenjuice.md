---
summary: "Compactez les résultats bruyants des outils exec et bash avec un plugin groupé facultatif"
title: "Tokenjuice"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to enable the bundled tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

`tokenjuice` est un plugin groupé facultatif qui compacte les résultats `exec` et `bash` bruyants
suite à l'exécution de la commande.

Il modifie la `tool_result` renvoyée, et non la commande elle-même. Tokenjuice ne
réécrit pas l'entrée du shell, ne relance pas les commandes et ne modifie pas les codes de sortie.

Actuellement, cela s'applique aux exécutions intégrées PI et aux outils dynamiques OpenClaw dans le harnais
Codex app-server. Tokenjuice s'accroche au middleware de résultats d'outils de OpenClaw et
réduit la sortie avant qu'elle ne retourne dans la session de harnais active.

## Activer le plugin

Accès rapide :

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

Équivalent à :

```bash
openclaw plugins enable tokenjuice
```

OpenClaw fournit déjà le plugin. Il n'y a pas d'étape `plugins install`
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
- Garde l'exécution de la commande d'origine intacte.
- Conserve les lectures exactes du contenu des fichiers et autres commandes que tokenjuice doit laisser telles quelles.
- Reste optionnel : désactivez le plugin si vous souhaitez une sortie verbatim partout.

## Vérifier qu'il fonctionne

1. Activez le plugin.
2. Démarrez une session pouvant appeler `exec`.
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

## Connexes

- [Outil Exec](/fr/tools/exec)
- [Niveaux de réflexion](/fr/tools/thinking)
- [Moteur de contexte](/fr/concepts/context-engine)
