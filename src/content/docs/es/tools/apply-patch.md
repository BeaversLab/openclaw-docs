---
summary: "Aplicar parches de múltiples archivos con la herramienta apply_patch"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch herramienta"
---

Aplica cambios en archivos usando un formato de parche estructurado. Esto es ideal para ediciones
multiples de archivos o múltiples fragmentos donde una sola llamada `edit` sería frágil.

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

- `input` (obligatorio): Contenido completo del parche incluyendo `*** Begin Patch` y `*** End Patch`.

## Notas

- Las rutas de parche soportan rutas relativas (desde el directorio del espacio de trabajo) y rutas absolutas.
- `tools.exec.applyPatch.workspaceOnly` por defecto es `true` (contenido en el espacio de trabajo). Establézcalo en `false` solo si intencionalmente quiere que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.
- Use `*** Move to:` dentro de un fragmento `*** Update File:` para renombrar archivos.
- `*** End of File` marca una inserción solo de EOF cuando sea necesario.
- Disponible por defecto para modelos de OpenAI y OpenAI Codex. Establezca
  `tools.exec.applyPatch.enabled: false` para desactivarlo.
- Opcionalmente restringir por modelo mediante
  `tools.exec.applyPatch.allowModels`.
- La configuración está solo bajo `tools.exec`.

## Ejemplo

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## Relacionado

- [Diferencias](/es/tools/diffs)
- [Herramienta Exec](/es/tools/exec)
- [Ejecución de código](/es/tools/code-execution)
