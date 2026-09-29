import React, { useState, useEffect } from "react";
import styled from "styled-components";
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
} from "react-icons/md";

export function ModalRegistrarRecarga({ isOpen, onClose, onRecargaExitosa }) {
  const user = useAuthStore((state) => state.user);
  const [camiones, setCamiones] = useState([]);
  const [camionSeleccionadoId, setCamionSeleccionadoId] = useState("");
  const [monto, setMonto] = useState("");
  const [nota, setNota] = useState("");
  
  // Fotos
  const [fotoCamion, setFotoCamion] = useState(null);
  const [previewCamion, setPreviewCamion] = useState(null);
  const [fotoComprobante, setFotoComprobante] = useState(null);
  const [previewComprobante, setPreviewComprobante] = useState(null);

  // Modo de pago: "pagado" vs "deuda"
  const [tipoRegistro, setTipoRegistro] = useState("pagado"); // "pagado" | "deuda"
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [referencia, setReferencia] = useState("");

  const [loading, setLoading] = useState(false);
  const [cargandoCamiones, setCargandoCamiones] = useState(false);

  useEffect(() => {
    if (isOpen) {
      cargarCamiones();
    } else {
      limpiarCampos();
    }
  }, [isOpen]);

  const cargarCamiones = async () => {
    setCargandoCamiones(true);
    try {
      // Si el usuario es camionero, filtrar prioritariamente su camión asignado
      if (user?.role === "camionero" && user?.id) {
        const { data: misCamiones } = await supabase
          .from("camiones")
          .select("id, placa, chofer, capacidad, modelo, perfil_id")
          .eq("perfil_id", user.id);

        if (misCamiones && misCamiones.length > 0) {
          setCamiones(misCamiones);
          setCamionSeleccionadoId(misCamiones[0].id);
          return;
        }
      }

      const { data, error } = await supabase
        .from("camiones")
        .select("id, placa, chofer, capacidad, modelo")
        .order("chofer", { ascending: true });

      if (error) throw error;
      setCamiones(data || []);
      if (user?.role === "camionero" && data && data.length === 1) {
        setCamionSeleccionadoId(data[0].id);
      }
    } catch (err) {
      console.error("Error al cargar camiones:", err.message);
    } finally {
      setCargandoCamiones(false);
    }
  };

  const limpiarCampos = () => {
    if (user?.role !== "camionero") {
      setCamionSeleccionadoId("");
    }
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

    setLoading(true);

    try {
      // 1. Subir foto del camión si existe
      let urlFotoCamion = null;
      if (fotoCamion) {
        urlFotoCamion = await subirArchivoStorage("fotos-camiones", fotoCamion, "camion");
      }

      // 2. Subir foto de la factura/comprobante si existe
      let urlComprobante = null;
      if (tipoRegistro === "pagado" && fotoComprobante) {
        urlComprobante = await subirArchivoStorage("comprobantes", fotoComprobante, "factura");
      }

      const fechaActual = new Date().toISOString();
      const esPagado = tipoRegistro === "pagado";
      const estatusFinal = esPagado ? "pagado" : "pendiente";
      const metodoFinal = esPagado ? metodoPago : "Deuda";
      const referenciaFinal = esPagado && metodoPago !== "Efectivo" ? referencia.trim() : null;

      // Objeto de inserción base
      const registroPayload = {
        camion_id: camionSeleccionadoId,
        monto: montoNum,
        metodo: metodoFinal,
        referencia: referenciaFinal,
        fecha_carga: fechaActual,
        url_foto: urlFotoCamion,
        estatus: estatusFinal,
      };

      // Payload extendido con nota, usuario_id y url_comprobante
      const payloadExtendido = { ...registroPayload };
      if (urlComprobante) payloadExtendido.url_comprobante = urlComprobante;
      if (user?.id) payloadExtendido.usuario_id = user.id;
      if (nota.trim()) payloadExtendido.nota = nota.trim();

      // Intento 1: Guardar con todos los campos extendidos
      let { error: insertError } = await supabase
        .from("registros_carga")
        .insert([payloadExtendido]);

      if (insertError) {
        console.warn("Fallo inserción con columnas extendidas, reintentando con payload base:", insertError.message);
        // Si las columnas nuevas (usuario_id, nota, url_comprobante) no existen en la base de datos de Supabase todavía,
        // realizamos fallback seguro con los campos base para que el registro nunca falle.
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

      limpiarCampos();
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
            {/* 1. SELECCIONAR CAMIÓN */}
            <FormGroup>
              <Label>
                <MdLocalShipping className="icon" /> Selecciona el Camión Cisterna: <span className="req">*</span>
              </Label>
              <Select
                value={camionSeleccionadoId}
                onChange={(e) => setCamionSeleccionadoId(e.target.value)}
                required
              >
                <option value="">-- Elige un camión registrado --</option>
                {camiones.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.placa} — Chofer: {c.chofer} ({c.capacidad} Lts {c.modelo ? `- ${c.modelo}` : ""})
                  </option>
                ))}
              </Select>
              {camionActual && (
                <CamionInfoPill>
                  <span><strong>Placa:</strong> {camionActual.placa}</span>
                  <span><strong>Chofer:</strong> {camionActual.chofer}</span>
                  <span><strong>Capacidad:</strong> {camionActual.capacidad} Lts</span>
                </CamionInfoPill>
              )}
            </FormGroup>

            {/* 2. MONTO DEL VIAJE */}
            <FormGroup>
              <Label>
                <MdAttachMoney className="icon" /> Monto de la Recarga ($): <span className="req">*</span>
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
                <MdPhotoCamera className="icon" /> Foto de Evidencia del Camión:
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
                  <MdPhotoCamera /> {fotoCamion ? "Cambiar foto del camión" : "Tomar foto o subir archivo"}
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
                  <Select value={metodoPago} onChange={(e) => setMetodoPago(e.target.value)}>
                    <option value="Transferencia">Transferencia Bancaria</option>
                    <option value="Pago Móvil">Pago Móvil</option>
                    <option value="Efectivo">Efectivo en Taquilla</option>
                    <option value="Zelle">Zelle</option>
                  </Select>
                </FormGroup>

                {metodoPago !== "Efectivo" && (
                  <FormGroup>
                    <Label>
                      <MdReceipt className="icon" /> Referencia Bancaria: <span className="req">* (Obligatoria)</span>
                    </Label>
                    <Input
                      type="text"
                      placeholder="Ej: 00984512"
                      value={referencia}
                      onChange={(e) => setReferencia(e.target.value)}
                      required
                    />
                  </FormGroup>
                )}

                <FormGroup>
                  <Label>
                    <MdReceipt className="icon" /> Foto de la Factura / Comprobante de Pago: <span className="optional">(Opcional)</span>
                  </Label>
                  <FileInputBox>
                    <input
                      type="file"
                      id="foto-comprobante-input"
                      accept="image/*"
                      onChange={handleFotoComprobanteChange}
                    />
                    <FileInputLabel htmlFor="foto-comprobante-input" className="comprobante">
                      <MdReceipt /> {fotoComprobante ? "Cambiar foto comprobante" : "Adjuntar foto de comprobante/factura"}
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
                    Esta recarga quedará registrada como <strong>pendiente</strong>. Aparecerá en el módulo de{" "}
                    <strong>Cuentas por Cobrar</strong> acumulada bajo este camión para su posterior cobro.
                  </p>
                </div>
              </DebtNoticeBox>
            )}

            {/* 6. NOTA U OBSERVACIÓN PARA REVISIÓN */}
            <FormGroup>
              <Label>
                <MdEditNote className="icon" /> Nota u Observación de la Carga: <span className="optional">(Opcional para revisión posterior)</span>
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
              <SubmitButton type="submit" $variant="paid" disabled={loading || cargandoCamiones}>
                {loading ? "Procesando pago..." : "✅ Registrar Pago de Recarga"}
              </SubmitButton>
            ) : (
              <SubmitButton type="submit" $variant="debt" disabled={loading || cargandoCamiones}>
                {loading ? "Guardando deuda..." : "⏳ Cargar Recarga como Deuda"}
              </SubmitButton>
            )}
          </ModalFooter>
        </Form>
      </ModalContainer>
    </Overlay>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC MODAL
const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.82);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
`;

const ModalContainer = styled.div`
  background: #111827;
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 20px;
  width: 100%;
  max-width: 620px;
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7), 0 0 35px rgba(0, 195, 255, 0.15);
  overflow: hidden;
  animation: slideUp 0.25s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px) scale(0.97);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  background: rgba(17, 24, 39, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
`;

const HeaderInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  h3 {
    margin: 0 0 2px 0;
    font-size: 19px;
    font-weight: 700;
    color: #ffffff;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
  }
`;

const HeaderBadge = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.25), rgba(0, 114, 255, 0.25));
  border: 1px solid rgba(0, 195, 255, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
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
  transition: all 0.2s ease;

  &:hover {
    color: #ffffff;
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  overflow: hidden;
  flex: 1;
`;

const ModalBody = styled.div`
  padding: 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.15);
    border-radius: 3px;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
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
    font-size: 16px;
  }

  .req {
    color: #f87171;
    font-size: 11px;
  }

  .optional {
    color: #94a3b8;
    font-size: 11px;
    font-weight: 400;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 11px 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: #00c3ff;
    background: rgba(15, 23, 42, 0.95);
    box-shadow: 0 0 10px rgba(0, 195, 255, 0.25);
  }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 11px 14px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  min-height: 58px;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &:focus {
    border-color: #00c3ff;
    background: rgba(15, 23, 42, 0.95);
    box-shadow: 0 0 10px rgba(0, 195, 255, 0.25);
  }
`;

const Select = styled.select`
  width: 100%;
  padding: 11px 14px;
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  cursor: pointer;
  box-sizing: border-box;

  option {
    background: #111827;
    color: #ffffff;
  }

  &:focus {
    border-color: #00c3ff;
    box-shadow: 0 0 10px rgba(0, 195, 255, 0.25);
  }
`;

const CamionInfoPill = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 8px 12px;
  background: rgba(0, 195, 255, 0.08);
  border: 1px dashed rgba(0, 195, 255, 0.25);
  border-radius: 8px;
  font-size: 12px;
  color: #94a3b8;

  strong {
    color: #38bdf8;
  }
`;

const FileInputBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  input[type="file"] {
    display: none;
  }
`;

const FileInputLabel = styled.label`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(30, 41, 59, 0.6);
  border: 1px dashed rgba(0, 195, 255, 0.4);
  border-radius: 10px;
  color: #38bdf8;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 195, 255, 0.15);
    border-color: #00c3ff;
  }

  &.comprobante {
    border-color: rgba(52, 211, 153, 0.4);
    color: #34d399;

    &:hover {
      background: rgba(52, 211, 153, 0.15);
      border-color: #10b981;
    }
  }
`;

const PreviewWrapper = styled.div`
  position: relative;
  width: 120px;
  height: 80px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
`;

const PreviewImage = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const RemovePreviewBtn = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(239, 68, 68, 0.85);
  color: #ffffff;
  border: none;
  border-radius: 4px;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 14px;

  &:hover {
    background: #ef4444;
  }
`;

const SectionDivider = styled.div`
  display: flex;
  align-items: center;
  text-align: center;
  margin: 6px 0;

  &::before,
  &::after {
    content: "";
    flex: 1;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  span {
    padding: 0 12px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #64748b;
  }
`;

const ToggleGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const ToggleOption = styled.button`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  background: ${(props) =>
    props.$active ? "rgba(0, 195, 255, 0.12)" : "rgba(15, 23, 42, 0.6)"};
  border: 2px solid
    ${(props) => (props.$active ? "#00c3ff" : "rgba(255, 255, 255, 0.08)")};
  border-radius: 14px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    border-color: ${(props) => (props.$active ? "#00c3ff" : "rgba(255, 255, 255, 0.2)")};
    transform: translateY(-1px);
  }

  .icon-wrap {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;

    &.paid {
      background: rgba(16, 185, 129, 0.2);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.4);
    }

    &.debt {
      background: rgba(245, 158, 11, 0.2);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.4);
    }
  }

  h4 {
    margin: 0 0 3px 0;
    font-size: 14px;
    font-weight: 700;
    color: #ffffff;
  }

  p {
    margin: 0;
    font-size: 11px;
    color: #94a3b8;
    line-height: 1.3;
  }
`;

const PaidFieldsContainer = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
  background: rgba(16, 185, 129, 0.06);
  border: 1px solid rgba(16, 185, 129, 0.25);
  border-radius: 14px;
  animation: fadeIn 0.2s ease-out;
`;

const DebtNoticeBox = styled.div`
  display: flex;
  gap: 12px;
  padding: 14px;
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 12px;
  font-size: 13px;
  color: #fcd34d;

  svg {
    font-size: 22px;
    flex-shrink: 0;
    color: #f59e0b;
  }

  p {
    margin: 4px 0 0 0;
    color: #cbd5e1;
    font-size: 12px;
    line-height: 1.4;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 18px 24px;
  background: rgba(17, 24, 39, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const CancelButton = styled.button`
  padding: 11px 18px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.1);
  }
`;

const SubmitButton = styled.button`
  padding: 11px 22px;
  border: none;
  border-radius: 10px;
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${(props) =>
    props.$variant === "paid"
      ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
      : "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)"};

  box-shadow: 0 4px 15px
    ${(props) =>
      props.$variant === "paid"
        ? "rgba(16, 185, 129, 0.35)"
        : "rgba(245, 158, 11, 0.35)"};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px
      ${(props) =>
        props.$variant === "paid"
          ? "rgba(16, 185, 129, 0.5)"
          : "rgba(245, 158, 11, 0.5)"};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
  }
`;
