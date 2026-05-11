---
summary: "Búsqueda web de Ollama a través de un host local de Ollama o la API alojada de Ollama"
read_when:
  - You want to use Ollama for web_search
  - You want a key-free web_search provider
  - You want to use hosted Ollama Web Search with OLLAMA_API_KEY
  - You need Ollama Web Search setup guidance
title: "Búsqueda web de Ollama"
---

OpenClaw admite **Búsqueda Web de Ollama** como proveedor `web_search` incluido. Utiliza
la API de búsqueda web de Ollama y devuelve resultados estructurados con títulos, URLs
y fragmentos.

Para Ollama local o autoalojado, esta configuración no necesita una clave de API por
defecto. Sí requiere:

- un host de Ollama que sea accesible desde OpenClaw
- `ollama signin`

Para la búsqueda alojada directa, configure la URL base del proveedor Ollama en `https://ollama.com`
y proporcione una `OLLAMA_API_KEY` real.

## Configuración

<Steps>
  <Step title="Iniciar Ollama">
    Asegúrese de que Ollama esté instalado y ejecutándose.
  </Step>
  <Step title="Iniciar sesión">
    Ejecute:

    ```bash
    ollama signin
    ```

  </Step>
  <Step title="Elegir Búsqueda Web de Ollama">
    Ejecute:

    ```bash
    openclaw configure --section web
    ```

    Luego seleccione **Búsqueda Web de Ollama** como proveedor.

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
  plugins: {
    entries: {
      ollama: {
        config: {
          webSearch: {
            baseUrl: "http://ollama-host:11434",
          },
        },
      },
    },
  },
}
```

Si ya configura Ollama como proveedor de modelos, el proveedor de búsqueda web puede
reutilizar ese host:

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

El proveedor de modelos Ollama usa `baseUrl` como clave canónica. El proveedor de búsqueda web también respeta `baseURL` en `models.providers.ollama` para compatibilidad con ejemplos de configuración estilo SDK de OpenAI.

Si no se establece ninguna URL base de Ollama explícita, OpenClaw usa `http://127.0.0.1:11434`.

Si su host de Ollama espera autenticación de portador (bearer auth), OpenClaw reutiliza
`models.providers.ollama.apiKey` (o la autenticación del proveedor respaldada por variables de entorno correspondiente)
para las solicitudes a ese host configurado.

Búsqueda Web de Ollama alojada directa:

```json5
{
  models: {
    providers: {
      ollama: {
        baseUrl: "https://ollama.com",
        apiKey: "OLLAMA_API_KEY",
      },
    },
  },
  tools: {
    web: {
      search: {
        provider: "ollama",
      },
    },
  },
}
```

## Notas

- No se requiere ningún campo de clave de API específico para la búsqueda web para este proveedor.
- Si el host de Ollama está protegido por autenticación, OpenClaw reutiliza la clave de API normal del
  proveedor de Ollama cuando está presente.
- Si `baseUrl` es `https://ollama.com`, OpenClaw llama a
  `https://ollama.com/api/web_search` directamente y envía la clave de API de Ollama
  configurada como autenticación de portador.
- Si el host configurado no expone la búsqueda web y `OLLAMA_API_KEY` está configurado,
  OpenClaw puede recurrir a `https://ollama.com/api/web_search` sin enviar
  esa clave de entorno al host local.
- OpenClaw advierte durante la configuración si Ollama es inalcanzable o no ha iniciado sesión, pero
  no bloquea la selección.
- La autodetección en tiempo de ejecución puede recurrir a Ollama Web Search cuando no se ha configurado
  ningún proveedor con credenciales de mayor prioridad.
- Los hosts del demonio local de Ollama utilizan el endpoint del proxy local
  `/api/experimental/web_search`, que firma y reenvía a Ollama Cloud.
- Los hosts `https://ollama.com` utilizan el endpoint público hospedado
  `/api/web_search` directamente con autenticación de clave API de tipo bearer.

## Relacionado

- [Resumen de búsqueda web](/es/tools/web) -- todos los proveedores y autodetección
- [Ollama](/es/providers/ollama) -- configuración de modelos Ollama y modos en la nube/local
