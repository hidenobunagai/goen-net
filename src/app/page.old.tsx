import { NextSessionCard } from "@/app/(protected)/_components/next-session-card";
import { getOptionalUserSession } from "@/lib/session";
import { getNextSession } from "@/lib/turso";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Unstable_Grid2";
import Link from "next/link";

// Force dynamic rendering - no caching
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function Home() {
  // Temporarily use optional session to debug authentication issues
  const session = await getOptionalUserSession();

  // If no session, show sign-in prompt instead of crashing
  if (!session) {
    return (
      <Container maxWidth="lg" sx={{ py: { xs: 5, md: 7 } }}>
        <Stack spacing={4} alignItems="center">
          <Typography variant="h4">
            Please sign in to access Goen Net
          </Typography>
          <Button
            component={Link}
            href="/signin"
            variant="contained"
            size="large"
          >
            Sign In
          </Button>
        </Stack>
      </Container>
    );
  }

  const [nextSession] = await Promise.all([getNextSession()]);
  const user = session?.user;
  const firstName = user?.name?.split(" ")[0] ?? "Member";

  return (
    <Box
      component="section"
      sx={{ position: "relative", overflow: "hidden", minHeight: "100vh" }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,51,102,0.03) 0%, transparent 50%, rgba(230,0,18,0.02) 100%)",
          pointerEvents: "none",
        }}
      />
      <Container
        maxWidth="lg"
        sx={{ py: { xs: 4, sm: 6, md: 10 }, position: "relative", zIndex: 1 }}
      >
        <Stack spacing={{ xs: 7, md: 11 }}>
          <Grid
            container
            spacing={{ xs: 2, sm: 3, md: 4 }}
            columns={{ xs: 1, md: 12 }}
            alignItems="stretch"
          >
            <Grid xs={1} md={7}>
              <Stack spacing={{ xs: 2, md: 2.5 }} sx={{ pr: { md: 4 } }}>
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    fontSize: "0.75rem",
                  }}
                >
                  WELCOME BACK
                </Typography>
                <Typography
                  variant="h2"
                  component="h1"
                  sx={{
                    fontWeight: 800,
                    background:
                      "linear-gradient(135deg, #003366 0%, #0055AA 100%)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                    lineHeight: 1.2,
                  }}
                >
                  Everything builds toward our next session, {firstName}.
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Align on priorities, surface decisions, and arrive prepared to
                  move the circle forward. Start by reviewing your peers’ latest
                  updates so everyone arrives ready for the conversation.
                </Typography>
                <Stack spacing={1.5} sx={{ pt: 1 }}>
                  <Typography variant="body2" color="text.secondary">
                    Already updated? Jump straight into prioritization or visit
                    the worksheets below when you’re ready.
                  </Typography>
                </Stack>
              </Stack>
            </Grid>
            <Grid xs={1} md={5}>
              <Stack spacing={2}>
                {/* Original Next Session Card */}
                <Card
                  elevation={3}
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    p: { xs: 1, sm: 1.5, md: 2 },
                  }}
                >
                  <NextSessionCard initial={nextSession} />
                </Card>
              </Stack>
            </Grid>
          </Grid>

          <Card
            sx={{
              p: { xs: 2, sm: 3, md: 4 },
              backgroundImage:
                "linear-gradient(160deg, rgba(255,255,255,0.96), rgba(0,27,68,0.08))",
            }}
          >
            <Stack spacing={{ xs: 2, md: 3 }}>
              <Stack spacing={1} sx={{ maxWidth: 760 }}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ letterSpacing: "0.18em" }}
                >
                  Workspace at a glance
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 600 }}>
                  One private hub for our eight-person circle
                </Typography>
                <Typography variant="body1" color="text.secondary">
                  Everything on this site is built to help us prepare, run, and
                  follow through on Goen Net sessions without digging through
                  email threads or spreadsheets.
                </Typography>
              </Stack>
              <Grid
                container
                spacing={{ xs: 2, md: 3 }}
                columns={{ xs: 1, md: 12 }}
              >
                <Grid xs={1} md={4}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Share signal-rich updates
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Capture highlights, tag the timeframe, and spotlight what
                      needs attention so the facilitator instantly sees where
                      the energy is.
                    </Typography>
                  </Stack>
                </Grid>
                <Grid xs={1} md={4}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Shape the agenda together
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use prioritization to bubble up topics that need deep
                      discussion before we walk into the room.
                    </Typography>
                  </Stack>
                </Grid>
                <Grid xs={1} md={4}>
                  <Stack spacing={1}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Capture commitments automatically
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Decisions, owners, and follow-ups stay connected to the
                      session so we can check progress next time without
                      rebuilding context.
                    </Typography>
                  </Stack>
                </Grid>
              </Grid>
            </Stack>
          </Card>

          <Card sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Stack spacing={3}>
              <Stack spacing={1}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ letterSpacing: "0.18em" }}
                >
                  Session rhythm
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  How to use the app before, during, and after we meet
                </Typography>
              </Stack>
              <Stack spacing={{ xs: 2, md: 2.5 }}>
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      minWidth: 36,
                      textAlign: "center",
                      borderRadius: 999,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      py: 0.5,
                    }}
                  >
                    1
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Before the session
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Submit or refresh your update, add supporting links, and
                      flag priorities so the facilitator can finalize the
                      flow.
                    </Typography>
                  </Stack>
                </Stack>
                <Divider flexItem sx={{ my: 0 }} />
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      minWidth: 36,
                      textAlign: "center",
                      borderRadius: 999,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      py: 0.5,
                    }}
                  >
                    2
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      During the session
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Track the agenda live, capture decisions in the update
                      threads, and record new actions directly from the room.
                    </Typography>
                  </Stack>
                </Stack>
                <Divider flexItem sx={{ my: 0 }} />
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      minWidth: 36,
                      textAlign: "center",
                      borderRadius: 999,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      py: 0.5,
                    }}
                  >
                    3
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      After we wrap
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Add follow-up notes, confirm owners, and schedule
                      check-ins so nothing slips between sessions.
                    </Typography>
                  </Stack>
                </Stack>
                <Divider flexItem sx={{ my: 0 }} />
                <Stack direction="row" spacing={2} alignItems="flex-start">
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 700,
                      minWidth: 36,
                      textAlign: "center",
                      borderRadius: 999,
                      bgcolor: "primary.main",
                      color: "primary.contrastText",
                      py: 0.5,
                    }}
                  >
                    4
                  </Typography>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      Staying aligned between sessions
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Use quick comments and reactions to nudge momentum
                      mid-cycle and help each other stay accountable.
                    </Typography>
                  </Stack>
                </Stack>
              </Stack>
            </Stack>
          </Card>

          <Grid
            container
            spacing={{ xs: 2, md: 3 }}
            columns={{ xs: 1, md: 12 }}
          >
            <Grid xs={1} md={4}>
              <Card sx={{ height: "100%", p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Stack spacing={1.5}>
                  <Typography
                    variant="overline"
                    color="primary"
                    sx={{ letterSpacing: "0.18em" }}
                  >
                    Tools
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Updates workspace
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Draft your update, paste links, mark anything urgent, and
                    see how the team rallies around key topics as they weigh
                    in.
                  </Typography>
                  <Button
                    component={Link}
                    href="/updates"
                    variant="text"
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Go to Updates
                  </Button>
                </Stack>
              </Card>
            </Grid>
            <Grid xs={1} md={4}>
              <Card sx={{ height: "100%", p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Stack spacing={1.5}>
                  <Typography
                    variant="overline"
                    color="primary"
                    sx={{ letterSpacing: "0.18em" }}
                  >
                    Tools
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Prioritization board
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Score urgency and commitment, lock the running order, and
                    keep everyone on the same slide during facilitation.
                  </Typography>
                  <Button
                    component={Link}
                    href="/prioritization"
                    variant="text"
                    sx={{ alignSelf: "flex-start" }}
                  >
                    Open Prioritization
                  </Button>
                </Stack>
              </Card>
            </Grid>
            <Grid xs={1} md={4}>
              <Card sx={{ height: "100%", p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Stack spacing={1.5}>
                  <Typography
                    variant="overline"
                    color="primary"
                    sx={{ letterSpacing: "0.18em" }}
                  >
                    Tools
                  </Typography>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    Worksheets & playbooks
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Lean on ready-to-run scripts and prompts tailored to each
                    role so facilitation feels consistent across sessions.
                  </Typography>
                  <Button
                    component={Link}
                    href="/documentation/moderator"
                    variant="text"
                    sx={{ alignSelf: "flex-start" }}
                  >
                    View guides
                  </Button>
                </Stack>
              </Card>
            </Grid>
          </Grid>

          <Card sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
            <Stack spacing={2.5}>
              <Stack spacing={1}>
                <Typography
                  variant="overline"
                  color="primary"
                  sx={{ letterSpacing: "0.18em" }}
                >
                  Roles & preparation
                </Typography>
                <Typography variant="h5" sx={{ fontWeight: 600 }}>
                  Arrive clear on how you’ll contribute
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose the worksheet for the role you’ll play this meeting to
                  streamline prep and keep conversations sharp.
                </Typography>
              </Stack>
              <Grid
                container
                spacing={{ xs: 1.5, sm: 2 }}
                columns={{ xs: 1, sm: 3 }}
              >
                <Grid xs={1}>
                  <Button
                    component={Link}
                    href="/worksheets/presenter"
                    variant="outlined"
                    fullWidth
                  >
                    Presenter Worksheet
                  </Button>
                </Grid>
                <Grid xs={1}>
                  <Button
                    component={Link}
                    href="/worksheets/coach"
                    variant="outlined"
                    fullWidth
                  >
                    Coach Worksheet
                  </Button>
                </Grid>
                <Grid xs={1}>
                  <Button
                    component={Link}
                    href="/worksheets/observer"
                    variant="outlined"
                    fullWidth
                  >
                    Observer Worksheet
                  </Button>
                </Grid>
              </Grid>
            </Stack>
          </Card>
        </Stack>
      </Container>
    </Box>
  );
}
