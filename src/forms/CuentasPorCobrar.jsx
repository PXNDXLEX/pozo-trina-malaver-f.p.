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
  const [referencia, setReferencia] = useState("");
  const [loading, setLoading] = useState(false);

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
        camiones!inner ( placa, chofer, perfil_id )
      `); // 📌 NOTA: Agregamos !inner para poder filtrar por los campos del camión anidado

    if (user.role === "camionero") {
      
        queryBuilder = queryBuilder
        .eq("estatus", "pendiente")
        .eq("camiones.codigo_chofer", user.password || user.id); 
    } else {
      // 2. El administrador ve todo lo pendiente y por conciliar global
      queryBuilder = queryBuilder.in("estatus", ["pendiente", "por_conciliar"]);
    }

    const { data, error } = await queryBuilder.order("fecha_carga", { ascending: false });

    if (error) throw error;

    // 3. Ya no necesitamos la línea de .filter() que causaba el error de borrado de datos.
    // Seteamos directamente la data que viene filtrada limpia desde Supabase.
    setDeudas(data || []);

  } catch (error) {
    console.error("Error al cargar deudas:", error.message);
    alert("Error al cargar deudas: " + error.message);
  } finally {
    setLoading(false);
  }
};

        // 📌 NUEVA FUNCIÓN: Se ejecuta cuando el camionero envía el formulario
const handleCamioneroReportaLote = async () => {
  if (deudas.length === 0) return;

  if (metodoPago !== "Efectivo" && !referencia.trim()) {
    alert("Por favor, ingrese el número de referencia para que el administrador valide su pago.");
    return;
  }

  setLoading(true);
  const uuidReporte = crypto.randomUUID();
  
  // Extraemos todos los IDs de las deudas del camionero en pantalla
  const idsDeudas = deudas.map(d => d.id);

  try {
    const { error } = await supabase
      .from("registros_carga")
      .update({
        estatus: "por_conciliar", // 📌 ESTATUS TEMPORAL DE REVISIÓN
        metodo: metodoPago,
        referencia: metodoPago !== "Efectivo" ? referencia.trim() : null,
        pago_id: uuidReporte // Vincula las deudas a un mismo reporte temporal
      })
      .in("id", idsDeudas);

    if (error) throw error;

    alert("¡Pago reportado con éxito! Espere a que el administrador verifique la transacción.");
    setReferencia("");
    cargarDeudasPendientes(); // Recarga la lista (ahora saldrá vacía porque ya no están en 'pendiente')
  } catch (error) {
    alert("Error al reportar el pago: " + error.message);
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
                    <th style={{ padding: "12px" }}>Estado</th>
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
                      <td style={{ padding: "12px" }}>
  {d.estatus === "por_conciliar" ? (
    <span style={{ background: "#fbbf24", color: "#000", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "bold" }}>
      🔍 Revisar {d.metodo}: Ref {d.referencia || "N/A"}
    </span>
  ) : (
    <span style={{ background: "#334155", color: "#94a3b8", padding: "4px 8px", borderRadius: "4px", fontSize: "12px" }}>
      ⚠️ Crédito Activo
    </span>
  )}
</td>
                      <td style={{ padding: "12px", fontWeight: "700", color: "#f87171", textAlign: "right" }}>${d.monto.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

       {/* LADO DERECHO CONDICIONAL 1: VISTA OPERATIVA PARA EL CAMIONERO */}
{user?.role === "camionero" && deudas.length > 0 && (
  <div style={{ display: "flex", flexDirection: "column", gap: "15px" }}>
    
    {/* Resumen de Total a Pagar */}
    <div style={{ background: "#111827", padding: "24px", borderRadius: "16px", border: "1px solid #1f2937", height: "fit-content" }}>
      <h3 style={{ margin: "0 0 16px 0", borderBottom: "1px solid #334155", paddingBottom: "10px", fontSize: "16px", fontWeight: "600" }}>Resumen de Cuenta</h3>
      <p style={{ fontSize: "14px", color: "#94a3b8", margin: "0 0 8px 0" }}>Total viajes pendientes: <strong style={{ color: "#fff" }}>{deudas.length}</strong></p>
      <p style={{ fontSize: "22px", fontWeight: "700", color: "#ef4444", margin: "0 0 20px 0", display: "flex", alignItems: "center", gap: "8px" }}>
        <MdAttachMoney />Total a Pagar: {deudas.reduce((sum, d) => sum + d.monto, 0).toFixed(2)}
      </p>
    </div>

    {/* 📌 NUEVO: Formulario para que el Camionero reporte su pago */}
    <div style={{ background: "#111827", padding: "24px", borderRadius: "16px", border: "1px solid #1f2937" }}>
      <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", fontWeight: "600" }}>Reportar Pago de Deuda</h3>
      
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "15px" }}>
        <label style={{ fontSize: "13px", color: "#e2e8f0" }}>Método con el que pagaste:</label>
        <select
          value={metodoPago}
          onChange={(e) => {
            setMetodoPago(e.target.value);
            if (e.target.value === "Efectivo") setReferencia("");
          }}
          style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "1px solid #334155" }}
        >
          <option value="Transferencia">Transferencia Bancaria</option>
          <option value="Pago Móvil">Pago Móvil</option>
          <option value="Efectivo">Efectivo en Taquilla</option>
          <option value="Zelle">Zelle</option>
        </select>
      </div>

      {metodoPago !== "Efectivo" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "15px" }}>
          <label style={{ fontSize: "13px", color: "#e2e8f0" }}>Número de Referencia:</label>
          <input
            type="text"
            value={referencia}
            onChange={(e) => setReferencia(e.target.value)}
            placeholder="Ej: 00123456"
            required
            style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "1px solid #334155", boxSizing: "border-box" }}
          />
        </div>
      )}

      <button
        type="button"
        disabled={loading}
        onClick={() => handleCamioneroReportaLote()} // Crearemos esta función en el paso 2
        style={{ width: "100%", padding: "12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer" }}
      >
        {loading ? "Enviando Reporte..." : "📩 Reportar Pago al Administrador"}
      </button>
    </div>

    {/* Datos de Transferencia del Pozo (Tus datos bancarios originales) */}
    <div style={{ background: "#1e293b", padding: "15px", borderRadius: "8px", border: "1px solid #334155", fontSize: "13px", color: "#fff" }}>
      <strong style={{ display: "block", marginBottom: "6px" }}>Cuentas del Pozo para Transferir:</strong>
      Banco de Venezuela<br/>
      Cuenta: 0102-XXXX-XX-XXXXXXXXXX<br/>
      RIF: J-XXXXXXXX-X<br/>
      Pago Móvil: 0414-XXXXXXX
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
                 onChange={(e) => {
               setMetodoPago(e.target.value);
                 if (e.target.value === "Efectivo") setReferencia(""); 
                }}
                
                style={{ width: "100%", padding: "10px 12px", borderRadius: "8px", background: "#0f172a", color: "#fff", border: "1px solid #334155", fontSize: "14px", outline: "none" }}
              >
                <option value="Transferencia">Transferencia Bancaria</option>
                <option value="Pago Móvil">Pago Móvil</option>
                <option value="Efectivo">Efectivo</option>
                <option value="Zelle">Zelle</option>
              </select>
            </div>
                {metodoPago !== "Efectivo" && (
             <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "20px" }}>
            <label style={{ fontSize: "13px", fontWeight: "500", color: "#e2e8f0" }}>Número de Referencia:</label>
             <input
               type="text"
                value={referencia}
               onChange={(e) => setReferencia(e.target.value)}
               placeholder="Ej: 00123456"
              required
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: "8px",
               background: "#0f172a",
                color: "#fff",
              border: "1px solid #334155",
              boxSizing: "border-box"
              }}
              />
             </div>
              )}
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

