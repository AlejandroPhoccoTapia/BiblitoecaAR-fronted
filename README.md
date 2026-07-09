# BibliotecaAR Frontend

Panel web para la gestion de libros y capitulos de BibliotecaAR.

La pantalla de acceso permite iniciar sesion o crear la primera cuenta docente cuando el backend desplegado aun no tiene usuarios.

## Desarrollo

```powershell
npm install
npm run dev
```

Por defecto, Vite usa el proxy local del archivo `vite.config.js` y consume:

```text
http://127.0.0.1:8000/api
```

## Deploy en Vercel

Configura el proyecto como Vite:

```text
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist
Install Command: npm install
```

Variable de entorno:

```text
VITE_API_BASE_URL=https://<tu-backend-render>.onrender.com/api
```

Ejemplo:

```text
VITE_API_BASE_URL=https://bibliotecaar-backend.onrender.com/api
```

El archivo `vercel.json` deja preparada la app como SPA para que cualquier ruta vuelva a `index.html`.
