import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";
import styled from "styled-components";
import {
  MdPeople,
  MdEdit,
  MdDelete,
  MdSave,
  MdClose,
  MdBadge,
  MdPerson,
  MdSecurity,
  MdVpnKey,
  MdLock,
  MdLocalShipping,
  MdPhone,
  MdConfirmationNumber,
  MdWaterDrop,
  MdAddCircleOutline,
  MdDeleteOutline,
  MdLink,
  MdLinkOff,
  MdCheckCircle,
  MdAssignmentInd,
  MdSwapHoriz,
} from "react-icons/md";

export function TablaUsuario() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados para Edición de perfil inline (Nombre, Cédula, Rol)
  const [editandoUser, setEditandoUser] = useState(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [cedulaEdit, setCedulaEdit] = useState("");
  const [rolEdit, setRolEdit] = useState("registrador");

  // Estados para Cambiar Clave desde Admin
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [nuevaClaveAdmin, setNuevaClaveAdmin] = useState("");
  const [loadingClaveAdmin, setLoadingClaveAdmin] = useState(false);

  // 🚚 Estados para Modal de Modificación Completa de Camionero / Chofer
  const [camioneroModalUser, setCamioneroModalUser] = useState(null);
  const [modalNombre, setModalNombre] = useState("");
  const [modalCedula, setModalCedula] = useState("");
  const [modalTelefono, setModalTelefono] = useState("");
  const [modalRol, setModalRol] = useState("camionero");
  const [camioneroId, setCamioneroId] = useState(null);
  const [camioneroOriginalId, setCamioneroOriginalId] = useState(null);
  const [fichaCamioneroInfo, setFichaCamioneroInfo] = useState(null);
  const [choferesDisponibles, setChoferesDisponibles] = useState([]);
  const [choferSeleccionadoParaVincular, setChoferSeleccionadoParaVincular] = useState("");

  const [camionesAsignados, setCamionesAsignados] = useState([]);
  const [camionesNuevos, setCamionesNuevos] = useState([]);
  const [camionesDesvinculados, setCamionesDesvinculados] = useState([]);
  const [camionesDisponibles, setCamionesDisponibles] = useState([]);
  const [camionParaVincularId, setCamionParaVincularId] = useState("");

  const [cargandoModalCamionero, setCargandoModalCamionero] = useState(false);
  const [guardandoModalCamionero, setGuardandoModalCamionero] = useState(false);

  const obtenerUsuarios = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("perfiles")
      .select("*")
      .order("nombre", { ascending: true });

    if (!error && data) {
      setUsuarios(data);
    } else if (error) {
      console.error("Error al obtener usuarios:", error.message);
    }
    setLoading(false);
  };

  useEffect(() => {
    obtenerUsuarios();
  }, []);

  const handleEliminar = async (id, nombre) => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar a ${nombre}?`);
    if (!confirmar) return;

    const { error } = await supabase.from("perfiles").delete().eq("id", id);

    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      alert("Usuario eliminado de la base de datos.");
      obtenerUsuarios();
    }
  };

  // Activa edición: Si es camionero, abre el modal completo con sus camiones
  const activarEdicion = (usr) => {
    if (usr.rol === "camionero") {
      abrirModalCamionero(usr);
      return;
    }
    setEditandoUser(usr.id);
    setNombreEdit(usr.nombre || "");
    setCedulaEdit(usr.cedula || "");
    setRolEdit(usr.rol || "registrador");
  };

  const handleGuardarEdicion = async (id) => {
    const payload = {
      nombre: nombreEdit.trim(),
      cedula: cedulaEdit.trim(),
      rol: rolEdit,
    };

    const { error } = await supabase
      .from("perfiles")
      .update(payload)
      .eq("id", id);

    if (error) {
      alert(`Error al actualizar usuario: ${error.message}`);
    } else {
      alert("🎉 ¡Datos de usuario actualizados con éxito!");
      setEditandoUser(null);
      obtenerUsuarios();
    }
  };

  // 🔑 Cambiar clave de cualquier usuario como Administrador
  const handleCambiarClaveUsuarioAdmin = async (e) => {
    e.preventDefault();
    if (!nuevaClaveAdmin || nuevaClaveAdmin.trim().length < 6) {
      alert("La nueva clave debe tener al menos 6 caracteres.");
      return;
    }

    setLoadingClaveAdmin(true);
    try {
      const { error: rpcError } = await supabase.rpc("cambiar_clave_usuario", {
        usuario_id: passwordModalUser.id,
        nueva_clave: nuevaClaveAdmin.trim(),
      });

      if (rpcError) {
        console.warn("RPC cambiar_clave_usuario no disponible:", rpcError.message);
        alert(
          `⚠️ Para habilitar el cambio directo de claves de usuarios desde este panel, ejecuta este comando en el SQL Editor de tu Supabase:\n\nCREATE OR REPLACE FUNCTION cambiar_clave_usuario(usuario_id UUID, nueva_clave TEXT) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$\nBEGIN\n  UPDATE auth.users SET encrypted_password = crypt(nueva_clave, gen_salt('bf')) WHERE id = usuario_id;\nEND;\n$$;`
        );
      } else {
        alert(`🎉 ¡La contraseña de ${passwordModalUser.nombre} ha sido actualizada con éxito!`);
        setPasswordModalUser(null);
        setNuevaClaveAdmin("");
      }
    } catch (err) {
      console.error(err);
      alert("Error al actualizar la contraseña del usuario.");
    } finally {
      setLoadingClaveAdmin(false);
    }
  };

  // 🚚 ABRIR MODAL COMPLETO DE MODIFICACIÓN DE CAMIONERO
  const abrirModalCamionero = async (usr) => {
    setCamioneroModalUser(usr);
    setModalNombre(usr.nombre || "");
    setModalCedula(usr.cedula || "");
    setModalRol(usr.rol || "camionero");
    setModalTelefono("");
    setCamionesAsignados([]);
    setCamionesNuevos([]);
    setCamionesDesvinculados([]);
    setCamionesDisponibles([]);
    setCamionParaVincularId("");
    setChoferSeleccionadoParaVincular("");
    setChoferesDisponibles([]);
    setFichaCamioneroInfo(null);
    setCargandoModalCamionero(true);

    try {
      // 1. Cargar todos los choferes registrados en la tabla camioneros
      let todosChoferes = [];
      try {
        const { data: cData } = await supabase
          .from("camioneros")
          .select("id, nombre, cedula, telefono, perfil_id")
          .order("nombre", { ascending: true });
        if (cData) todosChoferes = cData;
      } catch (errCamioneros) {
        console.warn("Tabla camioneros no disponible aún:", errCamioneros);
      }

      // Cargar todos los camiones para mapear relaciones y cantidades
      let todosCamiones = [];
      try {
        const { data: tData } = await supabase
          .from("camiones")
          .select("id, placa, capacidad, modelo, chofer, camionero_id, perfil_id");
        if (tData) todosCamiones = tData;
      } catch (errCamiones) {
        console.warn("Tabla camiones no disponible:", errCamiones);
      }

      // 2. Buscar si este usuario ya tiene una ficha en camioneros enlazada
      let foundCamionero = null;
      if (todosChoferes.length > 0) {
        foundCamionero = todosChoferes.find((c) => c.perfil_id === usr.id);
        if (!foundCamionero && usr.nombre) {
          foundCamionero = todosChoferes.find(
            (c) => (!c.perfil_id || c.perfil_id === usr.id) && c.nombre.trim().toLowerCase() === usr.nombre.trim().toLowerCase()
          );
        }
      }

      const foundCamioneroId = foundCamionero?.id || null;
      const telefonoEncontrado = foundCamionero?.telefono || "";

      setCamioneroId(foundCamioneroId);
      setCamioneroOriginalId(foundCamioneroId);
      setFichaCamioneroInfo(foundCamionero || null);
      if (telefonoEncontrado) setModalTelefono(telefonoEncontrado);

      // 3. Filtrar Choferes Disponibles:
      // REGLA: Si este camionero ya está asignado a un usuario (perfil_id no nulo y distinto a usr.id), NO DEBE APARECER EN LA LISTA
      const listaDisponibles = (todosChoferes || [])
        .filter((c) => !c.perfil_id || c.perfil_id === usr.id)
        .map((c) => {
          const count = (todosCamiones || []).filter(
            (t) => t.camionero_id === c.id || (!t.camionero_id && t.chofer && t.chofer.trim().toLowerCase() === c.nombre?.trim().toLowerCase())
          ).length;
          return {
            ...c,
            camionesCount: count,
          };
        });

      setChoferesDisponibles(listaDisponibles);

      // 4. Cargar camiones actualmente asignados a este chofer
      let assignedTrucks = [];
      if (foundCamioneroId) {
        assignedTrucks = (todosCamiones || []).filter((t) => t.camionero_id === foundCamioneroId);
        if (assignedTrucks.length === 0 && foundCamionero?.nombre) {
          assignedTrucks = (todosCamiones || []).filter(
            (t) => t.chofer && t.chofer.trim().toLowerCase() === foundCamionero.nombre.trim().toLowerCase()
          );
        }
      }

      // Si no encontró por camionero_id, buscar por nombre exacto del chofer o perfil_id aislado
      if (assignedTrucks.length === 0 && usr.nombre) {
        assignedTrucks = (todosCamiones || []).filter(
          (t) => t.chofer && t.chofer.trim().toLowerCase() === usr.nombre.trim().toLowerCase()
        );
        if (assignedTrucks.length === 0) {
          assignedTrucks = (todosCamiones || []).filter(
            (t) => t.perfil_id === usr.id && !t.camionero_id
          );
        }
      }

      setCamionesAsignados(assignedTrucks || []);

      // 5. Cargar camiones disponibles sin chofer para ofrecer vinculación rápida individual
      const assignedIds = new Set((assignedTrucks || []).map((t) => t.id));
      const disponibles = (todosCamiones || []).filter(
        (t) => !assignedIds.has(t.id) && !t.camionero_id && (!t.chofer || t.chofer.trim() === "" || t.chofer.toLowerCase().includes("sin"))
      );

      setCamionesDisponibles(disponibles);
      if (disponibles.length > 0) {
        setCamionParaVincularId(disponibles[0].id);
      }
    } catch (err) {
      console.error("Error al cargar datos del chofer:", err);
    } finally {
      setCargandoModalCamionero(false);
    }
  };

  // 🔗 Asignar un camionero existente con sus camiones
  const handleAsignarChoferExistente = async () => {
    if (!choferSeleccionadoParaVincular) return;
    const ch = choferesDisponibles.find((c) => String(c.id) === String(choferSeleccionadoParaVincular));
    if (!ch) return;

    setCamioneroId(ch.id);
    setFichaCamioneroInfo(ch);

    // Autollenar datos personales del chofer seleccionado
    if (ch.nombre) setModalNombre(ch.nombre);
    if (ch.cedula) setModalCedula(ch.cedula);
    if (ch.telefono) setModalTelefono(ch.telefono || "");

    // Cargar todos los camiones vinculados a este chofer
    try {
      let { data: trucks } = await supabase
        .from("camiones")
        .select("id, placa, capacidad, modelo, chofer, camionero_id, perfil_id")
        .eq("camionero_id", ch.id);

      if ((!trucks || trucks.length === 0) && ch.nombre) {
        const { data: trucksNombre } = await supabase
          .from("camiones")
          .select("id, placa, capacidad, modelo, chofer, camionero_id, perfil_id")
          .ilike("chofer", ch.nombre.trim());
        if (trucksNombre) trucks = trucksNombre;
      }

      setCamionesAsignados(trucks || []);
      setCamionesNuevos([]);
      setCamionesDesvinculados([]);
      setChoferSeleccionadoParaVincular("");
      alert(`🎉 Ficha de chofer "${ch.nombre}" seleccionada. Se cargaron ${trucks?.length || 0} camión(es) pertenecientes a este chofer.`);
    } catch (err) {
      console.error("Error al cargar camiones del chofer:", err);
    }
  };

  // ❌ Desvincular de la ficha de camionero actual
  const handleDesvincularFichaCamionero = () => {
    const confirmar = window.confirm(
      `¿Deseas desvincular este usuario de la ficha de chofer "${fichaCamioneroInfo?.nombre || modalNombre}"?\n\nPodrás seleccionar otro chofer existente con sus camiones o registrar camiones independientes.`
    );
    if (!confirmar) return;

    setCamioneroId(null);
    setFichaCamioneroInfo(null);
    setCamionesAsignados([]);
  };

  // Manejo de camiones asignados existentes
  const actualizarCamionAsignado = (id, campo, valor) => {
    setCamionesAsignados((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [campo]: valor } : c))
    );
  };

  const desvincularCamion = (camionObj) => {
    const confirmar = window.confirm(`¿Deseas desvincular el camión ${camionObj.placa} de ${modalNombre}?`);
    if (!confirmar) return;

    setCamionesAsignados((prev) => prev.filter((c) => c.id !== camionObj.id));
    setCamionesDesvinculados((prev) => [...prev, camionObj.id]);
    setCamionesDisponibles((prev) => [...prev, camionObj]);
  };

  // Manejo de nuevos camiones a agregar
  const agregarFilaNuevoCamion = () => {
    setCamionesNuevos((prev) => [
      ...prev,
      { id: Date.now(), placa: "", capacidad: "", modelo: "" },
    ]);
  };

  const eliminarFilaNuevoCamion = (tempId) => {
    setCamionesNuevos((prev) => prev.filter((c) => c.id !== tempId));
  };

  const actualizarFilaNuevoCamion = (tempId, campo, valor) => {
    setCamionesNuevos((prev) =>
      prev.map((c) => (c.id === tempId ? { ...c, [campo]: valor } : c))
    );
  };

  const vincularCamionExistente = () => {
    if (!camionParaVincularId) return;
    const camionElegido = camionesDisponibles.find((c) => String(c.id) === String(camionParaVincularId));
    if (!camionElegido) return;

    setCamionesAsignados((prev) => [...prev, camionElegido]);
    setCamionesDisponibles((prev) => prev.filter((c) => String(c.id) !== String(camionParaVincularId)));
    setCamionesDesvinculados((prev) => prev.filter((id) => String(id) !== String(camionParaVincularId)));
    setCamionParaVincularId("");
  };

  // 💾 GUARDAR MODIFICACIÓN DE CAMIONERO
  const handleGuardarModificacionCamionero = async (e) => {
    e.preventDefault();
    setGuardandoModalCamionero(true);

    const regexPlaca = /^[A-Z0-9]{5,8}$/;

    // 1. Validar placas en camiones asignados modificados
    for (const c of camionesAsignados) {
      const placaLimpia = (c.placa || "").trim().toUpperCase();
      if (!regexPlaca.test(placaLimpia)) {
        alert(`La placa "${c.placa}" es inválida. Debe tener entre 5 y 8 caracteres alfanuméricos.`);
        setGuardandoModalCamionero(false);
        return;
      }
      if (!c.capacidad || parseInt(c.capacidad, 10) <= 0) {
        alert(`Capacidad inválida para el camión ${placaLimpia}.`);
        setGuardandoModalCamionero(false);
        return;
      }
    }

    // 2. Validar placas en camiones nuevos
    for (let i = 0; i < camionesNuevos.length; i++) {
      const n = camionesNuevos[i];
      const placaLimpia = (n.placa || "").trim().toUpperCase();
      if (!regexPlaca.test(placaLimpia)) {
        alert(`La placa del nuevo camión #${i + 1} (${n.placa}) es inválida.`);
        setGuardandoModalCamionero(false);
        return;
      }
      if (!n.capacidad || parseInt(n.capacidad, 10) <= 0) {
        alert(`Indica una capacidad en litros válida para el nuevo camión #${i + 1}.`);
        setGuardandoModalCamionero(false);
        return;
      }
      if (!n.modelo || !n.modelo.trim()) {
        alert(`Indica el modelo del nuevo camión #${i + 1}.`);
        setGuardandoModalCamionero(false);
        return;
      }
    }

    // 3. Validar unicidad interna entre todas las unidades en pantalla
    const todasLasPlacas = [
      ...camionesAsignados.map((c) => c.placa.trim().toUpperCase()),
      ...camionesNuevos.map((c) => c.placa.trim().toUpperCase()),
    ];
    const placasUnicasSet = new Set(todasLasPlacas);
    if (placasUnicasSet.size !== todasLasPlacas.length) {
      alert("⚠️ Hay placas repetidas en la lista de camiones. Cada camión debe tener una placa única.");
      setGuardandoModalCamionero(false);
      return;
    }

    try {
      const userId = camioneroModalUser.id;

      // 4. Actualizar tabla perfiles
      const { error: errPerfil } = await supabase
        .from("perfiles")
        .update({
          nombre: modalNombre.trim(),
          cedula: modalCedula.trim(),
          rol: modalRol,
        })
        .eq("id", userId);

      if (errPerfil) throw errPerfil;

      // 5. Actualizar o crear registro en la tabla camioneros
      let finalCamioneroId = camioneroId;

      // Si cambió de chofer o desvinculó la ficha previa, liberar la anterior
      if (camioneroOriginalId && camioneroOriginalId !== finalCamioneroId) {
        await supabase
          .from("camioneros")
          .update({ perfil_id: null })
          .eq("id", camioneroOriginalId);
      }

      if (finalCamioneroId) {
        await supabase
          .from("camioneros")
          .update({
            nombre: modalNombre.trim(),
            cedula: modalCedula.trim(),
            telefono: modalTelefono.trim() || null,
            perfil_id: userId,
          })
          .eq("id", finalCamioneroId);
      } else {
        const { data: newCam, error: errNewCam } = await supabase
          .from("camioneros")
          .insert([
            {
              nombre: modalNombre.trim(),
              cedula: modalCedula.trim(),
              telefono: modalTelefono.trim() || null,
              perfil_id: userId,
            },
          ])
          .select("id")
          .single();

        if (!errNewCam && newCam) {
          finalCamioneroId = newCam.id;
        }
      }

      // 6. Actualizar camiones asignados existentes (modificaciones de placa, capacidad, modelo)
      for (const c of camionesAsignados) {
        const updatePayload = {
          placa: c.placa.trim().toUpperCase(),
          capacidad: parseInt(c.capacidad, 10),
          modelo: (c.modelo || "").trim(),
          chofer: modalNombre.trim(),
          perfil_id: userId,
        };
        if (finalCamioneroId) updatePayload.camionero_id = finalCamioneroId;

        await supabase.from("camiones").update(updatePayload).eq("id", c.id);
      }

      // 7. Insertar nuevos camiones registrados en este modal
      for (const n of camionesNuevos) {
        const newPayload = {
          placa: n.placa.trim().toUpperCase(),
          capacidad: parseInt(n.capacidad, 10),
          modelo: n.modelo.trim(),
          chofer: modalNombre.trim(),
          perfil_id: userId,
        };
        if (finalCamioneroId) newPayload.camionero_id = finalCamioneroId;

        let { error: errIns } = await supabase.from("camiones").insert([newPayload]);
        if (errIns && (errIns.code === "PGRST204" || errIns.message.includes("camionero_id"))) {
          delete newPayload.camionero_id;
          await supabase.from("camiones").insert([newPayload]);
        }
      }

      // 8. Desvincular camiones removidos
      if (camionesDesvinculados.length > 0) {
        await supabase
          .from("camiones")
          .update({ camionero_id: null, perfil_id: null })
          .in("id", camionesDesvinculados);
      }

      alert(`🎉 ¡Datos de "${modalNombre}" y sus ${camionesAsignados.length + camionesNuevos.length} camión(es) actualizados con éxito!`);
      setCamioneroModalUser(null);
      obtenerUsuarios();
    } catch (err) {
      console.error("Error al guardar chofer:", err);
      alert(`Error al guardar: ${err.message || "Error desconocido"}`);
    } finally {
      setGuardandoModalCamionero(false);
    }
  };

  return (
    <Container>
      <HeaderSection>
        <TitleGroup>
          <IconBadge>
            <MdPeople />
          </IconBadge>
          <div>
            <h2>Gestión de Personal / Usuarios</h2>
            <p className="subtitle">Consulta, edita perfiles, asigna unidades cisterna y gestiona accesos</p>
          </div>
        </TitleGroup>
      </HeaderSection>

      {loading ? (
        <LoadingState>Cargando lista de usuarios...</LoadingState>
      ) : (
        <>
          {/* 🖥️ VISTA TABLA (DESKTOP) */}
          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th><MdPerson className="th-icon" /> Nombre</th>
                  <th><MdBadge className="th-icon" /> Cédula</th>
                  <th><MdSecurity className="th-icon" /> Rol Asignado</th>
                  <th style={{ textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map((usr) => {
                  const esModoEdicion = editandoUser === usr.id;
                  const esCamionero = usr.rol === "camionero";

                  return (
                    <tr key={usr.id}>
                      {/* NOMBRE */}
                      <td>
                        {esModoEdicion ? (
                          <InputInline
                            type="text"
                            value={nombreEdit}
                            onChange={(e) => setNombreEdit(e.target.value)}
                            placeholder="Nombre del usuario"
                          />
                        ) : (
                          <span className="user-name">{usr.nombre}</span>
                        )}
                      </td>

                      {/* CÉDULA */}
                      <td>
                        {esModoEdicion ? (
                          <InputInline
                            type="text"
                            value={cedulaEdit}
                            onChange={(e) => setCedulaEdit(e.target.value)}
                            placeholder="Cédula"
                          />
                        ) : (
                          <span className="cedula-tag">{usr.cedula}</span>
                        )}
                      </td>

                      {/* ROL */}
                      <td>
                        {esModoEdicion ? (
                          <SelectInline
                            value={rolEdit}
                            onChange={(e) => setRolEdit(e.target.value)}
                          >
                            <option value="registrador">Vendedor / Recargador</option>
                            <option value="camionero">Chofer de Cisterna</option>
                            <option value="administrador">Administrador del Pozo</option>
                          </SelectInline>
                        ) : (
                          <RoleBadge className={usr.rol}>
                            {usr.rol ? usr.rol.toUpperCase() : "SIN ROL"}
                          </RoleBadge>
                        )}
                      </td>

                      {/* ACCIONES */}
                      <td>
                        <ActionCell>
                          {esModoEdicion ? (
                            <EditBoxInline>
                              {rolEdit === "camionero" && (
                                <BtnTrucksManage
                                  type="button"
                                  onClick={() =>
                                    abrirModalCamionero({
                                      ...usr,
                                      nombre: nombreEdit,
                                      cedula: cedulaEdit,
                                      rol: rolEdit,
                                    })
                                  }
                                >
                                  <MdLocalShipping /> Gestionar Camiones
                                </BtnTrucksManage>
                              )}
                              <BtnSave onClick={() => handleGuardarEdicion(usr.id)}>
                                <MdSave /> Guardar
                              </BtnSave>
                              <BtnCancel onClick={() => setEditandoUser(null)}>
                                <MdClose /> Cancelar
                              </BtnCancel>
                            </EditBoxInline>
                          ) : (
                            <>
                              <BtnEdit
                                onClick={() => activarEdicion(usr)}
                                $isCamionero={esCamionero}
                              >
                                {esCamionero ? (
                                  <>
                                    <MdLocalShipping /> Editar Chofer y Camiones
                                  </>
                                ) : (
                                  <>
                                    <MdEdit /> Editar
                                  </>
                                )}
                              </BtnEdit>

                              <BtnKey onClick={() => { setPasswordModalUser(usr); setNuevaClaveAdmin(""); }}>
                                <MdVpnKey /> Clave
                              </BtnKey>
                              <BtnDelete onClick={() => handleEliminar(usr.id, usr.nombre)}>
                                <MdDelete /> Eliminar
                              </BtnDelete>
                            </>
                          )}
                        </ActionCell>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </StyledTable>
          </TableWrapper>

          {/* 📱 VISTA TARJETAS (MOBILE <= 768px) */}
          <CardsWrapper>
            {usuarios.map((usr) => {
              const esModoEdicion = editandoUser === usr.id;
              const esCamionero = usr.rol === "camionero";

              return (
                <UserCard key={usr.id}>
                  {esModoEdicion ? (
                    <CardForm>
                      <label>Nombre:</label>
                      <InputInline
                        type="text"
                        value={nombreEdit}
                        onChange={(e) => setNombreEdit(e.target.value)}
                      />

                      <label>Cédula:</label>
                      <InputInline
                        type="text"
                        value={cedulaEdit}
                        onChange={(e) => setCedulaEdit(e.target.value)}
                      />

                      <label>Rol:</label>
                      <SelectInline
                        value={rolEdit}
                        onChange={(e) => setRolEdit(e.target.value)}
                      >
                        <option value="registrador">Vendedor / Recargador</option>
                        <option value="camionero">Chofer de Cisterna</option>
                        <option value="administrador">Administrador del Pozo</option>
                      </SelectInline>

                      <CardActions>
                        {rolEdit === "camionero" && (
                          <BtnTrucksManage
                            type="button"
                            onClick={() =>
                              abrirModalCamionero({
                                ...usr,
                                nombre: nombreEdit,
                                cedula: cedulaEdit,
                                rol: rolEdit,
                              })
                            }
                          >
                            <MdLocalShipping /> Gestionar Camiones
                          </BtnTrucksManage>
                        )}
                        <BtnSave onClick={() => handleGuardarEdicion(usr.id)}>
                          <MdSave /> Guardar
                        </BtnSave>
                        <BtnCancel onClick={() => setEditandoUser(null)}>
                          <MdClose /> Cancelar
                        </BtnCancel>
                      </CardActions>
                    </CardForm>
                  ) : (
                    <>
                      <CardHeader>
                        <div>
                          <span className="user-name">{usr.nombre}</span>
                          <span className="cedula-tag">C.I. {usr.cedula}</span>
                        </div>
                        <RoleBadge className={usr.rol}>
                          {usr.rol ? usr.rol.toUpperCase() : "SIN ROL"}
                        </RoleBadge>
                      </CardHeader>

                      <CardActions>
                        <BtnEdit
                          onClick={() => activarEdicion(usr)}
                          $isCamionero={esCamionero}
                        >
                          {esCamionero ? (
                            <>
                              <MdLocalShipping /> Editar Chofer y Camiones
                            </>
                          ) : (
                            <>
                              <MdEdit /> Editar
                            </>
                          )}
                        </BtnEdit>
                        <BtnKey onClick={() => { setPasswordModalUser(usr); setNuevaClaveAdmin(""); }}>
                          <MdVpnKey /> Clave
                        </BtnKey>
                        <BtnDelete onClick={() => handleEliminar(usr.id, usr.nombre)}>
                          <MdDelete /> Eliminar
                        </BtnDelete>
                      </CardActions>
                    </>
                  )}
                </UserCard>
              );
            })}
          </CardsWrapper>
        </>
      )}

      {/* 🚚 MODAL DE MODIFICACIÓN COMPLETA DE CAMIONERO Y UNIDADES CISTERNA */}
      {camioneroModalUser && (
        <ModalOverlay onClick={() => setCamioneroModalUser(null)}>
          <ModalTrucksContainer onClick={(e) => e.stopPropagation()}>
            <ModalTrucksHeader>
              <div className="title-box">
                <div className="icon-wrapper">
                  <MdLocalShipping />
                </div>
                <div>
                  <h3>Modificar Chofer y Camiones Cisterna</h3>
                  <p>Administra los datos personales y las unidades asignadas a <strong>{modalNombre}</strong></p>
                </div>
              </div>
              <button className="close-btn" onClick={() => setCamioneroModalUser(null)}>
                <MdClose />
              </button>
            </ModalTrucksHeader>

            <form onSubmit={handleGuardarModificacionCamionero}>
              <ModalTrucksBody>
                {cargandoModalCamionero ? (
                  <div style={{ padding: "40px", textAlign: "center", color: "#94a3b8" }}>
                    Cargando datos y unidades cisterna del chofer...
                  </div>
                ) : (
                  <>
                    {/* 1. DATOS PERSONALES DEL CHOFER */}
                    <SectionBox>
                      <SectionSubtitle>
                        <MdPerson /> Datos Personales y de Cuenta
                      </SectionSubtitle>
                      <GridInputs>
                        <FieldItem>
                          <label>Nombre Completo: *</label>
                          <input
                            type="text"
                            value={modalNombre}
                            onChange={(e) => setModalNombre(e.target.value)}
                            required
                          />
                        </FieldItem>

                        <FieldItem>
                          <label>Cédula de Identidad: *</label>
                          <input
                            type="text"
                            value={modalCedula}
                            onChange={(e) => setModalCedula(e.target.value)}
                            required
                          />
                        </FieldItem>

                        <FieldItem>
                          <label>Teléfono de Contacto:</label>
                          <input
                            type="text"
                            placeholder="Ej: 0414-1234567"
                            value={modalTelefono}
                            onChange={(e) => setModalTelefono(e.target.value)}
                          />
                        </FieldItem>

                        <FieldItem>
                          <label>Rol en el Sistema: *</label>
                          <select value={modalRol} onChange={(e) => setModalRol(e.target.value)}>
                            <option value="camionero">🚚 Chofer de Cisterna</option>
                            <option value="registrador">💧 Vendedor / Recargador</option>
                            <option value="administrador">👑 Administrador</option>
                          </select>
                        </FieldItem>
                      </GridInputs>
                    </SectionBox>

                    {/* 2. VINCULAR CON UN CHOFER EXISTENTE REGISTRADO EN EL POZO */}
                    <SectionBox style={{ border: "1px solid rgba(0, 195, 255, 0.25)", background: "rgba(15, 23, 42, 0.75)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", flexWrap: "wrap", gap: "10px" }}>
                        <SectionSubtitle style={{ margin: 0, color: "#38bdf8" }}>
                          <MdAssignmentInd /> Asignar Chofer Existente Registrado en el Pozo
                        </SectionSubtitle>
                        {fichaCamioneroInfo && (
                          <BadgeFichaVinculada>
                            <MdCheckCircle /> Ficha Vinculada: <strong>{fichaCamioneroInfo.nombre}</strong>
                          </BadgeFichaVinculada>
                        )}
                      </div>

                      <p style={{ color: "#94a3b8", fontSize: "12px", margin: "0 0 12px 0", lineHeight: "1.5" }}>
                        Si este chofer ya fue creado previamente por el registrador en el pozo, puedes seleccionarlo aquí para autollenar sus datos y cargar automáticamente todos sus camiones asignados.
                        <br />
                        <span style={{ color: "#fbbf24", fontWeight: "600" }}>
                          ⚠️ Solo aparecen en la lista choferes que <strong>aún no tienen un usuario asignado</strong>.
                        </span>
                      </p>

                      {fichaCamioneroInfo ? (
                        <FichaActivaContainer>
                          <div className="ficha-details">
                            <div className="avatar-chip">
                              <MdPerson />
                            </div>
                            <div>
                              <h4>{fichaCamioneroInfo.nombre}</h4>
                              <p>
                                Cédula: <strong>{fichaCamioneroInfo.cedula || "No registrada"}</strong> | 
                                Teléfono: <strong>{fichaCamioneroInfo.telefono || "Sin teléfono"}</strong> | 
                                Camiones en Sistema: <strong>{camionesAsignados.length} unidad(es)</strong>
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            className="btn-cambiar-ficha"
                            onClick={handleDesvincularFichaCamionero}
                          >
                            <MdSwapHoriz /> Cambiar / Desvincular Chofer
                          </button>
                        </FichaActivaContainer>
                      ) : (
                        <VincularChoferSelectorBox>
                          <div className="selector-row">
                            <select
                              value={choferSeleccionadoParaVincular}
                              onChange={(e) => setChoferSeleccionadoParaVincular(e.target.value)}
                            >
                              <option value="">
                                {choferesDisponibles.length === 0
                                  ? "-- No hay choferes disponibles sin usuario asignado --"
                                  : "-- Seleccionar chofer existente con sus camiones --"}
                              </option>
                              {choferesDisponibles.map((ch) => (
                                <option key={ch.id} value={ch.id}>
                                  {ch.nombre} {ch.cedula ? `(C.I. ${ch.cedula})` : ""} — {ch.camionesCount} camión(es)
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-asignar-chofer"
                              disabled={!choferSeleccionadoParaVincular}
                              onClick={handleAsignarChoferExistente}
                            >
                              <MdLink /> Asignar Chofer y Cargar Camiones
                            </button>
                          </div>
                          {choferesDisponibles.length === 0 && (
                            <div style={{ marginTop: "8px", fontSize: "11px", color: "#64748b" }}>
                              ℹ️ Todos los camioneros registrados ya están vinculados a un usuario del sistema o no hay registros aún.
                            </div>
                          )}
                        </VincularChoferSelectorBox>
                      )}
                    </SectionBox>

                    {/* 3. UNIDADES CISTERNA ASIGNADAS */}
                    <SectionBox>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
                        <SectionSubtitle style={{ margin: 0 }}>
                          <MdLocalShipping /> Unidades Cisterna Asignadas ({camionesAsignados.length + camionesNuevos.length})
                        </SectionSubtitle>
                        <BotonAgregarTruck type="button" onClick={agregarFilaNuevoCamion}>
                          <MdAddCircleOutline /> ➕ Registrar Nuevo Camión
                        </BotonAgregarTruck>
                      </div>

                      {/* Lista de camiones asignados actuales */}
                      {camionesAsignados.length === 0 && camionesNuevos.length === 0 ? (
                        <EmptyTrucksNotice>
                          Este chofer aún no tiene ningún camión cisterna asignado. Haz clic en <strong>➕ Registrar Nuevo Camión</strong> o vincula uno de la lista inferior.
                        </EmptyTrucksNotice>
                      ) : (
                        <TrucksListWrapper>
                          {camionesAsignados.map((cam) => (
                            <TruckEditCard key={cam.id}>
                              <div className="card-top">
                                <span className="plate-tag">{cam.placa}</span>
                                <button
                                  type="button"
                                  className="btn-unlink"
                                  onClick={() => desvincularCamion(cam)}
                                  title="Desvincular camión de este chofer"
                                >
                                  <MdLinkOff /> Desvincular Unidad
                                </button>
                              </div>

                              <GridInputs $cols={3}>
                                <FieldItem>
                                  <label>Placa: *</label>
                                  <input
                                    type="text"
                                    value={cam.placa}
                                    onChange={(e) => actualizarCamionAsignado(cam.id, "placa", e.target.value)}
                                    maxLength={8}
                                    style={{ textTransform: "uppercase", fontWeight: "700" }}
                                    required
                                  />
                                </FieldItem>

                                <FieldItem>
                                  <label>Capacidad (Litros): *</label>
                                  <input
                                    type="number"
                                    value={cam.capacidad}
                                    onChange={(e) => actualizarCamionAsignado(cam.id, "capacidad", e.target.value)}
                                    required
                                  />
                                </FieldItem>

                                <FieldItem>
                                  <label>Modelo: *</label>
                                  <input
                                    type="text"
                                    value={cam.modelo || ""}
                                    onChange={(e) => actualizarCamionAsignado(cam.id, "modelo", e.target.value)}
                                    placeholder="Ej: Mack / Ford"
                                    required
                                  />
                                </FieldItem>
                              </GridInputs>
                            </TruckEditCard>
                          ))}

                          {/* Lista de nuevos camiones a agregar */}
                          {camionesNuevos.map((cam, idx) => (
                            <TruckEditCard key={cam.id} $isNew>
                              <div className="card-top">
                                <span className="new-tag">➕ Nueva Unidad #{idx + 1}</span>
                                <button
                                  type="button"
                                  className="btn-delete"
                                  onClick={() => eliminarFilaNuevoCamion(cam.id)}
                                  title="Quitar este camión"
                                >
                                  <MdDeleteOutline /> Quitar
                                </button>
                              </div>

                              <GridInputs $cols={3}>
                                <FieldItem>
                                  <label>Placa: *</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: ABC123"
                                    value={cam.placa}
                                    onChange={(e) => actualizarFilaNuevoCamion(cam.id, "placa", e.target.value)}
                                    maxLength={8}
                                    style={{ textTransform: "uppercase", fontWeight: "700" }}
                                    required
                                  />
                                </FieldItem>

                                <FieldItem>
                                  <label>Capacidad (Litros): *</label>
                                  <input
                                    type="number"
                                    placeholder="Ej: 10000"
                                    value={cam.capacidad}
                                    onChange={(e) => actualizarFilaNuevoCamion(cam.id, "capacidad", e.target.value)}
                                    required
                                  />
                                </FieldItem>

                                <FieldItem>
                                  <label>Modelo: *</label>
                                  <input
                                    type="text"
                                    placeholder="Ej: Ford Cargo 1721"
                                    value={cam.modelo}
                                    onChange={(e) => actualizarFilaNuevoCamion(cam.id, "modelo", e.target.value)}
                                    required
                                  />
                                </FieldItem>
                              </GridInputs>
                            </TruckEditCard>
                          ))}
                        </TrucksListWrapper>
                      )}

                      {/* Opcional: Vincular un camión disponible existente */}
                      {camionesDisponibles.length > 0 && (
                        <LinkAvailableBox>
                          <label><MdLink /> Vincular una unidad existente que no tenga chofer asignado:</label>
                          <div className="link-row">
                            <select
                              value={camionParaVincularId}
                              onChange={(e) => setCamionParaVincularId(e.target.value)}
                            >
                              <option value="">-- Seleccionar unidad disponible --</option>
                              {camionesDisponibles.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.placa} — {t.capacidad?.toLocaleString()} Lts ({t.modelo || "Sin modelo"})
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              className="btn-attach"
                              onClick={vincularCamionExistente}
                              disabled={!camionParaVincularId}
                            >
                              🔗 Vincular a este chofer
                            </button>
                          </div>
                        </LinkAvailableBox>
                      )}
                    </SectionBox>
                  </>
                )}
              </ModalTrucksBody>

              <ModalTrucksFooter>
                <button
                  type="button"
                  className="btn-close-modal"
                  onClick={() => setCamioneroModalUser(null)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-save-modal"
                  disabled={guardandoModalCamionero || cargandoModalCamionero}
                >
                  {guardandoModalCamionero ? "Guardando Cambios..." : "💾 Guardar Todos los Cambios"}
                </button>
              </ModalTrucksFooter>
            </form>
          </ModalTrucksContainer>
        </ModalOverlay>
      )}

      {/* 🔑 MODAL CAMBIAR CLAVE DE UN USUARIO (ADMIN) */}
      {passwordModalUser && (
        <ModalOverlay onClick={() => setPasswordModalUser(null)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <h3>🔑 Cambiar Clave de {passwordModalUser.nombre}</h3>
              <button onClick={() => setPasswordModalUser(null)}>
                <MdClose />
              </button>
            </ModalHeader>

            <form onSubmit={handleCambiarClaveUsuarioAdmin}>
              <ModalBody>
                <div className="input-group">
                  <label><MdLock /> Nueva Contraseña para C.I. {passwordModalUser.cedula}:</label>
                  <input
                    type="password"
                    placeholder="Mínimo 6 caracteres"
                    value={nuevaClaveAdmin}
                    onChange={(e) => setNuevaClaveAdmin(e.target.value)}
                    required
                  />
                </div>

                <SubmitModalBtn type="submit" disabled={loadingClaveAdmin}>
                  {loadingClaveAdmin ? "Actualizando..." : "Guardar Nueva Contraseña"}
                </SubmitModalBtn>
              </ModalBody>
            </form>
          </ModalContent>
        </ModalOverlay>
      )}
    </Container>
  );
}

// 🎨 STYLED COMPONENTS
const Container = styled.div`
  animation: fadeIn 0.3s ease-out;
`;

const HeaderSection = styled.div`
  margin-bottom: 24px;
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

const LoadingState = styled.div`
  padding: 50px;
  text-align: center;
  color: #94a3b8;
  background: rgba(21, 28, 45, 0.5);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
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
    background: rgba(15, 23, 42, 0.8);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);

    th {
      padding: 16px 20px;
      font-size: 13px;
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

      &:last-child {
        border-bottom: none;
      }
    }

    td {
      padding: 16px 20px;
      font-size: 14px;
      color: #f8fafc;
      vertical-align: middle;
    }
  }

  .user-name {
    font-weight: 600;
    color: #ffffff;
  }

  .cedula-tag {
    color: #cbd5e1;
    font-family: monospace;
    font-size: 13px;
  }
`;

const RoleBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;

  &.administrador, &.admin {
    background: rgba(239, 68, 68, 0.15);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  &.camionero, &.chofer {
    background: rgba(245, 158, 11, 0.15);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.3);
  }

  &.registrador, &.vendedor {
    background: rgba(16, 185, 129, 0.15);
    color: #10b981;
    border: 1px solid rgba(16, 185, 129, 0.3);
  }
`;

const ActionCell = styled.div`
  display: flex;
  gap: 8px;
  justify-content: center;
`;

const EditBoxInline = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
`;

const BtnTrucksManage = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.2);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.4);
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f59e0b;
    color: #0b0f19;
  }
`;

const BtnEdit = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: ${(props) =>
    props.$isCamionero ? "rgba(245, 158, 11, 0.15)" : "rgba(0, 195, 255, 0.15)"};
  color: ${(props) => (props.$isCamionero ? "#f59e0b" : "#00c3ff")};
  border: 1px solid
    ${(props) => (props.$isCamionero ? "rgba(245, 158, 11, 0.35)" : "rgba(0, 195, 255, 0.3)")};
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${(props) => (props.$isCamionero ? "#f59e0b" : "#00c3ff")};
    color: #0b0f19;
    box-shadow: ${(props) =>
      props.$isCamionero ? "0 0 12px rgba(245, 158, 11, 0.4)" : "0 0 12px rgba(0, 195, 255, 0.4)"};
  }
`;

const BtnKey = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #f59e0b;
    color: #0b0f19;
    box-shadow: 0 0 12px rgba(245, 158, 11, 0.4);
  }
`;

const BtnDelete = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #ef4444;
    color: #ffffff;
    box-shadow: 0 0 12px rgba(239, 68, 68, 0.4);
  }
`;

const BtnSave = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(16, 185, 129, 0.2);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.4);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #10b981;
    color: #0b0f19;
  }
`;

const BtnCancel = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.08);
  color: #94a3b8;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 8px;
  font-size: 13px;
  cursor: pointer;

  &:hover {
    color: #ffffff;
  }
`;

const InputInline = styled.input`
  width: 100%;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid #00c3ff;
  border-radius: 6px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
`;

const SelectInline = styled.select`
  width: 100%;
  padding: 8px 10px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid #00c3ff;
  border-radius: 6px;
  color: #ffffff;
  font-size: 13px;
  outline: none;

  option {
    background: #0f172a;
    color: #ffffff;
  }
`;

const CardsWrapper = styled.div`
  display: none;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 768px) {
    display: flex;
  }
`;

const UserCard = styled.div`
  background: rgba(21, 28, 45, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: flex-start;

  .user-name {
    display: block;
    font-size: 15px;
    font-weight: 700;
    color: #ffffff;
  }

  .cedula-tag {
    font-size: 12px;
    color: #94a3b8;
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const CardForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 12px;
    color: #94a3b8;
    margin-top: 4px;
  }
`;

const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.8);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
`;

const ModalContent = styled.div`
  background: #111827;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6);
`;

const ModalHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 18px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  h3 {
    margin: 0;
    font-size: 16px;
    color: #ffffff;
  }

  button {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 20px;
    cursor: pointer;

    &:hover {
      color: #ffffff;
    }
  }
`;

const ModalBody = styled.div`
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  .input-group {
    display: flex;
    flex-direction: column;
    gap: 6px;

    label {
      font-size: 13px;
      color: #cbd5e1;
      display: flex;
      align-items: center;
      gap: 6px;

      svg {
        color: #00c3ff;
      }
    }

    input {
      padding: 12px 14px;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 10px;
      color: #ffffff;
      font-size: 14px;
      outline: none;

      &:focus {
        border-color: #00c3ff;
      }
    }
  }
`;

const SubmitModalBtn = styled.button`
  width: 100%;
  padding: 13px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  margin-top: 8px;
  transition: all 0.2s ease;

  &:hover:not(:disabled) {
    box-shadow: 0 0 15px rgba(0, 195, 255, 0.4);
  }

  &:disabled {
    background: #334155;
    color: #94a3b8;
    cursor: not-allowed;
  }
`;

// 🚚 STYLED COMPONENTS PARA EL MODAL DE CAMIONERO Y SUS CAMIONES
const ModalTrucksContainer = styled.div`
  background: #111827;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 780px;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8), 0 0 30px rgba(0, 195, 255, 0.15);
  animation: scaleUp 0.25s ease;
`;

const ModalTrucksHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 26px;
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  .title-box {
    display: flex;
    align-items: center;
    gap: 14px;

    .icon-wrapper {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
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

const ModalTrucksBody = styled.div`
  padding: 22px 26px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 20px;
`;

const SectionBox = styled.div`
  background: rgba(15, 23, 42, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 14px;
  padding: 18px;
`;

const SectionSubtitle = styled.h4`
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

const GridInputs = styled.div`
  display: grid;
  grid-template-columns: repeat(${(props) => props.$cols || 2}, 1fr);
  gap: 14px;

  @media (max-width: 600px) {
    grid-template-columns: 1fr;
  }
`;

const FieldItem = styled.div`
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
    background: rgba(11, 15, 25, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    color: #ffffff;
    font-size: 13px;
    outline: none;
    box-sizing: border-box;

    &:focus {
      border-color: #00c3ff;
    }

    option {
      background: #0f172a;
      color: #ffffff;
    }
  }
`;

const BotonAgregarTruck = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(0, 195, 255, 0.15);
  border: 1px solid rgba(0, 195, 255, 0.35);
  color: #38bdf8;
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: rgba(0, 195, 255, 0.3);
  }
`;

const EmptyTrucksNotice = styled.div`
  padding: 20px;
  text-align: center;
  color: #94a3b8;
  font-size: 13px;
  background: rgba(11, 15, 25, 0.4);
  border-radius: 10px;
  border: 1px dashed rgba(255, 255, 255, 0.1);
`;

const TrucksListWrapper = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const TruckEditCard = styled.div`
  background: ${(props) =>
    props.$isNew ? "rgba(0, 195, 255, 0.05)" : "rgba(11, 15, 25, 0.6)"};
  border: 1px solid
    ${(props) => (props.$isNew ? "rgba(0, 195, 255, 0.3)" : "rgba(255, 255, 255, 0.08)")};
  border-radius: 12px;
  padding: 14px;

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;

    .plate-tag {
      background: rgba(0, 195, 255, 0.2);
      color: #38bdf8;
      font-size: 12px;
      font-weight: 800;
      padding: 3px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .new-tag {
      background: rgba(16, 185, 129, 0.2);
      color: #34d399;
      font-size: 11px;
      font-weight: 700;
      padding: 3px 8px;
      border-radius: 6px;
    }

    .btn-unlink {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
      font-size: 11px;
      font-weight: 600;
      padding: 4px 8px;
      border-radius: 6px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 4px;

      &:hover {
        background: rgba(239, 68, 68, 0.3);
      }
    }

    .btn-delete {
      background: rgba(239, 68, 68, 0.15);
      border: 1px solid rgba(239, 68, 68, 0.35);
      color: #f87171;
      font-size: 11px;
      padding: 4px 8px;
      border-radius: 6px;
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

const LinkAvailableBox = styled.div`
  margin-top: 14px;
  padding: 12px 14px;
  background: rgba(11, 15, 25, 0.5);
  border: 1px dashed rgba(0, 195, 255, 0.3);
  border-radius: 10px;

  label {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #cbd5e1;
    margin-bottom: 8px;
    font-weight: 500;
  }

  .link-row {
    display: flex;
    gap: 10px;

    select {
      flex: 1;
      padding: 8px 10px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 6px;
      color: #ffffff;
      font-size: 12px;
      outline: none;
    }

    .btn-attach {
      background: rgba(0, 195, 255, 0.2);
      border: 1px solid rgba(0, 195, 255, 0.4);
      color: #38bdf8;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;

      &:hover:not(:disabled) {
        background: rgba(0, 195, 255, 0.35);
      }

      &:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
    }
  }
`;

const ModalTrucksFooter = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 26px;
  background: rgba(15, 23, 42, 0.85);
  border-top: 1px solid rgba(255, 255, 255, 0.08);

  .btn-close-modal {
    padding: 11px 18px;
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

  .btn-save-modal {
    padding: 11px 22px;
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

const BadgeFichaVinculada = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.35);
  color: #34d399;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 11px;
  font-weight: 600;
`;

const FichaActivaContainer = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(11, 15, 25, 0.7);
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 12px;
  padding: 14px 18px;
  flex-wrap: wrap;
  gap: 12px;

  .ficha-details {
    display: flex;
    align-items: center;
    gap: 12px;

    .avatar-chip {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: rgba(0, 195, 255, 0.15);
      color: #38bdf8;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 22px;
    }

    h4 {
      margin: 0 0 3px 0;
      color: #ffffff;
      font-size: 14px;
      font-weight: 700;
    }

    p {
      margin: 0;
      color: #94a3b8;
      font-size: 12px;

      strong {
        color: #38bdf8;
      }
    }
  }

  .btn-cambiar-ficha {
    display: flex;
    align-items: center;
    gap: 6px;
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.35);
    color: #fbbf24;
    padding: 8px 14px;
    border-radius: 8px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;

    &:hover {
      background: rgba(245, 158, 11, 0.25);
    }
  }
`;

const VincularChoferSelectorBox = styled.div`
  .selector-row {
    display: flex;
    gap: 10px;

    @media (max-width: 650px) {
      flex-direction: column;
    }

    select {
      flex: 1;
      padding: 10px 14px;
      background: #0f172a;
      border: 1px solid rgba(255, 255, 255, 0.15);
      border-radius: 8px;
      color: #ffffff;
      font-size: 13px;
      outline: none;

      &:focus {
        border-color: #00c3ff;
      }

      option {
        background: #0f172a;
        color: #ffffff;
      }
    }

    .btn-asignar-chofer {
      display: flex;
      align-items: center;
      gap: 6px;
      background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
      border: none;
      color: #ffffff;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 700;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;

      &:hover:not(:disabled) {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(0, 195, 255, 0.35);
      }

      &:disabled {
        background: #334155;
        color: #94a3b8;
        cursor: not-allowed;
      }
    }
  }
`;
