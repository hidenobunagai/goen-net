import { alpha, createTheme } from "@mui/material/styles";

const primaryMain = "#001b44";
const primaryDark = "#001030";
const primaryLight = "#1e3b7a";
const accentMain = "#c7322f";
const accentDark = "#a12724";
const accentLight = "#f0625e";
const canvas = "#f4f6fb";
const surface = "#ffffff";
const outline = "#d5d9e3";

const theme = createTheme({
  palette: {
    primary: {
      main: primaryMain,
      dark: primaryDark,
      light: primaryLight,
      contrastText: "#ffffff",
    },
    secondary: {
      main: accentMain,
      dark: accentDark,
      light: accentLight,
      contrastText: "#ffffff",
    },
    background: {
      default: canvas,
      paper: surface,
    },
    text: {
      primary: "#1b1e29",
      secondary: "#4b5164",
    },
    divider: outline,
  },
  shape: {
    borderRadius: 8,
  },
  typography: {
    fontFamily: "'Inter', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    h1: { fontWeight: 700, letterSpacing: "0.02em" },
    h2: { fontWeight: 700, letterSpacing: "0.015em" },
    h3: { fontWeight: 700 },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600 },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(0, 27, 68, 0.06), transparent 55%), radial-gradient(circle at 100% 0%, rgba(199, 50, 47, 0.05), transparent 45%)",
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage:
            "linear-gradient(135deg, rgba(0, 27, 68, 0.92), rgba(14, 56, 125, 0.9))",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${alpha(primaryLight, 0.35)}`,
        },
      },
    },
    MuiToolbar: {
      styleOverrides: {
        root: {
          minHeight: 72,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 10,
          paddingInline: 18,
        },
        containedPrimary: {
          boxShadow: "0 10px 20px rgba(0, 27, 68, 0.18)",
          ":hover": {
            boxShadow: "0 12px 24px rgba(0, 27, 68, 0.24)",
          },
        },
        outlined: {
          borderWidth: 2,
          paddingInline: 18,
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${alpha(primaryMain, 0.08)}`,
          boxShadow: "0 16px 32px rgba(15, 23, 42, 0.08)",
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 14,
          border: `1px solid ${alpha(primaryMain, 0.08)}`,
          backgroundImage:
            "linear-gradient(155deg, rgba(255,255,255,0.98), rgba(236, 240, 250, 0.92))",
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 8,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          "& .MuiTableCell-root": {
            color: primaryMain,
            fontWeight: 700,
            borderBottom: `1px solid ${alpha(primaryMain, 0.12)}`,
          },
        },
      },
    },
  },
});

export default theme;
