import styled, { ThemeProvider } from "styled-components";
import { GlobalStyles } from "./styles/GlobalStyles";
import { MyRoutes, useThemeStore } from "./index";

function App() {
  const { themeStyle } = useThemeStore();
  return (
    <ThemeProvider theme={themeStyle}>
      <Container>
        <GlobalStyles />
        <section className="contentRouters">
          <MyRoutes />
        </section>
      </Container>
    </ThemeProvider>
  );
}

const Container = styled.main`
  width: 100%;
  min-height: 100vh;
  background-color: #0b0f19;
  display: flex;
  flex-direction: column;

  .contentRouters {
    width: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
`;

export default App;
