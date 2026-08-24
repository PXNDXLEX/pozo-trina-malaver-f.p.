import React from "react";
import { Navigate, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/AuthStore"; // Importas tu hook

export function ProtectedRoute({ rolesPermitidos }) {
  // Extraemos el usuario y el token desde Zustand
  const token = useAuthStore((state) => state.token);
  const user = useAuthStore((state) => state.user);

  // Si no hay token válido, directo al login
  if (!token) {
    return <Navigate to="/" replace />;
  }

  // Comparamos el rol guardado ('administrador' o 'registrador') contra los permitidos
  if (rolesPermitidos && !rolesPermitidos.includes(user?.role)) {
    return <Navigate to="/home" replace />; 
  }

  return <Outlet />;
}
