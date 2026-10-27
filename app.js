// INTERFAZ: dibuja la pantalla a partir de `estado` (ver logica.js).
const $ = id => document.getElementById(id);
let filtroEstado = "todos";
let idEditando = null;   // libro que se está editando (null = modo agregar)
let idModal = null;      // libro asociado al modal abierto

// ---------- Ayudas ----------
function crear(etiqueta, texto, clase) {
  const e = document.createElement(etiqueta);
  e.textContent = texto;
  if (clase) e.className = clase;
  return e;
}
function boton(texto, accion, deshabilitado, clase) {
  const b = crear("button", texto, clase);
  b.type = "button";
  b.disabled = Boolean(deshabilitado);
  b.addEventListener("click", accion);
  return b;
}
function mostrarMensaje(texto) { $("mensaje").textContent = texto; }

// ---------- Navegación ----------
function mostrarVista(nombre) {
  document.querySelectorAll("main > section").forEach(s => { s.hidden = s.id !== "vista-" + nombre; });
  document.querySelectorAll("nav a").forEach(a => a.classList.toggle("activo", a.dataset.vista === nombre));
  mostrarMensaje("");
}

// ---------- Catálogo ----------
function crearTarjeta(libro) {
  const p = prestamoActivo(libro.id);
  const tarjeta = crear("article", "", "tarjeta" + (p ? " prestado" : ""));
  tarjeta.append(crear("h3", libro.titulo), crear("p", libro.autor), crear("p", libro.anio + " · " + libro.genero));
  if (libro.coleccion) tarjeta.append(crear("span", "De colección", "etiqueta coleccion"));
  else if (p) tarjeta.append(crear("span", "Prestado", "etiqueta prestado"));
  else tarjeta.append(crear("span", "Disponible", "etiqueta disponible"));
  if (p) {
    tarjeta.append(crear("p", "Prestado a " + p.persona), crear("p", "Devolver antes del " + formatoFecha(p.fechaLimite)));
    if (estaVencido(p)) tarjeta.append(crear("span", "Vencido", "etiqueta vencido"));
  }
  const acciones = crear("div", "", "acciones");
  acciones.append(
    boton(p ? "Devolver" : "Prestar", () => prestarODevolver(libro), libro.coleccion),
    boton("Editar", () => editar(libro), false, "secundario"),
    boton("Eliminar", () => pedirEliminar(libro), false, "peligro")
  );
  tarjeta.append(acciones);
  return tarjeta;
}
function renderCatalogo() {
  const selector = $("filtro-genero");
  const actual = selector.value || "todos";
  const generos = [...new Set(estado.libros.map(l => l.genero))].sort();
  selector.replaceChildren(new Option("Todos", "todos"), ...generos.map(g => new Option(g, g)));
  selector.value = generos.includes(actual) ? actual : "todos";

  const filtrados = filtrar($("busqueda").value, filtroEstado, selector.value);
  const lista = ordenar(filtrados, estado.orden.campo, estado.orden.dir);
  $("contador").textContent = "Mostrando " + lista.length + " de " + estado.libros.length + " libros";
  $("lista-libros").replaceChildren(...lista.map(crearTarjeta));
}
function prestarODevolver(libro) {
  if (prestamoActivo(libro.id)) {
    mostrarMensaje(devolver(libro.id));
    renderTodo();
    return;
  }
  const error = errorPrestar(libro.id);
  if (error) { mostrarMensaje(error); return; }
  idModal = libro.id;
  $("persona").value = estado.usuario;
  $("error-persona").textContent = "";
  $("modal-prestar").hidden = false;
  $("persona").focus();
}
function pedirEliminar(libro) {
  if (prestamoActivo(libro.id)) {
    mostrarMensaje("No se puede eliminar «" + libro.titulo + "» porque tiene un préstamo activo.");
    return;
  }
  idModal = libro.id;
  $("texto-eliminar").textContent = "¿Eliminar «" + libro.titulo + "»?";
  $("modal-eliminar").hidden = false;
}
function cerrarModales() {
  $("modal-prestar").hidden = true;
  $("modal-eliminar").hidden = true;
}

// ---------- Mis préstamos ----------
function tituloDe(p) {
  const libro = buscarLibro(p.idLibro);
  return libro ? libro.titulo : "(libro eliminado)";
}
function renderPrestamos() {
  const activos = prestamosActivos().sort((a, b) => a.fechaLimite.localeCompare(b.fechaLimite));
  $("sin-activos").hidden = activos.length > 0;
  $("lista-activos").replaceChildren(...activos.map(p => {
    const li = crear("li", "", "item" + (estaVencido(p) ? " vencido-item" : ""));
    li.append(crear("strong", tituloDe(p)), crear("span", "Prestado a " + p.persona + " · Límite: " + formatoFecha(p.fechaLimite)));
    if (estaVencido(p)) li.append(crear("span", "Vencido: " + diasRetraso(p) + " día(s) de retraso", "etiqueta vencido"));
    li.append(boton("Devolver", () => { mostrarMensaje(devolver(p.idLibro)); renderTodo(); }));
    return li;
  }));

  const historial = estado.prestamos.filter(p => p.fechaDevolucion !== null)
    .sort((a, b) => b.fechaDevolucion.localeCompare(a.fechaDevolucion));
  $("sin-historial").hidden = historial.length > 0;
  $("lista-historial").replaceChildren(...historial.map(p => {
    const retraso = diasRetraso(p);
    const li = crear("li", "", "item");
    li.append(
      crear("strong", tituloDe(p)),
      crear("span", p.persona + " · Prestado: " + formatoFecha(p.fechaPrestamo) + " · Devuelto: " + formatoFecha(p.fechaDevolucion)),
      crear("span", retraso === 0 ? "A tiempo" : "Con " + retraso + " día(s) de retraso", "etiqueta")
    );
    return li;
  }));
}

// ---------- Resumen, menú y tema ----------
function renderResumen() {
  const r = resumen();
  const datos = [["Total de libros", r.total], ["Disponibles", r.disponibles], ["Prestados", r.prestados], ["Vencidos", r.vencidos]];
  const lineas = datos.map(([nombre, valor]) => crear("li", nombre + ": " + valor));
  for (const genero in r.porGenero) lineas.push(crear("li", "Género " + genero + ": " + r.porGenero[genero]));
  $("resumen").replaceChildren(...lineas);
}
function renderMenu() {
  $("enlace-prestamos").textContent = "Mis préstamos (" + prestamosActivos().length + ")";
  $("saludo").textContent = estado.usuario ? "Hola, " + estado.usuario : "";
  document.body.dataset.tema = estado.tema;
}
function renderTodo() {
  renderMenu();
  renderCatalogo();
  renderPrestamos();
  renderResumen();
}

// ---------- Formulario ----------
const CAMPOS_ERROR = ["titulo", "autor", "anio", "coleccion"];
function actualizarContador() { $("restantes").textContent = 120 - $("comentario").value.length; }
function limpiarFormulario() {
  $("formulario").reset();
  idEditando = null;
  CAMPOS_ERROR.forEach(c => { $("error-" + c).textContent = ""; });
  $("btn-enviar").textContent = "Agregar libro";
  $("cancelar-edicion").hidden = true;
  actualizarContador();
}
function editar(libro) {
  limpiarFormulario();
  idEditando = libro.id;
  $("titulo").value = libro.titulo;
  $("autor").value = libro.autor;
  $("anio").value = libro.anio;
  $("genero").value = libro.genero;
  $("comentario").value = libro.comentario || "";
  $("coleccion").checked = libro.coleccion;
  $("btn-enviar").textContent = "Guardar cambios";
  $("cancelar-edicion").hidden = false;
  actualizarContador();
  mostrarVista("formulario");
}

// ---------- Eventos ----------
document.querySelectorAll("nav a").forEach(a => {
  a.addEventListener("click", e => { e.preventDefault(); mostrarVista(a.dataset.vista); });
});
$("busqueda").addEventListener("input", renderCatalogo);
$("filtro-genero").addEventListener("change", renderCatalogo);
document.querySelectorAll(".filtros button").forEach(b => {
  b.addEventListener("click", () => {
    filtroEstado = b.dataset.estado;
    document.querySelectorAll(".filtros button").forEach(x => x.classList.toggle("activo", x === b));
    renderCatalogo();
  });
});
function cambiarOrden() {
  estado.orden = { campo: $("orden-campo").value, dir: $("orden-dir").value };
  guardar();
  renderCatalogo();
}
$("orden-campo").addEventListener("change", cambiarOrden);
$("orden-dir").addEventListener("change", cambiarOrden);

$("form-prestar").addEventListener("submit", e => {
  e.preventDefault();
  const error = prestar(idModal, $("persona").value);
  if (error) { $("error-persona").textContent = error; return; }
  cerrarModales();
  mostrarMensaje("Préstamo registrado.");
  renderTodo();
});
$("cancelar-prestar").addEventListener("click", cerrarModales);
$("cancelar-eliminar").addEventListener("click", cerrarModales);
$("confirmar-eliminar").addEventListener("click", () => {
  const error = eliminarLibro(idModal);
  cerrarModales();
  if (idEditando === idModal) limpiarFormulario();
  mostrarMensaje(error || "Libro eliminado.");
  renderTodo();
});

$("comentario").addEventListener("input", actualizarContador);
$("cancelar-edicion").addEventListener("click", limpiarFormulario);
$("formulario").addEventListener("submit", e => {
  e.preventDefault();
  const datos = {
    titulo: $("titulo").value, autor: $("autor").value, anio: Number($("anio").value),
    genero: $("genero").value, comentario: $("comentario").value, coleccion: $("coleccion").checked
  };
  const errores = validarLibro(datos, idEditando);
  CAMPOS_ERROR.forEach(c => { $("error-" + c).textContent = errores[c] || ""; });
  const primero = CAMPOS_ERROR.find(c => errores[c]);
  if (primero) { $(primero).focus(); return; }
  datos.titulo = datos.titulo.trim();
  datos.autor = datos.autor.trim();
  const editando = idEditando !== null;
  guardarLibro(datos, idEditando);
  limpiarFormulario();
  renderTodo();
  mostrarMensaje(editando ? "Cambios guardados." : "Libro agregado.");
});

document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("modal-prestar").hidden || !$("modal-eliminar").hidden) { cerrarModales(); return; }
  limpiarFormulario();
});

document.querySelectorAll(".btn-tema").forEach(b => {
  b.addEventListener("click", () => {
    estado.tema = estado.tema === "claro" ? "oscuro" : "claro";
    guardar();
    renderMenu();
  });
});
$("usuario").addEventListener("input", () => {
  estado.usuario = $("usuario").value.trim();
  guardar();
  renderMenu();
});
$("btn-reset").addEventListener("click", () => {
  localStorage.removeItem(CLAVE);
  estado = datosIniciales();
  cargarControles();
  limpiarFormulario();
  renderTodo();
  mostrarMensaje("Biblioteca restablecida.");
});

// ---------- Inicio ----------
function cargarControles() {
  $("orden-campo").value = estado.orden.campo;
  $("orden-dir").value = estado.orden.dir;
  $("usuario").value = estado.usuario;
}
$("genero").replaceChildren(...GENEROS.map(g => new Option(g, g)));
cargarControles();
mostrarVista("catalogo");
renderTodo();
