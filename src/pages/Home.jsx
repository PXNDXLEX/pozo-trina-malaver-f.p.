import React, { useEffect, useState } from "react";
import { MenuTemplate } from "../templates/MenuTemplate";
import { supabase } from "../supabase/supabase.config";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Legend
} from "recharts";
import styled from "styled-components";
import { MdTrendingUp, MdAttachMoney, MdLocalShipping } from "react-icons/md";

export function Home() {
  const [dataBarras, setDataBarras] = useState([]);
  const [dataLineas, setDataLineas] = useState([]);
  const [metricas, setMetricas] = useState({ totalIngresos: 0, totalCargas: 0, promedio: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchVentas();
  }, []);

  const fetchVentas = async () => {
    try {
      const { data, error } = await supabase
        .from("registros_carga")
        .select(`
          monto,
          fecha_carga,
          camiones ( chofer, placa )
        `)
        .order("fecha_carga", { ascending: true });

      if (error) throw error;

      const acumuladorCamiones = {};
      const acumuladorFechas = {};
      let acumuladoGeneral = 0;

      data.forEach((item) => {
        const nombreCamion = item.camiones
          ? `${item.camiones.chofer.trim()} (${item.camiones.placa.trim()})`
          : "Desconocido";

        const montoNumerico = Number(item.monto) || 0;
        acumuladoGeneral += montoNumerico;

        if (acumuladorCamiones[nombreCamion]) {
          acumuladorCamiones[nombreCamion] += montoNumerico;
        } else {
          acumuladorCamiones[nombreCamion] = montoNumerico;
        }

        const fechaLimpia = item.fecha_carga ? item.fecha_carga.substring(0, 10) : "Sin fecha";

        if (acumuladorFechas[fechaLimpia]) {
          acumuladorFechas[fechaLimpia] += montoNumerico;
        } else {
          acumuladorFechas[fechaLimpia] = montoNumerico;
        }
      });

      const formatoBarras = Object.keys(acumuladorCamiones).map((key) => ({
        camionIdentificador: key,
        montoTotal: acumuladorCamiones[key],
      }));

      const formatoLineas = Object.keys(acumuladorFechas).map((fecha) => ({
        fecha: fecha,
        monto: acumuladorFechas[fecha],
      }));

      setDataBarras(formatoBarras);
      setDataLineas(formatoLineas);
      setMetricas({
        totalIngresos: acumuladoGeneral,
        totalCargas: data.length,
        promedio: data.length > 0 ? (acumuladoGeneral / data.length).toFixed(2) : 0,
      });
    } catch (error) {
      console.error("Error al cargar analíticas en Recharts:", error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <MenuTemplate>
      <DashboardContainer>
        <HeaderSection>
          <h2>📊 Dashboard - Pozo Trina Malaver</h2>
          <p className="subtitle">Monitoreo operativo y financiero en tiempo real</p>
        </HeaderSection>

        {loading ? (
          <LoadingBox>Cargando analíticas del sistema...</LoadingBox>
        ) : (
          <>
            {/* KPI METRIC CARDS */}
            <MetricsGrid>
              <MetricCard>
                <div className="icon-badge blue">
                  <MdAttachMoney />
                </div>
                <div className="info">
                  <span className="label">Ingresos Totales</span>
                  <h3 className="value">${metricas.totalIngresos.toLocaleString()}</h3>
                </div>
              </MetricCard>

              <MetricCard>
                <div className="icon-badge green">
                  <MdLocalShipping />
                </div>
                <div className="info">
                  <span className="label">Total Cargas / Ventas</span>
                  <h3 className="value">{metricas.totalCargas}</h3>
                </div>
              </MetricCard>

              <MetricCard>
                <div className="icon-badge purple">
                  <MdTrendingUp />
                </div>
                <div className="info">
                  <span className="label">Promedio por Carga</span>
                  <h3 className="value">${metricas.promedio}</h3>
                </div>
              </MetricCard>
            </MetricsGrid>

            {/* CHARTS GRID */}
            <GridCharts>
              <ChartBox>
                <h3>Ingresos Acumulados por Camión / Chofer</h3>
                <ResponsiveContainer width="100%" height={340}>
                  <BarChart data={dataBarras} margin={{ top: 10, right: 10, left: 10, bottom: 45 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis
                      dataKey="camionIdentificador"
                      stroke="#94a3b8"
                      angle={-35}
                      textAnchor="end"
                      height={70}
                      interval={0}
                      tick={{ fontSize: 11, fill: '#94a3b8' }}
                    />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#151c2c", borderColor: "rgba(0,195,255,0.3)", color: "#fff", borderRadius: "10px" }} />
                    <Legend wrapperStyle={{ paddingTop: 15 }} />
                    <Bar name="Monto Acumulado ($)" dataKey="montoTotal" fill="#00c3ff" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartBox>

              <ChartBox>
                <h3>Evolución Histórica de Ingresos</h3>
                <ResponsiveContainer width="100%" height={340}>
                  <LineChart data={dataLineas} margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" />
                    <XAxis dataKey="fecha" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#151c2c", borderColor: "rgba(16,185,129,0.3)", color: "#fff", borderRadius: "10px" }} />
                    <Legend />
                    <Line name="Evolución ($)" type="monotone" dataKey="monto" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} />
                  </LineChart>
                </ResponsiveContainer>
              </ChartBox>
            </GridCharts>
          </>
        )}
      </DashboardContainer>
    </MenuTemplate>
  );
}

// 🎨 STYLED COMPONENTS MODERN DASHBOARD
const DashboardContainer = styled.div`
  animation: fadeIn 0.3s ease-out;
`;

const HeaderSection = styled.div`
  margin-bottom: 24px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    color: #ffffff;
    margin-bottom: 4px;
  }

  .subtitle {
    color: #94a3b8;
    font-size: 14px;
  }
`;

const LoadingBox = styled.div`
  color: #94a3b8;
  text-align: center;
  padding: 60px;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

const MetricsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
`;

const MetricCard = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 20px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease, border-color 0.2s ease;

  &:hover {
    transform: translateY(-2px);
    border-color: rgba(0, 195, 255, 0.3);
  }

  .icon-badge {
    width: 48px;
    height: 48px;
    border-radius: 14px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;

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
  }

  .info {
    display: flex;
    flex-direction: column;

    .label {
      font-size: 13px;
      color: #94a3b8;
      font-weight: 500;
    }

    .value {
      font-size: 22px;
      font-weight: 700;
      color: #ffffff;
      margin: 2px 0 0 0;
    }
  }
`;

const GridCharts = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const ChartBox = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 24px;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);

  h3 {
    margin-bottom: 20px;
    font-size: 16px;
    font-weight: 600;
    color: #f8fafc;
    border-left: 4px solid #00c3ff;
    padding-left: 12px;
  }
`;
