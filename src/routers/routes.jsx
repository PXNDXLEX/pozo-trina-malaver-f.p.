import{Routes, Route, Navigate } from "react-router-dom";
import { Login, Regcamion, ListaCamion, Contabilidad, ListVentas, RegVentas, Gestusuarios, RegUsuario, CuentasPorCobrar, Home, PagosRegistrados } from "../index";
import {ProtectedRoute} from "../components/ProtectedRoute";
export function MyRoutes(){
    return(
          <Routes>
      {/* Ruta pública */}
      <Route path="/" element={<Login />} />
      

      <Route path="/recarga" element={<Navigate to="/home" replace />} />

      {/* 🔐 PANTALLAS DE DASHBOARD: Administrador, Registrador y Camionero */}
      <Route element={<ProtectedRoute rolesPermitidos={["administrador", "registrador", "camionero"]} />}>
        <Route path="/home" element={<Home />} />
      </Route>

      {/* 🔐 REGISTRO DE CAMIONES: Administrador y Registrador */}
      <Route element={<ProtectedRoute rolesPermitidos={["administrador", "registrador"]} />}>
        <Route path="/camion" element={<Regcamion />} />
      </Route>

      {/* 🔐 CUENTAS POR COBRAR / PAGAR Y DETALLE DE VENTAS: Administrador y Camionero */}
      <Route element={<ProtectedRoute rolesPermitidos={["administrador", "camionero"]} />}>
        <Route path="/cuentas-por-cobrar" element={<CuentasPorCobrar />} />
        <Route path="/detalle-recarga" element={<ListVentas />} />
      </Route>
      {/* 👑 PANTALLAS EXCLUSIVAS: Solo el Administrador puede ingresar */}
      <Route element={<ProtectedRoute rolesPermitidos={["administrador"]} />}>
        <Route path="/listcamion" element={<ListaCamion />} />
        <Route path="/contabilidad" element={<Contabilidad />} />
        <Route path="/pagos" element={<PagosRegistrados />} />
        <Route path="/gestusuarios" element={<Gestusuarios />} />
        <Route path="/usuario" element={<RegUsuario />} />
      </Route>

      {/* Redirección por defecto */}
      <Route path="*" element={<Navigate to="/home" replace />} />
    </Routes>
  );
   
   
   
   
}

