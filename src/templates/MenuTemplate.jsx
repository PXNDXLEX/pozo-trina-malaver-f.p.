import { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useAuthStore } from "../store/AuthStore";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "../supabase/supabase.config";
import {
  MdDashboard,
  MdLocalShipping,
  MdWaterDrop,
  MdAssessment,
  MdPeople,
  MdLogout,
  MdKeyboardArrowDown,
  MdAddCircleOutline,
  MdFormatListBulleted,
  MdPersonAdd,
  MdManageAccounts,
  MdClose
} from "react-icons/md";

export function MenuTemplate({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [activeDropdown, setActiveDropdown] = useState(null);
  const [mobileSheet, setMobileSheet] = useState(null);
  const dropdownRef = useRef(null);

  // Close desktop dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close mobile sheet when location changes
  useEffect(() => {
    setMobileSheet(null);
    setActiveDropdown(null);
  }, [location.pathname]);

  const toggleDropdown = (menuName) => {
    setActiveDropdown(activeDropdown === menuName ? null : menuName);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <Container>
      {/* 🖥️ DESKTOP TOP BAR (Visión PC) */}
      <DesktopTopBar ref={dropdownRef}>
        <BrandContainer to={user?.role === "administrador" ? "/home" : "/recarga"}>
          <LogoBadge>💧</LogoBadge>
          <BrandTitle>
            Pozo Trina <span>Malaver F.P.</span>
          </BrandTitle>
        </BrandContainer>

        <NavGroup>
          {/* Dashboard */}
          {user?.role === "administrador" && (
            <NavLink to="/home" className={location.pathname === "/home" ? "active" : ""}>
              <MdDashboard className="nav-icon" /> Dashboard
            </NavLink>
          )}

          {/* Camiones Dropdown */}
          {user?.role !== "camionero" && (
            <DropdownContainer>
              <DropdownTrigger
                onClick={() => toggleDropdown("camiones")}
                className={location.pathname.includes("camion") ? "active" : ""}
              >
                <MdLocalShipping className="nav-icon" /> Camiones <MdKeyboardArrowDown className="chevron" />
              </DropdownTrigger>

              {activeDropdown === "camiones" && (
                <DropdownMenu>
                  <DropdownItem to="/camion" className={location.pathname === "/camion" ? "active" : ""}>
                    <MdAddCircleOutline /> Registro de Camiones
                  </DropdownItem>
                  {user?.role === "administrador" && (
                    <DropdownItem to="/listcamion" className={location.pathname === "/listcamion" ? "active" : ""}>
                      <MdFormatListBulleted /> Lista de Camiones
                    </DropdownItem>
                  )}
                </DropdownMenu>
              )}
            </DropdownContainer>
          )}

          {/* Ventas / Recargas Dropdown */}
          <DropdownContainer>
            <DropdownTrigger
              onClick={() => toggleDropdown("ventas")}
              className={location.pathname === "/recarga" || location.pathname === "/detalle-recarga" ? "active" : ""}
            >
              <MdWaterDrop className="nav-icon" /> Recargas <MdKeyboardArrowDown className="chevron" />
            </DropdownTrigger>

            {activeDropdown === "ventas" && (
              <DropdownMenu>
                <DropdownItem to="/recarga" className={location.pathname === "/recarga" ? "active" : ""}>
                  <MdAddCircleOutline /> Registro de Recargas
                </DropdownItem>
                {user?.role === "administrador" && (
                  <DropdownItem to="/detalle-recarga" className={location.pathname === "/detalle-recarga" ? "active" : ""}>
                    <MdFormatListBulleted /> Recargas del Día
                  </DropdownItem>
                )}
              </DropdownMenu>
            )}
          </DropdownContainer>

          {/* Contabilidad */}
          {user?.role === "administrador" && (
            <NavLink to="/contabilidad" className={location.pathname === "/contabilidad" ? "active" : ""}>
              <MdAssessment className="nav-icon" /> Contabilidad
            </NavLink>
          )}

          {/* Usuarios Dropdown */}
          {user?.role === "administrador" && (
            <DropdownContainer>
              <DropdownTrigger
                onClick={() => toggleDropdown("usuarios")}
                className={location.pathname === "/usuario" || location.pathname === "/gestusuarios" ? "active" : ""}
              >
                <MdPeople className="nav-icon" /> Usuarios <MdKeyboardArrowDown className="chevron" />
              </DropdownTrigger>

              {activeDropdown === "usuarios" && (
                <DropdownMenu>
                  <DropdownItem to="/usuario" className={location.pathname === "/usuario" ? "active" : ""}>
                    <MdPersonAdd /> Registrar Usuario
                  </DropdownItem>
                  <DropdownItem to="/gestusuarios" className={location.pathname === "/gestusuarios" ? "active" : ""}>
                    <MdManageAccounts /> Gestión de Usuarios
                  </DropdownItem>
                </DropdownMenu>
              )}
            </DropdownContainer>
          )}
        </NavGroup>

        {/* User Pill & Logout */}
        <UserPill>
          <UserInfo>
            <span className="user-name">{user?.name || "Usuario"}</span>
            <span className="user-role">{user?.role || "Personal"}</span>
          </UserInfo>
          <LogoutButton onClick={handleLogout} title="Cerrar Sesión">
            <MdLogout />
          </LogoutButton>
        </UserPill>
      </DesktopTopBar>

      {/* 📱 MOBILE TOP HEADER (Visión Teléfono) */}
      <MobileTopHeader>
        <BrandContainer to="/home">
          <LogoBadge>💧</LogoBadge>
          <BrandTitle style={{ fontSize: "16px" }}>
            Pozo Trina <span>Malaver</span>
          </BrandTitle>
        </BrandContainer>
        <UserBadgeMobile>{user?.role || "Personal"}</UserBadgeMobile>
      </MobileTopHeader>

      {/* MAIN CONTENT AREA */}
      <MainContent>{children}</MainContent>

      {/* 📱 MOBILE BOTTOM NAVIGATION BAR (Teléfono) */}
      <MobileBottomNav>
        {user?.role === "administrador" && (
          <NavItemMobile to="/home" className={location.pathname === "/home" ? "active" : ""}>
            <MdDashboard />
            <span>Dashboard</span>
          </NavItemMobile>
        )}

        {user?.role !== "camionero" && (
          <NavButtonMobile
            onClick={() => setMobileSheet("camiones")}
            className={location.pathname.includes("camion") ? "active" : ""}
          >
            <MdLocalShipping />
            <span>Camiones</span>
          </NavButtonMobile>
        )}

        <NavButtonMobile
          onClick={() => setMobileSheet("ventas")}
          className={location.pathname === "/recarga" || location.pathname === "/detalle-recarga" ? "active" : ""}
        >
          <MdWaterDrop />
          <span>Recargas</span>
        </NavButtonMobile>

        {user?.role === "administrador" && (
          <NavItemMobile to="/contabilidad" className={location.pathname === "/contabilidad" ? "active" : ""}>
            <MdAssessment />
            <span>Balances</span>
          </NavItemMobile>
        )}

        {user?.role === "administrador" && (
          <NavButtonMobile
            onClick={() => setMobileSheet("usuarios")}
            className={location.pathname === "/usuario" || location.pathname === "/gestusuarios" ? "active" : ""}
          >
            <MdPeople />
            <span>Usuarios</span>
          </NavButtonMobile>
        )}

        <NavButtonMobile onClick={handleLogout} style={{ color: "#ef4444" }}>
          <MdLogout />
          <span>Salir</span>
        </NavButtonMobile>
      </MobileBottomNav>

      {/* 📱 MOBILE BOTTOM SHEET (Modal desplegable de opciones) */}
      {mobileSheet && (
        <SheetOverlay onClick={() => setMobileSheet(null)}>
          <SheetContent onClick={(e) => e.stopPropagation()}>
            <SheetHeader>
              <h3>
                {mobileSheet === "camiones" && "🚚 Gestión de Camiones"}
                {mobileSheet === "ventas" && "💧 Gestión de Recargas"}
                {mobileSheet === "usuarios" && "👥 Gestión de Usuarios"}
              </h3>
              <button onClick={() => setMobileSheet(null)}>
                <MdClose />
              </button>
            </SheetHeader>

            <SheetOptions>
              {mobileSheet === "camiones" && (
                <>
                  <Link to="/camion">
                    <MdAddCircleOutline /> Registrar Nuevo Camión
                  </Link>
                  {user?.role === "administrador" && (
                    <Link to="/listcamion">
                      <MdFormatListBulleted /> Ver Lista de Camiones
                    </Link>
                  )}
                </>
              )}

              {mobileSheet === "ventas" && (
                <>
                  <Link to="/recarga">
                    <MdAddCircleOutline /> Nueva Recarga / Venta
                  </Link>
                  {user?.role === "administrador" && (
                    <Link to="/detalle-recarga">
                      <MdFormatListBulleted /> Lista de Recargas del Día
                    </Link>
                  )}
                </>
              )}

              {mobileSheet === "usuarios" && (
                <>
                  <Link to="/usuario">
                    <MdPersonAdd /> Registrar Nuevo Usuario
                  </Link>
                  <Link to="/gestusuarios">
                    <MdManageAccounts /> Ver y Gestionar Usuarios
                  </Link>
                </>
              )}
            </SheetOptions>
          </SheetContent>
        </SheetOverlay>
      )}
    </Container>
  );
}

// 🎨 STYLED COMPONENTS CON DISEÑO MODERNO GLASSMORPHISM
const Container = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  background: #0b0f19;
  color: #f8fafc;
`;

const DesktopTopBar = styled.header`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 68px;
  background: rgba(19, 25, 39, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);

  @media (max-width: 768px) {
    display: none;
  }
`;

const BrandContainer = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  text-decoration: none;
`;

const LogoBadge = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: linear-gradient(135deg, #00c3ff 0%, #0072ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  box-shadow: 0 0 12px rgba(0, 195, 255, 0.4);
`;

const BrandTitle = styled.h1`
  font-size: 18px;
  font-weight: 700;
  color: #ffffff;
  margin: 0;

  span {
    color: #00c3ff;
    font-weight: 400;
  }
`;

const NavGroup = styled.nav`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const NavLink = styled(Link)`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  border-radius: 8px;
  color: #94a3b8;
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.2s ease;

  .nav-icon {
    font-size: 18px;
  }

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
  }

  &.active {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(0, 195, 255, 0.2) 0%, rgba(0, 114, 255, 0.2) 100%);
    border: 1px solid rgba(0, 195, 255, 0.3);
  }
`;

const DropdownContainer = styled.div`
  position: relative;
`;

const DropdownTrigger = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 8px;
  color: #94a3b8;
  background: none;
  border: none;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  transition: all 0.2s ease;

  .nav-icon {
    font-size: 18px;
  }

  .chevron {
    font-size: 16px;
    transition: transform 0.2s;
  }

  &:hover {
    color: #ffffff;
    background: rgba(255, 255, 255, 0.06);
  }

  &.active {
    color: #ffffff;
    background: linear-gradient(135deg, rgba(0, 195, 255, 0.2) 0%, rgba(0, 114, 255, 0.2) 100%);
    border: 1px solid rgba(0, 195, 255, 0.3);
  }
`;

const DropdownMenu = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 8px;
  width: 210px;
  background: #151c2c;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  padding: 6px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  gap: 4px;
  animation: fadeIn 0.2s ease-out;
`;

const DropdownItem = styled(Link)`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: #cbd5e1;
  text-decoration: none;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.15s ease;

  svg {
    font-size: 16px;
    color: #00c3ff;
  }

  &:hover {
    color: #ffffff;
    background: rgba(0, 195, 255, 0.12);
  }

  &.active {
    color: #ffffff;
    background: rgba(0, 195, 255, 0.2);
    font-weight: 600;
  }
`;

const UserPill = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 6px 14px;
  border-radius: 20px;
`;

const UserInfo = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;

  .user-name {
    font-size: 13px;
    font-weight: 600;
    color: #ffffff;
  }

  .user-role {
    font-size: 11px;
    color: #00c3ff;
    text-transform: capitalize;
  }
`;

const LogoutButton = styled.button`
  background: rgba(239, 68, 68, 0.15);
  color: #ef4444;
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;

  &:hover {
    background: #ef4444;
    color: #ffffff;
    box-shadow: 0 0 10px rgba(239, 68, 68, 0.4);
  }
`;

/* 📱 MOBILE SPECIFIC STYLES */
const MobileTopHeader = styled.header`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 16px;
    background: rgba(19, 25, 39, 0.95);
    border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    position: sticky;
    top: 0;
    z-index: 90;
  }
`;

const UserBadgeMobile = styled.span`
  font-size: 11px;
  font-weight: 600;
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.2), rgba(0, 114, 255, 0.2));
  color: #00c3ff;
  border: 1px solid rgba(0, 195, 255, 0.3);
  padding: 4px 10px;
  border-radius: 12px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const MainContent = styled.main`
  flex: 1;
  padding: 24px;
  max-width: 1300px;
  width: 100%;
  margin: 0 auto;
  box-sizing: border-box;

  @media (max-width: 768px) {
    padding: 16px 12px 90px 12px;
  }
`;

const MobileBottomNav = styled.nav`
  display: none;

  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: space-around;
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    height: 64px;
    background: rgba(15, 23, 42, 0.95);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border-top: 1px solid rgba(255, 255, 255, 0.1);
    z-index: 1000;
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.4);
  }
`;

const NavItemMobile = styled(Link)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #64748b;
  text-decoration: none;
  font-size: 10px;
  font-weight: 500;
  flex: 1;

  svg {
    font-size: 20px;
  }

  &.active {
    color: #00c3ff;
    font-weight: 700;

    svg {
      transform: translateY(-2px);
      filter: drop-shadow(0 0 6px rgba(0, 195, 255, 0.5));
    }
  }
`;

const NavButtonMobile = styled.button`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  color: #64748b;
  background: none;
  border: none;
  font-size: 10px;
  font-weight: 500;
  flex: 1;
  cursor: pointer;
  font-family: inherit;

  svg {
    font-size: 20px;
  }

  &.active {
    color: #00c3ff;
    font-weight: 700;

    svg {
      transform: translateY(-2px);
      filter: drop-shadow(0 0 6px rgba(0, 195, 255, 0.5));
    }
  }
`;

/* Bottom Sheet Modal for Mobile Options */
const SheetOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  align-items: flex-end;
  animation: fadeIn 0.2s ease-out;
`;

const SheetContent = styled.div`
  width: 100%;
  background: #151c2c;
  border-top-left-radius: 20px;
  border-top-right-radius: 20px;
  border-top: 1px solid rgba(0, 195, 255, 0.3);
  padding: 20px;
  box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.6);
  animation: slideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
`;

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
    margin: 0;
  }

  button {
    background: rgba(255, 255, 255, 0.08);
    border: none;
    color: #94a3b8;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 18px;
    cursor: pointer;
  }
`;

const SheetOptions = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;

  a {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px 16px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    color: #f8fafc;
    text-decoration: none;
    font-size: 14px;
    font-weight: 500;

    svg {
      font-size: 20px;
      color: #00c3ff;
    }

    &:active {
      background: rgba(0, 195, 255, 0.15);
      border-color: rgba(0, 195, 255, 0.4);
    }
  }
`;
