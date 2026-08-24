import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";


export function TablaUsuario() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  
  // Estados nuevos para la edición
  const [editandoUser, setEditandoUser] = useState(null);
  const [nombreEdit, setNombreEdit] = useState('');
  const [cedulaEdit, setCedulaEdit] = useState('');
  const [rolEdit, setRolEdit] = useState('vendedor');

  const obtenerUsuarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('perfiles')
      .select('*')
      .order('nombre', { ascending: true });

    if (!error && data) {
      setUsuarios(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  // 1. FUNCIÓN PARA ELIMINAR (Solo de la tabla perfiles)
  const handleEliminar = async (id, nombre) => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar a ${nombre}?`);
    if (!confirmar) return;

    const { error } = await supabase
      .from('perfiles')
      .delete()
      .eq('id', id);

    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      alert('Usuario eliminado de la base de datos.');
      obtenerUsuarios(); // Recargar tabla
    }
  };

  // 2. FUNCIÓN PARA ENTRAR EN MODO EDICIÓN
  const activarEdicion = (usr) => {
    setEditandoUser(usr.id);
    setNombreEdit(usr.nombre);
    setCedulaEdit(usr.cedula);
    setRolEdit(usr.rol);
  };

 const handleGuardarEdicion = async (id) => {
  // Asegúrate de que los valores coincidan exactamente con lo que espera tu base de datos
  const { error } = await supabase
    .from('perfiles')
    .update({
      nombre: nombreEdit,
      cedula: cedulaEdit,
      rol: rolEdit // Revisa que el <select> envíe el formato correcto (ej: "CAMIONERO")
    })
    .eq('id', id);

  if (error) {
    // Esto te dirá exactamente qué columna está rechazando Supabase
    alert(`Error detallado de Supabase: ${error.message}\nCódigo: ${error.code}`);
  } else {
    alert('🎉 ¡Datos actualizados con éxito!');
    setEditandoUser(null); // Sale del modo edición
    obtenerUsuarios(); // Recarga la tabla con los datos nuevos
  }
};

  return (
    <div style={{ padding: '20px', color: '#fff', backgroundColor: '#1e1e1e', minHeight: '100vh', fontFamily: 'sans-serif' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <h2>👥 Gestión de Personal / Usuarios</h2>
      </div>

      {loading ? (
        <p>Cargando personal...</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: '#2d2d2d', borderRadius: '8px', overflow: 'hidden' }}>
          <thead>
            <tr style={{ backgroundColor: '#3d3d3d', textAlign: 'left' }}>
              <th style={{ padding: '12px' }}>Nombre</th>
              <th style={{ padding: '12px' }}>Cédula</th>
              <th style={{ padding: '12px' }}>Rol asignado</th>
              <th style={{ padding: '12px', textAlign: 'center' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usr) => (
              <tr key={usr.id} style={{ borderBottom: '1px solid #3d3d3d' }}>
                
                {/* CELDA NOMBRE (Normal o Modo Edición) */}
                <td style={{ padding: '12px' }}>
                  {editandoUser === usr.id ? (
                    <input type="text" value={nombreEdit} onChange={e => setNombreEdit(e.target.value)} style={inputInlineStyle} />
                  ) : (
                    usr.nombre
                  )}
                </td>

                {/* CELDA CÉDULA (Normal o Modo Edición) */}
                <td style={{ padding: '12px' }}>
                  {editandoUser === usr.id ? (
                    <input type="text" value={cedulaEdit} onChange={e => setCedulaEdit(e.target.value)} style={inputInlineStyle} />
                  ) : (
                    usr.cedula
                  )}
                </td>

                {/* CELDA ROL (Normal o Modo Edición) */}
                <td style={{ padding: '12px' }}>
                  {editandoUser === usr.id ? (
                    <select value={rolEdit} onChange={e => setRolEdit(e.target.value)} style={inputInlineStyle}>
                      <option value="registrador">Vendedor / Recargador</option>
                      <option value="camionero">Chofer de Cisterna</option>
                      <option value="administrador">Administrador del Pozo</option>
                    </select>
                  ) : (
                    <span style={{ 
                      padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 'bold',
                      backgroundColor: usr.rol === 'admin' || usr.rol === 'administrador' ? '#d32f2f' : usr.rol === 'chofer' || usr.rol === 'camionero' ? '#f57c00' : '#388e3c'
                    }}>
                      {usr.rol ? usr.rol.toUpperCase() : 'SIN ROL'}
                    </span>
                  )}
                </td>

                {/* COLUMNA DE ACCIONES DINÁMICAS */}
                <td style={{ padding: '12px', textAlign: 'center' }}>
                  {editandoUser === usr.id ? (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => handleGuardarEdicion(usr.id)} style={{ ...btnAccionStyle, backgroundColor: '#388e3c' }}>💾 Guardar</button>
                      <button onClick={() => setEditandoUser(null)} style={{ ...btnAccionStyle, backgroundColor: '#757575' }}>❌ Cancelar</button>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                      <button onClick={() => activarEdicion(usr)} style={{ ...btnAccionStyle, backgroundColor: '#1976d2' }}>✏️ Editar</button>
                      <button onClick={() => handleEliminar(usr.id, usr.nombre)} style={{ ...btnAccionStyle, backgroundColor: '#d32f2f' }}>🗑️ Eliminar</button>
                    </div>
                  )}
                </td>

              </tr>
            ))}
          </tbody>
        </table>
      )}

     
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


