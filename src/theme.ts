import { alpha, createTheme } from "@mui/material/styles";

// グロービススタイルのカラーパレット
const primaryMain = "#003366"; // 深い知的な青
const primaryDark = "#002244";
const primaryLight = "#0055AA";
const accentMain = "#E60012"; // グロービスレッド
const accentDark = "#CC0010";
const accentLight = "#FF3340";
const canvas = "#F8F9FA"; // 柔らかいグレー背景
const surface = "#FFFFFF";
const outline = "#E1E4E8";

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
    borderRadius: 12,
  },
  typography: {
    fontFamily:
      "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    h1: { fontWeight: 800, letterSpacing: "-0.02em", lineHeight: 1.2 },
    h2: { fontWeight: 700, letterSpacing: "-0.015em", lineHeight: 1.3 },
    h3: { fontWeight: 700, letterSpacing: "-0.01em", lineHeight: 1.4 },
    h4: { fontWeight: 700, lineHeight: 1.4 },
    h5: { fontWeight: 600, lineHeight: 1.5 },
    h6: { fontWeight: 600, lineHeight: 1.5 },
    subtitle1: { fontWeight: 500, lineHeight: 1.6 },
    body1: { lineHeight: 1.7 },
    body2: { lineHeight: 1.6 },
    button: { fontWeight: 600, letterSpacing: "0.02em" },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundImage:
            "radial-gradient(circle at 0% 0%, rgba(0, 51, 102, 0.04), transparent 60%), radial-gradient(circle at 100% 100%, rgba(230, 0, 18, 0.03), transparent 60%)",
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: "linear-gradient(135deg, #003366 0%, #0055AA 100%)",
          backdropFilter: "blur(12px)",
          borderBottom: `1px solid ${alpha("#FFFFFF", 0.1)}`,
          boxShadow: "0 2px 12px rgba(0, 51, 102, 0.08)",
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
        disableElevation: false,
      },
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
          paddingInline: 24,
          paddingBlock: 10,
          fontSize: "0.95rem",
          fontWeight: 600,
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        },
        containedPrimary: {
          boxShadow: "0 4px 12px rgba(0, 51, 102, 0.15)",
          ":hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 24px rgba(0, 51, 102, 0.25)",
          },
        },
        containedSecondary: {
          boxShadow: "0 4px 12px rgba(230, 0, 18, 0.15)",
          ":hover": {
            transform: "translateY(-2px)",
            boxShadow: "0 8px 24px rgba(230, 0, 18, 0.25)",
          },
        },
        outlined: {
          borderWidth: 1.5,
          paddingInline: 23,
          ":hover": {
            borderWidth: 1.5,
            transform: "translateY(-2px)",
          },
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
          borderRadius: 16,
          border: `1px solid ${alpha("#E1E4E8", 0.6)}`,
          backgroundImage:
            "linear-gradient(145deg, rgba(255,255,255,1) 0%, rgba(248,249,250,0.5) 100%)",
          boxShadow:
            "0 2px 8px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)",
          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          ":hover": {
            boxShadow:
              "0 8px 24px rgba(0, 0, 0, 0.08), 0 2px 6px rgba(0, 0, 0, 0.08)",
            transform: "translateY(-4px)",
          },
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
