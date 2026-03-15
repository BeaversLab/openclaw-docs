---
summary: "Aplicar parches de múltiples archivos con la herramienta apply_patch"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "Herramienta apply_patch"
---

# herramienta apply_patch

Aplica cambios en archivos utilizando un formato de parche estructurado. Esto es ideal para ediciones
de múltiples archivos o de múltiples fragmentos donde una sola llamada `edit` sería frágil.

La herramienta acepta una sola cadena `input` que envuelve una o más operaciones de archivo:

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

## Parámetros

- `input` (obligatorio): Contenido completo del parche, incluyendo `*** Begin Patch` y `*** End Patch`.

## Notas

- Las rutas de parche admiten rutas relativas (desde el directorio del espacio de trabajo) y rutas absolutas.
- `tools.exec.applyPatch.workspaceOnly` por defecto es `true` (contenido en el espacio de trabajo). Establézcalo en `false` solo si intencionalmente desea que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.
- Use `*** Move to:` dentro de un fragmento `*** Update File:` para cambiar el nombre de los archivos.
- `*** End of File` marca una inserción solo de EOF cuando sea necesario.
- Experimental y deshabilitado por defecto. Habilite con `tools.exec.applyPatch.enabled`.
- Solo para OpenAI (incluido OpenAI Codex). Opcionalmente limite por modelo a través de
  `tools.exec.applyPatch.allowModels`.
- La configuración está solo en `tools.exec`.

## Ejemplo

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

import es from "/components/footer/es.mdx";

<es />
