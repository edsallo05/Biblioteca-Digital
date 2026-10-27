# Biblioteca digital

Primer parcial de Programación Web. Aplicación de una sola página para gestionar una biblioteca: catálogo de libros, préstamos y devoluciones, formulario para agregar y editar libros, y un resumen con ajustes. Hecha con HTML, CSS y JavaScript puros, sin librerías.

## Cómo usarla

1. Descarga o clona el repositorio.
2. Abre `index.html` en el navegador. No necesita servidor.

## Vistas

- **Catálogo:** tarjetas con búsqueda, filtros (estado y género), orden y contador. Desde cada tarjeta se puede prestar, devolver, editar o eliminar.
- **Mis préstamos:** préstamos activos (con vencidos marcados) e historial de devueltos.
- **Agregar libro:** formulario con validación por campo; también sirve para editar.
- **Resumen y ajustes:** totales, tema claro/oscuro, nombre del usuario y botón para restablecer.

## Reglas principales

- Máximo 3 préstamos activos a la vez.
- Los libros de colección no se prestan.
- Un libro con préstamo activo no se puede prestar de nuevo, eliminar ni marcar como de colección.
- El préstamo dura 14 días. Devolver no borra el préstamo: se guarda la fecha de devolución y pasa al historial.
- No se permiten libros duplicados (mismo título y autor).

## Estructura

| Archivo | Contenido |
|---|---|
| `index.html` | Estructura de la página y modales |
| `estilos.css` | Estilos, tema claro/oscuro, diseño responsivo |
| `logica.js` | Datos y reglas (sin tocar el DOM) |
| `app.js` | Interfaz: dibuja la pantalla a partir de los datos y maneja eventos |
| `ilustracion.svg` | Imagen junto al formulario |

## Datos

Todo se guarda en `localStorage` (libros, préstamos, tema, nombre y orden del catálogo). Las fechas de los préstamos iniciales se calculan a partir de la fecha de hoy. El botón **Restablecer biblioteca** vuelve a los datos iniciales.
