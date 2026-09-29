import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { supabase } from "../supabase/supabase.config";
import { MenuTemplate } from "../templates/MenuTemplate";
import {
  MdPayments,
  MdSearch,
  MdCalendarToday,
  MdPhotoCamera,
  MdReceipt,
  MdContentCopy,
  MdCheck,
  MdClose,
  MdLocalShipping,
  MdAttachMoney,
  MdFilterList,
  MdOpenInNew,
  MdImageNotSupported,
  MdDownload
} from "react-icons/md";

export function PagosRegistrados() {
  const [pagos, setPagos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroDias, setFiltroDias] = useState(30); // 30 días por defecto
  const [filtroMetodo, setFiltroMetodo] = useState("todos");

  // Estado para visor de imágenes (Lightbox)
  const [imagenModal, setImagenModal] = useState(null); // { url, titulo, tipo }
  const [copiadoId, setCopiadoId] = useState(null);

  useEffect(() => {
    cargarPagos();
  }, [filtroDias]);

  const cargarPagos = async () => {
    setLoading(true);
    try {
      // Intentamos consultar primero con url_comprobante
      let queryBuilder = supabase
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
          camiones ( id, placa, chofer, capacidad, modelo )
        `)
        .eq("estatus", "pagado")
        .order("fecha_carga", { ascending: false });

      if (filtroDias !== 3650) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - filtroDias);
        queryBuilder = queryBuilder.gte("fecha_carga", fechaLimite.toISOString());
      }

      let { data, error } = await queryBuilder;

      // Fallback si url_comprobante no existe en la base de datos
      if (error && (error.code === "PGRST204" || error.code === "42703" || error.message?.includes("url_comprobante"))) {
        console.warn("Columna url_comprobante no encontrada, consultando sin ella.");
        let queryFallback = supabase
          .from("registros_carga")
          .select(`
            id,
            monto,
            metodo,
            referencia,
            fecha_carga,
            url_foto,
            estatus,
            pago_id,
            camiones ( id, placa, chofer, capacidad, modelo )
          `)
          .eq("estatus", "pagado")
          .order("fecha_carga", { ascending: false });

        if (filtroDias !== 3650) {
          const fechaLimite = new Date();
          fechaLimite.setDate(fechaLimite.getDate() - filtroDias);
          queryFallback = queryFallback.gte("fecha_carga", fechaLimite.toISOString());
        }

        const resFallback = await queryFallback;
        data = resFallback.data;
        error = resFallback.error;
      }

      if (error) throw error;
      setPagos(data || []);
    } catch (err) {
      console.error("Error al cargar pagos:", err.message);
    } finally {
      setLoading(false);
    }
  };

  const copiarAlPortapapeles = (texto, id) => {
    if (!texto) return;
    navigator.clipboard.writeText(texto);
    setCopiadoId(id);
    setTimeout(() => setCopiadoId(null), 2000);
  };

  const pagosFiltrados = useMemo(() => {
    return pagos.filter((item) => {
      const matchBusqueda =
        !busqueda ||
        item.camiones?.placa?.toLowerCase().includes(busqueda.toLowerCase()) ||
        item.camiones?.chofer?.toLowerCase().includes(busqueda.toLowerCase()) ||
        (item.referencia && item.referencia.toLowerCase().includes(busqueda.toLowerCase()));

      const matchMetodo =
        filtroMetodo === "todos" || item.metodo?.toLowerCase() === filtroMetodo.toLowerCase();

      return matchBusqueda && matchMetodo;
    });
  }, [pagos, busqueda, filtroMetodo]);

  const metricas = useMemo(() => {
    const totalDinero = pagosFiltrados.reduce((sum, p) => sum + (Number(p.monto) || 0), 0);
    const conFotoCamion = pagosFiltrados.filter((p) => p.url_foto).length;
    const conComprobante = pagosFiltrados.filter((p) => p.url_comprobante).length;
    return {
      totalDinero,
      totalRegistros: pagosFiltrados.length,
      conFotoCamion,
      conComprobante,
    };
  }, [pagosFiltrados]);

  const formatearDinero = (val) => {
    return "$" + Number(val).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatearFechaHora = (fechaIso) => {
    if (!fechaIso) return "N/A";
    const f = new Date(fechaIso);
    if (isNaN(f.getTime())) return "N/A";
    return {
      fecha: f.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }),
      hora: f.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  return (
    <MenuTemplate>
      <Container>
        {/* CABECERA */}
        <Header>
          <TitleBox>
            <IconBadge>
              <MdPayments />
            </IconBadge>
            <div>
              <h2>Control de Pagos Registrados</h2>
              <p className="subtitle">
                Auditoría exclusiva de administradores: referencias, comprobantes bancarios y fotos operativas
              </p>
            </div>
          </TitleBox>
        </Header>

        {/* TARJETAS RESUMEN */}
        <KpiGrid>
          <KpiCard>
            <div className="kpi-icon blue">
              <MdAttachMoney />
            </div>
            <div>
              <span className="label">Total Recaudado (Filtrado)</span>
              <h3 className="value">{formatearDinero(metricas.totalDinero)}</h3>
            </div>
          </KpiCard>

          <KpiCard>
            <div className="kpi-icon green">
              <MdPayments />
            </div>
            <div>
              <span className="label">Recargas Pagadas</span>
              <h3 className="value">{metricas.totalRegistros} pagos</h3>
            </div>
          </KpiCard>

          <KpiCard>
            <div className="kpi-icon purple">
              <MdReceipt />
            </div>
            <div>
              <span className="label">Facturas / Comprobantes</span>
              <h3 className="value">{metricas.conComprobante} adjuntos</h3>
            </div>
          </KpiCard>

          <KpiCard>
            <div className="kpi-icon cyan">
              <MdPhotoCamera />
            </div>
            <div>
              <span className="label">Fotos de Camión</span>
              <h3 className="value">{metricas.conFotoCamion} evidencias</h3>
            </div>
          </KpiCard>
        </KpiGrid>

        {/* FILTROS SUPERIORES */}
        <FilterBar>
          <SearchBox>
            <MdSearch />
            <input
              type="text"
              placeholder="Buscar por placa, chofer o referencia..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")} title="Limpiar búsqueda">
                <MdClose />
              </button>
            )}
          </SearchBox>

          <SelectGroup>
            <MdFilterList className="select-icon" />
            <select value={filtroMetodo} onChange={(e) => setFiltroMetodo(e.target.value)}>
              <option value="todos">Todos los Métodos</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Pago Móvil">Pago Móvil</option>
              <option value="Efectivo">Efectivo</option>
              <option value="Zelle">Zelle</option>
            </select>
          </SelectGroup>

          <SelectGroup>
            <MdCalendarToday className="select-icon" />
            <select value={filtroDias} onChange={(e) => setFiltroDias(Number(e.target.value))}>
              <option value={1}>Hoy</option>
              <option value={7}>Últimos 7 días</option>
              <option value={15}>Últimas 2 semanas</option>
              <option value={30}>Últimos 30 días</option>
              <option value={3650}>Todo el Histórico</option>
            </select>
          </SelectGroup>
        </FilterBar>

        {/* TABLA PRINCIPAL DE PAGOS */}
        {loading ? (
          <LoadingState>Cargando auditoría de pagos...</LoadingState>
        ) : pagosFiltrados.length === 0 ? (
          <EmptyState>
            <MdReceipt className="empty-icon" />
            <h3>No se encontraron pagos registrados</h3>
            <p>Intenta cambiar los filtros de búsqueda o rango de fechas seleccionado.</p>
          </EmptyState>
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Camión y Chofer</th>
                  <th>Monto</th>
                  <th>Método</th>
                  <th>Referencia Bancaria</th>
                  <th style={{ textAlign: "center" }}>Foto Camión</th>
                  <th style={{ textAlign: "center" }}>Factura / Recibo</th>
                </tr>
              </thead>
              <tbody>
                {pagosFiltrados.map((pago) => {
                  const { fecha, hora } = formatearFechaHora(pago.fecha_carga);
                  const tieneFotoCamion = Boolean(pago.url_foto);
                  const tieneComprobante = Boolean(pago.url_comprobante);

                  return (
                    <tr key={pago.id}>
                      {/* FECHA Y HORA */}
                      <td>
                        <DateTimeCell>
                          <span className="fecha">{fecha}</span>
                          <span className="hora">{hora}</span>
                        </DateTimeCell>
                      </td>

                      {/* CAMIÓN */}
                      <td>
                        <TruckCell>
                          <span className="placa">{pago.camiones?.placa || "S/P"}</span>
                          <span className="chofer">{pago.camiones?.chofer || "Sin Chofer"}</span>
                          {pago.camiones?.capacidad && (
                            <span className="capacidad">{pago.camiones.capacidad} Lts</span>
                          )}
                        </TruckCell>
                      </td>

                      {/* MONTO */}
                      <td>
                        <MontoTag>{formatearDinero(pago.monto)}</MontoTag>
                      </td>

                      {/* MÉTODO */}
                      <td>
                        <MetodoBadge className={pago.metodo?.toLowerCase().replace(/\s+/g, "-")}>
                          {pago.metodo || "Efectivo"}
                        </MetodoBadge>
                      </td>

                      {/* REFERENCIA */}
                      <td>
                        {pago.referencia ? (
                          <RefTag>
                            <span className="ref-number">{pago.referencia}</span>
                            <CopyBtn
                              type="button"
                              onClick={() => copiarAlPortapapeles(pago.referencia, pago.id)}
                              title="Copiar referencia"
                            >
                              {copiadoId === pago.id ? <MdCheck className="copied" /> : <MdContentCopy />}
                            </CopyBtn>
                          </RefTag>
                        ) : (
                          <span className="muted-text">N/A (Efectivo)</span>
                        )}
                      </td>

                      {/* FOTO DEL CAMIÓN */}
                      <td style={{ textAlign: "center" }}>
                        {tieneFotoCamion ? (
                          <ThumbnailBtn
                            type="button"
                            onClick={() =>
                              setImagenModal({
                                url: pago.url_foto,
                                titulo: `Evidencia Camión - ${pago.camiones?.placa || ""}`,
                                subtitulo: `Chofer: ${pago.camiones?.chofer || ""} | Fecha: ${fecha} ${hora}`,
                              })
                            }
                            title="Ver foto del camión"
                          >
                            <img src={pago.url_foto} alt="Camión" />
                            <span className="view-overlay">
                              <MdPhotoCamera />
                            </span>
                          </ThumbnailBtn>
                        ) : (
                          <NoPhotoBadge title="Sin foto registrada">
                            <MdImageNotSupported />
                          </NoPhotoBadge>
                        )}
                      </td>

                      {/* FOTO COMPROBANTE / FACTURA */}
                      <td style={{ textAlign: "center" }}>
                        {tieneComprobante ? (
                          <ThumbnailBtn
                            type="button"
                            className="receipt"
                            onClick={() =>
                              setImagenModal({
                                url: pago.url_comprobante,
                                titulo: `Comprobante de Pago - Ref: ${pago.referencia || "S/R"}`,
                                subtitulo: `Monto: ${formatearDinero(pago.monto)} | ${pago.metodo} | ${fecha}`,
                              })
                            }
                            title="Ver factura o comprobante"
                          >
                            <img src={pago.url_comprobante} alt="Comprobante" />
                            <span className="view-overlay">
                              <MdReceipt />
                            </span>
                          </ThumbnailBtn>
                        ) : (
                          <NoPhotoBadge title="Sin comprobante adjunto">
                            <MdImageNotSupported />
                          </NoPhotoBadge>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrapper>
        )}

        {/* LIGHTBOX / MODAL DE VISUALIZACIÓN DE FOTOS */}
        {imagenModal && (
          <LightboxOverlay onClick={() => setImagenModal(null)}>
            <LightboxContent onClick={(e) => e.stopPropagation()}>
              <LightboxHeader>
                <div>
                  <h4>{imagenModal.titulo}</h4>
                  {imagenModal.subtitulo && <p>{imagenModal.subtitulo}</p>}
                </div>
                <div style={{ display: "flex", gap: "8px" }}>
                  <ActionIconLink
                    href={imagenModal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir imagen en pestaña nueva"
                  >
                    <MdOpenInNew />
                  </ActionIconLink>
                  <CloseLightboxBtn onClick={() => setImagenModal(null)} title="Cerrar vista">
                    <MdClose />
                  </CloseLightboxBtn>
                </div>
              </LightboxHeader>

              <LightboxImageWrapper>
                <img src={imagenModal.url} alt="Evidencia ampliada" />
              </LightboxImageWrapper>
            </LightboxContent>
          </LightboxOverlay>
        )}
      </Container>
    </MenuTemplate>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHISM FOR AUDITORIA DE PAGOS
const Container = styled.div`
  animation: fadeIn 0.3s ease-out;
  padding-bottom: 40px;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
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
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.25), rgba(0, 114, 255, 0.25));
  border: 1px solid rgba(0, 195, 255, 0.4);
  color: #00c3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 0 20px rgba(0, 195, 255, 0.25);
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

    &.blue {
      background: rgba(0, 195, 255, 0.15);
      color: #00c3ff;
      border: 1px solid rgba(0, 195, 255, 0.3);
    }
    &.green {
      background: rgba(16, 185, 129, 0.15);
      color: #10b981;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    &.purple {
      background: rgba(168, 85, 247, 0.15);
      color: #a855f7;
      border: 1px solid rgba(168, 85, 247, 0.3);
    }
    &.cyan {
      background: rgba(6, 182, 212, 0.15);
      color: #06b6d4;
      border: 1px solid rgba(6, 182, 212, 0.3);
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
  }
`;

const FilterBar = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const SearchBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0 14px;
  flex: 1;
  min-width: 260px;
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

    &:hover {
      color: #ffffff;
    }
  }
`;

const SelectGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  padding: 0 14px;
  height: 44px;

  .select-icon {
    color: #00c3ff;
    font-size: 18px;
  }

  select {
    background: none;
    border: none;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    outline: none;
    cursor: pointer;

    option {
      background: #151c2c;
      color: #ffffff;
    }
  }
`;

const TableWrapper = styled.div`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow-x: auto;
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.4);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 14px;

  thead {
    background: rgba(15, 23, 42, 0.9);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    th {
      padding: 14px 18px;
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 14px 18px;
      color: #f8fafc;
      vertical-align: middle;
    }
  }

  .muted-text {
    color: #64748b;
    font-size: 12px;
    font-style: italic;
  }
`;

const DateTimeCell = styled.div`
  display: flex;
  flex-direction: column;

  .fecha {
    font-weight: 600;
    color: #ffffff;
  }

  .hora {
    font-size: 12px;
    color: #94a3b8;
  }
`;

const TruckCell = styled.div`
  display: flex;
  flex-direction: column;

  .placa {
    font-weight: 700;
    color: #38bdf8;
    font-family: monospace;
    font-size: 14px;
  }

  .chofer {
    font-size: 13px;
    color: #e2e8f0;
  }

  .capacidad {
    font-size: 11px;
    color: #64748b;
  }
`;

const MontoTag = styled.span`
  font-weight: 700;
  color: #4ade80;
  font-size: 15px;
`;

const MetodoBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.4px;

  &.transferencia {
    background: rgba(59, 130, 246, 0.15);
    color: #60a5fa;
    border: 1px solid rgba(59, 130, 246, 0.3);
  }
  &.pago-móvil,
  &.pago-movil {
    background: rgba(168, 85, 247, 0.15);
    color: #c084fc;
    border: 1px solid rgba(168, 85, 247, 0.3);
  }
  &.efectivo {
    background: rgba(16, 185, 129, 0.15);
    color: #34d399;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
  &.zelle {
    background: rgba(234, 179, 8, 0.15);
    color: #facc15;
    border: 1px solid rgba(234, 179, 8, 0.3);
  }
`;

const RefTag = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 4px 8px;
  border-radius: 6px;

  .ref-number {
    font-family: monospace;
    font-size: 13px;
    color: #f8fafc;
    font-weight: 600;
  }
`;

const CopyBtn = styled.button`
  background: none;
  border: none;
  color: #94a3b8;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  font-size: 14px;
  transition: color 0.15s;

  &:hover {
    color: #00c3ff;
  }

  .copied {
    color: #10b981;
  }
`;

const ThumbnailBtn = styled.button`
  position: relative;
  width: 58px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(0, 195, 255, 0.4);
  padding: 0;
  background: #0f172a;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;

  &.receipt {
    border-color: rgba(16, 185, 129, 0.4);
  }

  &:hover {
    transform: scale(1.08);
    box-shadow: 0 0 12px rgba(0, 195, 255, 0.4);
  }

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .view-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.4);
    opacity: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    font-size: 16px;
    transition: opacity 0.2s;
  }

  &:hover .view-overlay {
    opacity: 1;
  }
`;

const NoPhotoBadge = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 34px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: 6px;
  color: #475569;
  font-size: 18px;
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

  .empty-icon {
    font-size: 48px;
    color: #475569;
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

/* Lightbox Modal */
const LightboxOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.88);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
`;

const LightboxContent = styled.div`
  background: #111827;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 16px;
  max-width: 780px;
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
`;

const LightboxHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);

  h4 {
    margin: 0 0 2px 0;
    color: #ffffff;
    font-size: 16px;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
  }
`;

const ActionIconLink = styled.a`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
  font-size: 18px;
  transition: all 0.15s;

  &:hover {
    color: #00c3ff;
    background: rgba(0, 195, 255, 0.15);
  }
`;

const CloseLightboxBtn = styled.button`
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 20px;
  transition: all 0.15s;

  &:hover {
    color: #ffffff;
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }
`;

const LightboxImageWrapper = styled.div`
  padding: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #090d16;
  overflow: auto;
  max-height: calc(90vh - 80px);

  img {
    max-width: 100%;
    max-height: 70vh;
    border-radius: 10px;
    object-fit: contain;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.6);
  }
`;
