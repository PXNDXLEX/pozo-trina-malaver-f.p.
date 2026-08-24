import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";
import { FormularioUsuario } from "../forms/FormularioUsuario";
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
  MdPersonAdd
} from "react-icons/md";

export function TablaUsuario() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para Modal de Crear Nuevo Usuario
  const [showCrearModal, setShowCrearModal] = useState(false);

  // Estados para Edición de perfil (Nombre, Cédula, Rol)
  const [editandoUser, setEditandoUser] = useState(null);
  const [nombreEdit, setNombreEdit] = useState("");
  const [cedulaEdit, setCedulaEdit] = useState("");
  const [rolEdit, setRolEdit] = useState("registrador");

  // Estados para Cambiar Clave desde Admin
  const [passwordModalUser, setPasswordModalUser] = useState(null);
  const [nuevaClaveAdmin, setNuevaClaveAdmin] = useState("");
  const [loadingClaveAdmin, setLoadingClaveAdmin] = useState(false);

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

  const activarEdicion = (usr) => {
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
      // 1. Intentamos actualizar la clave en Supabase Auth mediante la función RPC 'cambiar_clave_usuario'
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

  return (
    <Container>
      <HeaderSection>
        <TitleGroup>
          <IconBadge>
            <MdPeople />
          </IconBadge>
          <div>
            <h2>Gestión de Personal / Usuarios</h2>
            <p className="subtitle">Consulta, edita perfiles, registra nuevos usuarios y cambia contraseñas</p>
          </div>
        </TitleGroup>

        <BtnCrearUsuario onClick={() => setShowCrearModal(true)}>
          <MdPersonAdd /> Registrar Nuevo Usuario
        </BtnCrearUsuario>
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
                              <BtnSave onClick={() => handleGuardarEdicion(usr.id)}>
                                <MdSave /> Guardar
                              </BtnSave>
                              <BtnCancel onClick={() => setEditandoUser(null)}>
                                <MdClose /> Cancelar
                              </BtnCancel>
                            </EditBoxInline>
                          ) : (
                            <>
                              <BtnEdit onClick={() => activarEdicion(usr)}>
                                <MdEdit /> Editar
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
                        <BtnEdit onClick={() => activarEdicion(usr)}>
                          <MdEdit /> Editar
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

      {/* ➕ MODAL CREAR NUEVO USUARIO */}
      {showCrearModal && (
        <ModalOverlay onClick={() => setShowCrearModal(false)}>
          <ModalContentForm onClick={(e) => e.stopPropagation()}>
            <ModalCloseBtn onClick={() => setShowCrearModal(false)} title="Cerrar">
              <MdClose />
            </ModalCloseBtn>
            <FormularioUsuario
              onUsuarioRegistrado={() => {
                setShowCrearModal(false);
                obtenerUsuarios();
              }}
            />
          </ModalContentForm>
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
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
  flex-wrap: wrap;
`;

const BtnCrearUsuario = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  color: #ffffff;
  border: none;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 15px rgba(0, 195, 255, 0.3);

  svg {
    font-size: 18px;
  }

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 195, 255, 0.45);
  }
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
`;

const BtnEdit = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: rgba(0, 195, 255, 0.15);
  color: #00c3ff;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: #00c3ff;
    color: #0b0f19;
    box-shadow: 0 0 12px rgba(0, 195, 255, 0.4);
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
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
  border: 1px solid rgba(148, 163, 184, 0.3);
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;

  &:hover {
    background: #94a3b8;
    color: #0b0f19;
  }
`;

const InputInline = styled.input`
  width: 100%;
  padding: 8px 12px;
  background: rgba(15, 23, 42, 0.8);
  border: 1px solid rgba(0, 195, 255, 0.4);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
  box-sizing: border-box;

  &:focus {
    border-color: #00c3ff;
    box-shadow: 0 0 8px rgba(0, 195, 255, 0.3);
  }
`;

const SelectInline = styled.select`
  width: 100%;
  padding: 8px 12px;
  background: #151c2c;
  border: 1px solid rgba(0, 195, 255, 0.4);
  border-radius: 8px;
  color: #ffffff;
  font-size: 13px;
  outline: none;
  cursor: pointer;
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

const UserCard = styled.div`
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
  align-items: flex-start;

  .user-name {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: #ffffff;
  }

  .cedula-tag {
    display: block;
    font-size: 12px;
    color: #94a3b8;
    font-family: monospace;
    margin-top: 2px;
  }
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;

  button {
    flex: 1;
    justify-content: center;
  }
`;

const CardForm = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;

  label {
    font-size: 12px;
    color: #94a3b8;
    font-weight: 500;
  }
`;

/* Modal Cambiar Clave Admin */
const ModalOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(6px);
  z-index: 1200;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn 0.2s ease-out;
`;

const ModalContent = styled.div`
  background: #151c2c;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 420px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  animation: fadeIn 0.25s ease-out;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 24px;
  background: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
  }

  button {
    background: none;
    border: none;
    color: #94a3b8;
    font-size: 20px;
    cursor: pointer;
    display: flex;
    align-items: center;

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

const ModalContentForm = styled.div`
  position: relative;
  background: #151c2c;
  border: 1px solid rgba(0, 195, 255, 0.3);
  border-radius: 20px;
  width: 100%;
  max-width: 650px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 24px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  animation: fadeIn 0.25s ease-out;
`;

const ModalCloseBtn = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #94a3b8;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  cursor: pointer;
  transition: all 0.2s ease;
  z-index: 10;

  &:hover {
    background: rgba(239, 68, 68, 0.2);
    color: #ef4444;
  }
`;

