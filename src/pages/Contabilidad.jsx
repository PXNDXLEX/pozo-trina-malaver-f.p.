import { MenuTemplate } from "../templates/MenuTemplate";
import { TablaContabilidad } from "../tables/TablaContabilidad";
import styled from "styled-components";

export function Contabilidad() {
  return (
    <MenuTemplate>
      <Header>
        <h1>📊 Reporte de Contabilidad</h1>
        

        <p>Cierre de ventas y rendimiento por chofer (Diario, Semanal, Quincenal, Mensual e Historico)</p>
      </Header>

      <Section>
        <h3>Resumen de Ventas Totales</h3>
        <TablaContabilidad />
      </Section>

      
    </MenuTemplate>
  );
}

const Header = styled.div`
  margin-bottom: 30px;
  h1 { color: #00c8ff; margin-bottom: 5px; }
  p { color: #ccc; }
`;

const Section = styled.div`
  background: rgba(255, 255, 255, 0.03);
  padding: 25px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  margin-bottom: 20px;
`;