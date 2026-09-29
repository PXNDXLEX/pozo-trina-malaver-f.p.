import styled from "styled-components";
import { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";
import {
  MdLocalShipping,
  MdConfirmationNumber,
  MdPerson,
  MdWaterDrop,
  MdBadge,
  MdPhone,
  MdPersonAdd,
  MdCheckCircle,
  MdSearch
} from "react-icons/md";

export function FormularioCamiones({ onCamionAgregado }) {
  // Modo de chofer: "existente" o "nuevo"
  const [modoCamionero, setModoCamionero] = useState("existente");

  // Lista de camioneros registrados
  const [camioneros, setCamioneros] = useState([]);
  const [camioneroSeleccionadoId, setCamioneroSeleccionadoId] = useState("");
  const [busquedaCamionero, setBusquedaCamionero] = useState("");

  // Campos para nuevo camionero
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevaCedula, setNuevaCedula] = useState("");
  const [nuevoTelefono, setNuevoTelefono] = useState("");

  // Campos del camión
  const [placa, setPlaca] = useState("");
  const [capacidad, setCapacidad] = useState("");
  const [modelo, setModelo] = useState("");

  const [cargando, setCargando] = useState(false);
  const [cargandoCamioneros, setCargandoCamioneros] = useState(true);

  useEffect(() => {
    obtenerCamioneros();
  }, []);

  const obtenerCamioneros = async () => {
    setCargandoCamioneros(true);
    try {
      // 1. Intentar cargar desde la tabla dedicada public.camioneros
      let { data: listaCamioneros, error: errCamioneros } = await supabase
        .from("camioneros")
        .select("id, nombre, cedula, telefono, perfil_id")
        .order("nombre", { ascending: true });

      // Fallback a perfiles si la tabla camioneros aún no existe
      if (errCamioneros || !listaCamioneros) {
        const { data: perfilesData } = await supabase
          .from("perfiles")
          .select("id, nombre, cedula")
          .eq("rol", "camionero")
          .order("nombre", { ascending: true });

        listaCamioneros = (perfilesData || []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          cedula: p.cedula,
          telefono: "",
          perfil_id: p.id,
        }));
      }

      // Obtener cantidad de camiones que tiene cada chofer
      try {
        const { data: todosCamiones } = await supabase
          .from("camiones")
          .select("id, camionero_id, perfil_id, chofer");

        if (todosCamiones) {
          listaCamioneros = listaCamioneros.map((c) => {
            const count = todosCamiones.filter(
              (t) =>
                (t.camionero_id && t.camionero_id === c.id) ||
                (t.perfil_id && t.perfil_id === c.perfil_id) ||
                (t.chofer && t.chofer.toLowerCase().trim() === c.nombre.toLowerCase().trim())
            ).length;
            return { ...c, totalCamiones: count };
          });
        }
      } catch (errCount) {
        console.warn("No se pudo obtener el conteo de camiones por chofer:", errCount);
      }

      setCamioneros(listaCamioneros || []);
      if (listaCamioneros && listaCamioneros.length > 0 && !camioneroSeleccionadoId) {
        setCamioneroSeleccionadoId(listaCamioneros[0].id);
      }
    } catch (err) {
      console.error("Error al obtener camioneros:", err);
    } finally {
      setCargandoCamioneros(false);
    }
  };

  const insertarCamion = async (e) => {
    e.preventDefault();
    setCargando(true);

    const placaLimpia = placa.trim().toUpperCase();
    const regexPlaca = /^[A-Z0-9]{5,8}$/;

    if (!regexPlaca.test(placaLimpia)) {
      alert("Formato de placa inválido. Debe contener entre 5 y 8 letras y números, sin espacios ni caracteres especiales (Ej: ASD344).");
      setCargando(false);
      return;
    }

    if (!capacidad || parseInt(capacidad, 10) <= 0) {
      alert("Por favor ingresa una capacidad en litros válida (mayor a 0).");
      setCargando(false);
      return;
    }

    try {
      let choferNombre = "";
      let camioneroId = null;
      let perfilId = null;

      if (modoCamionero === "nuevo") {
        if (!nuevoNombre.trim()) {
          alert("Debes indicar el nombre completo del chofer / transportista.");
          setCargando(false);
          return;
        }

        choferNombre = nuevoNombre.trim();

        // 1. Insertar nuevo camionero en la tabla camioneros
        try {
          const { data: newCamionero, error: errNewCam } = await supabase
            .from("camioneros")
            .insert([
              {
                nombre: choferNombre,
                cedula: nuevaCedula.trim() || null,
                telefono: nuevoTelefono.trim() || null,
              },
            ])
            .select("id")
            .single();

          if (!errNewCam && newCamionero) {
            camioneroId = newCamionero.id;
          }
        } catch (errInsertCamionero) {
          console.warn("Fallo al insertar en camioneros (posible tabla no migrada):", errInsertCamionero);
        }
      } else {
        // Modo chofer existente
        const camionero = camioneros.find((c) => String(c.id) === String(camioneroSeleccionadoId));
        if (!camionero) {
          alert("Por favor selecciona un camionero de la lista o registra uno nuevo.");
          setCargando(false);
          return;
        }
        choferNombre = camionero.nombre.trim();
        camioneroId = camionero.id;
        perfilId = camionero.perfil_id || null;
      }

      // 2. Insertar el camión en la tabla camiones
      const camionPayload = {
        placa: placaLimpia,
        chofer: choferNombre,
        capacidad: parseInt(capacidad, 10),
        modelo: modelo.trim(),
      };

      if (camioneroId) camionPayload.camionero_id = camioneroId;
      if (perfilId) camionPayload.perfil_id = perfilId;

      let { error: insertError } = await supabase.from("camiones").insert([camionPayload]);

      // Fallback seguro si la columna camionero_id aún no existe en Supabase
      if (insertError && (insertError.code === "PGRST204" || insertError.message.includes("camionero_id"))) {
        delete camionPayload.camionero_id;
        const { error: errRetry } = await supabase.from("camiones").insert([camionPayload]);
        insertError = errRetry;
      }

      if (insertError) {
        if (insertError.code === "23505") {
          alert("¡Error! Esta placa ya se encuentra registrada en el sistema.");
        } else {
          alert("Error al guardar camión: " + insertError.message);
        }
      } else {
        alert(`🎉 ¡Camión cisterna ${placaLimpia} registrado con éxito y asignado a ${choferNombre}!`);
        setPlaca("");
        setCapacidad("");
        setModelo("");
        setNuevoNombre("");
        setNuevaCedula("");
        setNuevoTelefono("");
        // Refrescar lista de camioneros y conteo
        obtenerCamioneros();
        if (onCamionAgregado) onCamionAgregado();
      }
    } catch (err) {
      console.error(err);
      alert("Ocurrió un error inesperado al registrar el camión.");
    } finally {
      setCargando(false);
    }
  };

  const camioneroSeleccionado = camioneros.find((c) => String(c.id) === String(camioneroSeleccionadoId));

  const camionerosFiltrados = camioneros.filter((c) => {
    if (!busquedaCamionero.trim()) return true;
    const q = busquedaCamionero.toLowerCase().trim();
    return (
      c.nombre?.toLowerCase().includes(q) ||
      c.cedula?.toLowerCase().includes(q) ||
      c.telefono?.toLowerCase().includes(q)
    );
  });

  return (
    <FormContainer>
      <HeaderGroup>
        <IconBadge>
          <MdLocalShipping />
        </IconBadge>
        <div>
          <h2>Registrar Nuevo Camión</h2>
          <p className="subtitle">
            Asigna una o más unidades cisterna a un chofer registrado o crea un nuevo transportista
          </p>
        </div>
      </HeaderGroup>

      <FormCard onSubmit={insertarCamion}>
        {/* SELECTOR DE MODO DE CHOFER */}
        <ModeSelector>
          <ModeBtn
            type="button"
            $active={modoCamionero === "existente"}
            onClick={() => setModoCamionero("existente")}
          >
            <MdPerson /> Asignar a Chofer Existente
          </ModeBtn>
          <ModeBtn
            type="button"
            $active={modoCamionero === "nuevo"}
            onClick={() => setModoCamionero("nuevo")}
          >
            <MdPersonAdd /> ➕ Registrar Nuevo Chofer
          </ModeBtn>
        </ModeSelector>

        {/* 1. SECCIÓN DE CHOFER */}
        {modoCamionero === "existente" ? (
          <ChoferSection>
            <FieldBox>
              <label>
                <MdPerson className="field-icon" /> Seleccionar Chofer / Transportista:
              </label>

              {cargandoCamioneros ? (
                <div style={{ color: "#94a3b8", fontSize: "13px" }}>Cargando lista de choferes...</div>
              ) : camioneros.length === 0 ? (
                <AlertaVacia>
                  No hay choferes registrados aún. Usa la opción <strong>➕ Registrar Nuevo Chofer</strong> arriba para crearlo.
                </AlertaVacia>
              ) : (
                <>
                  <SearchInputWrapper>
                    <MdSearch className="search-icon" />
                    <input
                      type="text"
                      placeholder="Filtrar por nombre o cédula..."
                      value={busquedaCamionero}
                      onChange={(e) => setBusquedaCamionero(e.target.value)}
                    />
                  </SearchInputWrapper>

                  <select
                    value={camioneroSeleccionadoId}
                    onChange={(e) => setCamioneroSeleccionadoId(e.target.value)}
                    required
                  >
                    {camionerosFiltrados.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nombre} {c.cedula ? `— CI: ${c.cedula}` : ""} ({c.totalCamiones || 0} camiones asignados)
                      </option>
                    ))}
                  </select>
                </>
              )}
            </FieldBox>

            {camioneroSeleccionado && (
              <ChoferInfoPill>
                <div className="avatar">
                  <MdPerson />
                </div>
                <div className="details">
                  <div className="nombre">{camioneroSeleccionado.nombre}</div>
                  <div className="meta">
                    {camioneroSeleccionado.cedula && <span>CI: {camioneroSeleccionado.cedula}</span>}
                    {camioneroSeleccionado.telefono && <span>Tlf: {camioneroSeleccionado.telefono}</span>}
                    <span className="badge-camiones">
                      🚛 {camioneroSeleccionado.totalCamiones || 0} unidades registradas
                    </span>
                  </div>
                </div>
              </ChoferInfoPill>
            )}
          </ChoferSection>
        ) : (
          <ChoferSection>
            <SectionTitle>
              <MdPersonAdd /> Datos del Nuevo Chofer / Camionero
            </SectionTitle>
            <InputGrid>
              <FieldBox>
                <label>
                  <MdPerson className="field-icon" /> Nombre Completo: <span className="req">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Carlos Mendoza"
                  value={nuevoNombre}
                  onChange={(e) => setNuevoNombre(e.target.value)}
                  required
                />
              </FieldBox>

              <FieldBox>
                <label>
                  <MdBadge className="field-icon" /> Cédula de Identidad:
                </label>
                <input
                  type="text"
                  placeholder="Ej: V-18456789"
                  value={nuevaCedula}
                  onChange={(e) => setNuevaCedula(e.target.value)}
                />
              </FieldBox>

              <FieldBox style={{ gridColumn: "1 / -1" }}>
                <label>
                  <MdPhone className="field-icon" /> Teléfono de Contacto:
                </label>
                <input
                  type="text"
                  placeholder="Ej: 0414-1234567"
                  value={nuevoTelefono}
                  onChange={(e) => setNuevoTelefono(e.target.value)}
                />
              </FieldBox>
            </InputGrid>
          </ChoferSection>
        )}

        {/* 2. SECCIÓN DE DATOS DEL CAMIÓN */}
        <CamionSection>
          <SectionTitle>
            <MdLocalShipping /> Datos de la Unidad Cisterna
          </SectionTitle>

          <InputGrid>
            <FieldBox>
              <label>
                <MdConfirmationNumber className="field-icon" /> Número de Placa: <span className="req">*</span>
              </label>
              <input
                type="text"
                value={placa}
                onChange={(e) => setPlaca(e.target.value)}
                placeholder="Ej: ASD344"
                maxLength={8}
                style={{ textTransform: "uppercase", letterSpacing: "1px", fontWeight: "700" }}
                required
              />
            </FieldBox>

            <FieldBox>
              <label>
                <MdWaterDrop className="field-icon" /> Capacidad de Carga (Lts): <span className="req">*</span>
              </label>
              <input
                type="text"
                value={capacidad}
                onChange={(e) => {
                  const valor = e.target.value;
                  if (valor === "" || /^[0-9\b]+$/.test(valor)) {
                    setCapacidad(valor);
                  }
                }}
                placeholder="Ej: 10000"
                required
              />
            </FieldBox>

            <FieldBox style={{ gridColumn: "1 / -1" }}>
              <label>
                <MdLocalShipping className="field-icon" /> Modelo del Camión: <span className="req">*</span>
              </label>
              <input
                type="text"
                value={modelo}
                onChange={(e) => setModelo(e.target.value)}
                placeholder="Ej: Mack Granite / Ford Cargo 1721 / Iveco"
                required
              />
            </FieldBox>
          </InputGrid>
        </CamionSection>

        <SubmitBtn type="submit" disabled={cargando}>
          {cargando ? "Registrando Unidad..." : "🚚 Registrar Unidad Cisterna"}
        </SubmitBtn>
      </FormCard>
    </FormContainer>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC
const FormContainer = styled.div`
  max-width: 680px;
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
    line-height: 1.4;
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
  flex-shrink: 0;
`;

const FormCard = styled.form`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  @media (max-width: 600px) {
    padding: 20px;
  }
`;

const ModeSelector = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 24px;
  background: rgba(15, 23, 42, 0.6);
  padding: 6px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const ModeBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: 10px;
  border: none;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  background: ${(props) =>
    props.$active ? "linear-gradient(135deg, #00c3ff 0%, #0072ff 100%)" : "transparent"};
  color: ${(props) => (props.$active ? "#ffffff" : "#94a3b8")};
  box-shadow: ${(props) => (props.$active ? "0 4px 12px rgba(0, 195, 255, 0.3)" : "none")};

  &:hover {
    color: #ffffff;
  }
`;

const ChoferSection = styled.div`
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`;

const CamionSection = styled.div`
  background: rgba(15, 23, 42, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 16px;
  padding: 20px;
  margin-bottom: 24px;
`;

const SectionTitle = styled.h4`
  color: #38bdf8;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 16px 0;
`;

const SearchInputWrapper = styled.div`
  position: relative;
  margin-bottom: 8px;

  .search-icon {
    position: absolute;
    left: 12px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 16px;
  }

  input {
    width: 100%;
    padding: 10px 12px 10px 36px !important;
    font-size: 13px !important;
  }
`;

const ChoferInfoPill = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  padding: 12px 16px;
  background: rgba(0, 195, 255, 0.08);
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 12px;

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 10px;
    background: rgba(0, 195, 255, 0.2);
    color: #00c3ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  .details {
    flex: 1;

    .nombre {
      font-size: 14px;
      font-weight: 600;
      color: #ffffff;
    }

    .meta {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #94a3b8;
      margin-top: 2px;

      .badge-camiones {
        color: #38bdf8;
        font-weight: 500;
      }
    }
  }
`;

const AlertaVacia = styled.div`
  padding: 12px;
  background: rgba(234, 179, 8, 0.1);
  border: 1px solid rgba(234, 179, 8, 0.2);
  border-radius: 10px;
  color: #fef08a;
  font-size: 12px;
  line-height: 1.4;
`;

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
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

    .req {
      color: #ef4444;
    }
  }

  input,
  select {
    width: 100%;
    padding: 12px 14px;
    background: rgba(15, 23, 42, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #ffffff;
    font-size: 14px;
    outline: none;
    transition: all 0.2s ease;
    box-sizing: border-box;

    &:focus {
      border-color: #00c3ff;
      background: rgba(15, 23, 42, 0.9);
      box-shadow: 0 0 12px rgba(0, 195, 255, 0.25);
    }

    option {
      background: #111827;
      color: #ffffff;
    }
  }
`;

const SubmitBtn = styled.button`
  width: 100%;
  padding: 15px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  border-radius: 14px;
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