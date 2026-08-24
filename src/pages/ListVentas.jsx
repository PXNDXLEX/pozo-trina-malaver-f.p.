import { useState } from "react";
import { TablaDetcon } from "../tables/TablaDetcon";
import {MenuTemplate } from "../templates/MenuTemplate";
import styled from "styled-components";

export function ListVentas() {
  
  return (
    <MenuTemplate>
    <Container>
      <div className="content">  
        <h2>Ventas Detalladas de Hoy</h2>
        <TablaDetcon refresh={false} />
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