import React, { useState, useEffect, useMemo } from "react";
import { useAuthStore } from "../store/AuthStore";
import { supabase } from "../supabase/supabase.config";
import {
  MdReceipt,
  MdCheckCircle,
  MdAttachMoney,
  MdLocalShipping,
  MdExpandMore,
  MdExpandLess,
  MdPhotoCamera,
  MdSearch,
  MdClose,
  MdPayments,
  MdDeleteOutline,
  MdOpenInNew,
} from "react-icons/md";
import { MenuTemplate } from "../templates/MenuTemplate";
import styled from "styled-components";

export function CuentasPorCobrar() {
  const user = useAuthStore((state) => state.user);
  const [deudas, setDeudas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");

  // Camiones expandidos (acordeón)
  const [camionesExpandidos, setCamionesExpandidos] = useState({});

  // Modal para liquidar/registrar pago de un camión
  const [modalPagoCamion, setModalPagoCamion] = useState(null); // { camionInfo, viajes, seleccionados }
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [referencia, setReferencia] = useState("");
  const [fotoComprobante, setFotoComprobante] = useState(null);
  const [previewComprobante, setPreviewComprobante] = useState(null);
  const [procesandoPago, setProcesandoPago] = useState(false);

  // Visor de foto individual
  const [fotoModal, setFotoModal] = useState(null);

  useEffect(() => {
    cargarDeudasPendientes();
  }, [user]);

  const cargarDeudasPendientes = async () => {
    setLoading(true);
    try {
      let queryBuilder = supabase
        .from("registros_carga")
        .select(`
          id,
          monto,
          fecha_carga,
          url_foto,
          estatus,
          metodo,
          referencia,
          camion_id,
          camiones ( id, placa, chofer, perfil_id, capacidad, modelo )
        `)
        .in("estatus", ["pendiente", "por_conciliar"])
        .order("fecha_carga", { ascending: false });

      if (user?.role === "camionero" && user?.id) {
        // Obtener todos los camiones asignados a este chofer combinando camionero_id, perfil_id y nombre
        const idsSet = new Set();

        try {
          const { data: cRow } = await supabase
            .from("camioneros")
            .select("id, nombre")
            .eq("perfil_id", user.id)
            .maybeSingle();

          // 1. Por camionero_id
          if (cRow?.id) {
            const { data: camionesDeCamionero } = await supabase
              .from("camiones")
              .select("id, chofer")
              .eq("camionero_id", cRow.id);

            (camionesDeCamionero || []).forEach((c) => {
              const choferStr = (c.chofer || "").trim().toLowerCase();
              if (!choferStr.includes("sin")) {
                idsSet.add(c.id);
              }
            });
          }

          // 2. Por perfil_id directo
          const { data: misCamiones } = await supabase
            .from("camiones")
            .select("id, chofer, camionero_id")
            .eq("perfil_id", user.id);

          (misCamiones || []).forEach((c) => {
            const choferStr = (c.chofer || "").trim().toLowerCase();
            const esMismoCam = !c.camionero_id || (cRow?.id && String(c.camionero_id) === String(cRow.id));
            if (!choferStr.includes("sin") && esMismoCam) {
              idsSet.add(c.id);
            }
          });

          // 3. Por nombre de chofer o usuario
          const nombreChofer = cRow?.nombre || user?.nombre;
          if (nombreChofer && !nombreChofer.toLowerCase().includes("sin")) {
            const { data: byNombre } = await supabase
              .from("camiones")
              .select("id, chofer")
              .ilike("chofer", nombreChofer.trim());

            (byNombre || []).forEach((c) => {
              const choferStr = (c.chofer || "").trim().toLowerCase();
              if (!choferStr.includes("sin")) {
                idsSet.add(c.id);
              }
            });
          }
        } catch (e) {
          console.error("Error al obtener camiones de cobranza:", e);
        }

        let idsAsignados = Array.from(idsSet);

        if (idsAsignados.length === 0) {
          // Si el chofer no tiene ningún camión asignado, no debe ver deudas de ningún otro camión
          setDeudas([]);
          setLoading(false);
          return;
        }

        queryBuilder = queryBuilder.in("camion_id", idsAsignados);
      }

      const { data, error } = await queryBuilder;
      if (error) throw error;

      setDeudas(data || []);
      // Expandir el primer camión por defecto si existe
      if (data && data.length > 0) {
        const primerCamionKey = data[0]?.camiones?.placa || "otros";
        setCamionesExpandidos((prev) => ({ ...prev, [primerCamionKey]: true }));
      }
    } catch (err) {
      console.error("Error al cargar deudas:", err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🚚 Agrupar y ordenar todas las deudas por camión con sumatorias matemáticas
  const gruposPorCamion = useMemo(() => {
    const mapa = {};

    deudas.forEach((item) => {
      const placa = item.camiones?.placa || "Sin Placa";
      const chofer = item.camiones?.chofer || "Sin Chofer Asignado";
      const camionId = item.camion_id || item.camiones?.id || placa;
      const key = `${placa}_${camionId}`;

      if (!mapa[key]) {
        mapa[key] = {
          key,
          camionId,
          placa,
          chofer,
          capacidad: item.camiones?.capacidad || 0,
          modelo: item.camiones?.modelo || "",
          viajes: [],
          totalDeuda: 0,
        };
      }

      const monto = Number(item.monto) || 0;
      mapa[key].viajes.push(item);
      mapa[key].totalDeuda += monto;
    });

    const lista = Object.values(mapa);

    // Ordenar por el camión con mayor deuda acumulada primero
    lista.sort((a, b) => b.totalDeuda - a.totalDeuda);

    // Filtrar por búsqueda
    if (!busqueda) return lista;

    const b = busqueda.toLowerCase();
    return lista.filter(
      (c) =>
        c.placa.toLowerCase().includes(b) ||
        c.chofer.toLowerCase().includes(b) ||
        c.modelo.toLowerCase().includes(b)
    );
  }, [deudas, busqueda]);

  const metricasGlobales = useMemo(() => {
    const deudaTotalGlobal = deudas.reduce((sum, d) => sum + (Number(d.monto) || 0), 0);
    const camionesConDeuda = gruposPorCamion.length;
    return {
      deudaTotalGlobal,
      totalViajes: deudas.length,
      camionesConDeuda,
    };
  }, [deudas, gruposPorCamion]);

  const toggleExpandir = (key) => {
    setCamionesExpandidos((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // Abrir modal de pago para un camión completo
  const iniciarPagoCamion = (camionGrupo) => {
    setModalPagoCamion({
      camion: camionGrupo,
      seleccionados: camionGrupo.viajes.map((v) => v.id),
    });
    setMetodoPago("Transferencia");
    setReferencia("");
    setFotoComprobante(null);
    setPreviewComprobante(null);
  };

  const handleToggleViajeModal = (viajeId) => {
    if (!modalPagoCamion) return;
    const current = modalPagoCamion.seleccionados;
    const nuevo = current.includes(viajeId)
      ? current.filter((id) => id !== viajeId)
      : [...current, viajeId];

    setModalPagoCamion({
      ...modalPagoCamion,
      seleccionados: nuevo,
    });
  };

  const subirComprobanteStorage = async (archivo) => {
    if (!archivo) return null;
    try {
      const ext = archivo.name.split(".").pop();
      const nombreArchivo = `comprobante_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${ext}`;
      const { error } = await supabase.storage
        .from("comprobantes")
        .upload(nombreArchivo, archivo, { cacheControl: "3600", upsert: false });

      if (error) {
        console.warn("Error al subir comprobante a storage:", error.message);
        return null;
      }

      const { data } = supabase.storage.from("comprobantes").getPublicUrl(nombreArchivo);
      return data?.publicUrl || null;
    } catch (err) {
      console.error("Fallo al subir comprobante:", err);
      return null;
    }
  };

  const procesarRegistroPago = async (e) => {
    e.preventDefault();
    if (!modalPagoCamion || modalPagoCamion.seleccionados.length === 0) {
      alert("Debes seleccionar al menos un viaje para liquidar.");
      return;
    }

    if (metodoPago !== "Efectivo" && !referencia.trim()) {
      alert("Por favor ingresa el número de referencia bancaria.");
      return;
    }

    // 📸 Validación obligatoria de comprobante para choferes camioneros
    if (user?.role === "camionero" && !fotoComprobante) {
      alert("⚠️ La foto o captura del comprobante/referencia de pago es obligatoria para registrar el pago.");
      return;
    }

    setProcesandoPago(true);

    try {
      let urlComprobante = null;
      if (fotoComprobante) {
        urlComprobante = await subirComprobanteStorage(fotoComprobante);
      }

      const uuidPago = crypto.randomUUID();
      const refFinal = metodoPago !== "Efectivo" ? referencia.trim() : null;

      const payloadActualizacion = {
        estatus: "pagado",
        metodo: metodoPago,
        referencia: refFinal,
        pago_id: uuidPago,
      };

      // Intentamos actualizar incluyendo url_comprobante
      let updateError = null;
      if (urlComprobante) {
        const { error: errConComprobante } = await supabase
          .from("registros_carga")
          .update({ ...payloadActualizacion, url_comprobante: urlComprobante })
          .in("id", modalPagoCamion.seleccionados);

        if (errConComprobante) {
          if (
            errConComprobante.code === "PGRST204" ||
            errConComprobante.code === "42703" ||
            errConComprobante.message?.includes("url_comprobante")
          ) {
            console.warn("Columna url_comprobante no existe. Actualizando sin ella.");
            const { error: errFallback } = await supabase
              .from("registros_carga")
              .update(payloadActualizacion)
              .in("id", modalPagoCamion.seleccionados);
            updateError = errFallback;
          } else {
            updateError = errConComprobante;
          }
        }
      } else {
        const { error: errSinComprobante } = await supabase
          .from("registros_carga")
          .update(payloadActualizacion)
          .in("id", modalPagoCamion.seleccionados);
        updateError = errSinComprobante;
      }

      if (updateError) throw updateError;

      alert("🎉 ¡Pago registrado con éxito! La deuda del camión ha sido conciliada.");
      setModalPagoCamion(null);
      setReferencia("");
      setFotoComprobante(null);
      setPreviewComprobante(null);

      // Recargar lista actualizada
      cargarDeudasPendientes();
    } catch (err) {
      console.error("Error al registrar pago de deuda:", err);
      alert(`Error al procesar el pago: ${err.message || "Error desconocido"}`);
    } finally {
      setProcesandoPago(false);
    }
  };

  const formatearDinero = (val) => {
    return "$" + Number(val).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  return (
    <MenuTemplate>
      <Container>
        {/* CABECERA */}
        <Header>
          <TitleBox>
            <IconBadge>
              <MdReceipt />
            </IconBadge>
            <div>
              <h2>
                {user?.role === "camionero" ? "Mis Cuentas por Pagar" : "Cuentas por Cobrar (Deudas por Camión)"}
              </h2>
              <p className="subtitle">
                Deudas agrupadas y ordenadas por camión cisterna con balance acumulado y registro de pagos
              </p>
            </div>
          </TitleBox>
        </Header>

        {/* MÉTRICAS KPI */}
        <KpiGrid>
          <KpiCard>
            <div className="kpi-icon red">
              <MdAttachMoney />
            </div>
            <div>
              <span className="label">Total en Cuentas por Cobrar</span>
              <h3 className="value red">{formatearDinero(metricasGlobales.deudaTotalGlobal)}</h3>
            </div>
          </KpiCard>

          <KpiCard>
            <div className="kpi-icon blue">
              <MdLocalShipping />
            </div>
            <div>
              <span className="label">Camiones con Deuda Activa</span>
              <h3 className="value">{metricasGlobales.camionesConDeuda} unidades</h3>
            </div>
          </KpiCard>

          <KpiCard>
            <div className="kpi-icon amber">
              <MdReceipt />
            </div>
            <div>
              <span className="label">Total Viajes / Cargas por Cobrar</span>
              <h3 className="value">{metricasGlobales.totalViajes} pendientes</h3>
            </div>
          </KpiCard>
        </KpiGrid>

        {/* BUSCADOR */}
        <FilterRow>
          <SearchBox>
            <MdSearch />
            <input
              type="text"
              placeholder="Buscar camión por placa o chofer..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")}>
                <MdClose />
              </button>
            )}
          </SearchBox>
        </FilterRow>

        {/* LISTADO DE CAMIONES Y DEUDAS */}
        {loading ? (
          <LoadingState>Cargando balance de deudas por camión...</LoadingState>
        ) : gruposPorCamion.length === 0 ? (
          <EmptyState>
            <div className="empty-badge">🎉</div>
            <h3>¡Al día! No hay cuentas pendientes por cobrar</h3>
            <p>Todas las recargas registradas han sido pagadas y conciliadas satisfactoriamente.</p>
          </EmptyState>
        ) : (
          <TruckCardsList>
            {gruposPorCamion.map((grupo) => {
              const estaExpandido = Boolean(camionesExpandidos[grupo.key]);

              return (
                <TruckCard key={grupo.key}>
                  {/* CABECERA DE LA TARJETA DEL CAMIÓN */}
                  <TruckCardHeader onClick={() => toggleExpandir(grupo.key)}>
                    <TruckMainInfo>
                      <div className="truck-badge">
                        <MdLocalShipping />
                      </div>
                      <div>
                        <div className="plate-row">
                          <span className="plate">{grupo.placa}</span>
                          <span className="driver">Chofer: {grupo.chofer}</span>
                        </div>
                        <div className="sub-meta">
                          {grupo.capacidad > 0 && <span>Capacidad: {grupo.capacidad} Lts</span>}
                          {grupo.modelo && <span>Modelo: {grupo.modelo}</span>}
                          <span className="trips-count">• {grupo.viajes.length} viajes pendientes</span>
                        </div>
                      </div>
                    </TruckMainInfo>

                    <TruckFinancialSide>
                      <div className="total-debt-box">
                        <span className="debt-label">Total Adeudado:</span>
                        <span className="debt-amount">{formatearDinero(grupo.totalDeuda)}</span>
                      </div>

                      {user?.role !== "camionero" ? (
                        <ActionPayBtn
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            iniciarPagoCamion(grupo);
                          }}
                        >
                          <MdCheckCircle /> Registrar Pago
                        </ActionPayBtn>
                      ) : (
                        <ActionPayBtn
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            iniciarPagoCamion(grupo);
                          }}
                        >
                          <MdReceipt /> Reportar Pago
                        </ActionPayBtn>
                      )}

                      <ExpandToggleBtn
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleExpandir(grupo.key);
                        }}
                      >
                        {estaExpandido ? <MdExpandLess /> : <MdExpandMore />}
                      </ExpandToggleBtn>
                    </TruckFinancialSide>
                  </TruckCardHeader>

                  {/* CUERPO EXPANDIBLE: DETALLE DE CADA VIAJE/DEUDA */}
                  {estaExpandido && (
                    <TruckCardBody>
                      <div className="table-responsive">
                        <DetailTable>
                          <thead>
                            <tr>
                              <th>Fecha y Hora</th>
                              <th>Monto</th>
                              <th>Foto Evidencia</th>
                              <th>Estado Actual</th>
                              <th style={{ textAlign: "right" }}>Acción Rápida</th>
                            </tr>
                          </thead>
                          <tbody>
                            {grupo.viajes.map((viaje) => {
                              const f = new Date(viaje.fecha_carga);
                              const fechaFormateada = !isNaN(f.getTime())
                                ? `${f.toLocaleDateString("es-ES")} ${f.toLocaleTimeString("es-ES", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}`
                                : "N/A";

                              return (
                                <tr key={viaje.id}>
                                  <td>{fechaFormateada}</td>
                                  <td>
                                    <span className="row-amount">{formatearDinero(viaje.monto)}</span>
                                  </td>
                                  <td>
                                    {viaje.url_foto ? (
                                      <MiniPhotoBtn
                                        type="button"
                                        onClick={() =>
                                          setFotoModal({
                                            url: viaje.url_foto,
                                            titulo: `Foto Camión ${grupo.placa}`,
                                            subtitulo: `Viaje del ${fechaFormateada} - Monto: ${formatearDinero(
                                              viaje.monto
                                            )}`,
                                          })
                                        }
                                        title="Ver foto del camión"
                                      >
                                        <img src={viaje.url_foto} alt="Evidencia" />
                                        <MdPhotoCamera />
                                      </MiniPhotoBtn>
                                    ) : (
                                      <span className="no-photo">Sin foto</span>
                                    )}
                                  </td>
                                  <td>
                                    <StatusPill className={viaje.estatus}>
                                      {viaje.estatus === "por_conciliar"
                                        ? "🔍 Por Conciliar"
                                        : "⏳ Pendiente"}
                                    </StatusPill>
                                  </td>
                                  <td style={{ textAlign: "right" }}>
                                    <SinglePayBtn
                                      type="button"
                                      onClick={() => {
                                        setModalPagoCamion({
                                          camion: grupo,
                                          seleccionados: [viaje.id],
                                        });
                                        setMetodoPago("Transferencia");
                                        setReferencia("");
                                        setFotoComprobante(null);
                                        setPreviewComprobante(null);
                                      }}
                                    >
                                      Cobrar este viaje
                                    </SinglePayBtn>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </DetailTable>
                      </div>
                    </TruckCardBody>
                  )}
                </TruckCard>
              );
            })}
          </TruckCardsList>
        )}

        {/* MODAL PARA LIQUIDAR/REGISTRAR PAGO DE VIAJES DE UN CAMIÓN */}
        {modalPagoCamion && (
          <ModalOverlay onClick={() => setModalPagoCamion(null)}>
            <ModalDialog onClick={(e) => e.stopPropagation()}>
              <ModalTop>
                <div>
                  <h3>💳 Registrar Pago de Deudas</h3>
                  <p>
                    Camión: <strong>{modalPagoCamion.camion.placa}</strong> — Chofer:{" "}
                    <strong>{modalPagoCamion.camion.chofer}</strong>
                  </p>
                </div>
                <button className="close-btn" onClick={() => setModalPagoCamion(null)}>
                  <MdClose />
                </button>
              </ModalTop>

              <form onSubmit={procesarRegistroPago}>
                <ModalScrollContent>
                  {/* SELECCIÓN DE VIAJES A PAGAR */}
                  <div style={{ marginBottom: "16px" }}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "8px",
                      }}
                    >
                      <LabelSmall>Selecciona los viajes a saldar:</LabelSmall>
                      <SelectAllBtn
                        type="button"
                        onClick={() => {
                          const todos = modalPagoCamion.camion.viajes.map((v) => v.id);
                          const estanTodos = modalPagoCamion.seleccionados.length === todos.length;
                          setModalPagoCamion({
                            ...modalPagoCamion,
                            seleccionados: estanTodos ? [] : todos,
                          });
                        }}
                      >
                        {modalPagoCamion.seleccionados.length === modalPagoCamion.camion.viajes.length
                          ? "Deseleccionar todos"
                          : "Seleccionar todos"}
                      </SelectAllBtn>
                    </div>

                    <TripsCheckList>
                      {modalPagoCamion.camion.viajes.map((viaje) => {
                        const isChecked = modalPagoCamion.seleccionados.includes(viaje.id);
                        const f = new Date(viaje.fecha_carga);
                        const fechaStr = !isNaN(f.getTime())
                          ? `${f.toLocaleDateString("es-ES")} ${f.toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}`
                          : "Sin fecha";

                        return (
                          <TripCheckItem
                            key={viaje.id}
                            $checked={isChecked}
                            onClick={() => handleToggleViajeModal(viaje.id)}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleViajeModal(viaje.id)}
                            />
                            <div className="trip-info">
                              <span className="trip-date">{fechaStr}</span>
                              <span className="trip-amount">{formatearDinero(viaje.monto)}</span>
                            </div>
                          </TripCheckItem>
                        );
                      })}
                    </TripsCheckList>
                  </div>

                  {/* TOTAL CALCULADO */}
                  <TotalLiquidateBox>
                    <span>Total a Liquidar:</span>
                    <span className="amount">
                      {formatearDinero(
                        modalPagoCamion.camion.viajes
                          .filter((v) => modalPagoCamion.seleccionados.includes(v.id))
                          .reduce((sum, v) => sum + (Number(v.monto) || 0), 0)
                      )}
                    </span>
                  </TotalLiquidateBox>

                  {/* MÉTODO DE PAGO */}
                  <FormField>
                    <label>
                      <MdPayments /> Método de Pago:
                    </label>
                    <select
                      value={metodoPago}
                      onChange={(e) => {
                        setMetodoPago(e.target.value);
                        if (e.target.value === "Efectivo") setReferencia("");
                      }}
                    >
                      <option value="Transferencia">Transferencia Bancaria</option>
                      <option value="Pago Móvil">Pago Móvil</option>
                      <option value="Efectivo">Efectivo</option>
                      <option value="Zelle">Zelle</option>
                    </select>
                  </FormField>

                  {/* REFERENCIA BANCARIA */}
                  {metodoPago !== "Efectivo" && (
                    <FormField>
                      <label>
                        <MdReceipt /> Número de Referencia Bancaria: <span className="req">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Ej: 00481923"
                        value={referencia}
                        onChange={(e) => setReferencia(e.target.value)}
                        required
                      />
                    </FormField>
                  )}

                  {/* FOTO COMPROBANTE DE PAGO */}
                  <FormField>
                    <label>
                      <MdPhotoCamera /> Foto del Comprobante / Recibo:{" "}
                      {user?.role === "camionero" ? (
                        <span className="req" style={{ color: "#ef4444", fontWeight: 700 }}>
                          * (Obligatoria)
                        </span>
                      ) : (
                        <span className="opt">(Opcional)</span>
                      )}
                    </label>
                    <FileInputWrap>
                      <input
                        type="file"
                        id="modal-comprobante-input"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            setFotoComprobante(file);
                            setPreviewComprobante(URL.createObjectURL(file));
                          }
                        }}
                      />
                      <FileLabel htmlFor="modal-comprobante-input">
                        <MdPhotoCamera /> {fotoComprobante ? "Cambiar foto adjunta" : "Subir foto del comprobante"}
                      </FileLabel>
                      {previewComprobante && (
                        <PreviewMini>
                          <img src={previewComprobante} alt="Preview" />
                          <button
                            type="button"
                            onClick={() => {
                              setFotoComprobante(null);
                              setPreviewComprobante(null);
                            }}
                          >
                            <MdDeleteOutline />
                          </button>
                        </PreviewMini>
                      )}
                    </FileInputWrap>
                  </FormField>
                </ModalScrollContent>

                <ModalFooter>
                  <CancelBtn type="button" onClick={() => setModalPagoCamion(null)} disabled={procesandoPago}>
                    Cancelar
                  </CancelBtn>
                  <SubmitPayBtn
                    type="submit"
                    disabled={procesandoPago || modalPagoCamion.seleccionados.length === 0}
                  >
                    {procesandoPago ? "Registrando Pago..." : "✅ Confirmar Pago y Conciliar"}
                  </SubmitPayBtn>
                </ModalFooter>
              </form>
            </ModalDialog>
          </ModalOverlay>
        )}

        {/* LIGHTBOX DE FOTOS */}
        {fotoModal && (
          <ModalOverlay onClick={() => setFotoModal(null)}>
            <LightboxModal onClick={(e) => e.stopPropagation()}>
              <LightboxHeader>
                <div>
                  <h4>{fotoModal.titulo}</h4>
                  {fotoModal.subtitulo && <p>{fotoModal.subtitulo}</p>}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <a
                    href={fotoModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="action-link"
                    title="Abrir imagen"
                  >
                    <MdOpenInNew />
                  </a>
                  <button className="close-btn" onClick={() => setFotoModal(null)}>
                    <MdClose />
                  </button>
                </div>
              </LightboxHeader>
              <div className="img-container">
                <img src={fotoModal.url} alt="Evidencia" />
              </div>
            </LightboxModal>
          </ModalOverlay>
        )}
      </Container>
    </MenuTemplate>
  );
}

// 🎨 STYLED COMPONENTS MODERN DARK GLASSMORPHISM
const Container = styled.div`
  animation: fadeIn 0.3s ease-out;
  padding-bottom: 50px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
`;

const TitleBox = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 4px 0;
  }

  .subtitle {
    color: #94a3b8;
    font-size: 13px;
    margin: 0;
  }
`;

const IconBadge = styled.div`
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.25), rgba(217, 119, 6, 0.25));
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #f59e0b;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 0 20px rgba(245, 158, 11, 0.25);
`;

const KpiGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const KpiCard = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

  .kpi-icon {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;

    &.red {
      background: rgba(239, 68, 68, 0.15);
      color: #ef4444;
      border: 1px solid rgba(239, 68, 68, 0.3);
    }
    &.blue {
      background: rgba(0, 195, 255, 0.15);
      color: #00c3ff;
      border: 1px solid rgba(0, 195, 255, 0.3);
    }
    &.amber {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
  }

  .label {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
    display: block;
  }

  .value {
    font-size: 20px;
    font-weight: 700;
    color: #ffffff;
    margin: 2px 0 0 0;

    &.red {
      color: #f87171;
    }
  }
`;

const FilterRow = styled.div`
  margin-bottom: 20px;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0 14px;
  max-width: 450px;
  height: 44px;

  svg {
    color: #00c3ff;
    font-size: 18px;
  }

  input {
    background: none;
    border: none;
    color: #ffffff;
    font-size: 14px;
    outline: none;
    width: 100%;

    &::placeholder {
      color: #64748b;
    }
  }

  button {
    background: none;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
  }
`;

const TruckCardsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TruckCard = styled.div`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
  transition: border-color 0.2s;

  &:hover {
    border-color: rgba(0, 195, 255, 0.3);
  }
`;

const TruckCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px;
  cursor: pointer;
  flex-wrap: wrap;
  gap: 16px;
  background: rgba(15, 23, 42, 0.6);
  user-select: none;
`;

const TruckMainInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;

  .truck-badge {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    background: rgba(0, 195, 255, 0.15);
    border: 1px solid rgba(0, 195, 255, 0.3);
    color: #00c3ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  .plate-row {
    display: flex;
    align-items: baseline;
    gap: 10px;
    flex-wrap: wrap;
  }

  .plate {
    font-size: 17px;
    font-weight: 700;
    color: #38bdf8;
    font-family: monospace;
    letter-spacing: 0.5px;
  }

  .driver {
    font-size: 14px;
    font-weight: 600;
    color: #ffffff;
  }

  .sub-meta {
    display: flex;
    gap: 10px;
    font-size: 12px;
    color: #94a3b8;
    margin-top: 2px;

    .trips-count {
      color: #f59e0b;
      font-weight: 600;
    }
  }
`;

const TruckFinancialSide = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;

  .total-debt-box {
    display: flex;
    flex-direction: column;
    align-items: flex-end;

    .debt-label {
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .debt-amount {
      font-size: 20px;
      font-weight: 700;
      color: #f87171;
    }
  }
`;

const ActionPayBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(16, 185, 129, 0.45);
  }
`;

const ExpandToggleBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.12);
  }
`;

const TruckCardBody = styled.div`
  padding: 16px 20px 20px 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(11, 15, 25, 0.5);
  animation: fadeIn 0.2s ease-out;

  .table-responsive {
    overflow-x: auto;
  }
`;

const DetailTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;

  thead {
    th {
      padding: 10px 14px;
      font-size: 11px;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      text-align: left;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 12px 14px;
      color: #cbd5e1;
      vertical-align: middle;
    }
  }

  .row-amount {
    font-weight: 700;
    color: #f87171;
    font-size: 14px;
  }

  .no-photo {
    color: #64748b;
    font-size: 11px;
    font-style: italic;
  }
`;

const MiniPhotoBtn = styled.button`
  position: relative;
  width: 48px;
  height: 36px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(0, 195, 255, 0.3);
  padding: 0;
  cursor: pointer;
  background: #0f172a;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  svg {
    position: absolute;
    bottom: 2px;
    right: 2px;
    color: #38bdf8;
    background: rgba(0, 0, 0, 0.6);
    border-radius: 3px;
    padding: 2px;
    font-size: 12px;
  }
`;

const StatusPill = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;

  &.pendiente {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  &.por_conciliar {
    background: rgba(245, 158, 11, 0.15);
    color: #fbbf24;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }
`;

const SinglePayBtn = styled.button`
  padding: 6px 12px;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    background: #10b981;
    color: #ffffff;
  }
`;

const LoadingState = styled.div`
  padding: 60px;
  text-align: center;
  color: #94a3b8;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

const EmptyState = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #94a3b8;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);

  .empty-badge {
    font-size: 48px;
    margin-bottom: 12px;
  }

  h3 {
    margin: 0 0 6px 0;
    color: #ffffff;
    font-size: 18px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #64748b;
  }
`;

/* MODAL REGISTRO DE PAGO DE DEUDA */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.85);
  backdrop-filter: blur(8px);
  z-index: 2500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
`;

const ModalDialog = styled.div`
  background: #111827;
  border: 1px solid rgba(16, 185, 129, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 580px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.7);
`;

const ModalTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  h3 {
    margin: 0 0 2px 0;
    font-size: 18px;
    color: #ffffff;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;

    strong {
      color: #38bdf8;
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 22px;
    cursor: pointer;

    &:hover {
      color: #ffffff;
    }
  }
`;

const ModalScrollContent = styled.div`
  padding: 22px 24px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-height: 60vh;
`;

const LabelSmall = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const SelectAllBtn = styled.button`
  background: none;
  border: none;
  color: #38bdf8;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
`;

const TripsCheckList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  padding: 8px;
  background: rgba(15, 23, 42, 0.5);
`;

const TripCheckItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: ${(props) => (props.$checked ? "rgba(16, 185, 129, 0.12)" : "rgba(255, 255, 255, 0.02)")};
  border: 1px solid ${(props) => (props.$checked ? "rgba(16, 185, 129, 0.35)" : "transparent")};
  cursor: pointer;

  input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #10b981;
    cursor: pointer;
  }

  .trip-info {
    display: flex;
    justify-content: space-between;
    width: 100%;
    align-items: center;
  }

  .trip-date {
    font-size: 12px;
    color: #cbd5e1;
  }

  .trip-amount {
    font-size: 13px;
    font-weight: 700;
    color: #4ade80;
  }
`;

const TotalLiquidateBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 18px;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.35);
  border-radius: 12px;
  font-size: 14px;
  color: #ffffff;

  .amount {
    font-size: 22px;
    font-weight: 700;
    color: #4ade80;
  }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 13px;
    font-weight: 600;
    color: #cbd5e1;
    display: flex;
    align-items: center;
    gap: 6px;

    svg {
      color: #10b981;
    }

    .req {
      color: #f87171;
      font-size: 11px;
    }

    .opt {
      color: #94a3b8;
      font-size: 11px;
      font-weight: 400;
    }
  }

  input,
  select {
    width: 100%;
    padding: 11px 14px;
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: #ffffff;
    font-size: 14px;
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: #10b981;
    }
  }
`;

const FileInputWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  input[type="file"] {
    display: none;
  }
`;

const FileLabel = styled.label`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: rgba(16, 185, 129, 0.1);
  border: 1px dashed rgba(16, 185, 129, 0.4);
  border-radius: 10px;
  color: #34d399;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: rgba(16, 185, 129, 0.2);
  }
`;

const PreviewMini = styled.div`
  position: relative;
  width: 100px;
  height: 65px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.2);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  button {
    position: absolute;
    top: 4px;
    right: 4px;
    background: rgba(239, 68, 68, 0.85);
    color: #ffffff;
    border: none;
    border-radius: 4px;
    padding: 2px 4px;
    cursor: pointer;
    font-size: 14px;
  }
`;

const ModalFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const CancelBtn = styled.button`
  padding: 10px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;
`;

const SubmitPayBtn = styled.button`
  padding: 10px 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: #ffffff;
  border: none;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(16, 185, 129, 0.35);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

/* Lightbox */
const LightboxModal = styled.div`
  background: #111827;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 16px;
  max-width: 700px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);

  .img-container {
    padding: 16px;
    background: #090d16;
    display: flex;
    justify-content: center;

    img {
      max-width: 100%;
      max-height: 70vh;
      border-radius: 10px;
      object-fit: contain;
    }
  }
`;

const LightboxHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 20px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h4 {
    margin: 0;
    color: #ffffff;
    font-size: 15px;
  }

  p {
    margin: 2px 0 0 0;
    font-size: 12px;
    color: #94a3b8;
  }

  .action-link {
    color: #94a3b8;
    font-size: 18px;
    display: flex;
    align-items: center;

    &:hover {
      color: #00c3ff;
    }
  }

  .close-btn {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 20px;
    cursor: pointer;

    &:hover {
      color: #ffffff;
    }
  }
`;
