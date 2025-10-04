import { NextSessionCard } from "@/app/(protected)/_components/next-session-card";
import { getOptionalUserSession } from "@/lib/session";
import { getNextSession } from "@/lib/turso";
import Box from "@mui/material/Box";
import Container from "@mui/material/Container";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Unstable_Grid2";
import { redirect } from "next/navigation";

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // Temporarily use optional session to debug authentication issues
  const session = await getOptionalUserSession();

  // If no session, redirect to sign-in page
  if (!session) {
    redirect("/signin");
  }

  const [nextSession] = await Promise.all([getNextSession()]);
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] ?? "Member";

  return (
    <Box
      sx={{
        height: "calc(100vh - 64px)",
        background: "linear-gradient(180deg, #001a33 0%, #003366 100%)",
        position: "relative",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          px: { xs: 2, sm: 3 },
        }}
      >
        <Stack spacing={{ xs: 6, md: 10 }}>
          <Grid
            container
            columns={{ xs: 1, md: 12 }}
            alignItems="center"
            columnSpacing={{ xs: 0, md: 8 }}
            rowSpacing={{ xs: 5, md: 0 }}
          >
            <Grid xs={1} md={7}>
              <Stack
                spacing={3.5}
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
                        background: "linear-gradient(90deg, rgba(255, 255, 255, 0.6), transparent)",
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
                    fontSize: { xs: "2.5rem", sm: "2.75rem", md: "3.5rem" },
                    letterSpacing: "-0.025em",
                    lineHeight: 1.2,
                    color: "rgba(255, 255, 255, 0.95)",
                  }}
                >
                  Everything builds toward our next session, {firstName}.
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    fontSize: "1.125rem",
                    lineHeight: 1.75,
                    maxWidth: 600,
                    mx: { xs: "auto", md: 0 },
                    fontWeight: 400,
                    color: "rgba(255, 255, 255, 0.75)",
                  }}
                >
                  Prepare, collaborate, and stay aligned as a circle.
                </Typography>
              </Stack>
            </Grid>
            <Grid
              xs={1}
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
