---
summary: "Cómo OpenClaw instala los paquetes de complementos y resuelve las dependencias de los complementos"
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

- las dependencias en tiempo de ejecución viven en el paquete de complementos `dependencies` o
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

- los paquetes npm se instalan en `~/.openclaw/npm`
- los paquetes git se clonan en `~/.openclaw/git`
- las instalaciones locales/ruta/archivo se copian o referencian sin reparación de dependencias

las instalaciones npm se ejecutan en la raíz npm con:

```bash
cd ~/.openclaw/npm
npm install --omit=dev --omit=peer --legacy-peer-deps --ignore-scripts --no-audit --no-fund
```

`openclaw plugins install npm-pack:<path.tgz>` usa esa misma raíz npm gestionada
para un tarball npm-pack local. OpenClaw lee los metadatos npm del tarball, lo agrega
a la raíz gestionada como una dependencia copiada `file:`, ejecuta la instalación normal de npm,
y luego verifica los metadatos del archivo de bloqueo instalado antes de confiar en el complemento.
Esto está destinado a la prueba de aceptación de paquetes y candidatos de lanzamiento donde un
artefacto de paquete local debe comportarse como el artefacto de registro que simula.

npm puede elevar las dependencias transitivas a `~/.openclaw/npm/node_modules` junto
al paquete del complemento. OpenClaw escanea la raíz npm gestionada antes de confiar en la
instalación y usa npm para eliminar los paquetes gestionados por npm durante la desinstalación, por lo que las
dependencias de tiempo de ejecución elevadas permanecen dentro del límite de limpieza gestionada.

Los complementos que importan `openclaw/plugin-sdk/*` declaran `openclaw` como una dependencia par. OpenClaw no permite a npm instalar una copia de registro separada del paquete anfitrión en la raíz administrada, porque los paquetes anfitrión obsoletos pueden afectar la resolución de pares de npm durante instalaciones posteriores de complementos. Las instalaciones administradas de npm omiten la resolución/materialización de pares de npm para la raíz compartida y OpenClaw reafirma los enlaces `node_modules/openclaw` locales del complemento para los paquetes instalados que declaran el anfitrión par después de la instalación, actualización o desinstalación.

Las instalaciones de git clonan o actualizan el repositorio, y luego ejecutan:

```bash
npm install --omit=dev --ignore-scripts --no-audit --no-fund
```

El complemento instalado luego se carga desde ese directorio de paquetes, por lo que la resolución `node_modules` local del paquete y del padre funciona de la misma manera que lo hace para un paquete Node normal.

## Complementos locales

Los complementos locales se tratan como directorios controlados por el desarrollador. OpenClaw no ejecuta `npm install`, `pnpm install`, ni la reparación de dependencias para ellos. Si un complemento local tiene dependencias, instálelas en ese complemento antes de cargarlo.

Los complementos locales de TypeScript de terceros pueden usar la ruta de emergencia de Jiti. Los complementos de JavaScript empaquetados y los complementos internos integrados se cargan a través de import/require nativo en lugar de Jiti.

## Inicio y recarga

El inicio y la recarga de la configuración del Gateway nunca instalan dependencias de complementos. Leen los registros de instalación de los complementos, calculan el punto de entrada y lo cargan.

Si falta una dependencia en tiempo de ejecución, el complemento no se carga y el error debería indicar al operador una solución explícita:

```bash
openclaw plugins update <id>
openclaw plugins install <source>
openclaw doctor --fix
```

`doctor --fix` puede limpiar el estado de dependencias heredado generado por OpenClaw y recuperar complementos descargables que faltan en los registros de instalación local cuando la configuración los referencia. Doctor no repara las dependencias de un complemento local ya instalado.

## Complementos empaquetados

Los complementos empaquetados ligeros y críticos para el núcleo se envían como parte de OpenClaw. Deben no tener un árbol de dependencias de tiempo de ejecución pesado o ser movidos a un paquete descargable en ClawHub/npm.

Para ver la lista generada actual de complementos que se envían en el paquete principal, se instalan externamente o permanecen solo en el código fuente, consulte [Inventario de complementos](/es/plugins/plugin-inventory).

Los manifiestos de complementos empaquetados no deben solicitar la preparación de dependencias. La funcionalidad de complementos grande u opcional debe empaquetarse como un complemento normal e instalarse a través de la misma ruta npm/git/ClawHub que los complementos de terceros.

En las comprobaciones de código fuente (source checkouts), OpenClaw trata el repositorio como un monorepo pnpm. Después de `pnpm install`, los complementos empaquetados (bundled plugins) se cargan desde `extensions/<id>` para que estén disponibles las dependencias del espacio de trabajo local del paquete y los cambios se recojan directamente. El desarrollo en comprobaciones de código fuente es exclusivamente con pnpm; el uso simple de `npm install` en la raíz del repositorio no es una forma admitida de preparar las dependencias de los complementos empaquetados.

| Forma de instalación            | Ubicación del complemento empaquetado                      | Propietario de la dependencia                                                                   |
| ------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `npm install -g openclaw`       | Árbol de tiempo de ejecución construido dentro del paquete | Paquete OpenClaw y flujos explícitos de instalación/actualización/médico de complementos        |
| Git checkout más `pnpm install` | Paquetes del espacio de trabajo `extensions/<id>`          | El espacio de trabajo pnpm, incluyendo las dependencias propias de cada paquete de complementos |
| `openclaw plugins install ...`  | Raíz de complementos administrados npm/git/ClawHub         | El flujo de instalación/actualización del complemento                                           |

## Limpieza de versiones anteriores

Las versiones anteriores de OpenClaw generaban raíces de dependencias de complementos agrupados al inicio o durante la reparación del doctor. La limpieza actual del doctor elimina esos directorios obsoletos y enlaces simbólicos cuando se usa `--fix`, incluyendo viejas raíces `plugin-runtime-deps`, enlaces simbólicos globales de prefijo de Node que apunten a objetivos `plugin-runtime-deps` podados, manifiestos `.openclaw-runtime-deps*`, complementos `node_modules` generados, directorios de etapa de instalación y tiendas pnpm locales de paquetes. El postinstalación empaquetado también elimina esos enlaces simbólicos globales antes de podar las raíces de objetivos heredadas para que las actualizaciones no dejen importaciones de paquetes ESM colgadas.

Estas rutas son solo restos de versiones anteriores. Las nuevas instalaciones no deberían crearlas.
