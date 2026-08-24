import { useEffect, useState, useMemo } from "react";
import styled from "styled-components";
import { supabase } from "../supabase/supabase.config";

export function TablaContabilidad() {
  const [datosBase, setDatosBase] = useState([]);
  const [filtroDias, setFiltroDias] = useState(7); // Estado dinámico para el rango de tiempo
  const [busqueda, setBusqueda] = useState("");   // Estado para el buscador por nombre
  const [cargando, setCargando] = useState(false);

  const consultarSupabase = async (dias) => {
    setCargando(true);
    const fechaLimite = new Date();
    fechaLimite.setDate(fechaLimite.getDate() - dias);
    const fechaFiltroISO = fechaLimite.toISOString();

    const { data, error } = await supabase
      .from("registros_carga")
      .select(`
        monto,
        camiones ( chofer )
      `)
      .gte("fecha_carga", fechaFiltroISO);

    if (!error && data) {
      setDatosBase(data);
    }
    setCargando(false);
  };

  // Cada vez que cambie el selector de días, se vuelve a consultar la base de datos
  useEffect(() => {
    consultarSupabase(filtroDias);
  }, [filtroDias]);

  // Procesamos y agrupamos los datos localmente de forma eficiente con useMemo
  const resumenProcesado = useMemo(() => {
    const agrupado = datosBase.reduce((acc, item) => {
      // Validamos que exista la relación con camiones para evitar errores
      const nombre = item.camiones?.chofer || "Sin Asignar";
      
      if (!acc[nombre]) {
        acc[nombre] = { nombre, totalDinero: 0, viajes: 0 };
      }
      acc[nombre].totalDinero += item.monto;
      acc[nombre].viajes += 1;
      return acc;
    }, {});

    const listaFormateada = Object.values(agrupado);

    // Filtramos dinámicamente por lo que escriba el usuario en el buscador
    return listaFormateada.filter((chofer) =>
      chofer.nombre.toLowerCase().includes(busqueda.toLowerCase())
    );
  }, [datosBase, busqueda]);

  // Calculamos los totales generales de la parte inferior
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

  return (
    <SeccionContabilidad>
      <ControlesSuperiores>
        {/* BUSCADOR EN TIEMPO REAL */}
        <InputBuscar
          type="text"
          placeholder="🔍 Buscar chofer..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />

        {/* SELECTOR DE TIEMPO DINÁMICO */}
        <SelectTiempo
          value={filtroDias}
          onChange={(e) => setFiltroDias(Number(e.target.value))}
        >
          <option value={1}>Hoy</option>
          <option value={7}>Últimos 7 días</option>
          <option value={15}>Últimas 2 semanas</option>
          <option value={30}>Últimos 30 días</option>
        </SelectTiempo>
      </ControlesSuperiores>

      {cargando ? (
        <MensajeEstado>Actualizando cuentas...</MensajeEstado>
      ) : (
        <ContenedorTabla>
          <TablaEstilizada>
            <thead>
              <tr>
                <th>Chofer</th>
                <th>Viajes Totales</th>
                <th>Total Recaudado</th>
              </tr>
            </thead>
            <tbody>
              {resumenProcesado.length > 0 ? (
                resumenProcesado.map((c, i) => (
                  <tr key={i}>
                    <td className="nombre-chofer">{c.nombre}</td>
                    <td>{c.viajes} </td>
                    <td className="monto-recaudado">
                      ${c.totalDinero.toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" style={{ textAlign: "center", color: "#8C9298" }}>
                    No se encontraron registros para este criterio.
                  </td>
                </tr>
              )}
            </tbody>
            {/* FILA DE TOTALES GENERALES */}
            {resumenProcesado.length > 0 && (
              <tfoot>
                <tr>
                  <td>Total General</td>
                  <td>{totalesGenerales.viajes}</td>
                  <td>${totalesGenerales.dinero.toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </TablaEstilizada>
        </ContenedorTabla>
      )}
    </SeccionContabilidad>
  );
}

/* --- ESTILOS COMPATIBLES CON TU INTERFAZ OSCURA --- */

const SeccionContabilidad = styled.div`
  padding: 20px;
  background: #171717; /* Sigue la paleta dark de tus tarjetas */
  border-radius: 12px;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  margin: 20px;
`;

const ControlesSuperiores = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
  flex-wrap: wrap; /* Ajuste automático para pantallas pequeñas */
`;

const InputBuscar = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 10px 15px;
  background: #202020;
  border: 1px solid #37464F;
  border-radius: 6px;
  color: #fff;
  outline: none;
  &:focus {
    border-color: #1cb0f6;
  }
`;

const SelectTiempo = styled.select`
  padding: 10px 15px;
  background: #202020;
  border: 1px solid #37464F;
  border-radius: 6px;
  color: #fff;
  cursor: pointer;
  outline: none;
  &:focus {
    border-color: #1cb0f6;
  }
`;

const ContenedorTabla = styled.div`
  overflow-x: auto; /* Permite scroll horizontal si la pantalla es muy chica */
`;

const TablaEstilizada = styled.table`

  width: 100%;
  border-collapse: collapse;
   text-align: center; 
  color: #fff;


  th, td {
    padding: 14px 16px;
    border-bottom: 1px solid #37464F;
  }

  th {
    background-color: #202020;
    color: #8C9298;
    font-weight: 600;
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.5px;
  }

  tbody tr:hover {
    background-color: rgba(255, 255, 255, 0.03); /* Efecto hover sutil */
  }

  .nombre-chofer {
    font-weight: 500;
  }

  .monto-recaudado {
    color: #4cd137; /* Verde suave para destacar el dinero */
    font-weight: bold;
  }

  tfoot tr {
    background-color: #202020;
    font-weight: bold;
    td {
      border-bottom: none;
      color: #1cb0f6; /* Destaca los totales con tu azul principal */
    }
  }
`;

const MensajeEstado = styled.div`
  text-align: center;
  color: #8C9298;
  padding: 40px;
`;
