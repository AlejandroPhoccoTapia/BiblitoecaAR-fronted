# BibliotecaAR — Panel docente web

Aplicación React para administrar libros y capítulos vinculados a realidad aumentada: permite publicar contenido, subir texto/audio/modelos GLB, consultar los QR generados por Django y registrar estudiantes con fotografías y libros asignados.

Documentación contrastada con el código el **24 de septiembre de 2026**. Es un MVP; las funciones implementadas y las integraciones pendientes se distinguen abajo. Esta guía no acredita que el despliegue o el recorrido completo hayan sido probados.

## 1. Contexto del proyecto

| Repositorio | Función |
| --- | --- |
| [BiblitoecaAR-fronted](https://github.com/AlejandroPhoccoTapia/BiblitoecaAR-fronted) | Este panel. Se conserva la grafía real del repositorio. |
| [BibliotecaAR-backend](https://github.com/AlejandroPhoccoTapia/BibliotecaAR-backend) | Django: API, sesiones, catálogo, estudiantes, QR y almacenamiento. |
| [BibliotecaAR](https://github.com/AlejandroPhoccoTapia/BibliotecaAR) | Unity Android: escaneo QR, seguimiento de imágenes y presentación de recursos AR. |

```text
Docente -> React -> API Django -> base de datos y archivos
                       |
                       +-> QR de capítulo -> Android Unity -> contenido AR
```

El panel prepara el contenido; la experiencia AR ocurre en Unity, no en el navegador. Un «capítulo» de la interfaz es un registro `Scene` del backend. No confundirlo con las escenas Unity `QRScanScene` y `ARScene`. El QR contiene un identificador, no una URL.

El backend usa SQLite y archivos locales en desarrollo, con configuración para PostgreSQL y Storage de Supabase en despliegue. El frontend solo se comunica con la API y con las URLs públicas de recursos; no se conecta directamente a la base de datos.

## 2. Tecnologías y estructura

- React 18.3, Vite 6, Tailwind CSS 4 y Lucide React según `package.json`.
- JavaScript/JSX, sin TypeScript.
- Hooks de React; sin React Router ni store externo. `section`, `view` e IDs seleccionados controlan la navegación en memoria.
- Fetch con cookies y CSRF; no JWT ni Axios.
- Versiones resueltas en `package-lock.json`; usar `npm ci` para reproducirlas.

```text
src/
  main.jsx       Montaje React con StrictMode
  App.jsx        Sesión, estado, navegación, CRUD y componentes de pantalla
  api.js         URL base, fetch, CSRF, multipart y acceso a endpoints
  styles.css     Tailwind y estilos compartidos
index.html
vite.config.js   Plugins React/Tailwind y proxy local /api y /media
eslint.config.js
vercel.json      Reescritura SPA hacia index.html
.env.example     Ejemplo de backend remoto; no es obligatorio para uso local
```

`App.jsx` concentra la aplicación. Componentes principales: `LoginView`, `AppHeader`, `BooksView`, `BookCard`, `BookDetailView`, `ChapterRow`, `BookFormView`, `ChapterFormView`, `StudentsView`, `StudentCard`, `StudentFormView` y `SceneQrCard`.

## 3. Flujos implementados

### Acceso docente

Al iniciar, `getTeacherSession()` consulta `/auth/me/`. Con sesión, `loadTeacherContent()` solicita libros, escenas y estudiantes en paralelo. Sin sesión aparece login/registro.

El registro público crea al primer docente solo si no existe ningún usuario staff. Después, la API requiere un docente autenticado para crear otro. El panel no tiene una pantalla específica de administración de docentes dentro de la sesión. Un superusuario Django también puede acceder. Todos los docentes comparten los datos del catálogo; no hay filtros por propietario o institución.

### Biblioteca

1. Buscar libros por título/descripción.
2. Crear y editar título, descripción, portada y estado publicado/borrador.
3. Abrir un libro y listar capítulos por orden.
4. Crear/editar capítulo: título, orden, texto, `prefab_key`, audio y `.glb`.
5. Ver, abrir y solicitar descarga del QR generado por Django.
6. Eliminar capítulos o libros; el backend elimina las escenas del libro en cascada.

Los indicadores son conteos del catálogo, no estadísticas de aprendizaje. No se genera voz, se convierten modelos ni se producen QR en el navegador. `prefab_key` referencia un prefab local en Unity; un GLB se descarga dinámicamente. No hay visor 3D integrado en el panel.

La descarga de QR usa el atributo HTML `download`; con archivos en otro origen su comportamiento depende del navegador y del servidor.

### Estudiantes

Se pueden listar y buscar por nombre/aula, crear, editar, activar/desactivar, subir una fotografía y seleccionar libros. El backend calcula la firma de imagen cuando recibe una foto mediante la API.

No hay captura de cámara ni login facial en este panel. `StudentProfile` es un perfil, no una cuenta Django con contraseña. El endpoint facial existe en Django, pero Unity aún no lo consume. Asignar libros no restringe el endpoint público de Unity. La asignación múltiple tiene un problema de serialización explicado en la sección 8.

## 4. Desarrollo local

Requisitos: Git, Node.js/npm compatibles con las dependencias bloqueadas y backend Django en ejecución. No se fija Node mediante `engines` o `.nvmrc`; una opción es Node 22.12 o superior compatible, comprobando la instalación con el lockfile.

Desde la raíz:

```powershell
npm ci
npm run dev
```

Abrir la URL impresa por Vite, normalmente `http://localhost:5173`. Si el puerto está ocupado puede elegir otro. El backend contempla CSRF de localhost/127.0.0.1 en 5173 y 5174; revisar configuración si cambia.

Para Django local **no hace falta copiar `.env.example`**. Sin `VITE_API_BASE_URL`, el cliente usa `/api` y Vite redirige:

| Ruta | Destino |
| --- | --- |
| `/api` | `http://127.0.0.1:8000/api` |
| `/media` | `http://127.0.0.1:8000/media` |

Seguir el README del backend para instalar, migrar, crear docente y arrancar el servidor. No hay credenciales por defecto.

Para otro backend, crear un `.env.local` ignorado por Git:

```dotenv
VITE_API_BASE_URL=https://<tu-backend>.onrender.com/api
```

Incluir `/api` y reiniciar Vite tras cambiar el entorno. `.env.example` apunta a un dominio remoto del proyecto: copiarlo hace que se use ese servidor en lugar del proxy local. No se ha verificado aquí la disponibilidad de ese dominio.

Las variables `VITE_*` se incorporan al código del navegador. No colocar claves Django, credenciales de Supabase ni otros secretos.

## 5. API y autenticación

`src/api.js` centraliza las peticiones. `request()`:

- Incluye cookies mediante `credentials: 'include'`.
- Guarda `csrf_token` recibido por JSON y envía `X-CSRFToken` en métodos distintos de GET; contempla la cookie local como respaldo.
- Envía JSON o `FormData`. Para archivos permite al navegador crear el encabezado multipart y su boundary.
- Convierte errores HTTP en excepciones que muestra la UI; devuelve `null` ante 204.

| Recurso | Rutas relativas a la base /api |
| --- | --- |
| Sesión y acceso | `/auth/me/`, `/auth/login/`, `/auth/register/`, `/auth/logout/`. |
| Libros | `/teacher/books/`, `/teacher/books/<id>/`. |
| Capítulos | `/teacher/scenes/`, `/teacher/scenes/<id>/`. |
| Estudiantes | `/teacher/students/`, `/teacher/students/<id>/`. |

La API docente requiere `is_staff=True`. Las colecciones deben devolver arreglos; si se agrega paginación con `results`, adaptar el cliente. Después de guardar, la respuesta actualiza el estado local; no hay sincronización en tiempo real ni persistencia de pantalla al recargar.

| Recurso | Campos clave de respuesta |
| --- | --- |
| Libro | `id`, `title`, `description`, `cover_url`, `is_published`, `scenes_count`, `updated_at`. |
| Capítulo | `id`, `book` (ID), `title`, `order`, `text`, `prefab_key`, `audio_url`, `glb_model_url`, `qr_code`, `qr_image_url`. |
| Estudiante | `id`, `full_name`, `classroom`, `photo_url`, `assigned_books` (IDs), `assigned_books_detail`, `has_face_signature`, `is_active`. |

El backend exige `text` y `prefab_key` en escenas nuevas, incluso con GLB. La UI exige título al guardar y muestra los demás errores del servidor. No reconstruir QR a partir del título: lo genera Django con un identificador único.

## 6. Despliegue previsto en Vercel

```text
Framework: Vite
Install Command: npm ci
Build Command: npm run build
Output Directory: dist
VITE_API_BASE_URL=https://<tu-backend>.onrender.com/api
```

`vercel.json` reescribe rutas hacia `index.html`; no proporciona un proxy Django en producción. El proxy Vite es de desarrollo. Cambiar la variable API requiere volver a construir/desplegar.

En Django configurar el origen HTTPS del panel en `CORS_ALLOWED_ORIGINS` y `CSRF_TRUSTED_ORIGINS`. El backend permite credenciales y configura cookies Secure/SameSite=None con DEBUG=False. Las políticas de cookies entre sitios del navegador también influyen: CORS correcto no demuestra que se guarde la sesión.

Los recursos vienen de Django o Supabase Storage; no se alojan como parte del build del panel. Los manifiestos son configuración de despliegue, no evidencia de un servicio operativo.

## 7. Validación

```powershell
npm run lint
npm run build
npm run preview
```

No hay suite de tests de frontend configurada. Lint/build no validan permisos, cookies, subidas ni AR. `preview` sirve el build; no asumir que reproduce el proxy de desarrollo. Construir con la URL de API adecuada y permitir el origen usado para esa prueba.

Recorrido manual:
1. Entrar, recargar, comprobar persistencia de sesión y cerrar sesión.
2. Crear/editar un libro, portada y publicación.
3. Crear capítulo con texto, clave de prefab, audio y GLB válido.
4. Abrir QR, comprobar `/api/unity/scenes/<qr_code>/` y las URLs de archivos.
5. Despublicar el libro y comprobar 404 en esa API.
6. Crear/editar estudiante, asignar varios libros y retirar todas las asignaciones.
7. Probar el QR con Unity en Android para validar modelo, audio y seguimiento.

Estos comandos y recorridos son instrucciones, no resultados de pruebas ejecutadas al redactar esta documentación.

## 8. Problemas conocidos y pendientes

| Punto | Estado observado |
| --- | --- |
| Asignación múltiple | `asFormData()` hace un único append del arreglo. `[1,2]` se convierte en `"1,2"`; Django espera una lista de IDs. Corregir serialización y probar también vaciado. |
| Vaciar campos | Se omiten `''`, `null` y `undefined`; vaciar descripción/aula puede dejar el valor anterior. |
| Retirar archivos | Se permite sustituirlos. Django admite `remove_glb_model`, pero no hay control dedicado ni retirada general de portada/audio/foto. |
| Flujo infantil | No hay login facial ni autorización por estudiante en este panel. Unity tampoco integra aún la identificación. |
| Fotos | El backend puede guardarlas en el bucket público de media; no existe flujo privado específico. |
| Reconocimiento | El backend utiliza comparación LBP experimental, no autenticación biométrica validada. |
| Carga inicial | Se descarga todo el catálogo. Un fallo en cualquiera de las tres peticiones impide completar la carga conjunta. |
| Organización | Estado, lógica y componentes concentrados en `App.jsx`; no hay rutas por pantalla. |
| Seguimiento educativo | No hay progreso, evaluaciones ni analítica de aprendizaje persistida. |

Diagnóstico: 403 al guardar requiere revisar sesión, CSRF, orígenes y cookies; error de red, URL base y Django; 400 en estudiantes, formato de `assigned_books`; QR sin recursos, JSON Unity y URLs del storage.

## 9. Guía para el siguiente asistente

1. Leer este README y el del backend antes de tocar formularios/peticiones; leer el de Unity para contenido AR.
2. Revisar `git status` en los tres repositorios independientes. Conservar cambios locales ajenos.
3. Empezar por `src/api.js`, los handlers/estado de `App.jsx` y el componente afectado.
4. Mantener la distinción capítulo/Scene API frente a escena Unity. El servidor genera los QR.
5. Contrastar cada función visible con serializers y consumidores; una pantalla no acredita integración completa.
6. Al cambiar multipart, probar listas y valores vacíos. Al cambiar autenticación, comprobar cookies/CSRF entre los dominios reales.
7. Ejecutar lint/build cuando corresponda, indicar pruebas manuales y actualizar esta guía al resolver limitaciones.
