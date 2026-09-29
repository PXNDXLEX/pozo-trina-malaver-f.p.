import React from "react";
import { TablaDetcon } from "../tables/TablaDetcon";
import { MenuTemplate } from "../templates/MenuTemplate";
import styled from "styled-components";
import { MdWaterDrop } from "react-icons/md";

export function ListVentas() {
  return (
    <MenuTemplate>
      <Container>
        <Header>
          <IconBadge>
            <MdWaterDrop />
          </IconBadge>
          <div>
            <h2>Control Detallado de Recargas</h2>
            <p className="subtitle">
              Consulta de viajes, arqueo diario y reporte de ventas filtrado por fecha con registros disponibles
            </p>
          </div>
        </Header>

        <TablaDetcon refresh={false} />
      </Container>
    </MenuTemplate>
  );
}

const Container = styled.div`
  max-width: 1300px;
  margin: 0 auto;
  animation: fadeIn 0.3s ease-out;
  padding-bottom: 40px;
`;

const Header = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 24px;

  h2 {
    font-size: 24px;
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
  width: 50px;
  height: 50px;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(0, 195, 255, 0.25), rgba(0, 114, 255, 0.25));
  border: 1px solid rgba(0, 195, 255, 0.4);
  color: #00c3ff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  box-shadow: 0 0 20px rgba(0, 195, 255, 0.25);
  flex-shrink: 0;
`;