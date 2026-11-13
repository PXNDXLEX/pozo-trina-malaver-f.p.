import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import "../styles/alerts.css";

/**
 * Detecta el tipo de alerta e icono a partir del contenido del mensaje
 */
function detectarTipo(mensaje) {
  const msg = String(mensaje).toLowerCase();

  if (
    msg.includes("🎉") ||
    msg.includes("exitosamente") ||
    msg.includes("éxito") ||
    msg.includes("actualizado con éxito") ||
    msg.includes("registrado con éxito") ||
    msg.includes("eliminado con éxito") ||
    msg.includes("se creó") ||
    msg.includes("se creo")
  ) {
    return {
      icon: "success",
      title: "¡Operación Exitosa!",
      timer: 4000,
    };
  }

  if (
    msg.includes("⚠️") ||
    msg.includes("inválid") ||
    msg.includes("invalido") ||
    msg.includes("inválida") ||
    msg.includes("obligatori") ||
    msg.includes("atención") ||
    msg.includes("atencion") ||
    msg.includes("ya pertenece") ||
    msg.includes("ya existe") ||
    msg.includes("ya está") ||
    msg.includes("única") ||
    msg.includes("unica") ||
    msg.includes("debe tener") ||
    msg.includes("por favor ingresa") ||
    msg.includes("indica")
  ) {
    return {
      icon: "warning",
      title: "Atención Requerida",
      timer: null,
    };
  }

  if (
    msg.includes("error") ||
    msg.includes("fallo") ||
    msg.includes("falló") ||
    msg.includes("incorrect") ||
    msg.includes("no se pudo")
  ) {
    return {
      icon: "error",
      title: "Error en la Operación",
      timer: null,
    };
  }

  return {
    icon: "info",
    title: "Notificación del Sistema",
    timer: 3500,
  };
}

/**
 * Limpia emojis decorativos al inicio del texto para no redundar con el icono
 */
function limpiarMensaje(texto) {
  if (typeof texto !== "string") return String(texto || "");
  return texto
    .replace(/^[\s🎉⚠️✅❌⏳ℹ️]+/, "")
    .replace(/^¡+/, "¡")
    .replace(/\n/g, "<br/>")
    .trim();
}

/**
 * Muestra una ventana flotante moderna con diseño Glassmorphism Dark
 */
export function mostrarAlerta(mensaje, opciones = {}) {
  const detectado = detectarTipo(mensaje);
  const icon = opciones.icon || detectado.icon;
  const title = opciones.title || detectado.title;
  const timer = opciones.timer !== undefined ? opciones.timer : detectado.timer;
  const textoLimpio = opciones.raw ? mensaje : limpiarMensaje(mensaje);

  return Swal.fire({
    title,
    html: `<div class="pozo-alert-body">${textoLimpio}</div>`,
    icon,
    background: "#131c2e",
    color: "#f8fafc",
    backdrop: "rgba(11, 15, 25, 0.75)",
    buttonsStyling: false,
    confirmButtonText: opciones.confirmButtonText || "Aceptar",
    timer,
    timerProgressBar: Boolean(timer),
    showCloseButton: true,
    customClass: {
      popup: "pozo-swal-popup",
      title: "pozo-swal-title",
      htmlContainer: "pozo-swal-html",
      actions: "pozo-swal-actions",
      confirmButton: "pozo-swal-confirm-btn",
      cancelButton: "pozo-swal-cancel-btn",
      timerProgressBar: "pozo-swal-progress",
      closeButton: "pozo-swal-close-btn",
    },
    showClass: {
      popup: "pozo-swal-animate-in",
    },
    hideClass: {
      popup: "pozo-swal-animate-out",
    },
    ...opciones,
  });
}

/**
 * Notificación Toast flotante en esquina superior derecha
 */
export function mostrarToast(mensaje, tipo = "success", timer = 3500) {
  const Toast = Swal.mixin({
    toast: true,
    position: "top-end",
    showConfirmButton: false,
    timer,
    timerProgressBar: true,
    background: "#131c2e",
    color: "#f8fafc",
    customClass: {
      popup: "pozo-toast-popup",
      timerProgressBar: "pozo-swal-progress",
    },
    didOpen: (toast) => {
      toast.addEventListener("mouseenter", Swal.stopTimer);
      toast.addEventListener("mouseleave", Swal.resumeTimer);
    },
  });

  return Toast.fire({
    icon: tipo,
    title: limpiarMensaje(mensaje),
  });
}

/**
 * Diálogo de confirmación moderno (reemplazo de window.confirm)
 */
export async function confirmarAccion({
  titulo = "¿Estás seguro?",
  mensaje = "Esta acción no se puede deshacer.",
  textoConfirmar = "Sí, continuar",
  textoCancelar = "Cancelar",
  esPeligroso = true,
}) {
  const result = await Swal.fire({
    title: titulo,
    html: `<div class="pozo-alert-body">${mensaje}</div>`,
    icon: esPeligroso ? "warning" : "question",
    showCancelButton: true,
    confirmButtonText: textoConfirmar,
    cancelButtonText: textoCancelar,
    reverseButtons: true,
    buttonsStyling: false,
    background: "#131c2e",
    color: "#f8fafc",
    backdrop: "rgba(11, 15, 25, 0.8)",
    customClass: {
      popup: "pozo-swal-popup",
      title: "pozo-swal-title",
      htmlContainer: "pozo-swal-html",
      actions: "pozo-swal-actions",
      confirmButton: esPeligroso ? "pozo-swal-danger-btn" : "pozo-swal-confirm-btn",
      cancelButton: "pozo-swal-cancel-btn",
      closeButton: "pozo-swal-close-btn",
    },
    showClass: {
      popup: "pozo-swal-animate-in",
    },
    hideClass: {
      popup: "pozo-swal-animate-out",
    },
  });

  return result.isConfirmed;
}

/**
 * Intercepta globalmente window.alert para que TODOS los avisos nativos en blanco
 * del navegador se muestren automáticamente como ventanas flotantes modernas.
 */
export function initModernAlerts() {
  if (typeof window !== "undefined") {
    window.alert = (mensaje) => {
      mostrarAlerta(mensaje);
    };
  }
}
