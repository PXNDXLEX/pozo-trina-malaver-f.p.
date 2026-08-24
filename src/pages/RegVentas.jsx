import { useNavigate } from "react-router-dom";
import { FormularioVentas } from "../forms/FormularioVentas";
import { MenuTemplate } from "../templates/MenuTemplate";

export function RegVentas() {
  const navigate = useNavigate();

  const manejarRedireccion = () => {
    navigate("/detalle-recarga");
  };

  return (
    <MenuTemplate>
      <FormularioVentas OnVentaRealizada={manejarRedireccion} />
    </MenuTemplate>
  );
}