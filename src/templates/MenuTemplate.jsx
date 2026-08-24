import { useState } from "react";
import styled from "styled-components";
import { useAuthStore } from "../store/AuthStore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabase.config";

export function MenuTemplate({ children }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  
  

  // Reemplaza los dos useState anteriores por este único controlador
const [openSubMenu, setOpenSubMenu] = useState(null);
const toggleSubMenu = (menuName) => {
  // Si el menú clickeado ya estaba abierto, lo cierra; si no, abre el nuevo y cierra el anterior
  setOpenSubMenu(openSubMenu === menuName ? null : menuName);
};


  return (
    <Container>
      <Sidebar>
        <h1>Ventas de Pozo Trina Malaver F.P.</h1>
        <nav>

          {/* 🏠 Ocultar Dashboard al Camionero */}
  {user?.role === "administrador" && (
    <Link to="/home" className={location.pathname === "/home" ? "active" : ""}>
      🏠 Dashboard
    </Link>
  )}
          {/* 🚚 Ocultar todo el bloque de Camiones Cisterna al Camionero */}
  {user?.role !== "camionero" && (
    <>
      <MenuButton
        onClick={() => toggleSubMenu('camiones')}
        className={openSubMenu === 'camiones' ? "active" : ""}
      >
        🚚 Camiones Cisterna
      </MenuButton>

      {/* Submenú desplegable */}
      {openSubMenu === 'camiones' && (
        <SubMenu>
          <Link to="/camion" className={location.pathname === "/camion" ? "active" : ""}>
            📝 Registro de Camiones
          </Link>
          
          {/* Solo visible para el administrador */}
          {user?.role === "administrador" && (
            <Link to="/listcamion" className={location.pathname === "/listcamion" ? "active" : ""}>
              📋 Lista de Camiones
            </Link>
                )}
        </SubMenu>
      )}
    </>
  )}

         
          
          <MenuButton 
            onClick={() => toggleSubMenu('ventas') ? "active" : ""}
            
          >
            🚚 Ventas 
          </MenuButton>

          {/* Submenú desplegable */}
          {openSubMenu === 'ventas' && (
            <SubMenu>
              <Link to="/recarga" className={location.pathname === "/recarga" ? "active" : ""}>
                📝 Registro de Recargas
              </Link>
              {user?.role === "administrador" && (
              <Link to="/detalle-recarga" className={location.pathname === "/detalle-recarga" ? "active" : ""}>
                📋 Lista de Recargas del Dia
              </Link>
               )}
            </SubMenu>
          )}
           {user?.role === "administrador" && (
          <Link to="/contabilidad" className={location.pathname === "/contabilidad" ? "active" : ""}>
            📊 Contabilidad 
          </Link>
            )}
            {user?.role === "administrador" && (
              <>
           <MenuButton 
            onClick={() => toggleSubMenu('usuarios') ? "active" : ""}
            
          >
            👥 Usuarios
          </MenuButton>
            {openSubMenu === 'usuarios' && (
            <SubMenu>
               
              <Link to="/usuario" className={location.pathname === "/usuario" ? "active" : ""}>
                📝 Registro de Usuario
              </Link>
              
              
              <Link to="/gestusuarios" className={location.pathname === "/gestusuarios" ? "active" : ""}>
             👥 Gestion de Usuarios
          </Link>
              </SubMenu>
             )}
            </>
          )}
            
          <Link to="/" className={location.pathname === "/" ? "active" : ""} onClick={() => supabase.auth.signOut()}>
            🚪 Cerrar Sesión
          </Link>
        </nav>
      </Sidebar>
      <MainContent>{children}</MainContent>
    </Container>
  );
}

// Estilos de Styled Components
const Container = styled.div`
  display: flex;
  min-height: 100vh;
  background: #131313;
  color: #ffffff;
`;

const Sidebar = styled.aside`
  width: 260px;
  background: #00e1ff;
  padding: 20px;
  
  nav {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-top: 20px;
  }
  
  a, button {
    color: black;
    text-decoration: none;
    padding: 10px;
    border-radius: 5px;
    text-align: left;
    font-size: 1rem;
  }
  
  a.active, button.active {
    background: white;
    color: #00b4cc;
    font-weight: bold;
  }
`;

const MenuButton = styled.button`
  background: none;
  border: none;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  font-family: inherit;
`;

const SubMenu = styled.div`
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding-left: 20px; /* Sangría para denotar jerarquía */
  
  a {
    font-size: 0.9rem;
    background: rgba(255, 255, 255, 0.2);
  }

  a.active {
    background: white;
    color: #00b4cc;
  }
`;

const MainContent = styled.main`
  flex: 1;
  padding: 30px;
`;
