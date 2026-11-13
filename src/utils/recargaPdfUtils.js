import { jsPDF } from "jspdf";
import Swal from "sweetalert2";
import { supabase } from "../supabase/supabase.config";

/**
 * Convierte un archivo, Blob o URL remota a base64 DataURL
 * y extrae sus dimensiones y relación de aspecto (aspect ratio) reales.
 */
export async function cargarImagenConDimensiones(urlOrBlob) {
  if (!urlOrBlob) return null;
  try {
    // 1. Caso File o Blob directo (subido desde el input o estado de React)
    if (typeof urlOrBlob !== "string" && (urlOrBlob instanceof Blob || urlOrBlob instanceof File)) {
      const dataUri = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(urlOrBlob);
      });
      if (!dataUri) return null;
      return await procesarDataUriConDimensiones(dataUri);
    }

    // 2. Caso string (DataURL, Blob URL o URL remota de Supabase Storage)
    if (typeof urlOrBlob === "string") {
      if (urlOrBlob.startsWith("data:image")) {
        return await procesarDataUriConDimensiones(urlOrBlob);
      }

      return await new Promise((resolve) => {
        const img = new Image();
        // NOTA IMPORTANTE: En URLs blob: locales o data:, crossOrigin produce SecurityError en varios navegadores
        if (!urlOrBlob.startsWith("blob:") && !urlOrBlob.startsWith("data:")) {
          img.crossOrigin = "anonymous";
        }

        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            const maxDim = 850;
            let width = img.naturalWidth || img.width || 800;
            let height = img.naturalHeight || img.height || 600;
            const aspectRatio = width / (height || 1);

            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0, width, height);
            const dataUri = canvas.toDataURL("image/jpeg", 0.88);

            resolve({
              dataUri,
              width,
              height,
              aspectRatio: aspectRatio || 4 / 3,
            });
          } catch (e) {
            console.warn("Fallo procesando imagen a canvas:", e);
            resolve(null);
          }
        };

        img.onerror = (e) => {
          console.warn("No se pudo cargar la imagen:", urlOrBlob, e);
          resolve(null);
        };

        setTimeout(() => resolve(null), 4000);
        img.src = urlOrBlob;
      });
    }
  } catch (err) {
    console.warn("Fallo general en cargarImagenConDimensiones:", err);
    return null;
  }
  return null;
}

/**
 * Helper para obtener dimensiones a partir de un DataURL
 */
function procesarDataUriConDimensiones(dataUri) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const width = img.naturalWidth || img.width || 800;
      const height = img.naturalHeight || img.height || 600;
      resolve({
        dataUri,
        width,
        height,
        aspectRatio: width / (height || 1) || 4 / 3,
      });
    };
    img.onerror = () => resolve(null);
    img.src = dataUri;
  });
}

/**
 * Calcula las dimensiones y posición (x, w, h) para que la imagen quede
 * perfectamente cuadrada, centrada y sin deformaciones dentro del ticket de 80mm.
 */
function calcularDimensionesImagen(aspectRatio = 1.33, maxW = 66, maxH = 46) {
  let w = maxW;
  let h = w / aspectRatio;

  if (h > maxH) {
    h = maxH;
    w = h * aspectRatio;
  }

  // Centrado horizontal en el ticket de 80mm
  const x = Number(((80 - w) / 2).toFixed(2));
  return { x, w: Number(w.toFixed(2)), h: Number(h.toFixed(2)) };
}

/**
 * Dibuja de manera inteligente la imagen encuadrada con marco y centrado estético
 */
function dibujarImagenEncuadrada(doc, imgData, y, etiqueta) {
  const { x, w, h } = calcularDimensionesImagen(imgData.aspectRatio, 66, 46);

  // Etiqueta del encabezado de la foto
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.setTextColor(51, 65, 85);
  doc.text(etiqueta, 40, y, { align: "center" });

  const imgY = y + 2.5;

  // Fondo sutil y marco con bordes redondeados para un acabado cuadrado y prolijo
  doc.setFillColor(241, 245, 249);
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.35);
  doc.roundedRect(x - 1, imgY - 1, w + 2, h + 2, 2, 2, "FD");

  // Inserción de la imagen sin distorsión
  doc.addImage(imgData.dataUri, "JPEG", x, imgY, w, h);

  // Retorna la nueva coordenada vertical Y para que el texto continúe abajo de forma armónica
  return imgY + h + 6;
}

/**
 * Acomoda inteligentemente una o múltiples fotos de camiones en el ticket de 80mm:
 * - Si es 1 foto: se encuadra centrada ocupando el ancho del ticket manteniendo proporciones.
 * - Si son 2 o más fotos: se distribuyen en una cuadrícula simétrica de 2 columnas (33.5mm de ancho c/u),
 *   con marco redondeado, tarjeta con identificador de la recarga, monto y fecha/hora de la carga.
 * - Si la cantidad es impar, la última foto se centra en la fila inferior para mantener perfecto balance estético.
 */
function dibujarGaleriaFotosCamion(doc, fotosCamion, startY) {
  if (!fotosCamion || fotosCamion.length === 0) return startY;

  let curY = startY;

  // CASO A: 1 Sola Foto
  if (fotosCamion.length === 1) {
    const foto = fotosCamion[0];
    const { x, w, h } = calcularDimensionesImagen(foto.imgData.aspectRatio, 66, 44);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text("Evidencia Fotográfica de la Cisterna en Pozo", 40, curY, { align: "center" });

    const imgY = curY + 2.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.35);
    doc.roundedRect(x - 1, imgY - 1, w + 2, h + 2, 2, 2, "FD");

    doc.addImage(foto.imgData.dataUri, "JPEG", x, imgY, w, h);

    if (foto.fecha && foto.hora) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text(`Captura: ${foto.fecha} ${foto.hora}`, 40, imgY + h + 3.8, { align: "center" });
      return imgY + h + 8;
    }

    return imgY + h + 6;
  }

  // CASO B: Múltiples Fotos (Cuadrícula Inteligente de 2 Columnas)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(`EVIDENCIAS FOTOGRÁFICAS EN POZO (${fotosCamion.length} FOTOS)`, 40, curY, { align: "center" });

  curY += 3.5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.8);
  doc.setTextColor(100, 116, 139);
  doc.text("Registro visual de la cisterna en cada recarga liquidada", 40, curY, { align: "center" });

  curY += 3.5;

  const colWidth = 33.5;
  const cardHeight = 33;
  const gapY = 2.5;

  for (let i = 0; i < fotosCamion.length; i++) {
    const foto = fotosCamion[i];
    const isOddTotal = fotosCamion.length % 2 === 1;
    const isLast = i === fotosCamion.length - 1;

    let cellX = 5;
    const rowIndex = Math.floor(i / 2);

    if (isOddTotal && isLast) {
      // Centrar la última foto impar en la fila inferior
      cellX = Number(((80 - colWidth) / 2).toFixed(2));
    } else {
      const colIndex = i % 2;
      cellX = colIndex === 0 ? 5 : 41.5;
    }

    const cellY = curY + rowIndex * (cardHeight + gapY);

    // Tarjeta contenedora con esquinas redondeadas
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.3);
    doc.roundedRect(cellX, cellY, colWidth, cardHeight, 1.8, 1.8, "FD");

    // Título superior de la tarjeta (N° Recarga y Monto)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    const tituloCard = `Recarga #${foto.index || i + 1} • $${Number(foto.monto || 0).toFixed(2)}`;
    doc.text(tituloCard, cellX + colWidth / 2, cellY + 3.4, { align: "center" });

    // Dimensiones óptimas de la imagen dentro de la celda manteniendo su proporción
    const maxImgW = 31;
    const maxImgH = 22;
    let imgW = maxImgW;
    let imgH = imgW / foto.imgData.aspectRatio;
    if (imgH > maxImgH) {
      imgH = maxImgH;
      imgW = imgH * foto.imgData.aspectRatio;
    }

    const imgX = cellX + (colWidth - imgW) / 2;
    const imgY = cellY + 4.2 + (maxImgH - imgH) / 2;

    doc.addImage(foto.imgData.dataUri, "JPEG", imgX, imgY, imgW, imgH);

    // Pie de la tarjeta con fecha y hora de la recarga
    doc.setFont("helvetica", "normal");
    doc.setFontSize(5.8);
    doc.setTextColor(100, 116, 139);
    const pieCard = `${foto.fecha || ""} ${foto.hora || ""}`.trim() || `Viaje #${foto.index || i + 1}`;
    doc.text(pieCard, cellX + colWidth / 2, cellY + cardHeight - 1.8, { align: "center" });
  }

  const numFilas = Math.ceil(fotosCamion.length / 2);
  curY += numFilas * (cardHeight + gapY) + 4;
  return curY;
}

/**
 * Extrae la fecha en formato DD-MM-YYYY para nombres de archivo limpios y ordenados
 */
export function formatearFechaParaArchivo(fechaValor) {
  const f = fechaValor ? new Date(fechaValor) : new Date();
  const d = isNaN(f.getTime()) ? new Date() : f;
  const anio = d.getFullYear();
  const mes = String(d.getMonth() + 1).padStart(2, "0");
  const dia = String(d.getDate()).padStart(2, "0");
  return `${dia}-${mes}-${anio}`;
}

/**
 * Normaliza y limpia la cédula para que sea segura en nombres de archivo
 */
export function formatearCedula(cedulaRaw) {
  if (!cedulaRaw) return "";
  return String(cedulaRaw).replace(/[^\w]/g, "").trim();
}

/**
 * Formatea valores numéricos a dólares ($X.XX)
 */
export function formatearMonto(val) {
  const num = Number(val) || 0;
  return "$" + num.toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Extrae fecha y hora legibles en español
 */
export function extraerFechaHora(fechaValor) {
  const f = fechaValor ? new Date(fechaValor) : new Date();
  const fechaValida = isNaN(f.getTime()) ? new Date() : f;

  const dia = fechaValida.getDate();
  const mes = fechaValida.getMonth() + 1;
  const anio = fechaValida.getFullYear();
  const strFecha = `${dia}/${mes}/${anio}`;

  let horas = fechaValida.getHours();
  const minutos = String(fechaValida.getMinutes()).padStart(2, "0");
  const segundos = String(fechaValida.getSeconds()).padStart(2, "0");
  const ampm = horas >= 12 ? "p.m." : "a.m.";
  horas = horas % 12;
  horas = horas ? horas : 12;
  const strHora = `${horas}:${minutos}:${segundos} ${ampm}`;

  return {
    fecha: strFecha,
    hora: strHora,
    iso: fechaValida.toISOString(),
  };
}

/**
 * =========================================================================
 * 1. GENERADOR DE NOTA DE ENTREGA / DESPACHO DE RECARGA (TICKET 80mm)
 * =========================================================================
 * Integra de manera inteligente la foto del camión tomada en pozo.
 */
export async function generarNotaEntregaPDF({
  camion,
  monto,
  metodo,
  referencia,
  fecha,
  nota,
  estatus,
  fotoUrl,
  cedula,
}) {
  const { fecha: strFecha, hora: strHora } = extraerFechaHora(fecha);
  const esPagado = String(estatus).toLowerCase() === "pagado";
  const placa = camion?.placa || "Sin Placa";
  const chofer = camion?.chofer || "No Especificado";
  const capacidad = camion?.capacidad ? `${camion.capacidad} Lts` : null;

  // Cédula del camionero y fecha en que se registra
  const cedulaCamionero = formatearCedula(cedula || camion?.cedula || camion?.camioneros?.cedula);
  const fechaArchivo = formatearFechaParaArchivo(fecha);
  const idArchivo = cedulaCamionero || placa.replace(/\s+/g, "_");
  const nombreArchivo = `Nota_Entrega_${idArchivo}_${fechaArchivo}.pdf`;

  // Carga inteligente de la foto del camión con proporciones reales
  const imgCamion = await cargarImagenConDimensiones(fotoUrl);

  // Cálculo dinámico de altura total del ticket
  let alturaTotal = 90;
  if (capacidad) alturaTotal += 6;
  if (metodo && metodo !== "Efectivo") alturaTotal += 6;
  if (referencia) alturaTotal += 6;
  if (nota && nota.trim()) alturaTotal += 14;

  if (imgCamion) {
    const { h } = calcularDimensionesImagen(imgCamion.aspectRatio, 66, 46);
    alturaTotal += h + 15;
  }
  alturaTotal = Math.max(125, alturaTotal + 10);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, alturaTotal] });

  // 1. Encabezado principal
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42);
  doc.text("POZO TRINA MALAVER F.P.", 40, 10, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(71, 85, 105);
  doc.text("Comprobante de Recarga Digital", 40, 15, { align: "center" });
  doc.text("Nota de Entrega y Despacho de Cisterna", 40, 19, { align: "center" });

  doc.setFontSize(8);
  doc.text("----------------------------------------------------------------", 40, 23, { align: "center" });

  // 2. Fecha y hora
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Fecha:", 5, 28);
  doc.setFont("helvetica", "normal");
  doc.text(`${strFecha}   Hora: ${strHora}`, 17, 28);

  // 3. Chofer y Placa
  let curY = 35;
  doc.setFont("helvetica", "bold");
  doc.text("Chofer:", 5, curY);
  doc.setFont("helvetica", "normal");
  let textoChofer = chofer;
  if (cedulaCamionero) {
    textoChofer += ` (C.I. ${cedulaCamionero})`;
  }
  doc.text(`${textoChofer}`, 20, curY);

  curY += 6;
  doc.setFont("helvetica", "bold");
  doc.text("Placa Unidad:", 5, curY);
  doc.setFont("helvetica", "normal");
  doc.text(`${placa}`, 27, curY);

  if (capacidad) {
    curY += 6;
    doc.setFont("helvetica", "bold");
    doc.text("Capacidad:", 5, curY);
    doc.setFont("helvetica", "normal");
    doc.text(`${capacidad}`, 24, curY);
  }

  curY += 5;
  doc.setFontSize(8);
  doc.text("----------------------------------------------------------------", 40, curY, { align: "center" });
  curY += 6;

  // 4. Método de pago / Condición
  doc.setFontSize(8.5);
  if (esPagado) {
    doc.setFont("helvetica", "bold");
    doc.text("Método de Pago:", 5, curY);
    doc.setFont("helvetica", "normal");
    doc.text(`${metodo || "Efectivo"}`, 32, curY);

    if (referencia && metodo !== "Efectivo") {
      curY += 6;
      doc.setFont("helvetica", "bold");
      doc.text("Referencia:", 5, curY);
      doc.setFont("helvetica", "normal");
      doc.text(`${referencia}`, 24, curY);
    }
  } else {
    doc.setFont("helvetica", "bold");
    doc.text("Condición:", 5, curY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(220, 38, 38);
    doc.text("Carga a Crédito (Deuda Pendiente)", 24, curY);
    doc.setTextColor(15, 23, 42);
  }

  curY += 5;

  // 5. Caja destacada de TOTAL
  doc.setFillColor(241, 245, 249);
  doc.rect(4, curY, 72, 12, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text(esPagado ? "TOTAL PAGADO:" : "TOTAL A PAGAR:", 8, curY + 8);
  doc.text(`$${Number(monto || 0).toFixed(2)}`, 72, curY + 8, { align: "right" });

  curY += 17;

  // 6. Mensaje de autorización
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  if (esPagado) {
    doc.text("¡Gracias por su pago! Recarga autorizada.", 40, curY, { align: "center" });
  } else {
    doc.text("¡Recarga despachada! Pendiente por conciliar en taquilla.", 40, curY, { align: "center" });
  }

  // 7. Observación / Nota
  if (nota && nota.trim()) {
    curY += 7;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text("Nota / Observación:", 5, curY);
    doc.setFont("helvetica", "normal");
    const lineasNota = doc.splitTextToSize(nota.trim(), 68);
    curY += 4;
    doc.text(lineasNota, 5, curY);
    curY += (lineasNota.length - 1) * 4;
  }

  // 8. 📸 Registro Fotográfico del Camión en Pozo (Encuadrado de manera inteligente)
  if (imgCamion) {
    curY += 7;
    curY = dibujarImagenEncuadrada(
      doc,
      imgCamion,
      curY,
      "Registro Fotográfico de la Cisterna en Pozo"
    );
  }

  // 9. Pie de página
  curY = Math.max(curY + 3, alturaTotal - 7);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(148, 163, 184);
  doc.text("Pozo Trina Malaver F.P. • Sistema Digital de Despacho", 40, curY, { align: "center" });

  return {
    doc,
    nombreArchivo,
    placa,
    chofer,
    cedula: cedulaCamionero,
    fechaArchivo,
    monto,
    metodo,
    referencia,
    strFecha,
    strHora,
    esPagado,
  };
}

/**
 * =========================================================================
 * 2. GENERADOR DE COMPROBANTE DE PAGO (RECIBO OFICIAL DE CAJA - 80mm)
 * =========================================================================
 * Da fe del pago y anexa también las fotos del camión cisterna registradas.
 * - Si es 1 recarga: muestra foto encuadrada centrada a ancho completo.
 * - Si es un pago de varias recargas: desglose de viajes y cuadrícula
 *   inteligente de fotos de camiones tomadas en cada recarga despachada.
 */
export async function generarComprobantePagoPDF(pago) {
  // 1. Detección y normalización de recargas (individual o lote consolidado)
  let recargas = Array.isArray(pago?.recargas) && pago.recargas.length > 0
    ? pago.recargas
    : (Array.isArray(pago?.viajes) && pago.viajes.length > 0 ? pago.viajes : null);

  // Si no vienen precargadas pero existe pago_id, buscar recargas hermanas del mismo cobro
  if (!recargas && pago?.pago_id) {
    try {
      const { data: recsDb } = await supabase
        .from("registros_carga")
        .select(`
          id,
          monto,
          metodo,
          referencia,
          fecha_carga,
          url_foto,
          url_comprobante,
          estatus,
          pago_id,
          camiones ( id, placa, chofer, capacidad, modelo, camionero_id, perfil_id )
        `)
        .eq("pago_id", pago.pago_id)
        .order("fecha_carga", { ascending: true });

      if (recsDb && recsDb.length > 1) {
        recargas = recsDb;
      }
    } catch (errDb) {
      console.warn("No se pudieron consultar recargas hermanas del pago_id:", errDb);
    }
  }

  const esLote = Boolean(recargas && recargas.length > 1);
  const recargasLista = esLote ? recargas : [pago];

  // 2. Extracción de datos del camión y chofer
  const camionBase = pago?.camiones || (recargas && recargas[0]?.camiones) || {};
  const placa = camionBase?.placa || pago?.placa || "Sin Placa";
  const chofer = camionBase?.chofer || pago?.chofer || "Cliente / Chofer";
  const capacidad = camionBase?.capacidad ? `${camionBase.capacidad} Lts` : null;
  const modelo = camionBase?.modelo || null;

  // Cédula del camionero y fecha en que se registra
  const cedulaCamionero = formatearCedula(
    camionBase?.cedula ||
    camionBase?.camioneros?.cedula ||
    pago?.cedula ||
    pago?.chofer_cedula
  );

  const fechaReferencia =
    pago?.fecha_carga ||
    (recargas && recargas[recargas.length - 1]?.fecha_carga) ||
    new Date().toISOString();
  const { fecha: strFecha, hora: strHora } = extraerFechaHora(fechaReferencia);
  const fechaArchivo = formatearFechaParaArchivo(fechaReferencia);
  const idArchivo = cedulaCamionero || placa.replace(/\s+/g, "_");
  const nombreArchivo = `Comprobante_Pago_${idArchivo}_${fechaArchivo}.pdf`;

  const metodo = pago?.metodo || (recargas && recargas[0]?.metodo) || "Efectivo";
  const referencia = pago?.referencia || (recargas && recargas[0]?.referencia) || null;
  const monto = esLote
    ? recargas.reduce((sum, r) => sum + (Number(r.monto) || 0), 0)
    : (Number(pago?.monto) || 0);

  const numRecibo = String(pago?.id || pago?.pago_id || Date.now()).replace(/\D/g, "").slice(-6) || "001234";

  // 3. 📸 Carga inteligente de todas las fotos de camión registradas en pozo
  const promesasFotos = recargasLista.map(async (r, idx) => {
    const url = r.url_foto || r.foto_camion || r.fotoUrl;
    if (!url) return null;
    const imgData = await cargarImagenConDimensiones(url);
    if (!imgData) return null;
    const { fecha: fStr, hora: hStr } = extraerFechaHora(r.fecha_carga);
    return {
      imgData,
      fecha: fStr,
      hora: hStr,
      monto: Number(r.monto) || 0,
      index: idx + 1,
      capacidad: r.camiones?.capacidad || r.capacidad || null,
    };
  });
  const fotosCamionValidas = (await Promise.all(promesasFotos)).filter(Boolean);

  // Carga del soporte bancario si existe (url_comprobante)
  const fotoComprobanteUrl =
    pago?.url_comprobante ||
    (recargas && recargas.find((r) => r.url_comprobante)?.url_comprobante) ||
    null;
  const imgComprobante = await cargarImagenConDimensiones(fotoComprobanteUrl);

  // 4. Cálculo de altura total adaptativa según el contenido
  let alturaTotal = 118;
  if (capacidad || modelo) alturaTotal += 6;
  if (referencia) alturaTotal += 6;

  // Si es un lote con múltiples recargas, sumar altura de la tabla de desglose
  if (esLote) {
    alturaTotal += 16 + recargasLista.length * 5.2;
  }

  // Galería de fotos de los camiones
  if (fotosCamionValidas.length === 1) {
    const { h } = calcularDimensionesImagen(fotosCamionValidas[0].imgData.aspectRatio, 66, 44);
    alturaTotal += h + 15;
  } else if (fotosCamionValidas.length >= 2) {
    const numFilas = Math.ceil(fotosCamionValidas.length / 2);
    alturaTotal += 14 + numFilas * 35.5;
  }

  // Soporte bancario si existe
  if (imgComprobante) {
    const { h } = calcularDimensionesImagen(imgComprobante.aspectRatio, 66, 44);
    alturaTotal += h + 15;
  }

  alturaTotal = Math.max(130, alturaTotal + 15);

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, alturaTotal] });

  // 1. Encabezado Oficial
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12.5);
  doc.setTextColor(15, 23, 42);
  doc.text("POZO TRINA MALAVER F.P.", 40, 10, { align: "center" });

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(2, 132, 199);
  doc.text("COMPROBANTE OFICIAL DE PAGO", 40, 15, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text("Constancia de Cancelación y Solvencia", 40, 19, { align: "center" });

  doc.setFontSize(8);
  doc.text("================================================", 40, 23, { align: "center" });

  // 2. Control del Comprobante
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 23, 42);
  const reciboTexto = esLote
    ? `N° RECIBO: REC-${numRecibo} (${recargasLista.length} RECARGAS)`
    : `N° RECIBO: REC-${numRecibo}`;
  doc.text(reciboTexto, 5, 28);
  doc.setFont("helvetica", "normal");
  doc.text(`Fecha: ${strFecha}  ${strHora}`, 5, 33);

  doc.text("----------------------------------------------------------------", 40, 37, { align: "center" });

  // 3. Datos del Pagador / Chofer
  let curY = 42;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.text("Recibido de:", 5, curY);
  doc.setFont("helvetica", "normal");
  let textoChofer = chofer;
  if (cedulaCamionero) {
    textoChofer += ` (C.I. ${cedulaCamionero})`;
  }
  doc.text(`${textoChofer}`, 26, curY);

  curY += 5.5;
  doc.setFont("helvetica", "bold");
  doc.text("Unidad Cisterna:", 5, curY);
  doc.setFont("helvetica", "normal");
  let detalleCamion = placa;
  if (capacidad) detalleCamion += ` (${capacidad})`;
  if (modelo) detalleCamion += ` - ${modelo}`;
  doc.text(`${detalleCamion}`, 30, curY);

  curY += 5;
  doc.setFontSize(8);
  doc.text("----------------------------------------------------------------", 40, curY, { align: "center" });
  curY += 6;

  // 4. Detalle de qué pago se registró
  doc.setFontSize(8.5);
  doc.setFont("helvetica", "bold");
  doc.text("Concepto:", 5, curY);
  doc.setFont("helvetica", "normal");
  const conceptoTexto = esLote
    ? `Cancelación Consolidada de ${recargasLista.length} Recargas de Cisterna`
    : "Cancelación de Recarga de Agua Cisterna";
  doc.text(conceptoTexto, 22, curY);

  curY += 5.5;
  doc.setFont("helvetica", "bold");
  doc.text("Forma de Pago:", 5, curY);
  doc.setFont("helvetica", "normal");
  doc.text(`${metodo}`, 29, curY);

  if (referencia) {
    curY += 5.5;
    doc.setFont("helvetica", "bold");
    doc.text("N° Referencia:", 5, curY);
    doc.setFont("helvetica", "normal");
    doc.text(`${referencia}`, 27, curY);
  } else if (metodo === "Efectivo") {
    curY += 5.5;
    doc.setFont("helvetica", "bold");
    doc.text("Modalidad:", 5, curY);
    doc.setFont("helvetica", "normal");
    doc.text("Pago en Taquilla (Efectivo Verificado)", 23, curY);
  }

  curY += 5.5;
  doc.setFont("helvetica", "bold");
  doc.text("Estado:", 5, curY);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(22, 163, 74);
  doc.text("CONCILIADO Y PAGADO ✓", 18, curY);
  doc.setTextColor(15, 23, 42);

  // TABLA DE DESGLOSE CUANDO SON MÚLTIPLES RECARGAS
  if (esLote) {
    curY += 6;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(30, 41, 59);
    doc.text(`DESGLOSE DE RECARGAS LIQUIDADAS (${recargasLista.length}):`, 5, curY);

    curY += 3.5;
    doc.setFillColor(241, 245, 249);
    doc.rect(4, curY, 72, 5, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(6.8);
    doc.setTextColor(71, 85, 105);
    doc.text("#", 6, curY + 3.5);
    doc.text("Fecha y Hora", 12, curY + 3.5);
    doc.text("Capacidad", 48, curY + 3.5);
    doc.text("Monto", 74, curY + 3.5, { align: "right" });

    curY += 5.5;

    recargasLista.forEach((r, idx) => {
      const { fecha: fR, hora: hR } = extraerFechaHora(r.fecha_carga);
      const capR = r.camiones?.capacidad || r.capacidad ? `${r.camiones?.capacidad || r.capacidad} L` : "--";
      const montoR = Number(r.monto) || 0;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(6.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${idx + 1}`, 6, curY + 3);
      doc.text(`${fR} ${hR}`, 12, curY + 3);
      doc.text(`${capR}`, 48, curY + 3);
      doc.setFont("helvetica", "bold");
      doc.text(`$${montoR.toFixed(2)}`, 74, curY + 3, { align: "right" });

      curY += 4.5;
    });

    curY += 1;
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.2);
    doc.line(4, curY, 76, curY);
  }

  curY += 5;

  // 5. Cuadro Destacado del Total Pagado
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(34, 197, 94);
  doc.rect(4, curY, 72, 12, "FD");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(21, 128, 61);
  const labelTotal = esLote ? `TOTAL PAGADO (${recargasLista.length}):` : "TOTAL PAGADO:";
  doc.text(labelTotal, 8, curY + 8);
  doc.text(`$${monto.toFixed(2)} USD`, 72, curY + 8, { align: "right" });

  curY += 17;

  // 6. Fe y Certificación Administrativa
  doc.setFont("helvetica", "italic");
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105);
  const textoFe = esLote
    ? `Por medio del presente documento, POZO TRINA MALAVER F.P. hace constar que ha recibido satisfactoriamente el importe de $${monto.toFixed(2)} USD dando fe y solvencia del pago registrado por las ${recargasLista.length} recargas de agua cisterna detalladas.`
    : "Por medio del presente documento, POZO TRINA MALAVER F.P. hace constar que ha recibido satisfactoriamente el importe descrito dando fe y solvencia del pago registrado.";
  const lineasFe = doc.splitTextToSize(textoFe, 70);
  doc.text(lineasFe, 5, curY);
  curY += lineasFe.length * 3.5 + 4;

  // 7. 📸 FOTOS DE LOS CAMIONES EN POZO (Acomodo inteligente individual o cuadrícula 2 columnas)
  if (fotosCamionValidas.length > 0) {
    curY += 2;
    curY = dibujarGaleriaFotosCamion(doc, fotosCamionValidas, curY);
  }

  // 8. Soporte Bancario si existe
  if (imgComprobante) {
    curY += 2;
    curY = dibujarImagenEncuadrada(
      doc,
      imgComprobante,
      curY,
      "Soporte Bancario Verificado"
    );
  }

  // 9. Pie y Sello de Administración
  curY = Math.max(curY + 2, alturaTotal - 10);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(15, 23, 42);
  doc.text("Administración / Control de Taquilla - Pozo Trina", 40, curY, { align: "center" });

  curY += 3.8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("Documento oficial emitido por el sistema automatizado", 40, curY, { align: "center" });

  return {
    doc,
    nombreArchivo,
    numRecibo,
    placa,
    chofer,
    cedula: cedulaCamionero,
    fechaArchivo,
    monto,
    metodo,
    referencia,
    strFecha,
    strHora,
    esLote,
    cantRecargas: recargasLista.length,
    cantFotos: fotosCamionValidas.length,
  };
}

/**
 * Detecta si el cliente se ejecuta en un dispositivo móvil (Android, iOS)
 */
export function esDispositivoMovil() {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const esMobileUa = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const esTouchScreen =
    Boolean(navigator.maxTouchPoints && navigator.maxTouchPoints > 1) &&
    /Macintosh|Mac OS/i.test(ua);
  return esMobileUa || esTouchScreen;
}

/**
 * =========================================================================
 * 3. COMPARTIR ARCHIVO PDF (Web Share API nativa en móviles o Descarga directa en PC)
 * =========================================================================
 */
export async function compartirODescargarPDF({ doc, nombreArchivo, titulo, texto }) {
  try {
    const esMovil = esDispositivoMovil();

    // Solo en dispositivos móviles (Android / iOS) se usa la API nativa de compartir
    // En PC / Escritorio se descarga directamente para evitar que Windows abra la ventana del sistema
    if (esMovil && typeof navigator !== "undefined" && navigator.canShare) {
      try {
        const pdfBlob = doc.output("blob");
        const file = new File([pdfBlob], nombreArchivo, { type: "application/pdf" });

        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: titulo || "Pozo Trina Malaver - Documento",
            text: texto || "Adjunto documento digital de Pozo Trina Malaver F.P.",
            files: [file],
          });
          return { compartido: true, metodo: "native" };
        }
      } catch (err) {
        if (err.name === "AbortError") {
          return { compartido: false, cancelado: true };
        }
        console.warn("Fallo Web Share en móvil, procediendo a descarga directa:", err);
      }
    }

    // Descarga directa en el navegador (en PC o cuando el móvil no soporta share de archivos)
    doc.save(nombreArchivo);
    return { compartido: true, metodo: "download" };
  } catch (err) {
    console.error("Fallo compartiendo o descargando archivo PDF:", err);
    try {
      doc.save(nombreArchivo);
    } catch (saveErr) {
      console.error("Error crítico en doc.save:", saveErr);
    }
    return { compartido: true, metodo: "download_fallback" };
  }
}

/**
 * Abre WhatsApp con texto estructurado
 */
export function compartirPorWhatsApp(texto) {
  const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`;
  window.open(url, "_blank");
}

/**
 * =========================================================================
 * 4. AVISO POST-RECARGA: DIÁLOGO PARA GENERAR / COMPARTIR NOTA DE ENTREGA
 * =========================================================================
 */
export async function avisarYCompartirNotaEntrega(datosNota) {
  const { camion, monto, metodo, referencia, estatus, fotoUrl, cedula } = datosNota;
  const placa = camion?.placa || "Unidad Cisterna";
  const chofer = camion?.chofer || "Sin Chofer";
  const cedulaCamionero = formatearCedula(cedula || camion?.cedula || camion?.camioneros?.cedula);
  const esPagado = String(estatus).toLowerCase() === "pagado";
  const montoFormat = formatearMonto(monto);

  const result = await Swal.fire({
    title: esPagado ? "🎉 ¡Recarga Pagada con Éxito!" : "⏳ ¡Recarga Registrada como Deuda!",
    html: `
      <div class="pozo-alert-body" style="text-align: left; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 10px 0;">
          Se completó el registro de recarga para la unidad cisterna:
        </p>
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(0, 195, 255, 0.25); border-radius: 12px; padding: 12px 14px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Placa / Chofer:</span>
            <strong style="color: #00c3ff;">${placa} (${chofer}${cedulaCamionero ? ` - C.I. ${cedulaCamionero}` : ""})</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Monto Registrado:</span>
            <strong style="color: #22c55e; font-size: 15px;">${montoFormat}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">Estado del Despacho:</span>
            <strong style="color: ${esPagado ? "#22c55e" : "#f59e0b"};">
              ${esPagado ? `Pagado (${metodo || "Efectivo"})` : "Pendiente en Cuentas por Cobrar"}
            </strong>
          </div>
          ${referencia ? `
          <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 12px;">
            <span style="color: #94a3b8;">N° Referencia:</span>
            <span style="color: #f8fafc;">${referencia}</span>
          </div>` : ""}
          ${fotoUrl ? `
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1); color: #38bdf8; font-size: 12px; display: flex; align-items: center; gap: 6px;">
            <span>📸</span> <span>Foto de la cisterna anexada y encuadrada</span>
          </div>` : ""}
        </div>
        <p style="margin: 0; color: #f8fafc; font-weight: 500; font-size: 14px;">
          📄 ¿Deseas generar la <b>Nota de Entrega</b> para compartirla o descargarla?
        </p>
      </div>
    `,
    icon: "success",
    showCancelButton: true,
    confirmButtonText: "📄 Generar y Compartir Nota",
    cancelButtonText: "No, Cerrar",
    buttonsStyling: false,
    background: "#131c2e",
    color: "#f8fafc",
    backdrop: "rgba(11, 15, 25, 0.8)",
    customClass: {
      popup: "pozo-swal-popup",
      title: "pozo-swal-title",
      htmlContainer: "pozo-swal-html",
      actions: "pozo-swal-actions",
      confirmButton: "pozo-swal-confirm-btn",
      cancelButton: "pozo-swal-cancel-btn",
    },
  });

  if (result.isConfirmed) {
    try {
      // 1. Generar la Nota de Entrega PDF
      const resultadoPdf = await generarNotaEntregaPDF(datosNota);

      // 2. Descargar o compartir con Web Share API
      await compartirODescargarPDF({
        doc: resultadoPdf.doc,
        nombreArchivo: resultadoPdf.nombreArchivo,
        titulo: `Nota de Entrega - ${placa}`,
        texto: `Nota de Entrega de recarga de agua para la unidad cisterna ${placa} (${chofer}).`,
      });

      // 3. Ofrecer opción directa de WhatsApp
      const textoWhatsApp =
        `💧 *POZO TRINA MALAVER F.P.*\n` +
        `📄 *NOTA DE ENTREGA / DESPACHO*\n` +
        `----------------------------------------\n` +
        `📅 *Fecha:* ${resultadoPdf.strFecha} ${resultadoPdf.strHora}\n` +
        `🚚 *Placa:* ${placa}\n` +
        `👤 *Chofer:* ${chofer}${resultadoPdf.cedula ? ` (C.I. ${resultadoPdf.cedula})` : ""}\n` +
        `💵 *Total:* $${Number(monto || 0).toFixed(2)}\n` +
        `💳 *Estado:* ${esPagado ? `PAGADO (${metodo || "Efectivo"})` : "CARGADO A CRÉDITO (DEUDA)"}\n` +
        (referencia ? `🔢 *Ref:* ${referencia}\n` : "") +
        `¡Recarga autorizada y despachada en pozo!`;

      await Swal.fire({
        title: "Nota de Entrega Lista",
        html: `
          <div class="pozo-alert-body" style="font-size: 14px; color: #cbd5e1;">
            <p>Se ha generado el archivo <b>${resultadoPdf.nombreArchivo}</b> con la foto del camión encuadrada.</p>
            <p>¿Deseas enviar un resumen rápido por WhatsApp?</p>
          </div>
        `,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "📲 Enviar por WhatsApp",
        cancelButtonText: "Listo",
        buttonsStyling: false,
        background: "#131c2e",
        color: "#f8fafc",
        backdrop: "rgba(11, 15, 25, 0.8)",
        customClass: {
          popup: "pozo-swal-popup",
          title: "pozo-swal-title",
          htmlContainer: "pozo-swal-html",
          actions: "pozo-swal-actions",
          confirmButton: "pozo-swal-confirm-btn",
          cancelButton: "pozo-swal-cancel-btn",
        },
      }).then((resWa) => {
        if (resWa.isConfirmed) {
          compartirPorWhatsApp(textoWhatsApp);
        }
      });
    } catch (errPdf) {
      console.error("Error al generar la nota de entrega:", errPdf);
      Swal.fire({
        icon: "error",
        title: "Error al generar PDF",
        text: errPdf.message || "No se pudo procesar la nota de entrega.",
        background: "#131c2e",
        color: "#f8fafc",
      });
    }
  }
}

/**
 * =========================================================================
 * 4.1 MODAL PARA GENERAR NOTA DE ENTREGA DESDE EL HISTORIAL DE RECARGAS
 * =========================================================================
 * Extrae estrictamente la fecha y hora original guardada en el registro (fecha_carga)
 */
export async function mostrarModalNotaEntregaHistorica(datosNota) {
  const { camion, monto, metodo, referencia, estatus, fotoUrl, cedula, fecha } = datosNota;
  const placa = camion?.placa || "Unidad Cisterna";
  const chofer = camion?.chofer || "Sin Chofer";
  const cedulaCamionero = formatearCedula(cedula || camion?.cedula || camion?.camioneros?.cedula);
  const esPagado = String(estatus).toLowerCase() === "pagado";
  const montoFormat = formatearMonto(monto);

  // ⚠️ Extraemos estrictamente la fecha y hora de registro guardada en la base de datos
  const { fecha: strFecha, hora: strHora } = extraerFechaHora(fecha);

  const result = await Swal.fire({
    title: "📄 Nota de Entrega de Recarga",
    html: `
      <div class="pozo-alert-body" style="text-align: left; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 10px 0; color: #cbd5e1;">
          Información del despacho registrado:
        </p>
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(0, 195, 255, 0.25); border-radius: 12px; padding: 12px 14px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #94a3b8;">📅 Fecha de Registro:</span>
            <strong style="color: #f8fafc;">${strFecha} &bull; ${strHora}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #94a3b8;">🚛 Placa / Chofer:</span>
            <strong style="color: #00c3ff;">${placa} (${chofer}${cedulaCamionero ? ` - C.I. ${cedulaCamionero}` : ""})</strong>
          </div>
          ${camion?.capacidad ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #94a3b8;">💧 Capacidad:</span>
            <span style="color: #f8fafc;">${Number(camion.capacidad).toLocaleString()} Lts</span>
          </div>` : ""}
          <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
            <span style="color: #94a3b8;">💵 Monto Despachado:</span>
            <strong style="color: #22c55e; font-size: 15px;">${montoFormat}</strong>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #94a3b8;">📋 Estado del Cobro:</span>
            <strong style="color: ${esPagado ? "#22c55e" : "#f59e0b"};">
              ${esPagado ? `Pagado (${metodo || "Efectivo"})` : "Pendiente en Cuentas por Cobrar"}
            </strong>
          </div>
          ${referencia ? `
          <div style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 12px;">
            <span style="color: #94a3b8;">N° Referencia:</span>
            <span style="color: #f8fafc;">${referencia}</span>
          </div>` : ""}
          ${fotoUrl ? `
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1); color: #38bdf8; font-size: 12px; display: flex; align-items: center; gap: 6px;">
            <span>📸</span> <span>Foto de la cisterna anexada al documento</span>
          </div>` : ""}
        </div>
        <p style="margin: 0; color: #f8fafc; font-weight: 500; font-size: 14px;">
          ¿Deseas generar la <b>Nota de Entrega</b> en formato ticket PDF para imprimir o compartir?
        </p>
      </div>
    `,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "📄 Generar y Compartir Nota",
    cancelButtonText: "Cerrar",
    buttonsStyling: false,
    background: "#131c2e",
    color: "#f8fafc",
    backdrop: "rgba(11, 15, 25, 0.8)",
    customClass: {
      popup: "pozo-swal-popup",
      title: "pozo-swal-title",
      htmlContainer: "pozo-swal-html",
      actions: "pozo-swal-actions",
      confirmButton: "pozo-swal-confirm-btn",
      cancelButton: "pozo-swal-cancel-btn",
    },
  });

  if (result.isConfirmed) {
    try {
      // 1. Generar la Nota de Entrega PDF con la fecha y hora original
      const resultadoPdf = await generarNotaEntregaPDF(datosNota);

      // 2. Descargar o compartir con Web Share API
      await compartirODescargarPDF({
        doc: resultadoPdf.doc,
        nombreArchivo: resultadoPdf.nombreArchivo,
        titulo: `Nota de Entrega - ${placa}`,
        texto: `Nota de Entrega de recarga de agua para la unidad cisterna ${placa} (${chofer}) del ${strFecha} a las ${strHora}.`,
      });

      // 3. Ofrecer opción directa de WhatsApp
      const textoWhatsApp =
        `💧 *POZO TRINA MALAVER F.P.*\n` +
        `📄 *NOTA DE ENTREGA / DESPACHO*\n` +
        `----------------------------------------\n` +
        `📅 *Fecha de Registro:* ${resultadoPdf.strFecha} ${resultadoPdf.strHora}\n` +
        `🚚 *Placa Cisterna:* ${placa}\n` +
        `👤 *Chofer:* ${chofer}${resultadoPdf.cedula ? ` (C.I. ${resultadoPdf.cedula})` : ""}\n` +
        (camion?.capacidad ? `💧 *Capacidad:* ${Number(camion.capacidad).toLocaleString()} Lts\n` : "") +
        `💵 *Monto:* ${montoFormat}\n` +
        `📌 *Estado:* ${esPagado ? `PAGADO (${metodo || "Efectivo"})` : "CARGADO A CRÉDITO (DEUDA)"}\n` +
        (referencia ? `🔢 *Referencia:* ${referencia}\n` : "") +
        `----------------------------------------\n` +
        `_Comprobante oficial emitido por Pozo Trina Malaver F.P._`;

      Swal.fire({
        title: "Nota de Entrega Lista",
        html: `
          <div class="pozo-alert-body" style="font-size: 14px; color: #cbd5e1;">
            <p>Se ha generado el archivo <b>${resultadoPdf.nombreArchivo}</b> con la fecha original del registro (${strFecha} ${strHora}).</p>
            <p style="margin-top: 10px; color: #38bdf8;">¿Deseas enviar el resumen de la nota por WhatsApp?</p>
          </div>
        `,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "💬 Enviar por WhatsApp",
        cancelButtonText: "Listo, Finalizar",
        buttonsStyling: false,
        background: "#131c2e",
        color: "#f8fafc",
        backdrop: "rgba(11, 15, 25, 0.8)",
        customClass: {
          popup: "pozo-swal-popup",
          title: "pozo-swal-title",
          htmlContainer: "pozo-swal-html",
          actions: "pozo-swal-actions",
          confirmButton: "pozo-swal-confirm-btn",
          cancelButton: "pozo-swal-cancel-btn",
        },
      }).then((resWa) => {
        if (resWa.isConfirmed) {
          compartirPorWhatsApp(textoWhatsApp);
        }
      });
    } catch (errPdf) {
      console.error("Error al generar la nota de entrega histórica:", errPdf);
      Swal.fire({
        icon: "error",
        title: "Error al generar PDF",
        text: errPdf.message || "No se pudo procesar la nota de entrega.",
        background: "#131c2e",
        color: "#f8fafc",
      });
    }
  }
}

/**
 * =========================================================================
 * 5. MODAL PARA GENERAR COMPROBANTE DE PAGO DESDE EL MENÚ DE PAGOS
 * =========================================================================
 */
export async function mostrarModalComprobantePago(pago, listaPagosCompleta = null) {
  // 1. Detectar si el pago agrupa varias recargas
  let recargas = Array.isArray(pago?.recargas) && pago.recargas.length > 0
    ? pago.recargas
    : (Array.isArray(pago?.viajes) && pago.viajes.length > 0 ? pago.viajes : null);

  if (!recargas && pago?.pago_id) {
    if (Array.isArray(listaPagosCompleta) && listaPagosCompleta.length > 0) {
      const hermanos = listaPagosCompleta.filter((p) => p.pago_id && p.pago_id === pago.pago_id);
      if (hermanos.length > 1) {
        recargas = hermanos;
      }
    }
    if (!recargas) {
      try {
        const { data: siblingData } = await supabase
          .from("registros_carga")
          .select(`
            id,
            monto,
            metodo,
            referencia,
            fecha_carga,
            url_foto,
            url_comprobante,
            estatus,
            pago_id,
            camiones ( id, placa, chofer, capacidad, modelo, camionero_id, perfil_id )
          `)
          .eq("pago_id", pago.pago_id)
          .order("fecha_carga", { ascending: true });

        if (siblingData && siblingData.length > 1) {
          recargas = siblingData;
        }
      } catch (errDb) {
        console.warn("Fallo al buscar recargas hermanas del pago_id:", errDb);
      }
    }
  }

  const esLote = Boolean(recargas && recargas.length > 1);
  const cantRecargas = esLote ? recargas.length : 1;
  const montoTotal = esLote
    ? recargas.reduce((sum, r) => sum + (Number(r.monto) || 0), 0)
    : (Number(pago?.monto) || 0);

  const camionBase = pago?.camiones || (recargas && recargas[0]?.camiones) || {};
  const placa = camionBase?.placa || pago?.placa || "Sin Placa";
  const chofer = camionBase?.chofer || pago?.chofer || "Cliente / Chofer";
  const cedulaCamionero = formatearCedula(
    camionBase?.cedula ||
    camionBase?.camioneros?.cedula ||
    pago?.cedula ||
    pago?.chofer_cedula
  );

  const fechaReferencia =
    pago?.fecha_carga ||
    (recargas && recargas[recargas.length - 1]?.fecha_carga) ||
    new Date().toISOString();
  const { fecha: strFecha, hora: strHora } = extraerFechaHora(fechaReferencia);

  const metodo = pago?.metodo || (recargas && recargas[0]?.metodo) || "Efectivo";
  const referencia = pago?.referencia || (recargas && recargas[0]?.referencia) || "Pago en Efectivo (Taquilla)";
  const montoFormat = formatearMonto(montoTotal);

  // Conteo de fotos de camión registradas
  let numFotosCamion = 0;
  if (esLote) {
    numFotosCamion = recargas.filter((r) => r.url_foto || r.foto_camion || r.fotoUrl).length;
  } else {
    numFotosCamion = (pago?.url_foto || pago?.foto_camion || pago?.fotoUrl) ? 1 : 0;
  }

  const pagoParaProcesar = esLote ? { ...pago, recargas, monto: montoTotal } : pago;

  const result = await Swal.fire({
    title: esLote ? `🧾 Comprobante de Pago (${cantRecargas} Recargas)` : "🧾 Comprobante Oficial de Pago",
    html: `
      <div class="pozo-alert-body" style="text-align: left; font-size: 14px; line-height: 1.6;">
        <p style="margin: 0 0 10px 0;">
          Generar constancia que <b>da fe del pago recibido</b> por la persona:
        </p>
        <div style="background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(34, 197, 94, 0.35); border-radius: 12px; padding: 12px 14px; margin-bottom: 14px;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Cliente / Chofer:</span>
            <strong style="color: #f8fafc;">${chofer}${cedulaCamionero ? ` (C.I. ${cedulaCamionero})` : ""}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Unidad Cisterna:</span>
            <strong style="color: #00c3ff;">${placa}</strong>
          </div>
          ${esLote ? `
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Recargas Liquidadas:</span>
            <strong style="color: #38bdf8;">${cantRecargas} viajes consolidados</strong>
          </div>` : ""}
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Monto Pagado:</span>
            <strong style="color: #22c55e; font-size: 16px;">${montoFormat}</strong>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: #94a3b8;">Método de Pago:</span>
            <span style="color: #f8fafc;">${metodo}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px; font-size: 12px;">
            <span style="color: #94a3b8;">Referencia:</span>
            <span style="color: #f8fafc;">${referencia}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #94a3b8;">Fecha y Hora:</span>
            <span style="color: #f8fafc;">${strFecha} ${strHora}</span>
          </div>
          ${numFotosCamion > 0 ? `
          <div style="margin-top: 8px; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1); color: #38bdf8; font-size: 12px; display: flex; align-items: center; gap: 6px;">
            <span>📸</span> <span>${numFotosCamion === 1 ? "1 foto de la cisterna en pozo anexada" : `${numFotosCamion} fotos de cisternas acomodadas en cuadrícula`}</span>
          </div>` : ""}
        </div>
        <p style="margin: 0; color: #94a3b8; font-size: 12px;">
          ℹ️ Este documento certifica la solvencia financiera y da fe legal de la recepción conforme de los fondos.
        </p>
      </div>
    `,
    icon: "info",
    showCancelButton: true,
    confirmButtonText: "📥 Descargar Comprobante (PDF)",
    cancelButtonText: "Cerrar",
    buttonsStyling: false,
    background: "#131c2e",
    color: "#f8fafc",
    backdrop: "rgba(11, 15, 25, 0.8)",
    customClass: {
      popup: "pozo-swal-popup",
      title: "pozo-swal-title",
      htmlContainer: "pozo-swal-html",
      actions: "pozo-swal-actions",
      confirmButton: "pozo-swal-confirm-btn",
      cancelButton: "pozo-swal-cancel-btn",
    },
  });

  if (result.isConfirmed) {
    try {
      const resPdf = await generarComprobantePagoPDF(pagoParaProcesar);

      await compartirODescargarPDF({
        doc: resPdf.doc,
        nombreArchivo: resPdf.nombreArchivo,
        titulo: `Comprobante de Pago - ${placa}`,
        texto: `Comprobante oficial de pago de Pozo Trina Malaver F.P. para ${chofer} (${placa}) por ${montoFormat}.`,
      });

      const textoWhatsApp =
        `💧 *POZO TRINA MALAVER F.P.*\n` +
        `🧾 *COMPROBANTE DE PAGO${resPdf.esLote ? ` (${resPdf.cantRecargas} RECARGAS)` : ""}*\n` +
        `N° REC-${resPdf.numRecibo}\n` +
        `----------------------------------------\n` +
        `📅 *Fecha:* ${resPdf.strFecha} ${resPdf.strHora}\n` +
        `👤 *Cliente / Chofer:* ${chofer}${resPdf.cedula ? ` (C.I. ${resPdf.cedula})` : ""}\n` +
        `🚚 *Placa Unidad:* ${placa}\n` +
        (resPdf.esLote ? `📦 *Recargas Consolidadas:* ${resPdf.cantRecargas} viajes\n` : "") +
        `💰 *Total Pagado:* $${Number(resPdf.monto).toFixed(2)} USD\n` +
        `💳 *Método:* ${metodo}\n` +
        (referencia && referencia !== "Pago en Efectivo (Taquilla)" ? `🔢 *Referencia:* ${referencia}\n` : "") +
        `✅ *Estatus:* CONCILIADO Y PAGADO\n` +
        `Damos fe de haber recibido conforme el pago. ¡Gracias por su preferencia!`;

      await Swal.fire({
        title: "Comprobante Generado",
        html: `
          <div class="pozo-alert-body" style="font-size: 14px; color: #cbd5e1;">
            <p>Se ha generado el archivo <b>${resPdf.nombreArchivo}</b> ${resPdf.cantFotos > 1 ? `con ${resPdf.cantFotos} fotos de cisterna acomodadas en cuadrícula` : "con la foto de la cisterna integrada"}.</p>
            <p>¿Deseas enviar la constancia por WhatsApp?</p>
          </div>
        `,
        icon: "success",
        showCancelButton: true,
        confirmButtonText: "📲 Enviar por WhatsApp",
        cancelButtonText: "Listo",
        buttonsStyling: false,
        background: "#131c2e",
        color: "#f8fafc",
        backdrop: "rgba(11, 15, 25, 0.8)",
        customClass: {
          popup: "pozo-swal-popup",
          title: "pozo-swal-title",
          htmlContainer: "pozo-swal-html",
          actions: "pozo-swal-actions",
          confirmButton: "pozo-swal-confirm-btn",
          cancelButton: "pozo-swal-cancel-btn",
        },
      }).then((resWa) => {
        if (resWa.isConfirmed) {
          compartirPorWhatsApp(textoWhatsApp);
        }
      });
    } catch (errPdf) {
      console.error("Error al generar comprobante de pago:", errPdf);
      Swal.fire({
        icon: "error",
        title: "Error al generar comprobante",
        text: errPdf.message || "No se pudo procesar el comprobante de pago.",
        background: "#131c2e",
        color: "#f8fafc",
      });
    }
  }
}
