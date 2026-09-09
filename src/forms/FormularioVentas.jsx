import React, { useState, useEffect } from "react";
import { supabase } from "../supabase/supabase.config";
import { useAuthStore } from "../store/AuthStore";
import { jsPDF } from "jspdf";
import { MdWaterDrop, MdLocalShipping, MdAttachMoney, MdPayments, MdPhotoCamera } from "react-icons/md";
import styled from "styled-components";

export function FormularioVentas({ OnVentaRealizada }) {
  const user = useAuthStore((state) => state.user);

  // Estados dinámicos vinculados a tus campos visuales
  const [listaCamiones, setListaCamiones] = useState([]);
  const [busquedaPlaca, setBusquedaPlaca] = useState("");
  
  // Estado para el viaje individual actual antes de subirlo al lote
  const [monto, setMonto] = useState("");
  const [foto, setFoto] = useState(null);
  
  // El nuevo Carrito de viajes acumulados (Cola de despachos)
  const [carritoCargas, setCarritoCargas] = useState([]);
  const [metodo, setMetodo] = useState("Efectivo");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    buscarCamionesAsignados();
  }, [user]);

  const buscarCamionesAsignados = async () => {
    if (!user || !user.id) return;

    try {
      let query = supabase.from("camiones").select("id, chofer, placa, capacidad, modelo");

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
    } catch (error) {
      console.error("Error al cargar camiones:", error.message);
    }
  };

  // Agregar un viaje individual al lote (Carrito)
  const handleAgregarAlLote = (e) => {
    e.preventDefault();

    const camionActual = listaCamiones.find(
      (c) => c.placa.trim().toUpperCase() === busquedaPlaca.trim().toUpperCase()
    );

    if (!camionActual) {
      alert("Por favor, seleccione un camión válido de la lista predictiva.");
      return;
    }

    if (!monto || parseFloat(monto) <= 0) {
      alert("Por favor, ingrese un monto válido.");
      return;
    }

  if (!foto) {
      alert("La foto de evidencia del camión es obligatoria para registrar el viaje.");
      return;
    }

    const archivoIndividual = foto; 

    const nuevoViaje = {
      camion_id: camionActual.id,
      placa: camionActual.placa,
      chofer: camionActual.chofer,
      capacidad: camionActual.capacidad,
      modelo: camionActual.modelo,
      monto: parseFloat(monto),
      archivoFoto: archivoIndividual,
      previewUrl: URL.createObjectURL(archivoIndividual),
      camionData: camionActual
    };

    setCarritoCargas([...carritoCargas, nuevoViaje]);
    
    // Limpiamos los inputs del viaje actual para el siguiente
    setBusquedaPlaca("");
    setMonto("");
    setFoto(null);
    const fileInput = document.getElementById("input-foto-camion");
    if (fileInput) fileInput.value = "";
  };
  // Generador de comprobante PDF optimizado tipo Ticket (Adaptado para lotes)
  const generarComprobantePDF = async (camion, montoPago, metodoPago, fecha, fotoUrl) => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: [80, 150] });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("POZO TRINA MALAVER F.P.", 40, 12, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text("Comprobante de Recarga Digital", 40, 17, { align: "center" });
    doc.text("------------------------------------------", 40, 22, { align: "center" });

    doc.setFontSize(9);
    doc.text(`Fecha: ${fecha.toLocaleDateString()} Hora: ${fecha.toLocaleTimeString()}`, 5, 28);

    doc.setFont("helvetica", "bold");
    doc.text("Chofer:", 5, 36);
    doc.setFont("helvetica", "normal");
    doc.text(`${camion?.chofer || "No Especificado"}`, 20, 36);

    doc.setFont("helvetica", "bold");
    doc.text("Placa Unidad:", 5, 42);
    doc.setFont("helvetica", "normal");
    doc.text(`${camion?.placa || "No Especificado"}`, 28, 42);

    doc.text("------------------------------------------", 40, 48, { align: "center" });

    doc.setFont("helvetica", "bold");
    doc.text("Método de Pago:", 5, 55);
    doc.setFont("helvetica", "normal");
    doc.text(`${metodoPago}`, 33, 55);

    doc.setFillColor(240, 240, 240);
    doc.rect(4, 62, 72, 12, "F");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.text("TOTAL A PAGAR:", 8, 70);
    doc.text(`$${montoPago}`, 72, 70, { align: "right" });

    doc.setTextColor(100, 100, 100);
    doc.setFont("helvetica", "italic");
    doc.setFontSize(8);
    doc.text("Recarga autorizada.", 40, 85, { align: "center" });

    if (fotoUrl) {
      try {
        const base64Data = await new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
          };
          img.onerror = () => reject(new Error("Error al procesar imagen"));
          img.src = fotoUrl;
        });

        doc.addImage(base64Data, "PNG", 10, 90, 60, 45);
      } catch (imgError) {
        console.error("No se pudo agregar la foto al final del PDF:", imgError);
      }
    }

    doc.save(`Ticket_Recarga_${camion?.placa || "unidad"}.pdf`);
  };
  // PROCESAR GUARDADO (Maneja el lote completo para ambos flujos)
  const procesarLoteCargas = async (tipoEstatus, metodoLote, pagoIdValor) => {
    if (carritoCargas.length === 0) return;
    setLoading(true);

    try {
      const fechaActual = new Date();

      for (const viaje of carritoCargas) {
        let fotoUrl = null;

        // Subir foto individual de este viaje a Storage
        if (viaje.archivoFoto) {
          const nombreArchivo = `${Date.now()}-${viaje.archivoFoto.name}`;
          const { error: storageError } = await supabase.storage
            .from("fotos-camiones") // Asegúrate de que coincida con tu bucket existente
            .upload(nombreArchivo, viaje.archivoFoto);

          if (storageError) throw new Error("Error al subir la imagen: " + storageError.message);

          const { data: publicUrlData } = supabase.storage
            .from("fotos-camiones")
            .getPublicUrl(nombreArchivo);

          fotoUrl = publicUrlData.publicUrl;
        }

        // Insertar registro estructurado en la tabla registros_carga
        const { error: insertError } = await supabase.from("registros_carga").insert([
          {
            camion_id: viaje.camion_id,
            monto: Number(viaje.monto),
            metodo: metodoLote,
            fecha_carga: fechaActual.toISOString(),
            url_foto: fotoUrl,
            estatus: tipoEstatus, // Guarda 'pendiente' (deuda) o 'pagado'
            pago_id: pagoIdValor  // null si es deuda, o el UUID si se paga en grupo
          }
        ]);

        if (insertError) throw insertError;

        // Generar ticket individual por cada viaje del lote de forma secuencial
        await generarComprobantePDF(viaje.camionData, viaje.monto, metodoLote, fechaActual, fotoUrl);
      }

      alert(tipoEstatus === "pendiente" ? "¡Viajes guardados con éxito como Deudas!" : "¡Venta de lote registrada con éxito y tickets generados!");
      setCarritoCargas([]);

      if (typeof OnVentaRealizada === "function") {
        OnVentaRealizada();
      }
    } catch (error) {
      alert(`Error al procesar el lote: ${error.message}`);
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

      {/* Formulario para añadir elementos al lote */}
      <FormCard onSubmit={handleAgregarAlLote}>
        <InputGrid>
          <FieldBox style={{ gridColumn: "1 / -1" }}>
            <label><MdLocalShipping className="field-icon" /> Seleccione el Camión (Placa):</label>
            <input
              type="text"
              value={busquedaPlaca}
              onChange={(e) => setBusquedaPlaca(e.target.value)}
              placeholder="Escribe o selecciona la placa..."
              list="camiones-sugeridos"
              required
            />
            <datalist id="camiones-sugeridos">
              {listaCamiones.map((item) => (
                <option key={item.id} value={item.placa} label={`${item.chofer} (${item.modelo || "Sin Modelo"})`} />
              ))}
            </datalist>
          </FieldBox>

          <FieldBox>
            <label><MdAttachMoney className="field-icon" /> Monto del Viaje ($):</label>
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
            <label className="text-white text-sm font-medium flex items-center gap-2">
              <MdPhotoCamera className="field-icon" /> Capturar Foto del Camión
            </label>
            <input
              id="input-foto-camion"
              type="file"
              accept="image/*"
              capture="environment"
              onChange={(e) => setFoto(e.target.files[0])}
              className="block w-full text-sm text-gray-400 mt-1 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-600 cursor-pointer"
              required
            />
            {foto && (
              <p className="text-emerald-400 text-xs mt-1 font-medium">
              </p>
            )}
          </FieldBox>

          <FieldBox style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end" }}>
            <button type="submit" style={{ padding: "10px 20px", background: "#1e293b", color: "#fff", border: "1px solid #475569", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
              ➕ Añadir Viaje al Lote
            </button>
          </FieldBox>
        </InputGrid>
      </FormCard>

      {/* Visualización del Carrito / Lote temporal */}
      {carritoCargas.length > 0 && (
        <div style={{ marginTop: "25px", padding: "20px", background: "rgba(30, 41, 59, 0.5)", borderRadius: "8px", border: "1px solid #334155" }}>
          <h3 style={{ color: "#fff", marginBottom: "15px", fontSize: "16px" }}>Viajes Acumulados en este Lote ({carritoCargas.length})</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "20px" }}>
            {carritoCargas.map((viaje, index) => (
              <div key={index} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px", background: "#0f172a", borderRadius: "6px", border: "1px solid #1e293b" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <img src={viaje.previewUrl} alt="Evidencia" style={{ width: "55px", height: "42px", borderRadius: "4px", objectFit: "cover" }} />
                  <div>
                    <span style={{ fontWeight: "bold", color: "#38bdf8" }}>{viaje.placa}</span>
                    <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8" }}>Chofer: {viaje.chofer} | {viaje.capacidad} Lts</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "15px" }}>
                  <span style={{ fontWeight: "bold", color: "#4ade80" }}>${viaje.monto.toFixed(2)}</span>
                  <button type="button" onClick={() => setCarritoCargas(carritoCargas.filter((_, i) => i !== index))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: "16px" }}>❌</button>
                </div>
              </div>
            ))}
          </div>

          <div style={{ borderTop: "1px solid #334155", paddingTop: "15px" }}>
            <InputGrid>
              <FieldBox>
                <label><MdPayments className="field-icon" /> Método de Pago del Lote:</label>
                <select value={metodo} onChange={(e) => setMetodo(e.target.value)}>
                  <option value="Efectivo">Efectivo</option>
                  <option value="Transferencia">Transferencia</option>
                  <option value="Pago Móvil">Pago Móvil</option>
                  <option value="Zelle">Zelle</option>
                </select>
              </FieldBox>

              <FieldBox style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: "12px" }}>
                <button 
                  type="button" 
                  disabled={loading} 
                  onClick={() => procesarLoteCargas("pendiente", "Deuda", null)} 
                  style={{ width: "48%", padding: "12px", background: "#ea580c", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                >
                  ⏳ Guardar como Deuda
                </button>
                <button 
                  type="button" 
                  disabled={loading} 
                  onClick={() => procesarLoteCargas("pagado", metodo, crypto.randomUUID())} 
                  style={{ width: "48%", padding: "12px", background: "#2563eb", color: "#fff", border: "none", borderRadius: "6px", fontWeight: "bold", cursor: "pointer" }}
                >
                  {loading ? "Procesando..." : `🚀 Pagar Lote ($${carritoCargas.reduce((sum, v) => sum + v.monto, 0).toFixed(2)})`}
                </button>
              </FieldBox>
            </InputGrid>
          </div>
        </div>
      )}
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

