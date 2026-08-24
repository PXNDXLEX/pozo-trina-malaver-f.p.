import styled from "styled-components";
import { useState } from "react";
import { supabase } from "../supabase/supabase.config";
import { MdLocalShipping, MdConfirmationNumber, MdPerson, MdWaterDrop } from "react-icons/md";

export function FormularioCamiones({ onCamionAgregado }) {
  const [placa, setPlaca] = useState("");
  const [chofer, setChofer] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [cargando, setCargando] = useState(false);

  const insertarCamion = async (e) => {
    e.preventDefault();
    setCargando(true);

    const placaLimpia = placa.trim().toUpperCase();
    const regexPlaca = /^[A-Z0-9]{6,7}$/;

    if (!regexPlaca.test(placaLimpia)) {
      alert("Formato de placa inválido. Debe contener entre 6 y 7 letras y números, sin espacios ni guiones (Ej: ASD344).");
      setCargando(false);
      return;
    }

    try {
      const { error } = await supabase.from("camiones").insert([
        {
          placa: placaLimpia,
          chofer: chofer.trim(),
          capacidad: parseFloat(capacidad),
        },
      ]);

      if (error) {
        alert("Error al guardar camión: " + error.message);
      } else {
        alert("🎉 ¡Camión registrado con éxito!");
        setPlaca("");
        setChofer("");
        setCapacidad("");
        if (onCamionAgregado) onCamionAgregado();
      }
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error inesperado al registrar el camión.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <FormContainer>
      <HeaderGroup>
        <IconBadge>
          <MdLocalShipping />
        </IconBadge>
        <div>
          <h2>Registrar Nuevo Camión</h2>
          <p className="subtitle">Ingresa la placa, chofer y capacidad de la unidad cisterna</p>
        </div>
      </HeaderGroup>

      <FormCard onSubmit={insertarCamion}>
        <InputGrid>
          <FieldBox>
            <label><MdConfirmationNumber className="field-icon" /> Número de Placa:</label>
            <input
              type="text"
              value={placa}
              onChange={(e) => setPlaca(e.target.value)}
              placeholder="Ej: ASD344"
              maxLength={7}
              style={{ textTransform: "uppercase" }}
              required
            />
          </FieldBox>

          <FieldBox>
            <label><MdPerson className="field-icon" /> Nombre del Chofer:</label>
            <input
              type="text"
              value={chofer}
              onChange={(e) => setChofer(e.target.value)}
              placeholder="Nombre completo"
              required
            />
          </FieldBox>

          <FieldBox style={{ gridColumn: "1 / -1" }}>
            <label><MdWaterDrop className="field-icon" /> Capacidad de Carga (Lts):</label>
            <input
              type="number"
              value={capacidad}
              onChange={(e) => setCapacidad(e.target.value)}
              placeholder="Ej: 10000"
              required
            />
          </FieldBox>
        </InputGrid>

        <SubmitBtn type="submit" disabled={cargando}>
          {cargando ? "Registrando Camión..." : "Registrar Camión"}
        </SubmitBtn>
      </FormCard>
    </FormContainer>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC FORM FOR CAMIONES
const FormContainer = styled.div`
  max-width: 650px;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
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

  input {
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