import { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import { supabase } from "../supabase/supabase.config";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { MdSearch, MdCalendarToday, MdLocalShipping, MdAttachMoney } from "react-icons/md";

export function TablaContabilidad() {
  const [datosBase, setDatosBase] = useState([]);
  const [filtroDias, setFiltroDias] = useState(30); // Predeterminado 30 días
  const [busqueda, setBusqueda] = useState("");
  const [cargando, setCargando] = useState(false);

  const consultarSupabase = async (dias) => {
    setCargando(true);
       let query = supabase
      .from("registros_carga")
      .select(`
        monto,
        fecha_carga,
        metodo,
        camiones ( chofer, placa )
      `);

    if (dias !== 3650) {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - dias);
      query = query.gte("fecha_carga", fechaLimite.toISOString());
    }

    const { data, error } = await query;

    if (!error && data) {
      setDatosBase(data);
    }
    setCargando(false);
  };

  useEffect(() => {
    consultarSupabase(filtroDias);
  }, [filtroDias]);


  const resumenProcesado = useMemo(() => {
    const agrupado = datosBase.reduce((acc, item) => {
      const nombre = item.camiones?.chofer || "Sin Asignar";
      
      if (!acc[nombre]) {
        acc[nombre] = { nombre, totalDinero: 0, viajes: 0 };
      }
      acc[nombre].totalDinero += Number(item.monto) || 0;
      acc[nombre].viajes += 1;
      return acc;
    }, {});

    const listaFormateada = Object.values(agrupado);

    return listaFormateada.filter((chofer) =>
      chofer.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [datosBase, busqueda]);

  const totalesGenerales = useMemo(() => {
    return resumenProcesado.reduce(
      (acc, item) => {
        acc.viajes += item.viajes;
        acc.dinero += item.totalDinero;
        return acc;
      },
      { viajes: 0, dinero: 0 }
    );
  }, [resumenProcesado]);

  const formatearDinero = (val) => {
    return "$" + Number(val).toLocaleString("es-ES", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
  };
  const generarReporteContableDetalladoPDF = () => {
    if (!datosBase || datosBase.length === 0) {
      return alert("No hay registros en el período seleccionado para generar el reporte.");
    }

    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const fechaActual = new Date().toLocaleDateString();

    // 1. Determinar el título del período según los días seleccionados
    let textoPeriodo = "Histórico General";
    if (filtroDias === 1) textoPeriodo = "Reporte Diario (Hoy)";
    else if (filtroDias === 7) textoPeriodo = "Reporte Semanal (Últimos 7 días)";
    else if (filtroDias === 15) textoPeriodo = "Reporte Quincenal (Últimos 15 días)";
    else if (filtroDias === 30) textoPeriodo = "Reporte Mensual (Últimos 30 días)";

    // 2. Encabezado del PDF
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("POZO TRINA MALAVER F.P.", 14, 15);
    
    doc.setFontSize(12);
    doc.text(`Informe Detallado de Ventas - ${textoPeriodo}`, 14, 22);
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text(`Fecha de emisión: ${fechaActual}`, 14, 28);

    // Calcular el monto total acumulado del período seleccionado
    const totalPeriodo = datosBase.reduce((sum, item) => sum + Number(item.monto || 0), 0);
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(`Total Recaudado en el Período: $${totalPeriodo}`, 14, 35);
    doc.text("------------------------------------------------------------------------------------------", 14, 40);

    // 3. Mapear cada viaje de forma detallada e individual para la tabla
    const tablaFilas = datosBase.map((item) => {
      // Formateamos la fecha y hora de forma legible (DD/MM/AAAA HH:MM)
      let fechaFormateada = "N/A";
      if (item.fecha_carga) {
        const f = new Date(item.fecha_carga);
        if (!isNaN(f.getTime())) {
          fechaFormateada = `${f.toLocaleDateString()} ${f.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        }
      }

      return [
        fechaFormateada,
        item.camiones?.chofer || "N/A",
        item.camiones?.placa || "N/A",
        item.metodo || "N/A",
        `$${item.monto || 0}`
      ];
    });

    // 4. Crear la tabla detallada automatizada con todas las columnas centradas
    autoTable(doc, {
      startY: 44,
      head: [["FECHA Y HORA", "CHOFER", "PLACA", "MÉTODO", "MONTO ($)"]],
      body: tablaFilas,
      theme: "striped",
      headStyles: { fillColor: "#1e293b", textColor: "#ffffff", fontStyle: "bold" }, // Azul pizarra oscuro
      styles: { font: "helvetica", fontSize: 9, halign: "center" }
    });

    // 5. Descargar archivo
    doc.save(`Reporte_Detallado_${textoPeriodo.replace(/ /g, "_")}.pdf`);
  };

  return (
    <SeccionContabilidad>
      <ControlesSuperiores>
        {/* BUSCADOR */}
        <InputWrapper>
          <MdSearch className="search-icon" />
          <InputBuscar
            type="text"
            placeholder="Buscar chofer..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </InputWrapper>

        {/* SELECTOR DE TIEMPO DINÁMICO */}
        <SelectWrapper>
          <MdCalendarToday className="calendar-icon" />
          <SelectTiempo
            value={filtroDias}
            onChange={(e) => setFiltroDias(Number(e.target.value))}
          >
            <option value={1}>Hoy</option>
            <option value={7}>Últimos 7 días</option>
            <option value={15}>Últimas 2 semanas</option>
            <option value={30}>Últimos 30 días</option>
            <option value={3650}>Todo el Histórico</option>
          </SelectTiempo>
        </SelectWrapper>

                {/* BOTÓN PARA DESCARGAR EL REPORTE DETALLADO SEGÚN EL FILTRO SELECCIONADO */}
        <button
          onClick={generarReporteContableDetalladoPDF}
          type="button"
          style={{
            backgroundColor: "#059669", // Verde esmeralda corporativo
            color: "white",
            fontWeight: "500",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontSize: "14px",
            display: "flex",
            alignItems: "center",
            height: "38px" // Alineado a la altura del buscador y selector
          }}
        >
          📊 Descargar Informe PDF
        </button>

      </ControlesSuperiores>

      {cargando ? (
        <MensajeEstado>Actualizando cuentas...</MensajeEstado>
      ) : (
        <ContenedorTabla>
          <TablaEstilizada>
            <thead>
              <tr>
                <th><MdLocalShipping className="th-icon" /> Chofer</th>
                <th>Viajes Totales</th>
                <th><MdAttachMoney className="th-icon" /> Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              {resumenProcesado.length > 0 ? (
                resumenProcesado.map((c, i) => (
                  <tr key={i}>
                    <td className="nombre-chofer">{c.nombre}</td>
                    <td><span className="viajes-badge">{c.viajes} viajes</span></td>
                    <td className="monto-recaudado">
                      {formatearDinero(c.totalDinero)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", color: "#94a3b8", padding: "40px" }}>
                    No se encontraron registros para el filtro seleccionado.
                  </td>
                </tr>
              )}
            </tbody>
            {resumenProcesado.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total General</td>
                  <td>{totalesGenerales.viajes} viajes</td>
                  <td>{formatearDinero(totalesGenerales.dinero)}</td>
                </tr>
              </tfoot>
            )}
          </TablaEstilizada>
        </ContenedorTabla>
      )}
    </SeccionContabilidad>
  );
}

// 🎨 STYLED COMPONENTS DARK GLASSMORPHISM FOR CONTABILIDAD
const SeccionContabilidad = styled.div`
  animation: fadeIn 0.3s ease-out;
`;

const ControlesSuperiores = styled.div`
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
  flex-wrap: wrap;
`;

const InputWrapper = styled.div`
  position: relative;
  flex: 1;
  min-width: 220px;
  display: flex;
  align-items: center;

  .search-icon {
    position: absolute;
    left: 14px;
    font-size: 20px;
    color: #64748b;
  }
`;

const InputBuscar = styled.input`
  width: 100%;
  padding: 12px 14px 12px 42px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  color: #ffffff;
  font-size: 14px;
  outline: none;
  transition: all 0.2s ease;
  box-sizing: border-box;

  &::placeholder {
    color: #64748b;
  }

  &:focus {
    border-color: #00c3ff;
    background: rgba(15, 23, 42, 0.85);
    box-shadow: 0 0 12px rgba(0, 195, 255, 0.25);
  }
`;

const SelectWrapper = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0 14px;
  border-radius: 12px;

  .calendar-icon {
    color: #00c3ff;
    font-size: 18px;
  }
`;

const SelectTiempo = styled.select`
  padding: 12px 0;
  background: none;
  border: none;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  outline: none;

  option {
    background: #151c2c;
    color: #ffffff;
  }
`;

const ContenedorTabla = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
`;

const TablaEstilizada = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  thead {
    background: rgba(15, 23, 42, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    th {
      padding: 16px 20px;
      font-size: 13px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      .th-icon {
        vertical-align: middle;
        margin-right: 6px;
        font-size: 16px;
        color: #00c3ff;
      }
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.03);
      }
    }

    td {
      padding: 16px 20px;
      font-size: 14px;
      color: #f8fafc;
    }
  }

  .nombre-chofer {
    font-weight: 600;
    color: #ffffff;
  }

  .viajes-badge {
    background: rgba(255, 255, 255, 0.06);
    padding: 4px 10px;
    border-radius: 8px;
    font-size: 12px;
    color: #cbd5e1;
  }

  .monto-recaudado {
    color: #10b981;
    font-weight: 700;
  }

  tfoot tr {
    background: rgba(15, 23, 42, 0.9);
    font-weight: 700;

    td {
      padding: 16px 20px;
      border-top: 1px solid rgba(0, 195, 255, 0.3);
      color: #00c3ff;
      font-size: 15px;
    }
  }
`;

const MensajeEstado = styled.div`
  text-align: center;
  color: #94a3b8;
  padding: 40px;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;
