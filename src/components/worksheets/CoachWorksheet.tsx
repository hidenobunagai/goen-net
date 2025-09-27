import { Box, Button, Checkbox, Container, Divider, FormControlLabel, FormGroup, Paper, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const STORAGE_KEY = 'worksheet_coach_v1';

type CoachForm = {
  title?: string;
  typeWork?: boolean;
  typeHome?: boolean;
  typePersonal?: boolean;
  feelings?: string;
  want?: string;
  confidential?: 'HIGH' | 'MEDIUM' | 'NORMAL' | '';
};

const CoachWorksheet: React.FC = () => {
  useDocumentTitle('Coach Worksheet');
  const [form, setForm] = React.useState<CoachForm>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as CoachForm;
    } catch {
      return {};
    }
  });

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  const clear = () => {
    if (!confirm('Clear all saved inputs for Coach worksheet?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setForm({});
  };
  const onChange = (k: keyof CoachForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value,
    } as CoachForm));

  return (
    <Container maxWidth="md" sx={{ my: 4, pb: 8 }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'primary.light',
            background: 'linear-gradient(135deg, rgba(14,116,144,0.12), rgba(59,130,246,0.08))',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16)',
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'primary.dark' }} gutterBottom>
              Coaching Worksheet [For Coaches]
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 14, maxWidth: 720 }}>
              Review the presentation sheet together with the presenter. Listen and ask questions to help understand what really the problem is. Then, fill out this sheet and use it to introduce the presenter.
            </Typography>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 20px 45px rgba(15, 23, 42, 0.08)',
            backdropFilter: 'blur(6px)',
            bgcolor: 'rgba(255,255,255,0.92)',
          }}
        >
          <Stack spacing={3}>
            <Stack spacing={1.5}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                1. Help the presenter identify what he/she really wants to resolve.
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Ask the Presenter.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Help him/her describe and understand the issue/problem by asking:
              </Typography>
              <Box
                sx={{
                  borderRadius: 3,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'grey.50',
                  p: { xs: 2, md: 3 },
                }}
              >
                <Stack spacing={1} sx={{ pl: { xs: 1, md: 2 } }}>
                  <Typography>
                    • First: Identify the presenter’s emotions (What is he/she feeling? Sad? Worried? Excited? Angry?, etc)
                  </Typography>
                  <Typography>
                    • What does he/she can do to overcome/resolve the issue? (Focus on what the presenter can do. Do not on the external environment which cannot be controlled.)
                  </Typography>
                  <Typography>
                    • What his/her issue is really about? What really is the problem? (Summarize and clarify)
                  </Typography>
                  <Typography>• What is the underlying cause of the issue (root cause)?</Typography>
                </Stack>
              </Box>
            </Stack>

            <Divider sx={{ borderStyle: 'dashed' }} />

            <Stack spacing={2.5}>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                Then, DEFINE THE ISSUE, Types of Issues, What the Presenter Wants, and Confidentiality Level.
              </Typography>

              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  DEFINE THE ISSUE: GIVE THE PRESENTATION a “TITLE” to best describe what to discuss.
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  What do you think is the substance of the issue that the presenter wants to resolve?
                </Typography>
                <TextField fullWidth value={form.title || ''} onChange={onChange('title')} placeholder="Title / substance of the issue" />
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Type of issue</Typography>
                <FormGroup row sx={{ gap: 1 }}>
                  <FormControlLabel control={<Checkbox checked={!!form.typeWork} onChange={onChange('typeWork')} />} label="Work" />
                  <FormControlLabel control={<Checkbox checked={!!form.typeHome} onChange={onChange('typeHome')} />} label="Home" />
                  <FormControlLabel control={<Checkbox checked={!!form.typePersonal} onChange={onChange('typePersonal')} />} label="Personal" />
                </FormGroup>
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Know the presenter’s feelings and emotions toward the issue.</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  List the presenter’s feelings and emotions toward the issue, and IDENTIFY THE STRONGEST ONE.
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={form.feelings || ''}
                  onChange={onChange('feelings')}
                  placeholder="Feelings and the strongest one"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>What does the presenter want from the peers in their responses?</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Support, ideas, opinions, understanding and empathy, lesson from experience
                </Typography>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  value={form.want || ''}
                  onChange={onChange('want')}
                  placeholder="What the presenter wants from peers"
                />
              </Box>

              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Confidentiality level</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                  Specify the level of confidentiality (Check one)
                </Typography>
                <Stack spacing={1.5}>
                  {(['HIGH', 'MEDIUM', 'NORMAL'] as const).map((lvl) => (
                    <Paper
                      key={lvl}
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        borderColor: form.confidential === lvl ? 'primary.main' : 'divider',
                        bgcolor: form.confidential === lvl ? 'primary.50' : 'background.paper',
                      }}
                    >
                      <FormControlLabel
                        control={<Checkbox checked={form.confidential === lvl} onChange={() => setForm((f) => ({ ...f, confidential: f.confidential === lvl ? '' : lvl }))} />}
                        label={
                          <Box>
                            <Typography sx={{ fontWeight: form.confidential === lvl ? 700 : 500 }}>{lvl}</Typography>
                            {lvl === 'HIGH' && (
                              <Typography variant="body2" color="text.secondary">
                                After this presentation, absolutely no mention of what is discussed here.
                              </Typography>
                            )}
                            {lvl === 'MEDIUM' && (
                              <Typography variant="body2" color="text.secondary">
                                You can discuss this topic later, only when the presenter wants to do so.
                              </Typography>
                            )}
                            {lvl === 'NORMAL' && (
                              <Typography variant="body2" color="text.secondary">
                                Members can talk about this topic later, but only in a closed environment.
                              </Typography>
                            )}
                          </Box>
                        }
                        sx={{ alignItems: 'flex-start', m: 0 }}
                      />
                    </Paper>
                  ))}
                </Stack>
              </Box>
            </Stack>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 16px 40px rgba(15, 23, 42, 0.08)',
            bgcolor: 'background.paper',
          }}
        >
          <Stack spacing={2}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>2. Prepare Communication Starters</Typography>
            <Typography color="text.secondary">
              Communication starters are comments from all members, to express that they feel as if the presenter’s issue is an issue of their own, so that the presenter will feel safer and easier to open his/her heart and speak about his/her issue during the presentation.
            </Typography>
            <Box
              sx={{
                p: { xs: 2, md: 3 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'primary.light',
                bgcolor: 'primary.50',
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>Communication Starters:</Typography>
              <Stack spacing={0.75} sx={{ mt: 1.5 }}>
                <Typography>1. Tell the members “title”. “The title of the presenter’s issue is ‘......’ .”</Typography>
                <Typography>2. Tell them the emotions the presenter is feeling. “The presenter is feeling ‘... ’.</Typography>
                <Typography>3. And tell them: “Please imagine what the presenter is feeling. And then, please tell the presenter that you are ready to listen.”</Typography>
                <Typography>4. Coach or Moderator will be the first one to say “I am ready to listen.”</Typography>
                <Typography>5. And each member will follow, saying “I am ready to listen.”</Typography>
              </Stack>
            </Box>
          </Stack>
        </Paper>

        <Paper
          sx={{
            p: { xs: 2.5, md: 3 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            boxShadow: '0 8px 24px rgba(15, 23, 42, 0.06)',
            bgcolor: 'background.paper',
          }}
        >
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} justifyContent="flex-end">
            <Button variant="contained" onClick={save}>Save locally</Button>
            <Button variant="outlined" color="warning" onClick={clear}>Clear</Button>
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default CoachWorksheet;
