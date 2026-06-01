---
title: "Arquitectura del tiempo de ejecución del agente"
summary: "Cómo OpenClaw ejecuta el tiempo de ejecución del agente integrado, proveedores, sesiones, herramientas y extensiones."
---

OpenClaw posee directamente el tiempo de ejecución del agente integrado. El código del tiempo de ejecución reside en `src/agents/`, los auxiliares de modelo/proveedor residen en `src/llm/`, y los contratos orientados a complementos se exponen a través de los barriles `openclaw/plugin-sdk/*`.

## Disposición del tiempo de ejecución

- `src/agents/embedded-agent-runner/`: bucle de intento del agente integrado, adaptadores de flujo de proveedor, compactación, selección de modelo y cableado de sesión.
- `src/agents/sessions/`: persistencia de sesión, carga de extensiones, descubrimiento de recursos, habilidades, indicaciones, temas y renderizadores de herramientas con respaldo TUI.
- `packages/agent-core/`: núcleo de agente reutilizable, tipos de arnés de nivel inferior, mensajes, auxiliares de compactación, plantillas de indicación y contratos de herramienta/sesión.
- `src/agents/runtime/`: fachada de OpenClaw para `@openclaw/agent-core` además de utilidades de proxy local.
- `src/agents/agent-tools*.ts`: definiciones de herramientas propiedad de OpenClaw, esquemas, políticas, adaptadores de enlaces antes/después y soporte de edición del host.
- `src/agents/agent-hooks/`: enlaces del tiempo de ejecución integrados como salvaguardas de compactación y poda de contexto.
- `src/llm/`: registro de modelo/proveedor, auxiliares de transporte e implementaciones de flujo específicas del proveedor.

## Límites

El código central llama al tiempo de ejecución integrado a través de módulos de OpenClaw y barriles del SDK, no a través de antiguos paquetes de agente externos. Los complementos utilizan puntos de entrada `openclaw/plugin-sdk/*` documentados y no importan elementos internos de `src/**`.

`@earendil-works/pi-tui` sigue siendo una dependencia de TUI de terceros. Se utiliza como un kit de herramientas de componentes de terminal por la TUI local y los renderizadores de sesión; internalizarlo sería un esfuerzo de distribución separado.

## Manifiestos

Los paquetes de recursos declaran los recursos de OpenClaw en los metadatos del paquete:

```json
{
  "openclaw": {
    "extensions": ["extensions/index.ts"],
    "skills": ["skills/*.md"],
    "prompts": ["prompts/*.md"],
    "themes": ["themes/*.json"]
  }
}
```

El administrador de paquetes también descubre los directorios convencionales `extensions/`, `skills/`, `prompts/` y `themes/`.

## Selección del tiempo de ejecución

El id del tiempo de ejecución (runtime) integrado predeterminado es `openclaw`. Los arneses de complementos pueden registrar ids de tiempos de ejecución adicionales. `auto` selecciona un arnés de complementos de soporte cuando existe uno y, de lo contrario, utiliza el tiempo de ejecución integrado de OpenClaw.

## Relacionado

- [Flujo de trabajo del tiempo de ejecución del agente de OpenClaw](/es/openclaw-agent-runtime)
- [Tiempos de ejecución del agente](/es/concepts/agent-runtimes)
