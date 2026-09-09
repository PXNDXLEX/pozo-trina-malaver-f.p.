import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store/AuthStore";
import { supabase } from "../supabase/supabase.config";
import { MdReceipt, MdCheckCircle, MdAttachMoney } from "react-icons/md";
import { MenuTemplate } from "../templates/MenuTemplate";
import styled from "styled-components";


export function CuentasPorCobrar() {
  const user = useAuthStore((state) => state.user);
  const [deudas, setDeudas] = useState([]);
  const [deudasSeleccionadas, setDeudasSeleccionadas] = useState([]);
  const [metodoPago, setMetodoPago] = useState("Transferencia");
  const [loading, setLoading] = useState(false);

      const cargarDeudasPendientes = async () => {
    if (!user || !user.id) return;

    try {
      // Creamos la consulta base hacia registros_carga
      let query = supabase
        .from("registros_carga")
        .select(`
          id,
          monto,
          fecha_carga,
          url_foto,
          camiones (
            placa,
            chofer,
            perfil_id
          )
        `)
        .eq("estatus", "pendiente");

      // 🔍 ¡AQUÍ ESTÁ EL TRUCO! 
      // Si el usuario es un camionero, filtramos en la base de datos para que traiga SOLO sus deudas
      if (user.role === "camionero") {
        query = query.eq("camiones.perfil_id", user.id);
      } else {
        // Si es administrador, las ordena por fecha para gestionarlas mejor
        query = query.order("fecha_carga", { ascending: false });
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Filtrado de seguridad en el frontend por si las relaciones anidadas traen nulos
      if (data) {
        if (user.role === "camionero") {
          const deudasPropias = data.filter(d => d.camiones && d.camiones.perfil_id === user.id);
          setDeudas(deudasPropias);
        } else {
          setDeudas(data);
        }
      }
    } catch (err) {
      console.error("Error al cargar deudas:", err.message);
    }
  };


  useEffect(() => {
    cargarDeudasPendientes();
  }, []);

  // 2. Controlar la selección de checkboxes en la tabla
  const handleToggleSeleccion = (id) => {
    if (deudasSeleccionadas.includes(id)) {
      setDeudasSeleccionadas(deudasSeleccionadas.filter((item) => item !== id));
    } else {
      setDeudasSeleccionadas([...deudasSeleccionadas, id]);
    }
  };

  // 3. Liquidar el lote de deudas seleccionadas con un solo pago_id
  const handleLiquidarLote = async () => {
    if (deudasSeleccionadas.length === 0) return;
    setLoading(true);

    const uuidPagoAgrupado = crypto.randomUUID(); // Identificador único de la transferencia

    try {
      const { error } = await supabase
        .from("registros_carga")
        .update({
          estatus: "pagado",
          metodo: metodoPago,
          pago_id: uuidPagoAgrupado
        })
        .in("id", deudasSeleccionadas); // Actualiza todas las deudas marcadas en un solo bloque

      if (error) throw error;

      alert("¡Deudas liquidadas con éxito! El lote ha sido conciliado.");
      setDeudasSeleccionadas([]);
      cargarDeudasPendientes(); // Recarga la tabla limpia
    } catch (err) {
      alert("Error al procesar la liquidación: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Cálculos matemáticos en tiempo real para el panel lateral
  const totalALiquidar = deudas
    .filter((d) => deudasSeleccionadas.includes(d.id))
    .reduce((sum, d) => sum + d.monto, 0);
  return (
    <MenuTemplate>
    <div style={{ padding: "30px", background: "#0f172a", minHeight: "100vh", color: "#fff" }}>
      {/* CABECERA DEL MÓDULO */}
      <div style={{ marginBottom: "25px", display: "flex", alignItems: "center", gap: "12px" }}>
        <div style={{ width: "48px", height: "48px", background: "rgba(245, 158, 11, 0.15)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: "12px", display: "flex", alignItems: "center", fontSize: "24px", color: "#f59e0b", justifyContent: "center" }}>
          <MdReceipt />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: "22px", fontWeight: "700" }}>
            {user?.role === "camionero" ? "Mis Cuentas por Pagar (Mis Deudas)" : "Cuentas por Cobrar (Control de Deudas)"}
          </h2>
          <p style={{ margin: 0, color: "#94a3b8", fontSize: "13px" }}>
            {user?.role === "camionero" 
              ? "Visualiza tus viajes pendientes por pagar. Reporta el pago al administrador." 
              : "Selecciona los viajes pendientes del camionero para conciliarlos en un solo pago."}
          </p>
        </div>
      </div>

      {/* DISEÑO EN CUADRÍCULA DINÁMICA */}
      <div style={{ display: "grid", gridTemplateColumns: (deudasSeleccionadas.length > 0 || user?.role === "camionero") ? "2fr 1fr" : "1fr", gap: "25px" }}>
        
        {/* LADO IZQUIERDO: LISTADO DE VIAJES PENDIENTES */}
        <div style={{ background: "rgba(30, 41, 59, 0.7)", backdropFilter: "blur(12px)", border: "1px solid rgba(255, 255, 255, 0.1)", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 30px rgba(0, 0, 0, 0.4)" }}>
          {deudas.length === 0 ? (
            <p style={{ textAlign: "center", color: "#94a3b8", margin: "20px 0" }}>🎉 ¡Excelente! No tienes deudas pendientes registradas en el sistema.</p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
                <thead>
                  <tr style={{ borderBottom: "2px solid #334155", color: "#94a3b8" }}>
                    {/* Solo el Admin ve la columna de checkboxes para Cobrar */}
                    {user?.role !== "camionero" && <th style={{ padding: "12px", width: "80px", textAlign: "center" }}>Cobrar</th>}
                    <th style={{ padding: "12px" }}>Placa</th>
                    <th style={{ padding: "12px" }}>Chofer / Camionero</th>
                    <th style={{ padding: "12px" }}>Fecha y Hora del Viaje</th>
                    <th style={{ padding: "12px", textAlign: "right" }}>Monto de Deuda</th>
                  </tr>
                </thead>
                <tbody>
                  {deudas.map((d) => (
                    <tr 
                      key={d.id} 
                      style={{ 
                        borderBottom: "1px solid #1e293b", 
                        background: deudasSeleccionadas.includes(d.id) ? "rgba(37, 99, 235, 0.15)" : "transparent",
                        transition: "background 0.2s"
                      }}
                    >
                      {/* Checkbox condicional: Excluido para camioneros */}
                      {user?.role !== "camionero" && (
                        <td style={{ padding: "12px", textAlign: "center" }}>
                          <input 
                            type="checkbox" 
                            checked={deudasSeleccionadas.includes(d.id)} 
                            onChange={() => handleToggleSeleccion(d.id)}
                            style={{ width: "16px", height: "16px", cursor: "pointer", accentColor: "#3b82f6" }}
                          />
                        </td>
                      )}
                      <td style={{ padding: "12px", fontWeight: "700", color: "#38bdf8" }}>{d.camiones?.placa}</td>
                      <td style={{ padding: "12px", color: "#e2e8f0" }}>{d.camiones?.chofer}</td>
                      <td style={{ padding: "12px", color: "#94a3b8", fontSize: "13px" }}>{new Date(d.fecha_carga).toLocaleString()}</td>
                      <td style={{ padding: "12px", fontWeight: "700", color: "#f87171", textAlign: "right" }}>${d.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* LADO DERECHO CONDICIONAL 1: VISTA INFORMATIVA DE BANCOS PARA EL CAMIONERO */}
        {user?.role === "camionero" && deudas.length > 0 && (
          <div style={{ background: "#111827", padding: "24px", borderRadius: "16px", border: "1px solid #1f2937", height: "fit-content" }}>
            <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid #334155", paddingBottom: "10px", fontSize: "16px", fontWeight: "600", color: "#f3f4f6" }}>Resumen de Deuda</h3>
            <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 8px 0" }}>Total viajes pendientes: <strong style={{ color: "#fff" }}>{deudas.length}</strong></p>
            <p style={{ fontSize: "22px", fontWeight: "700", color: "#ef4444", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: "4px" }}>
              <MdAttachMoney />Total a Pagar: {deudas.reduce((sum, d) => sum + d.monto, 0).toFixed(2)}
            </p>
            
            <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px", border: "1px solid #334155", fontSize: "13px", color: "#94a3b8", lineHeight: "1.6" }}>
              <strong style={{ color: "#fff", display: "block", marginBottom: "6px" }}>🏦 Datos de Transferencia:</strong>
              • Banco: <strong>Banco de Venezuela</strong><br />
              • Cuenta: <strong>0102-XXXX-XX-XXXXXXXXXX</strong><br />
              • RIF: <strong>J-XXXXXXXX-X</strong><br />
              • Pago Móvil: <strong>0414-XXXXXXX</strong><br />
              <span style={{ display: "block", marginTop: "10px", color: "#f59e0b", fontStyle: "italic" }}>
                *Una vez hecha la transferencia, envía el capture al administrador para liquidar tu cuenta.
              </span>
            </div>
          </div>
        )}

        {/* LADO DERECHO CONDICIONAL 2: PANEL DE CONTROL DE COBROS PARA EL ADMINISTRADOR */}
        {user?.role !== "camionero" && deudasSeleccionadas.length > 0 && (
          <div style={{ background: "#111827", padding: "24px", borderRadius: "16px", border: "1px solid #1f2937", height: "fit-content" }}>
            <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid #334155", paddingBottom: "10px", fontSize: "16px", fontWeight: "600", color: "#f3f4f6" }}>Recibo de Liquidación</h3>
            
            <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 8px 0" }}>Viajes seleccionados: <strong style={{ color: "#fff" }}>{deudasSeleccionadas.length}</strong></p>
            <p style={{ fontSize: "22px", fontWeight: "700", color: "#4ade80", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: "4px" }}><MdAttachMoney />Total Cobrado: {totalALiquidar.toFixed(2)}</p>

            <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
              <label style={{ fontSize: "13px", fontWeight: "500", color: "#e2e8f0" }}>💳 Método de Pago Recibido:</label>
              <select 
                value={metodoPago} 
                onChange={(e) => setMetodoPago(e.target.value)}
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "1px solid #334155", fontSize: "14px", outline: "none" }}
              >
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Zelle">Zelle</option>
              </select>
            </div>

            <button 
              onClick={handleLiquidarLote}
              disabled={loading}
              style={{ width: "100%", padding: "12px", background: "#10b981", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", fontSize: "15px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}
            >
              <MdCheckCircle style={{ fontSize: "18px" }} />
              {loading ? "Conciliando..." : "Registrar Pago de Lote"}
            </button>
          </div>
        )}

      </div>
    </div>
    </MenuTemplate>
  );
}


// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC FORM FOR RECARGAS
const FormContainer = styled.div`
  max-width: 650px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-out;
`;

const HeaderGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  h2 {
    font-size: 22px;
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
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.2), rgba(0, 114, 255, 0.2));
  border: 1px solid rgba(0, 195, 255, 0.3);
  color: #00c3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const FormCard = styled.form`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  @media (max-width: 600px) {
    padding: 20px;
  }
`;

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
`;

const FieldBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 13px;
    font-weight: 500;
    color: #cbd5e1;
    display: flex;
    align-items: center;
    gap: 6px;

    .field-icon {
      color: #00c3ff;
      font-size: 16px;
    }
  }

  input, select {
    width: 100%;
    padding: 13px 14px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #ffffff;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:focus {
      border-color: #00c3ff;
      background: rgba(15, 23, 42, 0.85);
      box-shadow: 0 0 12px rgba(0, 195, 255, 0.25);
    }
  }

  select {
    cursor: pointer;
    option {
      background: #151c2c;
      color: #ffffff;
    }
  }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 195, 255, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 195, 255, 0.45);
  }

  &:disabled {
    background: #334155;
    color: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

