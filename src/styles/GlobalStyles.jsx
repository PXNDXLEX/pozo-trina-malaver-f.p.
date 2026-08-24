import { createGlobalStyle } from "styled-components";

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
    font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #f8fafc;
    background-color: #0b0f19 !important;
    overflow-x: hidden;
  }

  #root {
    width: 100%;
    min-height: 100vh;
    background-color: #0b0f19 !important;
    display: flex;
    flex-direction: column;
  }
`;
