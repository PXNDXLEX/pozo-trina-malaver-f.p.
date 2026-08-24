import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import { jsPDF } from "jspdf";
import styled from "styled-components";

export function FormularioVentas({ OnVentaRealizada }) {
  const user = useAuthStore((state) => state.user);

  // Estados dinámicos vinculados a tus campos visuales
  const [listaCamiones, setListaCamiones] = useState([]);
  const [camionSeleccionadoId, setCamionSeleccionadoId] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("Efectivo");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    buscarCamionesAsignados();
  }, [user]);

  const buscarCamionesAsignados = async () => {
    if (!user || !user.id) return;

    try {
      let query = supabase.from("camiones").select("id, chofer, placa");

      // Si ingresa un camionero, ve solo su unidad. Si es Admin/Registrador, ve todos.
      if (user.role === "camionero") {
        query = query.eq("perfil_id", user.id);
      } else {
        query = query.order("chofer", { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setListaCamiones(data);
      }
    } catch (err) {
      console.error("Error al cargar camiones:", err.message);
    }
  };

  // Generador de comprobante PDF optimizado tipo Ticket
  const generarComprobantePDF = (camion, montoPago, metodoPago, fecha) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 150] });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("POZO TRINA MALAVER F.P.", 40, 12, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Comprobante de Recarga Digital", 40, 17, { align: "center" });
    doc.text("---------------------------------------------------------", 40, 22, { align: "center" });

    doc.setFontSize(9);
    doc.text(`Fecha: ${fecha.toLocaleDateString()}  Hora: ${fecha.toLocaleTimeString()}`, 5, 28);
    
    doc.setFont("helvetica", "bold");
    doc.text("Chofer:", 5, 36);
    doc.setFont("helvetica", "normal");
    doc.text(`${camion?.chofer || "No Especificado"}`, 20, 36);

    doc.setFont("helvetica", "bold");
    doc.text("Placa Unidad:", 5, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${camion?.placa || "No Especificado"}`, 28, 42);

    doc.text("---------------------------------------------------------", 40, 48, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.text("Método de Pago:", 5, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`${metodoPago}`, 33, 55);

    doc.setFillColor(240, 240, 240);
    doc.rect(4, 62, 72, 12, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL PAGADO:", 8, 70);
    doc.text(`$${montoPago}`, 72, 70, { align: "right" });

    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("¡Gracias por su pago! Recarga autorizada.", 40, 85, { align: "center" });

    doc.save(`Ticket_Recarga_${camion?.placa || "unidad"}.pdf`);
  };

  const handleGuardarVenta = async (e) => {
    e.preventDefault();
    if (!camionSeleccionadoId) return alert("Por favor, seleccione un camión.");
    setLoading(true);

    const camionActual = listaCamiones.find((c) => c.id === camionSeleccionadoId);
    const fechaActual = new Date();

    try {
      const { error } = await supabase.from("registros_carga").insert([
        {
          camion_id: camionSeleccionadoId,
          monto: Number(monto),
          metodo: metodo,
          fecha_carga: fechaActual.toISOString(),
        },
      ]);

      if (error) throw error;

      generarComprobantePDF(camionActual, monto, metodo, fechaActual);
      alert("¡Venta registrada con éxito y ticket generado!");
      
      setMonto("");
      setCamionSeleccionadoId("");

      // Ejecuta la redirección automática a la lista del día que programamos antes
      if (typeof OnVentaRealizada === "function") {
        OnVentaRealizada();
      }

    } catch (error) {
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer onSubmit={handleGuardarVenta}>
      <div className="input-group">
        <label>Seleccione el Camión</label>
        <select
          value={camionSeleccionadoId}
          onChange={(e) => setCamionSeleccionadoId(e.target.value)}
          required
        >
          <option value="">Seleccione...</option>
          {listaCamiones.map((item) => (
            <option key={item.id} value={item.id}>
              {item.chofer} ({item.placa})
            </option>
          ))}
        </select>
      </div>

      <div className="input-group">
        <label>Monto Pagado ($)</label>
        <input
          type="number"
          step="0.01"
          placeholder="Ej: 10.50"
          value={monto}
          onChange={(e) => setMonto(e.target.value)}
          required
        />
      </div>

      <div className="input-group">
        <label>Método de Pago</label>
        <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
          <option value="Efectivo">Efectivo</option>
          <option value="Transferencia">Transferencia</option>
          <option value="Pago Móvil">Pago Móvil</option>
          <option value="Zelle">Zelle</option>
        </select>
      </div>

      <button type="submit" className="btn-submit" disabled={loading}>
        {loading ? "Procesando..." : "Guardar Venta"}
      </button>
    </FormContainer>
  );
}

// Estilos CSS exactos clonados de tu captura de pantalla
const FormContainer = styled.form`
  width: 100%;
  max-width: 800px;
  display: flex;
  flex-direction: column;
  gap: 25px;

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;

    label {
      color: #888;
      font-size: 14px;
    }

    input, select {
      width: 100%;
      padding: 14px;
      background-color: #1a1a1a;
      border: 1px solid #2a2a2a;
      border-radius: 6px;
      color: #fff;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s;

      &:focus {
        border-color: #00c3ff;
      }
    }
  }

  .btn-submit {
    width: 100%;
    padding: 14px;
    background-color: #00c3ff;
    color: #000;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: background-color 0.2s;

    &:hover {
      background-color: #0099cc;
    }

    &:disabled {
      background-color: #444;
      color: #888;
      cursor: not-allowed;
    }
  }
`;
