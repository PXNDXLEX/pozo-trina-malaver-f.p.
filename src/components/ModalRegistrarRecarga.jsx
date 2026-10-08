import React, { useState, useEffect, useMemo } from "react";
import styled, { keyframes } from "styled-components";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import {
  MdClose,
  MdLocalShipping,
  MdAttachMoney,
  MdPhotoCamera,
  MdPayments,
  MdReceipt,
  MdCheckCircle,
  MdHourglassEmpty,
  MdDeleteOutline,
  MdEditNote,
  MdSearch,
  MdPerson,
  MdArrowBack,
  MdAddCircleOutline,
  MdSwapHoriz,
  MdWaterDrop,
  MdConfirmationNumber,
  MdDirectionsCar,
  MdWarning,
} from "react-icons/md";

export function ModalRegistrarRecarga({ isOpen, onClose, onRecargaExitosa }) {
  const user = useAuthStore((state) => state.user);

  // Estados de navegación interna del modal:
  // "cuadricula_camionero" | "cuadricula_admin_chofer" | "cuadricula_admin_camion" | "formulario"
  const [pasoModal, setPasoModal] = useState("formulario");

  // Listas de datos
  const [camiones, setCamiones] = useState([]);
  const [choferes, setChoferes] = useState([]);
  const [cargandoDatos, setCargandoDatos] = useState(false);

  // Selecciones activas
  const [choferSeleccionado, setChoferSeleccionado] = useState(null);
  const [camionSeleccionadoId, setCamionSeleccionadoId] = useState("");

  // Búsquedas en las cuadrículas
  const [busquedaChofer, setBusquedaChofer] = useState("");
  const [busquedaCamionGrid, setBusquedaCamionGrid] = useState("");

  // Formularios rápidos inline (para Admin y Registrador)
  const [mostrarFormNuevoChofer, setMostrarFormNuevoChofer] = useState(false);
  const [nuevoChoferNombre, setNuevoChoferNombre] = useState("");
  const [nuevoChoferCedula, setNuevoChoferCedula] = useState("");
  const [nuevoChoferTelefono, setNuevoChoferTelefono] = useState("");

  const [mostrarFormNuevoCamion, setMostrarFormNuevoCamion] = useState(false);
  const [nuevoCamionPlaca, setNuevoCamionPlaca] = useState("");
  const [nuevoCamionCapacidad, setNuevoCamionCapacidad] = useState(10000);
  const [nuevoCamionModelo, setNuevoCamionModelo] = useState("");
  const [guardandoInline, setGuardandoInline] = useState(false);

  // Formulario de Recarga
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  const [fotoCamion, setFotoCamion] = useState(null);
  const [previewCamion, setPreviewCamion] = useState(null);
  const [fotoComprobante, setFotoComprobante] = useState(null);
  const [previewComprobante, setPreviewComprobante] = useState(null);
  const [tipoRegistro, setTipoRegistro] = useState("pagado"); // "pagado" | "deuda"
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [referencia, setReferencia] = useState("");
  const [loading, setLoading] = useState(false);

  const PRESETS_CAPACIDAD = [5000, 10000, 12000, 15000, 20000, 30000];

  useEffect(() => {
    if (isOpen) {
      iniciarFlujoModal();
    } else {
      limpiarTodo();
    }
  }, [isOpen]);

  // Carga inicial y decisión del paso inicial
  const iniciarFlujoModal = async () => {
    setCargandoDatos(true);
    setMostrarFormNuevoChofer(false);
    setMostrarFormNuevoCamion(false);
    setBusquedaChofer("");
    setBusquedaCamionGrid("");

    try {
      if (user?.role === "camionero" && user?.id) {
        // --- 1. FLUJO CAMIONERO ---
        const trucksMap = new Map();

        try {
          // Buscar ficha del chofer
          const { data: cRow } = await supabase
            .from("camioneros")
            .select("id, nombre, cedula, telefono, perfil_id")
            .eq("perfil_id", user.id)
            .maybeSingle();

          if (cRow) {
            setChoferSeleccionado(cRow);
          }

          // Camiones por camionero_id
          if (cRow?.id) {
            const { data: trucksCam } = await supabase
              .from("camiones")
              .select("id, placa, chofer, capacidad, modelo, perfil_id, camionero_id")
              .eq("camionero_id", cRow.id);

            (trucksCam || []).forEach((t) => {
              const choferStr = (t.chofer || "").trim().toLowerCase();
              if (!choferStr.includes("sin")) {
                trucksMap.set(t.id, t);
              }
            });
          }

          // Camiones por perfil_id directo
          const { data: misCamiones } = await supabase
            .from("camiones")
            .select("id, placa, chofer, capacidad, modelo, perfil_id, camionero_id")
            .eq("perfil_id", user.id);

          (misCamiones || []).forEach((t) => {
            const choferStr = (t.chofer || "").trim().toLowerCase();
            const esMismoCam = !t.camionero_id || (cRow?.id && String(t.camionero_id) === String(cRow.id));
            if (!choferStr.includes("sin") && esMismoCam) {
              trucksMap.set(t.id, t);
            }
          });

          // Camiones por coincidencia de nombre
          const nombreChofer = cRow?.nombre || user?.nombre;
          if (nombreChofer && !nombreChofer.toLowerCase().includes("sin")) {
            const { data: byNombre } = await supabase
              .from("camiones")
              .select("id, placa, chofer, capacidad, modelo, perfil_id, camionero_id")
              .ilike("chofer", nombreChofer.trim());

            (byNombre || []).forEach((t) => {
              const choferStr = (t.chofer || "").trim().toLowerCase();
              if (!choferStr.includes("sin")) {
                trucksMap.set(t.id, t);
              }
            });
          }
        } catch (errCam) {
          console.error("Error al cargar camiones de chofer:", errCam);
        }

        const misUnidades = Array.from(trucksMap.values());
        setCamiones(misUnidades);

        // REGLA: Si tiene solo 1 camión, seleccionar automáticamente y abrir formulario
        // Si tiene más de 1 camión, mostrar cuadrícula para elegir la unidad
        if (misUnidades.length === 1) {
          setCamionSeleccionadoId(misUnidades[0].id);
          setPasoModal("formulario");
        } else {
          setCamionSeleccionadoId("");
          setPasoModal("cuadricula_camionero");
        }
      } else {
        // --- 2. FLUJO ADMINISTRADOR Y REGISTRADOR ---
        const [resChoferes, resCamiones] = await Promise.all([
          supabase
            .from("camioneros")
            .select("id, nombre, cedula, telefono, perfil_id")
            .order("nombre", { ascending: true }),
          supabase
            .from("camiones")
            .select("id, placa, chofer, capacidad, modelo, camionero_id, perfil_id")
            .order("id", { ascending: false }),
        ]);

        const choferesData = resChoferes.data || [];
        const camionesData = resCamiones.data || [];

        setChoferes(choferesData);
        setCamiones(camionesData);
        setChoferSeleccionado(null);
        setCamionSeleccionadoId("");

        // Abre solicitando primero el chofer del camión
        setPasoModal("cuadricula_admin_chofer");
      }
    } catch (err) {
      console.error("Error al inicializar modal de recarga:", err);
    } finally {
      setCargandoDatos(false);
    }
  };

  const limpiarTodo = () => {
    setChoferSeleccionado(null);
    setCamionSeleccionadoId("");
    setBusquedaChofer("");
    setBusquedaCamionGrid("");
    setMostrarFormNuevoChofer(false);
    setMostrarFormNuevoCamion(false);
    setMonto("");
    setNota("");
    setFotoCamion(null);
    setPreviewCamion(null);
    setFotoComprobante(null);
    setPreviewComprobante(null);
    setTipoRegistro("pagado");
    setMetodoPago("Transferencia");
    setReferencia("");
    setLoading(false);
  };

  // Camiones asignados al chofer seleccionado en el flujo de Admin/Registrador
  const camionesDelChoferSeleccionado = useMemo(() => {
    if (!choferSeleccionado) return [];
    const ch = choferSeleccionado;
    const mapa = new Map();

    camiones.forEach((t) => {
      const choferStr = (t.chofer || "").trim().toLowerCase();
      if (choferStr.includes("sin")) return;

      const matchId = t.camionero_id && String(t.camionero_id) === String(ch.id);
      const matchPerfil = ch.perfil_id && t.perfil_id === ch.perfil_id;
      const matchNombre = ch.nombre && choferStr === ch.nombre.trim().toLowerCase();

      if (matchId || matchPerfil || matchNombre) {
        mapa.set(t.id, t);
      }
    });

    return Array.from(mapa.values());
  }, [choferSeleccionado, camiones]);

  // Choferes filtrados para la cuadrícula
  const choferesFiltrados = useMemo(() => {
    if (!busquedaChofer.trim()) return choferes;
    const q = busquedaChofer.toLowerCase().trim();
    return choferes.filter(
      (c) =>
        c.nombre?.toLowerCase().includes(q) ||
        c.cedula?.toLowerCase().includes(q) ||
        c.telefono?.toLowerCase().includes(q)
    );
  }, [choferes, busquedaChofer]);

  // Camiones filtrados para la cuadrícula del chofer
  const camionesFiltradosGrid = useMemo(() => {
    const origen =
      user?.role === "camionero" ? camiones : camionesDelChoferSeleccionado;
    if (!busquedaCamionGrid.trim()) return origen;
    const q = busquedaCamionGrid.toLowerCase().trim();
    return origen.filter(
      (c) =>
        c.placa?.toLowerCase().includes(q) ||
        c.modelo?.toLowerCase().includes(q) ||
        String(c.capacidad).includes(q)
    );
  }, [user?.role, camiones, camionesDelChoferSeleccionado, busquedaCamionGrid]);

  // Manejo de Fotos
  const handleFotoCamionChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoCamion(file);
      setPreviewCamion(URL.createObjectURL(file));
    }
  };

  const handleFotoComprobanteChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFotoComprobante(file);
      setPreviewComprobante(URL.createObjectURL(file));
    }
  };

  const subirArchivoStorage = async (bucket, archivo, prefijo = "img") => {
    if (!archivo) return null;
    try {
      const extension = archivo.name.split(".").pop();
      const nombreArchivo = `${prefijo}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(nombreArchivo, archivo, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.warn(`Error al subir a ${bucket}:`, uploadError.message);
        return null;
      }

      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(nombreArchivo);

      return urlData?.publicUrl || null;
    } catch (err) {
      console.error(`Fallo subida a bucket ${bucket}:`, err);
      return null;
    }
  };

  // Crear nuevo chofer inline (Admin / Registrador)
  const handleGuardarNuevoChofer = async (e) => {
    e.preventDefault();
    if (!nuevoChoferNombre.trim()) {
      alert("Por favor ingresa el nombre del nuevo chofer.");
      return;
    }

    setGuardandoInline(true);
    try {
      const { data, error } = await supabase
        .from("camioneros")
        .insert([
          {
            nombre: nuevoChoferNombre.trim(),
            cedula: nuevoChoferCedula.trim() || null,
            telefono: nuevoChoferTelefono.trim() || null,
          },
        ])
        .select("id, nombre, cedula, telefono, perfil_id")
        .single();

      if (error) throw error;

      setChoferes((prev) => [...prev, data]);
      setChoferSeleccionado(data);
      setMostrarFormNuevoChofer(false);
      setNuevoChoferNombre("");
      setNuevoChoferCedula("");
      setNuevoChoferTelefono("");
      setPasoModal("cuadricula_admin_camion");
    } catch (err) {
      console.error("Error al registrar chofer:", err);
      alert(`Error al registrar chofer: ${err.message || "Error desconocido"}`);
    } finally {
      setGuardandoInline(false);
    }
  };

  // Crear nuevo camión inline para el chofer seleccionado (Admin / Registrador)
  const handleGuardarNuevoCamion = async (e) => {
    e.preventDefault();
    const placaLimpia = (nuevoCamionPlaca || "").trim().toUpperCase();
    if (!placaLimpia) {
      alert("Por favor ingresa la placa de la cisterna.");
      return;
    }

    const regexPlaca = /^[A-Z0-9]{5,8}$/;
    if (!regexPlaca.test(placaLimpia)) {
      alert("La placa debe tener entre 5 y 8 caracteres alfanuméricos sin espacios ni guiones.");
      return;
    }

    const capNum = parseInt(nuevoCamionCapacidad, 10);
    if (!capNum || capNum <= 0) {
      alert("Por favor indica una capacidad en litros válida mayor a 0.");
      return;
    }

    if (!nuevoCamionModelo.trim()) {
      alert("Por favor indica el modelo o marca del camión.");
      return;
    }

    setGuardandoInline(true);
    try {
      // Validar placa única
      const { data: placaExistente } = await supabase
        .from("camiones")
        .select("id, chofer")
        .eq("placa", placaLimpia)
        .maybeSingle();

      if (placaExistente) {
        alert(`⚠️ La placa "${placaLimpia}" ya está registrada en el pozo.`);
        setGuardandoInline(false);
        return;
      }

      const payload = {
        placa: placaLimpia,
        capacidad: capNum,
        modelo: nuevoCamionModelo.trim(),
        chofer: choferSeleccionado.nombre,
        camionero_id: choferSeleccionado.id,
        perfil_id: choferSeleccionado.perfil_id || null,
      };

      const { data, error } = await supabase
        .from("camiones")
        .insert([payload])
        .select("id, placa, chofer, capacidad, modelo, camionero_id, perfil_id")
        .single();

      if (error) throw error;

      setCamiones((prev) => [data, ...prev]);
      setCamionSeleccionadoId(data.id);
      setMostrarFormNuevoCamion(false);
      setNuevoCamionPlaca("");
      setNuevoCamionCapacidad(10000);
      setNuevoCamionModelo("");
      setPasoModal("formulario");
    } catch (err) {
      console.error("Error al registrar camión:", err);
      alert(`Error al registrar camión: ${err.message || "Error desconocido"}`);
    } finally {
      setGuardandoInline(false);
    }
  };

  // Enviar Formulario de Recarga
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!camionSeleccionadoId) {
      alert("Por favor selecciona un camión de la lista.");
      return;
    }

    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert("Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    if (tipoRegistro === "pagado") {
      if (metodoPago !== "Efectivo" && !referencia.trim()) {
        alert("La referencia bancaria es obligatoria para registrar el pago.");
        return;
      }
    }

    const esRegistrador = user?.role === "registrador";
    const esCamionero = user?.role === "camionero";
    const exigeFotos = esRegistrador || esCamionero;

    // 📸 Validación obligatoria de fotos para Registrador y Camionero
    if (exigeFotos && !fotoCamion) {
      alert("⚠️ La foto de evidencia de la cisterna en el pozo es obligatoria.");
      return;
    }

    if (exigeFotos && tipoRegistro === "pagado" && !fotoComprobante) {
      alert("⚠️ La foto o captura del comprobante/referencia de pago es obligatoria cuando se registra como pagado.");
      return;
    }

    setLoading(true);

    try {
      let urlFotoCamion = null;
      if (fotoCamion) {
        urlFotoCamion = await subirArchivoStorage("fotos-camiones", fotoCamion, "camion");
      }

      let urlComprobante = null;
      if (tipoRegistro === "pagado" && fotoComprobante) {
        urlComprobante = await subirArchivoStorage("comprobantes", fotoComprobante, "recibo");
      }

      const fechaActual = new Date().toISOString();
      const esPagado = tipoRegistro === "pagado";
      const estatusFinal = esPagado ? "pagado" : "pendiente";
      const metodoFinal = esPagado ? metodoPago : "Deuda";
      const referenciaFinal = esPagado && metodoPago !== "Efectivo" ? referencia.trim() : null;

      const registroPayload = {
        camion_id: camionSeleccionadoId,
        monto: montoNum,
        metodo: metodoFinal,
        referencia: referenciaFinal,
        fecha_carga: fechaActual,
        url_foto: urlFotoCamion,
        estatus: estatusFinal,
      };

      const payloadExtendido = { ...registroPayload };
      if (urlComprobante) payloadExtendido.url_comprobante = urlComprobante;
      if (user?.id) payloadExtendido.usuario_id = user.id;
      if (nota.trim()) payloadExtendido.nota = nota.trim();

      let { error: insertError } = await supabase
        .from("registros_carga")
        .insert([payloadExtendido]);

      if (insertError) {
        console.warn("Fallo inserción con columnas extendidas, reintentando con payload base:", insertError.message);
        const { error: errFallback } = await supabase
          .from("registros_carga")
          .insert([registroPayload]);
        insertError = errFallback;
      }

      if (insertError) throw insertError;

      alert(
        esPagado
          ? "🎉 ¡Recarga pagada registrada con éxito!"
          : "⏳ ¡Recarga registrada exitosamente como Deuda en Cuentas por Cobrar!"
      );

      limpiarTodo();
      onClose();

      if (typeof onRecargaExitosa === "function") {
        onRecargaExitosa();
      }
    } catch (err) {
      console.error("Error al registrar recarga:", err);
      alert(`Error al registrar recarga: ${err.message || "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const camionActual = camiones.find((c) => String(c.id) === String(camionSeleccionadoId));

  return (
    <Overlay onClick={onClose}>
      <ModalContainer onClick={(e) => e.stopPropagation()}>
        {/* ========================================================= */}
        {/* VISTA 1: CUADRÍCULA DE CAMIONES DEL CAMIONERO (>1 CAMIÓN) */}
        {/* ========================================================= */}
        {pasoModal === "cuadricula_camionero" && (
          <StepSection>
            <ModalHeader>
              <HeaderInfo>
                <HeaderBadge>🚚</HeaderBadge>
                <div>
                  <h3>Selecciona tu Camión Cisterna</h3>
                  <p>Elige cuál de tus unidades va a cargar agua en el pozo</p>
                </div>
              </HeaderInfo>
              <CloseBtn onClick={onClose} title="Cerrar modal">
                <MdClose />
              </CloseBtn>
            </ModalHeader>

            <ModalBody>
              {camiones.length === 0 ? (
                <EmptyGridNotice>
                  <MdWarning className="warn-ico" />
                  <h4>No tienes unidades asignadas</h4>
                  <p>Tu cuenta de chofer aún no tiene camiones vinculados. Consulta al administrador.</p>
                </EmptyGridNotice>
              ) : (
                <>
                  {camiones.length > 4 && (
                    <SearchGridInputBox>
                      <MdSearch className="search-ico" />
                      <input
                        type="text"
                        placeholder="Buscar por placa o modelo..."
                        value={busquedaCamionGrid}
                        onChange={(e) => setBusquedaCamionGrid(e.target.value)}
                      />
                    </SearchGridInputBox>
                  )}

                  <GridSelectionContainer>
                    {camionesFiltradosGrid.map((c) => (
                      <CardSelectionItem
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCamionSeleccionadoId(c.id);
                          setPasoModal("formulario");
                        }}
                      >
                        <div className="card-top">
                          <span className="plate-badge">{c.placa}</span>
                          <span className="truck-icon">🚚</span>
                        </div>
                        <div className="card-body">
                          <span className="cap-val">
                            <MdWaterDrop /> {Number(c.capacidad).toLocaleString()} Lts
                          </span>
                          <span className="model-name">
                            <MdDirectionsCar /> {c.modelo || "Cisterna"}
                          </span>
                        </div>
                        <div className="card-footer">
                          <span>Hacer Recarga con este Camión →</span>
                        </div>
                      </CardSelectionItem>
                    ))}
                  </GridSelectionContainer>
                </>
              )}
            </ModalBody>
          </StepSection>
        )}

        {/* ========================================================= */}
        {/* VISTA 2: CUADRÍCULA DE CHOFERES (ADMIN Y REGISTRADOR)     */}
        {/* ========================================================= */}
        {pasoModal === "cuadricula_admin_chofer" && (
          <StepSection>
            <ModalHeader>
              <HeaderInfo>
                <HeaderBadge>👤</HeaderBadge>
                <div>
                  <h3>Paso 1: Seleccionar Chofer</h3>
                  <p>Indica el chofer que se encuentra realizando la recarga</p>
                </div>
              </HeaderInfo>
              <CloseBtn onClick={onClose} title="Cerrar modal">
                <MdClose />
              </CloseBtn>
            </ModalHeader>

            <ModalBody>
              <SearchGridInputBox>
                <MdSearch className="search-ico" />
                <input
                  type="text"
                  placeholder="Buscar chofer por nombre o cédula..."
                  value={busquedaChofer}
                  onChange={(e) => setBusquedaChofer(e.target.value)}
                />
              </SearchGridInputBox>

              {mostrarFormNuevoChofer ? (
                <InlineFormCard onSubmit={handleGuardarNuevoChofer}>
                  <div className="form-head">
                    <h4>
                      <MdAddCircleOutline /> Registrar Nuevo Chofer en el Pozo
                    </h4>
                    <button
                      type="button"
                      className="btn-cancel-inline"
                      onClick={() => setMostrarFormNuevoChofer(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="form-inputs-grid">
                    <div>
                      <label>Nombre Completo: *</label>
                      <input
                        type="text"
                        placeholder="Ej: Pedro Pérez"
                        value={nuevoChoferNombre}
                        onChange={(e) => setNuevoChoferNombre(e.target.value)}
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label>Cédula de Identidad:</label>
                      <input
                        type="text"
                        placeholder="Ej: 12345678"
                        value={nuevoChoferCedula}
                        onChange={(e) => setNuevoChoferCedula(e.target.value)}
                      />
                    </div>
                    <div>
                      <label>Teléfono:</label>
                      <input
                        type="text"
                        placeholder="Ej: 0414-1234567"
                        value={nuevoChoferTelefono}
                        onChange={(e) => setNuevoChoferTelefono(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-sec"
                      onClick={() => setMostrarFormNuevoChofer(false)}
                      disabled={guardandoInline}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-pri emerald"
                      disabled={guardandoInline}
                    >
                      {guardandoInline ? "Guardando..." : "✅ Guardar Chofer y Continuar"}
                    </button>
                  </div>
                </InlineFormCard>
              ) : (
                <GridSelectionContainer>
                  {/* Tarjeta Especial: Registrar Nuevo Chofer */}
                  <SpecialCardCreate
                    type="button"
                    $theme="emerald"
                    onClick={() => setMostrarFormNuevoChofer(true)}
                  >
                    <div className="ico-box">
                      <MdAddCircleOutline />
                    </div>
                    <div className="create-text-wrapper">
                      <h4>+ Registrar Nuevo Chofer</h4>
                      <p>Crear chofer en el pozo y continuar</p>
                    </div>
                  </SpecialCardCreate>

                  {/* Choferes existentes */}
                  {choferesFiltrados.map((ch) => {
                    const countCam = camiones.filter((t) => {
                      const choferStr = (t.chofer || "").trim().toLowerCase();
                      if (choferStr.includes("sin")) return false;
                      const matchId = t.camionero_id && String(t.camionero_id) === String(ch.id);
                      const matchPerfil = ch.perfil_id && t.perfil_id === ch.perfil_id;
                      const matchNombre = ch.nombre && choferStr === ch.nombre.trim().toLowerCase();
                      return matchId || matchPerfil || matchNombre;
                    }).length;

                    return (
                      <CardSelectionItem
                        key={ch.id}
                        type="button"
                        onClick={() => {
                          setChoferSeleccionado(ch);
                          setPasoModal("cuadricula_admin_camion");
                        }}
                      >
                        <div className="card-top">
                          <div className="avatar-chip">
                            <MdPerson />
                          </div>
                          <span className="count-badge">
                            {countCam} {countCam === 1 ? "camión" : "camiones"}
                          </span>
                        </div>
                        <div className="card-body">
                          <span className="main-title">{ch.nombre}</span>
                          <span className="sub-detail">
                            C.I. {ch.cedula || "No registrada"}
                            {ch.telefono ? ` • 📞 ${ch.telefono}` : ""}
                          </span>
                        </div>
                        <div className="card-footer">
                          <span>Seleccionar Chofer →</span>
                        </div>
                      </CardSelectionItem>
                    );
                  })}
                </GridSelectionContainer>
              )}
            </ModalBody>
          </StepSection>
        )}

        {/* ========================================================= */}
        {/* VISTA 3: CUADRÍCULA DE CAMIONES DEL CHOFER (ADMIN / REG) */}
        {/* ========================================================= */}
        {pasoModal === "cuadricula_admin_camion" && (
          <StepSection>
            <ModalHeader>
              <HeaderInfo>
                <HeaderBadge>🚛</HeaderBadge>
                <div>
                  <h3>Paso 2: Seleccionar Unidad Cisterna</h3>
                  <p>
                    Chofer seleccionado: <strong>{choferSeleccionado?.nombre}</strong>
                  </p>
                </div>
              </HeaderInfo>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <BtnBackPill
                  type="button"
                  onClick={() => {
                    setMostrarFormNuevoCamion(false);
                    setPasoModal("cuadricula_admin_chofer");
                  }}
                >
                  <MdArrowBack /> Cambiar Chofer
                </BtnBackPill>
                <CloseBtn onClick={onClose} title="Cerrar modal">
                  <MdClose />
                </CloseBtn>
              </div>
            </ModalHeader>

            <ModalBody>
              {mostrarFormNuevoCamion ? (
                <InlineFormCard onSubmit={handleGuardarNuevoCamion}>
                  <div className="form-head">
                    <h4>
                      <MdAddCircleOutline /> Nueva Cisterna para "{choferSeleccionado?.nombre}"
                    </h4>
                    <button
                      type="button"
                      className="btn-cancel-inline"
                      onClick={() => setMostrarFormNuevoCamion(false)}
                    >
                      Cancelar
                    </button>
                  </div>
                  <div className="form-inputs-grid">
                    <div>
                      <label>Placa del Camión: *</label>
                      <input
                        type="text"
                        placeholder="Ej: A12BC34"
                        value={nuevoCamionPlaca}
                        onChange={(e) => setNuevoCamionPlaca(e.target.value.toUpperCase())}
                        required
                        autoFocus
                      />
                    </div>
                    <div>
                      <label>Capacidad (Litros): *</label>
                      <input
                        type="number"
                        placeholder="Ej: 10000"
                        value={nuevoCamionCapacidad}
                        onChange={(e) => setNuevoCamionCapacidad(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label>Modelo / Marca: *</label>
                      <input
                        type="text"
                        placeholder="Ej: Mack, Ford, Iveco..."
                        value={nuevoCamionModelo}
                        onChange={(e) => setNuevoCamionModelo(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                    <span style={{ fontSize: "12px", color: "#94a3b8" }}>Presets rápidos:</span>
                    {PRESETS_CAPACIDAD.map((p) => (
                      <PresetPillBtn
                        key={p}
                        type="button"
                        onClick={() => setNuevoCamionCapacidad(p)}
                      >
                        {p.toLocaleString()} Lts
                      </PresetPillBtn>
                    ))}
                  </div>
                  <div className="form-actions">
                    <button
                      type="button"
                      className="btn-sec"
                      onClick={() => setMostrarFormNuevoCamion(false)}
                      disabled={guardandoInline}
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="btn-pri purple"
                      disabled={guardandoInline}
                    >
                      {guardandoInline ? "Guardando..." : "✅ Guardar Cisterna y Continuar"}
                    </button>
                  </div>
                </InlineFormCard>
              ) : (
                <>
                  {camionesDelChoferSeleccionado.length > 4 && (
                    <SearchGridInputBox>
                      <MdSearch className="search-ico" />
                      <input
                        type="text"
                        placeholder="Buscar por placa o modelo..."
                        value={busquedaCamionGrid}
                        onChange={(e) => setBusquedaCamionGrid(e.target.value)}
                      />
                    </SearchGridInputBox>
                  )}

                  <GridSelectionContainer>
                    {/* Tarjeta Especial: Registrar Nuevo Camión para este chofer */}
                    <SpecialCardCreate
                      type="button"
                      $theme="purple"
                      onClick={() => setMostrarFormNuevoCamion(true)}
                    >
                      <div className="ico-box">
                        <MdAddCircleOutline />
                      </div>
                      <div className="create-text-wrapper">
                        <h4>+ Registrar Nueva Cisterna</h4>
                        <p>Agregar unidad para {choferSeleccionado?.nombre}</p>
                      </div>
                    </SpecialCardCreate>

                    {/* Camiones del chofer */}
                    {camionesFiltradosGrid.map((c) => (
                      <CardSelectionItem
                        key={c.id}
                        type="button"
                        onClick={() => {
                          setCamionSeleccionadoId(c.id);
                          setPasoModal("formulario");
                        }}
                      >
                        <div className="card-top">
                          <span className="plate-badge">{c.placa}</span>
                          <span className="truck-icon">🚚</span>
                        </div>
                        <div className="card-body">
                          <span className="cap-val">
                            <MdWaterDrop /> {Number(c.capacidad).toLocaleString()} Lts
                          </span>
                          <span className="model-name">
                            <MdDirectionsCar /> {c.modelo || "Cisterna"}
                          </span>
                        </div>
                        <div className="card-footer">
                          <span>Seleccionar para Cargar →</span>
                        </div>
                      </CardSelectionItem>
                    ))}
                  </GridSelectionContainer>
                </>
              )}
            </ModalBody>
          </StepSection>
        )}

        {/* ========================================================= */}
        {/* VISTA 4: FORMULARIO PRINCIPAL DE REGISTRO DE RECARGA      */}
        {/* ========================================================= */}
        {pasoModal === "formulario" && (
          <StepSection>
            <ModalHeader>
              <HeaderInfo>
                <HeaderBadge>💧</HeaderBadge>
                <div>
                  <h3>Registrar Recarga de Agua</h3>
                  <p>Ingresa los detalles del viaje cisterna y gestiona el cobro</p>
                </div>
              </HeaderInfo>
              <CloseBtn onClick={onClose} title="Cerrar modal">
                <MdClose />
              </CloseBtn>
            </ModalHeader>

            <Form onSubmit={handleSubmit}>
              <ModalBody>
                {/* 1. TARJETA RESUMEN DE LA UNIDAD Y CHOFER SELECCIONADOS */}
                {camionActual ? (
                  <UnitSelectedCard>
                    <div className="unit-icon-box">
                      <MdLocalShipping />
                    </div>
                    <div className="unit-info">
                      <div className="unit-header-line">
                        <span className="plate-tag">{camionActual.placa}</span>
                        <span className="driver-name">
                          Chofer: <strong>{camionActual.chofer}</strong>
                        </span>
                      </div>
                      <div className="unit-meta-line">
                        <span>
                          <MdWaterDrop /> Capacidad:{" "}
                          <strong>{Number(camionActual.capacidad).toLocaleString()} Lts</strong>
                        </span>
                        {camionActual.modelo && (
                          <span>
                            <MdDirectionsCar /> {camionActual.modelo}
                          </span>
                        )}
                      </div>
                    </div>
                    {/* Botón para volver a elegir si es camionero con >1 camión o admin */}
                    {((user?.role === "camionero" && camiones.length > 1) ||
                      user?.role !== "camionero") && (
                      <BtnChangeUnit
                        type="button"
                        onClick={() => {
                          if (user?.role === "camionero") {
                            setPasoModal("cuadricula_camionero");
                          } else {
                            setPasoModal("cuadricula_admin_chofer");
                          }
                        }}
                      >
                        <MdSwapHoriz /> Cambiar
                      </BtnChangeUnit>
                    )}
                  </UnitSelectedCard>
                ) : (
                  <AlertaSinCamionModal>
                    ⚠️ No hay camión seleccionado.{" "}
                    <button
                      type="button"
                      onClick={() =>
                        setPasoModal(
                          user?.role === "camionero"
                            ? "cuadricula_camionero"
                            : "cuadricula_admin_chofer"
                        )
                      }
                    >
                      Elegir unidad
                    </button>
                  </AlertaSinCamionModal>
                )}

                {/* 2. MONTO A COBRAR */}
                <FormGroup>
                  <Label>
                    <MdAttachMoney className="icon" /> Monto a Cobrar ($): <span className="req">*</span>
                  </Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="Ej: 15.00"
                    value={monto}
                    onChange={(e) => setMonto(e.target.value)}
                    required
                  />
                </FormGroup>

                {/* 3. FOTO DEL CAMIÓN */}
                <FormGroup>
                  <Label>
                    <MdPhotoCamera className="icon" /> Foto de Evidencia de la Cisterna en el Pozo:{" "}
                    {user?.role === "registrador" || user?.role === "camionero" ? (
                      <span className="req">* (Obligatoria)</span>
                    ) : (
                      <span className="optional">(Opcional)</span>
                    )}
                  </Label>
                  <FileInputBox>
                    <input
                      type="file"
                      id="foto-camion-input"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFotoCamionChange}
                    />
                    <FileInputLabel htmlFor="foto-camion-input">
                      <MdPhotoCamera />{" "}
                      {fotoCamion ? "Cambiar foto del camión" : "Tomar foto o subir archivo"}
                    </FileInputLabel>
                    {previewCamion && (
                      <PreviewWrapper>
                        <PreviewImage src={previewCamion} alt="Vista previa camión" />
                        <RemovePreviewBtn
                          type="button"
                          onClick={() => {
                            setFotoCamion(null);
                            setPreviewCamion(null);
                          }}
                          title="Quitar foto"
                        >
                          <MdDeleteOutline />
                        </RemovePreviewBtn>
                      </PreviewWrapper>
                    )}
                  </FileInputBox>
                </FormGroup>

                {/* 4. SELECTOR DE TIPO DE REGISTRO: PAGADO vs DEUDA */}
                <SectionDivider>
                  <span>Tipo de Transacción</span>
                </SectionDivider>

                <ToggleGrid>
                  <ToggleOption
                    type="button"
                    $active={tipoRegistro === "pagado"}
                    onClick={() => setTipoRegistro("pagado")}
                  >
                    <div className="icon-wrap paid">
                      <MdCheckCircle />
                    </div>
                    <div>
                      <h4>Marcar como Pagado</h4>
                      <p>Registra la referencia bancaria y comprobante</p>
                    </div>
                  </ToggleOption>

                  <ToggleOption
                    type="button"
                    $active={tipoRegistro === "deuda"}
                    onClick={() => setTipoRegistro("deuda")}
                  >
                    <div className="icon-wrap debt">
                      <MdHourglassEmpty />
                    </div>
                    <div>
                      <h4>Cargar como Deuda</h4>
                      <p>Se enviará a Cuentas por Cobrar por camión</p>
                    </div>
                  </ToggleOption>
                </ToggleGrid>

                {/* 5. CAMPOS CONDICIONALES SI ES MARCADO COMO PAGADO */}
                {tipoRegistro === "pagado" && (
                  <PaidFieldsContainer>
                    <FormGroup>
                      <Label>
                        <MdPayments className="icon" /> Método de Pago:
                      </Label>
                      <Select
                        value={metodoPago}
                        onChange={(e) => setMetodoPago(e.target.value)}
                      >
                        <option value="Transferencia">Transferencia Bancaria</option>
                        <option value="Pago Móvil">Pago Móvil</option>
                        <option value="Efectivo">Efectivo en Taquilla</option>
                        <option value="Zelle">Zelle</option>
                      </Select>
                    </FormGroup>

                    {metodoPago !== "Efectivo" && (
                      <FormGroup>
                        <Label>
                          <MdConfirmationNumber className="icon" /> Número de Referencia Bancaria:{" "}
                          <span className="req">* (Obligatoria)</span>
                        </Label>
                        <Input
                          type="text"
                          placeholder="Ej: 00481923"
                          value={referencia}
                          onChange={(e) => setReferencia(e.target.value)}
                          required
                        />
                      </FormGroup>
                    )}

                    <FormGroup>
                      <Label>
                        <MdReceipt className="icon" /> Foto de la Factura / Comprobante de Pago:{" "}
                        {user?.role === "registrador" || user?.role === "camionero" ? (
                          <span className="req">* (Obligatoria)</span>
                        ) : (
                          <span className="optional">(Opcional)</span>
                        )}
                      </Label>
                      <FileInputBox>
                        <input
                          type="file"
                          id="foto-comprobante-input"
                          accept="image/*"
                          onChange={handleFotoComprobanteChange}
                        />
                        <FileInputLabel htmlFor="foto-comprobante-input" className="comprobante">
                          <MdReceipt />{" "}
                          {fotoComprobante
                            ? "Cambiar foto comprobante"
                            : "Adjuntar foto de comprobante/factura"}
                        </FileInputLabel>
                        {previewComprobante && (
                          <PreviewWrapper>
                            <PreviewImage src={previewComprobante} alt="Vista previa comprobante" />
                            <RemovePreviewBtn
                              type="button"
                              onClick={() => {
                                setFotoComprobante(null);
                                setPreviewComprobante(null);
                              }}
                              title="Quitar foto comprobante"
                            >
                              <MdDeleteOutline />
                            </RemovePreviewBtn>
                          </PreviewWrapper>
                        )}
                      </FileInputBox>
                    </FormGroup>
                  </PaidFieldsContainer>
                )}

                {/* Mensaje informativo si es Deuda */}
                {tipoRegistro === "deuda" && (
                  <DebtNoticeBox>
                    <MdHourglassEmpty />
                    <div>
                      <strong>Aviso de Crédito / Deuda:</strong>
                      <p>
                        Esta recarga quedará registrada como <strong>pendiente</strong>.
                        Aparecerá en el módulo de <strong>Cuentas por Cobrar</strong> acumulada bajo
                        este camión.
                      </p>
                    </div>
                  </DebtNoticeBox>
                )}

                {/* 6. NOTA U OBSERVACIÓN */}
                <FormGroup>
                  <Label>
                    <MdEditNote className="icon" /> Nota u Observación de la Carga:{" "}
                    <span className="optional">(Opcional para revisión posterior)</span>
                  </Label>
                  <Textarea
                    rows="2"
                    placeholder="Ej: Chofer reportó novedad, pendiente validar en taquilla..."
                    value={nota}
                    onChange={(e) => setNota(e.target.value)}
                  />
                </FormGroup>
              </ModalBody>

              <ModalFooter>
                <CancelButton type="button" onClick={onClose} disabled={loading}>
                  Cancelar
                </CancelButton>

                {tipoRegistro === "pagado" ? (
                  <SubmitButton
                    type="submit"
                    $variant="paid"
                    disabled={loading || !camionSeleccionadoId}
                  >
                    {loading ? "Procesando pago..." : "✅ Registrar Pago de Recarga"}
                  </SubmitButton>
                ) : (
                  <SubmitButton
                    type="submit"
                    $variant="debt"
                    disabled={loading || !camionSeleccionadoId}
                  >
                    {loading ? "Guardando deuda..." : "⏳ Cargar Recarga como Deuda"}
                  </SubmitButton>
                )}
              </ModalFooter>
            </Form>
          </StepSection>
        )}
      </ModalContainer>
    </Overlay>
  );
}

// 🎨 ANIMACIONES
const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const fadeInScale = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  100% {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC MODAL
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  animation: ${fadeIn} 0.2s ease-out;

  @media (max-width: 600px) {
    padding: 8px;
  }
`;

const ModalContainer = styled.div`
  background: #0f172a;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 24px;
  width: 100%;
  max-width: 760px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  min-height: 0;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 40px rgba(0, 195, 255, 0.15);
  overflow: hidden;
  position: relative;
  transition: all 0.25s ease-in-out;

  @media (max-width: 600px) {
    max-height: 94vh;
    border-radius: 18px;
  }
`;

const StepSection = styled.div`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  animation: ${fadeInScale} 0.26s cubic-bezier(0.16, 1, 0.3, 1) forwards;
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.95);
  flex-shrink: 0;

  @media (max-width: 600px) {
    padding: 12px 14px;
  }
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -0.3px;

    @media (max-width: 600px) {
      font-size: 15px;
      line-height: 1.2;
    }
  }

  p {
    margin: 3px 0 0 0;
    font-size: 12.5px;
    color: #94a3b8;

    @media (max-width: 600px) {
      font-size: 11px;
      margin-top: 2px;
    }

    strong {
      color: #38bdf8;
    }
  }
`;

const HeaderBadge = styled.div`
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: rgba(0, 195, 255, 0.12);
  border: 1px solid rgba(0, 195, 255, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;

  @media (max-width: 600px) {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    font-size: 17px;
  }
`;

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
    color: #ef4444;
  }

  @media (max-width: 600px) {
    width: 32px;
    height: 32px;
    font-size: 18px;
    border-radius: 8px;
  }
`;

const BtnBackPill = styled.button`
  background: rgba(0, 195, 255, 0.12);
  border: 1px solid rgba(0, 195, 255, 0.3);
  color: #38bdf8;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 195, 255, 0.25);
    color: #ffffff;
  }

  @media (max-width: 600px) {
    padding: 6px 10px;
    font-size: 11px;
    border-radius: 8px;
  }
`;

const ModalBody = styled.div`
  padding: 22px 24px;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 4px;
  }

  @media (max-width: 600px) {
    padding: 12px;
    gap: 10px;
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 600;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 6px;

  .icon {
    color: #00c3ff;
    font-size: 17px;
  }

  .req {
    color: #ef4444;
    font-size: 12px;
  }

  .optional {
    color: #64748b;
    font-size: 12px;
    font-weight: 400;
  }
`;

const Input = styled.input`
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: all 0.2s;

  &:focus {
    border-color: #00c3ff;
    box-shadow: 0 0 15px rgba(0, 195, 255, 0.25);
  }
`;

const Select = styled.select`
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  transition: all 0.2s;

  &:focus {
    border-color: #00c3ff;
    box-shadow: 0 0 15px rgba(0, 195, 255, 0.25);
  }
`;

const Textarea = styled.textarea`
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 12px 16px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
  resize: vertical;
  transition: all 0.2s;

  &:focus {
    border-color: #00c3ff;
    box-shadow: 0 0 15px rgba(0, 195, 255, 0.25);
  }
`;

// 🔲 CUADRÍCULA DE SELECCIÓN Y TARJETAS
const SearchGridInputBox = styled.div`
  display: flex;
  align-items: center;
  background: rgba(15, 23, 42, 0.9);
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 12px;
  padding: 10px 14px;
  gap: 10px;
  flex-shrink: 0;

  .search-ico {
    color: #00c3ff;
    font-size: 20px;
    flex-shrink: 0;
  }

  input {
    flex: 1;
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 14px;
    outline: none;

    &::placeholder {
      color: #64748b;
    }
  }

  @media (max-width: 600px) {
    padding: 8px 12px;
    border-radius: 10px;

    .search-ico {
      font-size: 18px;
    }

    input {
      font-size: 13px;
    }
  }
`;

const GridSelectionContainer = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(215px, 1fr));
  gap: 14px;

  @media (max-width: 600px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
`;

const CardSelectionItem = styled.button`
  background: rgba(30, 41, 59, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  text-align: left;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  cursor: pointer;
  transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
  min-height: 130px;

  &:hover {
    transform: translateY(-3px);
    background: rgba(30, 41, 59, 0.85);
    border-color: rgba(0, 195, 255, 0.5);
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4), 0 0 20px rgba(0, 195, 255, 0.2);

    .card-footer span {
      color: #38bdf8;
    }
  }

  &:active {
    transform: scale(0.97);
    background: rgba(30, 41, 59, 0.95);
    border-color: #00c3ff;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
    width: 100%;

    .plate-badge {
      background: rgba(0, 195, 255, 0.15);
      border: 1px solid rgba(0, 195, 255, 0.4);
      color: #38bdf8;
      font-weight: 800;
      font-size: 13px;
      letter-spacing: 0.8px;
      padding: 4px 10px;
      border-radius: 8px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 120px;
    }

    .truck-icon {
      font-size: 20px;
      flex-shrink: 0;
    }

    .avatar-chip {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      background: rgba(59, 130, 246, 0.15);
      border: 1px solid rgba(59, 130, 246, 0.3);
      color: #60a5fa;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 18px;
      flex-shrink: 0;
    }

    .count-badge {
      font-size: 11px;
      color: #94a3b8;
      background: rgba(255, 255, 255, 0.05);
      padding: 3px 8px;
      border-radius: 6px;
      white-space: nowrap;
      flex-shrink: 0;
    }
  }

  .card-body {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
    width: 100%;
    min-width: 0;

    .cap-val {
      font-size: 16px;
      font-weight: 800;
      color: #ffffff;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;

      svg {
        color: #00c3ff;
      }
    }

    .model-name {
      font-size: 12px;
      color: #94a3b8;
      display: flex;
      align-items: center;
      gap: 5px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .main-title {
      font-size: 15px;
      font-weight: 700;
      color: #ffffff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sub-detail {
      font-size: 12px;
      color: #94a3b8;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  .card-footer {
    border-top: 1px solid rgba(255, 255, 255, 0.06);
    padding-top: 8px;
    width: 100%;

    span {
      font-size: 11px;
      font-weight: 600;
      color: #64748b;
      transition: color 0.2s;
      display: block;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
  }

  @media (max-width: 600px) {
    padding: 11px 9px;
    border-radius: 14px;
    min-height: 122px;

    .card-top {
      margin-bottom: 6px;

      .plate-badge {
        font-size: 11px;
        padding: 2px 6px;
        max-width: 85px;
        letter-spacing: 0.3px;
      }

      .truck-icon {
        font-size: 16px;
      }

      .avatar-chip {
        width: 28px;
        height: 28px;
        font-size: 15px;
        border-radius: 7px;
      }

      .count-badge {
        font-size: 9.5px;
        padding: 2px 5px;
      }
    }

    .card-body {
      gap: 2px;
      margin-bottom: 6px;

      .cap-val {
        font-size: 13.5px;
        gap: 3px;
        svg {
          font-size: 14px;
        }
      }

      .model-name {
        font-size: 10.5px;
        gap: 3px;
        svg {
          font-size: 12px;
        }
      }

      .main-title {
        font-size: 13px;
        line-height: 1.25;
      }

      .sub-detail {
        font-size: 10px;
        line-height: 1.2;
      }
    }

    .card-footer {
      padding-top: 5px;

      span {
        font-size: 10px;
        color: #38bdf8;
      }
    }
  }
`;

// Tarjeta destacada especial para registrar nuevo chofer o camión
const SpecialCardCreate = styled.button`
  background: ${(props) =>
    props.$theme === "emerald"
      ? "linear-gradient(135deg, rgba(6, 78, 59, 0.4) 0%, rgba(6, 95, 70, 0.25) 100%)"
      : "linear-gradient(135deg, rgba(76, 29, 149, 0.4) 0%, rgba(91, 33, 182, 0.25) 100%)"};
  border: 1px dashed
    ${(props) =>
      props.$theme === "emerald"
        ? "rgba(16, 185, 129, 0.6)"
        : "rgba(139, 92, 246, 0.6)"};
  border-radius: 16px;
  padding: 18px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  cursor: pointer;
  transition: all 0.24s cubic-bezier(0.16, 1, 0.3, 1);
  min-height: 130px;

  &:hover {
    transform: translateY(-3px);
    background: ${(props) =>
      props.$theme === "emerald"
        ? "rgba(6, 95, 70, 0.6)"
        : "rgba(91, 33, 182, 0.6)"};
    border-style: solid;
    border-color: ${(props) =>
      props.$theme === "emerald" ? "#10b981" : "#a855f7"};
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5),
      0 0 20px
        ${(props) =>
          props.$theme === "emerald"
            ? "rgba(16, 185, 129, 0.35)"
            : "rgba(168, 85, 247, 0.35)"};
  }

  &:active {
    transform: scale(0.97);
  }

  .ico-box {
    width: 42px;
    height: 42px;
    border-radius: 12px;
    background: ${(props) =>
      props.$theme === "emerald"
        ? "rgba(16, 185, 129, 0.2)"
        : "rgba(168, 85, 247, 0.2)"};
    color: ${(props) =>
      props.$theme === "emerald" ? "#34d399" : "#c084fc"};
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    margin-bottom: 8px;
    flex-shrink: 0;
  }

  .create-text-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }

  h4 {
    margin: 0 0 3px 0;
    font-size: 14px;
    font-weight: 700;
    color: ${(props) =>
      props.$theme === "emerald" ? "#6ee7b7" : "#e9d5ff"};
  }

  p {
    margin: 0;
    font-size: 11.5px;
    color: #94a3b8;
  }

  @media (max-width: 600px) {
    min-height: 122px;
    padding: 11px 8px;
    border-radius: 14px;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    gap: 4px;

    .ico-box {
      width: 32px;
      height: 32px;
      font-size: 18px;
      border-radius: 8px;
      margin-bottom: 4px;
    }

    .create-text-wrapper {
      align-items: center;
      text-align: center;
    }

    h4 {
      font-size: 12px;
      margin: 0;
      line-height: 1.25;
      font-weight: 700;
    }

    p {
      font-size: 9.5px;
      margin-top: 2px;
      line-height: 1.2;
    }
  }
`;

// Formulario inline rápido para agregar chofer o camión
const InlineFormCard = styled.form`
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(0, 195, 255, 0.35);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  animation: ${fadeInScale} 0.2s ease-out;

  .form-head {
    display: flex;
    justify-content: space-between;
    align-items: center;

    h4 {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      color: #38bdf8;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .btn-cancel-inline {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      text-decoration: underline;

      &:hover {
        color: #ffffff;
      }
    }
  }

  .form-inputs-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
    gap: 12px;

    div {
      display: flex;
      flex-direction: column;
      gap: 6px;

      label {
        font-size: 12px;
        color: #cbd5e1;
        font-weight: 600;
      }

      input {
        background: #0f172a;
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 10px;
        padding: 10px 12px;
        color: #ffffff;
        font-size: 13px;
        outline: none;

        &:focus {
          border-color: #00c3ff;
        }
      }
    }
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    gap: 10px;

    button {
      padding: 10px 18px;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }

    .btn-sec {
      background: rgba(255, 255, 255, 0.08);
      color: #cbd5e1;

      &:hover {
        background: rgba(255, 255, 255, 0.15);
      }
    }

    .btn-pri {
      color: #ffffff;

      &.emerald {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);

        &:hover {
          box-shadow: 0 6px 20px rgba(16, 185, 129, 0.5);
        }
      }

      &.purple {
        background: linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%);
        box-shadow: 0 4px 15px rgba(139, 92, 246, 0.35);

        &:hover {
          box-shadow: 0 6px 20px rgba(139, 92, 246, 0.5);
        }
      }
    }
  }

  @media (max-width: 600px) {
    padding: 12px;
    border-radius: 14px;
    gap: 10px;

    .form-inputs-grid {
      grid-template-columns: 1fr !important;
      gap: 8px !important;
    }

    .form-actions {
      flex-direction: column-reverse;
      gap: 6px;

      button {
        width: 100%;
        justify-content: center;
        padding: 9px 12px;
      }
    }
  }
`;

const PresetPillBtn = styled.button`
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  font-size: 11px;
  padding: 3px 8px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: rgba(0, 195, 255, 0.15);
    color: #38bdf8;
    border-color: rgba(0, 195, 255, 0.3);
  }
`;

// Tarjeta superior de la unidad seleccionada en el formulario
const UnitSelectedCard = styled.div`
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.8) 0%, rgba(30, 41, 59, 0.8) 100%);
  border: 1px solid rgba(0, 195, 255, 0.35);
  border-radius: 16px;
  padding: 14px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  .unit-icon-box {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(0, 195, 255, 0.15);
    color: #00c3ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  .unit-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 4px;

    .unit-header-line {
      display: flex;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;

      .plate-tag {
        background: rgba(0, 195, 255, 0.2);
        border: 1px solid rgba(0, 195, 255, 0.5);
        color: #38bdf8;
        font-weight: 800;
        font-size: 13px;
        padding: 3px 8px;
        border-radius: 6px;
        letter-spacing: 0.5px;
      }

      .driver-name {
        font-size: 13px;
        color: #e2e8f0;

        strong {
          color: #ffffff;
        }
      }
    }

    .unit-meta-line {
      display: flex;
      gap: 14px;
      font-size: 12px;
      color: #94a3b8;
      flex-wrap: wrap;

      span {
        display: flex;
        align-items: center;
        gap: 4px;

        strong {
          color: #38bdf8;
        }
      }
    }
  }

  @media (max-width: 600px) {
    padding: 10px 12px;
    gap: 10px;
    border-radius: 12px;

    .unit-icon-box {
      width: 36px;
      height: 36px;
      font-size: 20px;
    }

    .unit-info {
      gap: 2px;

      .unit-header-line {
        gap: 6px;

        .plate-tag {
          font-size: 12px;
          padding: 2px 6px;
        }

        .driver-name {
          font-size: 12px;
        }
      }

      .unit-meta-line {
        gap: 8px;
        font-size: 11px;
      }
    }
  }
`;

const BtnChangeUnit = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #cbd5e1;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 5px;
  cursor: pointer;
  transition: all 0.2s;
  flex-shrink: 0;

  &:hover {
    background: rgba(0, 195, 255, 0.15);
    border-color: rgba(0, 195, 255, 0.4);
    color: #38bdf8;
  }

  @media (max-width: 600px) {
    padding: 5px 9px;
    font-size: 11px;
  }
`;

const EmptyGridNotice = styled.div`
  text-align: center;
  padding: 40px 20px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 16px;

  .warn-ico {
    font-size: 40px;
    color: #f59e0b;
    margin-bottom: 10px;
  }

  h4 {
    color: #ffffff;
    font-size: 16px;
    margin: 0 0 6px 0;
  }

  p {
    color: #94a3b8;
    font-size: 13px;
    margin: 0;
  }
`;

const AlertaSinCamionModal = styled.div`
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.35);
  color: #fef08a;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 13px;
  line-height: 1.5;

  button {
    background: #eab308;
    border: none;
    color: #000;
    font-weight: 700;
    padding: 3px 8px;
    border-radius: 6px;
    margin-left: 8px;
    cursor: pointer;
  }
`;

// FOTOS
const FileInputBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  input[type="file"] {
    display: none;
  }
`;

const FileInputLabel = styled.label`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 14px 20px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px dashed rgba(0, 195, 255, 0.4);
  border-radius: 14px;
  color: #38bdf8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 195, 255, 0.1);
    border-color: #00c3ff;
  }

  &.comprobante {
    border-color: rgba(34, 197, 94, 0.4);
    color: #4ade80;

    &:hover {
      background: rgba(34, 197, 94, 0.1);
      border-color: #22c55e;
    }
  }
`;

const PreviewWrapper = styled.div`
  position: relative;
  width: 100%;
  max-height: 180px;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.1);
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 180px;
  object-fit: cover;
  display: block;
`;

const RemovePreviewBtn = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(239, 68, 68, 0.85);
  border: none;
  color: #ffffff;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #ef4444;
    transform: scale(1.05);
  }
`;

// TIPO DE REGISTRO
const SectionDivider = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  margin: 4px 0;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  }

  span {
    padding: 0 12px;
    font-size: 12px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
`;

const ToggleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
`;

const ToggleOption = styled.button`
  background: ${(props) =>
    props.$active ? "rgba(30, 41, 59, 0.9)" : "rgba(15, 23, 42, 0.6)"};
  border: 1px solid
    ${(props) =>
      props.$active ? "rgba(0, 195, 255, 0.5)" : "rgba(255, 255, 255, 0.08)"};
  border-radius: 14px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    border-color: rgba(0, 195, 255, 0.35);
  }

  .icon-wrap {
    width: 38px;
    height: 38px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;

    &.paid {
      background: ${(props) =>
        props.$active ? "rgba(34, 197, 94, 0.2)" : "rgba(34, 197, 94, 0.1)"};
      color: #22c55e;
    }

    &.debt {
      background: ${(props) =>
        props.$active ? "rgba(234, 179, 8, 0.2)" : "rgba(234, 179, 8, 0.1)"};
      color: #eab308;
    }
  }

  h4 {
    margin: 0 0 2px 0;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
  }

  p {
    margin: 0;
    font-size: 11px;
    color: #94a3b8;
  }
`;

const PaidFieldsContainer = styled.div`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const DebtNoticeBox = styled.div`
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.3);
  border-radius: 14px;
  padding: 14px 18px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  color: #fef08a;

  svg {
    font-size: 24px;
    color: #eab308;
    flex-shrink: 0;
    margin-top: 2px;
  }

  strong {
    display: block;
    font-size: 13px;
    margin-bottom: 2px;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #cbd5e1;
    line-height: 1.4;

    strong {
      display: inline;
      color: #fef08a;
    }
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(15, 23, 42, 0.85);
  flex-shrink: 0;

  @media (max-width: 600px) {
    padding: 10px 14px;
    gap: 8px;
  }
`;

const CancelButton = styled.button`
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #cbd5e1;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.12);
    color: #ffffff;
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (max-width: 600px) {
    padding: 10px 14px;
    font-size: 13px;
    border-radius: 10px;
  }
`;

const SubmitButton = styled.button`
  background: ${(props) =>
    props.$variant === "paid"
      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      : "linear-gradient(135deg, #eab308 0%, #ca8a04 100%)"};
  border: none;
  color: #ffffff;
  padding: 12px 24px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 20px
    ${(props) =>
      props.$variant === "paid"
        ? "rgba(16, 185, 129, 0.4)"
        : "rgba(234, 179, 8, 0.4)"};

  @media (max-width: 600px) {
    padding: 10px 14px;
    font-size: 13px;
    border-radius: 10px;
    justify-content: center;
  }

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px
      ${(props) =>
        props.$variant === "paid"
          ? "rgba(16, 185, 129, 0.6)"
          : "rgba(234, 179, 8, 0.6)"};
  }

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
`;
