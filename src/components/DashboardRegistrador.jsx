import React, { useState, useEffect } from "react";
import styled, { keyframes } from "styled-components";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import { ModalRegistrarRecarga } from "./ModalRegistrarRecarga";
import { filtrarRegistrosPorUsuario } from "../utils/userFilterUtils";
import {
  MdWaterDrop,
  MdLocalShipping,
  MdAttachMoney,
  MdHourglassEmpty,
  MdCheckCircle,
  MdOutlineAccessTime,
  MdPerson,
  MdSpeed,
  MdArrowForward,
  MdInfoOutline,
  MdAddCircleOutline,
  MdReceipt,
  MdImage,
} from "react-icons/md";

export function DashboardRegistrador() {
  const user = useAuthStore((state) => state.user);

  const [modalRecargaAbierto, setModalRecargaAbierto] = useState(false);
  const [ultimoRegistro, setUltimoRegistro] = useState(null);
  const [cargandoUltimo, setCargandoUltimo] = useState(true);

  // Métricas del turno / día de hoy
  const [metricasHoy, setMetricasHoy] = useState({
    totalCargas: 0,
    totalLitros: 0,
    montoPagado: 0,
    montoDeuda: 0,
  });
  const [cargandoMetricas, setCargandoMetricas] = useState(true);

  useEffect(() => {
    cargarUltimoRegistro();
    cargarMetricasHoy();
  }, [user?.id]);

  const cargarUltimoRegistro = async () => {
    setCargandoUltimo(true);
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
          url_foto,
          url_comprobante,
          camiones (
            placa,
            chofer,
            capacidad,
            modelo,
            cedula
          )
        `)
        .order("fecha_carga", { ascending: false })
        .limit(1);

      // Si el usuario registrador tiene ID, filtrar sus propios registros
      if (user?.id) {
        query = await filtrarRegistrosPorUsuario(query, user.id);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setUltimoRegistro(data[0]);
      } else {
        setUltimoRegistro(null);
      }
    } catch (err) {
      console.warn("No se pudo cargar el último registro:", err);
    } finally {
      setCargandoUltimo(false);
    }
  };

  const cargarMetricasHoy = async () => {
    setCargandoMetricas(true);
    try {
      const hoy = new Date();
      hoy.setHours(0, 0, 0, 0);
      const inicioDia = hoy.toISOString();

      let query = supabase
        .from("registros_carga")
        .select(`
          id,
          monto,
          estatus,
          camiones ( capacidad )
        `)
        .gte("fecha_carga", inicioDia);

      if (user?.id) {
        query = await filtrarRegistrosPorUsuario(query, user.id);
      }

      const { data, error } = await query;
      if (!error && data) {
        let totalCargas = data.length;
        let totalLitros = 0;
        let montoPagado = 0;
        let montoDeuda = 0;

        data.forEach((r) => {
          const cap = Number(r.camiones?.capacidad) || 0;
          totalLitros += cap;
          const m = Number(r.monto) || 0;
          if (r.estatus === "pagado") {
            montoPagado += m;
          } else {
            montoDeuda += m;
          }
        });

        setMetricasHoy({
          totalCargas,
          totalLitros,
          montoPagado,
          montoDeuda,
        });
      }
    } catch (err) {
      console.warn("No se pudieron cargar las métricas de hoy:", err);
    } finally {
      setCargandoMetricas(false);
    }
  };

  const handleRecargaCompletada = () => {
    cargarUltimoRegistro();
    cargarMetricasHoy();
  };

  return (
    <Container>
      {/* 🌟 BANNER DE BIENVENIDA AL REGISTRADOR */}
      <TopTerminalHeader>
        <div className="terminal-badge">
          <MdWaterDrop /> Estación de Despacho de Agua
        </div>
        <h2>Bienvenido, {user?.name || "Operador"} 👋</h2>
        <p>
          Terminal de despacho y control operativo del pozo. Inicia el asistente de recarga para
          seleccionar el chofer, asignar la cisterna y registrar el despacho con su cobro correspondiente.
        </p>
      </TopTerminalHeader>

      {/* 📊 MINI MÉTRICAS DEL TURNO / HOY */}
      <MetricsBar>
        <MetricItem>
          <div className="icon-box blue">
            <MdWaterDrop />
          </div>
          <div className="info">
            <span className="label">Recargas Despachadas Hoy</span>
            <span className="value">
              {cargandoMetricas ? "..." : `${metricasHoy.totalCargas} viajes`}
            </span>
          </div>
        </MetricItem>

        <MetricItem>
          <div className="icon-box cyan">
            <MdLocalShipping />
          </div>
          <div className="info">
            <span className="label">Volumen Suministrado Hoy</span>
            <span className="value">
              {cargandoMetricas ? "..." : `${metricasHoy.totalLitros.toLocaleString()} Lts`}
            </span>
          </div>
        </MetricItem>

        <MetricItem>
          <div className="icon-box green">
            <MdAttachMoney />
          </div>
          <div className="info">
            <span className="label">Cobrado de Contado</span>
            <span className="value text-green">
              {cargandoMetricas ? "..." : `$${metricasHoy.montoPagado.toFixed(2)}`}
            </span>
          </div>
        </MetricItem>

        <MetricItem>
          <div className="icon-box amber">
            <MdHourglassEmpty />
          </div>
          <div className="info">
            <span className="label">Cargado a Deuda</span>
            <span className="value text-amber">
              {cargandoMetricas ? "..." : `$${metricasHoy.montoDeuda.toFixed(2)}`}
            </span>
          </div>
        </MetricItem>
      </MetricsBar>

      <GridWrapper>
        {/* ========================================================= */}
        {/* TARJETA HERO PRINCIPAL: LANZADOR DEL MODAL DE RECARGA    */}
        {/* ========================================================= */}
        <HeroDispatchCard>
          <HeroGlowEffect />
          <HeroHeader>
            <div className="hero-icon-bubble">
              <MdWaterDrop />
            </div>
            <div>
              <h3>Despacho Rápido de Cisterna</h3>
              <p>Asistente guiado de 3 pasos: Chofer → Cisterna → Cobro y Evidencia</p>
            </div>
          </HeroHeader>

          <HeroBody>
            <p className="hero-text">
              Para registrar una nueva carga de agua en el llenadero, presiona el botón inferior. 
              El asistente te permitirá elegir el chofer, seleccionar su camión cisterna, tomar la 
              foto obligatoria en el pozo y registrar el pago en taquilla o a cuentas por cobrar.
            </p>

            <StepFlowPreview>
              <div className="step-pill">
                <span className="num">1</span>
                <span>Elegir Chofer</span>
              </div>
              <MdArrowForward className="arrow" />
              <div className="step-pill">
                <span className="num">2</span>
                <span>Elegir Cisterna</span>
              </div>
              <MdArrowForward className="arrow" />
              <div className="step-pill">
                <span className="num">3</span>
                <span>Cobro y Foto</span>
              </div>
            </StepFlowPreview>

            <BotonLanzarModal
              type="button"
              onClick={() => setModalRecargaAbierto(true)}
            >
              <MdWaterDrop className="btn-drop-icon" />
              <span>💧 Registrar Recarga de Agua</span>
            </BotonLanzarModal>
          </HeroBody>
        </HeroDispatchCard>

        {/* ========================================================= */}
        {/* PANEL LATERAL: ÚLTIMO REGISTRO E INSTRUCCIONES            */}
        {/* ========================================================= */}
        <SidebarPanel>
          {/* ÚLTIMA RECARGA REGISTRADA */}
          <LastRecordCard>
            <div className="card-top">
              <div className="title-row">
                <MdOutlineAccessTime className="clock-icon" />
                <h4>Última Recarga Registrada</h4>
              </div>
              {ultimoRegistro && (
                <span className={`status-badge ${ultimoRegistro.estatus}`}>
                  {ultimoRegistro.estatus === "pagado" ? "Pagado" : "Por Cobrar"}
                </span>
              )}
            </div>

            {cargandoUltimo ? (
              <div className="loading-state">
                <p>Cargando último despacho...</p>
              </div>
            ) : ultimoRegistro ? (
              <div className="record-details">
                <div className="record-main-stat">
                  <span className="plate-badge">
                    {ultimoRegistro.camiones?.placa || "S/P"}
                  </span>
                  <span className="amount">
                    ${Number(ultimoRegistro.monto || 0).toFixed(2)}
                  </span>
                </div>

                <div className="record-info-line">
                  <span className="lbl">Chofer:</span>
                  <strong className="val">
                    {ultimoRegistro.camiones?.chofer || "Sin Chofer"}
                    {ultimoRegistro.camiones?.cedula && ` (C.I. ${ultimoRegistro.camiones.cedula})`}
                  </strong>
                </div>

                <div className="record-info-line">
                  <span className="lbl">Capacidad:</span>
                  <span className="val">
                    💧 {Number(ultimoRegistro.camiones?.capacidad || 0).toLocaleString()} Lts
                    {ultimoRegistro.camiones?.modelo && ` • ${ultimoRegistro.camiones.modelo}`}
                  </span>
                </div>

                <div className="record-info-line">
                  <span className="lbl">Método de Cobro:</span>
                  <span className="val">
                    {ultimoRegistro.metodo || "Efectivo"}
                    {ultimoRegistro.referencia && ` (Ref: ${ultimoRegistro.referencia})`}
                  </span>
                </div>

                <div className="record-footer">
                  <MdOutlineAccessTime />
                  <span>
                    {new Date(ultimoRegistro.fecha_carga).toLocaleDateString("es-VE", {
                      day: "2-digit",
                      month: "short",
                    })}{" "}
                    -{" "}
                    {new Date(ultimoRegistro.fecha_carga).toLocaleTimeString("es-VE", {
                      hour: "2-digit",
                      minute: "2-digit",
                      hour12: true,
                    })}
                  </span>

                  {ultimoRegistro.url_foto && (
                    <span className="photo-tag" title="Foto de la cisterna registrada">
                      <MdImage /> Con foto
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="no-record">
                <MdWaterDrop className="water-ico" />
                <p>Aún no has registrado recargas en esta sesión.</p>
              </div>
            )}
          </LastRecordCard>

          {/* INSTRUCCIONES OPERATIVAS */}
          <InstructionCard>
            <div className="card-top">
              <MdInfoOutline className="info-icon" />
              <h5>Instrucciones Operativas del Pozo</h5>
            </div>
            <ul>
              <li>
                <strong>Paso 1:</strong> Selecciona el chofer de la cisterna en la cuadrícula o registra uno nuevo si es su primera vez.
              </li>
              <li>
                <strong>Paso 2:</strong> Elige la unidad cisterna que cargará agua o vincúlala si ya está en el sistema.
              </li>
              <li>
                <strong>Paso 3 (Obligatorio):</strong> Como registrador del llenadero, debes tomar o adjuntar la foto de la cisterna en el pozo.
              </li>
              <li>
                <strong>Paso 4:</strong> Si paga de contado (Efectivo en taquilla, Pago Móvil o Transferencia), márcalo como Pagado; si es a crédito, márcalo como Cargar como Deuda.
              </li>
            </ul>
          </InstructionCard>
        </SidebarPanel>
      </GridWrapper>

      {/* 💧 MODAL OFICIAL DE RECARGA (EL MISMO DEL ADMINISTRADOR) */}
      <ModalRegistrarRecarga
        isOpen={modalRecargaAbierto}
        onClose={() => setModalRecargaAbierto(false)}
        onRecargaExitosa={handleRecargaCompletada}
      />
    </Container>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC TERMINAL
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-out;
  padding-bottom: 40px;

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: translateY(6px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const TopTerminalHeader = styled.div`
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.12), rgba(0, 114, 255, 0.08));
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 20px;
  padding: 24px 28px;
  margin-bottom: 24px;
  position: relative;
  overflow: hidden;

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
    border: 1px solid rgba(0, 195, 255, 0.35);
  }

  h2 {
    color: #ffffff;
    font-size: 26px;
    font-weight: 800;
    margin: 0 0 6px 0;
    letter-spacing: -0.5px;
  }

  p {
    color: #94a3b8;
    font-size: 14px;
    line-height: 1.5;
    margin: 0;
    max-width: 800px;
  }
`;

const MetricsBar = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const MetricItem = styled.div`
  background: rgba(21, 28, 45, 0.65);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(0, 195, 255, 0.3);
    transform: translateY(-2px);
  }

  .icon-box {
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
      color: #38bdf8;
      border: 1px solid rgba(0, 195, 255, 0.3);
    }
    &.cyan {
      background: rgba(6, 182, 212, 0.15);
      color: #06b6d4;
      border: 1px solid rgba(6, 182, 212, 0.3);
    }
    &.green {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    &.amber {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
  }

  .info {
    display: flex;
    flex-direction: column;
    min-width: 0;

    .label {
      font-size: 11px;
      color: #94a3b8;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .value {
      font-size: 18px;
      font-weight: 800;
      color: #f8fafc;
      margin-top: 2px;

      &.text-green {
        color: #22c55e;
      }
      &.text-amber {
        color: #f59e0b;
      }
    }
  }
`;

const GridWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 24px;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const HeroDispatchCard = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 20px;
  padding: 32px 28px;
  box-shadow: 0 12px 35px rgba(0, 0, 0, 0.35);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
`;

const HeroGlowEffect = styled.div`
  position: absolute;
  top: -50px;
  right: -50px;
  width: 250px;
  height: 250px;
  background: radial-gradient(circle, rgba(0, 195, 255, 0.15) 0%, transparent 70%);
  pointer-events: none;
`;

const HeroHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 24px;
  position: relative;
  z-index: 1;

  .hero-icon-bubble {
    width: 60px;
    height: 60px;
    border-radius: 18px;
    background: linear-gradient(135deg, rgba(0, 195, 255, 0.3), rgba(0, 114, 255, 0.3));
    border: 1px solid rgba(0, 195, 255, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 32px;
    color: #38bdf8;
    box-shadow: 0 0 25px rgba(0, 195, 255, 0.3);
    flex-shrink: 0;
  }

  h3 {
    font-size: 22px;
    font-weight: 800;
    color: #ffffff;
    margin: 0 0 4px 0;
    letter-spacing: -0.3px;
  }

  p {
    color: #94a3b8;
    font-size: 13px;
    margin: 0;
  }
`;

const HeroBody = styled.div`
  position: relative;
  z-index: 1;

  .hero-text {
    color: #cbd5e1;
    font-size: 14px;
    line-height: 1.6;
    margin-bottom: 24px;
  }
`;

const StepFlowPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(11, 15, 25, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 14px 18px;
  margin-bottom: 28px;
  overflow-x: auto;

  .step-pill {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #f8fafc;
    font-size: 13px;
    font-weight: 600;
    white-space: nowrap;

    .num {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      background: rgba(0, 195, 255, 0.2);
      color: #38bdf8;
      border: 1px solid rgba(0, 195, 255, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 800;
    }
  }

  .arrow {
    color: #64748b;
    font-size: 16px;
    flex-shrink: 0;
  }
`;

const BotonLanzarModal = styled.button`
  width: 100%;
  padding: 18px 24px;
  border-radius: 14px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  font-size: 16px;
  font-weight: 800;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 8px 25px rgba(0, 195, 255, 0.35);
  transition: all 0.25s ease;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 30px rgba(0, 195, 255, 0.5);
    background: linear-gradient(135deg, #1ad0ff 0%, #0080ff 100%);
  }

  &:active {
    transform: translateY(0);
  }

  .btn-drop-icon {
    font-size: 22px;
    animation: dropBounce 2s infinite ease-in-out;
  }

  @keyframes dropBounce {
    0%, 100% {
      transform: translateY(0);
    }
    50% {
      transform: translateY(-3px);
    }
  }
`;

const SidebarPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const LastRecordCard = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);

  .card-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    .title-row {
      display: flex;
      align-items: center;
      gap: 8px;

      .clock-icon {
        color: #00c3ff;
        font-size: 18px;
      }

      h4 {
        margin: 0;
        font-size: 15px;
        font-weight: 700;
        color: #ffffff;
      }
    }

    .status-badge {
      font-size: 11px;
      font-weight: 700;
      padding: 3px 10px;
      border-radius: 20px;

      &.pagado {
        background: rgba(34, 197, 94, 0.15);
        color: #22c55e;
        border: 1px solid rgba(34, 197, 94, 0.3);
      }

      &.pendiente {
        background: rgba(245, 158, 11, 0.15);
        color: #f59e0b;
        border: 1px solid rgba(245, 158, 11, 0.3);
      }
    }
  }

  .record-main-stat {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 14px;

    .plate-badge {
      background: rgba(0, 195, 255, 0.15);
      border: 1px solid rgba(0, 195, 255, 0.35);
      color: #38bdf8;
      font-size: 16px;
      font-weight: 800;
      padding: 5px 12px;
      border-radius: 8px;
      letter-spacing: 0.5px;
    }

    .amount {
      font-size: 22px;
      font-weight: 800;
      color: #22c55e;
    }
  }

  .record-info-line {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 13px;
    margin-bottom: 8px;

    .lbl {
      color: #94a3b8;
    }

    .val {
      color: #f8fafc;
      font-weight: 600;
      text-align: right;
    }
  }

  .record-footer {
    margin-top: 14px;
    padding-top: 10px;
    border-top: 1px dashed rgba(255, 255, 255, 0.08);
    display: flex;
    align-items: center;
    justify-content: space-between;
    color: #64748b;
    font-size: 12px;

    .photo-tag {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      color: #38bdf8;
      background: rgba(0, 195, 255, 0.1);
      padding: 2px 8px;
      border-radius: 6px;
      font-size: 11px;
    }
  }

  .loading-state,
  .no-record {
    text-align: center;
    padding: 30px 15px;
    color: #64748b;

    .water-ico {
      font-size: 36px;
      color: rgba(0, 195, 255, 0.4);
      margin-bottom: 8px;
    }

    p {
      margin: 0;
      font-size: 13px;
    }
  }
`;

const InstructionCard = styled.div`
  background: rgba(21, 28, 45, 0.5);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 18px;
  padding: 20px;

  .card-top {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;

    .info-icon {
      color: #38bdf8;
      font-size: 18px;
    }

    h5 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
      color: #f8fafc;
    }
  }

  ul {
    margin: 0;
    padding-left: 18px;
    color: #94a3b8;
    font-size: 12.5px;
    line-height: 1.6;

    li {
      margin-bottom: 8px;

      strong {
        color: #cbd5e1;
      }

      &:last-child {
        margin-bottom: 0;
      }
    }
  }
`;
