import{useState} from "react";
import { MenuTemplate } from "../templates/MenuTemplate";
import { FormularioUsuario } from "../forms/FormularioUsuario";




export function RegUsuario(){
  return (
    <MenuTemplate>
      <FormularioUsuario />
    </MenuTemplate>
  );
}