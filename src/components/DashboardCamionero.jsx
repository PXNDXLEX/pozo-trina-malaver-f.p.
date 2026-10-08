import React, { useState, useEffect, useMemo } from "react";
import styled from "styled-components";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import { ModalRegistrarRecarga } from "./ModalRegistrarRecarga";
import { Link } from "react-router-dom";
import {
  MdWaterDrop,
  MdLocalShipping,
  MdCheckCircle,
  MdHourglassEmpty,
  MdReceipt,
  MdPhotoCamera,
  MdClose,
  MdOutlineAccessTime,
  MdSpeed,
  MdAddCircle,
  MdFilterList,
} from "react-icons/md";

export function DashboardCamionero() {
  const user = useAuthStore((state) => state.user);

  // Lista de camiones asignados al chofer (puede tener 1 o varios)
  const [misCamiones, setMisCamiones] = useState([]);
  const [camionFiltradoId, setCamionFiltradoId] = useState("todos"); // "todos" o id de camión
  const [registros, setRegistros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalRecargaAbierto, setModalRecargaAbierto] = useState(false);
  const [fotoModal, setFotoModal] = useState(null);

  useEffect(() => {
    cargarDatosCamionero();
  }, [user?.id]);

  const cargarDatosCamionero = async () => {
    setLoading(true);
    try {
      const trucksMap = new Map();

      if (user?.id) {
        try {
          // 1. Buscar la ficha del chofer en la tabla camioneros
          const { data: camioneroRow } = await supabase
            .from("camioneros")
            .select("id, nombre")
            .eq("perfil_id", user.id)
            .maybeSingle();

          // 2. Camiones por camionero_id
          if (camioneroRow?.id) {
            const { data: byCamioneroId } = await supabase
              .from("camiones")
              .select("id, placa, chofer, capacidad, modelo, perfil_id, camionero_id")
              .eq("camionero_id", camioneroRow.id);

            (byCamioneroId || []).forEach((t) => {
              const choferStr = (t.chofer || "").trim().toLowerCase();
              if (!choferStr.includes("sin")) {
                trucksMap.set(t.id, t);
              }
            });
          }

          // 3. Camiones por perfil_id directo
          const { data: byPerfil } = await supabase
            .from("camiones")
            .select("id, placa, chofer, capacidad, modelo, perfil_id, camionero_id")
            .eq("perfil_id", user.id);

          (byPerfil || []).forEach((t) => {
            const choferStr = (t.chofer || "").trim().toLowerCase();
            const esMismoCam = !t.camionero_id || (camioneroRow?.id && String(t.camionero_id) === String(camioneroRow.id));
            if (!choferStr.includes("sin") && esMismoCam) {
              trucksMap.set(t.id, t);
            }
          });

          // 4. Camiones por coincidencia de nombre de chofer o usuario
          const nombreChofer = camioneroRow?.nombre || user?.nombre;
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
        } catch (errCamioneros) {
          console.error("Error al cargar camiones en dashboard:", errCamioneros);
        }
      }

      const listaFinal = Array.from(trucksMap.values());
      setMisCamiones(listaFinal);

      if (listaFinal.length === 0) {
        setRegistros([]);
        setLoading(false);
        return;
      }

      const idsCamiones = listaFinal.map((c) => c.id);

      // 3. Cargar recargas de todas sus unidades
      const { data: cargasData, error } = await supabase
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
          nota,
          camiones ( id, chofer, placa, capacidad, modelo )
        `)
        .in("camion_id", idsCamiones)
        .order("fecha_carga", { ascending: false })
        .limit(100);

      if (!error && cargasData) {
        setRegistros(cargasData);
      } else {
        setRegistros([]);
      }
    } catch (err) {
      console.error("Error al cargar datos del camionero:", err);
      setRegistros([]);
    } finally {
      setLoading(false);
    }
  };

  // Filtrado de recargas según selector de unidad
  const registrosFiltrados = useMemo(() => {
    if (camionFiltradoId === "todos") return registros;
    return registros.filter((r) => String(r.camion_id) === String(camionFiltradoId));
  }, [registros, camionFiltradoId]);

  // Métricas del chofer / unidades
  const metricas = useMemo(() => {
    let totalViajes = registrosFiltrados.length;
    let litrosTotales = 0;
    let pagados = 0;
    let pendientes = 0;
    let montoPendiente = 0;

    registrosFiltrados.forEach((r) => {
      const cap = Number(r.camiones?.capacidad) || 0;
      litrosTotales += cap;

      if (r.estatus === "pagado") {
        pagados++;
      } else {
        pendientes++;
        montoPendiente += Number(r.monto) || 0;
      }
    });

    return {
      totalViajes,
      litrosTotales,
      pagados,
      pendientes,
      montoPendiente,
    };
  }, [registrosFiltrados]);

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

  const primerCamion = misCamiones[0] || null;

  return (
    <Container>
      {/* 🌟 HERO CARD: BOTÓN PRINCIPAL PARA REGISTRAR RECARGA */}
      <HeroCard>
        <HeroGlow />
        <HeroContent>
          <div className="badge-chofer">
            <MdLocalShipping /> Panel del Chofer Cisterna
          </div>
          <h2>Hola, {user?.name || "Chofer"} 👋</h2>
          <p className="hero-desc">
            Registra tus recargas de agua en el pozo al instante con el nuevo formulario digital. 
            Puedes adjuntar la foto del camión y registrar el pago o asignarlo a tu saldo pendiente.
          </p>

          <HeroBtnRow>
            <BotonRecargaHero onClick={() => setModalRecargaAbierto(true)}>
              <MdWaterDrop className="icon" /> Registrar Recarga de Agua
            </BotonRecargaHero>

            <LinkDeudas to="/cuentas-por-cobrar">
              <MdReceipt /> Ver Mis Deudas por Pagar {metricas.pendientes > 0 && `(${metricas.pendientes})`}
            </LinkDeudas>
          </HeroBtnRow>
        </HeroContent>

        {/* SI TIENE 1 SOLO CAMIÓN */}
        {misCamiones.length === 1 && primerCamion && (
          <TruckSummaryCard>
            <div className="truck-header">
              <MdSpeed className="gauge-icon" />
              <span>Mi Unidad Cisterna</span>
            </div>
            <div className="placa-title">{primerCamion.placa}</div>
            <div className="truck-specs">
              <span>💧 Capacidad: <strong>{primerCamion.capacidad?.toLocaleString()} Lts</strong></span>
              {primerCamion.modelo && <span>🚚 Modelo: <strong>{primerCamion.modelo}</strong></span>}
            </div>
          </TruckSummaryCard>
        )}

        {/* SI TIENE MÚLTIPLES CAMIONES (FLOTA DE 2 O MÁS) */}
        {misCamiones.length > 1 && (
          <FleetSummaryCard>
            <div className="fleet-header">
              <MdLocalShipping className="fleet-icon" />
              <span>Mis Unidades Cisterna ({misCamiones.length})</span>
            </div>
            <div className="fleet-units-grid">
              {misCamiones.map((c) => (
                <div key={c.id} className="unit-pill">
                  <span className="unit-plate">{c.placa}</span>
                  <span className="unit-cap">💧 {c.capacidad?.toLocaleString()} Lts</span>
                  {c.modelo && <span className="unit-mod">{c.modelo}</span>}
                </div>
              ))}
            </div>
          </FleetSummaryCard>
        )}
      </HeroCard>

      {/* AVISO SI NO TIENE CAMIÓN ASIGNADO */}
      {misCamiones.length === 0 && !loading && (
        <AvisoSinCamion>
          <div className="aviso-icon">⚠️</div>
          <div className="aviso-body">
            <h4>Cisterna No Asignada a tu Cuenta de Chofer</h4>
            <p>
              Tu usuario (<strong>{user?.name || "Chofer"}</strong>) aún no tiene un camión cisterna vinculado.
              Para poder registrar recargas y ver tus viajes, un administrador debe ingresar a <strong>Camiones</strong> y asignar tu nombre en la unidad cisterna correspondiente.
            </p>
          </div>
        </AvisoSinCamion>
      )}

      {/* SELECTOR / FILTRO DE UNIDAD SI TIENE MÚLTIPLES CAMIONES */}
      {misCamiones.length > 1 && (
        <FilterFleetBar>
          <div className="filter-title">
            <MdFilterList /> Ver viajes de:
          </div>
          <div className="pills-row">
            <FleetFilterPill
              $active={camionFiltradoId === "todos"}
              onClick={() => setCamionFiltradoId("todos")}
            >
              📋 Todas mis unidades ({misCamiones.length})
            </FleetFilterPill>
            {misCamiones.map((c) => (
              <FleetFilterPill
                key={c.id}
                $active={String(camionFiltradoId) === String(c.id)}
                onClick={() => setCamionFiltradoId(c.id)}
              >
                🚚 {c.placa} ({c.capacidad?.toLocaleString()} Lts)
              </FleetFilterPill>
            ))}
          </div>
        </FilterFleetBar>
      )}

      {/* 📊 TARJETAS OPERATIVAS DEL CHOFER */}
      <CardsGrid>
        <CardItem $color="cyan">
          <div className="icon-wrap">
            <MdWaterDrop />
          </div>
          <div className="info">
            <span className="lbl">Total Viajes Despachados</span>
            <h3>{metricas.totalViajes} viajes</h3>
            <span className="sub">Cargados en el pozo</span>
          </div>
        </CardItem>

        <CardItem $color="blue">
          <div className="icon-wrap">
            <MdLocalShipping />
          </div>
          <div className="info">
            <span className="lbl">Litros Transportados</span>
            <h3>{metricas.litrosTotales.toLocaleString("es-ES")} Lts</h3>
            <span className="sub">Volumen de agua movilizado</span>
          </div>
        </CardItem>

        <CardItem $color="green">
          <div className="icon-wrap">
            <MdCheckCircle />
          </div>
          <div className="info">
            <span className="lbl">Viajes Pagados al Día</span>
            <h3>{metricas.pagados}</h3>
            <span className="sub">Solventes en taquilla</span>
          </div>
        </CardItem>

        <CardItem $color="amber">
          <div className="icon-wrap">
            <MdHourglassEmpty />
          </div>
          <div className="info">
            <span className="lbl">Viajes por Pagar</span>
            <h3>{metricas.pendientes}</h3>
            <span className="sub">Deuda pendiente: ${metricas.montoPendiente.toFixed(2)}</span>
          </div>
        </CardItem>
      </CardsGrid>

      {/* 📋 LISTA DE MIS ÚLTIMAS RECARGAS */}
      <TableSection>
        <TableTopBar>
          <div>
            <h3>💧 Mis Últimas Recargas Registradas</h3>
            <p>
              {camionFiltradoId === "todos"
                ? "Historial de viajes realizados con tus unidades cisterna"
                : `Historial filtrado para la unidad seleccionada`}
            </p>
          </div>
          <BotonSecundarioRecarga onClick={() => setModalRecargaAbierto(true)}>
            <MdAddCircle /> Nueva Recarga
          </BotonSecundarioRecarga>
        </TableTopBar>

        {loading ? (
          <StatusNotice>Cargando información de tus viajes...</StatusNotice>
        ) : registrosFiltrados.length === 0 ? (
          <EmptyNotice>
            <MdWaterDrop className="empty-ico" />
            <h4>Aún no tienes recargas registradas</h4>
            <p>Haz clic en el botón de abajo para registrar tu primera recarga de agua en el pozo.</p>
            <BotonRecargaHero onClick={() => setModalRecargaAbierto(true)} style={{ marginTop: "12px" }}>
              <MdWaterDrop className="icon" /> Registrar Recarga de Agua
            </BotonRecargaHero>
          </EmptyNotice>
        ) : (
          <TableContainer>
            <Table>
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Camión / Placa</th>
                  <th>Capacidad</th>
                  <th>Monto</th>
                  <th>Estatus de Pago</th>
                  <th>Foto Camión</th>
                  <th>Nota / Novedad</th>
                </tr>
              </thead>
              <tbody>
                {registrosFiltrados.map((item) => {
                  const esPagado = item.estatus === "pagado";
                  return (
                    <tr key={item.id}>
                      <td>
                        <DateTimeBadge>
                          <MdOutlineAccessTime className="ico" />
                          <span>{formatearFechaHora(item.fecha_carga)}</span>
                        </DateTimeBadge>
                      </td>

                      <td>
                        <TruckBadge>
                          <strong>{item.camiones?.placa || "S/P"}</strong>
                          <span>{item.camiones?.modelo || "Cisterna"}</span>
                        </TruckBadge>
                      </td>

                      <td>
                        <CapBadge>
                          💧 {item.camiones?.capacidad
                            ? `${Number(item.camiones.capacidad).toLocaleString()} Lts`
                            : "N/A"}
                        </CapBadge>
                      </td>

                      <td>
                        <MontoTxt>${Number(item.monto || 0).toFixed(2)}</MontoTxt>
                      </td>

                      <td>
                        {esPagado ? (
                          <StatusPill $type="paid">
                            <MdCheckCircle /> Pagado ({item.metodo || "Efectivo"})
                            {item.referencia && <span className="sub-ref">Ref: {item.referencia}</span>}
                          </StatusPill>
                        ) : (
                          <StatusPill $type="debt">
                            <MdHourglassEmpty /> Pendiente por Pagar
                          </StatusPill>
                        )}
                      </td>

                      <td>
                        {item.url_foto ? (
                          <FotoBtn
                            type="button"
                            onClick={() =>
                              setFotoModal({
                                url: item.url_foto,
                                titulo: `Cisterna: ${item.camiones?.placa || ""}`,
                              })
                            }
                            title="Ver foto de la recarga"
                          >
                            <img src={item.url_foto} alt="Evidencia" />
                            <MdPhotoCamera className="lens" />
                          </FotoBtn>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "12px" }}>Sin foto</span>
                        )}
                      </td>

                      <td>
                        {item.nota ? (
                          <NotaTxt title={item.nota}>
                            📝 <span>{item.nota}</span>
                          </NotaTxt>
                        ) : (
                          <span style={{ color: "#64748b", fontSize: "12px" }}>-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          </TableContainer>
        )}
      </TableSection>

      {/* 🖼️ MODAL LIGHTBOX PARA FOTO */}
      {fotoModal && (
        <Overlay onClick={() => setFotoModal(null)}>
          <LightboxCard onClick={(e) => e.stopPropagation()}>
            <div className="head">
              <h4>{fotoModal.titulo}</h4>
              <button onClick={() => setFotoModal(null)}>
                <MdClose />
              </button>
            </div>
            <img src={fotoModal.url} alt="Recarga Cisterna" />
          </LightboxCard>
        </Overlay>
      )}

      {/* 💧 MODAL REGISTRAR RECARGA */}
      <ModalRegistrarRecarga
        isOpen={modalRecargaAbierto}
        onClose={() => setModalRecargaAbierto(false)}
        onRecargaExitosa={cargarDatosCamionero}
      />
    </Container>
  );
}

// 🎨 STYLED COMPONENTS PREMIUM PARA CHOFER / CAMIONERO
const Container = styled.div`
  display: flex;
  flex-direction: column;
  gap: 22px;
  max-width: 1300px;
  margin: 0 auto;
  padding-bottom: 40px;
`;

const HeroCard = styled.div`
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.85) 100%);
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 20px;
  padding: 30px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 24px;
  box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), 0 0 30px rgba(0, 195, 255, 0.12);
  overflow: hidden;
`;

const HeroGlow = styled.div`
  position: absolute;
  top: -50%;
  left: -20%;
  width: 500px;
  height: 500px;
  background: radial-gradient(circle, rgba(0, 195, 255, 0.15) 0%, transparent 70%);
  pointer-events: none;
`;

const HeroContent = styled.div`
  position: relative;
  z-index: 1;
  max-width: 600px;

  .badge-chofer {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 195, 255, 0.15);
    border: 1px solid rgba(0, 195, 255, 0.3);
    color: #00c3ff;
    font-size: 12px;
    font-weight: 700;
    padding: 4px 12px;
    border-radius: 20px;
    margin-bottom: 12px;
  }

  h2 {
    font-size: 26px;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .hero-desc {
    font-size: 14px;
    color: #94a3b8;
    line-height: 1.5;
    margin: 0 0 20px 0;
  }
`;

const HeroBtnRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`;

const BotonRecargaHero = styled.button`
  display: flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  font-size: 14px;
  font-weight: 700;
  border: none;
  border-radius: 12px;
  padding: 12px 22px;
  cursor: pointer;
  box-shadow: 0 4px 20px rgba(0, 195, 255, 0.4);
  transition: all 0.25s ease;

  .icon {
    font-size: 20px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 28px rgba(0, 195, 255, 0.6);
  }
`;

const LinkDeudas = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(234, 179, 8, 0.15);
  border: 1px solid rgba(234, 179, 8, 0.35);
  color: #fef08a;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  padding: 11px 18px;
  border-radius: 12px;
  transition: all 0.2s;

  &:hover {
    background: rgba(234, 179, 8, 0.25);
    color: #ffffff;
  }
`;

const TruckSummaryCard = styled.div`
  position: relative;
  z-index: 1;
  background: rgba(21, 28, 45, 0.85);
  border: 1px solid rgba(0, 195, 255, 0.4);
  border-radius: 16px;
  padding: 20px 24px;
  min-width: 250px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);

  .truck-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 600;
    color: #94a3b8;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;

    .gauge-icon {
      color: #00c3ff;
      font-size: 16px;
    }
  }

  .placa-title {
    font-size: 28px;
    font-weight: 900;
    color: #00c3ff;
    letter-spacing: 2px;
    margin-bottom: 12px;
  }

  .truck-specs {
    display: flex;
    flex-direction: column;
    gap: 6px;
    font-size: 13px;
    color: #cbd5e1;

    strong {
      color: #ffffff;
    }
  }
`;

const FleetSummaryCard = styled.div`
  position: relative;
  z-index: 1;
  background: rgba(21, 28, 45, 0.85);
  border: 1px solid rgba(0, 195, 255, 0.4);
  border-radius: 16px;
  padding: 18px 20px;
  min-width: 260px;
  max-width: 380px;

  .fleet-header {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    font-weight: 700;
    color: #38bdf8;
    text-transform: uppercase;
    margin-bottom: 12px;

    .fleet-icon {
      font-size: 18px;
    }
  }

  .fleet-units-grid {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 180px;
    overflow-y: auto;
  }

  .unit-pill {
    background: rgba(15, 23, 42, 0.8);
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 10px;
    padding: 8px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;

    .unit-plate {
      background: rgba(0, 195, 255, 0.2);
      color: #38bdf8;
      font-weight: 800;
      font-size: 12px;
      padding: 2px 6px;
      border-radius: 4px;
    }

    .unit-cap {
      font-size: 12px;
      color: #ffffff;
    }

    .unit-mod {
      font-size: 11px;
      color: #94a3b8;
    }
  }
`;

const FilterFleetBar = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  background: rgba(21, 28, 45, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 10px 16px;

  .filter-title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    color: #94a3b8;
    font-weight: 600;
  }

  .pills-row {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
`;

const FleetFilterPill = styled.button`
  background: ${(props) =>
    props.$active ? "linear-gradient(135deg, #00c3ff 0%, #0072ff 100%)" : "rgba(15, 23, 42, 0.8)"};
  color: ${(props) => (props.$active ? "#ffffff" : "#cbd5e1")};
  border: 1px solid ${(props) => (props.$active ? "#00c3ff" : "rgba(255, 255, 255, 0.1)")};
  padding: 6px 14px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #ffffff;
    border-color: #00c3ff;
  }
`;

const AvisoSinCamion = styled.div`
  background: rgba(234, 179, 8, 0.12);
  border: 1px solid rgba(234, 179, 8, 0.35);
  border-radius: 16px;
  padding: 18px 24px;
  display: flex;
  align-items: flex-start;
  gap: 16px;

  .aviso-icon {
    font-size: 26px;
    flex-shrink: 0;
  }

  .aviso-body {
    h4 {
      color: #fef08a;
      font-size: 15px;
      font-weight: 700;
      margin: 0 0 6px 0;
    }

    p {
      color: #cbd5e1;
      font-size: 13px;
      margin: 0;
      line-height: 1.5;
    }
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
`;

const CardItem = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid
    ${(props) =>
      props.$color === "cyan"
        ? "rgba(0, 195, 255, 0.25)"
        : props.$color === "blue"
        ? "rgba(59, 130, 246, 0.25)"
        : props.$color === "green"
        ? "rgba(34, 197, 94, 0.25)"
        : "rgba(234, 179, 8, 0.25)"};
  border-radius: 18px;
  padding: 22px;
  display: flex;
  align-items: center;
  gap: 18px;

  .icon-wrap {
    width: 50px;
    height: 50px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 26px;
    flex-shrink: 0;
    background: ${(props) =>
      props.$color === "cyan"
        ? "rgba(0, 195, 255, 0.15)"
        : props.$color === "blue"
        ? "rgba(59, 130, 246, 0.15)"
        : props.$color === "green"
        ? "rgba(34, 197, 94, 0.15)"
        : "rgba(234, 179, 8, 0.15)"};
    color: ${(props) =>
      props.$color === "cyan"
        ? "#00c3ff"
        : props.$color === "blue"
        ? "#3b82f6"
        : props.$color === "green"
        ? "#22c55e"
        : "#eab308"};
  }

  .info {
    display: flex;
    flex-direction: column;

    .lbl {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }

    h3 {
      font-size: 22px;
      font-weight: 800;
      color: #ffffff;
      margin: 4px 0 2px 0;
    }

    .sub {
      font-size: 11px;
      color: #64748b;
    }
  }
`;

const TableSection = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 26px;
`;

const TableTopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 14px;

  h3 {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 4px 0;
  }

  p {
    font-size: 13px;
    color: #94a3b8;
    margin: 0;
  }
`;

const BotonSecundarioRecarga = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(0, 195, 255, 0.15);
  border: 1px solid rgba(0, 195, 255, 0.35);
  color: #00c3ff;
  font-size: 13px;
  font-weight: 600;
  padding: 10px 16px;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 195, 255, 0.25);
    color: #ffffff;
  }
`;

const TableContainer = styled.div`
  overflow-x: auto;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;
  font-size: 13px;

  th {
    padding: 14px 16px;
    color: #94a3b8;
    font-weight: 600;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    background: rgba(15, 23, 42, 0.4);
    text-transform: uppercase;
    font-size: 11px;
    letter-spacing: 0.5px;
  }

  td {
    padding: 16px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.04);
    color: #e2e8f0;
  }

  tbody tr:hover {
    background: rgba(255, 255, 255, 0.02);
  }
`;

const DateTimeBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  color: #cbd5e1;
  font-size: 12px;

  .ico {
    color: #00c3ff;
    font-size: 14px;
  }
`;

const TruckBadge = styled.div`
  display: flex;
  flex-direction: column;

  strong {
    color: #00c3ff;
    font-size: 13px;
    font-weight: 700;
  }

  span {
    color: #94a3b8;
    font-size: 11px;
  }
`;

const CapBadge = styled.span`
  background: rgba(0, 195, 255, 0.1);
  color: #38bdf8;
  padding: 4px 8px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 12px;
`;

const MontoTxt = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
`;

const StatusPill = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  background: ${(props) =>
    props.$type === "paid" ? "rgba(34, 197, 94, 0.15)" : "rgba(234, 179, 8, 0.15)"};
  color: ${(props) => (props.$type === "paid" ? "#22c55e" : "#eab308")};
  border: 1px solid
    ${(props) => (props.$type === "paid" ? "rgba(34, 197, 94, 0.3)" : "rgba(234, 179, 8, 0.3)")};

  .sub-ref {
    font-size: 10px;
    opacity: 0.85;
  }
`;

const FotoBtn = styled.button`
  position: relative;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  padding: 2px;
  cursor: pointer;
  width: 44px;
  height: 44px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    border-radius: 6px;
  }

  .lens {
    position: absolute;
    color: #ffffff;
    font-size: 18px;
    background: rgba(0, 0, 0, 0.4);
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0;
    transition: opacity 0.2s;
  }

  &:hover .lens {
    opacity: 1;
  }
`;

const NotaTxt = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #cbd5e1;
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const StatusNotice = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 14px;
`;

const EmptyNotice = styled.div`
  text-align: center;
  padding: 50px 20px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;

  .empty-ico {
    font-size: 48px;
    color: rgba(0, 195, 255, 0.3);
    margin-bottom: 8px;
  }

  h4 {
    color: #ffffff;
    font-size: 18px;
    font-weight: 700;
    margin: 0;
  }

  p {
    color: #94a3b8;
    font-size: 13px;
    max-width: 450px;
    margin: 0;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
`;

const LightboxCard = styled.div`
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  overflow: hidden;

  .head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    h4 {
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
      margin: 0;
    }

    button {
      background: transparent;
      border: none;
      color: #94a3b8;
      font-size: 20px;
      cursor: pointer;
    }
  }

  img {
    width: 100%;
    max-height: 500px;
    object-fit: contain;
    display: block;
    background: #000;
  }
`;
