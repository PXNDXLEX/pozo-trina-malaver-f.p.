import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import { jsPDF } from "jspdf";
import styled from "styled-components";
import { MdWaterDrop, MdLocalShipping, MdAttachMoney, MdPayments } from "react-icons/md";

export function FormularioVentas({ OnVentaRealizada }) {
  const user = useAuthStore((state) => state.user);

  // Estados dinámicos vinculados a tus campos visuales
  const [listaCamiones, setListaCamiones] = useState([]);
  const [camionSeleccionadoId, setCamionSeleccionadoId] = useState("");
  const [monto, setMonto] = useState("");
  const [metodo, setMetodo] = useState("Efectivo");
  const [foto, setFoto] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    buscarCamionesAsignados();
  }, [user]);

  const buscarCamionesAsignados = async () => {
    if (!user || !user.id) return;

    try {
      let query = supabase.from("camiones").select("id, chofer, placa");

      // Si ingresa un camionero, ve solo su unidad. Si es Admin/Registrador, ve todos.
      if (user.role === "camionero") {
        query = query.eq("perfil_id", user.id);
      } else {
        query = query.order("chofer", { ascending: true });
      }

      const { data, error } = await query;
      if (error) throw error;

      if (data && data.length > 0) {
        setListaCamiones(data);
      }
    } catch (err) {
      console.error("Error al cargar camiones:", err.message);
    }
  };

  // Generador de comprobante PDF optimizado tipo Ticket
  const generarComprobantePDF = async (camion, montoPago, metodoPago, fecha, fotoUrl) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 220] });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("POZO TRINA MALAVER F.P.", 40, 12, { align: "center" });
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Comprobante de Recarga Digital", 40, 17, { align: "center" });
    doc.text("---------------------------------------------------------", 40, 22, { align: "center" });

    doc.setFontSize(9);
    doc.text(`Fecha: ${fecha.toLocaleDateString()}  Hora: ${fecha.toLocaleTimeString()}`, 5, 28);
    
    doc.setFont("helvetica", "bold");
    doc.text("Chofer:", 5, 36);
    doc.setFont("helvetica", "normal");
    doc.text(`${camion?.chofer || "No Especificado"}`, 20, 36);

    doc.setFont("helvetica", "bold");
    doc.text("Placa Unidad:", 5, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${camion?.placa || "No Especificado"}`, 28, 42);

    doc.text("---------------------------------------------------------", 40, 48, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.text("Método de Pago:", 5, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`${metodoPago}`, 33, 55);

    doc.setFillColor(240, 240, 240);
    doc.rect(4, 62, 72, 12, "F");
    
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL PAGADO:", 8, 70);
    doc.text(`$${montoPago}`, 72, 70, { align: "right" });

    
    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("¡Gracias por su pago! Recarga autorizada.", 40, 85, { align: "center" });

     if (fotoUrl) {
      try {
        doc.setFont("helvetica", "bold");
        doc.text("Registro Fotográfico:", 5, 92);

        const base64Data = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous"; 
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png")); // Formato PNG universal
          };
          img.onerror = () => reject(new Error("Error al procesar imagen"));
          img.src = fotoUrl;
        });
         // Dibujamos la foto al fondo (X: 10, Y: 98, Ancho: 60, Alto: 45)
        doc.addImage(base64Data, "PNG", 10, 98, 60, 45);
        
      } catch (imgError) {
        console.error("No se pudo agregar la foto al final del PDF:", imgError);
      }
    }
    doc.save(`Ticket_Recarga_${camion?.placa || "unidad"}.pdf`);
  };

  const handleGuardarVenta = async (e) => {
    e.preventDefault();
    if (!camionSeleccionadoId) return alert("Por favor, seleccione un camión.");
    setLoading(true);

    const camionActual = listaCamiones.find((c) => c.id === camionSeleccionadoId);
    const fechaActual = new Date();

    try {
      let fotoUrl = null;
       if (foto && foto.length > 0) {
        const archivoIndividual = foto[0]; // EXTRAE EL ARCHIVO REAL (Posición 0 del arreglo)
        const nombreArchivo = `${Date.now()}-${archivoIndividual.name}`;

        const { data: storageData, error: storageError } = await supabase.storage
          .from('fotos-camiones')
          .upload(nombreArchivo, archivoIndividual);

        if (storageError) {
          throw new Error("Error al subir la imagen: " + storageError.message);
        }

        // Obtenemos la URL pública real del archivo en el Storage
        const { data: publicUrlData } = supabase.storage
          .from('fotos-camiones')
          .getPublicUrl(nombreArchivo);

        fotoUrl = publicUrlData.publicUrl;
      }
      
      const { error } = await supabase.from("registros_carga").insert([
        {
          camion_id: camionSeleccionadoId,
          monto: Number(monto),
          metodo: metodo,
          fecha_carga: fechaActual.toISOString(),
          url_foto: fotoUrl
        },
      ]);

      if (error) throw error;

      await generarComprobantePDF(camionActual, monto, metodo, fechaActual, fotoUrl);
      alert("¡Venta registrada con éxito y ticket generado!");
      
      setMonto("");
      setCamionSeleccionadoId("");
      setFoto(null);

      // Ejecuta la redirección automática a la lista del día que programamos antes
      if (typeof OnVentaRealizada === "function") {
        OnVentaRealizada();
      }

    } catch (error) {
      alert(`Error al guardar: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <FormContainer>
      <HeaderGroup>
        <IconBadge>
          <MdWaterDrop />
        </IconBadge>
        <div>
          <h2>Registrar Nueva Carga</h2>
          <p className="subtitle">Selecciona el camión e ingresa los detalles del pago de la recarga</p>
        </div>
      </HeaderGroup>

      <FormCard onSubmit={handleGuardarVenta}>
        <InputGrid>
          <FieldBox style={{ gridColumn: "1 / -1" }}>
            <label><MdLocalShipping className="field-icon" /> Seleccione el Camión:</label>
            <select
              value={camionSeleccionadoId}
              onChange={(e) => setCamionSeleccionadoId(e.target.value)}
              required
            >
              <option value="">Seleccione...</option>
              {listaCamiones.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.chofer} ({item.placa})
                </option>
              ))}
            </select>
          </FieldBox>

          <FieldBox>
            <label><MdAttachMoney className="field-icon" /> Monto Pagado ($):</label>
            <input
              type="number"
              step="0.01"
              placeholder="Ej: 10.50"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              required
            />
          </FieldBox>

          <FieldBox>
            <label><MdPayments className="field-icon" /> Método de Pago:</label>
            <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
              <option value="Efectivo">Efectivo</option>
              <option value="Transferencia">Transferencia</option>
              <option value="Pago Móvil">Pago Móvil</option>
              <option value="Zelle">Zelle</option>
            </select>
          </FieldBox>
        </InputGrid>

              <FieldBox>
          <label className="text-white text-sm font-medium flex items-center gap-2">
            📷 Capturar Foto del Camión
          </label>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" // Fuerza a abrir la cámara trasera en dispositivos móviles
          onChange={(e) => setFoto(e.target.files)}
            className="block w-full text-sm text-gray-400 mt-1
              file:mr-4 file:py-2 file:px-4
              file:rounded-md file:border-0
              file:text-sm file:font-semibold
              file:bg-slate-700 file:text-white
              hover:file:bg-slate-600
              cursor-pointer"
          />
          {foto && (
            <p className="text-emerald-400 text-xs mt-1 font-medium">
              ✓ Foto capturada y lista
            </p>
          )}
        </FieldBox>

        <SubmitBtn type="submit" disabled={loading}>
          {loading ? "Procesando Venta..." : "Guardar Venta"}
        </SubmitBtn>
      </FormCard>
    </FormContainer>
  );
}

// 🎨 STYLED COMPONENTS MODERN GLASSMORPHIC FORM FOR RECARGAS
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

