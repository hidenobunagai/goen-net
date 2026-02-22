const fs = require('fs');
const file = fs.readFileSync('src/app/(protected)/documentation/_components/moderator-guide.tsx', 'utf8');
const lines = file.split('\n');

const newImports = `"use client";

import {
  Box,
  Button,
  Chip,
  Container,
  Fade,
  LinearProgress,
  Paper,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import KeyboardArrowLeft from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRight from "@mui/icons-material/KeyboardArrowRight";
import type { PropsWithChildren } from "react";
import { useEffect, useState } from "react";

import { useDocumentTitle } from "@/hooks/use-document-title";`;

const newBody = `export function ModeratorGuide() {
  useDocumentTitle("Goen Net Moderator Playbook");

  const [scenario, setScenario] = useState<Scenario>("twoPresentations");
  const [activeStep, setActiveStep] = useState(0);

  const currentSchedule = schedules[scenario];

  const slides = currentSchedule.flatMap((section) =>
    section.actions.map((action, index) => ({
      section,
      action,
      actionIndex: index,
      totalActionsInSection: section.actions.length,
    }))
  );

  const maxSteps = slides.length;
  const activeSlide = slides[activeStep];

  // If scenario changes or slides shrink, ensure activeStep is valid
  useEffect(() => {
    if (activeStep >= slides.length) {
      setActiveStep(0);
    }
  }, [activeStep, slides.length]);

  const handleScenarioChange = (_: React.MouseEvent<HTMLElement>, value: Scenario | null) => {
    if (value) {
      setScenario(value);
      setActiveStep(0);
    }
  };

  const handleNext = () => {
    setActiveStep((prev) => Math.min(prev + 1, maxSteps - 1));
  };

  const handleBack = () => {
    setActiveStep((prev) => Math.max(prev - 1, 0));
  };

  if (!activeSlide) return null;

  return (
    <Box>
      <Container maxWidth="md" sx={{ py: { xs: 4, md: 6 }, pb: { xs: 16, md: 16 } }}>
        <Stack spacing={4}>
          <Stack
            spacing={2}
            sx={{
              animation: "fadeInUp 0.8s ease-out",
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
                  }
                }}
              >
                Session Guide
              </Typography>
            </Box>
            <Typography
              variant="h3"
              component="h1"
              sx={{
                fontWeight: 800,
                letterSpacing: "-0.025em",
                lineHeight: 1.2,
                color: "rgba(255, 255, 255, 0.95)",
                fontSize: { xs: "2rem", md: "3rem" }
              }}
            >
              Moderator Playbook
            </Typography>
          </Stack>
          
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ xs: "stretch", sm: "center" }} spacing={2}>
            <ToggleButtonGroup
              value={scenario}
              exclusive
              onChange={handleScenarioChange}
              color="primary"
              size="small"
              aria-label="Moderator agenda scenario"
              sx={{
                flexShrink: 0,
                ".MuiToggleButton-root": {
                  color: "rgba(255, 255, 255, 0.7)",
                  borderColor: "rgba(255, 255, 255, 0.3)",
                  "&:hover": {
                    backgroundColor: "rgba(255, 255, 255, 0.1)",
                  },
                  "&.Mui-selected": {
                    color: "rgba(255, 255, 255, 0.95)",
                    backgroundColor: "rgba(255, 255, 255, 0.15)",
                    borderColor: "rgba(255, 255, 255, 0.5)",
                    "&:hover": {
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                    }
                  }
                }
              }}
            >
              <ToggleButton value="twoPresentations">Two Presentations</ToggleButton>
              <ToggleButton value="singlePresentation">Single Presentation</ToggleButton>
            </ToggleButtonGroup>

            <Typography variant="body2" sx={{ color: "rgba(255, 255, 255, 0.7)" }}>
              Step {activeStep + 1} of {maxSteps}
            </Typography>
          </Stack>

          <LinearProgress 
            variant="determinate" 
            value={(activeStep / (maxSteps - 1)) * 100} 
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: "rgba(255,255,255,0.1)",
              "& .MuiLinearProgress-bar": {
                backgroundColor: "primary.light",
              }
            }}
          />

          <Fade in={true} key={activeStep}>
            <Box>
              <SectionContext section={activeSlide.section} />
              
              <Box sx={{ mt: 3 }}>
                <ActionCard action={activeSlide.action} />
              </Box>

              {activeSlide.actionIndex === activeSlide.totalActionsInSection - 1 && activeSlide.section.afterNote && (
                <Box sx={{ mt: 3 }}>
                  <CalloutBox items={[activeSlide.section.afterNote]} />
                </Box>
              )}
            </Box>
          </Fade>
        </Stack>
      </Container>

      {/* Fixed bottom navigation */}
      <Paper 
        elevation={8}
        sx={{ 
          position: "fixed", 
          bottom: 0, 
          left: 0, 
          right: 0, 
          p: { xs: 2.5, md: 3 },
          zIndex: 1000,
          borderRadius: { xs: 0, md: "24px 24px 0 0" },
          backgroundColor: "rgba(15, 23, 42, 0.9)",
          backdropFilter: "blur(12px)",
          borderTop: "1px solid rgba(255,255,255,0.1)"
        }}
      >
        <Container maxWidth="md">
          <Stack direction="row" justifyContent="space-between" alignItems="center">
            <Button 
              size="large" 
              onClick={handleBack} 
              disabled={activeStep === 0}
              startIcon={<KeyboardArrowLeft />}
              sx={{ color: "white", "&.Mui-disabled": { color: "rgba(255,255,255,0.3)" } }}
            >
              Back
            </Button>
            
            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", display: { xs: "none", sm: "block" } }}>
              {activeSlide.section.title} ({activeSlide.actionIndex + 1}/{activeSlide.totalActionsInSection})
            </Typography>

            <Button 
              size="large" 
              variant="contained"
              onClick={handleNext} 
              disabled={activeStep === maxSteps - 1}
              endIcon={<KeyboardArrowRight />}
              sx={{ 
                borderRadius: 8,
                px: 4,
                boxShadow: "0 0 15px rgba(56, 189, 248, 0.4)",
                fontWeight: 700
              }}
            >
              {activeStep === maxSteps - 1 ? "Finish" : "Next"}
            </Button>
          </Stack>
        </Container>
      </Paper>
    </Box>
  );
}

type SectionContextProps = {
  section: Section;
};

function SectionContext({ section }: SectionContextProps) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        border: "1px solid",
        borderColor: "divider",
        p: { xs: 3, md: 4 },
        bgcolor: "rgba(255, 255, 255, 0.95)",
        boxShadow: "0px 4px 12px rgba(15, 23, 42, 0.1)",
      }}
    >
      <Stack spacing={2}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={1.5}
          alignItems={{ xs: "flex-start", sm: "center" }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", alignItems: "center" }}>
            <Typography variant="h6" sx={{ fontWeight: 800, color: "text.primary" }}>
              {section.title}
            </Typography>
            <Chip label={`${section.start} → ${section.end}`} color="primary" size="small" />
            <Chip label={section.duration} variant="outlined" size="small" />
          </Stack>
        </Stack>
        <Stack component="ul" spacing={0.5} sx={{ pl: 2, m: 0 }}>
          {section.purpose.map((item) => (
            <Typography component="li" key={item} color="text.secondary" variant="body1" sx={{ fontWeight: 500 }}>
              {item}
            </Typography>
          ))}
        </Stack>
      </Stack>
    </Box>
  );
}

type ActionCardProps = {
  action: Action;
};

function ActionCard({ action }: ActionCardProps) {
  return (
    <Paper elevation={4} sx={{ p: { xs: 3, md: 5 }, borderRadius: 4, bgcolor: "background.paper", border: "1px solid", borderColor: "rgba(0,0,0,0.05)" }}>
      <Stack spacing={3}>
        <Typography variant="h5" sx={{ fontWeight: 800, color: "primary.main", fontSize: { xs: "1.35rem", md: "1.6rem" } }}>
          {action.title}
        </Typography>
        {action.procedure ? <Typography sx={{ fontSize: "1.1rem", lineHeight: 1.6, color: "text.primary" }}>{action.procedure}</Typography> : null}
        {action.steps ? (
          <Stack component="ul" spacing={1.5} sx={{ pl: 2.5, m: 0 }}>
            {action.steps.map((step) => (
              <Typography component="li" key={step} color="text.secondary" sx={{ fontSize: "1.1rem" }}>
                {step}
              </Typography>
            ))}
          </Stack>
        ) : null}
        {action.reminders ? <ReminderBox items={action.reminders} /> : null}
        {action.callouts ? <CalloutBox items={action.callouts} /> : null}
        {action.script ? <ScriptBox>{action.script}</ScriptBox> : null}
      </Stack>
    </Paper>
  );
}

type ReminderBoxProps = {
  items: string[];
};

function ReminderBox({ items }: ReminderBoxProps) {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: "warning.50",
        border: "1px solid",
        borderColor: "warning.200",
      }}
    >
      <Typography
        variant="subtitle2"
        sx={{
          fontWeight: 800,
          color: "warning.800",
          textTransform: "uppercase",
          mb: 1,
          letterSpacing: "0.05em"
        }}
      >
        Attention
      </Typography>
      <Stack component="ul" spacing={1} sx={{ pl: 2.5, m: 0 }}>
        {items.map((item) => (
          <Typography component="li" key={item} sx={{ color: "warning.900", fontWeight: 500, fontSize: "1.05rem" }}>
            {item}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

type CalloutBoxProps = {
  items: string[];
};

function CalloutBox({ items }: CalloutBoxProps) {
  return (
    <Box
      sx={{
        p: 2.5,
        borderRadius: 3,
        bgcolor: "info.50",
        border: "1px solid",
        borderColor: "info.200",
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: "info.800", mb: 1, letterSpacing: "0.05em" }}>
        ★ Key Talking Points
      </Typography>
      <Stack component="ul" spacing={1} sx={{ pl: 2.5, m: 0 }}>
        {items.map((item) => (
          <Typography component="li" key={item} sx={{ color: "info.900", fontWeight: 500, fontSize: "1.05rem" }}>
            {item}
          </Typography>
        ))}
      </Stack>
    </Box>
  );
}

type ScriptBoxProps = PropsWithChildren;

function ScriptBox({ children }: ScriptBoxProps) {
  return (
    <Box
      sx={{
        p: { xs: 2.5, md: 3.5 },
        borderRadius: 3,
        borderLeft: "6px solid",
        borderColor: "primary.main",
        bgcolor: "grey.50",
      }}
    >
      <Typography sx={{ fontStyle: "italic", whiteSpace: "pre-wrap", fontSize: "1.15rem", color: "text.primary", lineHeight: 1.7 }}>{children}</Typography>
    </Box>
  );
}`;

const unModifiedMiddleContent = lines.slice(17, 449).join('\n');
const result = [newImports, '\n' + unModifiedMiddleContent + '\n', newBody].join('\n');

fs.writeFileSync('src/app/(protected)/documentation/_components/moderator-guide.tsx', result, 'utf8');
