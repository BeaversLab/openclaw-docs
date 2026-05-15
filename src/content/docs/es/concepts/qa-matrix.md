---
summary: "Referencia para el mantenedor del carril QA de Matrix en vivo con soporte Docker: CLI, perfiles, variables de entorno, escenarios y artefactos de salida."
read_when:
  - Running pnpm openclaw qa matrix locally
  - Adding or selecting Matrix QA scenarios
  - Triaging Matrix QA failures, timeouts, or stuck cleanup
title: "Matrix QA"
---

El carril Matrix QA ejecuta el complemento `@openclaw/matrix` incluido contra un homeserver Tuwunel desechable en Docker, con cuentas temporales de controlador, SUT y observador más habitaciones sembradas. Es la cobertura de transporte real en vivo para Matrix.

Esta es una herramienta exclusiva para los mantenedores. Las versiones empaquetadas de OpenClaw omiten intencionalmente `qa-lab`, por lo que `openclaw qa` solo está disponible desde una verificación del código fuente. Las verificaciones del código fuente cargan el ejecutor (runner) incluido directamente; no se necesita ningún paso de instalación del complemento.

Para obtener más contexto sobre el marco de trabajo de QA, consulte [Resumen de QA](/es/concepts/qa-e2e-automation).

## Inicio rápido

```bash
pnpm openclaw qa matrix --profile fast --fail-fast
```

`pnpm openclaw qa matrix` plano ejecuta `--profile all` y no se detiene en el primer fallo. Use `--profile fast --fail-fast` para una puerta de lanzamiento; fragmente el catálogo con `--profile transport|media|e2ee-smoke|e2ee-deep|e2ee-cli` cuando ejecute el inventario completo en paralelo.

## Lo que hace el carril

1. Aprovisiona un homeserver Tuwunel desechable en Docker (imagen predeterminada `ghcr.io/matrix-construct/tuwunel:v1.5.1`, nombre del servidor `matrix-qa.test`, puerto `28008`).
2. Registra tres usuarios temporales: `driver` (envía tráfico entrante), `sut` (la cuenta de Matrix de OpenClaw bajo prueba), `observer` (captura de tráfico de terceros).
3. Siembra las habitaciones requeridas por los escenarios seleccionados (principal, hilos, medios, reinicio, secundario, lista de permitidos, E2EE, verificación DM, etc.).
4. Inicia una puerta de enlace secundaria de OpenClaw con el complemento Matrix real limitado a la cuenta SUT; `qa-channel` no se carga en el secundario.
5. Ejecuta escenarios en secuencia, observando eventos a través de los clientes Matrix de controlador/observador.
6. Derriba el homeserver, escribe artefactos de informe y resumen, y luego sale.

## CLI

```text
pnpm openclaw qa matrix [options]
```

### Indicadores comunes

| Indicador             | Predeterminado                                | Descripción                                                                                                                                            |
| --------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `--profile <profile>` | `all`                                         | Perfil de escenario. Consulte [Perfiles](#profiles).                                                                                                   |
| `--fail-fast`         | desactivado                                   | Deténgase después del primer cheque o escenario fallido.                                                                                               |
| `--scenario <id>`     | -                                             | Ejecutar solo este escenario. Repetible. Consulte [Escenarios](#scenarios).                                                                            |
| `--output-dir <path>` | `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` | Donde se escriben los informes, el resumen, los eventos observados y el registro de salida. Las rutas relativas se resuelven respecto a `--repo-root`. |
| `--repo-root <path>`  | `process.cwd()`                               | Raíz del repositorio al invocar desde un directorio de trabajo neutro.                                                                                 |
| `--sut-account <id>`  | `sut`                                         | ID de cuenta de Matrix dentro de la configuración del gateway de QA.                                                                                   |

### Opciones del proveedor

El carril utiliza un transporte Matrix real, pero el proveedor del modelo es configurable:

| Opción                   | Predeterminado               | Descripción                                                                                                                                                       |
| ------------------------ | ---------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `--provider-mode <mode>` | `live-frontier`              | `mock-openai` para el despacho simulado determinista o `live-frontier` para proveedores en vivo en la frontera. El alias heredado `live-openai` todavía funciona. |
| `--model <ref>`          | predeterminado del proveedor | Ref. `provider/model` principal.                                                                                                                                  |
| `--alt-model <ref>`      | predeterminado del proveedor | Ref. `provider/model` alternativa donde los escenarios cambian a mitad de la ejecución.                                                                           |
| `--fast`                 | desactivado                  | Active el modo rápido del proveedor cuando sea compatible.                                                                                                        |

Matrix QA no acepta `--credential-source` ni `--credential-role`. El carril aprovisiona usuarios desechables localmente; no hay un grupo compartido de credenciales contra el cual alquilar.

## Perfiles

El perfil seleccionado decide qué escenarios se ejecutan.

| Perfil                 | Úselo para                                                                                                                                                                                                                                                                                                         |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `all` (predeterminado) | Catálogo completo. Lento pero exhaustivo.                                                                                                                                                                                                                                                                          |
| `fast`                 | Subconjunto de puerta de lanzamiento que ejercita el contrato de transporte en vivo: canary, filtrado de menciones, bloqueo de lista blanca, forma de respuesta, reanudación de reinicio, seguimiento de hilos, aislamiento de hilos, observación de reacciones y entrega de metadatos de aprobación de ejecución. |
| `transport`            | Escenarios de hilos, MD, sala, unión automática, mención/lista blanca, aprobación y reacción a nivel de transporte.                                                                                                                                                                                                |
| `media`                | Cobertura de archivos adjuntos de imagen, audio, video, PDF, EPUB.                                                                                                                                                                                                                                                 |
| `e2ee-smoke`           | Cobertura E2EE mínima: respuesta cifrada básica, seguimiento de hilos, éxito de arranque.                                                                                                                                                                                                                          |
| `e2ee-deep`            | Escenarios exhaustivos de pérdida de estado, respaldo, clave y recuperación E2EE.                                                                                                                                                                                                                                  |
| `e2ee-cli`             | Escenarios de la CLI `openclaw matrix encryption setup` y `verify *` impulsados a través del arnés de QA.                                                                                                                                                                                                          |

La asignación exacta se encuentra en `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts`.

## Escenarios

La lista completa de identificadores de escenarios es la unión `MatrixQaScenarioId` en `extensions/qa-matrix/src/runners/contract/scenario-catalog.ts:15`. Las categorías incluyen:

- hilos - `matrix-thread-*`, `matrix-subagent-thread-spawn`
- nivel superior / MD / sala - `matrix-top-level-reply-shape`, `matrix-room-*`, `matrix-dm-*`
- transmisión y progreso de herramientas - `matrix-room-partial-streaming-preview`, `matrix-room-quiet-streaming-preview`, `matrix-room-tool-progress-*`, `matrix-room-block-streaming`
- medios - `matrix-media-type-coverage`, `matrix-room-image-understanding-attachment`, `matrix-attachment-only-ignored`, `matrix-unsupported-media-safe`
- enrutamiento - `matrix-room-autojoin-invite`, `matrix-secondary-room-*`
- reacciones - `matrix-reaction-*`
- aprobaciones - `matrix-approval-*` (metadatos de ejecución/complemento, reserva fragmentada, reacciones de denegación, hilos y enrutamiento `target: "both"`)
- reinicio y repetición - `matrix-restart-*`, `matrix-stale-sync-replay-dedupe`, `matrix-room-membership-loss`, `matrix-homeserver-restart-resume`, `matrix-initial-catchup-then-incremental`
- mención de gating, bot-a-bot y listas de permitidos - `matrix-mention-*`, `matrix-allowbots-*`, `matrix-allowlist-*`, `matrix-multi-actor-ordering`, `matrix-inbound-edit-*`, `matrix-mxid-prefixed-command-block`, `matrix-observer-allowlist-override`
- E2EE - `matrix-e2ee-*` (respuesta básica, seguimiento de hilo, arranque inicial, ciclo de vida de la clave de recuperación, variantes de pérdida de estado, comportamiento de copia de seguridad del servidor, higiene del dispositivo, verificación SAS / QR / DM, reinicio, redacción de artefactos)
- E2EE CLI - `matrix-e2ee-cli-*` (configuración de cifrado, configuración idempotente, fallo de arranque, ciclo de vida de la clave de recuperación, multicuenta, viaje de ida y vuelta de respuesta de puerta de enlace, autoverificación)

Pase `--scenario <id>` (repetible) para ejecutar un conjunto seleccionado a mano; combine con `--profile all` para ignorar el gating del perfil.

## Variables de entorno

| Variable                                | Predeterminado                            | Efecto                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENCLAW_QA_MATRIX_TIMEOUT_MS`         | `1800000` (30 min)                        | Límite superior duro para toda la ejecución.                                                                                                                                                                                                                            |
| `OPENCLAW_QA_MATRIX_CANARY_TIMEOUT_MS`  | `45000`                                   | Límite para la respuesta canary inicial. El CI de versionamiento aumenta esto en ejecutores compartidos para que un primer giro lento de la puerta de enlace no falle antes de que comience la cobertura de escenarios.                                                 |
| `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` | `8000`                                    | Ventana de silencio para afirmaciones negativas de sin respuesta. Limitada a `≤` el tiempo de espera de ejecución.                                                                                                                                                      |
| `OPENCLAW_QA_MATRIX_CLEANUP_TIMEOUT_MS` | `90000`                                   | Límite para el desmontaje de Docker. Las superficies de fallo incluyen el comando de recuperación `docker compose ... down --remove-orphans`.                                                                                                                           |
| `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE`      | `ghcr.io/matrix-construct/tuwunel:v1.5.1` | Anule la imagen del servidor doméstico al validar contra una versión diferente de Tuwunel.                                                                                                                                                                              |
| `OPENCLAW_QA_MATRIX_PROGRESS`           | activado                                  | `0` silencia las líneas de progreso `[matrix-qa] ...` en stderr. `1` las fuerza.                                                                                                                                                                                        |
| `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT`    | redactado                                 | `1` mantiene el cuerpo del mensaje y `formatted_body` en `matrix-qa-observed-events.json`. De forma predeterminada, se redacta para mantener los artefactos del CI a salvo.                                                                                             |
| `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT` | desactivado                               | `1` omite el `process.exit` determinista después de escribir el artefacto. El valor predeterminado fuerza la salida porque los identificadores de cifrado nativos de matrix-js-sdk pueden mantener el bucle de eventos activo después de la finalización del artefacto. |
| `OPENCLAW_RUN_NODE_OUTPUT_LOG`          | unset                                     | Cuando lo establece un lanzador externo (por ejemplo, `scripts/run-node.mjs`), Matrix QA reutiliza esa ruta de registro en lugar de iniciar su propio tee.                                                                                                              |

## Artefactos de salida

Escrito en `--output-dir`:

- `matrix-qa-report.md` - Informe de protocolo en Markdown (qué pasó, falló, se omitió y por qué).
- `matrix-qa-summary.json` - Resumen estructurado adecuado para el análisis de CI y los cuadros de mando.
- `matrix-qa-observed-events.json` - Eventos de Matrix observados desde los clientes controlador y observador. Los cuerpos se redactan a menos que `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1`; los metadatos de aprobación se resumen con campos seguros seleccionados y una vista previa del comando truncada.
- `matrix-qa-output.log` - Stdout/stderr combinado de la ejecución. Si se establece `OPENCLAW_RUN_NODE_OUTPUT_LOG`, se reutiliza el registro del lanzador externo en su lugar.

El directorio de salida predeterminado es `<repo>/.artifacts/qa-e2e/matrix-<timestamp>` para que las ejecuciones sucesivas no se sobrescriban entre sí.

## Consejos de triaje

- **La ejecución se cuelga al final:** los identificadores de cifrado nativos de `matrix-js-sdk` pueden sobrevivir al arnés. El valor predeterminado fuerza un `process.exit` limpio después de escribir el artefacto; si ha desactivado `OPENCLAW_QA_MATRIX_DISABLE_FORCE_EXIT=1`, espere que el proceso permanezca activo.
- **Error de limpieza:** busque el comando de recuperación impreso (una invocación de `docker compose ... down --remove-orphans`) y ejecútelo manualmente para liberar el puerto del servidor doméstico.
- **Ventanas de afirmación negativa inestables en CI:** reduzca `OPENCLAW_QA_MATRIX_NO_REPLY_WINDOW_MS` (predeterminado 8 s) cuando el CI sea rápido; aumentelo en ejecutores compartidos lentos.
- **Necesita cuerpos redactados para un informe de error:** vuelva a ejecutar con `OPENCLAW_QA_MATRIX_CAPTURE_CONTENT=1` y adjunte `matrix-qa-observed-events.json`. Trate el artefacto resultante como confidencial.
- **Versión diferente de Tuwunel:** apunte `OPENCLAW_QA_MATRIX_TUWUNEL_IMAGE` a la versión en prueba. El carril solo confirma la imagen predeterminada fijada.

## Contrato de transporte en vivo

Matrix es uno de los tres carriles de transporte en vivo (Matrix, Telegram, Discord) que comparten una única lista de verificación de contratos definida en [QA overview → Live transport coverage](/es/concepts/qa-e2e-automation#live-transport-coverage). `qa-channel` sigue siendo la suite sintética amplia y intencionalmente no forma parte de esa matriz.

## Relacionado

- [QA overview](/es/concepts/qa-e2e-automation) - pila de QA general y contrato de transporte en vivo
- [QA Channel](/es/channels/qa-channel) - adaptador de canal sintético para escenarios respaldados por repositorio
- [Testing](/es/help/testing) - ejecución de pruebas y adición de cobertura QA
- [Matrix](/es/channels/matrix) - el complemento del canal bajo prueba
