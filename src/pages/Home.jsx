import React, { useEffect, useState } from "react";
import { MenuTemplate } from "../templates/MenuTemplate";
import { supabase } from "../supabase/supabase.config";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from "recharts";
import styled from "styled-components";

export function Home() {
  const [dataBarras, setDataBarras] = useState([]);
  const [dataLineas, setDataLineas] = useState([]);
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

      // -------------------------------------------------------------
      // 1. AGRUPAR PARA EL GRÁFICO DE BARRAS (Un camión = Una barra)
      // -------------------------------------------------------------
      const acumuladorCamiones = {};
      // 🔴 NUEVO: Acumulador para agrupar las ventas por fecha única
      const acumuladorFechas = {};

      data.forEach((item) => {
        // --- Procesar Camiones ---
        const nombreCamion = item.camiones 
          ? `${item.camiones.chofer.trim()} (${item.camiones.placa.trim()})` 
          : "Desconocido";

        const montoNumerico = Number(item.monto) || 0;

        if (acumuladorCamiones[nombreCamion]) {
          acumuladorCamiones[nombreCamion] += montoNumerico;
        } else {
          acumuladorCamiones[nombreCamion] = montoNumerico;
        }

        // --- Procesar Fechas (Evita que se encimen los puntos en la línea) ---
        const fechaLimpia = item.fecha_carga ? item.fecha_carga.substring(0, 10) : "Sin fecha";
        
        if (acumuladorFechas[fechaLimpia]) {
          acumuladorFechas[fechaLimpia] += montoNumerico; // Suma todas las ventas del mismo día
        } else {
          acumuladorFechas[fechaLimpia] = montoNumerico;
        }
      });

      // Convertimos el acumulador de camiones a formato Recharts
      const formatoBarras = Object.keys(acumuladorCamiones).map((key) => ({
        camionIdentificador: key,
        montoTotal: acumuladorCamiones[key],
      }));

      // 🔴 NUEVO: Convertimos el acumulador de fechas ordenadas a formato Recharts
      const formatoLineas = Object.keys(acumuladorFechas).map((fecha) => ({
        fecha: fecha,
        monto: acumuladorFechas[fecha], // Ahora este valor será la suma total del día (ej: 4200)
      }));

      // Guardamos los datos limpios y agrupados en sus respectivos estados
      setDataBarras(formatoBarras);
      setDataLineas(formatoLineas);

    } catch (error) {
      console.error("Error al cargar analíticas en Recharts:", error.message);
    } finally {
      setLoading(false);
    }
  };


  return (
    <MenuTemplate>
      <DashboardContainer>
        <h2>📊 Dashboard del Pozo - Ventas de Recargas</h2>
        <p className="subtitle">Monitoreo operativo y financiero en tiempo real </p>

        {loading ? (
          <div className="loading-box">Cargando analíticas del sistema...</div>
        ) : (
          <div className="grid-charts">
            
            {/* Gráfico 1: Barras Consolidadas */}
            <div className="chart-box">
              <h3>Ingresos según Camión / Chofer</h3>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={dataBarras}
                margin={{ top: 10, right: 10, left: 10, bottom: 45 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="camionIdentificador" stroke="#888" angle={-40} 
                  textAnchor="end"   height={70} interval={0} tick={{ fontSize: 11 , fill: '#888'}} />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#222", border: "none", color: "#fff" }} />
                  <Legend wrapperStyle={{ paddingTop: 20 }} />
                  <Bar name="Monto Acumulado ($)" dataKey="montoTotal" fill="#00a8ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico 2: Líneas Temporal */}
            <div className="chart-box">
              <h3>Historial Dinámico de Ingresos</h3>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={dataLineas}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                  <XAxis dataKey="fecha" stroke="#888" tick={{ fontSize: 11 }} />
                  <YAxis stroke="#888" />
                  <Tooltip contentStyle={{ backgroundColor: "#222", border: "none", color: "#fff" }} />
                  <Legend />
                  <Line name="Evolución ($)" type="monotone" dataKey="monto" stroke="#00e676" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>

          </div>
        )}
      </DashboardContainer>
    </MenuTemplate>
  );
}

const DashboardContainer = styled.div`
  padding: 30px;
  color: white;
  .subtitle { color: #888; margin-bottom: 30px; font-size: 14px; }
  .loading-box { color: #888; text-align: center; padding: 50px; font-size: 16px; }
  .grid-charts { display: grid; grid-template-columns: repeat(auto-fit, minmax(450px, 1fr)); gap: 25px; }
  .chart-box {
    background: #1a1a1a;
    padding: 25px;
    border-radius: 8px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.4);
    h3 { margin-bottom: 20px; font-size: 15px; color: #e0e0e0; border-left: 4px solid #00a8ff; padding-left: 10px; }
  }
`;
