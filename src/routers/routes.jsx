import{Routes, Route, Navigate } from "react-router-dom";
import { Login, Regcamion, ListaCamion, Contabilidad, ListVentas, RegVentas, Gestusuarios, RegUsuario, Home} from "../index";
import {ProtectedRoute} from "../components/ProtectedRoute";
export function MyRoutes(){
    return(
          <Routes>
      {/* Ruta pública */}
      <Route path="/" element={<Login />} />
      

      <Route element={<ProtectedRoute rolesPermitidos={["administrador", "registrador","camionero"]} />}>
        <Route path="/recarga" element={<RegVentas />} />
      </Route>

      {/* 🔐 PANTALLAS COMPARTIDAS: Ambos roles pueden ingresar aquí */}
      <Route element={<ProtectedRoute rolesPermitidos={["administrador", "registrador"]} />}>
        <Route path="/camion" element={<Regcamion />} />
        
      </Route>

      {/* 👑 PANTALLAS EXCLUSIVAS: Solo el Administrador puede ingresar */}
      <Route element={<ProtectedRoute rolesPermitidos={["administrador"]} />}>
       <Route path="/home" element={<Home />} />
        <Route path="/listcamion" element={<ListaCamion />} />
        <Route path="/contabilidad" element={<Contabilidad />} />
        <Route path="/detalle-recarga" element={<ListVentas />} />
        <Route path="/gestusuarios" element={<Gestusuarios />} />
          <Route path="/usuario" element={<RegUsuario />} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
   
   
   
   
}

