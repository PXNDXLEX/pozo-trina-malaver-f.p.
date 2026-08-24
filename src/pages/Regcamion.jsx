import{useState} from "react";
import { MenuTemplate } from "../templates/MenuTemplate";
import { FormularioCamiones } from "../forms/FormularioCamiones";




export function Regcamion(){
  return (
    <MenuTemplate>
      <FormularioCamiones />
    </MenuTemplate>
  );
}