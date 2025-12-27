import { alpha, createTheme } from "@mui/material/styles";

// UI/UX Pro Max - Premium Executive Palette
const primaryMain = "#0F172A"; // Slate 900 - Deep, authoritative, trust
const primaryDark = "#020617"; // Slate 950
const primaryLight = "#334155"; // Slate 700

const secondaryMain = "#D4AF37"; // Metallic Gold - Visionary, Premium
const secondaryDark = "#B45309"; // Darker Gold/Bronze
const secondaryLight = "#FCD34D"; // Lighter Gold

const backgroundDefault = "#F8FAFC"; // Slate 50 - Clean, airy
const backgroundPaper = "#FFFFFF";
const outline = alpha("#0F172A", 0.12);

const theme = createTheme({
  palette: {
    primary: {
      main: primaryMain,
      dark: primaryDark,
      light: primaryLight,
      contrastText: "#FFFFFF",
    },
    secondary: {
      main: secondaryMain,
      dark: secondaryDark,
      light: secondaryLight,
      contrastText: "#0F172A",
    },
    background: {
      default: backgroundDefault,
      paper: backgroundPaper,
    },
    text: {
      primary: "#0F172A", // Slate 900
      secondary: "#475569", // Slate 600
    },
    divider: outline,
  },
  shape: {
    borderRadius: 8, // Modern standard
  },
  typography: {
    fontFamily:
      "var(--font-inter), -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    h1: {
      fontFamily: "var(--font-outfit)",
      fontWeight: 700,
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
      color: primaryMain,
    },
    h2: {
      fontFamily: "var(--font-outfit)",
      fontWeight: 700,
      letterSpacing: "-0.01em",
      lineHeight: 1.25,
      color: primaryMain,
    },
    h3: {
      fontFamily: "var(--font-outfit)",
      fontWeight: 600,
      letterSpacing: "-0.01em",
      lineHeight: 1.3,
      color: primaryMain,
    },
    h4: {
      fontFamily: "var(--font-outfit)",
      fontWeight: 600,
      lineHeight: 1.4,
    },
    h5: {
      fontFamily: "var(--font-outfit)",
      fontWeight: 600,
    },
    h6: {
      fontFamily: "var(--font-outfit)",
      fontWeight: 600,
    },
    subtitle1: {
      fontWeight: 500,
      letterSpacing: "0.01em",
      color: primaryLight,
    },
    button: {
      fontFamily: "var(--font-outfit)",
      fontWeight: 600,
      letterSpacing: "0.02em",
      textTransform: "none",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: backgroundDefault,
          backgroundImage:
            "radial-gradient(circle at 50% 0%, rgba(15, 23, 42, 0.03) 0%, transparent 50%)",
        },
      },
    },
    MuiAppBar: {
      defaultProps: {
        elevation: 0,
        position: "sticky",
      },
      styleOverrides: {
        root: {
          backgroundColor: alpha(backgroundPaper, 0.7),
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${alpha(primaryMain, 0.05)}`,
          color: primaryMain,
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: "10px 24px",
          transition: "all 0.2s ease-in-out",
          ":hover": {
            transform: "translateY(-1px)",
          },
        },
        containedPrimary: {
          backgroundColor: primaryMain,
          ":hover": {
            backgroundColor: primaryDark,
            boxShadow: `0 4px 12px ${alpha(primaryMain, 0.25)}`,
          },
        },
        containedSecondary: {
          color: primaryMain,
          backgroundColor: secondaryMain,
          ":hover": {
            backgroundColor: secondaryLight,
            boxShadow: `0 4px 12px ${alpha(secondaryMain, 0.3)}`,
          },
        },
        outlined: {
          borderWidth: "1.5px !important",
          ":hover": {
            backgroundColor: alpha(primaryMain, 0.04),
          },
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: 12,
          border: `1px solid ${alpha(primaryMain, 0.08)}`,
          boxShadow: `0 1px 3px ${alpha("#000", 0.05)}`,
          transition: "all 0.3s ease",
          ":hover": {
            transform: "translateY(-2px)",
            boxShadow: `0 12px 24px ${alpha("#000", 0.06)}`,
            borderColor: alpha(primaryMain, 0.15),
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
        elevation1: {
          boxShadow: `0 1px 3px ${alpha("#000", 0.05)}, 0 1px 2px ${alpha("#000", 0.1)}`,
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: "outlined",
        size: "medium",
      },
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            borderRadius: 8,
            transition: "all 0.2s ease",
            "&.Mui-focused": {
              boxShadow: `0 0 0 3px ${alpha(primaryMain, 0.1)}`,
            },
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
          borderRadius: 6,
        },
        filled: {
          backgroundColor: alpha(primaryMain, 0.08),
        },
      },
    },
  },
});

export default theme;
