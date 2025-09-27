import MenuIcon from '@mui/icons-material/Menu';
import { AppBar, Box, Button, Container, Divider, IconButton, ListSubheader, Menu, MenuItem, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Navbar: React.FC = () => {
  const { signOut, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Primary navigation order: Updates first (most important section)
  const links = [
    { label: 'Updates', path: '/updates' },
    { label: 'Prioritization', path: '/prioritization' },
  ];

  const worksheetLinks = [
    { label: 'Presenter', path: '/worksheets/presenter' },
    { label: 'Coach', path: '/worksheets/coach' },
    { label: 'Observer', path: '/worksheets/observer' },
  ];

  const documentationLinks = [{ label: 'Moderator', path: '/documentation/moderator' }];

  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const openMenu = (e: React.MouseEvent<HTMLElement>) => setMenuAnchor(e.currentTarget);
  const closeMenu = () => setMenuAnchor(null);

  const [wsAnchor, setWsAnchor] = React.useState<null | HTMLElement>(null);
  const openWs = (e: React.MouseEvent<HTMLElement>) => setWsAnchor(e.currentTarget);
  const closeWs = () => setWsAnchor(null);

  const [docAnchor, setDocAnchor] = React.useState<null | HTMLElement>(null);
  const openDoc = (e: React.MouseEvent<HTMLElement>) => setDocAnchor(e.currentTarget);
  const closeDoc = () => setDocAnchor(null);

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/signin');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const navigateAndClose = (path: string, closer: () => void) => {
    navigate(path);
    closer();
  };

  return (
    <AppBar position="static" color="primary">
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: 1 }}>
          <Typography
            variant="h6"
            component="div"
            onClick={() => navigate('/')}
            sx={{ flexGrow: 1, fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}
            title="Go to Home"
          >
            Goen Net
          </Typography>
          {/* Mobile: hamburger menu */}
          <IconButton
            color="inherit"
            onClick={openMenu}
            sx={{ display: { xs: 'inline-flex', md: 'none' } }}
            aria-label="open navigation menu"
          >
            <MenuIcon />
          </IconButton>
          <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} keepMounted>
            {isAuthenticated ? (
              <>
                {links.map((link) => (
                  <MenuItem
                    key={link.path}
                    selected={isActive(link.path)}
                    onClick={() => navigateAndClose(link.path, closeMenu)}
                  >
                    {link.label}
                  </MenuItem>
                ))}
                <Divider sx={{ my: 0.5 }} />
                <ListSubheader disableSticky>Worksheets</ListSubheader>
                {worksheetLinks.map((link) => (
                  <MenuItem
                    key={link.path}
                    selected={isActive(link.path)}
                    onClick={() => navigateAndClose(link.path, closeMenu)}
                  >
                    {link.label}
                  </MenuItem>
                ))}
                <ListSubheader disableSticky>Documentation</ListSubheader>
                {documentationLinks.map((link) => (
                  <MenuItem
                    key={link.path}
                    selected={isActive(link.path)}
                    onClick={() => navigateAndClose(link.path, closeMenu)}
                  >
                    {link.label}
                  </MenuItem>
                ))}
                <Divider sx={{ my: 0.5 }} />
                <MenuItem
                  onClick={async () => {
                    await handleSignOut();
                    closeMenu();
                  }}
                >
                  Sign Out
                </MenuItem>
              </>
            ) : (
              <MenuItem onClick={() => navigateAndClose('/signin', closeMenu)}>Sign In</MenuItem>
            )}
          </Menu>

          {/* Desktop: inline links */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1 }}>
            {isAuthenticated ? (
              <>
                {/* Updates first */}
                {links.map((link) => (
                  <Button
                    key={link.path}
                    color="inherit"
                    onClick={() => navigate(link.path)}
                    sx={{
                      position: 'relative',
                      textTransform: 'none',
                      ...(isActive(link.path)
                        ? {
                            '&::after': {
                              content: '""',
                              position: 'absolute',
                              left: 8,
                              right: 8,
                              bottom: 4,
                              height: 2,
                              bgcolor: 'secondary.main',
                            },
                            fontWeight: 600,
                          }
                        : {}),
                    }}
                  >
                    {link.label}
                  </Button>
                ))}
                <Button
                  color="inherit"
                  onClick={openWs}
                  sx={{ textTransform: 'none' }}
                >
                  Worksheets
                </Button>
                <Menu anchorEl={wsAnchor} open={Boolean(wsAnchor)} onClose={closeWs} keepMounted>
                  {worksheetLinks.map((link) => (
                    <MenuItem
                      key={link.path}
                      selected={isActive(link.path)}
                      onClick={() => navigateAndClose(link.path, closeWs)}
                    >
                      {link.label}
                    </MenuItem>
                  ))}
                </Menu>
                <Button
                  color="inherit"
                  onClick={openDoc}
                  sx={{ textTransform: 'none' }}
                >
                  Documentation
                </Button>
                <Menu anchorEl={docAnchor} open={Boolean(docAnchor)} onClose={closeDoc} keepMounted>
                  {documentationLinks.map((link) => (
                    <MenuItem
                      key={link.path}
                      selected={isActive(link.path)}
                      onClick={() => navigateAndClose(link.path, closeDoc)}
                    >
                      {link.label}
                    </MenuItem>
                  ))}
                </Menu>
                <Button color="inherit" onClick={handleSignOut} sx={{ textTransform: 'none' }}>
                  Sign Out
                </Button>
              </>
            ) : (
              <Button color="inherit" onClick={() => navigate('/signin')} sx={{ textTransform: 'none' }}>
                Sign In
              </Button>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};

export default Navbar;
