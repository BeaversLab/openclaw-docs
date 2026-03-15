---
summary: "Appliquer des correctifs multi-fichiers avec le tool apply_patch"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "Tool apply_patch"
---

# tool apply_patch

Appliquer des modifications de fichiers à l'aide d'un format de correctif structuré. C'est idéal pour les modifications multi-fichiers ou multi-hunk où un seul appel `edit` serait fragile.

L'tool accepte une seule chaîne `input` qui encapsule une ou plusieurs opérations de fichiers :

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
- `tools.exec.applyPatch.workspaceOnly` est défini par défaut sur `true` (contenu dans l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez intentionnellement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.
- Utilisez `*** Move to:` dans un hunk `*** Update File:` pour renommer des fichiers.
- `*** End of File` marque une insertion en fin de fichier (EOF uniquement) si nécessaire.
- Expérimental et désactivé par défaut. Activez avec `tools.exec.applyPatch.enabled`.
- OpenAI uniquement (y compris OpenAI Codex). Optionnellement limité par le modèle via `tools.exec.applyPatch.allowModels`.
- La configuration se trouve uniquement sous `tools.exec`.

## Exemple

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

import fr from '/components/footer/fr.mdx';

<fr />
