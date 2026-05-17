---
summary: "Tool Search: compact large PI tool catalogs behind search, describe, and call"
title: "Tool Search"
read_when:
  - You want PI agents to use a large tool catalog without adding every tool schema to the prompt
  - You want OpenClaw tools, MCP tools, and client tools exposed through one compact PI surface
  - You are implementing or debugging tool discovery for PI runs
---

Tool Search es una característica experimental del agente PI de OpenClaw. Proporciona a los agentes PI una forma compacta de descubrir y llamar a grandes catálogos de herramientas. Es útil cuando la ejecución tiene muchas herramientas disponibles, pero es probable que el modelo solo necesite unas pocas de ellas.

Esta página documenta la Búsqueda de Herramientas PI de OpenClaw. No es la superficie de búsqueda de herramientas ni de herramientas dinámicas nativa de Codex. El modo de código nativo de Codex, la búsqueda de herramientas, las herramientas dinámicas diferidas y las llamadas a herramientas anidadas son superficies de arnés estables de Codex y no dependen de `tools.toolSearch`.

Cuando está habilitado para PI, el modelo recibe una herramienta `tool_search_code` de forma predeterminada. Esa herramienta ejecuta un cuerpo breve de JavaScript en un subproceso Node aislado con un puente `openclaw.tools`:

```js
const hits = await openclaw.tools.search("create a GitHub issue");
const tool = await openclaw.tools.describe(hits[0].id);
return await openclaw.tools.call(tool.id, {
  title: "Crash on startup",
  body: "Steps to reproduce...",
});
```

El catálogo puede incluir herramientas de OpenClaw, complementos, herramientas MCP y herramientas proporcionadas por el cliente. El modelo no ve cada esquema completo por adelantado. En su lugar, busca descriptores compactos, describe una herramienta seleccionada cuando necesita el esquema exacto y llama a esa herramienta a través de OpenClaw.

Las ejecuciones del arnés Codex no reciben estos controles experimentales de Búsqueda de Herramientas de OpenClaw. OpenClaw pasa las capacidades del producto a Codex como herramientas dinámicas, y Codex posee el modo de código nativo estable, la búsqueda de herramientas nativa, las herramientas dinámicas diferidas y las llamadas a herramientas anidadas.

## Cómo se ejecuta un turno

En el momento de la planificación, el ejecutor integrado de PI construye el catálogo efectivo para la ejecución:

1. Resuelve la política de herramientas activa para el agente, el perfil, el entorno limitado y la sesión.
2. Enumera las herramientas elegibles de OpenClaw y complementos.
3. Enumera las herramientas MCP elegibles a través del tiempo de ejecución MCP de la sesión.
4. Agrega las herramientas de cliente elegibles proporcionadas para la ejecución actual.
5. Indexa descriptores compactos para la búsqueda.
6. Expone al modelo ya sea el puente de código PI o las herramientas de respaldo estructurado.

En el momento de la ejecución, cada llamada real a una herramienta regresa a OpenClaw. El tiempo de ejecución de Node aislado no contiene implementaciones de complementos, objetos de cliente MCP ni secretos. `openclaw.tools.call(...)` cruza el puente de vuelta al Gateway, donde todavía se aplican la política normal, la aprobación, los enlaces, el registro y el manejo de resultados.

## Modos

`tools.toolSearch` tiene dos modos orientados al modelo:

- `code`: expone `tool_search_code`, el puente JavaScript compacto predeterminado.
- `tools`: expone `tool_search`, `tool_describe` y `tool_call` como herramientas
  estructuradas simples para proveedores que no deben recibir código.

Ambos modos utilizan el mismo catálogo y ruta de ejecución. La única diferencia es la
forma que ve el modelo. Si el tiempo de ejecución actual no puede iniciar el proceso hijo
aislado en modo de código Node, el modo `code` predeterminado vuelve a `tools` antes
de la compactación del catálogo.

Ambos modos son experimentales. Se prefiere la exposición directa de herramientas para catálogos
de herramientas PI pequeños, y se prefieren las superficies estables nativas de Codex para ejecuciones
de harness de Codex.

No hay una configuración separada de selección de fuentes. Cuando Tool Search está habilitado,
el catálogo incluye las herramientas elegibles de OpenClaw, MCP y del cliente después del filtrado
normal de políticas.

## Por qué existe esto

Los catálogos grandes son útiles pero costosos. Enviar cada esquema de herramienta al modelo
hace que la solicitud sea más grande, ralentiza la planificación y aumenta la selección
accidental de herramientas.

Tool Search cambia la forma:

- herramientas directas: el modelo ve cada esquema seleccionado antes del primer token
- modo de código de Tool Search: el modelo ve una herramienta de código compacta y un contrato
  de API corto
- modo de herramientas de Tool Search: el modelo ve tres herramientas estructuradas
  de reserva compactas
- durante el turno: el modelo carga solo los esquemas de herramienta que realmente necesita

La exposición directa de herramientas sigue siendo el valor predeterminado correcto para catálogos pequeños.
Tool Search es mejor cuando una ejecución puede ver muchas herramientas, especialmente desde
servidores MCP o herramientas de aplicación proporcionadas por el cliente.

## API

`openclaw.tools.search(query, options?)`

Busca en el catálogo efectivo para la ejecución actual. Los resultados son compactos y seguros
para volver a colocar en el contexto del prompt.

```js
const hits = await openclaw.tools.search("calendar event", { limit: 5 });
```

`openclaw.tools.describe(id)`

Carga los metadatos completos para un resultado de búsqueda, incluido el esquema de entrada exacto.

```js
const calendarCreate = await openclaw.tools.describe("mcp:calendar:create_event");
```

`openclaw.tools.call(id, args)`

Llama a una herramienta seleccionada a través de OpenClaw.

```js
await openclaw.tools.call(calendarCreate.id, {
  summary: "Planning",
  start: "2026-05-09T14:00:00Z",
});
```

El modo de reserva estructurado expone las mismas operaciones que herramientas:

- `tool_search`
- `tool_describe`
- `tool_call`

## Límite de tiempo de ejecución

El puente de código se ejecuta en un subproceso de Node de corta duración. El subproceso se inicia con el modo de permisos de Node habilitado, un entorno vacío, sin concesiones de sistema de archivos o red, y sin concesiones de procesos secundarios o trabajadores. OpenClaw impone un tiempo de espera de reloj del proceso principal y termina el subproceso cuando se agota el tiempo, incluso después de las continuaciones asíncronas.

El tiempo de ejecución expone solo:

- `console.log`, `console.warn` y `console.error`
- `openclaw.tools.search`
- `openclaw.tools.describe`
- `openclaw.tools.call`

El comportamiento normal de OpenClaw todavía se aplica a las llamadas finales:

- políticas de permiso y denegación de herramientas
- restricciones de herramientas por agente y por espacio aislado
- control de acceso exclusivo para el propietario
- ganchos de aprobación
- ganchos de complemento `before_tool_call`
- identidad de sesión, registros y telemetría

## Configuración

Habilite Tool Search para ejecuciones de PI con el puente de código predeterminado:

```bash
openclaw config set tools.toolSearch true
```

JSON equivalente:

```json5
{
  tools: {
    toolSearch: true,
  },
}
```

Use las herramientas de respaldo estructuradas en su lugar para ejecuciones de PI:

```json5
{
  tools: {
    toolSearch: {
      mode: "tools",
    },
  },
}
```

Ajuste el tiempo de espera del modo de código y los límites de resultados de búsqueda:

```json5
{
  tools: {
    toolSearch: {
      mode: "code",
      codeTimeoutMs: 10000,
      searchDefaultLimit: 8,
      maxSearchLimit: 20,
    },
  },
}
```

Deshabilitarlo:

```json5
{
  tools: {
    toolSearch: false,
  },
}
```

## Prompt y telemetría

Tool Search registra suficiente telemetría para compararla con la exposición directa de herramientas:

- bytes totales de herramientas y prompt serializados enviados al arnés
- tamaño del catálogo y desglose de fuentes
- recuentos de búsqueda, descripción y llamadas
- llamadas finales de herramientas ejecutadas a través de OpenClaw
- ids y fuentes de herramientas seleccionadas

Los registros de sesión deben permitir responder:

- cuántos esquemas de herramientas vio el modelo desde el principio
- cuántas operaciones de búsqueda y descripción realizó
- qué herramienta final se llamó
- si el resultado provino de OpenClaw, MCP o una herramienta de cliente

## Validación de extremo a extremo

El ejecutor E2E de la puerta de enlace demuestra ambas rutas con el arnés PI:

```bash
node --import tsx scripts/tool-search-gateway-e2e.ts
```

Crea un complemento falso temporal con un catálogo de herramientas grande, inicia el proveedor simulado de OpenAI, inicia una Gateway una vez en modo directo y una vez con Tool Search habilitado, y luego compara las cargas útiles de solicitud del proveedor y los registros de sesión.

La regresión demuestra:

1. El modo directo puede llamar a la herramienta del complemento falso.
2. Tool Search puede llamar a la misma herramienta del complemento falso.
3. El modo directo expone directamente los esquemas de herramientas del complemento falso al proveedor.
4. Tool Search expone solo el puente compacto.
5. La carga útil de solicitud de Tool Search es más pequeña para el catálogo falso grande.
6. Los registros de sesión muestran los recuentos esperados de llamadas a herramientas y la telemetría de llamadas puenteadas.

## Comportamiento ante fallos

La búsqueda de herramientas debe fallar de forma cerrada:

- si una herramienta no está en la política efectiva, la búsqueda no debe devolverla
- si una herramienta seleccionada no está disponible, `tool_call` debería fallar
- si la política o la aprobación bloquean la ejecución, el resultado de la llamada debería informar de ese bloqueo en lugar de omitirlo
- si el puente de código no puede crear un tiempo de ejecución aislado, use `mode: "tools"` o
  deshabilite la Búsqueda de herramientas para esa implementación

## Relacionado

- [Herramientas y complementos](/es/tools)
- [Espacio aislado y herramientas de multiagente](/es/tools/multi-agent-sandbox-tools)
- [Herramienta Exec](/es/tools/exec)
- [Configuración de agentes ACP](/es/tools/acp-agents-setup)
- [Creación de complementos](/es/plugins/building-plugins)
