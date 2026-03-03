import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Tooltip,
} from '@mui/material';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { usePreferencesStore } from '../../store/preferences.store';
import { useTranslation } from '../../hooks/useTranslation';

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const { themeMode, toggleTheme, language, setLanguage } = usePreferencesStore();
  const { t } = useTranslation();

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => setAnchorEl(null);

  const handleLogout = async () => {
    handleMenuClose();
    await logout();
    navigate('/');
  };

  return (
    <AppBar position="sticky" elevation={1}>
      <Toolbar>
        <Typography
          variant="h6"
          component={Link}
          to="/"
          sx={{ flexGrow: 1, color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
        >
          🏰 Catan Tournament
        </Typography>

        <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
          {/* Language toggle */}
          <Tooltip title={t.common.language}>
            <Button
              color="inherit"
              size="small"
              onClick={() => setLanguage(language === 'en' ? 'es' : 'en')}
              sx={{ minWidth: 40, fontWeight: 700, fontSize: 13 }}
            >
              {language === 'en' ? 'ES' : 'EN'}
            </Button>
          </Tooltip>

          {/* Theme toggle */}
          <Tooltip title={themeMode === 'light' ? t.common.darkMode : t.common.lightMode}>
            <IconButton color="inherit" onClick={toggleTheme}>
              {themeMode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          {isAuthenticated && user ? (
            <>
              <Button color="inherit" component={Link} to="/create" sx={{ ml: 0.5 }}>
                {t.nav.createTournament}
              </Button>
              <IconButton onClick={handleMenuOpen} sx={{ p: 0, ml: 1 }}>
                <Avatar sx={{ bgcolor: 'secondary.main', width: 36, height: 36, fontSize: 14 }}>
                  {user.displayName[0].toUpperCase()}
                </Avatar>
              </IconButton>
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              >
                <MenuItem
                  onClick={() => {
                    handleMenuClose();
                    navigate(`/profile/${user.id}`);
                  }}
                >
                  {t.nav.myProfile}
                </MenuItem>
                <MenuItem onClick={handleLogout}>{t.nav.logout}</MenuItem>
              </Menu>
            </>
          ) : (
            <>
              <Button color="inherit" component={Link} to="/login">
                {t.nav.login}
              </Button>
              <Button
                variant="contained"
                color="secondary"
                component={Link}
                to="/register"
                sx={{ ml: 1 }}
              >
                {t.nav.signUp}
              </Button>
            </>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
