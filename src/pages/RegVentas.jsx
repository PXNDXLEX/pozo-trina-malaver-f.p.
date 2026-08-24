import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FormularioVentas } from "../forms/FormularioVentas";
import {MenuTemplate } from "../templates/MenuTemplate";
import styled from "styled-components";

export function RegVentas() {
 const navigate = useNavigate(); 

  const manejarRedireccion = () => {
    
    navigate("/detalle-recarga"); 
  };

  return (
    <MenuTemplate>
    <Container>
      <div className="content">
        <h2>Registrar Nueva Carga</h2>
        <FormularioVentas OnVentaRealizada={manejarRedireccion} />
        
        <hr style={{ margin: "30px 0", border: "0.1px solid rgba(255,255,255,0.1)" }} />
        
      
      </div>
    </Container>
    </MenuTemplate>
  );
}

const Container = styled.div`
  height: 100vh;
  padding: 40px;
  color: white;
  .content {
    max-width: 1000px;
    margin: 0 auto;
  }
  h2 {
    color: #00c8ff;
    margin-bottom: 20px;
  }
`;