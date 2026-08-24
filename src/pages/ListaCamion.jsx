import{useState} from "react";
import { MenuTemplate } from "../templates/MenuTemplate";
import { TablaCamiones } from "../tables/TablaCamiones";



export function ListaCamion(){
  return (
    <MenuTemplate>
      <TablaCamiones />
    </MenuTemplate>
  );
}