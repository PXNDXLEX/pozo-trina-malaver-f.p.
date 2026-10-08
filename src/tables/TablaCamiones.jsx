import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase.config";
import styled from "styled-components";
import {
  MdLocalShipping,
  MdConfirmationNumber,
  MdPerson,
  MdWaterDrop,
  MdEdit,
  MdDelete,
  MdSave,
  MdClose,
  MdSearch,
  MdFilterList,
  MdAddCircleOutline,
  MdCheckCircle,
  MdWarning,
  MdDirectionsCar,
  MdPhone,
  MdBadge,
  MdClear,
  MdSwapHoriz,
  MdLink,
  MdLinkOff,
  MdPersonAdd,
} from "react-icons/md";

export function TablaCamiones() {
  const [datos, setDatos] = useState([]);
  const [listaCamioneros, setListaCamioneros] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros y Búsqueda
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("todos"); // "todos" | "con_chofer" | "sin_chofer"

  // Modal para Crear o Modificar Camión
  const [modalAbierto, setModalAbierto] = useState(false);
  const [camionEditando, setCamionEditando] = useState(null); // null = nuevo camión, objeto = editar
  const [modalPlaca, setModalPlaca] = useState("");
  const [modalCapacidad, setModalCapacidad] = useState("");
  const [modalModelo, setModalModelo] = useState("");
  const [modalCamioneroId, setModalCamioneroId] = useState("");
  const [creandoNuevoChofer, setCreandoNuevoChofer] = useState(false);
  const [nuevoChoferNombre, setNuevoChoferNombre] = useState("");
  const [nuevoChoferCedula, setNuevoChoferCedula] = useState("");
  const [nuevoChoferTelefono, setNuevoChoferTelefono] = useState("");
  const [guardando, setGuardando] = useState(false);

  // Presets rápidos de capacidad
  const PRESETS_CAPACIDAD = [5000, 10000, 12000, 15000, 20000, 30000, 35000];

  const consultar = async () => {
    setLoading(true);
    try {
      // Auto-limpieza de seguridad: si un camión está marcado "Sin Asignar", limpiar camionero_id y perfil_id residuales
      try {
        await supabase
          .from("camiones")
          .update({ camionero_id: null, perfil_id: null, chofer: "Sin Asignar" })
          .ilike("chofer", "%sin%")
          .not("camionero_id", "is", null);
      } catch (eClean) {
        console.warn("Auto-clean en camiones:", eClean);
      }

      const [resCamiones, resCamioneros] = await Promise.all([
        supabase.from("camiones").select("*").order("id", { ascending: false }),
        supabase.from("camioneros").select("id, nombre, cedula, telefono, perfil_id").order("nombre", { ascending: true }),
      ]);

      if (!resCamiones.error && resCamiones.data) {
        // Auto-sincronización: asegurar que cada camión con chofer tenga el perfil_id y chofer de su chofer asignado
        const choferesMap = new Map((resCamioneros.data || []).map((c) => [String(c.id), c]));
        for (const cam of resCamiones.data) {
          if (cam.camionero_id) {
            const ch = choferesMap.get(String(cam.camionero_id));
            if (ch) {
              const expectedPerfil = ch.perfil_id || null;
              const expectedChofer = ch.nombre || "Sin Asignar";
              if (cam.perfil_id !== expectedPerfil || cam.chofer !== expectedChofer) {
                cam.perfil_id = expectedPerfil;
                cam.chofer = expectedChofer;
                supabase
                  .from("camiones")
                  .update({ perfil_id: expectedPerfil, chofer: expectedChofer })
                  .eq("id", cam.id)
                  .then(() => {})
                  .catch((eAlign) => console.warn("Error al alinear camión:", eAlign));
              }
            }
          }
        }
        setDatos(resCamiones.data);
      }
      if (!resCamioneros.error && resCamioneros.data) {
        setListaCamioneros(resCamioneros.data);
      }
    } catch (err) {
      console.error("Error al consultar datos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    consultar();
  }, []);

  // Eliminar camión
  const handleEliminar = async (id, placa, chofer) => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar la unidad cisterna ${placa} (${chofer || "Sin Chofer"})?`);
    if (!confirmar) return;

    const { error } = await supabase.from("camiones").delete().eq("id", id);

    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      alert("✅ Camión eliminado de la base de datos.");
      consultar();
    }
  };

  // Abrir modal en modo edición
  const abrirModalEditar = (camion) => {
    setCamionEditando(camion);
    setModalPlaca(camion.placa || "");
    setModalCapacidad(camion.capacidad || "");
    setModalModelo(camion.modelo || "");

    // Buscar si ya tiene camionero_id, perfil_id o si coincide por nombre
    let chId = "";
    if (camion.camionero_id) {
      chId = String(camion.camionero_id);
    } else if (camion.perfil_id) {
      const match = listaCamioneros.find((c) => c.perfil_id === camion.perfil_id);
      if (match) chId = String(match.id);
    } else if (camion.chofer) {
      const match = listaCamioneros.find(
        (c) => c.nombre?.trim().toLowerCase() === camion.chofer?.trim().toLowerCase()
      );
      if (match) chId = String(match.id);
    }

    setModalCamioneroId(chId);
    setCreandoNuevoChofer(false);
    setNuevoChoferNombre("");
    setNuevoChoferCedula("");
    setNuevoChoferTelefono("");
    setModalAbierto(true);
  };

  // Abrir modal en modo crear nuevo
  const abrirModalCrear = () => {
    setCamionEditando(null);
    setModalPlaca("");
    setModalCapacidad(10000);
    setModalModelo("");
    setModalCamioneroId("");
    setCreandoNuevoChofer(false);
    setNuevoChoferNombre("");
    setNuevoChoferCedula("");
    setNuevoChoferTelefono("");
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCamionEditando(null);
    setGuardando(false);
  };

  // Guardar creación o edición
  const handleGuardarModalCamion = async (e) => {
    e.preventDefault();
    setGuardando(true);

    const regexPlaca = /^[A-Z0-9]{5,8}$/;
    const placaLimpia = (modalPlaca || "").trim().toUpperCase();

    if (!regexPlaca.test(placaLimpia)) {
      alert(`La placa "${modalPlaca}" es inválida. Debe tener entre 5 y 8 caracteres alfanuméricos sin espacios ni guiones.`);
      setGuardando(false);
      return;
    }

    const capNum = parseFloat(modalCapacidad);
    if (!capNum || capNum <= 0) {
      alert("Por favor indica una capacidad en litros válida (mayor a 0).");
      setGuardando(false);
      return;
    }

    if (!modalModelo || !modalModelo.trim()) {
      alert("Por favor indica el modelo o marca del camión.");
      setGuardando(false);
      return;
    }

    // 🔒 Verificar que la placa no esté en uso por otro camión
    try {
      let queryUnica = supabase
        .from("camiones")
        .select("id, placa, chofer")
        .eq("placa", placaLimpia);

      if (camionEditando) {
        queryUnica = queryUnica.neq("id", camionEditando.id);
      }

      const { data: placaExistente } = await queryUnica.maybeSingle();

      if (placaExistente) {
        alert(`⚠️ ¡Error! La placa "${placaLimpia}" ya pertenece a otro camión (${placaExistente.chofer || "otro chofer"}). Las placas deben ser únicas.`);
        setGuardando(false);
        return;
      }
    } catch (errCheck) {
      console.warn("Error al verificar placa única:", errCheck);
    }

    try {
      let finalCamioneroId = null;
      let finalChoferNombre = "Sin Asignar";
      let finalPerfilId = null;

      // 1. Si está creando un nuevo chofer en el pozo
      if (creandoNuevoChofer) {
        if (!nuevoChoferNombre.trim()) {
          alert("Indica el nombre del nuevo chofer.");
          setGuardando(false);
          return;
        }

        const { data: nuevoC, error: errC } = await supabase
          .from("camioneros")
          .insert([
            {
              nombre: nuevoChoferNombre.trim(),
              cedula: nuevoChoferCedula.trim() || null,
              telefono: nuevoChoferTelefono.trim() || null,
            },
          ])
          .select("id, nombre")
          .single();

        if (errC) throw errC;
        finalCamioneroId = nuevoC.id;
        finalChoferNombre = nuevoC.nombre;
      } else if (modalCamioneroId) {
        // Chofer existente seleccionado
        const cObj = listaCamioneros.find((c) => String(c.id) === String(modalCamioneroId));
        if (cObj) {
          finalCamioneroId = cObj.id;
          finalChoferNombre = cObj.nombre;
          finalPerfilId = cObj.perfil_id || null;
        }
      }

      const payload = {
        placa: placaLimpia,
        capacidad: capNum,
        modelo: modalModelo.trim(),
        chofer: finalChoferNombre,
        camionero_id: finalCamioneroId,
        perfil_id: finalPerfilId,
      };

      if (camionEditando) {
        // ACTUALIZAR
        const { error: errUpdate } = await supabase
          .from("camiones")
          .update(payload)
          .eq("id", camionEditando.id);

        if (errUpdate) throw errUpdate;
        alert(`🎉 ¡Camión "${placaLimpia}" actualizado con éxito!`);
      } else {
        // CREAR NUEVO CAMIÓN
        const { error: errInsert } = await supabase
          .from("camiones")
          .insert([payload]);

        if (errInsert) throw errInsert;
        alert(`🎉 ¡Camión "${placaLimpia}" registrado con éxito!`);
      }

      cerrarModal();
      consultar();
    } catch (err) {
      console.error("Error al guardar camión:", err);
      alert(`Error al guardar: ${err.message || "Error desconocido"}`);
    } finally {
      setGuardando(false);
    }
  };

  // Helper para obtener datos completos del chofer
  const getChoferInfo = (camion) => {
    const choferStr = (camion.chofer || "").trim().toLowerCase();
    const esTextoSin = !choferStr || choferStr.includes("sin");

    if (camion.camionero_id && !esTextoSin) {
      const match = listaCamioneros.find((c) => String(c.id) === String(camion.camionero_id));
      if (match) return match;
    }
    if (camion.perfil_id && !esTextoSin) {
      const match = listaCamioneros.find((c) => c.perfil_id === camion.perfil_id);
      if (match) return match;
    }
    if (!esTextoSin) {
      const match = listaCamioneros.find(
        (c) => c.nombre?.trim().toLowerCase() === choferStr
      );
      if (match) return match;
    }
    return null;
  };

  // Helper para saber si un camión tiene chofer legítimo asignado
  const tieneChoferAsignado = (camion) => {
    const info = getChoferInfo(camion);
    const choferStr = (camion.chofer || "").trim().toLowerCase();
    const esTextoSin = !choferStr || choferStr.includes("sin");
    return Boolean(info || !esTextoSin);
  };

  // Cálculo de Métricas KPI
  const totalCamiones = datos.length;
  const capacidadTotalFlota = datos.reduce((acc, c) => acc + (parseFloat(c.capacidad) || 0), 0);
  const conChoferCount = datos.filter((c) => tieneChoferAsignado(c)).length;
  const sinChoferCount = totalCamiones - conChoferCount;

  // Filtrado de datos
  const datosFiltrados = datos.filter((c) => {
    const choferInfo = getChoferInfo(c);
    const tieneChofer = tieneChoferAsignado(c);

    if (filtroEstado === "con_chofer" && !tieneChofer) return false;
    if (filtroEstado === "sin_chofer" && tieneChofer) return false;

    if (busqueda.trim() !== "") {
      const q = busqueda.trim().toLowerCase();
      const placa = (c.placa || "").toLowerCase();
      const chofer = (c.chofer || "").toLowerCase();
      const modelo = (c.modelo || "").toLowerCase();
      const choferNombre = (choferInfo?.nombre || "").toLowerCase();
      const choferCedula = (choferInfo?.cedula || "").toLowerCase();
      const choferTelefono = (choferInfo?.telefono || "").toLowerCase();

      return (
        placa.includes(q) ||
        chofer.includes(q) ||
        modelo.includes(q) ||
        choferNombre.includes(q) ||
        choferCedula.includes(q) ||
        choferTelefono.includes(q)
      );
    }

    return true;
  });

  return (
    <Container>
      {/* 🚀 HEADER CON TÍTULO Y BOTÓN DE REGISTRO RÁPIDO */}
      <HeaderSection>
        <TitleGroup>
          <IconBadge>
            <MdLocalShipping />
          </IconBadge>
          <div>
            <h2>Lista de Camiones Cisterna</h2>
            <p className="subtitle">Consulta, edita y gestiona las unidades de transporte y sus choferes asignados</p>
          </div>
        </TitleGroup>

        <BtnNuevoCamion type="button" onClick={abrirModalCrear}>
          <MdAddCircleOutline /> Registrar Nueva Cisterna
        </BtnNuevoCamion>
      </HeaderSection>

      {/* 📊 KPI STATS CARDS */}
      <StatsRow>
        <StatCard>
          <div className="stat-icon-wrapper cyan">
            <MdLocalShipping />
          </div>
          <div className="stat-info">
            <span className="stat-label">Total Unidades</span>
            <span className="stat-val">{totalCamiones}</span>
          </div>
        </StatCard>

        <StatCard>
          <div className="stat-icon-wrapper blue">
            <MdWaterDrop />
          </div>
          <div className="stat-info">
            <span className="stat-label">Capacidad de Flota</span>
            <span className="stat-val">{capacidadTotalFlota.toLocaleString()} Lts</span>
          </div>
        </StatCard>

        <StatCard>
          <div className="stat-icon-wrapper green">
            <MdCheckCircle />
          </div>
          <div className="stat-info">
            <span className="stat-label">Con Chofer Asignado</span>
            <span className="stat-val">{conChoferCount}</span>
          </div>
        </StatCard>

        <StatCard>
          <div className="stat-icon-wrapper amber">
            <MdWarning />
          </div>
          <div className="stat-info">
            <span className="stat-label">Sin Chofer (Libres)</span>
            <span className="stat-val">{sinChoferCount}</span>
          </div>
        </StatCard>
      </StatsRow>

      {/* 🔍 BARRA DE BÚSQUEDA Y FILTROS */}
      <SearchFilterBar>
        <SearchInputBox>
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Buscar por placa, nombre de chofer o modelo..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
          {busqueda && (
            <button className="clear-btn" onClick={() => setBusqueda("")} title="Limpiar búsqueda">
              <MdClear />
            </button>
          )}
        </SearchInputBox>

        <FilterButtonGroup>
          <FilterBtn
            $active={filtroEstado === "todos"}
            onClick={() => setFiltroEstado("todos")}
          >
            Todos ({totalCamiones})
          </FilterBtn>
          <FilterBtn
            $active={filtroEstado === "con_chofer"}
            onClick={() => setFiltroEstado("con_chofer")}
          >
            Con Chofer ({conChoferCount})
          </FilterBtn>
          <FilterBtn
            $active={filtroEstado === "sin_chofer"}
            onClick={() => setFiltroEstado("sin_chofer")}
          >
            Sin Chofer ({sinChoferCount})
          </FilterBtn>
        </FilterButtonGroup>
      </SearchFilterBar>

      {loading ? (
        <LoadingState>Cargando unidades cisterna y choferes...</LoadingState>
      ) : datosFiltrados.length === 0 ? (
        <EmptyStateBox>
          <div className="empty-icon">
            <MdLocalShipping />
          </div>
          <h3>No se encontraron camiones cisterna</h3>
          <p>
            {busqueda || filtroEstado !== "todos"
              ? "No hay resultados que coincidan con los criterios de búsqueda aplicados."
              : "Aún no hay camiones registrados en el pozo. Registra el primero para comenzar."}
          </p>
          {busqueda && (
            <button className="btn-reset" onClick={() => { setBusqueda(""); setFiltroEstado("todos"); }}>
              <MdClear /> Limpiar Filtros
            </button>
          )}
        </EmptyStateBox>
      ) : (
        <>
          {/* 🖥️ TABLA DESKTOP */}
          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th><MdConfirmationNumber className="th-icon" /> Placa</th>
                  <th><MdDirectionsCar className="th-icon" /> Modelo / Marca</th>
                  <th><MdWaterDrop className="th-icon" /> Capacidad</th>
                  <th><MdPerson className="th-icon" /> Chofer Asignado</th>
                  <th style={{ textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datosFiltrados.map((camion) => {
                  const choferInfo = getChoferInfo(camion);
                  const tieneChofer = choferInfo || (camion.chofer && !camion.chofer.toLowerCase().includes("sin"));

                  return (
                    <tr key={camion.id}>
                      {/* PLACA */}
                      <td>
                        <PlacaBadge>
                          <MdConfirmationNumber className="badge-plate-icon" />
                          {camion.placa}
                        </PlacaBadge>
                      </td>

                      {/* MODELO */}
                      <td>
                        <ModeloCell>
                          <MdDirectionsCar className="car-icon" />
                          <span>{camion.modelo || "Sin modelo registrado"}</span>
                        </ModeloCell>
                      </td>

                      {/* CAPACIDAD */}
                      <td>
                        <CapacidadPill>
                          <MdWaterDrop className="drop-icon" />
                          <strong>{Number(camion.capacidad).toLocaleString()}</strong> Lts
                        </CapacidadPill>
                      </td>

                      {/* CHOFER ASIGNADO */}
                      <td>
                        {tieneChofer ? (
                          <ChoferCell>
                            <div className="avatar-chip">
                              <MdPerson />
                            </div>
                            <div className="chofer-data">
                              <span className="chofer-name">
                                {choferInfo ? choferInfo.nombre : camion.chofer}
                              </span>
                              {choferInfo?.cedula && (
                                <span className="chofer-sub">
                                  C.I. {choferInfo.cedula}
                                  {choferInfo.telefono ? ` • 📞 ${choferInfo.telefono}` : ""}
                                </span>
                              )}
                            </div>
                          </ChoferCell>
                        ) : (
                          <SinChoferBadge>
                            <MdWarning /> Sin Chofer Asignado
                          </SinChoferBadge>
                        )}
                      </td>

                      {/* ACCIONES */}
                      <td>
                        <ActionCell>
                          <BtnEdit onClick={() => abrirModalEditar(camion)}>
                            <MdEdit /> Editar
                          </BtnEdit>
                          <BtnDelete onClick={() => handleEliminar(camion.id, camion.placa, camion.chofer)}>
                            <MdDelete /> Eliminar
                          </BtnDelete>
                        </ActionCell>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </StyledTable>
          </TableWrapper>

          {/* 📱 VISTA TARJETAS MOBILE */}
          <CardsWrapper>
            {datosFiltrados.map((camion) => {
              const choferInfo = getChoferInfo(camion);
              const tieneChofer = choferInfo || (camion.chofer && !camion.chofer.toLowerCase().includes("sin"));

              return (
                <CamionCard key={camion.id}>
                  <CardHeader>
                    <PlacaBadge>
                      <MdConfirmationNumber className="badge-plate-icon" />
                      {camion.placa}
                    </PlacaBadge>
                    <CapacidadPill>
                      <MdWaterDrop className="drop-icon" />
                      <strong>{Number(camion.capacidad).toLocaleString()}</strong> Lts
                    </CapacidadPill>
                  </CardHeader>

                  <CardRow>
                    <span className="label"><MdDirectionsCar /> Modelo:</span>
                    <span className="val">{camion.modelo || "Sin modelo registrado"}</span>
                  </CardRow>

                  <CardRow>
                    <span className="label"><MdPerson /> Chofer:</span>
                    <div className="val">
                      {tieneChofer ? (
                        <div style={{ textAlign: "right" }}>
                          <span style={{ fontWeight: "700", color: "#38bdf8", display: "block" }}>
                            {choferInfo ? choferInfo.nombre : camion.chofer}
                          </span>
                          {choferInfo?.cedula && (
                            <small style={{ color: "#94a3b8", fontSize: "11px" }}>
                              C.I. {choferInfo.cedula}
                            </small>
                          )}
                        </div>
                      ) : (
                        <SinChoferBadge style={{ margin: 0 }}>
                          <MdWarning /> Sin Chofer
                        </SinChoferBadge>
                      )}
                    </div>
                  </CardRow>

                  <CardActions>
                    <BtnEdit onClick={() => abrirModalEditar(camion)}>
                      <MdEdit /> Editar
                    </BtnEdit>
                    <BtnDelete onClick={() => handleEliminar(camion.id, camion.placa, camion.chofer)}>
                      <MdDelete /> Eliminar
                    </BtnDelete>
                  </CardActions>
                </CamionCard>
              );
            })}
          </CardsWrapper>
        </>
      )}

      {/* 🚚 MODAL MODERNO PARA MODIFICAR / REGISTRAR CAMIÓN */}
      {modalAbierto && (
        <ModalOverlay onClick={cerrarModal}>
          <ModalContainer onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <div className="title-box">
                <div className="icon-wrapper">
                  <MdLocalShipping />
                </div>
                <div>
                  <h3>{camionEditando ? "Modificar Camión Cisterna" : "Registrar Nueva Unidad Cisterna"}</h3>
                  <p>
                    {camionEditando ? (
                      <>Editando unidad con placa: <strong>{camionEditando.placa}</strong></>
                    ) : (
                      "Ingresa los datos del camión y asígnalo a un chofer registrado en el pozo"
                    )}
                  </p>
                </div>
              </div>
              <button className="close-btn" onClick={cerrarModal} type="button">
                <MdClose />
              </button>
            </ModalHeader>

            <ModalForm onSubmit={handleGuardarModalCamion}>
              <ModalBody>
                {/* 1. DATOS DE LA UNIDAD CISTERNA */}
                <ModalSectionBox>
                  <ModalSectionTitle>
                    <MdLocalShipping /> Datos Técnicos de la Unidad
                  </ModalSectionTitle>

                  <FormGrid>
                    <FormField>
                      <label>Placa de la Unidad: *</label>
                      <input
                        type="text"
                        placeholder="Ej: ABC123"
                        maxLength={8}
                        value={modalPlaca}
                        onChange={(e) => setModalPlaca(e.target.value.toUpperCase())}
                        style={{ textTransform: "uppercase", fontWeight: "700", letterSpacing: "1px" }}
                        required
                      />
                      <small className="field-hint">Entre 5 y 8 caracteres alfanuméricos únicos.</small>
                    </FormField>

                    <FormField>
                      <label>Modelo o Marca: *</label>
                      <input
                        type="text"
                        placeholder="Ej: Ford Cargo 1721 / Mack Granite"
                        value={modalModelo}
                        onChange={(e) => setModalModelo(e.target.value)}
                        required
                      />
                    </FormField>
                  </FormGrid>

                  {/* CAPACIDAD Y PRESETS */}
                  <FormField style={{ marginTop: "14px" }}>
                    <label>Capacidad del Tanque (Litros): *</label>
                    <input
                      type="number"
                      placeholder="Ej: 10000"
                      value={modalCapacidad}
                      onChange={(e) => setModalCapacidad(e.target.value)}
                      required
                    />
                    <PresetLabel>Selección rápida de capacidad:</PresetLabel>
                    <PresetRow>
                      {PRESETS_CAPACIDAD.map((p) => (
                        <PresetChip
                          key={p}
                          type="button"
                          $selected={String(modalCapacidad) === String(p)}
                          onClick={() => setModalCapacidad(p)}
                        >
                          💧 {p.toLocaleString()} L
                        </PresetChip>
                      ))}
                    </PresetRow>
                  </FormField>
                </ModalSectionBox>

                {/* 2. ASIGNACIÓN DEL CHOFER */}
                <ModalSectionBox $highlight>
                  <ModalSectionTitle>
                    <MdPerson /> Chofer Asignado a la Unidad
                  </ModalSectionTitle>

                  {!creandoNuevoChofer ? (
                    <>
                      <FormField>
                        <label>Seleccionar Chofer:</label>
                        <select
                          value={modalCamioneroId}
                          onChange={(e) => setModalCamioneroId(e.target.value)}
                        >
                          <option value="">-- ⚠️ Sin Chofer Asignado (Unidad Libre) --</option>
                          {listaCamioneros.map((ch) => {
                            const cantCamiones = datos.filter((t) => {
                              const choferStr = (t.chofer || "").trim().toLowerCase();
                              if (choferStr.includes("sin")) return false;
                              const matchCamId = t.camionero_id && String(t.camionero_id) === String(ch.id);
                              const matchPerfil = ch.perfil_id && t.perfil_id === ch.perfil_id;
                              const matchNombre = ch.nombre && choferStr === ch.nombre.trim().toLowerCase();
                              return matchCamId || matchPerfil || matchNombre;
                            }).length;

                            return (
                              <option key={ch.id} value={ch.id}>
                                {ch.nombre} {ch.cedula ? `(C.I. ${ch.cedula})` : ""} — {cantCamiones} camión(es)
                              </option>
                            );
                          })}
                        </select>
                      </FormField>

                      {modalCamioneroId && (
                        <ChoferSelectedPreview>
                          {(() => {
                            const ch = listaCamioneros.find((c) => String(c.id) === String(modalCamioneroId));
                            if (!ch) return null;
                            return (
                              <>
                                <div className="avatar">
                                  <MdPerson />
                                </div>
                                <div>
                                  <h4>{ch.nombre}</h4>
                                  <p>
                                    C.I.: <strong>{ch.cedula || "No registrada"}</strong> | 
                                    Teléfono: <strong>{ch.telefono || "Sin teléfono"}</strong>
                                  </p>
                                </div>
                              </>
                            );
                          })()}
                        </ChoferSelectedPreview>
                      )}

                      <BtnToggleNuevoChofer
                        type="button"
                        onClick={() => {
                          setCreandoNuevoChofer(true);
                          setModalCamioneroId("");
                        }}
                      >
                        <MdPersonAdd /> ➕ Crear y asignar un nuevo chofer en el pozo
                      </BtnToggleNuevoChofer>
                    </>
                  ) : (
                    /* FORMULARIO RÁPIDO PARA CREAR NUEVO CHOFER */
                    <NuevoChoferBox>
                      <div className="box-top">
                        <span className="tag-new">➕ Creando Nuevo Chofer</span>
                        <button
                          type="button"
                          className="btn-cancel-new"
                          onClick={() => setCreandoNuevoChofer(false)}
                        >
                          <MdClose /> Cancelar y elegir existente
                        </button>
                      </div>

                      <FormGrid $cols={3}>
                        <FormField>
                          <label>Nombre del Chofer: *</label>
                          <input
                            type="text"
                            placeholder="Ej: Carlos Mendoza"
                            value={nuevoChoferNombre}
                            onChange={(e) => setNuevoChoferNombre(e.target.value)}
                            required={creandoNuevoChofer}
                          />
                        </FormField>

                        <FormField>
                          <label>Cédula de Identidad:</label>
                          <input
                            type="text"
                            placeholder="Ej: 14523698"
                            value={nuevoChoferCedula}
                            onChange={(e) => setNuevoChoferCedula(e.target.value)}
                          />
                        </FormField>

                        <FormField>
                          <label>Teléfono de Contacto:</label>
                          <input
                            type="text"
                            placeholder="Ej: 0414-1234567"
                            value={nuevoChoferTelefono}
                            onChange={(e) => setNuevoChoferTelefono(e.target.value)}
                          />
                        </FormField>
                      </FormGrid>
                    </NuevoChoferBox>
                  )}
                </ModalSectionBox>
              </ModalBody>

              <ModalFooter>
                <button type="button" className="btn-cancel" onClick={cerrarModal}>
                  Cancelar
                </button>
                <button type="submit" className="btn-save" disabled={guardando}>
                  {guardando ? "Guardando Unidad..." : (camionEditando ? "💾 Guardar Cambios" : "🚚 Registrar Camión")}
                </button>
              </ModalFooter>
            </ModalForm>
          </ModalContainer>
        </ModalOverlay>
      )}
    </Container>
  );
}

// 🎨 STYLED COMPONENTS MODERNOS GLASSMORPHIC DARK
const Container = styled.div`
  animation: fadeIn 0.3s ease-out;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const HeaderSection = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
`;

const TitleGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;

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

const BtnNuevoCamion = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  border: none;
  color: #ffffff;
  padding: 10px 18px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(0, 195, 255, 0.3);
  transition: all 0.2s ease;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 20px rgba(0, 195, 255, 0.45);
  }
`;

// 📊 KPI ROW
const StatsRow = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;

  @media (max-width: 900px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 500px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.07);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);

  .stat-icon-wrapper {
    width: 44px;
    height: 44px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 22px;
    flex-shrink: 0;

    &.cyan {
      background: rgba(0, 195, 255, 0.15);
      color: #38bdf8;
      border: 1px solid rgba(0, 195, 255, 0.3);
    }
    &.blue {
      background: rgba(59, 130, 246, 0.15);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    &.green {
      background: rgba(16, 185, 129, 0.15);
      color: #34d399;
      border: 1px solid rgba(16, 185, 129, 0.3);
    }
    &.amber {
      background: rgba(245, 158, 11, 0.15);
      color: #fbbf24;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
  }

  .stat-info {
    display: flex;
    flex-direction: column;

    .stat-label {
      font-size: 12px;
      color: #94a3b8;
      font-weight: 500;
    }

    .stat-val {
      font-size: 19px;
      font-weight: 800;
      color: #ffffff;
      margin-top: 2px;
    }
  }
`;

// 🔍 BÚSQUEDA Y FILTROS
const SearchFilterBar = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 14px;
  flex-wrap: wrap;
`;

const SearchInputBox = styled.div`
  position: relative;
  flex: 1;
  min-width: 260px;

  .search-icon {
    position: absolute;
    left: 14px;
    top: 50%;
    transform: translateY(-50%);
    color: #94a3b8;
    font-size: 18px;
  }

  input {
    width: 100%;
    padding: 11px 40px 11px 42px;
    background: rgba(21, 28, 45, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    color: #ffffff;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;
    transition: all 0.2s;

    &:focus {
      border-color: #00c3ff;
      box-shadow: 0 0 15px rgba(0, 195, 255, 0.25);
    }
  }

  .clear-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 18px;
    cursor: pointer;

    &:hover {
      color: #ffffff;
    }
  }
`;

const FilterButtonGroup = styled.div`
  display: flex;
  background: rgba(15, 23, 42, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 4px;
  gap: 4px;
`;

const FilterBtn = styled.button`
  background: ${(props) => (props.$active ? "rgba(0, 195, 255, 0.2)" : "transparent")};
  color: ${(props) => (props.$active ? "#38bdf8" : "#94a3b8")};
  border: ${(props) => (props.$active ? "1px solid rgba(0, 195, 255, 0.4)" : "1px solid transparent")};
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    color: #ffffff;
  }
`;

const LoadingState = styled.div`
  padding: 50px;
  text-align: center;
  color: #94a3b8;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

const EmptyStateBox = styled.div`
  padding: 50px 20px;
  text-align: center;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);

  .empty-icon {
    font-size: 40px;
    color: #475569;
    margin-bottom: 12px;
  }

  h3 {
    color: #ffffff;
    font-size: 16px;
    margin: 0 0 6px 0;
  }

  p {
    color: #94a3b8;
    font-size: 13px;
    margin: 0 0 16px 0;
  }

  .btn-reset {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(0, 195, 255, 0.15);
    border: 1px solid rgba(0, 195, 255, 0.3);
    color: #38bdf8;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
  }
`;

const TableWrapper = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);

  @media (max-width: 768px) {
    display: none;
  }
`;

const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  text-align: left;

  thead {
    background: rgba(15, 23, 42, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    th {
      padding: 16px 20px;
      font-size: 12px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;

      .th-icon {
        vertical-align: middle;
        margin-right: 6px;
        font-size: 16px;
        color: #00c3ff;
      }
    }
  }

  tbody {
    tr {
      border-bottom: 1px solid rgba(255, 255, 255, 0.05);
      transition: background 0.15s ease;

      &:hover {
        background: rgba(255, 255, 255, 0.03);
      }
    }

    td {
      padding: 16px 20px;
      font-size: 13px;
      color: #f8fafc;
      vertical-align: middle;
    }
  }
`;

const PlacaBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 195, 255, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(0, 195, 255, 0.35);
  padding: 5px 12px;
  border-radius: 8px;
  font-family: monospace;
  font-weight: 800;
  font-size: 13px;
  letter-spacing: 1px;

  .badge-plate-icon {
    font-size: 15px;
  }
`;

const ModeloCell = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #e2e8f0;
  font-weight: 500;

  .car-icon {
    color: #64748b;
    font-size: 18px;
    flex-shrink: 0;
  }
`;

const CapacidadPill = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 13px;

  .drop-icon {
    color: #10b981;
    font-size: 15px;
  }

  strong {
    font-weight: 700;
  }
`;

const ChoferCell = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;

  .avatar-chip {
    width: 34px;
    height: 34px;
    border-radius: 10px;
    background: rgba(0, 195, 255, 0.15);
    color: #38bdf8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    flex-shrink: 0;
  }

  .chofer-data {
    display: flex;
    flex-direction: column;

    .chofer-name {
      font-weight: 700;
      color: #ffffff;
      font-size: 13px;
    }

    .chofer-sub {
      color: #94a3b8;
      font-size: 11px;
    }
  }
`;

const SinChoferBadge = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.35);
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
`;

const ActionCell = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

const BtnEdit = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: rgba(0, 195, 255, 0.15);
  color: #38bdf8;
  border: 1px solid rgba(0, 195, 255, 0.35);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #00c3ff;
    color: #0b0f19;
    box-shadow: 0 0 12px rgba(0, 195, 255, 0.4);
  }
`;

const BtnDelete = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 13px;
  background: rgba(239, 68, 68, 0.15);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.35);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #ef4444;
    color: #ffffff;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
  }
`;

/* 📱 MOBILE CARDS VIEW */
const CardsWrapper = styled.div`
  display: none;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const CamionCard = styled.div`
  background: rgba(21, 28, 45, 0.75);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);

  .label {
    font-size: 13px;
    color: #94a3b8;
    display: flex;
    align-items: center;
    gap: 6px;

    svg {
      color: #00c3ff;
    }
  }

  .val {
    font-weight: 600;
    color: #ffffff;
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 6px;

  button {
    flex: 1;
    justify-content: center;
  }
`;

// 🚚 STYLED COMPONENTS PARA EL MODAL DE CAMIÓN
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
  overflow-y: auto;
`;

const ModalContainer = styled.div`
  background: #111827;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 680px;
  height: 88vh;
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 195, 255, 0.15);
  animation: scaleUp 0.25s ease;
  position: relative;
`;

const ModalHeader = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  background: rgba(15, 23, 42, 0.95);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .title-box {
    display: flex;
    align-items: center;
    gap: 14px;

    .icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(0, 195, 255, 0.15);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      flex-shrink: 0;
    }

    h3 {
      color: #ffffff;
      font-size: 17px;
      font-weight: 700;
      margin: 0 0 2px 0;
    }

    p {
      color: #94a3b8;
      font-size: 12px;
      margin: 0;

      strong {
        color: #38bdf8;
      }
    }
  }

  .close-btn {
    background: transparent;
    border: none;
    color: #94a3b8;
    font-size: 24px;
    cursor: pointer;

    &:hover {
      color: #ffffff;
    }
  }
`;

const ModalForm = styled.form`
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  height: 100%;
  overflow: hidden;
`;

const ModalBody = styled.div`
  padding: 22px 24px;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 18px;

  &::-webkit-scrollbar {
    width: 8px;
  }
  &::-webkit-scrollbar-track {
    background: rgba(15, 23, 42, 0.7);
    border-radius: 4px;
  }
  &::-webkit-scrollbar-thumb {
    background: rgba(0, 195, 255, 0.4);
    border-radius: 4px;
    &:hover {
      background: rgba(0, 195, 255, 0.7);
    }
  }
`;

const ModalSectionBox = styled.div`
  background: ${(props) => (props.$highlight ? "rgba(15, 23, 42, 0.75)" : "rgba(15, 23, 42, 0.55)")};
  border: 1px solid ${(props) => (props.$highlight ? "rgba(0, 195, 255, 0.25)" : "rgba(255, 255, 255, 0.06)")};
  border-radius: 14px;
  padding: 18px;
`;

const ModalSectionTitle = styled.h4`
  color: #38bdf8;
  font-size: 13px;
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 14px 0;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const FormGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(${(props) => props.$cols || 2}, 1fr);
  gap: 14px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FormField = styled.div`
  display: flex;
  flex-direction: column;
  gap: 6px;

  label {
    font-size: 12px;
    font-weight: 600;
    color: #cbd5e1;
  }

  input,
  select {
    width: 100%;
    padding: 10px 12px;
    background: rgba(11, 15, 25, 0.75);
    border: 1px solid rgba(255, 255, 255, 0.12);
    border-radius: 8px;
    color: #ffffff;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: #00c3ff;
      box-shadow: 0 0 10px rgba(0, 195, 255, 0.25);
    }

    option {
      background: #0f172a;
      color: #ffffff;
    }
  }

  .field-hint {
    font-size: 11px;
    color: #94a3b8;
  }
`;

const PresetLabel = styled.span`
  font-size: 11px;
  color: #94a3b8;
  margin-top: 6px;
  display: block;
`;

const PresetRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
`;

const PresetChip = styled.button`
  background: ${(props) => (props.$selected ? "rgba(0, 195, 255, 0.3)" : "rgba(11, 15, 25, 0.6)")};
  color: ${(props) => (props.$selected ? "#38bdf8" : "#94a3b8")};
  border: 1px solid ${(props) => (props.$selected ? "#00c3ff" : "rgba(255, 255, 255, 0.1)")};
  padding: 5px 9px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s;

  &:hover {
    color: #ffffff;
    border-color: #00c3ff;
  }
`;

const ChoferSelectedPreview = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(11, 15, 25, 0.6);
  border: 1px solid rgba(0, 195, 255, 0.25);
  border-radius: 10px;
  padding: 10px 14px;
  margin-top: 10px;

  .avatar {
    width: 36px;
    height: 36px;
    border-radius: 8px;
    background: rgba(0, 195, 255, 0.15);
    color: #38bdf8;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    flex-shrink: 0;
  }

  h4 {
    margin: 0 0 2px 0;
    color: #ffffff;
    font-size: 13px;
    font-weight: 700;
  }

  p {
    margin: 0;
    color: #94a3b8;
    font-size: 11px;

    strong {
      color: #38bdf8;
    }
  }
`;

const BtnToggleNuevoChofer = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 195, 255, 0.1);
  border: 1px dashed rgba(0, 195, 255, 0.35);
  color: #38bdf8;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 10px;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 195, 255, 0.2);
  }
`;

const NuevoChoferBox = styled.div`
  background: rgba(11, 15, 25, 0.6);
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 10px;
  padding: 14px;

  .box-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .tag-new {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .btn-cancel-new {
      background: none;
      border: none;
      color: #94a3b8;
      font-size: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;

      &:hover {
        color: #f87171;
      }
    }
  }
`;

const ModalFooter = styled.div`
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.95);
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  .btn-cancel {
    padding: 10px 18px;
    background: rgba(255, 255, 255, 0.08);
    border: 1px solid rgba(255, 255, 255, 0.15);
    color: #cbd5e1;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;

    &:hover {
      color: #ffffff;
      background: rgba(255, 255, 255, 0.15);
    }
  }

  .btn-save {
    padding: 10px 22px;
    background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
    border: none;
    color: #ffffff;
    border-radius: 10px;
    font-size: 13px;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0, 195, 255, 0.3);

    &:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 6px 20px rgba(0, 195, 255, 0.45);
    }

    &:disabled {
      background: #334155;
      color: #94a3b8;
      cursor: not-allowed;
    }
  }
`;
