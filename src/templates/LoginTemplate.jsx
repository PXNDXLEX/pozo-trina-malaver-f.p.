import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { supabase } from "../supabase/supabase.config"; 
import { useAuthStore } from "../store/AuthStore";

export function LoginTemplate() {
  const navigate = useNavigate();
  const loginGlobal = useAuthStore((state) => state.login);

  // Estados limpios para Cédula y Contraseña
  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const cedulaLimpia = String(cedula).trim();

      // 1. PASO CLAVE: Buscar en la tabla 'perfiles' qué correo tiene esta cédula
      const { data: perfilData, error: perfilError } = await supabase
        .from("perfiles")
        .select("email, rol")
        .eq("cedula", cedulaLimpia);

      // Si no encuentra la cédula en la tabla de perfiles
      if (perfilError || !perfilData || perfilData.length === 0) {
        alert("El número de cédula ingresado no está registrado en el sistema.");
        setLoading(false);
        return;
      }

      // Extraemos el correo real y el rol guardados en esa fila
      const correoReal = perfilData[0].email;
      const rolAsignado = perfilData[0].rol;

      // 2. Autenticar en Supabase usando el correo que encontramos internamente
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: correoReal,
        password: password,
      });

      if (authError) {
        alert("La contraseña ingresada es incorrecta.");
        setLoading(false);
        return;
      }

      // 3. Armar el objeto para tu Zustand Store global
      const userData = {
        id: authData.user.id,
        name: `C.I. ${cedulaLimpia}`, 
        role: rolAsignado, // 'administrador' o 'registrador'
      };

      const tokenSession = authData.session.access_token;

      // 4. Guardar sesión e ir directo al Dashboard de gráficos
      loginGlobal(userData, tokenSession);
     if (rolAsignado === "camionero") {
      navigate("/recarga");
      
    } else {
      if (rolAsignado === "registrador") {
      navigate("/camion");
      
    } else {
      navigate("/home"); 
    }}
    } catch (error) {
      console.error("Error crítico en el login por cédula:", error);
      alert("Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <div className="login-box">
        <h2>Iniciar Sesión</h2>
        <p>Ventas de Pozo Trina Malaver F.P.</p>
        
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label>Número de Cédula</label>
            <input
              type="text"
              placeholder="Ej: 12345678"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="**********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" disabled={loading}>
            {loading ? "Ingresando..." : "Ingresar"}
          </button>
        </form>
      </div>
    </Container>
  );
}

const Container = styled.div`
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #242424;

  .login-box {
    background: #1a1a1a;
    padding: 40px;
    border-radius: 8px;
    width: 100%;
    max-width: 400px;
    text-align: center;
    color: white;
    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
  }

  h2 { margin-bottom: 5px; }
  p { color: #888; font-size: 14px; margin-bottom: 30px; }

  .input-group {
    text-align: left;
    margin-bottom: 20px;
    
    label { display: block; margin-bottom: 5px; font-size: 14px; }
    input {
      width: 100%;
      padding: 12px;
      background: #2a2a2a;
      border: 1px solid #333;
      border-radius: 4px;
      color: white;
      outline: none;
      &:focus { border-color: #00a8ff; }
    }
  }

  button {
    width: 100%;
    padding: 12px;
    background: #00a8ff;
    color: white;
    border: none;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    transition: 0.3s;
    &:hover { background: #0086cc; }
    &:disabled { background: #555; cursor: not-allowed; }
  }
`;
