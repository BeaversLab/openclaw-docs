---
summary: "Appliquer des correctifs multi-fichiers avec l'outil apply_patch"
read_when:
  - Vous avez besoin de modifications de fichiers structurées sur plusieurs fichiers
  - Vous souhaitez documenter ou déboguer des modifications basées sur des correctifs
title: "Outil apply_patch"
---

# outil apply_patch

Appliquer des modifications de fichiers en utilisant un format de correctif structuré. C'est idéal pour des modifications multi-fichiers ou multi-hunks où un seul appel `edit` serait fragile.

L'outil accepte une seule chaîne `input` qui encapsule une ou plusieurs opérations de fichiers :

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

- `input` (requis) : Contenu complet du correctif incluant `*** Begin Patch` et `*** End Patch`.

## Notes

- Les chemins de correctif prennent en charge les chemins relatifs (à partir du répertoire de l'espace de travail) et les chemins absolus.
- `tools.exec.applyPatch.workspaceOnly` est `true` par défaut (limité à l'espace de travail). Définissez-le sur `false` uniquement si vous souhaitez volontairement que `apply_patch` écrive/supprime en dehors du répertoire de l'espace de travail.
- Utilisez `*** Move to:` dans un hunk `*** Update File:` pour renommer des fichiers.
- `*** End of File` marque une insertion en fin de fichier uniquement si nécessaire.
- Expérimental et désactivé par défaut. Activez-le avec `tools.exec.applyPatch.enabled`.
- OpenAI-uniquement (y compris OpenAI Codex). Optionnellement restreindre par modèle via `tools.exec.applyPatch.allowModels`.
- La configuration se trouve uniquement sous `tools.exec`.

## Exemple

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

import fr from "/components/footer/fr.mdx";

<fr />
