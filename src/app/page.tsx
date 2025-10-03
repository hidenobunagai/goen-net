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
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f5f7fa 0%, #ffffff 50%, #f8f9fb 100%)",
        position: "relative",
      }}
    >
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 6, md: 10 },
          px: { xs: 2, sm: 3 },
        }}
      >
        <Stack spacing={{ xs: 5, md: 8 }}>
          <Grid
            container
            columns={{ xs: 1, md: 12 }}
            alignItems="center"
            columnSpacing={{ xs: 0, md: 6 }}
            rowSpacing={{ xs: 4, md: 0 }}
          >
            <Grid xs={1} md={7}>
              <Stack
                spacing={3}
                sx={{ textAlign: { xs: "center", md: "left" } }}
              >
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: "0.12em",
                    fontSize: "0.875rem",
                  }}
                >
                  Welcome back
                </Typography>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    color: "text.primary",
                    lineHeight: 1.15,
                    fontSize: { xs: "2.25rem", md: "3.25rem" },
                    letterSpacing: "-0.02em",
                  }}
                >
                  Everything builds toward our next session, {firstName}.
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ 
                    fontSize: "1.125rem",
                    lineHeight: 1.8,
                    maxWidth: 600,
                    mx: { xs: "auto", md: 0 },
                    fontWeight: 400,
                  }}
                >
                  Prepare, collaborate, and stay aligned as a circle.
                </Typography>
              </Stack>
            </Grid>
            <Grid xs={1} md={5}>
              <NextSessionCard initial={nextSession} />
            </Grid>
          </Grid>
        </Stack>
      </Container>
    </Box>
  );
}
