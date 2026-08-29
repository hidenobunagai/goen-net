import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Grid from "@mui/material/Grid";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";

import { NextSessionCard } from "@/app/(protected)/_components/next-session-card";
import { requireUserSession } from "@/lib/session";
import { getNextSession } from "@/lib/turso";

// Revalidate every 60 seconds for semi-static rendering
export const revalidate = 60;

export default async function Home() {
  const session = await requireUserSession();

  const [nextSession] = await Promise.all([getNextSession()]);
  const user = session.user;
  const firstName = user?.name?.split(" ")[0] ?? "Member";

  return (
    <Box
      sx={{
        minHeight: { xs: "100vh", md: "calc(100vh - 64px)" },
        background: "linear-gradient(180deg, #020617 0%, #0F172A 100%)",
        position: "relative",
        overflow: "auto",
        display: "flex",
        alignItems: "center",
        py: { xs: 4, sm: 6, md: 0 },
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          px: { xs: 2, sm: 3 },
          width: "100%",
        }}
      >
        <Stack spacing={{ xs: 6, md: 10 }}>
          <Grid container alignItems="center" spacing={{ xs: 4, md: 8 }}>
            <Grid item xs={12} md={7}>
              <Stack
                spacing={{ xs: 2.5, md: 3.5 }}
                sx={{
                  textAlign: { xs: "center", md: "left" },
                  animation: "fadeInUp 0.8s ease-out",
                  "@keyframes fadeInUp": {
                    from: {
                      opacity: 0,
                      transform: "translateY(20px)",
                    },
                    to: {
                      opacity: 1,
                      transform: "translateY(0)",
                    },
                  },
                }}
              >
                <Box>
                  <Typography
                    variant="overline"
                    sx={{
                      color: "rgba(255, 255, 255, 0.8)",
                      fontWeight: 700,
                      letterSpacing: "0.15em",
                      fontSize: "0.8125rem",
                      textTransform: "uppercase",
                      position: "relative",
                      display: "inline-block",
                      "&::after": {
                        content: '""',
                        position: "absolute",
                        bottom: -4,
                        left: 0,
                        width: "40px",
                        height: "2px",
                        background: "linear-gradient(90deg, #D4AF37, transparent)",
                        mx: { xs: "auto", md: 0 },
                      },
                    }}
                  >
                    Welcome back
                  </Typography>
                </Box>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    fontSize: { xs: "1.875rem", sm: "2.5rem", md: "3.5rem" },
                    letterSpacing: "-0.025em",
                    lineHeight: { xs: 1.25, md: 1.2 },
                    color: "#F8FAFC",
                  }}
                >
                  Everything builds toward our next session, {firstName}.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: { xs: "1rem", md: "1.125rem" },
                    lineHeight: 1.75,
                    maxWidth: 600,
                    mx: { xs: "auto", md: 0 },
                    fontWeight: 400,
                    color: "#94A3B8",
                  }}
                >
                  Prepare, collaborate, and stay aligned as a circle.
                </Typography>
              </Stack>
            </Grid>
            <Grid
              item
              xs={12}
              md={5}
              sx={{
                animation: "fadeInUp 0.8s ease-out 0.2s backwards",
              }}
            >
              <NextSessionCard initial={nextSession} />
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
