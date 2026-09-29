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
  MdAddCircle
} from "react-icons/md";

export function DashboardCamionero() {
  const user = useAuthStore((state) => state.user);

  const [miCamion, setMiCamion] = useState(null);
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
      let camionAsignado = null;

      // 1. Buscar si tiene camión asignado por perfil_id
      if (user?.id) {
        const { data: camionData } = await supabase
          .from("camiones")
          .select("id, placa, chofer, capacidad, modelo, perfil_id")
          .eq("perfil_id", user.id)
          .maybeSingle();

        if (camionData) {
          camionAsignado = camionData;
          setMiCamion(camionData);
        }
      }

      // 2. Cargar recargas de este camión (o por usuario_id si existe)
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
          nota,
          camiones ( id, chofer, placa, capacidad, modelo )
        `)
        .order("fecha_carga", { ascending: false });

      if (camionAsignado?.id) {
        query = query.eq("camion_id", camionAsignado.id);
      } else if (user?.id) {
        // Si no tiene camión enlazado pero tiene usuario_id
        query = query.eq("usuario_id", user.id);
      }

      const { data: cargasData, error } = await query.limit(50);
      if (!error && cargasData) {
        setRegistros(cargasData);
      }
    } catch (err) {
      console.error("Error al cargar datos del camionero:", err);
    } finally {
      setLoading(false);
    }
  };

  // Métricas del chofer
  const metricas = useMemo(() => {
    let totalViajes = registros.length;
    let litrosTotales = 0;
    let pagados = 0;
    let pendientes = 0;
    let montoPendiente = 0;

    registros.forEach((r) => {
      const cap = Number(r.camiones?.capacidad) || Number(miCamion?.capacidad) || 0;
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
  }, [registros, miCamion]);

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

        {miCamion && (
          <TruckSummaryCard>
            <div className="truck-header">
              <MdSpeed className="gauge-icon" />
              <span>Mi Unidad Cisterna</span>
            </div>
            <div className="placa-title">{miCamion.placa}</div>
            <div className="truck-specs">
              <span>💧 Capacidad: <strong>{miCamion.capacidad?.toLocaleString()} Lts</strong></span>
              {miCamion.modelo && <span>🚚 Modelo: <strong>{miCamion.modelo}</strong></span>}
            </div>
          </TruckSummaryCard>
        )}
      </HeroCard>

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
            <p>Historial de viajes realizados con tu unidad cisterna</p>
          </div>
          <BotonSecundarioRecarga onClick={() => setModalRecargaAbierto(true)}>
            <MdAddCircle /> Nueva Recarga
          </BotonSecundarioRecarga>
        </TableTopBar>

        {loading ? (
          <StatusNotice>Cargando información de tus viajes...</StatusNotice>
        ) : registros.length === 0 ? (
          <EmptyNotice>
            <MdWaterDrop className="empty-ico" />
            <h4>Aún no tienes recargas registradas</h4>
            <p>Haz clic en el botón de abajo para registrar tu primera recarga de agua en el pozo.</p>
            <BotonRecargaHero onClick={() => setModalRecargaAbierto(true)} style={{ marginTop: "12px" }}>
              <MdWaterDrop className="icon" /> Registrar Mi Primera Recarga
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
                {registros.map((item) => {
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
                          <strong>{item.camiones?.placa || miCamion?.placa || "S/P"}</strong>
                          <span>{item.camiones?.chofer || miCamion?.chofer || user?.name}</span>
                        </TruckBadge>
                      </td>

                      <td>
                        <CapBadge>
                          💧 {item.camiones?.capacidad || miCamion?.capacidad
                            ? `${(item.camiones?.capacidad || miCamion?.capacidad).toLocaleString()} Lts`
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
                                titulo: `Cisterna: ${item.camiones?.placa || miCamion?.placa || ""}`,
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
  top: -80px;
  right: -80px;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(0, 195, 255, 0.25) 0%, rgba(0, 114, 255, 0) 70%);
  pointer-events: none;
`;

const HeroContent = styled.div`
  max-width: 640px;
  z-index: 1;

  .badge-chofer {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 4px 12px;
    background: rgba(0, 195, 255, 0.15);
    border: 1px solid rgba(0, 195, 255, 0.4);
    border-radius: 20px;
    color: #38bdf8;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 10px;
  }

  h2 {
    font-size: 26px;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 8px 0;
  }

  .hero-desc {
    color: #94a3b8;
    font-size: 14px;
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
  display: inline-flex;
  align-items: center;
  gap: 10px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  padding: 13px 24px;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 6px 25px rgba(0, 195, 255, 0.45);
  transition: all 0.2s ease;

  .icon {
    font-size: 20px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 30px rgba(0, 195, 255, 0.6);
  }
`;

const LinkDeudas = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: rgba(30, 41, 59, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #f1f5f9;
  padding: 12px 20px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 195, 255, 0.12);
    border-color: #00c3ff;
    color: #38bdf8;
  }
`;

const TruckSummaryCard = styled.div`
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 18px 24px;
  min-width: 220px;
  z-index: 1;

  .truck-header {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #94a3b8;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    margin-bottom: 6px;

    .gauge-icon {
      color: #38bdf8;
      font-size: 16px;
    }
  }

  .placa-title {
    font-size: 24px;
    font-weight: 800;
    color: #38bdf8;
    letter-spacing: 1px;
    margin-bottom: 6px;
  }

  .truck-specs {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
    color: #cbd5e1;

    strong {
      color: #ffffff;
    }
  }
`;

const CardsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
`;

const CardItem = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 18px 20px;
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(0, 195, 255, 0.3);
  }

  .icon-wrap {
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
        : "rgba(245, 158, 11, 0.15)"};

    color: ${({ $color }) =>
      $color === "cyan"
        ? "#00c3ff"
        : $color === "blue"
        ? "#60a5fa"
        : $color === "green"
        ? "#34d399"
        : "#fbbf24"};
  }

  .info {
    display: flex;
    flex-direction: column;

    .lbl {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #94a3b8;
      font-weight: 700;
    }

    h3 {
      font-size: 20px;
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
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const TableTopBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;

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
`;

const BotonSecundarioRecarga = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 195, 255, 0.15);
  border: 1px solid rgba(0, 195, 255, 0.35);
  color: #38bdf8;
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 195, 255, 0.25);
    color: #ffffff;
  }
`;

const TableContainer = styled.div`
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
    padding: 12px 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    white-space: nowrap;
  }

  tbody tr {
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    &:hover {
      background: rgba(255, 255, 255, 0.02);
    }
  }

  tbody td {
    padding: 12px 14px;
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

  .ico {
    color: #38bdf8;
    font-size: 15px;
  }
`;

const TruckBadge = styled.div`
  display: flex;
  flex-direction: column;

  strong {
    color: #38bdf8;
    font-size: 13px;
  }

  span {
    color: #94a3b8;
    font-size: 11px;
  }
`;

const CapBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 8px;
  background: rgba(0, 195, 255, 0.1);
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 6px;
  color: #38bdf8;
  font-weight: 600;
  font-size: 12px;
`;

const MontoTxt = styled.span`
  font-weight: 700;
  color: #10b981;
  font-size: 13px;
`;

const StatusPill = styled.div`
  display: inline-flex;
  flex-direction: column;
  gap: 2px;
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;

  background: ${({ $type }) =>
    $type === "paid" ? "rgba(16, 185, 129, 0.15)" : "rgba(245, 158, 11, 0.15)"};
  border: 1px solid
    ${({ $type }) =>
      $type === "paid" ? "rgba(16, 185, 129, 0.3)" : "rgba(245, 158, 11, 0.3)"};
  color: ${({ $type }) => ($type === "paid" ? "#34d399" : "#fbbf24")};

  .sub-ref {
    font-size: 10px;
    color: #94a3b8;
  }
`;

const FotoBtn = styled.button`
  position: relative;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.15);
  background: #000;
  cursor: pointer;
  padding: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .lens {
    position: absolute;
    bottom: 2px;
    right: 2px;
    color: #38bdf8;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 4px;
    font-size: 11px;
  }
`;

const NotaTxt = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  color: #c084fc;
  font-size: 11px;
  max-width: 180px;

  span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
`;

const StatusNotice = styled.div`
  text-align: center;
  padding: 40px 20px;
  color: #94a3b8;
  font-size: 13px;
`;

const EmptyNotice = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 50px 20px;
  text-align: center;

  .empty-ico {
    font-size: 46px;
    color: #38bdf8;
    opacity: 0.4;
    margin-bottom: 10px;
  }

  h4 {
    margin: 0 0 6px 0;
    font-size: 17px;
    color: #ffffff;
  }

  p {
    max-width: 400px;
    color: #94a3b8;
    font-size: 13px;
    margin: 0;
  }
`;

const Overlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(4, 9, 20, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3000;
  padding: 16px;
`;

const LightboxCard = styled.div`
  background: #0f172a;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 16px;
  overflow: hidden;
  max-width: 600px;
  width: 100%;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);

  .head {
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
