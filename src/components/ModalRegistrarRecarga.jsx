import React, { useState, useEffect, useMemo, useRef } from "react";
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
  MdSearch,
} from "react-icons/md";

export function ModalRegistrarRecarga({ isOpen, onClose, onRecargaExitosa }) {
  const user = useAuthStore((state) => state.user);
  const [camiones, setCamiones] = useState([]);
  const [camionSeleccionadoId, setCamionSeleccionadoId] = useState("");
  const [busquedaCamion, setBusquedaCamion] = useState("");
  const [mostrarMenuCamiones, setMostrarMenuCamiones] = useState(false);
  const comboboxRef = useRef(null);

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

  // Cierre de menú al hacer clic afuera
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
      // Si el usuario es camionero, filtrar estrictamente sus camiones asignados (1 o varios)
      if (user?.role === "camionero" && user?.id) {
        const trucksMap = new Map();

        try {
          // 1. Buscar la ficha en camioneros enlazada a este usuario
          const { data: cRow } = await supabase
            .from("camioneros")
            .select("id, nombre")
            .eq("perfil_id", user.id)
            .maybeSingle();

          // 2. Camiones por camionero_id
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

          // 3. Camiones por perfil_id directo
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

          // 4. Camiones por coincidencia de nombre de chofer o usuario
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
          console.error("Error al cargar camiones en modal de recarga:", errCam);
        }

        const finalTrucks = Array.from(trucksMap.values());

        if (finalTrucks && finalTrucks.length > 0) {
          setCamiones(finalTrucks);
          if (!camionSeleccionadoId || !finalTrucks.some((t) => t.id === camionSeleccionadoId)) {
            setCamionSeleccionadoId(finalTrucks[0].id);
            setBusquedaCamion(`${finalTrucks[0].placa} — ${finalTrucks[0].chofer}`);
          }
          return;
        } else {
          // Si el camionero NO tiene camión asignado, no mostrar camiones ajenos
          setCamiones([]);
          setCamionSeleccionadoId("");
          setBusquedaCamion("");
          return;
        }
      }

      // Para Administrador y Registrador, cargar lista completa
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

  const limpiarCampos = () => {
    if (user?.role !== "camionero") {
      setCamionSeleccionadoId("");
      setBusquedaCamion("");
    }
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

    const esRegistrador = user?.role === "registrador";

    // 📸 Validación obligatoria de fotos para el Registrador
    if (esRegistrador && !fotoCamion) {
      alert("⚠️ La foto de la cisterna en el pozo es obligatoria para el registrador.");
      return;
    }

    if (esRegistrador && tipoRegistro === "pagado" && !fotoComprobante) {
      alert("⚠️ La foto del comprobante de pago es obligatoria para el registrador cuando se marca como pagado.");
      return;
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
            {/* 1. SELECCIONAR CAMIÓN CON CUADRO DE BÚSQUEDA DINÁMICA */}
            <FormGroup ref={comboboxRef} style={{ position: "relative" }}>
              <Label>
                <MdLocalShipping className="icon" /> Buscar y Seleccionar Camión Cisterna: <span className="req">*</span>
              </Label>

              {user?.role === "camionero" && camiones.length === 0 && !cargandoCamiones ? (
                <AlertaSinCamionModal>
                  ⚠️ Tu cuenta de chofer no tiene ningún camión cisterna vinculado. Contacta al administrador para asignar tu unidad.
                </AlertaSinCamionModal>
              ) : (
                <>
                  <SearchBoxWrapper>
                    <MdSearch className="search-ico" />
                    <SearchInput
                      type="text"
                      placeholder="Escribe para buscar por placa o chofer (ej: A23, Carlos)..."
                      value={busquedaCamion}
                      onChange={(e) => {
                        setBusquedaCamion(e.target.value);
                        setMostrarMenuCamiones(true);
                        if (camionSeleccionadoId) {
                          setCamionSeleccionadoId("");
                        }
                      }}
                      onFocus={() => {
                        if (user?.role !== "camionero" || camiones.length > 1) {
                          setMostrarMenuCamiones(true);
                        }
                      }}
                      disabled={user?.role === "camionero" && camiones.length === 1}
                      required={!camionSeleccionadoId}
                    />
                    {busquedaCamion && (user?.role !== "camionero" || camiones.length > 1) && (
                      <ClearBtn
                        type="button"
                        onClick={() => {
                          setBusquedaCamion("");
                          setCamionSeleccionadoId("");
                          setMostrarMenuCamiones(true);
                        }}
                        title="Borrar texto de búsqueda"
                      >
                        <MdClose />
                      </ClearBtn>
                    )}
                  </SearchBoxWrapper>

                  {/* LISTA DINÁMICA FLOTANTE DE RESULTADOS */}
                  {mostrarMenuCamiones && (user?.role !== "camionero" || camiones.length > 1) && (
                    <DynamicTruckDropdown>
                      {cargandoCamiones ? (
                        <DropdownItemNotice>Cargando lista de camiones...</DropdownItemNotice>
                      ) : camionesFiltrados.length === 0 ? (
                        <DropdownItemNotice>
                          No se encontraron camiones que coincidan con "{busquedaCamion}"
                        </DropdownItemNotice>
                      ) : (
                        camionesFiltrados.map((c) => {
                          const isSelected = String(c.id) === String(camionSeleccionadoId);
                          return (
                            <TruckOptionItem
                              key={c.id}
                              type="button"
                              $active={isSelected}
                              onClick={() => {
                                setCamionSeleccionadoId(c.id);
                                setBusquedaCamion(`${c.placa} — Chofer: ${c.chofer}`);
                                setMostrarMenuCamiones(false);
                              }}
                            >
                              <div className="truck-row-main">
                                <span className="placa-badge">{c.placa}</span>
                                <span className="chofer-label">{c.chofer}</span>
                              </div>
                              <div className="truck-row-meta">
                                <span className="cap-badge">💧 {Number(c.capacidad).toLocaleString()} Lts</span>
                                {c.modelo && <span className="modelo-badge">{c.modelo}</span>}
                              </div>
                            </TruckOptionItem>
                          );
                        })
                      )}
                    </DynamicTruckDropdown>
                  )}

                  {/* FICHA CONFIRMATORIA DEL CAMIÓN SELECCIONADO */}
                  {camionActual && (
                    <CamionInfoPill>
                      <span><strong>Placa:</strong> {camionActual.placa}</span>
                      <span><strong>Chofer:</strong> {camionActual.chofer}</span>
                      <span><strong>Capacidad:</strong> {camionActual.capacidad?.toLocaleString()} Lts</span>
                      {camionActual.modelo && <span><strong>Modelo:</strong> {camionActual.modelo}</span>}
                      {(user?.role !== "camionero" || camiones.length > 1) && (
                        <ChangeTruckBtn
                          type="button"
                          onClick={() => {
                            setBusquedaCamion("");
                            setCamionSeleccionadoId("");
                            setMostrarMenuCamiones(true);
                          }}
                        >
                          Cambiar Unidad
                        </ChangeTruckBtn>
                      )}
                    </CamionInfoPill>
                  )}
                </>
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
                <MdPhotoCamera className="icon" /> Foto de Evidencia de la Cisterna en el Pozo:{" "}
                {user?.role === "registrador" ? (
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
                    <MdReceipt className="icon" /> Foto de la Factura / Comprobante de Pago:{" "}
                    {user?.role === "registrador" ? (
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

const SearchBoxWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;

  .search-ico {
    position: absolute;
    left: 14px;
    font-size: 18px;
    color: #38bdf8;
    pointer-events: none;
  }
`;

const SearchInput = styled(Input)`
  padding-left: 42px;
  padding-right: 38px;
  font-size: 14px;
`;

const ClearBtn = styled.button`
  position: absolute;
  right: 10px;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #94a3b8;
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 15px;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.2);
  }
`;

const DynamicTruckDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  margin-top: 6px;
  background: #0f172a;
  border: 1px solid rgba(0, 195, 255, 0.35);
  border-radius: 12px;
  max-height: 240px;
  overflow-y: auto;
  z-index: 1000;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  padding: 6px;
  gap: 4px;

  &::-webkit-scrollbar {
    width: 6px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 195, 255, 0.3);
    border-radius: 4px;
  }
`;

const TruckOptionItem = styled.button`
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  padding: 10px 12px;
  background: ${({ $active }) => ($active ? "rgba(0, 195, 255, 0.18)" : "transparent")};
  border: 1px solid ${({ $active }) => ($active ? "rgba(0, 195, 255, 0.4)" : "transparent")};
  border-radius: 8px;
  cursor: pointer;
  text-align: left;
  transition: all 0.15s ease;

  &:hover {
    background: rgba(0, 195, 255, 0.12);
    border-color: rgba(0, 195, 255, 0.3);
  }

  .truck-row-main {
    display: flex;
    align-items: center;
    gap: 10px;

    .placa-badge {
      font-weight: 700;
      color: #38bdf8;
      background: rgba(0, 195, 255, 0.12);
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 13px;
      letter-spacing: 0.5px;
    }

    .chofer-label {
      font-size: 13px;
      color: #ffffff;
      font-weight: 500;
    }
  }

  .truck-row-meta {
    display: flex;
    align-items: center;
    gap: 8px;

    .cap-badge {
      font-size: 11px;
      color: #cbd5e1;
      background: rgba(255, 255, 255, 0.05);
      padding: 2px 6px;
      border-radius: 4px;
    }

    .modelo-badge {
      font-size: 11px;
      color: #64748b;
    }
  }
`;

const DropdownItemNotice = styled.div`
  padding: 18px 12px;
  text-align: center;
  font-size: 12px;
  color: #94a3b8;
`;

const ChangeTruckBtn = styled.button`
  margin-left: auto;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #38bdf8;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(0, 195, 255, 0.2);
    border-color: #00c3ff;
    color: #ffffff;
  }
`;

const AlertaSinCamionModal = styled.div`
  padding: 12px 14px;
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.35);
  border-radius: 10px;
  color: #fbbf24;
  font-size: 13px;
  line-height: 1.4;
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
