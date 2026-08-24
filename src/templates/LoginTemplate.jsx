import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import { MdBadge, MdLock } from "react-icons/md";

export function LoginTemplate() {
  const navigate = useNavigate();
  const loginGlobal = useAuthStore((state) => state.login);

  const [cedula, setCedula] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);

    try {
      const cedulaLimpia = String(cedula).trim();

      const { data: perfilData, error: perfilError } = await supabase
        .from("perfiles")
        .select("email, rol")
        .eq("cedula", cedulaLimpia);

      if (perfilError || !perfilData || perfilData.length === 0) {
        alert("El número de cédula ingresado no está registrado en el sistema.");
        setLoading(false);
        return;
      }

      const correoReal = perfilData[0].email;
      const rolAsignado = perfilData[0].rol;

      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: correoReal,
        password: password,
      });

      if (authError) {
        alert("La contraseña ingresada es incorrecta.");
        setLoading(false);
        return;
      }

      const userData = {
        id: authData.user.id,
        name: `C.I. ${cedulaLimpia}`,
        role: rolAsignado,
      };

      const tokenSession = authData.session.access_token;
      loginGlobal(userData, tokenSession);

      if (rolAsignado === "camionero") {
        navigate("/recarga");
      } else if (rolAsignado === "registrador") {
        navigate("/camion");
      } else {
        navigate("/home");
      }
    } catch (error) {
      console.error("Error crítico en el login por cédula:", error);
      alert("Ocurrió un error inesperado al conectar con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <BackgroundOrb className="orb-1" />
      <BackgroundOrb className="orb-2" />

      <LoginCard>
        <LogoWrapper>💧</LogoWrapper>
        <h2>Iniciar Sesión</h2>
        <p className="subtitle">Ventas de Pozo Trina Malaver F.P.</p>

        <form onSubmit={handleSubmit}>
          <InputGroup>
            <label>Número de Cédula</label>
            <InputWrapper>
              <MdBadge className="field-icon" />
              <input
                type="text"
                placeholder="Ej: 12345678"
                value={cedula}
                onChange={(e) => setCedula(e.target.value)}
                required
              />
            </InputWrapper>
          </InputGroup>

          <InputGroup>
            <label>Contraseña</label>
            <InputWrapper>
              <MdLock className="field-icon" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </InputWrapper>
          </InputGroup>

          <SubmitButton type="submit" disabled={loading}>
            {loading ? "Autenticando..." : "Ingresar al Sistema"}
          </SubmitButton>
        </form>

        <FooterOtto className="footer-otto">otto 2026</FooterOtto>
      </LoginCard>
    </Container>
  );
}

// 🎨 STYLED COMPONENTS GLASSMORPHIC DESIGN
const Container = styled.div`
  min-height: 100vh;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background-color: #0b0f19;
  position: relative;
  overflow: hidden;
  padding: 20px;
  box-sizing: border-box;
`;

const BackgroundOrb = styled.div`
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  pointer-events: none;
  animation: pulseGlow 8s infinite alternate ease-in-out;

  &.orb-1 {
    width: 350px;
    height: 350px;
    background: rgba(0, 195, 255, 0.25);
    top: 10%;
    left: 15%;
  }

  &.orb-2 {
    width: 400px;
    height: 400px;
    background: rgba(0, 114, 255, 0.2);
    bottom: 10%;
    right: 15%;
  }
`;

const LoginCard = styled.div`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 44px 36px;
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  text-align: center;
  color: #ffffff;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  position: relative;
  z-index: 10;
  animation: fadeIn 0.4s ease-out;

  h2 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 6px;
    color: #ffffff;
  }

  .subtitle {
    color: #94a3b8;
    font-size: 14px;
    margin-bottom: 32px;
  }
`;

const LogoWrapper = styled.div`
  width: 56px;
  height: 56px;
  margin: 0 auto 16px auto;
  border-radius: 16px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  box-shadow: 0 0 20px rgba(0, 195, 255, 0.4);
`;

const InputGroup = styled.div`
  text-align: left;
  margin-bottom: 22px;

  label {
    display: block;
    margin-bottom: 8px;
    font-size: 13px;
    font-weight: 500;
    color: #cbd5e1;
  }
`;

const InputWrapper = styled.div`
  position: relative;
  display: flex;
  align-items: center;

  .field-icon {
    position: absolute;
    left: 14px;
    font-size: 20px;
    color: #64748b;
    transition: color 0.2s;
  }

  input {
    width: 100%;
    padding: 13px 14px 13px 44px;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #ffffff;
    font-size: 15px;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &::placeholder {
      color: #475569;
    }

    &:focus {
      border-color: #00c3ff;
      background: rgba(15, 23, 42, 0.85);
      box-shadow: 0 0 12px rgba(0, 195, 255, 0.25);
    }

    &:focus + .field-icon,
    &:focus ~ .field-icon {
      color: #00c3ff;
    }
  }
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 14px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 15px rgba(0, 195, 255, 0.3);
  margin-top: 8px;

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 195, 255, 0.45);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #334155;
    color: #94a3b8;
    cursor: not-allowed;
    box-shadow: none;
  }
`;

const FooterOtto = styled.footer`
  margin-top: 28px;
  font-size: 13px;
  color: #64748b;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  padding-top: 18px;
  letter-spacing: 1px;
`;
