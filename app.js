/* ==========================================================================
   Friends of Brands — site behaviour
   Ported from the Claude Design prototype. The prototype's concierge called
   window.claude.complete(), which only exists inside the design runtime; in
   production the concierge runs the deterministic engine below. Point
   CONFIG.apiEndpoint at your own model endpoint to swap in a live LLM —
   the transport is the only thing that changes.
   ========================================================================== */

(function () {
  'use strict';

  /* ---------------------------------------------------------------------
     CONFIG — the only block you need to edit before going live.
     --------------------------------------------------------------------- */
  var CONFIG = {
    // POST { messages: [{role, content}], mode: 'support' | 'booking' }
    // Expect { reply: "..." }. Leave null to run the built-in engine.
    apiEndpoint: null,

    // Public scheduling link (Cal.com, Calendly, HubSpot Meetings…).
    calendarUrl: null,

    // Shown in the contact block and used by the concierge hand-off.
    contactEmail: 'sales@decentimagemedia.com',
    phone:        '+1 (334) 917-1841',
    hours:        null              // e.g. 'Mon–Fri 9–6 ET'
  };

  // Salons & spas lead the list — it is the primary practice, not one unit
  // among six, and the order here drives both the filters and the grid.
  var PROJECTS = [
    {
      category: 'Salons & Spas',
      shot: 'Booking console',
      title: 'AI receptionist and client CRM for a 22-location salon and spa group',
      body: 'Books, reschedules, and fills cancellations around the clock, on a CRM that carries every client from first visit to rebook.',
      tags: ['AI receptionist', 'Rebooking', 'Client CRM']
    },
    {
      category: 'Instagram & Social Media Automation',
      shot: 'DM triage inbox',
      title: 'Always-on social engine for a national retail brand',
      body: 'Scheduled publishing, DM triage, and comment-to-lead routing across six regional accounts.',
      tags: ['DM automation', 'Content ops', 'Lead routing']
    },
    {
      category: 'Gym & Fitness Management Systems',
      shot: 'Member health',
      title: 'Member lifecycle platform for a 40-location gym group',
      body: 'Automated onboarding, class scheduling, and churn prediction wired into front-desk workflows.',
      tags: ['Scheduling', 'Churn model', 'Payments']
    },
    {
      category: 'Enterprise CRM & Lead Engines',
      shot: 'Pipeline board',
      title: 'Custom pipeline and outreach engine for a B2B services firm',
      body: 'Multi-channel sequences, enrichment, and pipeline tracking replacing four disconnected tools.',
      tags: ['Pipeline', 'Outreach', 'Enrichment']
    },
    {
      category: 'AI-Driven Customer Experience',
      shot: 'Agent console',
      title: '24/7 autonomous support agent with RAG knowledge base',
      body: 'Deflects routine tickets, escalates with full context, and learns from every resolved thread.',
      tags: ['RAG', 'Human handoff', 'Analytics']
    },
    {
      category: 'E-Commerce & High-Conversion Funnels',
      shot: 'Funnel analytics',
      title: 'Personalized recommendation engine for a DTC catalog',
      body: 'Behavioral segments and dynamic funnels tuned against live conversion data.',
      tags: ['Personalization', 'Funnels', 'Experiments']
    }
  ];

  /* ---------------------------------------------------------------------
     Card vignettes — a miniature of the console each unit actually ships,
     drawn as inline SVG so nothing is fetched and both themes are moot on
     this dark ground.

     Palette discipline: at most two categorical hues per vignette (the
     brand violet and mint), which are far enough apart in hue and lightness
     to survive colour-vision deficiency without a third hue crowding them.
     Amber appears only for a true at-risk state, and always beside a text
     label so the state never rides on colour alone. Numbers and labels wear
     ink tokens, never a series colour.
     --------------------------------------------------------------------- */

  var MONO = 'IBM Plex Mono, ui-monospace, monospace';

  function svgOpen() {
    return '<svg viewBox="0 0 320 190" preserveAspectRatio="xMidYMid slice" ' +
           'aria-hidden="true" focusable="false">' +
           '<rect width="320" height="190" fill="#0c0e16"/>';
  }

  function head(left, right, rightHue) {
    return '<text x="14" y="20" font-family="' + MONO + '" font-size="8" letter-spacing="1.5" ' +
           'fill="rgba(148,163,184,0.75)">' + left + '</text>' +
           (right
             ? '<text x="306" y="20" text-anchor="end" font-family="' + MONO + '" font-size="8" ' +
               'letter-spacing="1.2" fill="' + (rightHue || 'rgba(226,232,240,0.9)') + '">' + right + '</text>'
             : '');
  }

  var SHOTS = {};

  // Booking console — a live day view, the salon front desk's actual screen.
  SHOTS['Salons & Spas'] = (function () {
    var s = svgOpen() + head('TODAY &middot; 6 CHAIRS', '74% FILL', '#34d399');
    var y;
    for (y = 33; y <= 111; y += 26) {
      s += '<line x1="14" y1="' + (y + 0.5) + '" x2="306" y2="' + (y + 0.5) +
           '" stroke="rgba(148,163,184,0.13)" stroke-width="1"/>';
    }
    var slots = [
      [14, 36, 24], [14, 64, 30], [14, 98, 22],
      [88, 36, 34], [88, 74, 26], [88, 104, 16],
      [162, 40, 22],
      [236, 36, 18], [236, 58, 28], [236, 90, 32]
    ];
    slots.forEach(function (b) {
      s += '<rect x="' + b[0] + '" y="' + b[1] + '" width="70" height="' + b[2] + '" rx="4" ' +
           'fill="rgba(167,139,250,0.20)" stroke="rgba(167,139,250,0.55)"/>';
      if (b[2] >= 22) {
        s += '<rect x="' + (b[0] + 8) + '" y="' + (b[1] + 8) + '" width="34" height="2.5" rx="1.25" ' +
             'fill="rgba(226,232,240,0.42)"/>';
      }
    });
    // The cancellation the agent re-filled, called out in the positive hue.
    s += '<rect x="162" y="66" width="70" height="54" rx="4" fill="rgba(52,211,153,0.18)" ' +
         'stroke="#34d399" stroke-width="1.4"/>' +
         '<rect x="170" y="74" width="38" height="2.5" rx="1.25" fill="rgba(226,232,240,0.5)"/>' +
         '<text x="170" y="112" font-family="' + MONO + '" font-size="7" letter-spacing="1" ' +
         'fill="#34d399">RE-FILLED</text>';
    return s + '</svg>';
  })();

  // DM triage — the inbox, plus the one number that matters downstream.
  SHOTS['Instagram & Social Media Automation'] = (function () {
    var s = svgOpen() + head('INBOX &middot; 6 ACCOUNTS', '12 NEW', '#a78bfa');
    [34, 58, 82, 106].forEach(function (y, i) {
      var lead = i === 1;
      s += '<rect x="14" y="' + y + '" width="172" height="20" rx="5" ' +
           'fill="' + (lead ? 'rgba(52,211,153,0.10)' : 'rgba(255,255,255,0.03)') + '" ' +
           'stroke="' + (lead ? 'rgba(52,211,153,0.45)' : 'rgba(148,163,184,0.16)') + '"/>' +
           '<circle cx="27" cy="' + (y + 10) + '" r="5" fill="rgba(167,139,250,0.55)"/>' +
           '<rect x="40" y="' + (y + 6) + '" width="' + (72 + i * 12) + '" height="2.5" rx="1.25" ' +
           'fill="rgba(226,232,240,0.45)"/>' +
           '<rect x="40" y="' + (y + 12) + '" width="' + (48 + i * 8) + '" height="2.5" rx="1.25" ' +
           'fill="rgba(148,163,184,0.30)"/>';
      if (lead) {
        s += '<text x="176" y="' + (y + 13) + '" text-anchor="end" font-family="' + MONO +
             '" font-size="6.5" letter-spacing="0.8" fill="#34d399">LEAD</text>';
      }
    });
    s += '<rect x="198" y="34" width="108" height="92" rx="8" fill="rgba(255,255,255,0.02)" ' +
         'stroke="rgba(148,163,184,0.16)"/>' +
         '<text x="210" y="50" font-family="' + MONO + '" font-size="7" letter-spacing="1.1" ' +
         'fill="rgba(148,163,184,0.75)">REPLY RATE</text>' +
         '<text x="210" y="72" font-family="' + MONO + '" font-size="19" font-weight="500" ' +
         'fill="rgba(240,244,250,0.97)">68%</text>' +
         '<polyline points="210,112 226,104 242,108 258,94 274,98 290,84" fill="none" ' +
         'stroke="#34d399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>' +
         '<circle cx="290" cy="84" r="3" fill="#34d399"/>';
    return s + '</svg>';
  })();

  // Member health — one composition bar with named states, then capacity.
  SHOTS['Gym & Fitness Management Systems'] = (function () {
    var s = svgOpen() + head('MEMBER HEALTH', '40 SITES');
    // 2px surface gaps separate the segments instead of borders.
    s += '<rect x="14" y="34" width="212" height="10" rx="5" fill="#34d399"/>' +
         '<rect x="230" y="34" width="40" height="10" rx="5" fill="#fbbf24"/>' +
         '<rect x="274" y="34" width="32" height="10" rx="5" fill="rgba(148,163,184,0.35)"/>';
    var legend = [
      [14, '#34d399', 'ACTIVE 78%'],
      [116, '#fbbf24', 'AT RISK 14%'],
      [222, 'rgba(148,163,184,0.55)', 'LAPSED 8%']
    ];
    legend.forEach(function (g) {
      s += '<circle cx="' + (g[0] + 3) + '" cy="61" r="3" fill="' + g[1] + '"/>' +
           '<text x="' + (g[0] + 11) + '" y="64" font-family="' + MONO + '" font-size="7" ' +
           'letter-spacing="0.9" fill="rgba(148,163,184,0.8)">' + g[2] + '</text>';
    });
    s += '<text x="14" y="84" font-family="' + MONO + '" font-size="7" letter-spacing="1.1" ' +
         'fill="rgba(148,163,184,0.6)">CLASS CAPACITY</text>' +
         '<line x1="14" y1="124.5" x2="306" y2="124.5" stroke="rgba(148,163,184,0.18)"/>';
    [26, 34, 21, 38, 30, 36].forEach(function (h, i) {
      var x = 14 + i * 50;
      s += '<rect x="' + x + '" y="' + (124 - h) + '" width="38" height="' + h + '" rx="4" ' +
           'fill="rgba(167,139,250,0.75)"/>';
    });
    return s + '</svg>';
  })();

  // Pipeline board — stages left-aligned, counts as direct labels.
  SHOTS['Enterprise CRM & Lead Engines'] = (function () {
    var s = svgOpen() + head('PIPELINE &middot; Q3', '$4.2M');
    var stages = [
      ['LEADS', 250, '1,840'],
      ['QUALIFIED', 196, '742'],
      ['PROPOSAL', 132, '318'],
      ['CLOSED', 78, '96']
    ];
    stages.forEach(function (st, i) {
      var y = 36 + i * 24;
      s += '<rect x="14" y="' + y + '" width="' + st[1] + '" height="16" rx="4" ' +
           'fill="rgba(167,139,250,' + (0.78 - i * 0.05) + ')"/>' +
           '<text x="22" y="' + (y + 11.5) + '" font-family="' + MONO + '" font-size="7" ' +
           'letter-spacing="1" fill="#0c0e16">' + st[0] + '</text>' +
           '<text x="' + (st[1] + 22) + '" y="' + (y + 11.5) + '" font-family="' + MONO +
           '" font-size="7.5" fill="rgba(226,232,240,0.85)">' + st[2] + '</text>';
    });
    return s + '</svg>';
  })();

  // Agent console — the conversation, and the deflection it produced.
  SHOTS['AI-Driven Customer Experience'] = (function () {
    var s = svgOpen() + head('AGENT CONSOLE', 'LIVE', '#34d399');
    s += '<rect x="14" y="34" width="118" height="26" rx="9" fill="rgba(167,139,250,0.16)" ' +
         'stroke="rgba(167,139,250,0.4)"/>' +
         '<rect x="24" y="43" width="80" height="2.5" rx="1.25" fill="rgba(226,232,240,0.5)"/>' +
         '<rect x="24" y="50" width="54" height="2.5" rx="1.25" fill="rgba(148,163,184,0.35)"/>' +
         '<rect x="46" y="66" width="100" height="22" rx="9" fill="rgba(255,255,255,0.9)"/>' +
         '<rect x="56" y="75" width="66" height="2.5" rx="1.25" fill="rgba(12,14,22,0.55)"/>' +
         '<rect x="14" y="94" width="132" height="28" rx="9" fill="rgba(167,139,250,0.16)" ' +
         'stroke="rgba(167,139,250,0.4)"/>' +
         '<rect x="24" y="103" width="94" height="2.5" rx="1.25" fill="rgba(226,232,240,0.5)"/>' +
         '<rect x="24" y="110" width="70" height="2.5" rx="1.25" fill="rgba(148,163,184,0.35)"/>';
    // Donut: 43% of a 201.06 circumference, opened from 12 o'clock.
    s += '<g transform="rotate(-90 248 80)">' +
         '<circle cx="248" cy="80" r="32" fill="none" stroke="rgba(148,163,184,0.18)" stroke-width="10"/>' +
         '<circle cx="248" cy="80" r="32" fill="none" stroke="#34d399" stroke-width="10" ' +
         'stroke-linecap="round" stroke-dasharray="86.5 201.1"/></g>' +
         '<text x="248" y="79" text-anchor="middle" font-family="' + MONO + '" font-size="17" ' +
         'font-weight="500" fill="rgba(240,244,250,0.97)">43%</text>' +
         '<text x="248" y="92" text-anchor="middle" font-family="' + MONO + '" font-size="6.5" ' +
         'letter-spacing="1.2" fill="rgba(148,163,184,0.8)">DEFLECTED</text>';
    return s + '</svg>';
  })();

  // Conversion funnel — trapezoids, so it reads differently from the board.
  SHOTS['E-Commerce & High-Conversion Funnels'] = (function () {
    var s = svgOpen() + head('CONVERSION', '+18% MOM', '#34d399');
    var w = [148, 112, 78, 50, 30];
    var labels = ['SESSIONS 100%', 'PRODUCT 38%', 'CART 12%', 'PAID 3.1%'];
    for (var i = 0; i < 4; i++) {
      var yTop = 34 + i * 24, yBot = yTop + 20;
      s += '<polygon points="' +
           (160 - w[i]) + ',' + yTop + ' ' + (160 + w[i]) + ',' + yTop + ' ' +
           (160 + w[i + 1]) + ',' + yBot + ' ' + (160 - w[i + 1]) + ',' + yBot +
           '" fill="rgba(167,139,250,' + (0.8 - i * 0.06) + ')"/>' +
           '<text x="160" y="' + (yTop + 13.5) + '" text-anchor="middle" font-family="' + MONO +
           '" font-size="7" letter-spacing="0.9" fill="#0c0e16">' + labels[i] + '</text>';
    }
    return s + '</svg>';
  })();

  /* ---------------------------------------------------------------------
     PROOF — one panel per capability tag, opened from the case study cards.

     >>> THE NUMBERS BELOW ARE ILLUSTRATIVE, NOT MEASURED. <<<
     They are internally consistent and realistic so the panels demo well,
     but they are not results from a named engagement. Replace each `hero`,
     `series`, `stats`, and `method` with your own audited figures before
     using this page as evidence in a pitch. The provenance banner rendered
     at the bottom of every panel says the same thing to the visitor; delete
     it only once the data behind it is real.

     Shape:
       unit    which business unit the capability belongs to
       claim   one sentence on what the capability does
       hero    the headline number + what it counts
       good    'up' or 'down' — which direction is an improvement
       months  x-axis labels
       series  {label, suffix, values} — a single series, so no legend
       stats   three supporting figures
       method  how it was measured, in plain language
     --------------------------------------------------------------------- */

  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

  var PROOF = {
    'AI receptionist': {
      unit: 'Salons & Spas',
      claim: 'Answers, books, reschedules, and escalates around the clock, so the front desk stops being a call centre.',
      hero: { value: '61%', label: 'of after-hours calls resolved with no staff involved' },
      good: 'up',
      series: { label: 'After-hours calls resolved', suffix: '%', values: [0, 18, 34, 45, 52, 57, 59, 61] },
      stats: [['3.1s', 'Median time to first response'], ['9%', 'Escalated to a human'], ['0', 'Missed calls since go-live']],
      method: 'Measured across 22 locations. A call counts as resolved when it ends in a booking, a reschedule, or an answered question with no staff touch.'
    },
    'Rebooking': {
      unit: 'Salons & Spas',
      claim: 'Works a ranked waitlist against every cancellation instead of broadcasting the empty slot to everyone.',
      hero: { value: '74%', label: 'of same-day cancellations re-filled' },
      good: 'up',
      series: { label: 'Cancellation fill rate', suffix: '%', values: [31, 38, 49, 58, 64, 69, 72, 74] },
      stats: [['11 min', 'Median time to re-fill a slot'], ['+14 pts', 'Client rebook rate'], ['$38k', 'Monthly recovered revenue']],
      method: 'Offers are ranked by service fit and travel time, then sent in sequence. Fill rate is filled slots divided by cancelled slots, same day.'
    },
    'Client CRM': {
      unit: 'Salons & Spas',
      claim: 'One record per client — visit history, formula notes, allergy flags, rebook cadence — synced with the booking platform you already run.',
      hero: { value: '96%', label: 'of visits leave a complete client record' },
      good: 'up',
      series: { label: 'Records complete at checkout', suffix: '%', values: [44, 58, 67, 78, 85, 90, 94, 96] },
      stats: [['1 day', 'New stylist ramp, from four weeks'], ['6', 'Systems replaced'], ['0', 'Double-booked appointments']],
      method: 'A record counts as complete when service, stylist, formula notes, and next-visit intent are all captured. Sync with the booking platform is bidirectional.'
    },

    'DM automation': {
      unit: 'Instagram & Social Media Automation',
      claim: 'One queue across every regional account, answering in minutes at any hour and handing off what it should not decide.',
      hero: { value: '92%', label: 'of DMs answered within five minutes' },
      good: 'up',
      series: { label: 'DMs answered under 5 minutes', suffix: '%', values: [21, 34, 48, 61, 74, 83, 89, 92] },
      stats: [['6', 'Regional accounts on one queue'], ['4.2k', 'Messages handled per month'], ['8%', 'Handed to a human']],
      method: 'The timer starts when the message arrives, including outside business hours and weekends. No sampling — every message in the period is counted.'
    },
    'Content ops': {
      unit: 'Instagram & Social Media Automation',
      claim: 'Scheduling, approvals, and publishing for every account collapse into a single queue with one approval step.',
      hero: { value: '3.4x', label: 'publishing throughput against baseline' },
      good: 'up',
      series: { label: 'Posts shipped per month', suffix: '', values: [42, 55, 68, 79, 96, 112, 128, 143] },
      stats: [['0', 'Missed scheduled slots'], ['11 hrs', 'Coordinator time saved weekly'], ['1', 'Approval queue for six accounts']],
      method: 'Throughput is scheduled posts actually published per month, against the pre-engagement baseline of 42.'
    },
    'Lead routing': {
      unit: 'Instagram & Social Media Automation',
      claim: 'Every comment and DM with buying intent becomes a tracked lead with an owner, rather than a notification someone missed.',
      hero: { value: '38%', label: 'of inbound social became tracked leads' },
      good: 'up',
      series: { label: 'Inbound converted to tracked lead', suffix: '%', values: [6, 11, 17, 23, 28, 33, 36, 38] },
      stats: [['<2 min', 'Routing latency to owner'], ['0', 'Leads lost to notification decay'], ['+27%', 'Qualified pipeline from social']],
      method: 'A tracked lead has an owner, a source, and a CRM record. The baseline was manual triage with no attribution at all.'
    },

    'Scheduling': {
      unit: 'Gym & Fitness Management Systems',
      claim: 'Classes, instructors, and rooms across every location on one calendar, with conflicts resolved before anyone notices.',
      hero: { value: '99.2%', label: 'schedule accuracy across 40 locations' },
      good: 'up',
      series: { label: 'Schedule accuracy', suffix: '%', values: [88, 91, 94, 96, 97, 98, 99, 99.2] },
      stats: [['40', 'Locations on one calendar'], ['-72%', 'Front-desk scheduling calls'], ['6', 'Instructor conflicts auto-resolved weekly']],
      method: 'Accuracy is classes running exactly as published, excluding weather closures. Rolled out in phases from week three.'
    },
    'Churn model': {
      unit: 'Gym & Fitness Management Systems',
      claim: 'Flags members drifting toward cancellation weeks early, with the reason attached so the save attempt is specific.',
      hero: { value: '6.2%', label: 'monthly churn, down from 11.4%' },
      good: 'down',
      series: { label: 'Monthly member churn', suffix: '%', values: [11.4, 10.6, 9.8, 8.9, 8.1, 7.3, 6.7, 6.2] },
      stats: [['0.81', 'Model AUC on held-out members'], ['21 days', 'Median warning before lapse'], ['1,340', 'Saves attributed to date']],
      method: 'A gradient-boosted model over visit cadence, booking gaps, and payment events. A save is an at-risk member still active 60 days after intervention.'
    },
    'Payments': {
      unit: 'Gym & Fitness Management Systems',
      claim: 'Retries are scheduled against the issuer decline code rather than a fixed cadence, so recoverable failures actually recover.',
      hero: { value: '2.1%', label: 'failed payment rate, down from 7.8%' },
      good: 'down',
      series: { label: 'Failed payment rate', suffix: '%', values: [7.8, 6.9, 5.4, 4.3, 3.5, 2.8, 2.4, 2.1] },
      stats: [['$61k', 'Recovered annually via dunning'], ['3 days', 'Median recovery time'], ['0', 'Manual card chases per week']],
      method: 'Rate is failed charges divided by attempted charges. Recovery counts a membership still billing 30 days after the first decline.'
    },

    'Pipeline': {
      unit: 'Enterprise CRM & Lead Engines',
      claim: 'One pipeline with an owner, a stage, and a next action on every open opportunity — replacing four disconnected tools.',
      hero: { value: '$4.2M', label: 'pipeline under active management' },
      good: 'up',
      series: { label: 'Pipeline under management', prefix: '$', suffix: 'M', values: [1.8, 2.2, 2.6, 3.0, 3.4, 3.7, 4.0, 4.2] },
      stats: [['4 to 1', 'Tools consolidated'], ['+31%', 'Stage-to-stage conversion'], ['0', 'Manual data entry steps for reps']],
      method: 'Pipeline counts open opportunities with an owner, stage, and next action. Conversion is measured on cohorts entering after migration, not backfilled.'
    },
    'Outreach': {
      unit: 'Enterprise CRM & Lead Engines',
      claim: 'One cadence across five channels, deduplicated, so a prospect never gets the same touch twice from two directions.',
      hero: { value: '41%', label: 'reply rate on multi-channel sequences' },
      good: 'up',
      series: { label: 'Sequence reply rate', suffix: '%', values: [12, 17, 22, 27, 32, 36, 39, 41] },
      stats: [['5', 'Channels in one cadence'], ['3.2x', 'Meetings booked per rep'], ['0', 'Duplicate touches across channels']],
      method: 'Reply rate is unique prospects replying divided by prospects entered. The baseline was single-channel email at 12%.'
    },
    'Enrichment': {
      unit: 'Enterprise CRM & Lead Engines',
      claim: 'Firmographic, contact, and intent fields resolve on record creation, verified against more than one source.',
      hero: { value: '94%', label: 'of records enriched and verified' },
      good: 'up',
      series: { label: 'Records complete and verified', suffix: '%', values: [46, 58, 68, 77, 84, 89, 92, 94] },
      stats: [['18', 'Fields resolved per record'], ['<400ms', 'Enrichment latency on create'], ['-63%', 'Bounced sends']],
      method: 'A record is complete when firmographic, contact, and intent fields all resolve against at least two independent sources.'
    },

    'RAG': {
      unit: 'AI-Driven Customer Experience',
      claim: 'Answers are grounded in your real documentation and cite the source, so nothing is invented and every claim is checkable.',
      hero: { value: '43%', label: 'of tickets deflected without a human' },
      good: 'up',
      series: { label: 'Ticket deflection rate', suffix: '%', values: [8, 15, 22, 29, 34, 38, 41, 43] },
      stats: [['1,900', 'Documents indexed'], ['96%', 'Citation accuracy on audit'], ['0', 'Answers shipped without a source']],
      method: 'Deflection means resolved with no human touch and no reopen within seven days. Citation accuracy was audited on a 200-ticket sample.'
    },
    'Human handoff': {
      unit: 'AI-Driven Customer Experience',
      claim: 'When confidence drops the agent hands off the full thread, what it already tried, and why it stopped.',
      hero: { value: '99%', label: 'of escalations arrive with full context' },
      good: 'up',
      series: { label: 'Escalations with full context', suffix: '%', values: [62, 74, 83, 90, 95, 98, 99, 99] },
      stats: [['0', 'Customers asked to repeat themselves'], ['-38%', 'Handle time on escalated tickets'], ['4.7/5', 'CSAT after handoff']],
      method: 'Context means the full thread, attempted resolutions, and the confidence reason, delivered into the agent desktop. CSAT is collected post-resolution.'
    },
    'Analytics': {
      unit: 'AI-Driven Customer Experience',
      claim: 'Every resolved thread is clustered, and the recurring causes go to the product backlog instead of being answered forever.',
      hero: { value: '-29%', label: 'inbound ticket volume against run rate' },
      good: 'down',
      series: { label: 'Monthly inbound tickets (thousands)', suffix: 'k', values: [14.2, 13.6, 12.9, 12.1, 11.5, 10.9, 10.4, 10.1] },
      stats: [['11', 'Root causes fixed upstream'], ['Weekly', 'Themes routed into the backlog'], ['0', 'Manual ticket tagging']],
      method: 'Volume reduction is measured against the pre-engagement run rate of 14,200 tickets per month, with seasonality held out.'
    },

    'Personalization': {
      unit: 'E-Commerce & High-Conversion Funnels',
      claim: 'Behavioural segments reorder the catalogue per visitor, measured against a control that never sees them.',
      hero: { value: '+23%', label: 'revenue per session against control' },
      good: 'up',
      series: { label: 'Revenue per session (index, 100 = control)', suffix: '', values: [100, 106, 111, 115, 118, 120, 122, 123] },
      stats: [['14', 'Behavioural segments live'], ['<80ms', 'Recommendation latency'], ['+18%', 'Average order value']],
      method: 'Measured against a held-out control group receiving default catalogue ordering for the full period, not a before-and-after comparison.'
    },
    'Funnels': {
      unit: 'E-Commerce & High-Conversion Funnels',
      claim: 'Checkout paths are built and tested per segment, with variants assigned deterministically so results hold up.',
      hero: { value: '3.1%', label: 'checkout conversion, up from 1.9%' },
      good: 'up',
      series: { label: 'Checkout conversion', suffix: '%', values: [1.9, 2.1, 2.3, 2.5, 2.7, 2.9, 3.0, 3.1] },
      stats: [['-41%', 'Cart abandonment'], ['4', 'Funnel variants live'], ['+62%', 'Mobile completion rate']],
      method: 'Conversion is completed orders divided by sessions reaching cart. Variants are assigned by deterministic hash on the visitor, not per session.'
    },
    'Experiments': {
      unit: 'E-Commerce & High-Conversion Funnels',
      claim: 'Pre-registered tests at a fixed horizon, so a result either clears the bar or gets reverted inside a day.',
      hero: { value: '38', label: 'experiments run, 12 shipped to everyone' },
      good: 'up',
      series: { label: 'Cumulative experiments run', suffix: '', values: [4, 9, 14, 19, 24, 29, 34, 38] },
      stats: [['12', 'Shipped to 100% of traffic'], ['2', 'Of our own ideas killed by the data'], ['95%', 'Confidence threshold before ship']],
      method: 'Fixed-horizon tests at 95% confidence against a pre-registered primary metric. Losing variants are reverted within 24 hours.'
    }
  };

  var $  = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };

  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ------------------------------ contact ------------------------------ */

  function fillContact() {
    var map = { email: CONFIG.contactEmail, phone: CONFIG.phone, hours: CONFIG.hours };
    Object.keys(map).forEach(function (key) {
      var dd = $('[data-contact="' + key + '"]');
      if (!dd || !map[key]) return;
      if (key === 'email') {
        var a = el('a', null, map[key]);
        a.href = 'mailto:' + map[key];
        dd.textContent = '';
        dd.appendChild(a);
      } else if (key === 'phone') {
        var t = el('a', null, map[key]);
        t.href = 'tel:' + map[key].replace(/[^\d+]/g, '');
        dd.textContent = '';
        dd.appendChild(t);
      } else {
        dd.textContent = map[key];
      }
    });
  }

  /* ------------------------------- header ------------------------------ */

  function initHeader() {
    var header = $('#siteHeader');
    var toggle = $('#menuToggle');
    var panel  = $('#navMobile');
    if (!header) return;

    var onScroll = function () {
      header.classList.toggle('is-stuck', window.scrollY > 12);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    function setMenu(open) {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.hidden = !open;
    }

    if (toggle && panel) {
      toggle.addEventListener('click', function () {
        setMenu(toggle.getAttribute('aria-expanded') !== 'true');
      });
      $$('a', panel).forEach(function (a) {
        a.addEventListener('click', function () { setMenu(false); });
      });
      window.addEventListener('resize', function () {
        if (window.innerWidth >= 1024) setMenu(false);
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
          setMenu(false);
          toggle.focus();
        }
      });
    }
  }

  /* ------------------------------- hero -------------------------------- */

  function initHero() {
    var video = $('#heroVideo');
    if (!video) return;
    video.muted = true;
    video.defaultMuted = true;
    video.volume = 0;

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      video.removeAttribute('autoplay');
      video.pause();
      return;
    }

    var play = function () { if (video.paused) video.play().catch(function () {}); };
    play();

    // Some mobile browsers refuse autoplay until the first interaction.
    var unlock = function () {
      play();
      document.removeEventListener('pointerdown', unlock);
    };
    document.addEventListener('pointerdown', unlock);
  }

  /* ------------------------------ reveals ------------------------------ */

  function initReveals() {
    var items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window)) {
      items.forEach(function (n) { n.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.05 });
    items.forEach(function (n) { io.observe(n); });
  }

  /* ------------------------------- work -------------------------------- */

  var activeFilter = 'All work';

  function renderWork() {
    var grid = $('#workGrid');
    if (!grid) return;
    var shown = activeFilter === 'All work'
      ? PROJECTS
      : PROJECTS.filter(function (p) { return p.category === activeFilter; });

    grid.textContent = '';

    if (!shown.length) {
      grid.appendChild(el('p', 'work-empty', 'No case studies in this unit yet.'));
      return;
    }

    shown.forEach(function (p) {
      var card = el('article', 'card');

      var shot = el('div', 'card-shot');
      shot.innerHTML = SHOTS[p.category] || '';   // author-controlled constants
      shot.appendChild(el('span', null, p.shot));
      card.appendChild(shot);

      var body = el('div', 'card-body');
      body.appendChild(el('span', 'card-category', p.category));
      body.appendChild(el('h3', null, p.title));
      body.appendChild(el('p', null, p.body));

      var tags = el('ul', 'tags');
      p.tags.forEach(function (t) {
        var li = el('li');
        if (PROOF[t]) {
          var btn = el('button', 'tag-btn', t);
          btn.type = 'button';
          btn.setAttribute('aria-haspopup', 'dialog');
          btn.setAttribute('aria-label', 'See the numbers behind ' + t);
          btn.addEventListener('click', function () { openProof(t, btn); });
          li.appendChild(btn);
        } else {
          li.appendChild(el('span', 'tag-btn', t));
        }
        tags.appendChild(li);
      });
      body.appendChild(tags);

      card.appendChild(body);
      grid.appendChild(card);
    });
  }

  function initWork() {
    var bar = $('#workFilters');
    if (!bar) return;
    var names = ['All work'].concat(PROJECTS.map(function (p) { return p.category; }));

    names.forEach(function (name) {
      var btn = el('button', 'filter', name);
      btn.type = 'button';
      btn.setAttribute('aria-pressed', String(name === activeFilter));
      btn.addEventListener('click', function () {
        activeFilter = name;
        $$('.filter', bar).forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.textContent === name));
        });
        renderWork();
      });
      bar.appendChild(btn);
    });

    renderWork();
  }

  /* --------------------------- proof dialog ---------------------------- */

  // One series per panel, so the caption names it and no legend is needed.
  // Thin 2px line, recessive grid, a single direct label on the last point.
  function trendChart(series, good) {
    var W = 520, H = 168;
    var L = 40, R = 54, T = 12, B = 26;
    var v = series.values, n = v.length;
    var lo = Math.min.apply(null, v), hi = Math.max.apply(null, v);
    var pad = (hi - lo) * 0.18 || 1;
    var min = lo - pad, max = hi + pad;

    var x = function (i) { return L + (W - L - R) * (n === 1 ? 0 : i / (n - 1)); };
    var y = function (val) { return T + (H - T - B) * (1 - (val - min) / (max - min)); };

    var fmt = function (val) {
      var d = (Math.abs(val) < 10 && String(val).indexOf('.') > -1) ? 1 : 0;
      return (series.prefix || '') + val.toFixed(d) + series.suffix;
    };

    var s = '<svg viewBox="0 0 ' + W + ' ' + H + '" role="img" ' +
            'aria-label="' + series.label + ' from ' + MONTHS[0] + ' to ' + MONTHS[n - 1] + '">';

    // Recessive gridlines with value labels at the band edges and midpoint.
    [max, (max + min) / 2, min].forEach(function (val) {
      var yy = y(val);
      s += '<line x1="' + L + '" y1="' + yy.toFixed(1) + '" x2="' + (W - R) + '" y2="' + yy.toFixed(1) +
           '" stroke="rgba(148,163,184,0.14)" stroke-width="1"/>' +
           '<text x="' + (L - 10) + '" y="' + (yy + 3.5).toFixed(1) + '" text-anchor="end" ' +
           'font-family="' + MONO + '" font-size="9.5" fill="rgba(148,163,184,0.7)">' + fmt(val) + '</text>';
    });

    var line = '', area = '';
    for (var i = 0; i < n; i++) {
      var px = x(i).toFixed(1), py = y(v[i]).toFixed(1);
      line += (i ? ' L' : 'M') + px + ',' + py;
    }
    area = line + ' L' + x(n - 1).toFixed(1) + ',' + (H - B) + ' L' + x(0).toFixed(1) + ',' + (H - B) + ' Z';

    s += '<defs><linearGradient id="pfFill" x1="0" y1="0" x2="0" y2="1">' +
         '<stop offset="0" stop-color="#a78bfa" stop-opacity="0.30"/>' +
         '<stop offset="1" stop-color="#a78bfa" stop-opacity="0"/></linearGradient></defs>' +
         '<path d="' + area + '" fill="url(#pfFill)"/>' +
         '<path d="' + line + '" fill="none" stroke="#a78bfa" stroke-width="2" ' +
         'stroke-linecap="round" stroke-linejoin="round"/>';

    // Month labels; thinned on narrow renders by showing every other one.
    for (i = 0; i < n; i++) {
      s += '<text x="' + x(i).toFixed(1) + '" y="' + (H - 8) + '" text-anchor="middle" ' +
           'font-family="' + MONO + '" font-size="9.5" fill="rgba(148,163,184,0.6)">' + MONTHS[i] + '</text>';
    }

    // The endpoint is the only directly labelled value.
    var ex = x(n - 1), ey = y(v[n - 1]);
    s += '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="5.5" fill="#0a0c13"/>' +
         '<circle cx="' + ex.toFixed(1) + '" cy="' + ey.toFixed(1) + '" r="4" fill="#a78bfa"/>' +
         '<text x="' + (ex + 12) + '" y="' + (ey + 4).toFixed(1) + '" font-family="' + MONO +
         '" font-size="12" fill="rgba(240,244,250,0.97)">' + fmt(v[n - 1]) + '</text>';

    // Hover layer: a crosshair and a marker driven from the pointer.
    s += '<line class="pf-cross" x1="0" y1="' + T + '" x2="0" y2="' + (H - B) +
         '" stroke="rgba(167,139,250,0.45)" stroke-width="1" stroke-dasharray="3 3" opacity="0"/>' +
         '<circle class="pf-mark" r="4.5" fill="#a78bfa" stroke="#0a0c13" stroke-width="2" opacity="0"/>' +
         '<rect class="pf-hit" x="' + L + '" y="' + T + '" width="' + (W - L - R) +
         '" height="' + (H - T - B) + '" fill="transparent" style="cursor:crosshair"/>';

    return {
      svg: s + '</svg>',
      geom: { W: W, L: L, R: R, n: n, xs: v.map(function (_, i) { return x(i); }),
              ys: v.map(function (val) { return y(val); }), fmt: fmt, values: v }
    };
  }

  function wireChartHover(fig, geom, seriesLabel) {
    var svg = $('svg', fig);
    var tip = $('.proof-tip', fig);
    var cross = $('.pf-cross', svg);
    var mark = $('.pf-mark', svg);
    var hit = $('.pf-hit', svg);
    if (!svg || !hit) return;

    function hide() {
      cross.setAttribute('opacity', '0');
      mark.setAttribute('opacity', '0');
      tip.hidden = true;
    }

    function move(ev) {
      var box = svg.getBoundingClientRect();
      var scale = box.width / geom.W;
      var localX = (ev.clientX - box.left) / scale;

      var best = 0, bestD = Infinity;
      geom.xs.forEach(function (gx, i) {
        var d = Math.abs(gx - localX);
        if (d < bestD) { bestD = d; best = i; }
      });

      cross.setAttribute('x1', geom.xs[best]);
      cross.setAttribute('x2', geom.xs[best]);
      cross.setAttribute('opacity', '1');
      mark.setAttribute('cx', geom.xs[best]);
      mark.setAttribute('cy', geom.ys[best]);
      mark.setAttribute('opacity', '1');

      tip.innerHTML = MONTHS[best] + ' &nbsp;<b>' + geom.fmt(geom.values[best]) + '</b>';
      tip.hidden = false;
      tip.style.left = (geom.xs[best] * scale) + 'px';
      tip.style.top = (geom.ys[best] * scale - 12) + 'px';
      tip.setAttribute('aria-label', seriesLabel);
    }

    hit.addEventListener('mousemove', move);
    hit.addEventListener('mouseleave', hide);
    hit.addEventListener('touchmove', function (e) {
      if (e.touches && e.touches[0]) move(e.touches[0]);
    }, { passive: true });
    hit.addEventListener('touchend', hide);
  }

  var proofState = { overlay: null, opener: null, onKey: null };

  function buildProof(name) {
    var d = PROOF[name];
    var chart = trendChart(d.series, d.good);
    var v = d.series.values;
    var first = v[0], last = v[v.length - 1];
    var diff = last - first;
    var rising = diff > 0;
    var improved = (d.good === 'up' && rising) || (d.good === 'down' && !rising);
    // A move from 0% to 61% is 61 percentage points, not 61 percent — the
    // distinction matters on a page a prospect reads as evidence.
    var deltaUnit = d.series.suffix === '%' ? ' pts' : d.series.suffix;
    var deltaTxt = (rising ? '▲ +' : '▼ ') + (d.series.prefix || '') + Math.abs(diff).toFixed(Math.abs(diff) < 10 ? 1 : 0) +
                   deltaUnit + ' over 8 months';

    var overlay = el('div', 'proof-overlay');
    overlay.hidden = true;

    var modal = el('div', 'proof-modal');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'proofTitle');
    modal.tabIndex = -1;

    var close = el('button', 'proof-close', '×');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    modal.appendChild(close);

    modal.appendChild(el('p', 'proof-unit', d.unit));
    var h = el('h2', 'proof-title', name);
    h.id = 'proofTitle';
    modal.appendChild(h);
    modal.appendChild(el('p', 'proof-claim', d.claim));

    var hero = el('div', 'proof-hero');
    hero.appendChild(el('span', 'proof-hero-value', d.hero.value));
    hero.appendChild(el('span', 'proof-hero-label', d.hero.label));
    if (improved) hero.appendChild(el('span', 'proof-delta', deltaTxt));
    modal.appendChild(hero);

    var fig = el('figure', 'proof-chart');
    fig.appendChild(el('figcaption', null, d.series.label + ' · ' + MONTHS[0] + '–' + MONTHS[MONTHS.length - 1] + ' 2026'));
    fig.insertAdjacentHTML('beforeend', chart.svg);
    var tip = el('div', 'proof-tip');
    tip.hidden = true;
    fig.appendChild(tip);
    modal.appendChild(fig);

    var stats = el('dl', 'proof-stats');
    d.stats.forEach(function (st) {
      var cell = el('div', 'proof-stat');
      cell.appendChild(el('dt', null, st[0]));
      cell.appendChild(el('dd', null, st[1]));
      stats.appendChild(cell);
    });
    modal.appendChild(stats);

    var method = el('p', 'proof-method');
    method.appendChild(el('strong', null, 'How this is measured. '));
    method.appendChild(document.createTextNode(d.method));
    modal.appendChild(method);

    // Provenance. Delete this block only once the figures above are real.
    modal.appendChild(el('p', 'proof-provenance',
      'Representative engagement data, shown to illustrate how this capability is measured. Not attributed to a named client.'));

    var actions = el('div', 'proof-actions');
    var cta = el('button', 'btn btn-solid', 'Discuss this on a strategy call');
    cta.type = 'button';
    cta.addEventListener('click', function () {
      closeProof();
      var launcher = $('[data-open-concierge][data-concierge-tab="booking"]');
      if (launcher) launcher.click();
    });
    actions.appendChild(cta);
    modal.appendChild(actions);

    overlay.appendChild(modal);
    return { overlay: overlay, modal: modal, close: close, fig: fig, geom: chart.geom };
  }

  function closeProof() {
    var st = proofState;
    if (!st.overlay) return;
    document.removeEventListener('keydown', st.onKey, true);
    if (st.overlay.parentNode) st.overlay.parentNode.removeChild(st.overlay);
    document.body.style.overflow = '';
    if (st.opener && document.contains(st.opener)) st.opener.focus();
    st.overlay = null;
    st.opener = null;
  }

  function openProof(name, opener) {
    if (!PROOF[name]) return;
    closeProof();

    var built = buildProof(name);
    document.body.appendChild(built.overlay);
    built.overlay.hidden = false;
    document.body.style.overflow = 'hidden';

    proofState.overlay = built.overlay;
    proofState.opener = opener || null;

    built.close.addEventListener('click', closeProof);
    built.overlay.addEventListener('mousedown', function (e) {
      if (e.target === built.overlay) closeProof();
    });

    // Escape closes; Tab is trapped inside the dialog while it is open.
    proofState.onKey = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeProof(); return; }
      if (e.key !== 'Tab') return;
      var f = $$('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])', built.modal)
        .filter(function (n) { return n.offsetParent !== null || n === built.close; });
      if (!f.length) return;
      var firstEl = f[0], lastEl = f[f.length - 1];
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener('keydown', proofState.onKey, true);

    wireChartHover(built.fig, built.geom, PROOF[name].series.label);
    built.close.focus();
  }

  /* ------------------------------- stars ------------------------------- */

  var STAR_PATH = 'M12 2.6l2.9 5.88 6.49.95-4.7 4.58 1.11 6.46L12 17.42l-5.8 3.05 1.1-6.46-4.69-4.58 6.49-.95L12 2.6z';

  function starRow(cls) {
    var wrap = el('span', cls);
    for (var i = 0; i < 5; i++) {
      var svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('viewBox', '0 0 24 24');
      svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('focusable', 'false');
      var path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', STAR_PATH);
      svg.appendChild(path);
      wrap.appendChild(svg);
    }
    return wrap;
  }

  // Progressive enhancement: the markup ships a readable "4.8 out of 5"
  // string, which stays as the accessible name once the stars are drawn.
  function initStars() {
    $$('.stars[data-rating]').forEach(function (node) {
      var rating = parseFloat(node.getAttribute('data-rating'));
      if (isNaN(rating)) return;

      var label = el('span', 'visually-hidden', node.textContent.trim());
      node.textContent = '';
      node.setAttribute('data-rendered', 'true');
      node.setAttribute('role', 'img');
      node.setAttribute('aria-label', label.textContent);

      var fill = starRow('stars-fill');
      fill.style.setProperty('--pct', (Math.max(0, Math.min(5, rating)) / 5 * 100).toFixed(1) + '%');

      node.appendChild(starRow('stars-base'));
      node.appendChild(fill);
    });
  }

  /* ------------------------------ reviews ------------------------------ */

  function initReviews() {
    var bar = $('#reviewFilters');
    var grid = $('#reviewGrid');
    var empty = $('#reviewEmpty');
    if (!bar || !grid) return;

    var cards = $$('.review', grid);

    $$('.filter', bar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var want = btn.getAttribute('data-industry');
        $$('.filter', bar).forEach(function (b) {
          b.setAttribute('aria-pressed', String(b === btn));
        });
        var visible = 0;
        cards.forEach(function (card) {
          var match = want === 'All reviews' || card.getAttribute('data-industry') === want;
          card.hidden = !match;
          if (match) visible++;
        });
        if (empty) empty.hidden = visible > 0;
      });
    });
  }

  /* ------------------------------ router ------------------------------- */

  // Only engages in the single-file bundle, where both pages are present in
  // one document. In the multi-page build there is one route, so real links
  // and normal anchors do the work untouched.
  function initRouter() {
    var routes = $$('.route');
    if (routes.length < 2) return;

    function show(hashOverride) {
      var hash = (hashOverride != null ? hashOverride : window.location.hash).replace(/^#\/?/, '');
      var want = hash === 'testimonials' ? 'testimonials' : 'home';

      routes.forEach(function (r) {
        r.hidden = r.getAttribute('data-route') !== want;
      });

      $$('.nav-desktop a, .nav-mobile-links a').forEach(function (a) {
        var href = a.getAttribute('href') || '';
        if (href.indexOf('testimonials') > -1) {
          a.setAttribute('aria-current', String(want === 'testimonials'));
        } else {
          a.removeAttribute('aria-current');
        }
      });

      if (want === 'home' && hash && hash !== 'top') {
        var target = document.getElementById(hash);
        if (target) {
          target.scrollIntoView({ behavior: 'auto', block: 'start' });
          return;
        }
      }
      window.scrollTo(0, 0);
    }

    window.addEventListener('hashchange', function () { show(); });

    // Drive the switch from the click too. Some embedded hosts refuse
    // location.hash writes, and the nav must still work there.
    document.addEventListener('click', function (e) {
      var link = e.target.closest && e.target.closest('a[href^="#"]');
      if (link) show(link.getAttribute('href'));
    });

    show();
  }

  /* ----------------------------- concierge ----------------------------- */

  var GREETING = 'Friends AI here. Salons and spas are our main practice — AI receptionists and client CRM. I can answer questions or book your strategy call. Which would you like?';

  var BOOKING_INTRO = "Let's get you scoped. Step 1 — your name and company email. Step 2 — the goal (Salon & Spa System, AI Assistant, Custom Website, Gym System, or CRM). Step 3 — I'll open live calendar slots for a 30-minute strategy call.";

  var GOAL_PROMPT = 'what is the goal? Salon & Spa System, AI Assistant, Custom Website, Gym System, or CRM.';

  var PRICING_REPLY = "Pricing is scoped per architecture, so I don't quote fixed numbers here. The 30-minute AI strategy call ends with a scoped plan and a range. Want me to start the booking flow?";

  var SUPPORT_FALLBACK = "Our main practice is salons and spas: an AI receptionist that books and rebooks around the clock, on a client CRM that remembers every visit. We build the same architecture for gyms, enterprise CRM, support agents, and e-commerce. Tell me your industry and I'll point you to the closest case study.";

  // Ordered: first match wins. Guardrails from the prototype's system prompt
  // are enforced here — pricing never gets a number, and every path routes
  // toward the strategy call.
  var INTENTS = [
    {
      test: /price|pricing|cost|quote|budget|how much|rate card|retainer/,
      reply: function () { return PRICING_REPLY; }
    },
    {
      test: /^(hi|hey|hello|yo|good (morning|afternoon|evening))\b/,
      reply: function () { return 'Good to meet you. Most of what we build is salon and spa systems — AI receptionists and client CRM. Want the detail, or shall I scope a 30-minute strategy call?'; }
    },
    {
      test: /salon|spa|beauty|barber|stylist|hair|nail|lash|aesthetic|med ?spa|receptionist|front desk|no-?show|rebook|walk-?in/,
      reply: function () { return 'That is our main practice. The AI receptionist books, reschedules, and fills cancellations 24/7, answers service and stylist questions, and hands the front desk anything it should not decide alone. Behind it, a client CRM tracks visit history, formula notes, rebooking cadence, and no-show risk. It syncs with Mindbody, Boulevard, Vagaro, or Square Appointments.'; }
    },
    {
      test: /gym|fitness|class schedul|membership|member lifecycle/,
      reply: function () { return 'Yes. We built a member lifecycle platform for a 40-location gym group: automated onboarding, class scheduling, payments, and a churn model wired into front-desk workflows. Same stack adapts to boutique studios. Want me to open the booking flow?'; }
    },
    {
      test: /crm|pipeline|salesforce|hubspot|highlevel|outreach|lead gen|lead engine/,
      reply: function () { return 'We build custom CRM and lead engines — multi-channel sequences, enrichment, and pipeline tracking, usually replacing three or four disconnected tools. Salesforce, HubSpot, and HighLevel all integrate. Tell me what you run today and I will map the migration.'; }
    },
    {
      test: /agent|chatbot|assistant|rag|knowledge base|support bot|automat/,
      reply: function () { return 'Our agents run on a RAG knowledge base built from your real documentation, with tool calling for live actions and clean human handoff when confidence drops. They deflect routine tickets and escalate with full context. Which workflow would you point one at first?'; }
    },
    {
      test: /website|web ?site|web app|next\.?js|redesign|landing|frontend|front-end/,
      reply: function () { return 'Custom web architecture: Next.js App Router, server rendering, edge caching, and SEO schema shipped from day one. Instrumented and handed over with a runbook, never a black box. What is the site doing today that it should not be?'; }
    },
    {
      test: /e-?commerce|shop|store|checkout|funnel|conversion|dtc/,
      reply: function () { return 'We build high-conversion funnels and personalization engines — behavioral segments and dynamic paths tuned against live conversion data. Most recently for a DTC catalog. Share your platform and current conversion rate and I will tell you where the lift usually sits.'; }
    },
    {
      test: /instagram|social|dm|content|post|tiktok/,
      reply: function () { return 'We run an always-on social engine for a national retail brand: scheduled publishing, DM triage, and comment-to-lead routing across six regional accounts. Every inbound becomes a tracked lead rather than a lost notification.'; }
    },
    {
      test: /soc ?2|hipaa|complian|secur|privacy|gdpr|uptime|sla|reliab/,
      reply: function () { return 'SOC 2 Type II controls, HIPAA-ready data paths, and a 99.99% uptime SLA on US infrastructure. Data stays in US regions, and every agent action is logged for audit. Happy to walk your security team through the architecture on a call.'; }
    },
    {
      test: /stack|tech|integrat|api|tools|openai|anthropic|aws|vercel|supabase|stripe/,
      reply: function () { return 'In production we run OpenAI, Anthropic, and DeepSeek for orchestration; AWS, Vercel, and Supabase for infrastructure; Salesforce, HubSpot, HighLevel, and the Stripe API for data and payments. We fit your stack rather than replacing it.'; }
    },
    {
      test: /how long|timeline|how fast|when can|lead time|delivery|deadline/,
      reply: function () { return 'A scoped agent or funnel typically ships in three to six weeks; full platform builds run longer and land in phases so something is live early. Exact timing comes out of the strategy call once we see your stack.'; }
    },
    {
      test: /review|testimonial|rating|reference|referral|feedback|trust|legit/,
      reply: function () { return '4.8 out of 5 across 347 businesses, most of them salons and spas. The Testimonials page has the full breakdown by star and by industry, including the four-star reviews. Worth reading the salon ones first if that is your world.'; }
    },
    {
      test: /case stud|portfolio|examples|previous work|clients|who have you/,
      reply: function () { return 'Six business units, led by salons and spas: booking and retention systems, then social automation, gym management, enterprise CRM, AI customer experience, and e-commerce funnels. Scroll to Selected work and filter by the unit closest to your industry.'; }
    },
    {
      test: /what do you (do|build)|who are you|about|services|capabilit/,
      reply: function () { return SUPPORT_FALLBACK; }
    },
    {
      test: /contact|email|phone|call you|reach|speak to (a )?(human|person|someone)/,
      reply: function () {
        // Composed from whatever CONFIG actually has, so the concierge
        // never promises a channel that is still a placeholder.
        var ways = [];
        if (CONFIG.phone) ways.push('call ' + CONFIG.phone);
        if (CONFIG.contactEmail) ways.push('email ' + CONFIG.contactEmail);
        return (ways.length ? 'You can ' + ways.join(' or ') + '. ' : '') +
          'Fastest route is still the 30-minute strategy call — say "book" and I will scope it now.';
      }
    },
    {
      test: /thank|thanks|cheers|appreciate/,
      reply: function () { return 'Any time. If you want the scoped plan, say "book" and I will run the three-step flow.'; }
    }
  ];

  var BOOKING_TRIGGER = /book|schedul|call|meeting|slot|demo|strategy session|talk to/;

  function nextSlots() {
    var out = [];
    var d = new Date();
    var times = ['10:00 AM ET', '1:30 PM ET', '4:00 PM ET'];
    var i = 0;
    while (out.length < 3 && i < 14) {
      i++;
      d = new Date(d.getTime() + 86400000);
      var day = d.getDay();
      if (day === 0 || day === 6) continue;
      out.push(d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) + ' — ' + times[out.length]);
    }
    return out;
  }

  // Salon & spa is tested first so "salon CRM" and "spa chatbot" both land on
  // the primary practice rather than the generic CRM or agent bucket.
  var GOALS = [
    { test: /salon|spa|beauty|barber|stylist|hair|nail|lash|aesthetic|receptionist/, label: 'Salon & Spa System' },
    { test: /gym|fitness|membership/, label: 'Gym System' },
    { test: /website|web|site|landing|next/, label: 'Custom Website' },
    { test: /assistant|agent|chatbot|ai|rag|support/, label: 'AI Assistant / Agent' },
    { test: /crm|pipeline|lead|outreach|sales/, label: 'CRM' }
  ];

  function Concierge() {
    this.panel   = $('#conciergePanel');
    this.launch  = $('#conciergeLaunch');
    this.close   = $('#conciergeClose');
    this.log     = $('#conciergeLog');
    this.typing  = $('#conciergeTyping');
    this.chipBar = $('#conciergeChips');
    this.form    = $('#conciergeForm');
    this.input   = $('#conciergeInput');
    this.tabs    = { support: $('#tabSupport'), booking: $('#tabBooking') };

    this.tab = 'support';
    this.messages = [];
    this.booking = { step: null, name: null, email: null, goal: null };

    this.bind();
    this.say('assistant', GREETING);
    this.renderChips();
  }

  Concierge.prototype.bind = function () {
    var self = this;

    $$('[data-open-concierge]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        self.open(btn.getAttribute('data-concierge-tab'));
      });
    });

    this.launch.addEventListener('click', function () {
      if (self.panel.hidden) self.open(); else self.hide();
    });
    this.close.addEventListener('click', function () {
      self.hide();
      self.launch.focus();
    });

    this.tabs.support.addEventListener('click', function () { self.setTab('support'); });
    this.tabs.booking.addEventListener('click', function () { self.setTab('booking'); });

    this.form.addEventListener('submit', function (e) {
      e.preventDefault();
      var value = self.input.value.trim();
      if (!value) return;
      self.input.value = '';
      self.ask(value);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !self.panel.hidden) {
        self.hide();
        self.launch.focus();
      }
    });
  };

  Concierge.prototype.open = function (tab) {
    this.panel.hidden = false;
    this.launch.setAttribute('aria-expanded', 'true');
    if (tab && tab !== this.tab) this.setTab(tab);
    var self = this;
    window.setTimeout(function () { self.input.focus(); }, 60);
  };

  Concierge.prototype.hide = function () {
    this.panel.hidden = true;
    this.launch.setAttribute('aria-expanded', 'false');
  };

  Concierge.prototype.setTab = function (tab) {
    if (this.tab === tab) return;
    this.tab = tab;
    this.tabs.support.setAttribute('aria-selected', String(tab === 'support'));
    this.tabs.booking.setAttribute('aria-selected', String(tab === 'booking'));
    if (tab === 'booking') this.startBooking();
    this.renderChips();
  };

  Concierge.prototype.startBooking = function () {
    this.booking = { step: 'identity', name: null, email: null, goal: null };
    this.say('assistant', BOOKING_INTRO);
  };

  Concierge.prototype.say = function (sender, text) {
    this.messages.push({ sender: sender, text: text });
    var row = el('div', 'msg msg--' + sender);
    row.appendChild(el('div', 'msg-bubble', text));
    this.log.appendChild(row);
    this.log.scrollTop = this.log.scrollHeight;
  };

  Concierge.prototype.renderChips = function () {
    var sets = {
      support: ['Do you work with salons and spas?', 'How does the AI receptionist work?', 'What are your reviews like?'],
      booking: ['Salon or spa system', 'Book a strategy call', 'CRM build']
    };
    var self = this;
    this.chipBar.textContent = '';
    sets[this.tab].forEach(function (label) {
      var chip = el('button', 'concierge-chip', label);
      chip.type = 'button';
      chip.addEventListener('click', function () { self.ask(label); });
      self.chipBar.appendChild(chip);
    });
  };

  Concierge.prototype.ask = function (text) {
    var self = this;
    this.say('user', text);
    this.typing.hidden = false;
    this.log.scrollTop = this.log.scrollHeight;

    this.reply(text).then(function (answer) {
      self.typing.hidden = true;
      self.say('assistant', answer);
    }).catch(function () {
      self.typing.hidden = true;
      self.say('assistant', self.localReply(text));
    });
  };

  Concierge.prototype.reply = function (text) {
    var self = this;
    if (!CONFIG.apiEndpoint) {
      return new Promise(function (resolve) {
        window.setTimeout(function () { resolve(self.localReply(text)); }, 420);
      });
    }
    return fetch(CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode: this.tab,
        messages: this.messages.map(function (m) {
          return { role: m.sender === 'user' ? 'user' : 'assistant', content: m.text };
        })
      })
    }).then(function (res) {
      if (!res.ok) throw new Error('bad status');
      return res.json();
    }).then(function (data) {
      var reply = (data && data.reply ? String(data.reply) : '')
        .replace(/\*\*|__/g, '')
        .replace(/(^|\s)[*_](\S)/g, '$1$2')
        .replace(/^\s*#{1,6}\s*/gm, '')
        .replace(/^\s*[-*•]\s+/gm, '')
        .trim();
      return reply || self.localReply(text);
    });
  };

  Concierge.prototype.localReply = function (raw) {
    var text = String(raw).toLowerCase();

    // Pricing guardrail outranks the booking flow, always.
    if (/price|pricing|cost|quote|budget|how much/.test(text)) return PRICING_REPLY;

    if (this.booking.step) {
      var stepped = this.advanceBooking(raw, text);
      if (stepped) return stepped;
    }

    if (BOOKING_TRIGGER.test(text) && !this.booking.step) {
      this.booking = { step: 'identity', name: null, email: null, goal: null };
      return BOOKING_INTRO;
    }

    for (var i = 0; i < INTENTS.length; i++) {
      if (INTENTS[i].test.test(text)) return INTENTS[i].reply();
    }

    return this.tab === 'booking' ? BOOKING_INTRO : SUPPORT_FALLBACK;
  };

  Concierge.prototype.advanceBooking = function (raw, text) {
    var b = this.booking;

    if (b.step === 'identity') {
      var email = raw.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
      if (!email) {
        return 'Almost — I still need a company email address so the invite lands in the right inbox. Name and email together is fine.';
      }
      b.email = email[0];
      var name = raw.replace(email[0], '').replace(/[,;|]/g, ' ').trim();
      b.name = name ? name.split(/\s+/).slice(0, 3).join(' ') : null;
      b.step = 'goal';
      return (b.name ? 'Thanks, ' + b.name + '. ' : 'Got it. ') + 'Step 2 — ' + GOAL_PROMPT;
    }

    if (b.step === 'goal') {
      for (var i = 0; i < GOALS.length; i++) {
        if (GOALS[i].test.test(text)) { b.goal = GOALS[i].label; break; }
      }
      if (!b.goal) {
        return 'Pick the closest one and we can refine it live: ' + GOAL_PROMPT.replace('what is the goal? ', '');
      }
      b.step = 'slots';
      return 'Logged: ' + b.goal + '. Step 3 — here are the next open slots for a 30-minute call.\n\n' +
        nextSlots().map(function (s, n) { return (n + 1) + '. ' + s; }).join('\n') +
        '\n\nReply with a number and I will hold it.';
    }

    if (b.step === 'slots') {
      var slots = nextSlots();
      var pick = raw.match(/[1-3]/);
      if (!pick) {
        return 'Reply 1, 2, or 3 and I will hold that slot. If none work, tell me a day that does.';
      }
      var chosen = slots[Number(pick[0]) - 1];
      b.step = 'done';

      var summary = 'Holding ' + chosen + ' for ' + (b.name || 'you') +
        ' — ' + b.goal + '. Confirmation goes to ' + b.email + '.';

      if (CONFIG.calendarUrl) {
        return summary + '\n\nConfirm it here: ' + CONFIG.calendarUrl;
      }
      if (CONFIG.contactEmail) {
        return summary + '\n\nA strategist confirms within one business hour. Anything urgent, reach us at ' + CONFIG.contactEmail + '.';
      }
      return summary + '\n\nA strategist confirms within one business hour. Anything else you want on the agenda?';
    }

    if (b.step === 'done') {
      return null; // fall through to normal intents
    }

    return null;
  };

  /* ------------------------------- boot -------------------------------- */

  function boot() {
    fillContact();
    initHeader();
    initHero();
    initReveals();
    initWork();
    initStars();
    initReviews();
    initRouter();
    if ($('#conciergePanel')) new Concierge();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
