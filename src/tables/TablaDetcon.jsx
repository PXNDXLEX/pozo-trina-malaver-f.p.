import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase.config";
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

  return (
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