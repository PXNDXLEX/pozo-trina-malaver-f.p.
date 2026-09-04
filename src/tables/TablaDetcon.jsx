import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase.config";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import styled from "styled-components";

export function TablaDetcon({ refresh }) {
  const [datos, setDatos] = useState([]);

  const consultarVentasHoy = async () => {
    const inicioHoy = new Date();
    inicioHoy.setHours(0, 0, 0, 0);

    const { data, error } = await supabase
      .from("registros_carga")
      .select(`
        id, monto, metodo, fecha_carga,
        camiones ( placa )
      `)
      .gte("fecha_carga", inicioHoy.toISOString())
      .order("fecha_carga", { ascending: false });

    if (!error) setDatos(data || []);
  };

  useEffect(() => {
    consultarVentasHoy();
  }, [refresh]);

   const generarReporteDiarioPDF = () => {
    try {
      if (!datos || datos.length === 0) {
        return alert("No hay ventas registradas el día de hoy para generar el reporte.");
      }

      // Inicializamos jsPDF
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const fechaActual = new Date().toLocaleDateString();

      // 1. Encabezado del documento
      doc.setFont("helvetica", "bold");
      doc.setFontSize(16);
      doc.text("POZO TRINA MALAVER F.P.", 14, 15);
      
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Cierre de Ventas Diario - Fecha: ${fechaActual}`, 14, 22);

      // 2. Calcular la suma total acumulada del día
      const totalDelDia = datos.reduce((sum, item) => sum + Number(item.monto || 0), 0);
      
      doc.setFont("helvetica", "bold");
      doc.text(`Total Recaudado: $${totalDelDia}`, 14, 29);
      doc.text("------------------------------------------------------------------------------------------", 14, 34);

      // 3. Organizar las filas de forma ultra-segura
      const tablaFilas = datos.map((item) => {
        let horaFormateada = "N/A";
        if (item.fecha_carga) {
          const f = new Date(item.fecha_carga);
          if (!isNaN(f.getTime())) {
            horaFormateada = f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          }
        }
        return [
          item.camiones?.placa || "N/A", 
          `$${item.monto || 0}`,
          item.metodo || "N/A",
          horaFormateada
        ];
      });

      // 4. Crear la tabla automatizada (Formato corregido para jspdf-autotable)
      autoTable(doc, {
        startY: 38,
        head: [["PLACA", "MONTO", "MÉTODO", "HORA"]],
        body: tablaFilas,
        theme: "striped",
        headStyles: { fillColor: "#1e293b", textColor: "#ffffff", fontStyle: "bold" },
        styles: { font: "helvetica", fontSize: 10, halign: "center" },
      });

      // 5. Descargar archivo
      doc.save(`Reporte_Diario_${fechaActual.replace(/\//g, "-")}.pdf`);

    } catch (error) {
      // Si algo falla, esta alerta saltará en tu pantalla diciéndonos el porqué
      alert("Error interno al crear el PDF: " + error.message);
    }
  };


  return (
    <>
      <button
        onClick={generarReporteDiarioPDF}
        style={{
          backgroundColor: "#059669", // Verde esmeralda corporativo
          color: "white",
          fontWeight: "500",
          padding: "10px 18px",
          borderRadius: "6px",
          border: "none",
          cursor: "pointer",
          marginBottom: "16px",
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px"
        }}
      >
        📊 Descargar Cierre Diario (PDF)
      </button>
    <TableContainer>
      <table>
        <thead>
          <tr>
            <th>Placa</th>
            <th>Monto ($)</th>
            <th>Método</th>
            <th>Hora</th>
          </tr>
        </thead>
        <tbody>
          {datos.length > 0 ? (
            datos.map((item) => (
              <tr key={item.id}>
                <td>{item.camiones?.placa}</td>
                <td>{item.monto}</td>
                <td>{item.metodo}</td>
                <td>{new Date(item.fecha_carga).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
              </tr>
            ))
          ) : (
            <tr><td colSpan="4">No hay ventas hoy</td></tr>
          )}
        </tbody>
      </table>
    </TableContainer>
    </>
  );
}

// Dentro de TablaDetcon.jsx, actualiza el Styled Component:
const TableContainer = styled.div`
  width: 100%;
  overflow-x: auto;

  table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0 8px; /* Crea espacio entre filas */
  }

  th {
    color: #00c8ff;
    text-align: left;
    padding: 12px 20px;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 0.85rem;
    letter-spacing: 1px;
  }

  td {
    background: rgba(255, 255, 255, 0.03);
    padding: 15px 20px;
    color: #e0e0e0; /* Blanco grisáceo para mejor lectura */
    font-size: 1rem;
    border-top: 1px solid rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);

    &:first-child {
      border-left: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px 0 0 10px;
    }
    &:last-child {
      border-right: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 0 10px 10px 0;
    }
  }

  tr:hover td {
    background: rgba(0, 200, 255, 0.1); /* Efecto al pasar el mouse */
    color: white;
  }
`;