import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    primary: {
      main: '#8B4513', // Catan brown (wood/settlement color)
      light: '#A0522D',
      dark: '#5C3009',
    },
    secondary: {
      main: '#D4A017', // Wheat/grain gold
      light: '#F0C030',
      dark: '#9A7010',
    },
    background: {
      default: '#FFF8F0',
      paper: '#FFFFFF',
    },
    success: {
      main: '#2E7D32',
    },
    error: {
      main: '#C62828',
    },
    warning: {
      main: '#E65100',
    },
  },
  typography: {
    fontFamily: '"Segoe UI", "Roboto", "Arial", sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
  },
});
