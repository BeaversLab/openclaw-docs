---
summary: "Usa la API compatible con OpenAI de NovitaAI con OpenClaw"
read_when:
  - You want to run OpenClaw with NovitaAI models
  - You need the Novita provider id, key, or endpoint
title: "NovitaAI"
---

NovitaAI es un proveedor de infraestructura de IA alojada con una API de modelo
compatible con OpenAI. En OpenClaw es un proveedor de modelos empaquetado, por lo que el id del proveedor es
`novita`, las credenciales pasan por el flujo normal de autenticación de modelos y las referencias de modelos se ven
como `novita/deepseek/deepseek-v3-0324`.

Usa Novita cuando quieras acceso alojado a rutas de modelos de pesos abiertos y de
terceros sin ejecutar tu propio servidor de inferencia. El catálogo empaquetado se centra en
modelos de chat que son prácticos para los turnos de los agentes, incluyendo las rutas de DeepSeek, Moonshot,
MiniMax, GLM y Qwen expuestas por Novita.

Este proveedor utiliza el endpoint compatible con OpenAI de Novita. OpenClaw gestiona el registro del proveedor, la autenticación, los alias, la normalización de referencias de modelos y la selección de la URL base; Novita controla la disponibilidad de modelos en vivo, los permisos de cuenta, los precios y los límites de velocidad.

## Configuración

Cree una clave API en [novita.ai/settings/key-management](https://novita.ai/settings/key-management), luego ejecute:

```bash
openclaw onboard --auth-choice novita-api-key
```

O establezca:

```bash
export NOVITA_API_KEY="<your-novita-api-key>" # pragma: allowlist secret
```

## Valores predeterminados

- Proveedor: `novita`
- Alias: `novita-ai`, `novitaai`
- URL base: `https://api.novita.ai/openai/v1`
- Variable de entorno: `NOVITA_API_KEY`
- Modelo predeterminado: `novita/deepseek/deepseek-v3-0324`

## Cuándo elegir Novita

- Desea acceso alojado a modelos de pesos abiertos con una API compatible con OpenAI.
- Desea rutas de DeepSeek, Kimi, MiniMax, GLM o la familia Qwen a través de una
  sola cuenta de proveedor.
- Desea otra ruta alternativa alojada además de OpenRouter, GMI, DeepInfra o
  las API de proveedores directos.
- Prefiere el alojamiento de modelos del lado del proveedor en lugar de mantener la infraestructura
  de vLLM, SGLang, LM Studio o Ollama.

Elija un proveedor de proveedor directo cuando necesite parámetros de solicitud nativos del proveedor
o contratos de soporte. Elija un proveedor local cuando el modelo deba ejecutarse en su
propio hardware o detrás de su propio límite de red.

## Modelos

El catálogo incluido inicializa los ID de ruta de NovitaAI comúnmente disponibles, incluyendo:

- `novita/moonshotai/kimi-k2.5`
- `novita/minimax/minimax-m2.7`
- `novita/zai-org/glm-5`
- `novita/deepseek/deepseek-v3-0324`
- `novita/deepseek/deepseek-r1-0528`
- `novita/qwen/qwen3-235b-a22b-fp8`

El catálogo es un punto de partida para la selección de modelos en OpenClaw. Su cuenta, región o el catálogo actual de Novita pueden agregar, eliminar o restringir rutas. Verifique el proveedor desde la CLI antes de establecer un valor predeterminado duradero:

```bash
openclaw models list --provider novita
```

## Solución de problemas

- `401` o `403`: verifique la clave en la página de administración de claves de Novita y vuelva a ejecutar
  `openclaw onboard --auth-choice novita-api-key` si el perfil almacenado está
  obsoleto.
- Errores de modelo desconocidos: utilice el `novita/<route-id>` exacto devuelto por
  `openclaw models list --provider novita`.
- Rutas lentas o fallidas: pruebe otra ruta de modelo Novita o establezca Novita como proveedor de reserva para cargas de trabajo que puedan tolerar variaciones específicas del proveedor.

## Relacionado

- [Proveedores de modelos](/es/concepts/model-providers)
- [Todos los proveedores](/es/providers/index)
