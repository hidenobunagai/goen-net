import {
    Box,
    Chip,
    Container,
    Paper,
    Stack,
    ToggleButton,
    ToggleButtonGroup,
    Typography,
} from '@mui/material';
import React, { PropsWithChildren, useState } from 'react';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type Action = {
  title: string;
  procedure?: string;
  steps?: string[];
  reminders?: string[];
  callouts?: string[];
  script?: string;
};

type Section = {
  id: string;
  start: string;
  end: string;
  duration: string;
  title: string;
  purpose: string[];
  actions: Action[];
  afterNote?: string;
};

type Scenario = 'twoPresentations' | 'singlePresentation';

const twoPresentationSections: Section[] = [
  {
    id: 'opening',
    start: '0:00',
    end: '0:03',
    duration: '3 min',
    title: 'Opening',
    purpose: [
      'Focus everyone on the present moment and reaffirm confidentiality.',
      'Warm up the room by encouraging honest sharing about current feelings.',
    ],
    actions: [
      {
        title: '0:00 Start on time and confirm confidentiality',
        procedure:
          'Welcome the group, confirm everyone is present, and restate the confidentiality ground rule before anything else.',
        script: `“Is everyone here? Let's begin.
First, I would like to confirm confidentiality. Let's make sure that everything we discuss here today will remain confidential, and never leaves this room.”`,
      },
      {
        title: '0:01 Run the feelings warmup',
        procedure: 'Invite each member to share how they feel right now in about 10 seconds.',
        reminders: [
          'Keep the check-in quick—feelings only, no stories.',
          'If someone speaks long, gently remind the next speaker to be brief.',
        ],
        script: `“Thank you. I think everyone still seems a little tense, so let's relax. As a warm-up exercise, I want each of you to express how you feel now in about 10 seconds. “I am happy,” “I'm excited,” “I'm tired,” “I'm nervous,” anything is fine. Be very honest—this is to open up.”`,
      },
    ],
  },
  {
    id: 'updates',
    start: '0:03',
    end: '0:53',
    duration: '50 min',
    title: 'Updates',
    purpose: [
      'Give each member a 5-minute space to share recent progress across work, family, and personal life.',
      'Identify the issues that may deserve deeper discussion later in the meeting.',
      'Keep the group attentive to emotions, urgency, and protocol.',
      'Reduce workload by naming two secretaries to capture potential presentation topics.',
    ],
    actions: [
      {
        title: '0:03 Launch the update round',
        procedure:
          'Explain the structure: 5 minutes per person, covering the past three months (work → family → personal) and then the next three months in the same order.',
        reminders: ['Speakers often mix the order of past and future—prompt gently if the flow drifts.'],
        callouts: [
          '★ For members new to updates: show the image on page 29 of the Goen Net Guide and walk through the past/future sequence.',
        ],
        script: `“Now, let's share everyone's updates. You have 5 minutes each to speak.

First, reflect on the past 3 months in the order of work, family, personal life. Then speak about the next 3 months in the same order. If you aren't sure, please see the image at the bottom right of page 29 in the Goen Net Guide.”`,
      },
      {
        title: '0:05 Assign secretaries and explain note taking',
        procedure: 'Appoint two members to take notes (split the roster if needed) and clarify exactly what to capture.',
        reminders: [
          'Secretaries list only issues, tensions, or decisions needed—skip celebrations unless they reveal a problem.',
          'If something is unclear, pause early to explain rather than correcting later.',
        ],
        callouts: ['★ Point secretaries to section 2 of the Guide and the table on page 30 so they know what the log should look like.'],
        script: `“Now, I want Mr. XX to be a secretary for the first half of updates. (Be fair—don’t pick the same person as last time.)

Please read section 2, Update, in the Guide. Use the table on page 30 to list only the problems or challenges you hear. These become candidates for presentations, so you don’t need to record happy matters or expectations.”`,
      },
      {
        title: '0:06 Prime listener mindset',
        procedure: 'Remind everyone to listen for issues worth discussing and to stay inside the communication protocol.',
        script: `“We will have discussion to prioritize issues after the updates. Please focus on the presenter’s nonverbal expressions and emotions, not just the words. Make mental notes about whose issue sounded significant or which one you hope we resolve. Look at the speaker as much as you can. Who would like to go first? Let’s go clockwise from that person.”`,
      },
      {
        title: '0:07 Hand a timer to the first speaker',
        script: '“So, Ms. XX, would you please start? Here is the timer—please finish within 5 minutes.”',
      },
      {
        title: 'During each share keep clarifying questions brief',
        procedure: 'Allow one question per person (one to two minutes total) before moving on. Defer deeper discussion to prioritization.',
        reminders: [
          'Avoid long Q&A blocks; questioning is to clarify, not to solve.',
          'Stop any discussion that starts during updates and park it for later.',
        ],
        script: `“Thank you. Are there any questions? If not, no problem. Time is limited, so let’s keep it to one question per person and a total of one to two minutes. There will be time when we prioritize the issues, so we can ask more questions then.”`,
      },
      {
        title: '0:53 Thank the secretaries and close the round',
        script: '“This is the end of the updates. I would like to thank the secretary, Mr. XX, for all your hard work.”',
      },
    ],
  },
  {
    id: 'prioritizing',
    start: '0:53',
    end: '1:13',
    duration: '20 min',
    title: 'Prioritizing Issues',
    purpose: [
      'Decide which issues will be discussed in depth during this session.',
      'Create a relaxed, collaborative atmosphere while choosing topics.',
      'Confirm presenters and assign coaches who can empathize and support.',
    ],
    actions: [
      {
        title: '0:53 Invite issue nominations',
        procedure:
          'Ask secretaries to read the list and encourage everyone to speak up about which issues feel most important to resolve today.',
        reminders: [
          'Give members time to voice their preferences before summarising.',
          'Name the relaxed tone you want—this is consensus building, not judgment.',
        ],
        callouts: [
          '★ For members new to prioritization: explain that they should notice strong emotion, importance, and urgency when choosing.',
        ],
        script: `“Let's select two issues for presentations. First, let's discuss casually which issues we want to resolve today because the person involved is having a tough time with them. Now is your chance to talk about more than one issue per person. Shall we start?

I would like to ask the secretary to put a mark by the issues that members mention so we can keep track.

When choosing whose issue to resolve, pay attention to moments of strong emotion, the speaker's expression, or tone of voice. Finally, consider the importance and urgency of the issue. If you are unsure, please refer to section 3, Prioritize Issues, in the Guide.”`,
      },
      {
        title: '1:00 Guide the group toward a decision',
        procedure:
          'After several members speak, summarise the top candidates and help the group confirm which issues will be discussed.',
        reminders: [
          'Do not pre-select the topics—reflect what you heard, then confirm with the group.',
          'Keep the focus on importance and urgency, not on easy or light themes.',
          'Confirm that the person whose issue is chosen is ready to present.',
        ],
        script: `“If prioritizing does not work well and significant issues do not get picked, the moderator can propose: There are many issues here, but what about discussing Mr. XX's issue and Ms. XX's issue today? From the perspective of importance and urgency, many of you seem to be interested in taking up these issues. (Confirm with the person involved and finalize the decision if they agree. Do not force anyone to present.)”`,
      },
      {
        title: '1:04 Assign coaches who can empathize',
        procedure: 'Choose two members whose experiences align with each presenter and brief them on the expectations.',
        reminders: [
          'Select coaches who have similar backgrounds or have resolved comparable issues.',
          'Ensure coaches can stay objective while offering empathy.',
        ],
        callouts: [
          '★ Explain that each presenter has two coaches: one focusing on clarifying the issue and one preparing communication starters.',
        ],
        script: '“I would like to assign two people to serve as coaches, and since it would be better if the coaches and presenters shared similar awareness, what about you, Mr. XX? Thank you.”',
      },
      {
        title: '1:05 Distribute worksheets',
        procedure: 'Hand the coaching and presentation worksheets to the assigned presenters and coaches.',
        script: '“Now, I will hand the worksheets to the presenter and the coach.”',
      },
      {
        title: '1:06 Walk presenters through the worksheet',
        procedure:
          'Remind presenters that the worksheet is a tool to clarify their issue before sharing it with the full group.',
        callouts: [
          '★ Show new presenters how the sheet guides them from situation to desired outcome and how coaches will use it.',
        ],
        script: `“Please look at the Presentation Worksheet. Most issues are not clear at first, so we use this sheet to sort things out. Spend about five minutes filling it in on your own, then share it with your coaches so they can help you reorganize and clarify. During the presentation, you will have 10 minutes to share the issue following the format on this sheet.”`,
      },
      {
        title: '1:07 Clarify coach responsibilities',
        steps: [
          'Coach role 1: listen and ask questions that help narrow down the presenter’s core issue (see Presentation Worksheet (1)).',
          'Coach role 2: prepare a communication starter that makes it easy for the presenter to speak, sharing relevant experiences up front.',
        ],
        callouts: [
          '★ Use the Coaching Sheet to capture the communication starter—share experiences that help members listen with empathy.',
        ],
        script: `“The first role of the coach is to help the presenter clarify the issue. Listen and ask questions to narrow it down, following the prompts on the Coaching Sheet.

The second role is to create an environment where it is easy for the presenter to speak. Before the presentation starts, introduce the issue in place of the presenter and share communication starters so everyone is ready to listen with empathy.”`,
      },
      {
        title: '1:08 Explain how the presentation will open',
        procedure:
          'Remind coaches that they introduce the issue, confirm expectations, and cue the communication starter before handing to the presenter.',
        script: `“After the presenter and coaches complete their worksheets, the coach will share the title of the issue, the presenter’s expectations of members, and the level of confidentiality. Then the coach initiates the communication starter and asks members to signal they are ready to listen. After that, the presenter speaks for 10 minutes, following the order on the worksheet.”`,
      },
    ],
  },
  {
    id: 'coaching-break',
    start: '1:13',
    end: '1:33',
    duration: '20 min',
    title: 'Break During Coaching',
    purpose: [
      'Give presenters and coaches space to clarify the issue and prepare communication starters.',
      'Keep momentum by supporting anyone who feels stuck during prep.',
    ],
    actions: [
      {
        title: '1:13 Launch the coaching break',
        procedure:
          'Release presenters and coaches to work together while other members stretch or reflect. Set a visible return time.',
        reminders: [
          'If the presenter writes very little, invite them to talk it through while the coach captures notes.',
          'You do not need to perfect the issue—identify the working title within the available time.',
        ],
        callouts: ['★ Remind everyone that unanswered questions can be clarified during the Q&A after the presentation.'],
        script: '“We’ll take about 20 minutes for coaching. Presenters and coaches, use this time to clarify the issue and prepare the communication starter. Everyone else, feel free to stretch, refresh, and think about how you can support. Please be back by [time].”',
      },
      {
        title: '1:20 Re-explain the presentation method if needed',
        procedure:
          'Check in midway. If the pair seems confused, walk them through the worksheet again and confirm how the presentation will flow.',
        script: '“If anything feels unclear, let’s review the presentation method together. We want you to feel ready to share the title of the issue, expectations, confidentiality level, and the communication starter before the presenter speaks.”',
      },
    ],
  },
  {
    id: 'presentation-1',
    start: '1:33',
    end: '2:33',
    duration: '60 min',
    title: 'Presentation ①',
    purpose: [
      'Hold the full presentation cycle: introduction, story, clarifying questions, experience sharing, presenter reflection, and process feedback.',
      'Protect psychological safety by enforcing the communication protocol.',
    ],
    actions: [
      {
        title: '1:33 Begin the presentation',
        procedure: 'Call everyone back, set the tone, and transition into Presentation ①.',
        script: '“Now, let’s begin the presentation.”',
      },
      {
        title: '1:33 Assign roles for timekeeper, process observer, and secretary',
        procedure: 'Select members who have not yet taken a role during the session.',
        script: '“First, I would like to assign a process observer. (Among remaining members) What about you, Mr. XX?”',
      },
      {
        title: '1:34 Hand the process observer worksheet',
        script: '“This is the Process Observer Worksheet.”',
      },
      {
        title: '1:34 Remind the process observer what to watch',
        callouts: ['★ The process observer tracks protocol adherence and highlights strong questions as well as missed opportunities.'],
        script: `“There are two things to look for during the presentation: whether everyone follows the communication protocol properly and who asked good questions or made helpful comments. Please also note any members who struggled to follow the protocol.”`,
      },
      {
        title: '1:35 Coach introduces the title and communication starter',
        reminders: ['Verify that the communication starter invites everyone to look at the presenter and signal they are ready to listen.'],
        script: '“Now, shall we start from the coach? Please speak in line with the order on your worksheet.”',
      },
      {
        title: '1:38 Presenter shares the issue (10 min)',
        procedure: 'Encourage attentive listening and remind members they can take brief notes while staying visually engaged.',
        script: '“Before we begin the presentation, you can take notes while you listen—and make sure that you pay full attention to the presenter. Let’s not keep looking at the notes; look at the presenter as much as you can. Are we ready? Please speak in order from the top of the worksheet.”',
      },
      {
        title: '1:48 Moderate clarifying questions (10 min)',
        reminders: [
          'Intervene if questions turn into cross-examination or investigation.',
          'Keep the tone supportive so the presenter feels safe.',
        ],
        script: '“Thank you. Now, if there is something you would like to ask or confirm regarding the presenter’s issue, please go ahead—keeping the communication protocol in mind.”',
      },
      {
        title: '1:58 Cue experience sharing (30 min)',
        steps: [
          'Hand the timer to the first speaker and keep contributions to three minutes each.',
          'Ask members to use the first-person “I” mode: share their own experience and lessons learned.',
          'Remind members to prepare a personal note as a gift to the presenter.',
        ],
        script: '“Now, let’s share lessons learned from relevant or similar experiences for the presenter. I will hand a timer to the first speaker. Please keep it to 3 minutes per person. Later, I want you to make a personal note as a gift to the presenter.”',
      },
      {
        title: '2:28 Invite the presenter’s reflection (5 min)',
        script: '“It is now the presenter’s turn to give feedback about what you felt and what your takeaway is. If there is nothing, that’s fine. If you can’t tell yet, that’s fine too. Be very honest.”',
      },
      {
        title: '2:30 Capture process feedback and hand over personal notes',
        reminders: ['Add moderator feedback if you noticed protocol drift or dynamics that need attention.'],
        script: `“Thank you. Now, I would like to ask for the process observer’s feedback on the communication protocol and member roles. Did anyone else notice anything in particular?

To conclude, please hand your personal notes to the presenter. Thank you for the hard work. This is the end of the presentation.”`,
      },
    ],
  },
  {
    id: 'presentation-2',
    start: '2:33',
    end: '3:33',
    duration: '60 min',
    title: 'Presentation ②',
    purpose: [
      'Run the second presentation using the same structure as Presentation ①.',
      'Maintain energy, timing, and protocol consistency for the remainder of the session.',
    ],
    actions: [
      {
        title: '2:33 Repeat the full presentation cycle',
        procedure:
          'Follow the same steps as Presentation ① (coach introduction → story → clarifying questions → experience sharing → reflection → process feedback). Target 65 minutes including transitions.',
      },
    ],
  },
  {
    id: 'closing',
    start: '3:33',
    end: '3:40',
    duration: '7 min',
    title: 'Closing',
    purpose: [
      'Protect confidentiality by disposing of written materials.',
      'Confirm logistics for the next meetings and capture final reflections.',
      'Let everyone leave after sharing their current feeling in one phrase.',
    ],
    actions: [
      {
        title: '3:33 Destroy confidential documents',
        procedure: 'Collect all notes, shred or dispose of them, and remind members to keep the discussion private.',
        script: '“It is time to close the session. To ensure confidentiality, let’s destroy all notes that you took today. After leaving this room, please maintain confidentiality about everything we talked about here.”',
      },
      {
        title: '3:35 Confirm the schedule for next time',
        procedure: 'Agree on the next session’s date and decide who will coordinate if the proposed time does not work.',
        script: '“Next, let’s confirm the schedule for next time and decide the date for the meeting after that. The next scheduled date is MM/DD from [time]. Will this work with your schedules?”',
      },
      {
        title: '3:37 Reflect on team-wide patterns',
        reminders: [
          'Raise recurring issues (lateness, absence, protocol gaps, superficial themes) while everyone is still present.',
        ],
        procedure: 'Invite any final feedback on how the session ran and what to improve next time.',
      },
      {
        title: '3:39 Close with “How do you feel now?”',
        procedure: 'Do a final feelings round—about one minute per person—to help members leave grounded.',
        script: '“As a closing exercise to organize our thoughts, I want everyone to speak openly for about one minute about how you feel now. The session ends when everyone has shared.”',
      },
    ],
  },
];

const stripMinutePrefix = (title: string): string => title.replace(/^[0-9]{1,2}:[0-9]{2}\s+/, '');

const cloneSection = (section: Section, options?: { stripActionTimes?: boolean }): Section => ({
  ...section,
  purpose: [...section.purpose],
  actions: section.actions.map((action) => ({
    ...action,
    title: options?.stripActionTimes ? stripMinutePrefix(action.title) : action.title,
    steps: action.steps ? [...action.steps] : undefined,
    reminders: action.reminders ? [...action.reminders] : undefined,
    callouts: action.callouts ? [...action.callouts] : undefined,
  })),
});

const singlePresentationSections: Section[] = [
  ...twoPresentationSections.slice(0, 5).map((section) => cloneSection(section, { stripActionTimes: true })),
  cloneSection(
    {
      ...twoPresentationSections[6],
      start: '2:33',
      end: '2:40',
      duration: '7 min',
    },
    { stripActionTimes: true },
  ),
];

const schedules: Record<Scenario, Section[]> = {
  twoPresentations: twoPresentationSections.map((section) => cloneSection(section, { stripActionTimes: true })),
  singlePresentation: singlePresentationSections,
};

const Moderator: React.FC = () => {
  useDocumentTitle('Moderator Guide');

  const [scenario, setScenario] = useState<Scenario>('twoPresentations');

  const handleScenarioChange = (_: React.MouseEvent<HTMLElement>, value: Scenario | null) => {
    if (value) {
      setScenario(value);
    }
  };

  return (
    <Container maxWidth="lg" sx={{ my: { xs: 3, md: 5 } }}>
      <Stack spacing={3}>
        <Typography variant="h4" sx={{ fontWeight: 800 }}>
          Goen Net Moderator Playbook
        </Typography>
        <Typography color="text.secondary">
          Keep this tab open during the session and follow the timeline below. ★ indicates additional explanations for
          members who are new to the process.
        </Typography>
        <ToggleButtonGroup
          value={scenario}
          exclusive
          onChange={handleScenarioChange}
          color="primary"
          aria-label="Moderator agenda scenario"
          sx={{ alignSelf: { xs: 'stretch', md: 'flex-start' } }}
        >
          <ToggleButton value="twoPresentations">Two Presentations</ToggleButton>
          <ToggleButton value="singlePresentation">Single Presentation</ToggleButton>
        </ToggleButtonGroup>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 3 }}>
          <Stack spacing={{ xs: 3, md: 4 }}>
            {schedules[scenario].map((section) => (
              <SectionCard key={section.id} section={section} />
            ))}
          </Stack>
        </Paper>
      </Stack>
    </Container>
  );
};

export default Moderator;

const SectionCard: React.FC<{ section: Section }> = ({ section }) => (
  <Box
    id={section.id}
    sx={{
      borderRadius: 3,
      border: '1px solid',
      borderColor: 'divider',
      p: { xs: 2, md: 3 },
      bgcolor: 'background.paper',
      boxShadow: '0px 1px 2px rgba(15, 23, 42, 0.08)',
    }}
  >
    <Stack spacing={2.5}>
      <Stack spacing={1.5}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          justifyContent="space-between"
        >
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
            <Chip label={`${section.start} → ${section.end}`} color="primary" size="small" />
            <Chip label={section.duration} variant="outlined" size="small" />
          </Stack>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            {section.title}
          </Typography>
        </Stack>
        <Stack component="ul" spacing={0.75} sx={{ pl: 2, m: 0 }}>
          {section.purpose.map((item) => (
            <Typography component="li" key={item} color="text.secondary">
              {item}
            </Typography>
          ))}
        </Stack>
      </Stack>
      <Stack spacing={{ xs: 2, md: 3 }}>
        {section.actions.map((action, index) => (
          <ActionCard key={`${section.id}-${index}`} action={action} />
        ))}
      </Stack>
      {section.afterNote && <CalloutBox items={[section.afterNote]} />}
    </Stack>
  </Box>
);

const ActionCard: React.FC<{ action: Action }> = ({ action }) => (
  <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, bgcolor: 'grey.50' }}>
    <Stack spacing={1.5}>
      <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1.05rem' }}>
        {action.title}
      </Typography>
      {action.procedure && <Typography>{action.procedure}</Typography>}
      {action.steps && (
        <Stack component="ul" spacing={0.6} sx={{ pl: 2, m: 0 }}>
          {action.steps.map((step) => (
            <Typography component="li" key={step} color="text.secondary">
              {step}
            </Typography>
          ))}
        </Stack>
      )}
      {action.reminders && <ReminderBox items={action.reminders} />}
      {action.callouts && <CalloutBox items={action.callouts} />}
      {action.script && <ScriptBox>{action.script}</ScriptBox>}
    </Stack>
  </Paper>
);

const ReminderBox: React.FC<{ items: string[] }> = ({ items }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 2,
      bgcolor: 'warning.50',
      border: '1px solid',
      borderColor: 'warning.100',
    }}
  >
    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'warning.dark', textTransform: 'uppercase' }}>
      ATTENTION
    </Typography>
    <Stack component="ul" spacing={0.5} sx={{ pl: 2, m: 0 }}>
      {items.map((item) => (
        <Typography component="li" key={item} color="warning.dark">
          {item}
        </Typography>
      ))}
    </Stack>
  </Box>
);

const CalloutBox: React.FC<{ items: string[] }> = ({ items }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 2,
      bgcolor: 'info.50',
      border: '1px solid',
      borderColor: 'info.100',
    }}
  >
    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'info.dark' }}>
      ★ KEY TALKING POINTS
    </Typography>
    <Stack component="ul" spacing={0.5} sx={{ pl: 2, m: 0 }}>
      {items.map((item) => (
        <Typography component="li" key={item} color="info.dark">
          {item}
        </Typography>
      ))}
    </Stack>
  </Box>
);

const ScriptBox: React.FC<PropsWithChildren> = ({ children }) => (
  <Box
    sx={{
      p: 2,
      borderRadius: 2,
      borderLeft: '4px solid',
      borderColor: 'primary.main',
      bgcolor: 'grey.100',
    }}
  >
    <Typography sx={{ fontStyle: 'italic', whiteSpace: 'pre-wrap' }}>{children}</Typography>
  </Box>
);
