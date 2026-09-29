import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import { ModalRegistrarRecarga } from "./ModalRegistrarRecarga";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  MdWaterDrop,
  MdLocalShipping,
  MdCheckCircle,
  MdHourglassEmpty,
  MdEditNote,
  MdCalendarToday,
  MdSearch,
  MdPhotoCamera,
  MdClose,
  MdSave,
  MdFilterList,
  MdInfoOutline,
  MdPerson,
  MdOutlineAccessTime
} from "react-icons/md";

export function DashboardRegistrador() {
  const user = useAuthStore((state) => state.user);

  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroDias, setFiltroDias] = useState(30); // 30 días por defecto para el registrador
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstatus, setFiltroEstatus] = useState("todos"); // "todos" | "pagado" | "pendiente" | "con_nota"

  // Modal de nueva recarga
  const [modalRecargaAbierto, setModalRecargaAbierto] = useState(false);

  // Modal para agregar / editar nota
  const [modalNotaAbierto, setModalNotaAbierto] = useState(false);
  const [recargaParaNota, setRecargaParaNota] = useState(null);
  const [textoNota, setTextoNota] = useState("");
  const [guardandoNota, setGuardandoNota] = useState(false);

  // Modal visor de fotos
  const [fotoModal, setFotoModal] = useState(null);

  // Bandera de columnas
  const [columnaNotaDisponible, setColumnaNotaDisponible] = useState(true);

  useEffect(() => {
    cargarMisRegistros();
  }, [filtroDias]);

  const cargarMisRegistros = async () => {
    setLoading(true);
    try {
      // 1. Intento principal: consultar con usuario_id y nota
      let query = supabase
        .from("registros_carga")
        .select(`
          id,
          camion_id,
          monto,
          metodo,
          referencia,
          fecha_carga,
          url_foto,
          estatus,
          usuario_id,
          nota,
          camiones ( id, chofer, placa, capacidad, modelo )
        `)
        .order("fecha_carga", { ascending: false });

      // Filtrar por rango de fecha
      if (filtroDias !== 3650) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - filtroDias);
        query = query.gte("fecha_carga", fechaLimite.toISOString());
      }

      // Si el usuario tiene ID, intentamos filtrar por su usuario_id
      if (user?.id) {
        query = query.eq("usuario_id", user.id);
      }

      const { data, error } = await query;

      if (!error) {
        // Si no arrojó error pero data está vacía y el usuario tiene registros viejos sin usuario_id asignado,
        // intentamos ver si existen registros generales
        if ((!data || data.length === 0) && user?.id) {
          const { data: todosData, error: errTodos } = await supabase
            .from("registros_carga")
            .select(`
              id,
              camion_id,
              monto,
              metodo,
              referencia,
              fecha_carga,
              url_foto,
              estatus,
              usuario_id,
              nota,
              camiones ( id, chofer, placa, capacidad, modelo )
            `)
            .order("fecha_carga", { ascending: false })
            .limit(100);

          if (!errTodos && todosData && todosData.length > 0) {
            // Verificar si ningún registro tiene usuario_id en la base de datos
            const algunoTieneUsuario = todosData.some((r) => r.usuario_id);
            if (!algunoTieneUsuario) {
              setRegistros(todosData);
              setColumnaNotaDisponible(true);
              return;
            }
          }
        }

        setRegistros(data || []);
        setColumnaNotaDisponible(true);
        return;
      }

      console.warn("Fallo consulta con columnas nuevas (usuario_id/nota):", error.message);

      // Fallback: si las columnas usuario_id o nota aún no existen en la BD
      let fallbackQuery = supabase
        .from("registros_carga")
        .select(`
          id,
          camion_id,
          monto,
          metodo,
          referencia,
          fecha_carga,
          url_foto,
          estatus,
          camiones ( id, chofer, placa, capacidad, modelo )
        `)
        .order("fecha_carga", { ascending: false });

      if (filtroDias !== 3650) {
        const fechaLimite = new Date();
        fechaLimite.setDate(fechaLimite.getDate() - filtroDias);
        fallbackQuery = fallbackQuery.gte("fecha_carga", fechaLimite.toISOString());
      }

      const { data: dataFallback, error: errFallback } = await fallbackQuery;
      if (errFallback) throw errFallback;

      setRegistros(dataFallback || []);
      setColumnaNotaDisponible(false);
    } catch (err) {
      console.error("Error al cargar registros del registrador:", err);
    } finally {
      setLoading(false);
    }
  };

  // Abrir modal de nota
  const handleAbrirNota = (recarga) => {
    setRecargaParaNota(recarga);
    setTextoNota(recarga.nota || "");
    setModalNotaAbierto(true);
  };

  // Guardar o actualizar la nota
  const handleGuardarNota = async (e) => {
    e.preventDefault();
    if (!recargaParaNota) return;

    setGuardandoNota(true);
    const notaLimpia = textoNota.trim() || null;

    try {
      const { error } = await supabase
        .from("registros_carga")
        .update({ nota: notaLimpia })
        .eq("id", recargaParaNota.id);

      if (error) {
        if (error.code === "42703" || error.code === "PGRST204" || error.message?.includes("nota")) {
          alert(
            "⚠️ La columna 'nota' aún no existe en la base de datos Supabase.\n\nPor favor, ejecuta en el SQL Editor de Supabase:\nALTER TABLE registros_carga ADD COLUMN IF NOT EXISTS nota TEXT;"
          );
        } else {
          alert(`Error al guardar la nota: ${error.message}`);
        }
        return;
      }

      // Actualizar estado local inmediatamente para reflejo instantáneo
      setRegistros((prev) =>
        prev.map((r) => (r.id === recargaParaNota.id ? { ...r, nota: notaLimpia } : r))
      );

      setModalNotaAbierto(false);
      setRecargaParaNota(null);
    } catch (err) {
      console.error("Error al actualizar nota:", err);
      alert("Error al actualizar la nota.");
    } finally {
      setGuardandoNota(false);
    }
  };

  // Filtrado de registros en memoria
  const registrosFiltrados = useMemo(() => {
    return registros.filter((item) => {
      // Filtro por estatus
      if (filtroEstatus === "pagado" && item.estatus !== "pagado") return false;
      if (filtroEstatus === "pendiente" && item.estatus === "pagado") return false;
      if (filtroEstatus === "con_nota" && (!item.nota || !item.nota.trim())) return false;

      // Filtro por texto de búsqueda
      if (!busqueda.trim()) return true;
      const q = busqueda.toLowerCase().trim();
      const placa = item.camiones?.placa?.toLowerCase() || "";
      const chofer = item.camiones?.chofer?.toLowerCase() || "";
      const nota = item.nota?.toLowerCase() || "";
      const metodo = item.metodo?.toLowerCase() || "";
      const ref = item.referencia?.toLowerCase() || "";

      return (
        placa.includes(q) ||
        chofer.includes(q) ||
        nota.includes(q) ||
        metodo.includes(q) ||
        ref.includes(q)
      );
    });
  }, [registros, busqueda, filtroEstatus]);

  // Cálculos de métricas operativas (Cero información financiera)
  const metricasOperativas = useMemo(() => {
    let totalViajes = registros.length;
    let litrosTotales = 0;
    let viajesPagados = 0;
    let viajesDeuda = 0;
    let viajesConNota = 0;

    const capacidadMap = {};

    registros.forEach((item) => {
      const cap = Number(item.camiones?.capacidad) || 0;
      litrosTotales += cap;

      if (item.estatus === "pagado") {
        viajesPagados++;
      } else {
        viajesDeuda++;
      }

      if (item.nota && item.nota.trim()) {
        viajesConNota++;
      }

      // Distribución por capacidad
      const etiquetaCap = cap > 0 ? `${(cap / 1000).toFixed(0)}k Lts` : "Sin dato";
      capacidadMap[etiquetaCap] = (capacidadMap[etiquetaCap] || 0) + 1;
    });

    // Formato para gráfico de barras operativo (Viajes por Capacidad de Cisterna)
    const dataCapacidad = Object.keys(capacidadMap).map((k) => ({
      capacidad: k,
      viajes: capacidadMap[k],
    }));

    // Formato para gráfico de pastel operativo (Pagados vs Deuda)
    const dataEstado = [
      { name: "Pagado al Contado", value: viajesPagados, color: "#10b981" },
      { name: "Cargado a Deuda", value: viajesDeuda, color: "#f59e0b" },
    ].filter((d) => d.value > 0);

    return {
      totalViajes,
      litrosTotales,
      viajesPagados,
      viajesDeuda,
      viajesConNota,
      dataCapacidad,
      dataEstado,
    };
  }, [registros]);

  const formatearFechaHora = (fechaIso) => {
    if (!fechaIso) return "--";
    const d = new Date(fechaIso);
    return d.toLocaleString("es-VE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <Container>
      {/* 🌟 ENCABEZADO PERSONALIZADO PARA REGISTRADOR */}
      <HeaderSection>
        <HeaderLeft>
          <UserBadge>
            <MdPerson className="badge-icon" /> Operador Registrador
          </UserBadge>
          <h2>Hola, {user?.name || "Operador"} 👋</h2>
          <p className="subtitle">
            Panel de control operativo de tus recargas despachadas y registro de novedades
          </p>
        </HeaderLeft>

        <HeaderActions>
          <BotonNuevaRecarga onClick={() => setModalRecargaAbierto(true)}>
            <MdWaterDrop /> Nueva Recarga
          </BotonNuevaRecarga>

          <FiltroDiasBox>
            <MdCalendarToday />
            <select value={filtroDias} onChange={(e) => setFiltroDias(Number(e.target.value))}>
              <option value={1}>Hoy</option>
              <option value={7}>Últimos 7 días</option>
              <option value={15}>Últimas 2 semanas</option>
              <option value={30}>Últimos 30 días</option>
              <option value={3650}>Todo mi histórico</option>
            </select>
          </FiltroDiasBox>
        </HeaderActions>
      </HeaderSection>

      {/* 💧 METRIC CARDS PURAMENTE OPERATIVAS (SIN GRAFICAS MONETARIAS) */}
      <MetricsGrid>
        <MetricCard $color="cyan">
          <div className="icon-wrapper">
            <MdLocalShipping />
          </div>
          <div className="content">
            <span className="label">Total Recargas Realizadas</span>
            <h3 className="value">{metricasOperativas.totalViajes} viajes</h3>
            <span className="detail">Despachados por tu usuario</span>
          </div>
        </MetricCard>

        <MetricCard $color="blue">
          <div className="icon-wrapper">
            <MdWaterDrop />
          </div>
          <div className="content">
            <span className="label">Volumen de Agua Despachado</span>
            <h3 className="value">
              {metricasOperativas.litrosTotales.toLocaleString("es-ES")} Lts
            </h3>
            <span className="detail">Litros totales suministrados</span>
          </div>
        </MetricCard>

        <MetricCard $color="green">
          <div className="icon-wrapper">
            <MdCheckCircle />
          </div>
          <div className="content">
            <span className="label">Despachos Pagados</span>
            <h3 className="value">{metricasOperativas.viajesPagados}</h3>
            <span className="detail">Confirmados en taquilla</span>
          </div>
        </MetricCard>

        <MetricCard $color="amber">
          <div className="icon-wrapper">
            <MdHourglassEmpty />
          </div>
          <div className="content">
            <span className="label">Despachos a Crédito / Deuda</span>
            <h3 className="value">{metricasOperativas.viajesDeuda}</h3>
            <span className="detail">Enviados a Cuentas por Cobrar</span>
          </div>
        </MetricCard>

        <MetricCard $color="purple">
          <div className="icon-wrapper">
            <MdEditNote />
          </div>
          <div className="content">
            <span className="label">Con Notas de Revisión</span>
            <h3 className="value">{metricasOperativas.viajesConNota}</h3>
            <span className="detail">Para validar por administración</span>
          </div>
        </MetricCard>
      </MetricsGrid>

      {/* 📊 GRAFICAS OPERATIVAS (VOLUMEN Y ESTATUS DE DESPACHO) */}
      <ChartsRow>
        <ChartCard>
          <ChartHeader>
            <MdWaterDrop className="chart-icon cyan" />
            <div>
              <h4>Distribución Operativa por Capacidad de Cisterna</h4>
              <p>Cantidad de viajes registrados según el tamaño del camión</p>
            </div>
          </ChartHeader>
          <ChartBody>
            {metricasOperativas.dataCapacidad.length === 0 ? (
              <NoDataBox>Sin registros en el rango seleccionado</NoDataBox>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={metricasOperativas.dataCapacidad} margin={{ top: 15, right: 20, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.07)" />
                  <XAxis dataKey="capacidad" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "rgba(0, 195, 255, 0.3)",
                      borderRadius: "10px",
                      color: "#fff",
                    }}
                    formatter={(val) => [`${val} viajes`, "Cargas"]}
                  />
                  <Bar dataKey="viajes" fill="#00c3ff" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartBody>
        </ChartCard>

        <ChartCard>
          <ChartHeader>
            <MdCheckCircle className="chart-icon green" />
            <div>
              <h4>Estado de los Despachos</h4>
              <p>Relación entre recargas pagadas al instante vs asignadas a deuda</p>
            </div>
          </ChartHeader>
          <ChartBody>
            {metricasOperativas.dataEstado.length === 0 ? (
              <NoDataBox>Sin registros en el rango seleccionado</NoDataBox>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={metricasOperativas.dataEstado}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={6}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {metricasOperativas.dataEstado.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderColor: "rgba(255, 255, 255, 0.15)",
                      borderRadius: "10px",
                      color: "#fff",
                    }}
                  />
                  <Legend verticalAlign="bottom" height={36} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </ChartBody>
        </ChartCard>
      </ChartsRow>

      {/* 📋 LISTA INTERACTIVA DE RECARGAS DEL REGISTRADOR */}
      <TableSection>
        <TableHeader>
          <div className="title-box">
            <h3>💧 Mis Recargas Registradas</h3>
            <p>Listado de despachos realizados por tu usuario con opción de agregar notas de revisión</p>
          </div>

          <TableFilters>
            <SearchInputBox>
              <MdSearch />
              <input
                type="text"
                placeholder="Buscar por placa, chofer o nota..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
              />
              {busqueda && (
                <button onClick={() => setBusqueda("")} title="Limpiar búsqueda">
                  <MdClose />
                </button>
              )}
            </SearchInputBox>

            <FilterSelect
              value={filtroEstatus}
              onChange={(e) => setFiltroEstatus(e.target.value)}
            >
              <option value="todos">Todos los Estados</option>
              <option value="pagado">✅ Solo Pagados</option>
              <option value="pendiente">⏳ Solo Deuda / Pendientes</option>
              <option value="con_nota">📝 Con Notas u Observaciones</option>
            </FilterSelect>
          </TableFilters>
        </TableHeader>

        {loading ? (
          <LoadingStateBox>Cargando tus recargas...</LoadingStateBox>
        ) : registrosFiltrados.length === 0 ? (
          <EmptyStateBox>
            <MdWaterDrop className="empty-icon" />
            <h4>No se encontraron recargas</h4>
            <p>
              {busqueda || filtroEstatus !== "todos"
                ? "No hay recargas que coincidan con los filtros aplicados."
                : "Aún no has registrado ninguna recarga en este rango de fechas. ¡Haz clic en 'Nueva Recarga' para comenzar!"}
            </p>
            <BotonNuevaRecarga onClick={() => setModalRecargaAbierto(true)}>
              <MdWaterDrop /> Registrar Primera Recarga
            </BotonNuevaRecarga>
          </EmptyStateBox>
        ) : (
          <TableWrapper>
            <Table>
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Camión & Chofer</th>
                  <th>Capacidad</th>
                  <th>Monto</th>
                  <th>Estado & Pago</th>
                  <th>Foto Camión</th>
                  <th>Nota / Novedad</th>
                  <th style={{ textAlign: "center" }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((recarga) => {
                  const esPagado = recarga.estatus === "pagado";
                  const tieneNota = Boolean(recarga.nota && recarga.nota.trim());

                  return (
                    <tr key={recarga.id}>
                      <td>
                        <DateTimeBadge>
                          <MdOutlineAccessTime className="icon" />
                          <span>{formatearFechaHora(recarga.fecha_carga)}</span>
                        </DateTimeBadge>
                      </td>

                      <td>
                        <TruckInfoBox>
                          <span className="placa">
                            {recarga.camiones?.placa || "Sin Placa"}
                          </span>
                          <span className="chofer">
                            {recarga.camiones?.chofer || "Chofer no especificado"}
                          </span>
                          {recarga.camiones?.modelo && (
                            <span className="modelo">{recarga.camiones.modelo}</span>
                          )}
                        </TruckInfoBox>
                      </td>

                      <td>
                        <CapacityBadge>
                          💧 {recarga.camiones?.capacidad
                            ? `${recarga.camiones.capacidad.toLocaleString()} Lts`
                            : "N/A"}
                        </CapacityBadge>
                      </td>

                      <td>
                        <MontoBadge>${Number(recarga.monto || 0).toFixed(2)}</MontoBadge>
                      </td>

                      <td>
                        {esPagado ? (
                          <StatusBadge $type="paid">
                            <MdCheckCircle /> Pagado ({recarga.metodo || "Efectivo"})
                            {recarga.referencia && (
                              <span className="ref">Ref: {recarga.referencia}</span>
                            )}
                          </StatusBadge>
                        ) : (
                          <StatusBadge $type="debt">
                            <MdHourglassEmpty /> A Deuda (Pendiente)
                          </StatusBadge>
                        )}
                      </td>

                      <td>
                        {recarga.url_foto ? (
                          <ThumbnailBtn
                            type="button"
                            onClick={() =>
                              setFotoModal({
                                url: recarga.url_foto,
                                titulo: `Camión ${recarga.camiones?.placa || ""} - ${recarga.camiones?.chofer || ""}`,
                              })
                            }
                            title="Ver foto del camión"
                          >
                            <img src={recarga.url_foto} alt="Camión" />
                            <span className="zoom-icon">🔍</span>
                          </ThumbnailBtn>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "12px" }}>Sin foto</span>
                        )}
                      </td>

                      <td>
                        {tieneNota ? (
                          <NoteBubble onClick={() => handleAbrirNota(recarga)} title="Clic para editar nota">
                            <MdEditNote className="bubble-icon" />
                            <span>{recarga.nota}</span>
                          </NoteBubble>
                        ) : (
                          <EmptyNoteLabel onClick={() => handleAbrirNota(recarga)}>
                            + Añadir nota
                          </EmptyNoteLabel>
                        )}
                      </td>

                      <td style={{ textAlign: "center" }}>
                        <BtnAccionNota
                          type="button"
                          $hasNote={tieneNota}
                          onClick={() => handleAbrirNota(recarga)}
                          title={tieneNota ? "Editar nota de revisión" : "Agregar nota para el administrador"}
                        >
                          <MdEditNote />
                          {tieneNota ? "Editar Nota" : "Añadir Nota"}
                        </BtnAccionNota>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableWrapper>
        )}
      </TableSection>

      {/* 📝 MODAL PARA AGREGAR / EDITAR NOTA */}
      {modalNotaAbierto && recargaParaNota && (
        <ModalOverlay onClick={() => setModalNotaAbierto(false)}>
          <NotaModalCard onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div className="header-info">
                <div className="badge-icon">📝</div>
                <div>
                  <h3>Nota de Revisión para Administración</h3>
                  <p>
                    Camión: <strong>{recargaParaNota.camiones?.placa || "N/A"}</strong> — Chofer:{" "}
                    <strong>{recargaParaNota.camiones?.chofer || "N/A"}</strong>
                  </p>
                </div>
              </div>
              <CloseBtn onClick={() => setModalNotaAbierto(false)}>
                <MdClose />
              </CloseBtn>
            </ModalHeader>

            <form onSubmit={handleGuardarNota}>
              <ModalContentBody>
                <InfoTipBox>
                  <MdInfoOutline className="tip-icon" />
                  <span>
                    Esta nota quedará vinculada permanentemente a este viaje para que el administrador la
                    revise en el control de auditoría y recargas.
                  </span>
                </InfoTipBox>

                <FormGroup>
                  <label>Escribe tu nota u observación de este viaje:</label>
                  <TextareaNota
                    rows="4"
                    placeholder="Ej: Chofer reportó que el recibo de transferencia se confirmará en la tarde; carga autorizada por encargado; cisterna con capacidad reducida por avería..."
                    value={textoNota}
                    onChange={(e) => setTextoNota(e.target.value)}
                    autoFocus
                  />
                </FormGroup>
              </ModalContentBody>

              <ModalFooter>
                <BtnCancelar type="button" onClick={() => setModalNotaAbierto(false)} disabled={guardandoNota}>
                  Cancelar
                </BtnCancelar>
                <BtnGuardar type="submit" disabled={guardandoNota}>
                  <MdSave /> {guardandoNota ? "Guardando..." : "Guardar Nota"}
                </BtnGuardar>
              </ModalFooter>
            </form>
          </NotaModalCard>
        </ModalOverlay>
      )}

      {/* 🖼️ MODAL VISOR DE FOTO */}
      {fotoModal && (
        <ModalOverlay onClick={() => setFotoModal(null)}>
          <ImageLightbox onClick={(e) => e.stopPropagation()}>
            <div className="lightbox-header">
              <h4>{fotoModal.titulo}</h4>
              <button onClick={() => setFotoModal(null)}>
                <MdClose />
              </button>
            </div>
            <img src={fotoModal.url} alt="Evidencia" />
          </ImageLightbox>
        </ModalOverlay>
      )}

      {/* 💧 MODAL REGISTRAR RECARGA */}
      <ModalRegistrarRecarga
        isOpen={modalRecargaAbierto}
        onClose={() => setModalRecargaAbierto(false)}
        onRecargaExitosa={cargarMisRegistros}
      />
    </Container>
  );
}

// 🎨 STYLED COMPONENTS CON ESTÉTICA OSCURA MODERNA ULTRA-PULIDA
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 24px;
  width: 100%;
  max-width: 1360px;
  margin: 0 auto;
  padding-bottom: 40px;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 20px 24px;
  backdrop-filter: blur(10px);
`;

const HeaderLeft = styled.div`
  h2 {
    font-size: 24px;
    font-weight: 800;
    color: #ffffff;
    margin: 6px 0 4px 0;
  }

  .subtitle {
    margin: 0;
    font-size: 13px;
    color: #94a3b8;
  }
`;

const UserBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(0, 195, 255, 0.15);
  border: 1px solid rgba(0, 195, 255, 0.35);
  color: #38bdf8;
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;

  .badge-icon {
    font-size: 14px;
  }
`;

const HeaderActions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const BotonNuevaRecarga = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  padding: 11px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 195, 255, 0.35);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 25px rgba(0, 195, 255, 0.5);
  }
`;

const FiltroDiasBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 9px 14px;
  border-radius: 12px;
  color: #38bdf8;

  select {
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 13px;
    font-weight: 600;
    outline: none;
    cursor: pointer;

    option {
      background: #0f172a;
      color: #ffffff;
    }
  }
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const MetricCard = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px 20px;
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-3px);
    border-color: rgba(0, 195, 255, 0.3);
  }

  .icon-wrapper {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    flex-shrink: 0;

    background: ${({ $color }) =>
      $color === "cyan"
        ? "rgba(0, 195, 255, 0.15)"
        : $color === "blue"
        ? "rgba(59, 130, 246, 0.15)"
        : $color === "green"
        ? "rgba(16, 185, 129, 0.15)"
        : $color === "amber"
        ? "rgba(245, 158, 11, 0.15)"
        : "rgba(168, 85, 247, 0.15)"};

    color: ${({ $color }) =>
      $color === "cyan"
        ? "#00c3ff"
        : $color === "blue"
        ? "#60a5fa"
        : $color === "green"
        ? "#34d399"
        : $color === "amber"
        ? "#fbbf24"
        : "#c084fc"};
  }

  .content {
    display: flex;
    flex-direction: column;
    overflow: hidden;

    .label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      font-weight: 700;
    }

    .value {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin: 4px 0 2px 0;
    }

    .detail {
      font-size: 11px;
      color: #64748b;
    }
  }
`;

const ChartsRow = styled.div`
  display: grid;
  grid-template-columns: 1.2fr 0.8fr;
  gap: 18px;

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
  }
`;

const ChartCard = styled.div`
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 20px;
  display: flex;
  flex-direction: column;
`;

const ChartHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .chart-icon {
    font-size: 26px;

    &.cyan {
      color: #00c3ff;
    }
    &.green {
      color: #10b981;
    }
  }

  h4 {
    margin: 0 0 2px 0;
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
  }

  p {
    margin: 0;
    font-size: 12px;
    color: #94a3b8;
  }
`;

const ChartBody = styled.div`
  flex: 1;
  min-height: 260px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const NoDataBox = styled.div`
  color: #64748b;
  font-size: 13px;
  text-align: center;
  padding: 30px;
`;

const TableSection = styled.div`
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
`;

const TableHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;

  .title-box {
    h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 700;
      color: #ffffff;
    }
    p {
      margin: 0;
      font-size: 12px;
      color: #94a3b8;
    }
  }
`;

const TableFilters = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
`;

const SearchInputBox = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 8px 14px;
  border-radius: 10px;
  color: #94a3b8;

  input {
    background: transparent;
    border: none;
    color: #ffffff;
    font-size: 13px;
    outline: none;
    width: 200px;

    &::placeholder {
      color: #64748b;
    }
  }

  button {
    background: transparent;
    border: none;
    color: #94a3b8;
    cursor: pointer;
    display: flex;
    align-items: center;
    font-size: 16px;
    &:hover {
      color: #ffffff;
    }
  }
`;

const FilterSelect = styled.select`
  background: rgba(30, 41, 59, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #ffffff;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  outline: none;
  cursor: pointer;

  option {
    background: #0f172a;
    color: #ffffff;
  }
`;

const TableWrapper = styled.div`
  width: 100%;
  overflow-x: auto;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;

  thead th {
    background: rgba(30, 41, 59, 0.6);
    color: #94a3b8;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
    padding: 14px 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    white-space: nowrap;
  }

  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.15s ease;

    &:hover {
      background: rgba(255, 255, 255, 0.02);
    }
  }

  tbody td {
    padding: 14px 16px;
    color: #e2e8f0;
    vertical-align: middle;
  }
`;

const DateTimeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
  font-size: 12px;
  font-family: monospace;

  .icon {
    color: #38bdf8;
    font-size: 15px;
  }
`;

const TruckInfoBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 2px;

  .placa {
    font-weight: 700;
    color: #38bdf8;
    font-size: 13px;
  }

  .chofer {
    font-size: 12px;
    color: #ffffff;
  }

  .modelo {
    font-size: 11px;
    color: #64748b;
  }
`;

const CapacityBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 195, 255, 0.1);
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 8px;
  color: #38bdf8;
  font-weight: 600;
  font-size: 12px;
  white-space: nowrap;
`;

const MontoBadge = styled.span`
  font-weight: 700;
  color: #10b981;
  font-size: 14px;
`;

const StatusBadge = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;

  background: ${({ $type }) =>
    $type === "paid" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)"};
  border: 1px solid
    ${({ $type }) =>
      $type === "paid" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"};
  color: ${({ $type }) => ($type === "paid" ? "#34d399" : "#fbbf24")};

  .ref {
    font-size: 10px;
    color: #94a3b8;
    font-weight: 400;
  }
`;

const ThumbnailBtn = styled.button`
  position: relative;
  width: 44px;
  height: 44px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #000;
  cursor: pointer;
  padding: 0;
  transition: transform 0.2s ease;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .zoom-icon {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: rgba(0, 0, 0, 0.5);
    opacity: 0;
    transition: opacity 0.2s ease;
    font-size: 14px;
  }

  &:hover {
    transform: scale(1.08);
    .zoom-icon {
      opacity: 1;
    }
  }
`;

const NoteBubble = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 6px;
  background: rgba(168, 85, 247, 0.12);
  border: 1px solid rgba(168, 85, 247, 0.3);
  padding: 6px 10px;
  border-radius: 8px;
  max-width: 240px;
  cursor: pointer;
  transition: all 0.2s ease;

  .bubble-icon {
    color: #c084fc;
    font-size: 16px;
    flex-shrink: 0;
    margin-top: 1px;
  }

  span {
    color: #e9d5ff;
    font-size: 12px;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    line-height: 1.3;
  }

  &:hover {
    background: rgba(168, 85, 247, 0.22);
    border-color: #c084fc;
  }
`;

const EmptyNoteLabel = styled.span`
  color: #64748b;
  font-size: 12px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 6px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;

  &:hover {
    color: #38bdf8;
    border-color: #00c3ff;
    background: rgba(0, 195, 255, 0.08);
  }
`;

const BtnAccionNota = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  background: ${({ $hasNote }) =>
    $hasNote ? "rgba(168, 85, 247, 0.15)" : "rgba(30, 41, 59, 0.7)"};
  border: 1px solid
    ${({ $hasNote }) =>
      $hasNote ? "rgba(168, 85, 247, 0.4)" : "rgba(255, 255, 255, 0.12)"};
  color: ${({ $hasNote }) => ($hasNote ? "#c084fc" : "#cbd5e1")};

  &:hover {
    background: rgba(168, 85, 247, 0.3);
    color: #ffffff;
    border-color: #c084fc;
    transform: translateY(-1px);
  }
`;

const LoadingStateBox = styled.div`
  text-align: center;
  padding: 50px 20px;
  color: #94a3b8;
  font-size: 14px;
`;

const EmptyStateBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;

  .empty-icon {
    font-size: 50px;
    color: #38bdf8;
    opacity: 0.4;
    margin-bottom: 12px;
  }

  h4 {
    margin: 0 0 6px 0;
    font-size: 18px;
    color: #ffffff;
  }

  p {
    max-width: 420px;
    color: #94a3b8;
    font-size: 13px;
    margin: 0 0 18px 0;
    line-height: 1.5;
  }
`;

// MODALES
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
  animation: fadeIn 0.2s ease-out;
`;

const NotaModalCard = styled.div`
  background: #111827;
  border: 1px solid rgba(168, 85, 247, 0.35);
  border-radius: 18px;
  width: 100%;
  max-width: 540px;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(168, 85, 247, 0.2);
  overflow: hidden;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 22px;
  background: rgba(17, 24, 39, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .header-info {
    display: flex;
    align-items: center;
    gap: 12px;

    .badge-icon {
      font-size: 24px;
    }

    h3 {
      margin: 0 0 2px 0;
      font-size: 17px;
      font-weight: 700;
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
  }
`;

const CloseBtn = styled.button`
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  cursor: pointer;

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.12);
  }
`;

const ModalContentBody = styled.div`
  padding: 20px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const InfoTipBox = styled.div`
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 10px 14px;
  background: rgba(0, 195, 255, 0.08);
  border: 1px solid rgba(0, 195, 255, 0.2);
  border-radius: 10px;
  font-size: 12px;
  color: #94a3b8;
  line-height: 1.4;

  .tip-icon {
    font-size: 18px;
    color: #38bdf8;
    flex-shrink: 0;
    margin-top: 1px;
  }
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 13px;
    font-weight: 600;
    color: #e2e8f0;
  }
`;

const TextareaNota = styled.textarea`
  width: 100%;
  padding: 12px 14px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 10px;
  color: #ffffff;
  font-size: 13px;
  font-family: inherit;
  outline: none;
  resize: vertical;
  line-height: 1.5;
  box-sizing: border-box;

  &:focus {
    border-color: #c084fc;
    box-shadow: 0 0 12px rgba(168, 85, 247, 0.25);
  }
`;

const ModalFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 22px;
  background: rgba(15, 23, 42, 0.6);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
`;

const BtnCancelar = styled.button`
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #94a3b8;
  padding: 9px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.3);
  }
`;

const BtnGuardar = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #a855f7 0%, #7c3aed 100%);
  color: #ffffff;
  border: none;
  padding: 9px 20px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(168, 85, 247, 0.35);

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(168, 85, 247, 0.5);
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

const ImageLightbox = styled.div`
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  overflow: hidden;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);

  .lightbox-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    background: rgba(30, 41, 59, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    h4 {
      margin: 0;
      font-size: 14px;
      color: #ffffff;
    }

    button {
      background: transparent;
      border: none;
      color: #94a3b8;
      cursor: pointer;
      font-size: 20px;
      display: flex;
      align-items: center;

      &:hover {
        color: #ffffff;
      }
    }
  }

  img {
    width: 100%;
    max-height: 75vh;
    object-fit: contain;
    display: block;
    background: #000;
  }
`;
