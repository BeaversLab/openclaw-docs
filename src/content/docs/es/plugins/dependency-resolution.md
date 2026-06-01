---
summary: "Cómo OpenClaw instala los paquetes de complementos y resuelve las dependencias de complementos"
read_when:
  - You are debugging plugin package installs
  - You are changing plugin startup, doctor, or package-manager install behavior
  - You are maintaining packaged OpenClaw installs or bundled plugin manifests
title: "Resolución de dependencias de complementos"
sidebarTitle: "Dependencias"
---

OpenClaw mantiene el trabajo de dependencias de los complementos en el momento de la instalación/actualización. La carga en tiempo de ejecución no ejecuta gestores de paquetes, repara árboles de dependencias ni muta el directorio de paquetes de OpenClaw.

## División de responsabilidades

Los paquetes de complementos son dueños de su gráfico de dependencias:

- las dependencias de tiempo de ejecución residen en el paquete del complemento `dependencies` o
  `optionalDependencies`
- las importaciones del SDK/núcleo son dependencias peer o importaciones de OpenClaw proporcionadas
- los complementos de desarrollo local traen sus propias dependencias ya instaladas
- los complementos npm y git se instalan en raíces de paquetes propiedad de OpenClaw

OpenClaw solo posee el ciclo de vida del complemento:

- descubrir la fuente del complemento
- instalar o actualizar el paquete cuando se solicite explícitamente
- registrar los metadatos de la instalación
- cargar el punto de entrada del complemento
- fallar con un error accionable cuando faltan dependencias

## Raíces de instalación

OpenClaw utiliza raíces estables por fuente:

- los paquetes npm se instalan en proyectos por complemento bajo
  `~/.openclaw/npm/projects/<encoded-package>`
- los paquetes git se clonan en `~/.openclaw/git`
- las instalaciones locales/ruta/archivo se copian o referencian sin reparación de dependencias

las instalaciones de npm se ejecutan en esa raíz del proyecto por complemento con:

```bash
cd ~/.openclaw/npm/projects/<encoded-package>
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>` usa esa misma raíz del proyecto npm por complemento
para un archivo tar local de npm-pack. OpenClaw lee los metadatos npm del
archivo tar, los agrega al proyecto administrado como una dependencia `file:` copiada, ejecuta
la instalación normal de npm y luego verifica los metadatos del lockfile instalado antes
de confiar en el complemento.
Esto está destinado a la aceptación de paquetes y la prueba de candidatos a lanzamiento donde un
artefacto de empaquetado local debe comportarse como el artefacto de registro que simula.

npm puede elevar las dependencias transitivas al `node_modules` del proyecto por complemento
junto con el paquete del complemento. OpenClaw escanea la raíz del proyecto administrado
antes de confiar en la instalación y elimina ese proyecto durante la desinstalación, por lo que
las dependencias de tiempo de ejecución elevadas permanecen dentro del límite de limpieza de ese complemento.

Los paquetes de complementos npm publicados pueden enviar `npm-shrinkwrap.json`. npm usa ese
lockfile publicable durante la instalación, y la raíz del proyecto npm administrada por OpenClaw
lo admite a través de la ruta normal de instalación de npm. Los paquetes de complementos publicables
propiedad de OpenClaw deben incluir un shrinkwrap local del paquete generado a partir del
gráfico de dependencias publicado de ese paquete de complemento:

```bash
pnpm deps:shrinkwrap:generate
pnpm deps:shrinkwrap:check
```

El generador elimina el complemento `devDependencies`, aplica la política de anulación del espacio de trabajo
y escribe `extensions/<id>/npm-shrinkwrap.json` para cada
complemento `publishToNpm`. Los paquetes de complementos de terceros también pueden incluir shrinkwrap;
OpenClaw no lo requiere para los paquetes de la comunidad, pero npm lo respetará
cuando esté presente.

Los paquetes de complementos npm propiedad de OpenClaw también pueden publicarse con `bundledDependencies` explícitos. La ruta de publicación de npm superpone la lista de nombres de dependencias en tiempo de ejecución, elimina los metadatos del espacio de trabajo solo de desarrollo del manifiesto del paquete publicado, ejecuta una instalación de npm sin scripts para las dependencias en tiempo de ejecución locales del paquete, y luego empaqueta o publica el tarball del complemento con esos archivos de dependencia incluidos. Los paquetes con muchos elementos nativos, incluidos los tiempos de ejecución de Codex y ACP, optan por excluirse con `openclaw.release.bundleRuntimeDependencies: false`; esos paquetes aún envían su shrinkwrap, pero npm resuelve las dependencias en tiempo de ejecución durante la instalación en lugar de incrustar cada binario de plataforma en el tarball del complemento. El paquete raíz `openclaw` no agrupa su árbol de dependencias completo.

Los complementos que importan `openclaw/plugin-sdk/*` declaran `openclaw` como una dependencia
par (peer). OpenClaw no permite que npm instale una copia de registro separada del
paquete anfitrión en un proyecto administrado, porque los paquetes anfitrión obsoletos pueden afectar la
resolución de pares (peer) de npm dentro de ese complemento. Las instalaciones administradas de npm omiten la
resolución/materialización de pares de npm y OpenClaw reafirma los enlaces `node_modules/openclaw` locales del complemento
para los paquetes instalados que declaran el par anfitrión
después de la instalación o actualización.

Las instalaciones de git clonan o actualizan el repositorio, y luego ejecutan:

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

El complemento instalado luego se carga desde ese directorio de paquetes, por lo que la resolución `node_modules` local del paquete y principal funciona de la misma manera que lo hace para un paquete normal de Node.

## Complementos locales

Los complementos locales se tratan como directorios controlados por el desarrollador. OpenClaw no ejecuta `npm install`, `pnpm install`, ni reparación de dependencias para ellos. Si un complemento local tiene dependencias, instálelas en ese complemento antes de cargarlo.

Los complementos locales de TypeScript de terceros pueden usar la ruta de emergencia de Jiti. Los complementos de JavaScript empaquetados y los complementos internos agrupados se cargan a través de import/require nativos en lugar de Jiti.

## Inicio y recarga

El inicio de la Gateway y la recarga de la configuración nunca instalan las dependencias de los complementos. Leen los registros de instalación de los complementos, calculan el punto de entrada y lo cargan.

Si falta una dependencia en tiempo de ejecución, el complemento falla al cargarse y el error debería señalar al operador una solución explícita:

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` puede limpiar el estado de dependencias heredado generado por OpenClaw y recuperar complementos descargables que faltan en los registros de instalación local cuando la configuración los referencia. Doctor no repara las dependencias de un complemento local ya instalado.

## Complementos incluidos

Los complementos incluidos ligeros y críticos para el núcleo se envían como parte de OpenClaw. Deben no tener un árbol de dependencias de tiempo de ejecución pesado o ser movidos a un paquete descargable en ClawHub/npm.

Para ver la lista generada actual de complementos que se envían en el paquete principal, se instalan
externamente o permanecen solo en el código fuente, consulte [Inventario de complementos](/es/plugins/plugin-inventory).

Los manifiestos de complementos incluidos no deben solicitar la preparación de dependencias. La funcionalidad de complementos grande u opcional debe empaquetarse como un complemento normal e instalarse a través de la misma ruta npm/git/ClawHub que los complementos de terceros.

En las checkouts del código fuente, OpenClaw trata el repositorio como un monorepo pnpm. Después de `pnpm install`, los complementos incluidos se cargan desde `extensions/<id>` para que las dependencias del espacio de trabajo locales del paquete estén disponibles y las ediciones se recojan directamente. El desarrollo en checkout de código fuente es solo para pnpm; el `npm install` simple en la raíz del repositorio no es una forma compatible de preparar las dependencias de los complementos incluidos.

| Formato de instalación          | Ubicación del complemento incluido                         | Propietario de la dependencia                                                                   |
| ------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm install -g openclaw`       | Árbol de tiempo de ejecución construido dentro del paquete | Paquete OpenClaw y flujos explícitos de instalación/actualización/doctor de complementos        |
| Git checkout más `pnpm install` | Paquetes del espacio de trabajo `extensions/<id>`          | El espacio de trabajo pnpm, incluyendo las propias dependencias de cada paquete de complementos |
| `openclaw plugins install ...`  | Raíz administrada del proyecto npm/git/ClawHub             | El flujo de instalación/actualización del complemento                                           |

## Limpieza heredada

Las versiones anteriores de OpenClaw generaban raíces de dependencias de complementos empaquetados al inicio o durante la reparación del doctor. La limpieza actual del doctor elimina esos directorios y enlaces simbólicos obsoletos cuando se usa `--fix`, incluidas las raíces antiguas de `plugin-runtime-deps`, los enlaces simbólicos globales de paquetes con prefijo de Node que apuntan a objetivos `plugin-runtime-deps` eliminados, manifiestos `.openclaw-runtime-deps*`, `node_modules` de complementos generados, directorios de etapa de instalación y tiendas pnpm locales de paquetes. El postinstall empaquetado también elimina esos enlaces simbólicos globales antes de eliminar las raíces de objetivos heredadas, de modo que las actualizaciones no dejen importaciones de paquetes EPM colgantes.

Las instalaciones de npm más antiguas también usaban una raíz `~/.openclaw/npm/node_modules` compartida.
Los flujos actuales de instalación, actualización, desinstalación y doctor todavía reconocen esa raíz
plana heredada solo para la recuperación y la limpieza. Las nuevas instalaciones de npm deberían crear
raíces de proyectos por complemento en su lugar.
