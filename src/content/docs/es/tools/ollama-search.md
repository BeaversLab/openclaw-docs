---
summary: "Búsqueda web de Ollama a través de tu host de Ollama configurado"
read_when:
  - You want to use Ollama for web_search
  - You want a key-free web_search provider
  - You need Ollama Web Search setup guidance
title: "Búsqueda web de Ollama"
---

# Búsqueda web de Ollama

OpenClaw admite **Búsqueda web de Ollama** como proveedor `web_search` incluido.
Utiliza la API de búsqueda web experimental de Ollama y devuelve resultados estructurados
con títulos, URL y fragmentos.

A diferencia del proveedor de modelos de Ollama, esta configuración no necesita una clave API por
defecto. Sí requiere:

- un host de Ollama accesible desde OpenClaw
- `ollama signin`

## Configuración

<Steps>
  <Step title="Iniciar Ollama">
    Asegúrate de que Ollama esté instalado y ejecutándose.
  </Step>
  <Step title="Iniciar sesión">
    Ejecuta:

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="Elegir Búsqueda web de Ollama">
    Ejecuta:

    ```bash
    openclaw configure --section web
    ```

    Luego selecciona **Búsqueda web de Ollama** como proveedor.

  </Step>
</Steps>

Si ya usas Ollama para modelos, Búsqueda web de Ollama reutiliza el mismo
host configurado.

## Config

```json5
{
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

Anulación opcional del host de Ollama:

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "http://ollama-host:11434",
      },
    },
  },
}
```

Si no se establece ninguna URL base de Ollama explícita, OpenClaw usa `http://127.0.0.1:11434`.

Si tu host de Ollama espera autenticación bearer, OpenClaw reutiliza
`models.providers.ollama.apiKey` (o la autenticación del proveedor respaldada por env correspondiente)
también para las solicitudes de búsqueda web.

## Notas

- No se requiere ningún campo de clave API específico para la búsqueda web para este proveedor.
- Si el host de Ollama está protegido por autenticación, OpenClaw reutiliza la clave API
  normal del proveedor de Ollama cuando está presente.
- OpenClaw advierte durante la configuración si Ollama es inalcanzable o no ha iniciado sesión, pero
  no bloquea la selección.
- La detección automática en tiempo de ejecución puede recurrir a Búsqueda web de Ollama cuando no hay configurado
  ningún proveedor con credenciales de mayor prioridad.
- El proveedor utiliza el endpoint experimental `/api/experimental/web_search`
  de Ollama.

## Relacionado

- [Resumen de búsqueda web](/es/tools/web) -- todos los proveedores y detección automática
- [Ollama](/es/providers/ollama) -- configuración de modelos de Ollama y modos en la nube/local
