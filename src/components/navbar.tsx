"use client";

import MenuIcon from "@mui/icons-material/Menu";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import ListSubheader from "@mui/material/ListSubheader";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import { alpha, useTheme } from "@mui/material/styles";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { MouseEvent, ReactNode, useCallback, useState } from "react";

const primaryLinks = [
  { label: "Updates", path: "/updates" },
  { label: "Prioritization", path: "/prioritization" },
];

const worksheetLinks = [
  { label: "Presenter", path: "/worksheets/presenter" },
  { label: "Coach", path: "/worksheets/coach" },
  { label: "Observer", path: "/worksheets/observer" },
];

const documentationLinks = [{ label: "Moderator", path: "/documentation/moderator" }];

type NavLink = {
  label: string;
  path: string;
};

function useActiveChecker() {
  const pathname = usePathname();
  return useCallback(
    (path: string) => {
      if (!pathname) return false;
      return pathname === path || pathname.startsWith(`${path}/`);
    },
    [pathname]
  );
}

export function Navbar() {
  const router = useRouter();
  const isActive = useActiveChecker();
  const { status } = useSession();
  const isAuthenticated = status === "authenticated";
  const theme = useTheme();

  const [anchorNav, setAnchorNav] = useState<HTMLElement | null>(null);
  const [anchorWorksheet, setAnchorWorksheet] = useState<HTMLElement | null>(null);
  const [anchorDocs, setAnchorDocs] = useState<HTMLElement | null>(null);

  const handleOpenNav = (event: MouseEvent<HTMLElement>) => {
    setAnchorNav(event.currentTarget);
  };
  const handleCloseNav = () => setAnchorNav(null);

  const handleOpenWorksheet = (event: MouseEvent<HTMLElement>) => {
    setAnchorWorksheet(event.currentTarget);
  };
  const handleCloseWorksheet = () => setAnchorWorksheet(null);

  const handleOpenDocs = (event: MouseEvent<HTMLElement>) => {
    setAnchorDocs(event.currentTarget);
  };
  const handleCloseDocs = () => setAnchorDocs(null);

  const navigateAndClose = (path: string, closer: () => void) => {
    closer();
    router.push(path);
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/signin" });
  };

  const renderLinkButton = ({ label, path }: NavLink) => {
    const active = isActive(path);
    return (
      <Button
        key={path}
        color="inherit"
        onClick={() => router.push(path)}
        sx={{
          position: "relative",
          fontWeight: 600,
          px: 2.5,
          py: 0.75,
          letterSpacing: "0.02em",
          bgcolor: active ? alpha(theme.palette.common.white, 0.16) : "transparent",
          color: "inherit",
          transition: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
          "&:hover": {
            bgcolor: alpha(theme.palette.common.white, 0.22),
            transform: "translateY(-1px)",
          },
          "&:active": {
            transform: "translateY(0)",
          },
        }}
      >
        {label}
      </Button>
    );
  };

  // モバイル用：すべてのリンクを含む
  const mobileMenuContent: ReactNode = isAuthenticated
    ? [
        ...primaryLinks.map(({ path, label }) => (
          <MenuItem
            key={`mobile-nav-${path}`}
            selected={isActive(path)}
            onClick={() => navigateAndClose(path, handleCloseNav)}
          >
            {label}
          </MenuItem>
        )),
        <Divider key="mobile-divider-worksheets" sx={{ my: 0.5 }} />,
        <ListSubheader key="mobile-subheader-worksheets" disableSticky>
          Worksheets
        </ListSubheader>,
        ...worksheetLinks.map((link) => (
          <MenuItem
            key={`mobile-worksheet-${link.path}`}
            selected={isActive(link.path)}
            onClick={() => navigateAndClose(link.path, handleCloseNav)}
          >
            {link.label}
          </MenuItem>
        )),
        <ListSubheader key="mobile-subheader-docs" disableSticky>
          Documentation
        </ListSubheader>,
        ...documentationLinks.map((link) => (
          <MenuItem
            key={`mobile-docs-${link.path}`}
            selected={isActive(link.path)}
            onClick={() => navigateAndClose(link.path, handleCloseNav)}
          >
            {link.label}
          </MenuItem>
        )),
        <Divider key="mobile-divider-signout" sx={{ my: 0.5 }} />,
        <MenuItem key="mobile-sign-out" onClick={handleSignOut}>
          Sign Out
        </MenuItem>,
      ]
    : null;

  // デスクトップ用：Sign Outのみ
  const desktopMenuContent: ReactNode = isAuthenticated ? (
    <MenuItem onClick={handleSignOut}>Sign Out</MenuItem>
  ) : null;
  return (
    <AppBar
      position="sticky"
      color="inherit" // Force inherit to rely on sx
      elevation={0}
      sx={{
        zIndex: (theme) => theme.zIndex.drawer + 1,
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(12px)",
        // Dark glass background to ensure white text is visible on all pages
        backgroundColor: (theme) => alpha(theme.palette.primary.main, 0.85),
        color: "#fff",
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ gap: { xs: 1, md: 1.5 }, py: { xs: 1, md: 1.25 } }}>
          <Box sx={{ flexGrow: 1 }}>
            <Link href="/" style={{ textDecoration: "none", color: "inherit" }}>
              <Typography
                variant="h6"
                component="span"
                sx={{
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  display: "inline-flex",
                  alignItems: "center",
                }}
              >
                Goen Net
              </Typography>
            </Link>
          </Box>

          <Box
            sx={{
              display: { xs: "none", sm: "none", md: "flex" },
              gap: 1.5,
              alignItems: "center",
            }}
          >
            {isAuthenticated ? (
              <>
                {primaryLinks.map(renderLinkButton)}
                <Button
                  color="inherit"
                  onClick={handleOpenWorksheet}
                  sx={{
                    fontWeight: 600,
                    px: 2.5,
                    py: 0.75,
                    letterSpacing: "0.02em",
                    color: "inherit",
                    transition: "background-color 0.2s ease, transform 0.2s ease",
                    bgcolor: anchorWorksheet
                      ? alpha(theme.palette.common.white, 0.16)
                      : "transparent",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.22),
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  Worksheets
                </Button>
                <Menu
                  anchorEl={anchorWorksheet}
                  open={Boolean(anchorWorksheet)}
                  onClose={handleCloseWorksheet}
                  keepMounted
                  disableScrollLock={true}
                >
                  {worksheetLinks.map((link) => (
                    <MenuItem
                      key={link.path}
                      selected={isActive(link.path)}
                      onClick={() => navigateAndClose(link.path, handleCloseWorksheet)}
                    >
                      {link.label}
                    </MenuItem>
                  ))}
                </Menu>

                <Button
                  color="inherit"
                  onClick={handleOpenDocs}
                  sx={{
                    fontWeight: 600,
                    px: 2.5,
                    py: 0.75,
                    letterSpacing: "0.02em",
                    color: "inherit",
                    transition: "background-color 0.2s ease, transform 0.2s ease",
                    bgcolor: anchorDocs ? alpha(theme.palette.common.white, 0.16) : "transparent",
                    "&:hover": {
                      bgcolor: alpha(theme.palette.common.white, 0.22),
                      transform: "translateY(-1px)",
                    },
                  }}
                >
                  Documentation
                </Button>
                <Menu
                  anchorEl={anchorDocs}
                  open={Boolean(anchorDocs)}
                  onClose={handleCloseDocs}
                  keepMounted
                  disableScrollLock={true}
                >
                  {documentationLinks.map((link) => (
                    <MenuItem
                      key={link.path}
                      selected={isActive(link.path)}
                      onClick={() => navigateAndClose(link.path, handleCloseDocs)}
                    >
                      {link.label}
                    </MenuItem>
                  ))}
                </Menu>
              </>
            ) : null}
          </Box>

          {/* モバイル用ハンバーガーメニュー（認証時のみ） */}
          {isAuthenticated && (
            <>
              <IconButton
                color="inherit"
                sx={{ display: { xs: "inline-flex", md: "none" } }}
                onClick={handleOpenNav}
                aria-label="Open navigation menu"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={anchorNav}
                open={Boolean(anchorNav)}
                onClose={handleCloseNav}
                keepMounted
                disableScrollLock={true}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                sx={{ display: { xs: "block", md: "none" } }}
              >
                {mobileMenuContent}
              </Menu>
            </>
          )}

          {/* デスクトップ用ハンバーガーメニュー（Sign Outのみ、認証時のみ） */}
          {isAuthenticated && (
            <>
              <IconButton
                color="inherit"
                sx={{ display: { xs: "none", md: "inline-flex" } }}
                onClick={handleOpenNav}
                aria-label="Open menu"
              >
                <MenuIcon />
              </IconButton>
              <Menu
                anchorEl={anchorNav}
                open={Boolean(anchorNav)}
                onClose={handleCloseNav}
                keepMounted
                disableScrollLock={true}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                sx={{ display: { xs: "none", md: "block" } }}
              >
                {desktopMenuContent}
              </Menu>
            </>
          )}
        </Toolbar>
      </Container>
    </AppBar>
  );
}
