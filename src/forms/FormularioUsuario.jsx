import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";
import styled from "styled-components";


export function FormularioUsuario({ onUsuarioRegistrado, onCancelar }) {
  const [nombre, setNombre] = useState('');
  const [cedula, setCedula] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('administrador');
  const [loading, setLoading] = useState(false);

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      alert(`Error en Autenticación: ${authError.message}`);
      setLoading(false);
      return;
    }

    if (authData?.user) {
      const { error: profileError } = await supabase
        .from('perfiles')
        .insert([
          {
            id: authData.user.id,
            cedula,
            nombre,
            rol,
            activo: true
          }
        ]);

      if (profileError) {
        alert(`Error al guardar perfil: ${profileError.message}`);
      } else {
        alert('🎉 ¡Usuario registrado con éxito!');
        setNombre(''); setCedula(''); setEmail(''); setPassword('');
        onUsuarioRegistrado(); 
      }
    }
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={headerRowStyle}>
        <h2 style={titleStyle}>Registrar Nuevo Usuario</h2>
       
      </div>
      
      <form onSubmit={handleRegistrar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        <div>
          <label style={labelStyle}>Nombre Completo:</label>
          <input 
            type="text" 
            placeholder="Ej: Juan Pérez" 
            value={nombre} 
            onChange={e => setNombre(e.target.value)} 
            required 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={labelStyle}>Número de Cédula:</label>
          <input 
            type="text" 
            placeholder="Ej: 12345678" 
            value={cedula} 
            onChange={e => setCedula(e.target.value)} 
            required 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={labelStyle}>Correo Electrónico:</label>
          <input 
            type="email" 
            placeholder="Ej: usuario@correo.com" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
            style={inputStyle} 
          />
        </div>

        <div>
          <label style={labelStyle}>Contraseña de Ingreso:</label>
          <input 
            type="password" 
            placeholder="Mínimo 6 caracteres" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
            style={inputStyle} 
          />
        </div>
        
        <div>
          <label style={labelStyle}>Rol en el Sistema:</label>
          <select value={rol} onChange={e => setRol(e.target.value)} style={selectStyle}>
            <option value="registrador">Vendedor / Recargador</option>
            <option value="camionero">Chofer de Cisterna</option>
            <option value="administrador">Administrador del Pozo</option>
          </select>
        </div>

        <button type="submit" disabled={loading} style={submitBtnStyle}>
          {loading ? 'Registrando...' : 'Registrar Usuario'}
        </button>

      </form>
    </div>
  );
}

// 🎨 ESTILOS IDÉNTICOS A TU PANTALLA DE CAMIONES
const containerStyle = {
  backgroundColor: '#121212', // Fondo oscuro idéntico
  padding: '40px',
  minHeight: '100vh',
  fontFamily: 'sans-serif',
  color: '#fff'
};

const headerRowStyle = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginBottom: '30px'
};

const titleStyle = {
  fontSize: '24px',
  fontWeight: 'bold',
  margin: 0
};



const labelStyle = {
  display: 'block',
  fontSize: '14px',
  color: '#888', // Gris atenuado para etiquetas
  marginBottom: '8px'
};

const inputStyle = {
  width: '100%',
  padding: '14px',
  backgroundColor: '#1c1c1c', // Caja de entrada gris oscuro
  border: '1px solid #2d2d2d',
  borderRadius: '8px',
  color: '#fff',
  fontSize: '16px',
  outline: 'none',
  boxSizing: 'border-box'
};

const selectStyle = {
  ...inputStyle,
  cursor: 'pointer'
};

const submitBtnStyle = {
  width: '100%',
  padding: '16px',
  backgroundColor: '#00c3ff', // Azul brillante de tu botón
  color: '#000', // Texto oscuro encima del botón
  border: 'none',
  borderRadius: '8px',
  fontSize: '16px',
  fontWeight: 'bold',
  cursor: 'pointer',
  marginTop: '10px',
  transition: 'background-color 0.2s'
};
