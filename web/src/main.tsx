import React from "react";
import ReactDOM from "react-dom/client";
import {
  CssBaseline,
  StyledEngineProvider,
  ThemeProvider,
  createTheme,
} from "@mui/material";
import { App } from "./App";
import "./styles.css";
const theme = createTheme({
  palette: {
    primary: { main: "#5266e8" },
    background: { default: "#f6f8fc" },
    text: { primary: "#17233b", secondary: "#758097" },
  },
  typography: {
    fontFamily:
      'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 9, padding: "10px 18px" } },
    },
    MuiTextField: { defaultProps: { fullWidth: true, size: "small" } },
    MuiOutlinedInput: {
      styleOverrides: {
        root: { backgroundColor: "#fff" },
        input: { padding: "13px 14px" },
      },
    },
    MuiDialog: { styleOverrides: { paper: { borderRadius: 18 } } },
    MuiDialogTitle: {
      styleOverrides: { root: { fontWeight: 700, padding: "24px 24px 16px" } },
    },
  },
});
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <StyledEngineProvider injectFirst>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </StyledEngineProvider>
  </React.StrictMode>,
);
