import React, { useState, useEffect, useMemo, useRef } from "react";
import styled from "styled-components";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import {
  MdWaterDrop,
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
  MdOutlineAccessTime,
  MdPerson,
  MdDoneAll,
} from "react-icons/md";

export function DashboardRegistrador() {
  const user = useAuthStore((state) => state.user);

  // Lista de camiones
  const [camiones, setCamiones] = useState([]);
  const [cargandoCamiones, setCargandoCamiones] = useState(false);
  const [camionSeleccionadoId, setCamionSeleccionadoId] = useState("");
  const [busquedaCamion, setBusquedaCamion] = useState("");
  const [mostrarMenuCamiones, setMostrarMenuCamiones] = useState(false);
  const comboboxRef = useRef(null);

  // Campos del formulario
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");

  // Fotos
  const [fotoCamion, setFotoCamion] = useState(null);
  const [previewCamion, setPreviewCamion] = useState(null);
  const [fotoComprobante, setFotoComprobante] = useState(null);
  const [previewComprobante, setPreviewComprobante] = useState(null);

  // Tipo: pagado vs deuda
  const [tipoRegistro, setTipoRegistro] = useState("pagado"); // "pagado" | "deuda"
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [referencia, setReferencia] = useState("");

  const [guardando, setGuardando] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [mensajeExito, setMensajeExito] = useState("");

  useEffect(() => {
    cargarCamiones();
    cargarUltimoRegistro();
  }, []);

  // Cierre del dropdown de búsqueda al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (comboboxRef.current && !comboboxRef.current.contains(e.target)) {
        setMostrarMenuCamiones(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cargarCamiones = async () => {
    setCargandoCamiones(true);
    try {
      const { data, error } = await supabase
        .from("camiones")
        .select("id, placa, chofer, capacidad, modelo")
        .order("chofer", { ascending: true });

      if (error) throw error;
      setCamiones(data || []);
    } catch (err) {
      console.error("Error al cargar camiones:", err.message);
    } finally {
      setCargandoCamiones(false);
    }
  };

  const cargarUltimoRegistro = async () => {
    try {
      let query = supabase
        .from("registros_carga")
        .select(`
          id,
          monto,
          metodo,
          referencia,
          fecha_carga,
          estatus,
          camiones ( placa, chofer, capacidad )
        `)
        .order("fecha_carga", { ascending: false })
        .limit(1);

      if (user?.id) {
        query = query.eq("usuario_id", user.id);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setUltimoRegistro(data[0]);
      }
    } catch (err) {
      console.warn("No se pudo cargar el último registro:", err);
    }
  };

  const limpiarCampos = () => {
    setCamionSeleccionadoId("");
    setBusquedaCamion("");
    setMostrarMenuCamiones(false);
    setMonto("");
    setNota("");
    setFotoCamion(null);
    setPreviewCamion(null);
    setFotoComprobante(null);
    setPreviewComprobante(null);
    setTipoRegistro("pagado");
    setMetodoPago("Transferencia");
    setReferencia("");
  };

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

  const subirFoto = async (file, carpeta) => {
    if (!file) return null;
    const fileExt = file.name.split(".").pop();
    const fileName = `${carpeta}_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${carpeta}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("comprobantes")
      .upload(filePath, file);

    if (uploadError) {
      console.warn(`Error al subir imagen a ${carpeta}:`, uploadError.message);
      return null;
    }

    const { data } = supabase.storage.from("comprobantes").getPublicUrl(filePath);
    return data?.publicUrl || null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!camionSeleccionadoId) {
      alert("⚠️ Por favor selecciona el camión cisterna de la lista.");
      return;
    }

    const montoNum = parseFloat(monto);
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      alert("⚠️ Por favor ingresa un monto válido mayor a 0.");
      return;
    }

    if (tipoRegistro === "pagado" && metodoPago !== "Efectivo" && !referencia.trim()) {
      alert("⚠️ La referencia bancaria es obligatoria para pagos por Transferencia, Pago Móvil o Punto.");
      return;
    }

    // 📸 Foto de la cisterna en el pozo: OBLIGATORIA para el registrador
    if (!fotoCamion) {
      alert("⚠️ La foto de la cisterna cargando en el pozo es obligatoria para el registrador.");
      return;
    }

    // 📸 Foto del comprobante de pago: OBLIGATORIA para recargas pagadas al momento
    if (tipoRegistro === "pagado" && !fotoComprobante) {
      alert("⚠️ La foto del comprobante de pago es obligatoria para el registrador cuando se marca como pagado.");
      return;
    }

    setGuardando(true);
    setMensajeExito("");

    try {
      let urlFotoCamion = null;
      let urlComprobante = null;

      if (fotoCamion) {
        urlFotoCamion = await subirFoto(fotoCamion, "camiones");
      }

      if (tipoRegistro === "pagado" && fotoComprobante) {
        urlComprobante = await subirFoto(fotoComprobante, "pagos");
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

      // Intento con campos extendidos
      let { data: nuevoReg, error: insertError } = await supabase
        .from("registros_carga")
        .insert([payloadExtendido])
        .select(`
          id,
          monto,
          metodo,
          referencia,
          fecha_carga,
          estatus,
          camiones ( placa, chofer, capacidad )
        `)
        .single();

      if (insertError) {
        console.warn("Reintentando con payload base:", insertError.message);
        const { data: fallbackReg, error: errFallback } = await supabase
          .from("registros_carga")
          .insert([registroPayload])
          .select(`
            id,
            monto,
            metodo,
            referencia,
            fecha_carga,
            estatus,
            camiones ( placa, chofer, capacidad )
          `)
          .single();

        insertError = errFallback;
        nuevoReg = fallbackReg;
      }

      if (insertError) throw insertError;

      const camionObj = camiones.find((c) => String(c.id) === String(camionSeleccionadoId));
      const msg = esPagado
        ? `✅ ¡Recarga de $${montoNum} (${camionObj?.placa || "Camión"}) registrada como PAGADA!`
        : `⏳ ¡Recarga de $${montoNum} (${camionObj?.placa || "Camión"}) registrada como DEUDA en Cuentas por Cobrar!`;

      setMensajeExito(msg);
      if (nuevoReg) setUltimoRegistro(nuevoReg);

      limpiarCampos();
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error("Error al registrar recarga:", err);
      alert(`Error al registrar recarga: ${err.message || "Error desconocido"}`);
    } finally {
      setGuardando(false);
    }
  };

  const camionesFiltrados = useMemo(() => {
    if (!busquedaCamion.trim()) return camiones;
    const q = busquedaCamion.toLowerCase().trim();
    return camiones.filter(
      (c) =>
        c.placa?.toLowerCase().includes(q) ||
        c.chofer?.toLowerCase().includes(q) ||
        c.modelo?.toLowerCase().includes(q) ||
        String(c.capacidad).includes(q)
    );
  }, [camiones, busquedaCamion]);

  const camionActual = camiones.find((c) => String(c.id) === String(camionSeleccionadoId));

  return (
    <Container>
      {/* 🌟 BANNER DE BIENVENIDA AL REGISTRADOR */}
      <TopTerminalHeader>
        <div className="terminal-badge">
          <MdWaterDrop /> Estación de Despacho de Agua
        </div>
        <h2>Bienvenido, {user?.name || "Operador"} 👋</h2>
        <p>
          Ingresa los datos de la unidad cisterna para procesar la recarga al instante o asignarla a cuentas por cobrar.
        </p>
      </TopTerminalHeader>

      {/* MENSAJE DE ÉXITO PROMINENTE */}
      {mensajeExito && (
        <SuccessBanner>
          <MdDoneAll className="success-icon" />
          <div className="text">
            <strong>¡Registro Completado con Éxito!</strong>
            <p>{mensajeExito}</p>
          </div>
          <button type="button" onClick={() => setMensajeExito("")}>
            ✕
          </button>
        </SuccessBanner>
      )}

      <GridWrapper>
        {/* FORMULARIO PRINCIPAL DE DESPACHO */}
        <DispatchCard onSubmit={handleSubmit}>
          <CardHeader>
            <div className="icon-header">
              <MdLocalShipping />
            </div>
            <div>
              <h3>Registrar Recarga de Cisterna</h3>
              <p>Completa la información del viaje y confirma el despacho</p>
            </div>
          </CardHeader>

          {/* 1. SELECCIÓN DE CAMIÓN CON COMBOBOX */}
          <FormGroup ref={comboboxRef} style={{ position: "relative" }}>
            <Label>
              <MdLocalShipping className="icon" /> Buscar y Seleccionar Camión Cisterna: <span className="req">*</span>
            </Label>

            <ComboboxInputWrapper>
              <MdSearch className="search-icon" />
              <SearchInput
                type="text"
                placeholder="Escribe la placa, nombre del chofer o modelo..."
                value={busquedaCamion}
                onChange={(e) => {
                  setBusquedaCamion(e.target.value);
                  setMostrarMenuCamiones(true);
                  if (camionSeleccionadoId) setCamionSeleccionadoId("");
                }}
                onFocus={() => setMostrarMenuCamiones(true)}
              />
              {cargandoCamiones && <SpinnerInline />}
            </ComboboxInputWrapper>

            {mostrarMenuCamiones && (
              <ComboboxDropdown>
                {camionesFiltrados.length === 0 ? (
                  <DropdownEmpty>
                    No se encontraron camiones con esa placa o chofer.
                  </DropdownEmpty>
                ) : (
                  camionesFiltrados.map((c) => (
                    <ComboboxItem
                      key={c.id}
                      $selected={String(c.id) === String(camionSeleccionadoId)}
                      onClick={() => {
                        setCamionSeleccionadoId(c.id);
                        setBusquedaCamion(`${c.placa} — ${c.chofer}`);
                        setMostrarMenuCamiones(false);
                      }}
                    >
                      <div className="item-plate">
                        <span className="plate-badge">{c.placa}</span>
                        <span className="driver-name">{c.chofer}</span>
                      </div>
                      <div className="item-specs">
                        <span>💧 {c.capacidad?.toLocaleString()} Lts</span>
                        {c.modelo && <span className="model"> • {c.modelo}</span>}
                      </div>
                    </ComboboxItem>
                  ))
                )}
              </ComboboxDropdown>
            )}

            {camionActual && (
              <SelectedTruckPill>
                <div className="pill-icon">
                  <MdCheckCircle />
                </div>
                <div className="pill-info">
                  <strong>{camionActual.placa}</strong> — {camionActual.chofer}
                  <span className="sub">
                    Capacidad: {camionActual.capacidad?.toLocaleString()} Lts {camionActual.modelo ? `| Modelo: ${camionActual.modelo}` : ""}
                  </span>
                </div>
              </SelectedTruckPill>
            )}
          </FormGroup>

          {/* 2. MONTO DE LA RECARGA */}
          <FormGroup>
            <Label>
              <MdAttachMoney className="icon" /> Monto de la Recarga ($ USD): <span className="req">*</span>
            </Label>
            <Input
              type="number"
              step="0.01"
              placeholder="Ej: 25.00"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </FormGroup>

          {/* 3. TIPO DE REGISTRO: PAGADO vs DEUDA */}
          <FormGroup>
            <Label>Estatus del Cobro de la Recarga:</Label>
            <TypeSelectorGrid>
              <TypeButton
                type="button"
                $active={tipoRegistro === "pagado"}
                $variant="success"
                onClick={() => setTipoRegistro("pagado")}
              >
                <MdCheckCircle className="btn-icon" />
                <div className="btn-text">
                  <span className="btn-title">Pagado al Momento</span>
                  <span className="btn-desc">Registrar referencia de pago</span>
                </div>
              </TypeButton>

              <TypeButton
                type="button"
                $active={tipoRegistro === "deuda"}
                $variant="warning"
                onClick={() => setTipoRegistro("deuda")}
              >
                <MdHourglassEmpty className="btn-icon" />
                <div className="btn-text">
                  <span className="btn-title">Cargar como Deuda</span>
                  <span className="btn-desc">Cuentas por Cobrar</span>
                </div>
              </TypeButton>
            </TypeSelectorGrid>
          </FormGroup>

          {/* 4. CAMPOS SI ES PAGADO */}
          {tipoRegistro === "pagado" && (
            <PaymentFieldsBox>
              <PaymentFieldsGrid>
                <FormGroup>
                  <Label>
                    <MdPayments className="icon" /> Método de Pago:
                  </Label>
                  <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Efectivo">Efectivo ($ USD o Bs)</option>
                    <option value="Punto de Venta">Punto de Venta</option>
                  </Select>
                </FormGroup>

                <FormGroup>
                  <Label>
                    <MdReceipt className="icon" /> N° Referencia Bancaria:
                    {metodoPago !== "Efectivo" && <span className="req"> *</span>}
                  </Label>
                  <Input
                    type="text"
                    placeholder={metodoPago === "Efectivo" ? "Opcional para efectivo" : "Ej: 98451230"}
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                    required={metodoPago !== "Efectivo"}
                  />
                </FormGroup>
              </PaymentFieldsGrid>

              {/* FOTO COMPROBANTE DE PAGO */}
              <FormGroup>
                <Label>
                  <MdPhotoCamera className="icon" /> Foto del Comprobante de Pago: <span className="req">* Obligatoria</span>
                </Label>
                <PhotoUploadContainer>
                  {previewComprobante ? (
                    <PhotoPreviewWrapper>
                      <img src={previewComprobante} alt="Preview comprobante" />
                      <RemovePhotoBtn
                        type="button"
                        onClick={() => {
                          setFotoComprobante(null);
                          setPreviewComprobante(null);
                        }}
                      >
                        <MdDeleteOutline /> Quitar
                      </RemovePhotoBtn>
                    </PhotoPreviewWrapper>
                  ) : (
                    <UploadDropzone>
                      <input
                        type="file"
                        accept="image/*"
                        id="foto-comprobante-input"
                        onChange={handleFotoComprobanteChange}
                      />
                      <label htmlFor="foto-comprobante-input">
                        <MdPhotoCamera className="upload-icon" />
                        <span>Subir captura del comprobante bancario (Requerido)</span>
                      </label>
                    </UploadDropzone>
                  )}
                </PhotoUploadContainer>
              </FormGroup>
            </PaymentFieldsBox>
          )}

          {/* 5. FOTO DEL CAMIÓN EN EL POZO */}
          <FormGroup>
            <Label>
              <MdPhotoCamera className="icon" /> Foto de la Cisterna en el Pozo: <span className="req">* Obligatoria</span>
            </Label>
            <PhotoUploadContainer>
              {previewCamion ? (
                <PhotoPreviewWrapper>
                  <img src={previewCamion} alt="Preview cisterna" />
                  <RemovePhotoBtn
                    type="button"
                    onClick={() => {
                      setFotoCamion(null);
                      setPreviewCamion(null);
                    }}
                  >
                    <MdDeleteOutline /> Quitar
                  </RemovePhotoBtn>
                </PhotoPreviewWrapper>
              ) : (
                <UploadDropzone>
                  <input
                    type="file"
                    accept="image/*"
                    id="foto-camion-input"
                    onChange={handleFotoCamionChange}
                  />
                  <label htmlFor="foto-camion-input">
                    <MdLocalShipping className="upload-icon" />
                    <span>Subir foto de la cisterna cargando</span>
                  </label>
                </UploadDropzone>
              )}
            </PhotoUploadContainer>
          </FormGroup>

          {/* 6. NOTA ADICIONAL */}
          <FormGroup>
            <Label>
              <MdEditNote className="icon" /> Nota u Observación (Opcional):
            </Label>
            <TextArea
              rows={2}
              placeholder="Añade detalles sobre la carga, viaje, chofer o incidencias..."
              value={nota}
              onChange={(e) => setNota(e.target.value)}
            />
          </FormGroup>

          {/* BOTÓN DE DESPACHO */}
          <SubmitBtn type="submit" disabled={guardando}>
            {guardando ? (
              "Procesando Despacho..."
            ) : tipoRegistro === "pagado" ? (
              "💧 Confirmar y Registrar Recarga Pagada"
            ) : (
              "⏳ Registrar Recarga como Deuda"
            )}
          </SubmitBtn>
        </DispatchCard>

        {/* SIDEBAR INFORMATIVO: ÚLTIMA RECARGA DESPACHADA */}
        <SidebarPanel>
          <LastRecordCard>
            <div className="card-head">
              <MdOutlineAccessTime className="head-icon" />
              <h4>Última Recarga Registrada</h4>
            </div>

            {ultimoRegistro ? (
              <div className="record-details">
                <div className="record-badge-row">
                  <span className={`status-tag ${ultimoRegistro.estatus}`}>
                    {ultimoRegistro.estatus === "pagado" ? "✓ Pagado" : "⏳ Deuda"}
                  </span>
                  <span className="amount">${Number(ultimoRegistro.monto).toFixed(2)}</span>
                </div>

                <div className="record-info-line">
                  <span className="lbl">Placa:</span>
                  <strong>{ultimoRegistro.camiones?.placa || "N/A"}</strong>
                </div>

                <div className="record-info-line">
                  <span className="lbl">Chofer:</span>
                  <span>{ultimoRegistro.camiones?.chofer || "Sin chofer"}</span>
                </div>

                <div className="record-info-line">
                  <span className="lbl">Capacidad:</span>
                  <span>{ultimoRegistro.camiones?.capacidad?.toLocaleString() || "--"} Lts</span>
                </div>

                <div className="record-info-line">
                  <span className="lbl">Método:</span>
                  <span>{ultimoRegistro.metodo}</span>
                </div>

                {ultimoRegistro.referencia && (
                  <div className="record-info-line">
                    <span className="lbl">Referencia:</span>
                    <span>{ultimoRegistro.referencia}</span>
                  </div>
                )}

                <div className="record-footer">
                  <MdOutlineAccessTime />
                  <span>
                    {new Date(ultimoRegistro.fecha_carga).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
              </div>
            ) : (
              <div className="no-record">
                <MdWaterDrop className="water-ico" />
                <p>Aún no has registrado recargas en esta sesión.</p>
              </div>
            )}
          </LastRecordCard>

          <InstructionCard>
            <h5>📋 Instrucciones Operativas</h5>
            <ul>
              <li>Busca el camión por su placa o chofer en el selector superior.</li>
              <li>Indica el monto acordado para la recarga en dólares ($).</li>
              <li>Si paga en el pozo, selecciona "Pagado al Momento" y coloca la referencia.</li>
              <li>Si es a crédito, márcalo como "Cargar como Deuda".</li>
              <li>Para agregar un nuevo camión o chofer, dirígete a la pestaña <strong>Camiones</strong> en la barra superior.</li>
            </ul>
          </InstructionCard>
        </SidebarPanel>
      </GridWrapper>
    </Container>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC TERMINAL
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-out;
`;

const TopTerminalHeader = styled.div`
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.12), rgba(0, 114, 255, 0.08));
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 20px;
  padding: 24px 28px;
  margin-bottom: 24px;

  .terminal-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 195, 255, 0.2);
    color: #38bdf8;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 12px;
  }

  h2 {
    color: #ffffff;
    font-size: 24px;
    font-weight: 800;
    margin: 0 0 6px 0;
  }

  p {
    color: #94a3b8;
    font-size: 13px;
    margin: 0;
  }
`;

const SuccessBanner = styled.div`
  background: rgba(34, 197, 94, 0.15);
  border: 1px solid rgba(34, 197, 94, 0.4);
  border-radius: 16px;
  padding: 16px 20px;
  margin-bottom: 24px;
  display: flex;
  align-items: center;
  gap: 14px;
  color: #86efac;
  animation: slideDown 0.3s ease;

  .success-icon {
    font-size: 28px;
    flex-shrink: 0;
    color: #22c55e;
  }

  .text {
    flex: 1;

    strong {
      display: block;
      font-size: 14px;
      color: #ffffff;
    }

    p {
      margin: 2px 0 0 0;
      font-size: 13px;
      color: #86efac;
    }
  }

  button {
    background: transparent;
    border: none;
    color: #86efac;
    cursor: pointer;
    font-size: 16px;
    padding: 4px;
  }
`;

const GridWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 340px;
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const DispatchCard = styled.form`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  @media (max-width: 600px) {
    padding: 20px;
  }
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);

  .icon-header {
    width: 46px;
    height: 46px;
    border-radius: 12px;
    background: rgba(0, 195, 255, 0.15);
    color: #00c3ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;
  }

  h3 {
    color: #ffffff;
    font-size: 18px;
    font-weight: 700;
    margin: 0 0 4px 0;
  }

  p {
    color: #94a3b8;
    font-size: 12px;
    margin: 0;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
`;

const Label = styled.label`
  font-size: 13px;
  font-weight: 500;
  color: #cbd5e1;
  display: flex;
  align-items: center;
  gap: 6px;

  .icon {
    color: #00c3ff;
    font-size: 16px;
  }

  .req {
    color: #ef4444;
  }
`;

const ComboboxInputWrapper = styled.div`
  position: relative;
  width: 100%;

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 18px;
  }
`;

const SearchInput = styled.input`
  width: 100%;
  padding: 13px 14px 13px 42px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #00c3ff;
    box-shadow: 0 0 12px rgba(0, 195, 255, 0.25);
  }
`;

const SpinnerInline = styled.div`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 195, 255, 0.3);
  border-top-color: #00c3ff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
`;

const ComboboxDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  background: #111827;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 12px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 50;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.6);
`;

const ComboboxItem = styled.div`
  padding: 10px 14px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  background: ${(props) => (props.$selected ? "rgba(0, 195, 255, 0.15)" : "transparent")};

  &:hover {
    background: rgba(0, 195, 255, 0.1);
  }

  .item-plate {
    display: flex;
    align-items: center;
    gap: 8px;

    .plate-badge {
      background: rgba(0, 195, 255, 0.2);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
    }

    .driver-name {
      color: #ffffff;
      font-size: 13px;
      font-weight: 500;
    }
  }

  .item-specs {
    font-size: 12px;
    color: #94a3b8;
  }
`;

const DropdownEmpty = styled.div`
  padding: 16px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
`;

const SelectedTruckPill = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 8px;
  padding: 10px 14px;
  background: rgba(0, 195, 255, 0.08);
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 10px;

  .pill-icon {
    color: #38bdf8;
    font-size: 18px;
    flex-shrink: 0;
  }

  .pill-info {
    font-size: 13px;
    color: #ffffff;

    .sub {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #00c3ff;
    box-shadow: 0 0 12px rgba(0, 195, 255, 0.25);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  box-sizing: border-box;

  option {
    background: #111827;
    color: #ffffff;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
  resize: vertical;
  box-sizing: border-box;

  &:focus {
    border-color: #00c3ff;
  }
`;

const TypeSelectorGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const TypeButton = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
  text-align: left;
  border: 1px solid
    ${(props) =>
      props.$active
        ? props.$variant === "success"
          ? "#22c55e"
          : "#eab308"
        : "rgba(255, 255, 255, 0.08)"};
  background: ${(props) =>
    props.$active
      ? props.$variant === "success"
        ? "rgba(34, 197, 94, 0.15)"
        : "rgba(234, 179, 8, 0.15)"
      : "rgba(15, 23, 42, 0.6)"};

  .btn-icon {
    font-size: 22px;
    color: ${(props) => (props.$variant === "success" ? "#22c55e" : "#eab308")};
    flex-shrink: 0;
  }

  .btn-text {
    .btn-title {
      display: block;
      font-size: 13px;
      font-weight: 700;
      color: #ffffff;
    }
    .btn-desc {
      display: block;
      font-size: 11px;
      color: #94a3b8;
      margin-top: 2px;
    }
  }
`;

const PaymentFieldsBox = styled.div`
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 16px;
  margin-bottom: 18px;
`;

const PaymentFieldsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const PhotoUploadContainer = styled.div`
  margin-top: 4px;
`;

const UploadDropzone = styled.div`
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 16px;
  text-align: center;
  background: rgba(15, 23, 42, 0.4);
  transition: all 0.2s;

  &:hover {
    border-color: #00c3ff;
    background: rgba(0, 195, 255, 0.05);
  }

  input[type="file"] {
    display: none;
  }

  label {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: #94a3b8;
    font-size: 12px;

    .upload-icon {
      font-size: 24px;
      color: #00c3ff;
    }
  }
`;

const PhotoPreviewWrapper = styled.div`
  position: relative;
  display: inline-block;

  img {
    max-width: 140px;
    max-height: 100px;
    border-radius: 8px;
    border: 1px solid rgba(255, 255, 255, 0.1);
    object-fit: cover;
  }
`;

const RemovePhotoBtn = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(239, 68, 68, 0.85);
  color: white;
  border: none;
  border-radius: 6px;
  padding: 2px 6px;
  font-size: 10px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 2px;
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 16px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  border-radius: 14px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 195, 255, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 195, 255, 0.45);
  }

  &:disabled {
    background: #334155;
    color: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const SidebarPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const LastRecordCard = styled.div`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 20px;

  .card-head {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 14px;

    .head-icon {
      color: #38bdf8;
      font-size: 18px;
    }

    h4 {
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      margin: 0;
    }
  }

  .record-details {
    .record-badge-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;

      .status-tag {
        font-size: 11px;
        font-weight: 700;
        padding: 3px 8px;
        border-radius: 6px;

        &.pagado {
          background: rgba(34, 197, 94, 0.2);
          color: #86efac;
        }

        &.pendiente {
          background: rgba(234, 179, 8, 0.2);
          color: #fef08a;
        }
      }

      .amount {
        font-size: 18px;
        font-weight: 800;
        color: #ffffff;
      }
    }

    .record-info-line {
      display: flex;
      justify-content: space-between;
      font-size: 12px;
      padding: 6px 0;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);

      .lbl {
        color: #94a3b8;
      }

      strong,
      span {
        color: #ffffff;
      }
    }

    .record-footer {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 12px;
      font-size: 11px;
      color: #64748b;
    }
  }

  .no-record {
    text-align: center;
    padding: 20px 0;
    color: #64748b;

    .water-ico {
      font-size: 28px;
      color: rgba(0, 195, 255, 0.3);
      margin-bottom: 6px;
    }

    p {
      font-size: 12px;
      margin: 0;
    }
  }
`;

const InstructionCard = styled.div`
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 18px;

  h5 {
    color: #38bdf8;
    font-size: 13px;
    font-weight: 700;
    margin: 0 0 10px 0;
  }

  ul {
    margin: 0;
    padding-left: 16px;
    color: #94a3b8;
    font-size: 12px;
    line-height: 1.6;

    li {
      margin-bottom: 6px;
    }

    strong {
      color: #e2e8f0;
    }
  }
`;
