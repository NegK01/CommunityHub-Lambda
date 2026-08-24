# CommunityHub - Servicio Serverless (AWS Lambda y Amazon EventBridge)

Microservicio serverless construido con Node.js, TypeScript y MongoDB para la automatizacion de tareas periodicas en la plataforma CommunityHub.

---

## Funcionalidad Principal

El servicio se ejecuta de forma programada a traves de Amazon EventBridge y realiza dos tareas criticas:

1. **Generacion de Recordatorios**:
   - Identifica actividades activas programadas para las proximas 24 horas.
   - Consulta los usuarios con inscripciones activas en dichas actividades.
   - Inserta notificaciones de recordatorio de forma idempotente (valida que no exista una notificacion previa para evitar duplicados en ejecuciones continuas).

2. **Actualizacion de Estados de Actividades**:
   - Identifica actividades cuya fecha de realizacion ya ha expirado y actualiza su estado de `activo` a `finalizado`.

---

## Requisitos Previos

- Node.js 20.x o superior
- npm 10.x o superior
- Cluster de MongoDB Atlas con acceso de red configurado para permitir invocaciones desde AWS Lambda
- Cuenta de AWS con permisos para Lambda y EventBridge

---

## Instalacion y Pruebas Locales

1. Instalar las dependencias del proyecto:

```bash
cd CommunityHub-Lambda
npm install
```

2. Configurar las variables de entorno:
Crear un archivo `.env` en la raiz con el connection string de la base de datos:

```env
MONGODB_URI=mongodb+srv://<usuario>:<password>@<cluster>.mongodb.net/communityhub
```

3. Ejecutar la prueba local:

```bash
npm run test:local
```

Este script simula la llamada de AWS Lambda, ejecuta la logica contra la base de datos y muestra en consola el resultado de la ejecucion y las metricas procesadas.

---

## Despliegue en AWS Lambda

### 1. Compilar el proyecto
```bash
npm run build
```
Esto genera el codigo JavaScript en el directorio `dist/`.

### 2. Empaquetar el codigo
Comprimir en un archivo `.zip` el contenido de:
- La carpeta `dist/`
- La carpeta `node_modules/`

### 3. Crear y Configurar la Funcion en AWS Lambda
1. En la consola de AWS Lambda, crear una nueva funcion (**Author from scratch**).
   - **Nombre de la funcion**: `CommunityHub-Recordatorios`
   - **Runtime**: `Node.js 20.x` o `Node.js 22.x`
   - **Arquitectura**: `x86_64`
2. En la pestaña **Codigo** (*Code*), subir el archivo `.zip` generado utilizando la opcion **Cargar desde -> Archivo .zip** (*Upload from -> .zip file*).
3. En **Configuracion de la version ejecutable** (*Runtime settings*), establecer el **Controlador** (*Handler*) como:
   ```text
   dist/index.handler
   ```
4. En **Configuracion -> Configuracion general** (*General configuration*), aumentar el **Tiempo de espera** (*Timeout*) a `15 segundos`.
5. En **Configuracion -> Variables de entorno** (*Environment variables*), agregar:
   - Clave: `MONGODB_URI`
   - Valor: El connection string de MongoDB Atlas.

### 4. Configurar el Disparador de Amazon EventBridge
1. En la seccion de la funcion Lambda, presionar **Agregar disparador** (*Add trigger*).
2. Seleccionar **EventBridge (CloudWatch Events)**.
3. Elegir **Crear una nueva regla** (*Create a new rule*):
   - **Nombre de la regla**: `CommunityHub-TriggerHorario`
   - **Tipo de regla**: `Schedule expression`
   - **Expresion**: `rate(1 hour)` (para ejecucion cada hora) o `cron(0 8 * * ? *)` (ejecucion diaria).
4. Guardar los cambios.

---

## Estructura de Respuesta del Handler

Al ejecutarse, la funcion devuelve un objeto con formato estandar de AWS Lambda:

```json
{
  "statusCode": 200,
  "body": "{\"message\":\"proceso de recordatorios y actualizacion completado con exito\",\"eventosProximosEncontrados\":1,\"notificacionesCreadas\":1,\"eventosFinalizados\":0}"
}
```
