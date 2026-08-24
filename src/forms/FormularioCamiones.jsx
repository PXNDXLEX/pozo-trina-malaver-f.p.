import styled from "styled-components";
import { useState } from "react";
import { supabase } from "../supabase/supabase.config";

export function FormularioCamiones({ onCamionAgregado }) {
  const [placa, setPlaca] = useState("");
  const [chofer, setChofer] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [cargando, setCargando] = useState(false);

  const insertarCamion = async (e) => {
    e.preventDefault();
    setCargando(true);
 // 1. Limpiar y estandarizar el texto ingresado
  const placa = placa.trim().toUpperCase();

  // 2. Expresión regular para validar el formato (6 a 7 letras/números sin espacios)
  const regexPlaca = /^[A-Z0-9]{6,7}$/;

  if (!regexPlaca.test(placa)) {
    alert("Formato de placa inválido. Debe contener entre 6 y 7 letras y números, sin espacios ni guiones (Ej: ASD344).");
    return; // Detiene el registro
  }
    try {
      const { error } = await supabase.from("camiones").insert([
        {
          placa: placa,
          chofer: chofer,
          capacidad: parseFloat(capacidad),
        },
      ]);

      if (error) {
        alert("Error al guardar: " + error.message);
      } else {
        alert("Camion registrado con éxito");
        setPlaca("");
        setChofer("");
        setCapacidad("");
        if (onCamionAgregado) onCamionAgregado(); // Recarga la tabla automáticamente
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  return (
     <StyledForm onSubmit={insertarCamion}>
      <h3>Registrar Nuevo Camión</h3>
     
        <div className="input-group">
          <label>Placa:</label>
          <input 
            type="text" 
            value={placa} 
            onChange={(e) => setPlaca(e.target.value)} 
            placeholder="Ej: ABC-123"
            maxLength={7}
            style={{ textTransform: 'uppercase' }}
            required 
          />
        </div>
        <div className="input-group">
          <label>Nombre del Chofer:</label>
          <input 
            type="text" 
            value={chofer} 
            onChange={(e) => setChofer(e.target.value)} 
            placeholder="Nombre completo"
            required 
          />
        </div>
        <div className="input-group">
          <label>Capacidad (Lts):</label>
          <input 
            type="number" 
            value={capacidad} 
            onChange={(e) => setCapacidad(e.target.value)} 
            placeholder="Ej: 10000"
            required 
          />
        </div>
        <button type="submit" className="btn-guardar">
        Registrar Camion
      </button>
      </StyledForm>
  );
}

const StyledForm = styled.form`
  display: flex;
  flex-direction: column;
  gap: 20px;

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  label {
    color: #888;
    font-size: 0.9rem;
  }

  input, select {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    padding: 12px;
    border-radius: 8px;
    color: white;
    font-size: 1rem;
    outline: none;

    &:focus {
      border-color: #00c8ff;
    }
  }

  option {
    background: #1e1e1e;
    color: white;
  }

  .btn-guardar {
    background: #00c8ff;
    color: #13141f;
    border: none;
    padding: 15px;
    border-radius: 10px;
    font-weight: bold;
    cursor: pointer;
    font-size: 1rem;
    margin-top: 10px;
    transition: 0.3s;

    &:hover {
      background: #0099cc;
      transform: translateY(-2px);
    }
  }
`;