---
summary: "Añade comprobaciones de doctor respaldadas por políticas para la conformidad del espacio de trabajo."
read_when:
  - You are installing, configuring, or auditing the policy plugin
title: "Complemento de política"
---

# Complemento de política

Añade comprobaciones de doctor respaldadas por políticas para la conformidad del espacio de trabajo.

## Distribución

- Paquete: `@openclaw/policy`
- Ruta de instalación: incluido en OpenClaw

## Superficie

complemento

{/* openclaw-plugin-reference:manual-start */}

## Comportamiento

El complemento Policy contribuye con comprobaciones de salud del doctor para la configuración de OpenClaw administrada por políticas y las declaraciones del espacio de trabajo gobernado. Actualmente, la política cubre la conformidad del canal, los metadatos de herramientas gobernadas, la postura del servidor MCP, la postura del proveedor de modelos, la postura de acceso a la red privada, la postura de exposición de Gateway, la postura del espacio de trabajo/herramientas del agente, la postura de herramientas configuradas globalmente/por agente, la postura del entorno de ejecución de sandbox configurado, la postura de acceso de ingreso/canal y la postura del proveedor de secretos/perfil de autenticación de la configuración de OpenClaw.

Policy almacena los requisitos creados en `policy.jsonc`, observa la configuración existente de OpenClaw y las declaraciones del espacio de trabajo como evidencia, e informa las desviaciones a través de `openclaw policy check` y `openclaw doctor --lint`. Una verificación de política limpia emite hashes de política, evidencia, hallazgos y certificaciones que los operadores pueden registrar para la auditoría.

`openclaw policy compare --baseline <file>` compara un archivo de política con otro archivo de política. Es solo conformidad a nivel de configuración: utiliza los metadatos de las reglas de política para verificar que la política verificada no falte o sea más débil que la línea base creada, y no inspecciona el estado de tiempo de ejecución, las credenciales ni los valores secretos.

Las reglas de postura de herramientas pueden requerir perfiles aprobados, herramientas de sistema de archivos exclusivas del espacio de trabajo, configuraciones limitadas de seguridad/consulta/host de ejecución, modo elevado deshabilitado, entradas `alsoAllow` exactas y entradas de denegación de herramientas requeridas. La evidencia registra entradas `alsoAllow` aditivas porque pueden ampliar la postura efectiva de la herramienta. Estas comprobaciones observan solo la conformidad de la configuración; no leen el estado de aprobación en tiempo de ejecución ni añaden cumplimiento en tiempo de ejecución.

Las reglas de postura de Sandbox pueden requerir modos/backends de sandbox aprobados, denegar la contenedorización de la red del host, denegar las uniones de espacios de nombres del contenedor, requerir montajes de contenedor de solo lectura, denegar montajes de sockets de tiempo de ejecución del contenedor y perfiles de contenedor sin restricciones, y requerir rangos de origen CDP del navegador de sandbox.
Estas comprobaciones observan solo la conformidad de la configuración; no leen el estado de aprobación en tiempo de ejecución, inspeccionan contenedores en vivo ni añaden cumplimiento en tiempo de ejecución.

Los ámbitos de política con nombre bajo `scopes.<scopeName>` pueden añadir secciones de política normal más estrictas para el selector que listan. `agentIds` admite `tools`, `agents.workspace` y `sandbox`; `channelIds` admite `ingress.channels`. Los IDs de agente de tiempo de ejecución que no están listados explícitamente en `agents.list[]` se comprueban contra la postura global/predeterminada heredada en lugar de pasar silenciosamente sin evidencia. Cada ámbito presente en `policy.jsonc` debe ser válido y exigible para su selector. Las reglas de superposición son afirmaciones adicionales, por lo que no debilitan la política de nivel superior y pueden producir sus propios hallazgos cuando la misma configuración observada viola ambos ámbitos.

{/* openclaw-plugin-reference:manual-end */}

## Documentos relacionados

- [policy](/es/cli/policy)
