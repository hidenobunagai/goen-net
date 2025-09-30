import { NextSessionCard } from "@/app/(protected)/_components/next-session-card";
import { getOptionalUserSession } from "@/lib/session";
import { getNextSession } from "@/lib/turso";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Card from "@mui/material/Card";
import Container from "@mui/material/Container";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItem from "@mui/material/ListItem";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Unstable_Grid2";
import Link from "next/link";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ForumRoundedIcon from "@mui/icons-material/ForumRounded";
import MenuBookRoundedIcon from "@mui/icons-material/MenuBookRounded";
import RocketLaunchRoundedIcon from "@mui/icons-material/RocketLaunchRounded";

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
      sx={{
        bgcolor: "#FFFFFF",
        minHeight: "100vh",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          background:
            "radial-gradient(120% 120% at 100% 0%, rgba(0, 51, 102, 0.08) 0%, transparent 55%), radial-gradient(80% 80% at 0% 100%, rgba(230, 0, 18, 0.08) 0%, transparent 60%)",
        }}
      />
      <Container
        maxWidth="lg"
        sx={{
          py: { xs: 5, sm: 7, md: 12 },
          px: { xs: 2.5, sm: 4, md: 6 },
        }}
      >
        <Stack spacing={{ xs: 6, md: 11 }}>
          <Grid
            container
            columns={{ xs: 1, md: 12 }}
            alignItems="center"
            columnSpacing={{ xs: 0, sm: 4, md: 6 }}
            rowSpacing={{ xs: 3, sm: 4, md: 6 }}
          >
            <Grid xs={1} md={5} order={{ xs: 1, md: 2 }}>
              <NextSessionCard initial={nextSession} />
            </Grid>
            <Grid xs={1} md={7} order={{ xs: 2, md: 1 }}>
              <Stack
                spacing={{ xs: 2, sm: 2.5, md: 3.5 }}
                sx={{ textAlign: { xs: "center", md: "left" } }}
              >
                <Chip
                  label="Goen Net circle workspace"
                  color="primary"
                  sx={{
                    alignSelf: { xs: "center", md: "flex-start" },
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                  }}
                />
                <Typography
                  variant="overline"
                  sx={{
                    color: "primary.main",
                    fontWeight: 700,
                    letterSpacing: "0.15em",
                    fontSize: { xs: "0.7rem", sm: "0.75rem" },
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
                    lineHeight: { xs: 1.25, md: 1.2 },
                    fontSize: { xs: "2rem", sm: "2.5rem", md: "3.5rem" },
                  }}
                >
                  Everything builds toward our next session, {firstName}.
                </Typography>
                <Typography
                  variant="body1"
                  color="text.secondary"
                  sx={{ fontSize: { xs: "0.95rem", sm: "1rem" } }}
                >
                  Align on priorities, surface decisions, and arrive prepared to
                  move the circle forward. Start by reviewing your peers&apos; latest
                  updates so everyone arrives ready for the conversation.
                </Typography>
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={{ xs: 1.5, sm: 2 }}
                  justifyContent={{ xs: "center", md: "flex-start" }}
                >
                  <Button
                    component={Link}
                    href="/updates"
                    variant="contained"
                    size="large"
                    sx={{ px: 4 }}
                  >
                    Review updates
                  </Button>
                  <Button
                    component={Link}
                    href="/prioritization"
                    variant="outlined"
                    size="large"
                    sx={{
                      px: 4,
                      borderColor: "rgba(0, 51, 102, 0.35)",
                      color: "primary.main",
                      "&:hover": {
                        borderColor: "primary.main",
                        bgcolor: "rgba(0, 51, 102, 0.04)",
                      },
                    }}
                  >
                    Open agenda board
                  </Button>
                </Stack>
              </Stack>
            </Grid>
          </Grid>

          <Grid
            container
            columns={{ xs: 1, md: 12 }}
            columnSpacing={{ xs: 0, md: 3 }}
            rowSpacing={{ xs: 2.5, md: 3 }}
          >
            <Grid xs={1} md={8}>
              <Card sx={{ p: { xs: 2.5, md: 3 }, height: "100%" }}>
                <Stack spacing={2.5}>
                  <Stack
                    direction="row"
                    spacing={1.5}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography
                      variant="overline"
                      color="primary"
                      sx={{ letterSpacing: "0.18em" }}
                    >
                      Quick prep
                    </Typography>
                    <Chip label="5 min" size="small" sx={{ fontWeight: 600 }} />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Checklist before you join
                  </Typography>
                  <List disablePadding sx={{ display: "grid", gap: 1.5 }}>
                    {[ 
                      {
                        primary: "Skim everyone&apos;s latest update",
                        secondary:
                          "Highlight the wins, blockers, and follow-ups that matter most.",
                      },
                      {
                        primary: "Vote on the conversations that need airtime",
                        secondary:
                          "Stack rank the agenda so facilitators can set the flow with confidence.",
                      },
                      {
                        primary: "Log any context teammates should review",
                        secondary:
                          "Attach links, decks, or docs so decisions can happen in the room.",
                      },
                    ].map((item) => (
                      <ListItem
                        key={item.primary}
                        sx={{
                          borderRadius: 2,
                          px: 1.5,
                          py: 1.25,
                          bgcolor: "rgba(0, 51, 102, 0.04)",
                        }}
                      >
                        <ListItemIcon sx={{ minWidth: 36 }}>
                          <CheckCircleRoundedIcon sx={{ color: "primary.main" }} />
                        </ListItemIcon>
                        <ListItemText
                          primaryTypographyProps={{ fontWeight: 600 }}
                          secondaryTypographyProps={{ color: "text.secondary" }}
                          primary={item.primary}
                          secondary={item.secondary}
                        />
                      </ListItem>
                    ))}
                  </List>
                </Stack>
              </Card>
            </Grid>
            <Grid xs={1} md={4}>
              <Card
                sx={{
                  p: { xs: 2.5, md: 3 },
                  position: "relative",
                  overflow: "hidden",
                  bgcolor: "#021f3f",
                  color: "common.white",
                  height: "100%",
                }}
              >
                <Box
                  sx={{
                    position: "absolute",
                    inset: 0,
                    background:
                      "radial-gradient(circle at 15% 15%, rgba(255, 255, 255, 0.18), transparent 55%), radial-gradient(circle at 85% 85%, rgba(230,0,18,0.3), transparent 65%)",
                    opacity: 0.9,
                  }}
                />
                <Stack spacing={2.5} sx={{ position: "relative", zIndex: 1 }}>
                  <Stack direction="row" spacing={1.5} alignItems="center">
                    <RocketLaunchRoundedIcon />
                    <Typography
                      variant="overline"
                      sx={{ letterSpacing: "0.18em", color: "rgba(255,255,255,0.8)" }}
                    >
                      Facilitator tip
                    </Typography>
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    Spin up a ten-minute huddle
                  </Typography>
                  <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.8)" }}>
                    Kick off a quick sync with the prioritization board to confirm
                    the running order and capture any last-minute decisions before
                    the session.
                  </Typography>
                  <Button
                    component={Link}
                    href="/prioritization"
                    variant="outlined"
                    size="large"
                    sx={{
                      alignSelf: { xs: "flex-start", md: "flex-start" },
                      borderColor: "rgba(255,255,255,0.6)",
                      color: "common.white",
                      fontWeight: 600,
                      "&:hover": {
                        borderColor: "common.white",
                        bgcolor: "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    Launch board
                  </Button>
                </Stack>
              </Card>
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
                columns={{ xs: 1, md: 12 }}
                columnSpacing={{ xs: 0, md: 3 }}
                rowSpacing={{ xs: 2, md: 3 }}
              >
                <Grid xs={1} md={4}>
                  <Stack spacing={1}>
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2.5,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0, 51, 102, 0.08)",
                        color: "primary.main",
                        mb: 1,
                      }}
                    >
                      <ForumRoundedIcon />
                    </Box>
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
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2.5,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0, 51, 102, 0.08)",
                        color: "primary.main",
                        mb: 1,
                      }}
                    >
                      <DashboardRoundedIcon />
                    </Box>
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
                    <Box
                      sx={{
                        width: 48,
                        height: 48,
                        borderRadius: 2.5,
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        bgcolor: "rgba(0, 51, 102, 0.08)",
                        color: "primary.main",
                        mb: 1,
                      }}
                    >
                      <AccessTimeRoundedIcon />
                    </Box>
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
                      flexShrink: 0,
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
                      flexShrink: 0,
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
                      flexShrink: 0,
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
                      flexShrink: 0,
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
            columns={{ xs: 1, md: 12 }}
            columnSpacing={{ xs: 0, md: 3 }}
            rowSpacing={{ xs: 2, md: 3 }}
          >
            <Grid xs={1} md={4}>
              <Card sx={{ height: "100%", p: { xs: 2, sm: 2.5, md: 3 } }}>
                <Stack spacing={1.5}>
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(0, 51, 102, 0.08)",
                      color: "primary.main",
                      boxShadow: "0 12px 26px rgba(0, 44, 95, 0.1)",
                    }}
                  >
                    <ForumRoundedIcon />
                  </Box>
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
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(0, 51, 102, 0.08)",
                      color: "primary.main",
                      boxShadow: "0 12px 26px rgba(0, 44, 95, 0.1)",
                    }}
                  >
                    <DashboardRoundedIcon />
                  </Box>
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
                  <Box
                    sx={{
                      width: 48,
                      height: 48,
                      borderRadius: 2.5,
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      bgcolor: "rgba(0, 51, 102, 0.08)",
                      color: "primary.main",
                      boxShadow: "0 12px 26px rgba(0, 44, 95, 0.1)",
                    }}
                  >
                    <MenuBookRoundedIcon />
                  </Box>
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
                  Arrive clear on how you&apos;ll contribute
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Choose the worksheet for the role you&apos;ll play this meeting to
                  streamline prep and keep conversations sharp.
                </Typography>
              </Stack>
              <Grid
                container
                columns={{ xs: 1, sm: 3 }}
                columnSpacing={{ xs: 0, sm: 2 }}
                rowSpacing={{ xs: 1.5, sm: 2 }}
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
