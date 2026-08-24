import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase.config";
import styled from "styled-components";


export function TablaCamiones() {
  const [datos, setDatos] = useState([]);
   const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);

    const [editandoCamion, setEditandoCamion] = useState(null);
      const [placaEdit, setPlacaEdit] = useState('');
      const [choferEdit, setChoferEdit] = useState('');
      const [capacidadEdit, setCapacidadEdit] = useState('');


  const consultar = async () => {
    const { data } = await supabase
      .from("camiones")
      .select("*")
      .order("id", { ascending: false });
    setDatos(data || []);
  };

  useEffect(() => {
    consultar();
  }, []);


const handleEliminar = async (id, chofer) => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar a ${chofer}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from('camiones')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      alert('Camion eliminado de la base de datos.');
      consultar(); // Recargar tabla
    }
  };

  // 2. FUNCIÓN PARA ENTRAR EN MODO EDICIÓN
  const activarEdicion = (camion) => {
    setEditandoCamion(camion.id);
    setPlacaEdit(camion.placa);
    setChoferEdit(camion.chofer);
    setCapacidadEdit(camion.capacidad);
  };

 const handleGuardarEdicion = async (id) => {
  // Asegúrate de que los valores coincidan exactamente con lo que espera tu base de datos
  const { error } = await supabase
    .from('camiones')
    .update({
      placa: placaEdit,
      chofer: choferEdit,
      capacidad: capacidadEdit
    })
    .eq('id', id);

  if (error) {
    // Esto te dirá exactamente qué columna está rechazando Supabase
    alert(`Error detallado de Supabase: ${error.message}\nCódigo: ${error.code}`);
  } else {
    alert('🎉 ¡Datos actualizados con éxito!');
    setEditandoCamion(null); // Sale del modo edición
    consultar(); // Recarga la tabla con los datos nuevos
  }
};


  return (
    
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#1e1e1e', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
      <h3>🚚 Lista de Camiones</h3>
      </div>
       
      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
        <thead>
          <tr style={{ backgroundColor: '#3d3d3d', textAlign: 'left' }}>
            <th style={{ padding: '12px' }}>Placa</th>
            <th style={{ padding: '12px' }}>Chofer</th>
            <th style={{ padding: '12px' }}>Capacidad (Lts)</th>
            <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {datos.map((camion) => (
            <tr key={camion.id} style={{ borderBottom: '1px solid #3d3d3d' }}>
               <td style={{ padding: '12px' }}>
                  {editandoCamion === camion.id ? (
                    <input type="text" value={placaEdit} onChange={e => setPlacaEdit(e.target.value)} style={inputInlineStyle} />
                  ) : (
                  camion.placa
                  )}
                </td>
               <td style={{ padding: '12px' }}>
                  {editandoCamion === camion.id ? (
                    <input type="text" value={choferEdit} onChange={e => setChoferEdit(e.target.value)} style={inputInlineStyle} />
                  ) : (
                  camion.chofer
                  )}
                </td>
                 <td style={{ padding: '12px' }}>
                  {editandoCamion === camion.id ? (
                    <input type="text" value={capacidadEdit} onChange={e => setCapacidadEdit(e.target.value)} style={inputInlineStyle} />
                  ) : (
                  camion.capacidad.toLocaleString()
                  )} Lts
                </td>
              <td style={{ padding: '12px', textAlign: 'center' }}>
                  {editandoCamion === camion.id ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleGuardarEdicion(camion.id)} style={{ ...btnAccionStyle, backgroundColor: '#388e3c' }}>💾 Guardar</button>
                      <button onClick={() => setEditandoCamion(null)} style={{ ...btnAccionStyle, backgroundColor: '#757575' }}>❌ Cancelar</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => activarEdicion(camion)} style={{ ...btnAccionStyle, backgroundColor: '#1976d2' }}>✏️ Editar</button>
                      <button onClick={() => handleEliminar(camion.id, camion.chofer)} style={{ ...btnAccionStyle, backgroundColor: '#d32f2f' }}>🗑️ Eliminar</button>
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      

     
    </div>
  );
}

// Estilos rápidos en línea para los botones y campos editables
const inputInlineStyle = {
  padding: '6px',
  backgroundColor: '#1e1e1e',
  color: '#fff',
  border: '1px solid #555',
  borderRadius: '4px',
  width: '90%'
};

const btnAccionStyle = {
  padding: '6px 12px',
  color: '#fff',
  border: 'none',
  borderRadius: '4px',
  cursor: 'pointer',
  fontWeight: 'bold',
  fontSize: '13px'
};





