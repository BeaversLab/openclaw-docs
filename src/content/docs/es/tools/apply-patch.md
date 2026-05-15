---
summary: "Aplicar parches de múltiples archivos con la herramienta apply_patch"
read_when:
  - You need structured file edits across multiple files
  - You want to document or debug patch-based edits
title: "apply_patch herramienta"
---

Aplique cambios en archivos utilizando un formato de parche estructurado. Esto es ideal para ediciones de varios archivos o de varios fragmentos donde una sola llamada `edit` sería frágil.

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

- Las rutas de parche soportan rutas relativas (desde el directorio del espacio de trabajo) y rutas absolutas.
- `tools.exec.applyPatch.workspaceOnly` se predetermina en `true` (contenido en el espacio de trabajo). Establézcalo en `false` solo si intencionalmente desea que `apply_patch` escriba/elimine fuera del directorio del espacio de trabajo.
- Use `*** Move to:` dentro de un fragmento `*** Update File:` para cambiar el nombre de los archivos.
- `*** End of File` marca una inserción solo de EOF cuando sea necesario.
- Disponible de forma predeterminada para los modelos OpenAI y OpenAI Codex. Establezca `tools.exec.applyPatch.enabled: false` para desactivarlo.
- Opcionalmente restringir por modelo mediante `tools.exec.applyPatch.allowModels`.
- La configuración solo está bajo `tools.exec`.

## Ejemplo

```json
{
  "tool": "apply_patch",
  "input": "*** Begin Patch\n*** Update File: src/index.ts\n@@\n-const foo = 1\n+const foo = 2\n*** End Patch"
}
```

## Relacionado

<CardGroup cols={2}>
  <Card title="Diffs" href="/es/tools/diffs" icon="code-compare">
    Visor de diferencias de solo lectura para la presentación de cambios.
  </Card>
  <Card title="Exec tool" href="/es/tools/exec" icon="terminal">
    Ejecución de comandos de shell desde el agente.
  </Card>
  <Card title="Code execution" href="/es/tools/code-execution" icon="square-code">
    Análisis remoto de Python en espacio aislado con xAI.
  </Card>
</CardGroup>
