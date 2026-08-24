import{useState} from "react";
import { MenuTemplate } from "../templates/MenuTemplate";
import { TablaUsuario } from "../tables/TablaUsuario";


export  function Gestusuarios() {
  return (
    <MenuTemplate>
      <TablaUsuario />
    </MenuTemplate>
  );
}

  