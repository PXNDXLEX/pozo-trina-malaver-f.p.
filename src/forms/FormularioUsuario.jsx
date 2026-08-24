import React, { useState } from "react";
import { supabase } from "../supabase/supabase.config";
import styled from "styled-components";
import { MdPersonAdd, MdBadge, MdEmail, MdLock, MdWork, MdPerson } from "react-icons/md";

export function FormularioUsuario({ onUsuarioRegistrado }) {
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("administrador");
  const [loading, setLoading] = useState(false);

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
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
        const { error: profileError } = await supabase.from("perfiles").insert([
          {
            id: authData.user.id,
            cedula,
            nombre,
            email,
            password,
            rol,
            activo: true,
          },
        ]);

        if (profileError) {
          alert(`Error al guardar perfil: ${profileError.message}`);
        } else {
          alert("🎉 ¡Usuario registrado con éxito!");
          setNombre("");
          setCedula("");
          setEmail("");
          setPassword("");
          if (onUsuarioRegistrado) onUsuarioRegistrado();
        }
      }
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      alert("Ocurrió un error inesperado al registrar el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <HeaderGroup>
        <IconBadge>
          <MdPersonAdd />
        </IconBadge>
        <div>
          <h2>Registrar Nuevo Usuario</h2>
          <p className="subtitle">Completa los datos para asignar accesos al sistema</p>
        </div>
      </HeaderGroup>

      <FormCard onSubmit={handleRegistrar}>
        <InputGrid>
          <FieldBox>
            <label><MdPerson className="field-icon" /> Nombre Completo:</label>
            <input
              type="text"
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox>
            <label><MdBadge className="field-icon" /> Número de Cédula:</label>
            <input
              type="text"
              placeholder="Ej: 12345678"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox>
            <label><MdEmail className="field-icon" /> Correo Electrónico:</label>
            <input
              type="email"
              placeholder="Ej: usuario@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox>
            <label><MdLock className="field-icon" /> Contraseña de Ingreso:</label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox style={{ gridColumn: "1 / -1" }}>
            <label><MdWork className="field-icon" /> Rol en el Sistema:</label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="registrador">Vendedor / Recargador</option>
              <option value="camionero">Chofer de Cisterna</option>
              <option value="administrador">Administrador del Pozo</option>
            </select>
          </FieldBox>
        </InputGrid>

        <SubmitBtn type="submit" disabled={loading}>
          {loading ? "Registrando Usuario..." : "Registrar Usuario"}
        </SubmitBtn>
      </FormCard>
    </FormContainer>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC FORM
const FormContainer = styled.div`
  max-width: 700px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-out;
`;

const HeaderGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  h2 {
    font-size: 22px;
    font-weight: 700;
    color: #ffffff;
    margin: 0 0 4px 0;
  }

  .subtitle {
    color: #94a3b8;
    font-size: 13px;
    margin: 0;
  }
`;

const IconBadge = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.2), rgba(0, 114, 255, 0.2));
  border: 1px solid rgba(0, 195, 255, 0.3);
  color: #00c3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
`;

const FormCard = styled.form`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 32px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  @media (max-width: 600px) {
    padding: 20px;
  }
`;

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
`;

const FieldBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 13px;
    font-weight: 500;
    color: #cbd5e1;
    display: flex;
    align-items: center;
    gap: 6px;

    .field-icon {
      color: #00c3ff;
      font-size: 16px;
    }
  }

  input, select {
    width: 100%;
    padding: 13px 14px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #ffffff;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:focus {
      border-color: #00c3ff;
      background: rgba(15, 23, 42, 0.85);
      box-shadow: 0 0 12px rgba(0, 195, 255, 0.25);
    }
  }

  select {
    cursor: pointer;
    option {
      background: #151c2c;
      color: #ffffff;
    }
  }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 195, 255, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 195, 255, 0.45);
  }

  &:disabled {
    background: #334155;
    color: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }
`;
