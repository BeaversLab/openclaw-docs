---
summary: "Compacter les résultats bruyants des outils exec et bash avec le plugin optionnel Tokenjuice"
title: "Tokenjuice"
read_when:
  - You want shorter `exec` or `bash` tool results in OpenClaw
  - You want to install or enable the Tokenjuice plugin
  - You need to understand what tokenjuice changes and what it leaves raw
---

`tokenjuice` est un plugin externe optionnel qui compacte les résultats bruyants des `exec` et `bash`
tools après l'exécution de la commande.

Il modifie le `tool_result` renvoyé, et non la commande elle-même. Tokenjuice ne
réécrit pas l'entrée du shell, ne réexécute pas les commandes et ne modifie pas les codes de sortie.

Aujourd'hui, cela s'applique aux exécutions intégrées OpenClaw et aux outils dynamiques OpenClaw dans le harnais
app-server Codex. Tokenjuice intercepte le middleware de résultat d'outil de OpenClaw et
réduit la sortie avant qu'elle ne retourne dans la session de harnais active.

## Activer le plugin

Installer une fois :

```bash
openclaw plugins install clawhub:@openclaw/tokenjuice
```

Puis activez-le :

```bash
openclaw config set plugins.entries.tokenjuice.enabled true
```

Équivalent :

```bash
openclaw plugins enable tokenjuice
```

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

- Compacte les résultats bruyants de `exec` et `bash` avant qu'ils ne soient renvoyés dans la session.
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
