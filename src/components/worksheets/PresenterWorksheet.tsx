import { Box, Button, Checkbox, Container, FormControlLabel, FormGroup, Paper, Stack, TextField, Typography } from '@mui/material';
import React from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

const STORAGE_KEY = 'worksheet_presenter_v1';

type PresenterForm = {
  context?: string;
  situation?: string;
  future?: string;
  options?: string;
  type?: string; // legacy free text
  typeWork?: boolean;
  typeHome?: boolean;
  typePersonal?: boolean;
  issue?: string;
  ask?: string;
};

const PresenterWorksheet: React.FC = () => {
  useDocumentTitle('Presenter Worksheet');
  const [form, setForm] = React.useState<PresenterForm>(() => {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') as PresenterForm;
      // Backward-compat: map legacy string into checkboxes if present
      const t = (parsed.type || '').toLowerCase();
      return {
        ...parsed,
        typeWork: parsed.typeWork ?? t.includes('work'),
        typeHome: parsed.typeHome ?? (t.includes('home') || t.includes('family')),
        typePersonal: parsed.typePersonal ?? (t.includes('personal') || t.includes('self')),
      };
    } catch {
      return {};
    }
  });

  const save = () => localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
  const clear = () => {
    if (!confirm('Clear all saved inputs for Presenter worksheet?')) return;
    localStorage.removeItem(STORAGE_KEY);
    setForm({});
  };

  const onChange = (k: keyof PresenterForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({
      ...f,
      [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value,
    } as PresenterForm));

  return (
    <Container maxWidth="md" sx={{ my: 4, pb: 8 }}>
      <Stack spacing={3}>
        <Paper
          sx={{
            p: { xs: 3, md: 4 },
            borderRadius: 4,
            border: '1px solid',
            borderColor: 'warning.light',
            background: 'linear-gradient(135deg, rgba(251,191,36,0.16), rgba(249,115,22,0.12))',
            boxShadow: '0 24px 60px rgba(15, 23, 42, 0.16)',
          }}
        >
          <Stack spacing={1.5}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'warning.dark' }} gutterBottom>
              Presentation Worksheet [For Presenters]
            </Typography>
            <Typography color="text.secondary" sx={{ fontSize: 14, maxWidth: 720 }}>
              First, fill in the boxes below. Then let the coach ask you to clarify the issue you are facing, so that you can describe specifically about (a) what is happening in what context, (b) what you feel about it, (c) what you think will/might happen, and (d) your options. After sorting out the situation and identifying your issue, the presenter and the coach together prepare communication starters.
            </Typography>
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
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              1. Prepare the presentation details
            </Typography>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>(a) Context</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                When and how did this issue arise and develop to become an issue to you?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={form.context || ''}
                onChange={onChange('context')}
                placeholder="Describe the context"
              />
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>(b) Present situation and what you feel</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                As a result, WHAT IS THE SITUATION you are facing now? How do you FEEL about it?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={form.situation || ''}
                onChange={onChange('situation')}
                placeholder="Describe the present situation and feelings"
              />
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>(c) Prospects for the future</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                What is likely to happen in the future, and how do you FEEL about it?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={form.future || ''}
                onChange={onChange('future')}
                placeholder="Prospects and feelings"
              />
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>(d) Your options and what you want to do</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                What are your likely options? What do you really want to do about the issue at hand?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={4}
                value={form.options || ''}
                onChange={onChange('options')}
                placeholder="Options and intended action"
              />
            </Box>
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
          <Stack spacing={2.5}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              2. Review the above and sum up
            </Typography>
            <Typography color="text.secondary">
              Describe the type of your issue, and what you would like from your peers.
            </Typography>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Type of your issue</Typography>
              <FormGroup row sx={{ gap: 1 }}>
                <FormControlLabel control={<Checkbox checked={!!form.typeWork} onChange={onChange('typeWork')} />} label="Work" />
                <FormControlLabel control={<Checkbox checked={!!form.typeHome} onChange={onChange('typeHome')} />} label="Home" />
                <FormControlLabel control={<Checkbox checked={!!form.typePersonal} onChange={onChange('typePersonal')} />} label="Personal" />
              </FormGroup>
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Define the issue</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                What is the issue (or substance of the issue) that you really want to resolve?
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={form.issue || ''}
                onChange={onChange('issue')}
                placeholder="Define the issue"
              />
            </Box>

            <Box>
              <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>What would you like your peers to share in their responses?</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Share experience and lesson learned, emotional support, ideas, opinions, understanding and empathy
              </Typography>
              <TextField
                fullWidth
                multiline
                rows={3}
                value={form.ask || ''}
                onChange={onChange('ask')}
                placeholder="Your requests to peers"
              />
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

export default PresenterWorksheet;
