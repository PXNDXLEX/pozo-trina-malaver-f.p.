import styled, {ThemeProvider} from "styled-components";
import { GlobalStyles } from "./styles/GlobalStyles";
import { MyRoutes, useThemeStore } from "./index";
import {Device} from "./styles/sizes"
import { useState } from "react";
function App() {
 
  const {themeStyle} = useThemeStore();
  return (
    <ThemeProvider theme={themeStyle}>
    <Container >
      <GlobalStyles />
      <section className="contentRouters"><MyRoutes/></section>
    </Container>
    </ThemeProvider>
  );
}
const Container = styled.main`
  display:grid;
  grid-template-columns: min-content 1fr;
  transition: all 0.3s;
  background-color:${({theme})=>theme.bgtotal};

  
  
  @media ${Device.tablet} {
    grid-template-colums:0px 1fr;
    &.active{
      grid-template-columns: 260px 1fr;
    }
  
   .contentRouters{
    
    grid-column: 2;
    width: 100%
    
    
  }
  }
`
export default App
