---
summary: "Resumen visual y evidencia técnica para la limpieza de rendimiento, tamaño de paquete, dependencias y shrinkwrap de mayo de 2026"
read_when:
  - You are validating the May 2026 performance and package-size cleanup
  - You need the numbers behind the OpenClaw performance and dependency blog post
  - You are changing release gates, package shrinkwrap, or plugin dependency boundaries
title: "Barrido de rendimiento de lanzamiento"
---

Esta página captura las evidencias detrás de la limpieza de rendimiento, tamaño de paquete, dependencias y shrinkwrap de OpenClaw de mayo de 2026. Es el acompañamiento técnico de la publicación del blog público.

Aquí se combinan dos auditorías:

- **Barrido de rendimiento de lanzamiento:** Lanzamientos de GitHub desde `v2026.5.27` hacia atrás
  hasta la versión estable `v2026.4.23`, utilizando el flujo de trabajo
  `OpenClaw Performance`,
  `profile=smoke`, `repeat=1`, carril de proveedor simulado (mock-provider).
- **Contexto de principios de abril:** se publicaron `clawgrit-reports` líneas base
  del proveedor simulado (mock-provider) desde `v2026.4.1` hasta `v2026.5.2`, utilizadas solo para evitar tratar
  los lanzamientos rotos de finales de abril como la línea base de rendimiento público.
- **Barrido de huella de instalación:** instalaciones `npm install --ignore-scripts` nuevas
  en paquetes temporales, con `du -sk node_modules` para el tamaño y un
  recorrido `node_modules` para los conteos de instancias de paquetes.
- **Barrido de tamaño de paquete npm:** `npm pack openclaw@<version> --dry-run --json`
  para lanzamientos publicados, registrando el tamaño del archivo tar comprimido, el tamaño descomprimido y
  el conteo de archivos.

<Warning>El barrido de rendimiento principal utiliza una muestra de humo por etiqueta. El contexto de principios de abril utiliza medianas publicadas de repetición-3 de `clawgrit-reports`. Trate los números como evidencia de tendencias y señal de búsqueda de regresiones, no como estadísticas de puertas de lanzamiento.</Warning>

## Instantánea

Cobertura de rendimiento: **76 lanzamientos solicitados**, **73 puntos con respaldo de artefactos**,
y **3 ejecuciones de CI no disponibles**. Último punto estable medido: `v2026.5.27`.

<CardGroup cols={2}>
  <Card title="Turno de agente estable" icon="indicador">
    **2.9x más rápido en frío**

    - `v2026.4.14`: 9.8s
    - `v2026.5.27`: 3.4s

  </Card>
  <Card title="Paquete publicado" icon="package">
    **Archivo tar de 17.8MB**

    Último paquete estable, una reducción respecto al pico de tamaño de paquete de 43.3MB en marzo.

  </Card>
  <Card title="Última instalación estable" icon="hard-drive">
    **Instalación nueva de 786.9MB**

    `v2026.5.27` todavía contiene el árbol de dependencias anidado de OpenClaw. El estado de próxima versión en `main` es de 407.4MB.

  </Card>
  <Card title="Gráfico de dependencias" icon="boxes">
    **371 paquetes instalados**

    Última versión estable. El `main` actual se ha reducido a 314 tras la limpieza de dependencias posterior.

  </Card>
</CardGroup>

## Cronología de la huella de instalación

<CardGroup cols={2}>
  <Card title="Máximo mensual" icon="triangle-alert">
    **645 dependencias**

    `2026.2.26` fue el máximo mensual de conteo de dependencias en esta muestra.

  </Card>
  <Card title="Introducción de shrinkwrap" icon="lock">
    **Instalación de 1,020.6MB**

    `2026.5.22` añadió shrinkwrap raíz y expuso un problema de forma de paquete:
    911.8MB se ubicaron bajo `openclaw/node_modules` anidado.

  </Card>
  <Card title="Última estable" icon="tag">
    **Instalación de 786.9MB**

    `2026.5.27` redujo el pico pero todavía instaló un árbol anidado de
    OpenClaw de 675.9MB.

  </Card>
  <Card title="Estado de próxima versión" icon="scissors">
    **Instalación de 407.4MB**

    El `main` actual mantiene el shrinkwrap, elimina el árbol anidado e instala
    314 paquetes.

  </Card>
</CardGroup>

<Tip>Shrinkwrap no era el problema por sí mismo. La mala forma del paquete lo era. El `main` actual todavía envía shrinkwrap, pero npm ya no materializa un segundo árbol de dependencias de OpenClaw durante la instalación.</Tip>

## Qué cambió después del 5.27

La limpieza entre `v2026.5.27` y el `main` actual eliminó el gráfico de instalación predeterminado duplicado en lugar de eliminar las capacidades mismas.

<CardGroup cols={2}>
  <Card title="Gráfico predeterminado raíz" icon="git-branch">
    Las rutas de paquetes shrinkwrap raíz cayeron de **372** a **331**. Los nombres de paquetes únicos cayeron de **357** a **318**.
  </Card>
  <Card title="Dependencias raíz directas" icon="unplug">
    `@earendil-works/pi-agent-core`, `@earendil-works/pi-ai`, `@earendil-works/pi-coding-agent` y `pdfjs-dist` dejaron la ruta de dependencia raíz predeterminada.
  </Card>
  <Card title="Conos opcionales nativos" icon="cpu">
    Los conos de paquetes nativos `@napi-rs/canvas` y `@mariozechner/clipboard` para todas las plataformas dejaron de aterrizar en la instalación predeterminada.
  </Card>
  <Card title="Superficie de la cadena de suministro" icon="shield">
    Menos paquetes predeterminados significa menos tarballs, mantenedores, binarios nativos, comportamientos de tiempo de instalación y rutas de actualización transitivas en las que confiar de forma predeterminada.
  </Card>
</CardGroup>

## Números destacados

No use las filas rotas de finales de abril como líneas base de rendimiento público.
`v2026.4.23` y `v2026.4.29` son evidencia útil de regresión, pero los grandes deltas estilo `14x` describen mayormente la recuperación de una línea de publicación defectuosa.

Para la narrativa del blog, use la línea base publicada a principios de abril como escala:

| Métrica                     | Línea base de principios de abril | `v2026.5.27` |                        Delta |
| --------------------------- | --------------------------------: | -----------: | ---------------------------: |
| Turno de agente en frío     |                           9,819ms |      3,378ms | 65.6% menor, 2.9x más rápido |
| Turno de agente en caliente |                           7,458ms |      2,973ms | 60.1% menor, 2.5x más rápido |
| Pico RSS del agente         |                           686.2MB |      635.5MB |                   7.4% menor |

La línea base de abril anterior es `v2026.4.14` de la ejecución
mock-provider publicada `clawgrit-reports`. Esa ejecución usó repeat 3 y falló solo
porque no se emitió la línea de tiempo de diagnóstico; las medianas de cold, warm y RSS
siguen siendo útiles como escala aproximada. Trate esto como contexto narrativo, no una
estadística de release-gate.

Dentro del barrido estable de mayo de una sola muestra, la línea se movió de manera más modesta:

| Métrica                      | `v2026.5.2` | `v2026.5.27` |       Delta |
| ---------------------------- | ----------: | -----------: | ----------: |
| Turno del agente en frío     |     3,897ms |      3,378ms | 13.3% menor |
| Turno del agente en caliente |     3,610ms |      2,973ms | 17.6% menor |
| Pico RSS del agente          |     613.7MB |      635.5MB |  3.6% mayor |

Mejor punto de prerelease en el barrido de una sola muestra:

| Métrica                                 | `v2026.5.27` | `v2026.5.27-beta.1` |       Delta |
| --------------------------------------- | -----------: | ------------------: | ----------: |
| Turno del agente en frío                |      3,378ms |             2,575ms | 23.8% menor |
| Tiempo de vuelta del agente en caliente |      2,973ms |             2,217ms | 25.4% menor |
| Pico de RSS del agente                  |      635.5MB |             635.3MB |       plano |

### Huella de instalación

| Métrica                                                       | Línea base | Main actual |       Delta |
| ------------------------------------------------------------- | ---------: | ----------: | ----------: |
| Tamaño de instalación desde el pico `2026.5.22`               |  1,020.6MB |     407.4MB | 60.1% menor |
| Tamaño de instalación desde el último lanzamiento `2026.5.27` |    786.9MB |     407.4MB | 48.2% menor |
| Dependencias desde el máximo mensual `2026.2.26`              |        645 |         314 | 51.3% menor |
| Dependencias desde el último lanzamiento `2026.5.27`          |        371 |         314 | 15.4% menor |
| `openclaw/node_modules` anidado desde `2026.5.22`             |    911.8MB |         0MB |   eliminado |
| `openclaw/node_modules` anidado desde `2026.5.27`             |    675.9MB |         0MB |   eliminado |

### Tamaño del paquete npm

| Versión     | Archivocomprimido | Paquete desempaquetado | Archivos | Notas                                        |
| ----------- | ----------------: | ---------------------: | -------: | -------------------------------------------- |
| `2026.1.30` |            12.8MB |                 33.5MB |    4,607 | paquete renombrado temprano                  |
| `2026.2.26` |           23,6 MB |                82,9 MB |   10 125 | crecimiento de características               |
| `2026.3.31` |           43,3 MB |               182,6 MB |   21 037 | punto más alto del tamaño del paquete        |
| `2026.4.29` |           22,9 MB |                74,6 MB |    9 309 | poda de paquetes visible                     |
| `2026.5.12` |           23,4 MB |                80,1 MB |   12 035 | división importante de complementos externos |
| `2026.5.22` |           17,2 MB |                76,9 MB |   12 386 | docs/assets excluidos del paquete            |
| `2026.5.27` |           17,8 MB |                79,0 MB |   12 509 | último paquete estable                       |

`2026.5.12` es el hito visible de extracción de complementos en el registro de cambios:
Amazon Bedrock, Bedrock Mantle, Slack, OpenShell sandbox, Anthropic Vertex,
Matrix y WhatsApp se movieron fuera de la ruta de dependencia central, por lo que sus conos
de dependencia se instalan con esos complementos en lugar de en cada instalación central.

## Resumen de turnos del agente Kova

La línea estable de abril contiene dos historias diferentes. Comienzos de abril fueron lentos
pero reconocibles. Finales de abril se convirtieron en un acantilado de regresión. `v2026.5.2` es donde
el carril del proveedor simulado (mock-provider) por primera vez cae en el rango de 3-5s y empieza a pasar
consistentemente en el barrido suministrado.

Contexto publicado anteriormente:

| Lanzamiento  | Kova  | Giro en frío | Giro en caliente | Pico RSS del agente |
| ------------ | ----- | -----------: | ---------------: | ------------------: |
| `v2026.4.10` | FALLO |     11,031ms |          7,962ms |             679.0MB |
| `v2026.4.12` | FALLO |     11,965ms |          8,289ms |             713.5MB |
| `v2026.4.14` | FALLO |      9,819ms |          7,458ms |             686.2MB |
| `v2026.4.20` | FALLO |     22,314ms |         18,811ms |             810.8MB |
| `v2026.4.22` | FALLO |      9,630ms |          7,459ms |             743.0MB |

Barrido de una sola muestra suministrado:

| Lanzamiento         | Kova     | Giro en frío | Giro en caliente | Pico RSS del agente |
| ------------------- | -------- | -----------: | ---------------: | ------------------: |
| `v2026.4.23`        | FALLO    |     47,847ms |          8,010ms |           1,082.7MB |
| `v2026.4.24`        | FALLO    |     48,264ms |         25,483ms |             996.0MB |
| `v2026.4.25`        | FALLO    |     81,080ms |         59,172ms |           1,113.9MB |
| `v2026.4.26`        | FALLO    |     76,771ms |         54,941ms |           1,140.8MB |
| `v2026.4.27`        | FALLO    |     60,902ms |         33,699ms |           1,156.0MB |
| `v2026.4.29`        | FALLO    |     94,031ms |         57,334ms |           3,613.7MB |
| `v2026.5.2`         | APROBADO |      3,897ms |          3,610ms |             613.7MB |
| `v2026.5.7`         | APROBADO |      3,923ms |          3,693ms |             654.1MB |
| `v2026.5.12`        | APROBADO |      7,248ms |          6,629ms |             834.8MB |
| `v2026.5.18`        | APROBADO |      3,301ms |          2,913ms |             630.3MB |
| `v2026.5.20`        | APROBADO |      3,413ms |          2,952ms |             643.2MB |
| `v2026.5.22`        | APROBADO |      4,494ms |          4,093ms |             654.3MB |
| `v2026.5.26`        | APROBADO |      2,626ms |          2,282ms |             660.4MB |
| `v2026.5.27-beta.1` | APROBADO |      2,575ms |          2,217ms |             635.3MB |
| `v2026.5.27`        | APROBADO |      3,378ms |          2,973ms |             635.5MB |

## Sondas de origen

Se omitieron las sondas de origen para 17 referencias antiguas exitosas porque esos árboles de origen aún no tenían los puntos de entrada de sonda requeridos. Las métricas de turno del agente todavía existen para esas referencias.

Puntos de sonda de origen representativos:

| Lanzamiento         | Predeterminado `readyz` p50 | 50 complementos `readyz` p50 | Salud de CLI p50 | RSS máximo del complemento |
| ------------------- | --------------------------: | ---------------------------: | ---------------: | -------------------------: |
| `v2026.4.29`        |                     2,819ms |                      2,618ms |          1,679ms |                    389.0MB |
| `v2026.5.2`         |                     2,324ms |                      2,013ms |          1,384ms |                    377.2MB |
| `v2026.5.7`         |                     1,649ms |                      1,540ms |          1,175ms |                    387.6MB |
| `v2026.5.18`        |                     1,942ms |                      1,927ms |            607ms |                    426.5MB |
| `v2026.5.20`        |                     1,966ms |                      1,987ms |            621ms |                    455.0MB |
| `v2026.5.22`        |                     2,081ms |                      1,884ms |          5,095ms |                    444.2MB |
| `v2026.5.26`        |                     1,546ms |                      1,634ms |            656ms |                    400.4MB |
| `v2026.5.27-beta.1` |                     1,462ms |                      1,548ms |            548ms |                    394.0MB |
| `v2026.5.27`        |                     1,874ms |                      1,925ms |            660ms |                    398.0MB |

El pico de salud de la CLI `v2026.5.22` es visible en esta tabla aunque
carril agent-turn todavía haya pasado. Mantenga las sondas de origen al investigar
regresiones específicas de la CLI o la puerta de enlace.

## Auditoría de huella de instalación

Las muestras de dependencias usan una versión estable por mes, más el evento
de introducción del shrinkwrap `2026.5.22`, la última `2026.5.27` y la `main` actual.

| Punto                    | Dependencias instaladas | Instalación nueva | Paquete OpenClaw | `openclaw/node_modules` anidado | Shrinkwrap raíz | Comportamiento de instalación de Canvas       |
| ------------------------ | ----------------------: | ----------------: | ---------------: | ------------------------------: | --------------- | --------------------------------------------- |
| Ene `2026.1.30`          |                     605 |           438.4MB |           45.8MB |                           2.4MB | no              | contenedor de nivel superior + `darwin-arm64` |
| Feb `2026.2.26`          |                     645 |           575.7MB |          110.1MB |                           3.5MB | no              | contenedor de nivel superior + `darwin-arm64` |
| Mar `2026.3.31`          |                     438 |           584.1MB |          234.8MB |                             0MB | no              | contenedor de nivel superior + `darwin-arm64` |
| Abr `2026.4.29`          |                     392 |           335.0MB |           97.4MB |                             0MB | no              | ninguno instalado                             |
| `2026.5.22`              |                     401 |         1,020.6MB |        1,020.4MB |                         911.8MB | sí              | anidado: los 12 paquetes `@napi-rs/canvas`    |
| May `2026.5.26`          |                     371 |           767.5MB |          767.4MB |                         656.4MB | sí              | anidado: los 12 paquetes `@napi-rs/canvas`    |
| Más reciente `2026.5.27` |                     371 |           786.9MB |          786.7MB |                         675.9MB | sí              | anidado: los 12 paquetes `@napi-rs/canvas`    |
| Actual `main`            |                     314 |           407.4MB |          101.0MB |                             0MB | sí              | contenedor de nivel superior + `darwin-arm64` |

### Límite de shrinkwrap

<CardGroup cols={2}>
  <Card title="Antes del shrinkwrap" icon="unlock">
    `2026.5.20` no tiene un shrinkwrap raíz y ningún árbol de dependencias anidado grande de OpenClaw.
  </Card>
  <Card title="Introducido" icon="lock">
    `2026.5.22` añade shrinkwrap raíz e instala 911.8MB bajo `openclaw/node_modules` anidado.
  </Card>
  <Card title="Última versión estable" icon="tag">
    `2026.5.27` mantiene el shrinkwrap y todavía instala 675.9MB bajo `openclaw/node_modules` anidado.
  </Card>
  <Card title="Main actual" icon="verificar">
    `main` mantiene el shrinkwrap y elimina el árbol de dependencias anidadas de OpenClaw.
  </Card>
</CardGroup>

La inspección del archivo tar publicado verifica el límite:

| Versión     | ¿Estable publicada? | Raíz `npm-shrinkwrap.json` | Notas                                                   |
| ----------- | ------------------- | -------------------------- | ------------------------------------------------------- |
| `2026.5.20` | sí                  | no                         | última versión estable antes del shrinkwrap             |
| `2026.5.21` | no                  | n/a                        | sin versión estable en npm                              |
| `2026.5.22` | sí                  | sí                         | shrinkwrap introducido                                  |
| `2026.5.23` | no                  | n/a                        | sin versión estable en npm                              |
| `2026.5.24` | no                  | n/a                        | sin versión estable en npm                              |
| `2026.5.25` | no                  | n/a                        | sin versión estable en npm                              |
| `2026.5.26` | sí                  | sí                         | el árbol de dependencias anidadas todavía está presente |
| `2026.5.27` | sí                  | sí                         | árbol de dependencias anidado todavía presente          |
| `main`      | n/a                 | sí                         | árbol de dependencias anidadas eliminado                |

La distinción importante: **el shrinkwrap en sí no es el problema**. El
`main` actual todavía envía el shrinkwrap raíz. El problema era la forma del paquete que hacía
que npm materializara un árbol de dependencias OpenClaw anidado grande y los 12
paquetes de plataforma `@napi-rs/canvas`.

Para una explicación en lenguaje sencillo sobre shrinkwrap y las comprobaciones de
paquetes a nivel de mantenedor, consulte [npm shrinkwrap](/es/gateway/security/shrinkwrap).

## Interpretación de la cadena de suministro

El recuento de dependencias es una métrica de seguridad operativa, no solo una
métrica de tamaño de instalación. Cada paquete amplía el conjunto de mantenedores,
archivos tar, actualizaciones transitivas, binarios nativos opcionales y
comportamientos de tiempo de instalación en los que los operadores deben confiar.

La dirección de la limpieza es:

- mantener las capacidades pesadas y opcionales fuera de la instalación central predeterminada
- hacer que los paquetes de complementos sean dueños de su gráfico de dependencias de tiempo de ejecución
- evitar la reparación del administrador de paquetes en tiempo de ejecución durante el inicio de Gateway
- preservar las instalaciones deterministas sin causar la materialización de paquetes
  nativos de todas las plataformas
- mantener los scripts de instalación deshabilitados en las rutas de aceptación y medición de paquetes
- detectar árboles de dependencias anidadas y explosiones de dependencias nativas opcionales
  antes de publicar

Documentos relacionados:

- [Resolución de dependencias de complementos](/es/plugins/dependency-resolution)
- [Inventario de complementos](/es/plugins/plugin-inventory)
- [Validación completa de lanzamiento](/es/reference/full-release-validation)

## Ejecuciones de rendimiento no disponibles

| Lanzamiento         | Ejecución                                                                    | Resultado | Motivo                                                                                                                                                              |
| ------------------- | ---------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `v2026.5.3-1`       | [26561664645](https://github.com/openclaw/openclaw/actions/runs/26561664645) | fallo     | el trabajo de mock-provider falló: el inicio de la CLI excedió el tiempo de espera esperando que qa-channel estuviera listo; no se reportaron cuentas de qa-channel |
| `v2026.5.3`         | [26561666722](https://github.com/openclaw/openclaw/actions/runs/26561666722) | fallo     | el trabajo de mock-provider falló: el inicio de la CLI excedió el tiempo de espera esperando que qa-channel estuviera listo; no se reportaron cuentas de qa-channel |
| `v2026.4.29-beta.2` | [26561683635](https://github.com/openclaw/openclaw/actions/runs/26561683635) | cancelado | la obtención opcional de la línea base se colgó antes de la carga del artefacto                                                                                     |

## Pasos de seguimiento

Comprobaciones de lanzamiento recomendadas de este barrido:

1. Ejecute la prueba de rendimiento de mock-provider para los candidatos a lanzamiento y conserve
   los artefactos.
2. Rastrear el arranque en frío, el arranque en caliente, el RSS del agente, Gateway `readyz` y el estado de la CLI.
3. Instalar desde cero el paquete tarball con los scripts deshabilitados.
4. Registrar el recuento de dependencias instaladas, el tamaño de instalación, el tamaño del paquete, el tamaño de `openclaw/node_modules` anidado y la forma de los paquetes nativos opcionales.
5. Fallo o retención de la revisión de lanzamiento cuando aparecen árboles de dependencias anidados o paquetes nativos para todas las plataformas de manera inesperada.
