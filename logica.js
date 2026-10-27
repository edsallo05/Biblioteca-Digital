// LÓGICA: reglas de la biblioteca. No toca el DOM.
const CLAVE = "biblioteca";
const GENEROS = ["novela", "ciencia", "historia", "fantasia", "poesia"];
const MAX_PRESTAMOS = 3;

// ---------- Fechas (texto "AAAA-MM-DD") ----------
function fechaATexto(d) {
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return d.getFullYear() + "-" + mes + "-" + dia;
}
function hoy() { return fechaATexto(new Date()); }
function sumarDias(texto, n) {
  const d = new Date(texto + "T00:00:00");
  d.setDate(d.getDate() + n);
  return fechaATexto(d);
}
function diasEntre(a, b) { // días de a hasta b
  return Math.round((new Date(b + "T00:00:00") - new Date(a + "T00:00:00")) / 86400000);
}
function formatoFecha(texto) {
  const [anio, mes, dia] = texto.split("-");
  return dia + "/" + mes + "/" + anio;
}
function nuevoId() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 6); }

// ---------- Datos y persistencia ----------
function datosIniciales() {
  const h = hoy();
  const libro = (id, titulo, autor, anio, genero, coleccion) =>
    ({ id, titulo, autor, anio, genero, comentario: "", coleccion });
  // dias = hace cuántos días se prestó; dev = hace cuántos días se devolvió (null si sigue activo)
  const prestamo = (id, idLibro, persona, dias, dev) => ({
    id, idLibro, persona,
    fechaPrestamo: sumarDias(h, -dias),
    fechaLimite: sumarDias(h, 14 - dias),
    fechaDevolucion: dev === null ? null : sumarDias(h, -dev)
  });
  return {
    libros: [
      libro("l1", "Cien años de soledad", "Gabriel García Márquez", 1967, "novela", false),
      libro("l2", "El Aleph", "Jorge Luis Borges", 1949, "fantasia", false),
      libro("l3", "Breve historia del tiempo", "Stephen Hawking", 1988, "ciencia", false),
      libro("l4", "Sapiens", "Yuval Noah Harari", 2011, "historia", false),
      libro("l5", "Don Quijote de la Mancha", "Miguel de Cervantes", 1605, "novela", true),
      libro("l6", "El origen de las especies", "Charles Darwin", 1859, "ciencia", true),
      libro("l7", "Veinte poemas de amor", "Pablo Neruda", 1924, "poesia", false),
      libro("l8", "La ciudad y los perros", "Mario Vargas Llosa", 1963, "novela", false)
    ],
    prestamos: [
      prestamo("p1", "l1", "Ana", 17, null),   // activo y vencido (3 días de retraso)
      prestamo("p2", "l3", "Luis", 2, null),   // activo
      prestamo("p3", "l4", "María", 30, 20),   // devuelto a tiempo
      prestamo("p4", "l2", "Pedro", 40, 20)    // devuelto con 6 días de retraso
    ],
    tema: "claro",
    usuario: "",
    orden: { campo: "titulo", dir: "asc" }
  };
}
function cargar() {
  try {
    const guardado = JSON.parse(localStorage.getItem(CLAVE));
    if (guardado && guardado.libros && guardado.prestamos) return guardado;
  } catch (e) { /* si falla, se usan los datos iniciales */ }
  return datosIniciales();
}
function guardar() { localStorage.setItem(CLAVE, JSON.stringify(estado)); }

let estado = cargar();

// ---------- Consultas (todo se calcula, nada se guarda) ----------
function buscarLibro(id) { return estado.libros.find(l => l.id === id); }
function prestamoActivo(idLibro) {
  return estado.prestamos.find(p => p.idLibro === idLibro && p.fechaDevolucion === null);
}
function prestamosActivos() { return estado.prestamos.filter(p => p.fechaDevolucion === null); }
function estaVencido(p) { return p.fechaDevolucion === null && p.fechaLimite < hoy(); }
function diasRetraso(p) {
  const referencia = p.fechaDevolucion || hoy();
  return Math.max(0, diasEntre(p.fechaLimite, referencia));
}
function estaDisponible(libro) { return !libro.coleccion && !prestamoActivo(libro.id); }

// ---------- Préstamos ----------
function errorPrestar(idLibro) {
  const libro = buscarLibro(idLibro);
  if (!libro) return "El libro no existe.";
  if (libro.coleccion) return "Los libros de colección no se prestan.";
  if (prestamoActivo(idLibro)) return "Este libro ya está prestado.";
  if (prestamosActivos().length >= MAX_PRESTAMOS) return "No se puede prestar: ya hay 3 préstamos activos.";
  return "";
}
function prestar(idLibro, persona) {
  persona = persona.trim();
  const error = errorPrestar(idLibro);
  if (error) return error;
  if (persona.length < 2 || persona.length > 40) return "El nombre debe tener entre 2 y 40 caracteres.";
  const h = hoy();
  estado.prestamos.push({
    id: nuevoId(), idLibro, persona,
    fechaPrestamo: h, fechaLimite: sumarDias(h, 14), fechaDevolucion: null
  });
  guardar();
  return "";
}
function devolver(idLibro) {
  const p = prestamoActivo(idLibro);
  if (!p) return "";
  p.fechaDevolucion = hoy();
  guardar();
  const retraso = diasRetraso(p);
  return retraso === 0 ? "Libro devuelto a tiempo." : "Libro devuelto con " + retraso + " día(s) de retraso.";
}

// ---------- Libros ----------
function validarLibro(datos, idEditando) {
  const errores = {};
  const titulo = datos.titulo.trim();
  const autor = datos.autor.trim();
  if (titulo.length < 3 || titulo.length > 60) errores.titulo = "El título debe tener entre 3 y 60 caracteres.";
  if (autor === "") errores.autor = "El autor no puede estar vacío.";
  if (!Number.isInteger(datos.anio) || datos.anio < 1000 || datos.anio > 2026) errores.anio = "El año debe estar entre 1000 y 2026.";
  const duplicado = estado.libros.some(l => l.id !== idEditando &&
    l.titulo.toLowerCase() === titulo.toLowerCase() && l.autor.toLowerCase() === autor.toLowerCase());
  if (!errores.titulo && duplicado) errores.titulo = "Ya existe un libro con ese título y autor.";
  if (idEditando && datos.coleccion && prestamoActivo(idEditando)) errores.coleccion = "Un libro prestado no puede ser de colección.";
  return errores;
}
function guardarLibro(datos, idEditando) {
  if (idEditando) {
    Object.assign(buscarLibro(idEditando), datos);
  } else {
    estado.libros.push({ id: nuevoId(), ...datos });
  }
  guardar();
}
function eliminarLibro(id) {
  if (prestamoActivo(id)) return "No se puede eliminar un libro con préstamo activo.";
  estado.libros = estado.libros.filter(l => l.id !== id);
  estado.prestamos = estado.prestamos.filter(p => p.idLibro !== id);
  guardar();
  return "";
}

// ---------- Filtrar, ordenar y resumir ----------
function filtrar(texto, estadoFiltro, genero) {
  const t = texto.trim().toLowerCase();
  return estado.libros.filter(l => {
    if (t && !l.titulo.toLowerCase().includes(t) && !l.autor.toLowerCase().includes(t)) return false;
    if (estadoFiltro === "disponibles" && !estaDisponible(l)) return false;
    if (estadoFiltro === "prestados" && !prestamoActivo(l.id)) return false;
    if (genero !== "todos" && l.genero !== genero) return false;
    return true;
  });
}
function ordenar(lista, campo, dir) {
  const copia = [...lista]; // no se altera el orden original
  copia.sort((a, b) => campo === "anio" ? a.anio - b.anio : a[campo].localeCompare(b[campo], "es"));
  if (dir === "desc") copia.reverse();
  return copia;
}
function resumen() {
  const r = {
    total: estado.libros.length,
    disponibles: estado.libros.filter(estaDisponible).length,
    prestados: prestamosActivos().length,
    vencidos: prestamosActivos().filter(estaVencido).length,
    porGenero: {}
  };
  estado.libros.forEach(l => { r.porGenero[l.genero] = (r.porGenero[l.genero] || 0) + 1; });
  return r;
}
