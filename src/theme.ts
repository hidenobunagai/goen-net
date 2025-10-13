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
    borderRadius: 4,
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
          borderRadius: 4,
          paddingInline: 28,
          paddingBlock: 12,
          fontSize: "0.95rem",
          fontWeight: 600,
          transition: "all 0.2s ease",
        },
        containedPrimary: {
          boxShadow: "0 2px 8px rgba(0, 51, 102, 0.12)",
          ":hover": {
            boxShadow: "0 2px 12px rgba(0, 51, 102, 0.2)",
          },
        },
        containedSecondary: {
          boxShadow: "0 2px 8px rgba(230, 0, 18, 0.12)",
          ":hover": {
            boxShadow: "0 2px 12px rgba(230, 0, 18, 0.2)",
          },
        },
        outlined: {
          borderWidth: 1.5,
          paddingInline: 27,
          ":hover": {
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          lineHeight: 1.2,
          "&.MuiInputLabel-shrink": {
            lineHeight: 1.2,
          },
          "&.MuiInputLabel-sizeSmall": {
            lineHeight: 1.2,
          },
        },
      },
    },
    MuiFormLabel: {
      styleOverrides: {
        root: {
          lineHeight: 1.2,
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          lineHeight: 1.5,
        },
        root: {
          "& input::placeholder": {
            lineHeight: 1.5,
            opacity: 0.7,
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
          borderRadius: 4,
          border: `1px solid ${alpha(primaryMain, 0.08)}`,
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 4,
          border: `1px solid ${alpha("#E1E4E8", 0.8)}`,
          backgroundColor: "#FFFFFF",
          boxShadow: "0 1px 4px rgba(0, 0, 0, 0.08)",
          transition: "box-shadow 0.2s ease",
          ":hover": {
            boxShadow: "0 2px 8px rgba(0, 51, 102, 0.1)",
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 4,
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
            borderColor: "rgba(0, 0, 0, 0.87)",
            borderWidth: 1,
          },
        },
        notchedOutline: {
          borderWidth: 1,
        },
        input: {
          lineHeight: 1.5,
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
