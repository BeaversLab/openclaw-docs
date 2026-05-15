---
summary: "Appliquer des correctifs multi-fichiers avec le tool apply_patch"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch tool"
---

Appliquer les modifications de fichiers à l'aide d'un format de correctif structuré. C'est idéal pour les modifications multi-fichiers ou multi-segments où un seul appel `edit` serait fragile.

L'outil accepte une seule chaîne `input` qui englobe une ou plusieurs opérations sur fichiers :

```
*** Begin Patch
*** Add File: path/to/file.txt
+line 1
+line 2
*** Update File: src/app.ts
@@
-old line
+new line
*** Delete File: obsolete.txt
*** End Patch
```

## Paramètres

- `input` (requis) : Contenu complet du correctif, y compris `*** Begin Patch` et `*** End Patch`.

## Notes

- Les chemins de correctif prennent en charge les chemins relatifs (à partir du répertoire de l'espace de travail) et les chemins absolus.
- `tools.exec.applyPatch.workspaceOnly` est par défaut `true` (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez intentionnellement que `apply_patch` écrive ou supprime en dehors du répertoire de l'espace de travail.
- Utilisez `*** Move to:` dans un segment `*** Update File:` pour renommer des fichiers.
- `*** End of File` marque une insertion en fin de fichier (EOF) si nécessaire.
- Disponible par défaut pour les modèles OpenAI et OpenAI Codex. Définissez `tools.exec.applyPatch.enabled: false` pour le désactiver.
- Optionnellement restreindre par modèle via `tools.exec.applyPatch.allowModels`.
- La configuration se trouve uniquement sous `tools.exec`.

## Exemple

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## Connexes

<CardGroup cols={2}>
  <Card title="Diffs" href="/fr/tools/diffs" icon="code-compare">
    Visualiseur de différences en lecture seule pour la présentation des modifications.
  </Card>
  <Card title="Exec tool" href="/fr/tools/exec" icon="terminal">
    Exécution de commandes shell depuis l'agent.
  </Card>
  <Card title="Code execution" href="/fr/tools/code-execution" icon="square-code">
    Analyse Python distante sécurisée avec xAI.
  </Card>
</CardGroup>
