import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";
import styled from "styled-components";
import {
  MdPersonAdd,
  MdBadge,
  MdEmail,
  MdLock,
  MdWork,
  MdPerson,
  MdLocalShipping,
  MdWaterDrop,
  MdConfirmationNumber,
  MdPhone,
  MdAddCircleOutline,
  MdDeleteOutline,
  MdCheckCircle,
  MdSearch,
} from "react-icons/md";

export function FormularioUsuario({ onUsuarioRegistrado }) {
  // Campos del Usuario
  const [nombre, setNombre] = useState("");
  const [cedula, setCedula] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rol, setRol] = useState("administrador");
  const [loading, setLoading] = useState(false);

  // Configuración exclusiva para rol Camionero
  const [modoCamionero, setModoCamionero] = useState("nuevo"); // "existente" | "nuevo"
  const [listaCamioneros, setListaCamioneros] = useState([]);
  const [camioneroSeleccionadoId, setCamioneroSeleccionadoId] = useState("");
  const [camionesDelChofer, setCamionesDelChofer] = useState([]);
  const [busquedaChofer, setBusquedaChofer] = useState("");

  // Si vincula a chofer existente, puede agregar un camión extra
  const [deseaAgregarCamionExtra, setDeseaAgregarCamionExtra] = useState(false);
  const [extraPlaca, setExtraPlaca] = useState("");
  const [extraCapacidad, setExtraCapacidad] = useState("");
  const [extraModelo, setExtraModelo] = useState("");

  // Si crea chofer desde cero:
  const [telefonoChofer, setTelefonoChofer] = useState("");
  const [camionesNuevos, setCamionesNuevos] = useState([
    { id: 1, placa: "", capacidad: "", modelo: "" },
  ]);

  // Cargar lista de camioneros al montar o al cambiar a rol camionero
  useEffect(() => {
    if (rol === "camionero") {
      cargarCamioneros();
    }
  }, [rol]);

  // Cargar camiones del chofer cuando selecciona uno en modo existente
  useEffect(() => {
    if (camioneroSeleccionadoId) {
      cargarCamionesDeChofer(camioneroSeleccionadoId);
    } else {
      setCamionesDelChofer([]);
    }
  }, [camioneroSeleccionadoId]);

  const cargarCamioneros = async () => {
    try {
      let { data, error } = await supabase
        .from("camioneros")
        .select("id, nombre, cedula, telefono, perfil_id")
        .order("nombre", { ascending: true });

      if (error || !data) {
        // Fallback a perfiles si la tabla camioneros no existe aún
        const { data: pData } = await supabase
          .from("perfiles")
          .select("id, nombre, cedula")
          .eq("rol", "camionero");

        data = (pData || []).map((p) => ({
          id: p.id,
          nombre: p.nombre,
          cedula: p.cedula,
          telefono: "",
          perfil_id: p.id,
        }));
      }

      setListaCamioneros(data || []);
      if (data && data.length > 0 && !camioneroSeleccionadoId) {
        setCamioneroSeleccionadoId(data[0].id);
      }
    } catch (err) {
      console.error("Error al cargar camioneros:", err);
    }
  };

  const cargarCamionesDeChofer = async (choferId) => {
    try {
      const choferObj = listaCamioneros.find((c) => String(c.id) === String(choferId));
      let query = supabase.from("camiones").select("id, placa, capacidad, modelo");

      if (choferObj?.perfil_id) {
        query = query.or(`camionero_id.eq.${choferId},perfil_id.eq.${choferObj.perfil_id}`);
      } else {
        query = query.eq("camionero_id", choferId);
      }

      const { data, error } = await query;
      if (!error && data) {
        setCamionesDelChofer(data);
      } else {
        setCamionesDelChofer([]);
      }
    } catch (err) {
      setCamionesDelChofer([]);
    }
  };

  // Manejo de camiones dinámicos para nuevo chofer
  const agregarFilaCamion = () => {
    setCamionesNuevos((prev) => [
      ...prev,
      { id: Date.now(), placa: "", capacidad: "", modelo: "" },
    ]);
  };

  const eliminarFilaCamion = (id) => {
    if (camionesNuevos.length <= 1) return;
    setCamionesNuevos((prev) => prev.filter((c) => c.id !== id));
  };

  const actualizarFilaCamion = (id, campo, valor) => {
    setCamionesNuevos((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c))
    );
  };

  const handleRegistrar = async (e) => {
    e.preventDefault();
    setLoading(true);

    const regexPlaca = /^[A-Z0-9]{5,8}$/;

    // Validaciones si el rol es Camionero
    if (rol === "camionero") {
      if (modoCamionero === "nuevo") {
        for (let i = 0; i < camionesNuevos.length; i++) {
          const t = camionesNuevos[i];
          const placaLimpia = t.placa.trim().toUpperCase();
          if (!regexPlaca.test(placaLimpia)) {
            alert(`Placa del Camión #${i + 1} inválida (${t.placa}). Debe tener entre 5 y 8 letras y números sin guiones.`);
            setLoading(false);
            return;
          }
          if (!t.capacidad || parseInt(t.capacidad, 10) <= 0) {
            alert(`Indica una capacidad en litros válida para el Camión #${i + 1}.`);
            setLoading(false);
            return;
          }
          if (!t.modelo.trim()) {
            alert(`Indica el modelo del Camión #${i + 1}.`);
            setLoading(false);
            return;
          }
        }
      } else if (modoCamionero === "existente" && deseaAgregarCamionExtra) {
        const extraPlacaLimpia = extraPlaca.trim().toUpperCase();
        if (!regexPlaca.test(extraPlacaLimpia)) {
          alert(`Placa adicional inválida (${extraPlaca}). Debe tener entre 5 y 8 caracteres.`);
          setLoading(false);
          return;
        }
        if (!extraCapacidad || parseInt(extraCapacidad, 10) <= 0) {
          alert("Indica una capacidad en litros válida para el camión adicional.");
          setLoading(false);
          return;
        }
      }
    }

    try {
      // 1. Crear usuario en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: password.trim(),
      });

      if (authError) {
        alert(`Error en Autenticación: ${authError.message}`);
        setLoading(false);
        return;
      }

      if (authData?.user) {
        const userId = authData.user.id;
        const perfilBase = {
          id: userId,
          cedula: cedula.trim(),
          nombre: nombre.trim(),
          email: email.trim(),
          rol,
          activo: true,
        };

        // 2. Guardar perfil de usuario
        let { error: profileError } = await supabase
          .from("perfiles")
          .insert([{ ...perfilBase, password: password.trim() }]);

        if (profileError && (profileError.code === "PGRST204" || profileError.message.includes("password"))) {
          const { error: fallbackError } = await supabase.from("perfiles").insert([perfilBase]);
          profileError = fallbackError;
        }

        if (profileError) {
          throw profileError;
        }

        // 3. Si el rol es Camionero, gestionar tabla camioneros y camiones
        if (rol === "camionero") {
          let camioneroIdFinal = null;

          if (modoCamionero === "existente") {
            camioneroIdFinal = camioneroSeleccionadoId;

            // Vincular el camionero existente con este perfil_id
            try {
              await supabase
                .from("camioneros")
                .update({ perfil_id: userId })
                .eq("id", camioneroSeleccionadoId);
            } catch (errCamioneroLink) {
              console.warn("Fallo al actualizar perfil_id en camioneros:", errCamioneroLink);
            }

            // Actualizar todos los camiones existentes de este chofer para sincronizar perfil_id
            try {
              await supabase
                .from("camiones")
                .update({ perfil_id: userId })
                .eq("camionero_id", camioneroSeleccionadoId);
            } catch (errCamionesLink) {
              console.warn("Fallo al actualizar camiones con perfil_id:", errCamionesLink);
            }

            // Si además agregó un camión extra
            if (deseaAgregarCamionExtra && extraPlaca.trim()) {
              const payloadExtra = {
                placa: extraPlaca.trim().toUpperCase(),
                chofer: nombre.trim(),
                capacidad: parseInt(extraCapacidad, 10),
                modelo: extraModelo.trim(),
                camionero_id: camioneroIdFinal,
                perfil_id: userId,
              };

              let { error: errExtra } = await supabase.from("camiones").insert([payloadExtra]);
              if (errExtra && (errExtra.code === "PGRST204" || errExtra.message.includes("camionero_id"))) {
                delete payloadExtra.camionero_id;
                await supabase.from("camiones").insert([payloadExtra]);
              }
            }
          } else {
            // Modo nuevo chofer desde cero
            // A. Insertar en tabla camioneros
            try {
              const { data: newCamionero, error: errNewCam } = await supabase
                .from("camioneros")
                .insert([
                  {
                    nombre: nombre.trim(),
                    cedula: cedula.trim(),
                    telefono: telefonoChofer.trim() || null,
                    perfil_id: userId,
                  },
                ])
                .select("id")
                .single();

              if (!errNewCam && newCamionero) {
                camioneroIdFinal = newCamionero.id;
              }
            } catch (errInsertCamionero) {
              console.warn("Fallo al insertar en camioneros:", errInsertCamionero);
            }

            // B. Insertar cada camión registrado en la lista
            for (const t of camionesNuevos) {
              const truckPayload = {
                placa: t.placa.trim().toUpperCase(),
                chofer: nombre.trim(),
                capacidad: parseInt(t.capacidad, 10),
                modelo: t.modelo.trim(),
                perfil_id: userId,
              };

              if (camioneroIdFinal) truckPayload.camionero_id = camioneroIdFinal;

              let { error: errTruck } = await supabase.from("camiones").insert([truckPayload]);
              if (errTruck && (errTruck.code === "PGRST204" || errTruck.message.includes("camionero_id"))) {
                delete truckPayload.camionero_id;
                await supabase.from("camiones").insert([truckPayload]);
              }
            }
          }
        }

        const totalCamionesMsg =
          rol === "camionero"
            ? modoCamionero === "nuevo"
              ? ` con ${camionesNuevos.length} camión(es) registrado(s)`
              : ` vinculado a sus camiones cisterna`
            : "";

        alert(`🎉 ¡Usuario "${nombre}" registrado exitosamente como ${rol}${totalCamionesMsg}!`);
        limpiarFormulario();
      }
    } catch (error) {
      console.error("Error al registrar usuario:", error);
      alert(`Ocurrió un error al registrar el usuario: ${error.message || "Error desconocido"}`);
    } finally {
      setLoading(false);
    }
  };

  const limpiarFormulario = () => {
    setNombre("");
    setCedula("");
    setEmail("");
    setPassword("");
    setRol("administrador");
    setModoCamionero("nuevo");
    setTelefonoChofer("");
    setCamionesNuevos([{ id: 1, placa: "", capacidad: "", modelo: "" }]);
    setDeseaAgregarCamionExtra(false);
    setExtraPlaca("");
    setExtraCapacidad("");
    setExtraModelo("");
    if (onUsuarioRegistrado) onUsuarioRegistrado();
  };

  const choferSeleccionadoObj = listaCamioneros.find(
    (c) => String(c.id) === String(camioneroSeleccionadoId)
  );

  const camionerosFiltrados = listaCamioneros.filter((c) => {
    if (!busquedaChofer.trim()) return true;
    const q = busquedaChofer.toLowerCase().trim();
    return c.nombre?.toLowerCase().includes(q) || c.cedula?.toLowerCase().includes(q);
  });

  return (
    <FormContainer>
      <HeaderGroup>
        <IconBadge>
          <MdPersonAdd />
        </IconBadge>
        <div>
          <h2>Registrar Nuevo Usuario</h2>
          <p className="subtitle">
            Crea accesos de inicio de sesión y asigna unidades cisterna si es chofer
          </p>
        </div>
      </HeaderGroup>

      <FormCard onSubmit={handleRegistrar}>
        {/* DATOS DE LA CUENTA */}
        <InputGrid>
          <FieldBox>
            <label>
              <MdPerson className="field-icon" /> Nombre Completo: <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: Juan Pérez"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox>
            <label>
              <MdBadge className="field-icon" /> Número de Cédula: <span className="req">*</span>
            </label>
            <input
              type="text"
              placeholder="Ej: 12345678"
              value={cedula}
              onChange={(e) => setCedula(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox>
            <label>
              <MdEmail className="field-icon" /> Correo Electrónico: <span className="req">*</span>
            </label>
            <input
              type="email"
              placeholder="Ej: usuario@correo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox>
            <label>
              <MdLock className="field-icon" /> Contraseña de Ingreso: <span className="req">*</span>
            </label>
            <input
              type="password"
              placeholder="Mínimo 6 caracteres"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox style={{ gridColumn: "1 / -1" }}>
            <label>
              <MdWork className="field-icon" /> Rol en el Sistema: <span className="req">*</span>
            </label>
            <select value={rol} onChange={(e) => setRol(e.target.value)}>
              <option value="administrador">👑 Administrador del Pozo</option>
              <option value="registrador">💧 Vendedor / Recargador (Solo Despacho y Camiones)</option>
              <option value="camionero">🚚 Chofer de Cisterna (Gestión de Camiones)</option>
            </select>
          </FieldBox>
        </InputGrid>

        {/* 🚚 SECCIÓN DINÁMICA CUANDO EL ROL ES CAMIONERO */}
        {rol === "camionero" && (
          <CamioneroWrapper>
            <SectionHeader>
              <div className="icon">
                <MdLocalShipping />
              </div>
              <div>
                <h4>Asignación de Unidades Cisterna</h4>
                <p>
                  Un chofer puede tener uno o varios camiones asignados. Elige si vinculas a un chofer
                  existente o registras sus camiones desde cero.
                </p>
              </div>
            </SectionHeader>

            {/* SELECTOR DE MODO */}
            <ModeGrid>
              <ModeCard
                type="button"
                $active={modoCamionero === "nuevo"}
                onClick={() => setModoCamionero("nuevo")}
              >
                <div className="check-bullet">{modoCamionero === "nuevo" && "✓"}</div>
                <div>
                  <strong>➕ Registrar Nuevo Chofer y Camiones</strong>
                  <span>Crea el chofer con sus camiones cisterna en el sistema</span>
                </div>
              </ModeCard>

              <ModeCard
                type="button"
                $active={modoCamionero === "existente"}
                onClick={() => setModoCamionero("existente")}
              >
                <div className="check-bullet">{modoCamionero === "existente" && "✓"}</div>
                <div>
                  <strong>📋 Vincular a Chofer ya Registrado</strong>
                  <span>Conecta este usuario a camiones previamente cargados</span>
                </div>
              </ModeCard>
            </ModeGrid>

            {/* MODO A: NUEVO CHOFER CON CAMIONES DINÁMICOS */}
            {modoCamionero === "nuevo" && (
              <BoxContent>
                <FieldBox style={{ marginBottom: "16px" }}>
                  <label>
                    <MdPhone className="field-icon" /> Teléfono del Chofer:
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 0414-5556677"
                    value={telefonoChofer}
                    onChange={(e) => setTelefonoChofer(e.target.value)}
                  />
                </FieldBox>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <SubTitleSection>
                    <MdLocalShipping /> Camiones Cisterna a Vincular ({camionesNuevos.length})
                  </SubTitleSection>
                  <BotonAgregarCamion type="button" onClick={agregarFilaCamion}>
                    <MdAddCircleOutline /> ➕ Agregar otro camión
                  </BotonAgregarCamion>
                </div>

                {camionesNuevos.map((cam, idx) => (
                  <TruckCardItem key={cam.id}>
                    <div className="truck-header">
                      <span className="badge-num">Unidad #{idx + 1}</span>
                      {camionesNuevos.length > 1 && (
                        <button
                          type="button"
                          className="btn-del"
                          onClick={() => eliminarFilaCamion(cam.id)}
                          title="Eliminar este camión"
                        >
                          <MdDeleteOutline /> Quitar
                        </button>
                      )}
                    </div>

                    <TruckInputsGrid>
                      <FieldBox>
                        <label>
                          <MdConfirmationNumber className="field-icon" /> Placa: <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: ASD344"
                          maxLength={8}
                          value={cam.placa}
                          onChange={(e) => actualizarFilaCamion(cam.id, "placa", e.target.value)}
                          style={{ textTransform: "uppercase", fontWeight: "700", letterSpacing: "1px" }}
                          required
                        />
                      </FieldBox>

                      <FieldBox>
                        <label>
                          <MdWaterDrop className="field-icon" /> Capacidad (Litros): <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: 10000"
                          value={cam.capacidad}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === "" || /^[0-9\b]+$/.test(val)) {
                              actualizarFilaCamion(cam.id, "capacidad", val);
                            }
                          }}
                          required
                        />
                      </FieldBox>

                      <FieldBox style={{ gridColumn: "1 / -1" }}>
                        <label>
                          <MdLocalShipping className="field-icon" /> Modelo del Camión: <span className="req">*</span>
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: Mack Granite / Ford Cargo 1721"
                          value={cam.modelo}
                          onChange={(e) => actualizarFilaCamion(cam.id, "modelo", e.target.value)}
                          required
                        />
                      </FieldBox>
                    </TruckInputsGrid>
                  </TruckCardItem>
                ))}
              </BoxContent>
            )}

            {/* MODO B: VINCULAR A CHOFER EXISTENTE */}
            {modoCamionero === "existente" && (
              <BoxContent>
                <FieldBox style={{ marginBottom: "16px" }}>
                  <label>
                    <MdPerson className="field-icon" /> Selecciona el Chofer Registrado:
                  </label>

                  {listaCamioneros.length === 0 ? (
                    <div style={{ color: "#fef08a", fontSize: "12px", background: "rgba(234, 179, 8, 0.1)", padding: "10px", borderRadius: "8px" }}>
                      No se encontraron choferes previos. Utiliza la opción <strong>➕ Registrar Nuevo Chofer y Camiones</strong> para crear uno nuevo.
                    </div>
                  ) : (
                    <>
                      <SearchInputWrapper>
                        <MdSearch className="search-icon" />
                        <input
                          type="text"
                          placeholder="Buscar por nombre o cédula..."
                          value={busquedaChofer}
                          onChange={(e) => setBusquedaChofer(e.target.value)}
                        />
                      </SearchInputWrapper>

                      <select
                        value={camioneroSeleccionadoId}
                        onChange={(e) => setCamioneroSeleccionadoId(e.target.value)}
                        required
                      >
                        {camionerosFiltrados.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.nombre} {c.cedula ? `— CI: ${c.cedula}` : ""}
                          </option>
                        ))}
                      </select>
                    </>
                  )}
                </FieldBox>

                {choferSeleccionadoObj && (
                  <ChoferPreviewCard>
                    <div className="head">
                      <strong>Camiones actuales asignados a este chofer:</strong>
                    </div>

                    {camionesDelChofer.length === 0 ? (
                      <div className="empty">Este chofer aún no tiene camiones asignados.</div>
                    ) : (
                      <div className="trucks-list">
                        {camionesDelChofer.map((c) => (
                          <div key={c.id} className="truck-chip">
                            <MdLocalShipping /> <strong>{c.placa}</strong> — {c.capacidad?.toLocaleString()} Lts ({c.modelo || "Sin modelo"})
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Opción de registrar un camión adicional al momento */}
                    <ExtraTruckToggle>
                      <label>
                        <input
                          type="checkbox"
                          checked={deseaAgregarCamionExtra}
                          onChange={(e) => setDeseaAgregarCamionExtra(e.target.checked)}
                        />
                        <span>➕ Deseo registrar un nuevo camión adicional para este chofer</span>
                      </label>
                    </ExtraTruckToggle>

                    {deseaAgregarCamionExtra && (
                      <ExtraTruckBox>
                        <TruckInputsGrid>
                          <FieldBox>
                            <label>Placa Adicional: <span className="req">*</span></label>
                            <input
                              type="text"
                              placeholder="Ej: ABC789"
                              maxLength={8}
                              value={extraPlaca}
                              onChange={(e) => setExtraPlaca(e.target.value)}
                              style={{ textTransform: "uppercase" }}
                              required={deseaAgregarCamionExtra}
                            />
                          </FieldBox>

                          <FieldBox>
                            <label>Capacidad (Lts): <span className="req">*</span></label>
                            <input
                              type="text"
                              placeholder="Ej: 10000"
                              value={extraCapacidad}
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === "" || /^[0-9\b]+$/.test(val)) setExtraCapacidad(val);
                              }}
                              required={deseaAgregarCamionExtra}
                            />
                          </FieldBox>

                          <FieldBox style={{ gridColumn: "1 / -1" }}>
                            <label>Modelo del Camión: <span className="req">*</span></label>
                            <input
                              type="text"
                              placeholder="Ej: Ford Cargo"
                              value={extraModelo}
                              onChange={(e) => setExtraModelo(e.target.value)}
                              required={deseaAgregarCamionExtra}
                            />
                          </FieldBox>
                        </TruckInputsGrid>
                      </ExtraTruckBox>
                    )}
                  </ChoferPreviewCard>
                )}
              </BoxContent>
            )}
          </CamioneroWrapper>
        )}

        <SubmitBtn type="submit" disabled={loading}>
          {loading ? "Registrando Usuario y Unidades..." : "Registrar Usuario"}
        </SubmitBtn>
      </FormCard>
    </FormContainer>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC
const FormContainer = styled.div`
  max-width: 750px;
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

const InputGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
`;

const FieldBox = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

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

const CamioneroWrapper = styled.div`
  background: rgba(15, 23, 42, 0.5);
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 18px;
  padding: 22px;
  margin-bottom: 24px;
  animation: fadeIn 0.3s ease;
`;

const SectionHeader = styled.div`
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 18px;

  .icon {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: rgba(0, 195, 255, 0.15);
    color: #00c3ff;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;
  }

  h4 {
    color: #ffffff;
    font-size: 16px;
    font-weight: 700;
    margin: 0 0 4px 0;
  }

  p {
    color: #94a3b8;
    font-size: 12px;
    margin: 0;
    line-height: 1.4;
  }
`;

const ModeGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 20px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const ModeCard = styled.button`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  border-radius: 14px;
  border: 1px solid ${(props) => (props.$active ? "#00c3ff" : "rgba(255, 255, 255, 0.08)")};
  background: ${(props) =>
    props.$active ? "rgba(0, 195, 255, 0.12)" : "rgba(15, 23, 42, 0.6)"};
  color: #ffffff;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s ease;

  .check-bullet {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 2px solid ${(props) => (props.$active ? "#00c3ff" : "#64748b")};
    background: ${(props) => (props.$active ? "#00c3ff" : "transparent")};
    color: #0b0f19;
    font-weight: 900;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  strong {
    display: block;
    font-size: 13px;
    color: ${(props) => (props.$active ? "#38bdf8" : "#ffffff")};
  }

  span {
    display: block;
    font-size: 11px;
    color: #94a3b8;
    margin-top: 2px;
  }

  &:hover {
    border-color: #00c3ff;
  }
`;

const BoxContent = styled.div`
  background: rgba(11, 15, 25, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 18px;
`;

const SubTitleSection = styled.div`
  color: #38bdf8;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 6px;
`;

const BotonAgregarCamion = styled.button`
  background: rgba(0, 195, 255, 0.15);
  border: 1px solid rgba(0, 195, 255, 0.35);
  color: #38bdf8;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 195, 255, 0.3);
  }
`;

const TruckCardItem = styled.div`
  background: rgba(21, 28, 45, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 14px;
  margin-bottom: 12px;

  .truck-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .badge-num {
      background: rgba(0, 195, 255, 0.2);
      color: #38bdf8;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .btn-del {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.3);
      color: #ef4444;
      padding: 3px 8px;
      border-radius: 6px;
      font-size: 11px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;

      &:hover {
        background: rgba(239, 68, 68, 0.3);
      }
    }
  }
`;

const TruckInputsGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
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
    padding: 9px 12px 9px 36px !important;
    font-size: 13px !important;
  }
`;

const ChoferPreviewCard = styled.div`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(0, 195, 255, 0.2);
  border-radius: 12px;
  padding: 14px;

  .head {
    font-size: 12px;
    color: #cbd5e1;
    margin-bottom: 8px;
  }

  .empty {
    font-size: 12px;
    color: #94a3b8;
    font-style: italic;
  }

  .trucks-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 12px;
  }

  .truck-chip {
    background: rgba(0, 195, 255, 0.15);
    border: 1px solid rgba(0, 195, 255, 0.3);
    color: #ffffff;
    font-size: 12px;
    padding: 6px 10px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

const ExtraTruckToggle = styled.div`
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #38bdf8;
    cursor: pointer;
    font-weight: 500;

    input {
      width: auto;
      cursor: pointer;
    }
  }
`;

const ExtraTruckBox = styled.div`
  margin-top: 12px;
  background: rgba(11, 15, 25, 0.5);
  padding: 12px;
  border-radius: 10px;
  border: 1px dashed rgba(0, 195, 255, 0.3);
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
