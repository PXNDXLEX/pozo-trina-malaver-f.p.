import { useEffect, useState, useMemo } from "react";
import { supabase } from "../supabase/supabase.config";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import styled from "styled-components";
import {
  MdCalendarToday,
  MdFilterList,
  MdPictureAsPdf,
  MdSearch,
  MdWaterDrop,
  MdLocalShipping,
  MdAttachMoney,
  MdSchedule,
  MdCheckCircle,
  MdHourglassEmpty,
  MdPhotoCamera,
  MdClose,
  MdReceipt
} from "react-icons/md";

export function TablaDetcon({ refresh }) {
  const [datos, setDatos] = useState([]);
  const [fechasDisponibles, setFechasDisponibles] = useState([]);
  const [cargandoFechas, setCargandoFechas] = useState(false);
  const [cargandoDatos, setCargandoDatos] = useState(true);

  // Fecha seleccionada en formato YYYY-MM-DD (por defecto hoy en hora local)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => {
    const hoy = new Date();
    const anio = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, "0");
    const dia = String(hoy.getDate()).padStart(2, "0");
    return `${anio}-${mes}-${dia}`;
  });

  const [modoVerTodo, setModoVerTodo] = useState(false);
  const [busqueda, setBusqueda] = useState("");
  const [fotoModal, setFotoModal] = useState(null);

  // 1. Cargar lista de fechas únicas que tienen registros en la base de datos
  useEffect(() => {
    cargarFechasDisponibles();
  }, [refresh]);

  // 2. Cargar ventas cada vez que cambie la fecha seleccionada o modo
  useEffect(() => {
    consultarVentasPorFecha();
  }, [fechaSeleccionada, modoVerTodo, refresh]);

  const cargarFechasDisponibles = async () => {
    setCargandoFechas(true);
    try {
      const { data, error } = await supabase
        .from("registros_carga")
        .select("fecha_carga")
        .order("fecha_carga", { ascending: false });

      if (error) throw error;

      if (data && data.length > 0) {
        // Conteo de viajes por fecha (YYYY-MM-DD)
        const conteoPorFecha = {};
        data.forEach((r) => {
          if (r.fecha_carga) {
            const fechaLocal = new Date(r.fecha_carga);
            if (!isNaN(fechaLocal.getTime())) {
              const yyyy = fechaLocal.getFullYear();
              const mm = String(fechaLocal.getMonth() + 1).padStart(2, "0");
              const dd = String(fechaLocal.getDate()).padStart(2, "0");
              const claveFecha = `${yyyy}-${mm}-${dd}`;
              conteoPorFecha[claveFecha] = (conteoPorFecha[claveFecha] || 0) + 1;
            }
          }
        });

        const listaFechas = Object.keys(conteoPorFecha).map((f) => ({
          fechaIso: f,
          totalViajes: conteoPorFecha[f],
        }));

        setFechasDisponibles(listaFechas);
      }
    } catch (err) {
      console.error("Error al cargar fechas disponibles:", err.message);
    } finally {
      setCargandoFechas(false);
    }
  };

  const consultarVentasPorFecha = async () => {
    setCargandoDatos(true);
    try {
      let query = supabase
        .from("registros_carga")
        .select(`
          id,
          monto,
          metodo,
          referencia,
          fecha_carga,
          url_foto,
          estatus,
          camiones ( placa, chofer, capacidad, modelo )
        `)
        .order("fecha_carga", { ascending: false });

      if (!modoVerTodo && fechaSeleccionada) {
        // Crear inicio y fin del día en hora local
        const [anio, mes, dia] = fechaSeleccionada.split("-").map(Number);
        const inicioDia = new Date(anio, mes - 1, dia, 0, 0, 0, 0);
        const finDia = new Date(anio, mes - 1, dia, 23, 59, 59, 999);

        query = query
          .gte("fecha_carga", inicioDia.toISOString())
          .lte("fecha_carga", finDia.toISOString());
      }

      const { data, error } = await query;
      if (error) throw error;

      setDatos(data || []);
    } catch (err) {
      console.error("Error al consultar ventas por fecha:", err.message);
    } finally {
      setCargandoDatos(false);
    }
  };

  const formatearFechaParaHumanos = (fechaIsoYmd) => {
    if (!fechaIsoYmd) return "";
    const [anio, mes, dia] = fechaIsoYmd.split("-").map(Number);
    const d = new Date(anio, mes - 1, dia);
    return d.toLocaleDateString("es-ES", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Filtrado de registros en pantalla
  const datosFiltrados = useMemo(() => {
    if (!busqueda) return datos;
    const b = busqueda.toLowerCase();
    return datos.filter(
      (item) =>
        item.camiones?.placa?.toLowerCase().includes(b) ||
        item.camiones?.chofer?.toLowerCase().includes(b) ||
        (item.referencia && item.referencia.toLowerCase().includes(b)) ||
        item.metodo?.toLowerCase().includes(b)
    );
  }, [datos, busqueda]);

  // Métricas de la fecha seleccionada
  const metricas = useMemo(() => {
    const totalMonto = datosFiltrados.reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
    const totalPagado = datosFiltrados
      .filter((d) => d.estatus === "pagado")
      .reduce((sum, item) => sum + (Number(item.monto) || 0), 0);
    const totalPendiente = datosFiltrados
      .filter((d) => d.estatus !== "pagado")
      .reduce((sum, item) => sum + (Number(item.monto) || 0), 0);

    return {
      totalMonto,
      totalPagado,
      totalPendiente,
      totalViajes: datosFiltrados.length,
    };
  }, [datosFiltrados]);

  const formatearDinero = (val) => {
    return "$" + Number(val).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  // Generación de reporte PDF dinámico según la fecha activa
  const generarReportePDF = () => {
    try {
      if (!datosFiltrados || datosFiltrados.length === 0) {
        return alert("No hay ventas en esta fecha para generar el reporte.");
      }

      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const tituloFecha = modoVerTodo
        ? "Histórico Completo de Recargas"
        : `Fecha: ${formatearFechaParaHumanos(fechaSeleccionada)}`;

      // 1. Encabezado
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("POZO TRINA MALAVER F.P.", 14, 15);

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Cierre Detallado de Recargas — ${tituloFecha}`, 14, 22);

      doc.setFont("helvetica", "bold");
      doc.text(
        `Total Recaudado: $${metricas.totalPagado.toFixed(2)} | Pendiente: $${metricas.totalPendiente.toFixed(2)} | Viajes: ${metricas.totalViajes}`,
        14,
        29
      );
      doc.text("------------------------------------------------------------------------------------------", 14, 34);

      // 2. Filas de la tabla
      const tablaFilas = datosFiltrados.map((item) => {
        let horaFormateada = "N/A";
        let fechaDia = "N/A";
        if (item.fecha_carga) {
          const f = new Date(item.fecha_carga);
          if (!isNaN(f.getTime())) {
            horaFormateada = f.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            fechaDia = f.toLocaleDateString();
          }
        }

        return [
          item.camiones?.placa || "N/A",
          item.camiones?.chofer || "N/A",
          `$${Number(item.monto || 0).toFixed(2)}`,
          item.metodo || "N/A",
          item.referencia || "-",
          item.estatus === "pagado" ? "PAGADO" : "PENDIENTE",
          modoVerTodo ? `${fechaDia} ${horaFormateada}` : horaFormateada,
        ];
      });

      // 3. Renderizar con jspdf-autotable
      autoTable(doc, {
        startY: 38,
        head: [["PLACA", "CHOFER", "MONTO", "MÉTODO", "REFERENCIA", "ESTADO", "HORA"]],
        body: tablaFilas,
        theme: "striped",
        headStyles: { fillColor: "#1e293b", textColor: "#ffffff", fontStyle: "bold" },
        styles: { font: "helvetica", fontSize: 9, halign: "center" },
      });

      const nombreArchivo = modoVerTodo
        ? "Reporte_General_Recargas.pdf"
        : `Reporte_Recargas_${fechaSeleccionada}.pdf`;

      doc.save(nombreArchivo);
    } catch (error) {
      alert("Error al crear el PDF: " + error.message);
    }
  };

  const seleccionarHoy = () => {
    const hoy = new Date();
    const yyyy = hoy.getFullYear();
    const mm = String(hoy.getMonth() + 1).padStart(2, "0");
    const dd = String(hoy.getDate()).padStart(2, "0");
    setFechaSeleccionada(`${yyyy}-${mm}-${dd}`);
    setModoVerTodo(false);
  };

  const seleccionarAyer = () => {
    const ayer = new Date();
    ayer.setDate(ayer.getDate() - 1);
    const yyyy = ayer.getFullYear();
    const mm = String(ayer.getMonth() + 1).padStart(2, "0");
    const dd = String(ayer.getDate()).padStart(2, "0");
    setFechaSeleccionada(`${yyyy}-${mm}-${dd}`);
    setModoVerTodo(false);
  };

  return (
    <ContenedorPrincipal>
      {/* BARRA DE CONTROLES Y SELECTOR DE FECHAS */}
      <PanelControles>
        <GrupoFiltros>
          {/* SELECTOR DE FECHAS CON REGISTROS DISPONIBLES */}
          <ControlItem>
            <label>
              <MdFilterList className="icon" /> Fechas Disponibles:
            </label>
            <select
              value={modoVerTodo ? "todos" : fechaSeleccionada}
              onChange={(e) => {
                const val = e.target.value;
                if (val === "todos") {
                  setModoVerTodo(true);
                } else {
                  setModoVerTodo(false);
                  setFechaSeleccionada(val);
                }
              }}
            >
              {fechasDisponibles.map((f) => (
                <option key={f.fechaIso} value={f.fechaIso}>
                  📅 {formatearFechaParaHumanos(f.fechaIso)} ({f.totalViajes} {f.totalViajes === 1 ? "viaje" : "viajes"})
                </option>
              ))}
              <option value="todos">🌐 Ver Todo el Histórico</option>
            </select>
          </ControlItem>

          {/* INPUT DATE PICKER CALENDARIO */}
          <ControlItem>
            <label>
              <MdCalendarToday className="icon" /> Elegir Fecha Específica:
            </label>
            <input
              type="date"
              value={modoVerTodo ? "" : fechaSeleccionada}
              disabled={modoVerTodo}
              onChange={(e) => {
                if (e.target.value) {
                  setFechaSeleccionada(e.target.value);
                  setModoVerTodo(false);
                }
              }}
            />
          </ControlItem>

          {/* ACCESOS RÁPIDOS */}
          <BotoneraRapida>
            <BotonChip
              type="button"
              $activo={!modoVerTodo && fechaSeleccionada === new Date().toISOString().substring(0, 10)}
              onClick={seleccionarHoy}
            >
              Hoy
            </BotonChip>
            <BotonChip type="button" onClick={seleccionarAyer}>
              Ayer
            </BotonChip>
            <BotonChip
              type="button"
              $activo={modoVerTodo}
              onClick={() => setModoVerTodo(!modoVerTodo)}
            >
              {modoVerTodo ? "Filtrar por Día" : "Ver Todo"}
            </BotonChip>
          </BotoneraRapida>
        </GrupoFiltros>

        {/* ACCIONES Y BÚSQUEDA */}
        <GrupoAcciones>
          <BuscadorWrap>
            <MdSearch className="search-icon" />
            <input
              type="text"
              placeholder="Buscar placa, chofer o referencia..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button onClick={() => setBusqueda("")}>
                <MdClose />
              </button>
            )}
          </BuscadorWrap>

          <BotonPDF type="button" onClick={generarReportePDF}>
            <MdPictureAsPdf /> Descargar PDF
          </BotonPDF>
        </GrupoAcciones>
      </PanelControles>

      {/* TARJETAS RESUMEN DE LA FECHA */}
      <ResumenCardsGrid>
        <ResumenCard>
          <div className="icon-badge blue">
            <MdWaterDrop />
          </div>
          <div>
            <span className="label">
              {modoVerTodo ? "Total Recargas Históricas" : `Recargas del ${fechaSeleccionada}`}
            </span>
            <h3 className="value">{metricas.totalViajes} viajes</h3>
          </div>
        </ResumenCard>

        <ResumenCard>
          <div className="icon-badge green">
            <MdCheckCircle />
          </div>
          <div>
            <span className="label">Total Pagado / En Caja</span>
            <h3 className="value green">{formatearDinero(metricas.totalPagado)}</h3>
          </div>
        </ResumenCard>

        <ResumenCard>
          <div className="icon-badge amber">
            <MdHourglassEmpty />
          </div>
          <div>
            <span className="label">Total Pendiente / Deuda</span>
            <h3 className="value amber">{formatearDinero(metricas.totalPendiente)}</h3>
          </div>
        </ResumenCard>

        <ResumenCard>
          <div className="icon-badge cyan">
            <MdAttachMoney />
          </div>
          <div>
            <span className="label">Monto Bruto Operativo</span>
            <h3 className="value">{formatearDinero(metricas.totalMonto)}</h3>
          </div>
        </ResumenCard>
      </ResumenCardsGrid>

      {/* TABLA DE REGISTROS */}
      {cargandoDatos ? (
        <EstadoMensaje>Cargando recargas de la fecha seleccionada...</EstadoMensaje>
      ) : datosFiltrados.length === 0 ? (
        <EstadoVacio>
          <MdCalendarToday className="empty-icon" />
          <h3>No hay recargas registradas para esta fecha</h3>
          <p>
            {modoVerTodo
              ? "No se encontraron registros en el sistema."
              : `No se realizaron ventas de agua el día ${formatearFechaParaHumanos(fechaSeleccionada)}. Selecciona otra fecha con registros en el menú superior.`}
          </p>
        </EstadoVacio>
      ) : (
        <TablaWrapper>
          <TablaEstilizada>
            <thead>
              <tr>
                <th><MdSchedule className="th-icon" /> Hora</th>
                <th><MdLocalShipping className="th-icon" /> Camión / Chofer</th>
                <th><MdAttachMoney className="th-icon" /> Monto</th>
                <th>Método de Pago</th>
                <th>Referencia</th>
                <th>Estado</th>
                <th style={{ textAlign: "center" }}>Foto</th>
              </tr>
            </thead>
            <tbody>
              {datosFiltrados.map((item) => {
                const f = new Date(item.fecha_carga);
                const horaStr = !isNaN(f.getTime())
                  ? f.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                  : "N/A";
                const fechaCorta = !isNaN(f.getTime()) ? f.toLocaleDateString() : "";

                return (
                  <tr key={item.id}>
                    {/* HORA */}
                    <td>
                      <HoraCell>
                        <span className="hora">{horaStr}</span>
                        {modoVerTodo && <span className="fecha-dia">{fechaCorta}</span>}
                      </HoraCell>
                    </td>

                    {/* CAMIÓN */}
                    <td>
                      <CamionCell>
                        <span className="placa">{item.camiones?.placa || "S/P"}</span>
                        <span className="chofer">{item.camiones?.chofer || "Sin Chofer"}</span>
                      </CamionCell>
                    </td>

                    {/* MONTO */}
                    <td>
                      <MontoBadge>{formatearDinero(item.monto)}</MontoBadge>
                    </td>

                    {/* MÉTODO */}
                    <td>
                      <MetodoPill className={item.metodo?.toLowerCase().replace(/\s+/g, "-")}>
                        {item.metodo || "Efectivo"}
                      </MetodoPill>
                    </td>

                    {/* REFERENCIA */}
                    <td>
                      {item.referencia ? (
                        <RefPill>{item.referencia}</RefPill>
                      ) : (
                        <span className="sin-ref">N/A</span>
                      )}
                    </td>

                    {/* ESTADO */}
                    <td>
                      <EstadoBadge className={item.estatus}>
                        {item.estatus === "pagado" ? "Pagado" : "Pendiente"}
                      </EstadoBadge>
                    </td>

                    {/* FOTO */}
                    <td style={{ textAlign: "center" }}>
                      {item.url_foto ? (
                        <FotoThumbBtn
                          type="button"
                          onClick={() =>
                            setFotoModal({
                              url: item.url_foto,
                              placa: item.camiones?.placa,
                              chofer: item.camiones?.chofer,
                              monto: item.monto,
                              hora: `${fechaCorta} ${horaStr}`,
                            })
                          }
                          title="Ver evidencia fotográfica"
                        >
                          <img src={item.url_foto} alt="Evidencia" />
                          <MdPhotoCamera />
                        </FotoThumbBtn>
                      ) : (
                        <span className="sin-foto">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </TablaEstilizada>
        </TablaWrapper>
      )}

      {/* MODAL LIGHTBOX PARA FOTO DEL CAMIÓN */}
      {fotoModal && (
        <ModalOverlay onClick={() => setFotoModal(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div>
                <h4>Evidencia de Recarga — {fotoModal.placa}</h4>
                <p>Chofer: {fotoModal.chofer} | {fotoModal.hora} | ${fotoModal.monto}</p>
              </div>
              <button className="close-btn" onClick={() => setFotoModal(null)}>
                <MdClose />
              </button>
            </ModalHeader>
            <div className="img-box">
              <img src={fotoModal.url} alt="Evidencia ampliada" />
            </div>
          </ModalContent>
        </ModalOverlay>
      )}
    </ContenedorPrincipal>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHISM
const ContenedorPrincipal = styled.div`
  animation: fadeIn 0.3s ease-out;
`;

const PanelControles = styled.div`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
`;

const GrupoFiltros = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
`;

const ControlItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 220px;
  flex: 1;

  label {
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;

    .icon {
      color: #00c3ff;
      font-size: 15px;
    }
  }

  select,
  input {
    width: 100%;
    padding: 11px 14px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 10px;
    color: #ffffff;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s ease;

    &:focus {
      border-color: #00c3ff;
      background: rgba(15, 23, 42, 0.95);
      box-shadow: 0 0 10px rgba(0, 195, 255, 0.25);
    }

    option {
      background: #151c2c;
      color: #ffffff;
    }
  }
`;

const BotoneraRapida = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 2px;
`;

const BotonChip = styled.button`
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;

  background: ${(props) =>
    props.$activo ? "rgba(0, 195, 255, 0.25)" : "rgba(255, 255, 255, 0.05)"};
  color: ${(props) => (props.$activo ? "#00c3ff" : "#94a3b8")};
  border: 1px solid
    ${(props) => (props.$activo ? "rgba(0, 195, 255, 0.5)" : "rgba(255, 255, 255, 0.1)")};

  &:hover {
    color: #ffffff;
    background: rgba(0, 195, 255, 0.18);
    border-color: rgba(0, 195, 255, 0.4);
  }
`;

const GrupoAcciones = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
`;

const BuscadorWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  padding: 0 12px;
  height: 42px;
  flex: 1;
  min-width: 260px;

  .search-icon {
    color: #00c3ff;
    font-size: 18px;
  }

  input {
    background: none;
    border: none;
    color: #ffffff;
    font-size: 13px;
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

const BotonPDF = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(5, 150, 105, 0.3);
  transition: all 0.2s ease;

  svg {
    font-size: 18px;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(5, 150, 105, 0.45);
  }
`;

const ResumenCardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const ResumenCard = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

  .icon-badge {
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
    &.amber {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    &.cyan {
      background: rgba(6, 182, 212, 0.15);
      color: #06b6d4;
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
  }

  .label {
    font-size: 11px;
    color: #94a3b8;
    font-weight: 500;
    display: block;
    line-height: 1.3;
  }

  .value {
    font-size: 19px;
    font-weight: 700;
    color: #ffffff;
    margin: 2px 0 0 0;

    &.green {
      color: #4ade80;
    }
    &.amber {
      color: #fbbf24;
    }
  }
`;

const TablaWrapper = styled.div`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow-x: auto;
  box-shadow: 0 10px 35px rgba(0, 0, 0, 0.4);
`;

const TablaEstilizada = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;

  thead {
    background: rgba(15, 23, 42, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);

    th {
      padding: 14px 18px;
      font-size: 12px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;

      .th-icon {
        vertical-align: middle;
        margin-right: 4px;
        color: #00c3ff;
      }
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      transition: background 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.03);
      }

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 13px 18px;
      color: #f8fafc;
      vertical-align: middle;
    }
  }

  .sin-ref {
    color: #64748b;
    font-size: 11px;
    font-style: italic;
  }

  .sin-foto {
    color: #475569;
  }
`;

const HoraCell = styled.div`
  display: flex;
  flex-direction: column;

  .hora {
    font-weight: 700;
    color: #ffffff;
    font-family: monospace;
  }

  .fecha-dia {
    font-size: 11px;
    color: #94a3b8;
  }
`;

const CamionCell = styled.div`
  display: flex;
  flex-direction: column;

  .placa {
    font-weight: 700;
    color: #38bdf8;
    font-family: monospace;
    font-size: 14px;
  }

  .chofer {
    font-size: 12px;
    color: #cbd5e1;
  }
`;

const MontoBadge = styled.span`
  font-weight: 700;
  color: #4ade80;
  font-size: 14px;
`;

const MetodoPill = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;

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
  &.deuda {
    background: rgba(239, 68, 68, 0.15);
    color: #f87171;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
`;

const RefPill = styled.span`
  display: inline-block;
  font-family: monospace;
  font-size: 12px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px 8px;
  border-radius: 6px;
  color: #f1f5f9;
`;

const EstadoBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 700;

  &.pagado {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }

  &.pendiente {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }
`;

const FotoThumbBtn = styled.button`
  position: relative;
  width: 44px;
  height: 34px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid rgba(0, 195, 255, 0.35);
  padding: 0;
  background: #0f172a;
  cursor: pointer;
  transition: transform 0.15s;

  &:hover {
    transform: scale(1.1);
  }

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
    background: rgba(0, 0, 0, 0.65);
    border-radius: 3px;
    font-size: 10px;
    padding: 1px;
  }
`;

const EstadoMensaje = styled.div`
  padding: 50px;
  text-align: center;
  color: #94a3b8;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

const EstadoVacio = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: #94a3b8;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);

  .empty-icon {
    font-size: 44px;
    color: #475569;
    margin-bottom: 10px;
  }

  h3 {
    margin: 0 0 6px 0;
    color: #ffffff;
    font-size: 17px;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #64748b;
    max-width: 450px;
    margin: 0 auto;
    line-height: 1.4;
  }
`;

/* Lightbox Modal */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.85);
  backdrop-filter: blur(8px);
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
`;

const ModalContent = styled.div`
  background: #111827;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 16px;
  max-width: 650px;
  width: 100%;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);

  .img-box {
    padding: 14px;
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

const ModalHeader = styled.div`
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