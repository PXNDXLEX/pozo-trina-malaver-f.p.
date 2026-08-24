import { useEffect, useState } from "react";
import { supabase } from "../supabase/supabase.config";
import { FormularioCamiones } from "../forms/FormularioCamiones";
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
  MdAddCircleOutline
} from "react-icons/md";

export function TablaCamiones() {
  const [datos, setDatos] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estado para Modal Crear Nuevo Camión
  const [showCrearModal, setShowCrearModal] = useState(false);

  const [editandoCamion, setEditandoCamion] = useState(null);
  const [placaEdit, setPlacaEdit] = useState("");
  const [choferEdit, setChoferEdit] = useState("");
  const [capacidadEdit, setCapacidadEdit] = useState("");

  const consultar = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("camiones")
      .select("*")
      .order("id", { ascending: false });

    if (!error && data) {
      setDatos(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    consultar();
  }, []);

  const handleEliminar = async (id, chofer) => {
    const confirmar = window.confirm(`¿Estás seguro de que deseas eliminar a ${chofer}?`);
    if (!confirmar) return;

    const { error } = await supabase.from("camiones").delete().eq("id", id);

    if (error) {
      alert(`Error al eliminar: ${error.message}`);
    } else {
      alert("Camión eliminado de la base de datos.");
      consultar();
    }
  };

  const activarEdicion = (camion) => {
    setEditandoCamion(camion.id);
    setPlacaEdit(camion.placa || "");
    setChoferEdit(camion.chofer || "");
    setCapacidadEdit(camion.capacidad || "");
  };

  const handleGuardarEdicion = async (id) => {
    const { error } = await supabase
      .from("camiones")
      .update({
        placa: placaEdit.trim().toUpperCase(),
        chofer: choferEdit.trim(),
        capacidad: parseFloat(capacidadEdit) || 0,
      })
      .eq("id", id);

    if (error) {
      alert(`Error al actualizar camión: ${error.message}`);
    } else {
      alert("🎉 ¡Camión actualizado con éxito!");
      setEditandoCamion(null);
      consultar();
    }
  };

  return (
    <Container>
      <HeaderSection>
        <TitleGroup>
          <IconBadge>
            <MdLocalShipping />
          </IconBadge>
          <div>
            <h2>Lista de Camiones Cisterna</h2>
            <p className="subtitle">Consulta, edita y gestiona las unidades de transporte registradas</p>
          </div>
        </TitleGroup>

        <BtnCrearCamion onClick={() => setShowCrearModal(true)}>
          <MdAddCircleOutline /> Registrar Nuevo Camión
        </BtnCrearCamion>
      </HeaderSection>

      {loading ? (
        <LoadingState>Cargando camiones registrados...</LoadingState>
      ) : (
        <>
          {/* 🖥️ TABLA DESKTOP */}
          <TableWrapper>
            <StyledTable>
              <thead>
                <tr>
                  <th><MdConfirmationNumber className="th-icon" /> Placa</th>
                  <th><MdPerson className="th-icon" /> Chofer Asignado</th>
                  <th><MdWaterDrop className="th-icon" /> Capacidad (Lts)</th>
                  <th style={{ textAlign: "center" }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {datos.map((camion) => {
                  const esEdicion = editandoCamion === camion.id;

                  return (
                    <tr key={camion.id}>
                      <td>
                        {esEdicion ? (
                          <InputInline
                            type="text"
                            value={placaEdit}
                            onChange={(e) => setPlacaEdit(e.target.value)}
                            placeholder="Placa"
                          />
                        ) : (
                          <PlacaBadge>{camion.placa}</PlacaBadge>
                        )}
                      </td>

                      <td>
                        {esEdicion ? (
                          <InputInline
                            type="text"
                            value={choferEdit}
                            onChange={(e) => setChoferEdit(e.target.value)}
                            placeholder="Nombre Chofer"
                          />
                        ) : (
                          <span className="chofer-name">{camion.chofer}</span>
                        )}
                      </td>

                      <td>
                        {esEdicion ? (
                          <InputInline
                            type="number"
                            value={capacidadEdit}
                            onChange={(e) => setCapacidadEdit(e.target.value)}
                            placeholder="Litros"
                          />
                        ) : (
                          <CapacidadBadge>
                            {Number(camion.capacidad).toLocaleString()} Lts
                          </CapacidadBadge>
                        )}
                      </td>

                      <td>
                        <ActionCell>
                          {esEdicion ? (
                            <>
                              <BtnSave onClick={() => handleGuardarEdicion(camion.id)}>
                                <MdSave /> Guardar
                              </BtnSave>
                              <BtnCancel onClick={() => setEditandoCamion(null)}>
                                <MdClose /> Cancelar
                              </BtnCancel>
                            </>
                          ) : (
                            <>
                              <BtnEdit onClick={() => activarEdicion(camion)}>
                                <MdEdit /> Editar
                              </BtnEdit>
                              <BtnDelete onClick={() => handleEliminar(camion.id, camion.chofer)}>
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

          {/* 📱 VISTA TARJETAS MOBILE */}
          <CardsWrapper>
            {datos.map((camion) => {
              const esEdicion = editandoCamion === camion.id;

              return (
                <CamionCard key={camion.id}>
                  {esEdicion ? (
                    <CardForm>
                      <label>Placa:</label>
                      <InputInline
                        type="text"
                        value={placaEdit}
                        onChange={(e) => setPlacaEdit(e.target.value)}
                      />

                      <label>Chofer:</label>
                      <InputInline
                        type="text"
                        value={choferEdit}
                        onChange={(e) => setChoferEdit(e.target.value)}
                      />

                      <label>Capacidad (Lts):</label>
                      <InputInline
                        type="number"
                        value={capacidadEdit}
                        onChange={(e) => setCapacidadEdit(e.target.value)}
                      />

                      <CardActions>
                        <BtnSave onClick={() => handleGuardarEdicion(camion.id)}>
                          <MdSave /> Guardar
                        </BtnSave>
                        <BtnCancel onClick={() => setEditandoCamion(null)}>
                          <MdClose /> Cancelar
                        </BtnCancel>
                      </CardActions>
                    </CardForm>
                  ) : (
                    <>
                      <CardHeader>
                        <PlacaBadge>{camion.placa}</PlacaBadge>
                        <CapacidadBadge>{Number(camion.capacidad).toLocaleString()} Lts</CapacidadBadge>
                      </CardHeader>

                      <CardRow>
                        <span className="label"><MdPerson /> Chofer:</span>
                        <span className="val">{camion.chofer}</span>
                      </CardRow>

                      <CardActions>
                        <BtnEdit onClick={() => activarEdicion(camion)}>
                          <MdEdit /> Editar
                        </BtnEdit>
                        <BtnDelete onClick={() => handleEliminar(camion.id, camion.chofer)}>
                          <MdDelete /> Eliminar
                        </BtnDelete>
                      </CardActions>
                    </>
                  )}
                </CamionCard>
              );
            })}
          </CardsWrapper>
        </>
      )}

      {/* ➕ MODAL CREAR NUEVO CAMIÓN */}
      {showCrearModal && (
        <ModalOverlay onClick={() => setShowCrearModal(false)}>
          <ModalContentForm onClick={(e) => e.stopPropagation()}>
            <ModalCloseBtn onClick={() => setShowCrearModal(false)} title="Cerrar">
              <MdClose />
            </ModalCloseBtn>
            <FormularioCamiones
              onCamionAgregado={() => {
                setShowCrearModal(false);
                consultar();
              }}
            />
          </ModalContentForm>
        </ModalOverlay>
      )}
    </Container>
  );
}

// 🎨 STYLED COMPONENTS DARK GLASSMORPHISM FOR CAMIONES
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

const BtnCrearCamion = styled.button`
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
    }

    td {
      padding: 16px 20px;
      font-size: 14px;
      color: #f8fafc;
      vertical-align: middle;
    }
  }

  .chofer-name {
    font-weight: 600;
    color: #ffffff;
  }
`;

const PlacaBadge = styled.span`
  display: inline-block;
  background: rgba(0, 195, 255, 0.15);
  color: #00c3ff;
  border: 1px solid rgba(0, 195, 255, 0.3);
  padding: 4px 10px;
  border-radius: 8px;
  font-family: monospace;
  font-weight: 700;
  font-size: 13px;
  letter-spacing: 1px;
`;

const CapacidadBadge = styled.span`
  display: inline-block;
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 4px 10px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 13px;
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
  padding: 8px 14px;
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

const BtnDelete = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
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
  padding: 8px 14px;
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
  padding: 8px 14px;
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

