import { createGlobalStyle } from "styled-components"

export const GlobalStyles = createGlobalStyle`
  *, *::before, *::after {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  html, body {
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100vh;
    font-family: "Arial", sans-serif;
    color: ${(props) => props.theme.text}; /* Usa el color de texto del tema */
    
    /* ESTA LÍNEA SE ADAPTA AL FONDO DE TU TEMA (Y QUITA EL GRIS) */
    background-color: ${(props) => props.theme.bgtotal}; 
    
    /* Animación suave opcional al cambiar entre modo claro y oscuro */
    transition: background-color 0.3s ease, color 0.3s ease; 
  }
`

