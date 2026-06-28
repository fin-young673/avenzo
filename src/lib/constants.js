export const APP_NAME = 'Avozea Agency Manager'

export const TABLES = [
  'clients',
  'projects',
  'project_deliverables',
  'project_notes',
  'retainers',
  'retainer_updates',
  'outreach_log',
  'case_studies',
  'documents',
  'processes',
  'client_notes',
  'settings',
]

export const CLIENT_STATUSES = ['Lead', 'Beta Client', 'Paid Client', 'Retainer', 'Churned']
export const PROJECT_STATUSES = [
  'Idea',
  'Outreach Sent',
  'Call Booked',
  'Proposal Sent',
  'Agreed',
  'In Build',
  'In Review',
  'Live',
  'Completed',
  'Paused',
  'Cancelled',
]
export const PACKAGE_TYPES = ['Beta Build', 'Starter Website', 'Growth System Maintain', 'Growth System Grow', 'Growth System Scale', 'Custom']
export const PLATFORMS = ['Webflow', 'WordPress', 'Framer', 'Wix', 'Squarespace', 'Shopify', 'Other']
export const OUTREACH_PLATFORMS = ['Instagram', 'Email', 'LinkedIn', 'Facebook', 'Other']
export const MESSAGE_TYPES = ['Cold DM', 'Loom Audit', 'Follow-up', 'Reply', 'Cold Email']
export const OUTREACH_STATUSES = ['Sent', 'Replied', 'No Reply', 'Call Booked', 'Not Interested', 'Converted']
export const RETAINER_TIERS = ['Maintain', 'Grow', 'Scale', 'Custom']
export const RETAINER_STATUSES = ['Active', 'Paused', 'Cancelled']
export const CASE_STUDY_STATUSES = ['In Progress', 'Collecting Assets', 'Ready to Publish', 'Published']
export const DOCUMENT_TYPES = ['Contract', 'Brief', 'Receipt', 'Screenshot', 'Onboarding Form', 'Report', 'Loom Video', 'Other']
export const SOURCES = ['Instagram DM', 'Cold Email', 'Loom Audit', 'Referral', 'LinkedIn', 'Facebook Group', 'Existing Contact', 'Other']

export const PIPELINE_STAGES = [
  'Idea',
  'Outreach Sent',
  'Call Booked',
  'Proposal Sent',
  'Agreed',
  'In Build',
  'Live',
  'Retainer Active',
  'Completed',
]

export const DEFAULT_DELIVERABLES = {
  default: [
    ['Initial Audit', 'Review current website, SEO, competitors, enquiry flow.'],
    ['Strategy', 'Define target customer, site structure, key search terms, calls-to-action.'],
    ['Copy & Content', 'Write or gather all page copy before design begins.'],
    ['Design', 'Create the visual design, layout, and structure.'],
    ['Build', 'Develop the website on the chosen platform.'],
    ['SEO Setup', 'Page titles, meta descriptions, heading structure, image alt text, sitemap, Search Console, Analytics.'],
    ['AEO Setup', 'FAQ sections, structured answer content, helpful guides, question-and-answer pages.'],
    ['Automation', 'Contact form routing, Google Sheets lead capture, automated reply, booking link.'],
    ['Launch Checklist', 'Mobile test, desktop test, forms test, speed check, SSL, domain, backup, client review.'],
    ['Case Study', 'Collect before/after screenshots, testimonial, and results summary.'],
  ],
  growth: [
    ['Onboarding form collected', 'Collect client information, access and service details.'],
    ['Access granted', 'Website, Analytics and Search Console access granted.'],
    ['Initial audit completed', 'Review starting position and immediate opportunities.'],
    ['Month 1 content plan agreed', 'Agree the first month of deliverables and priorities.'],
    ['First deliverable sent', 'Send the first visible improvement or content asset.'],
    ['Monthly report sent', 'Send a summary of work completed and what changes next.'],
  ],
}

export const DEFAULT_PROCESSES = [
  {
    title: 'Outreach Process',
    description: 'Find suitable businesses, review their site, send personalised outreach and track the follow-up.',
    estimated_time: '20–30 mins per lead',
    tools_used: 'Google, Instagram, Loom, Email, Agency Manager',
    steps: [
      { order: 1, title: 'Find target business', description: 'Choose photographers or creative service brands with a visible website problem.' },
      { order: 2, title: 'Review website', description: 'Look for weak service pages, poor CTAs, weak SEO, slow pages or missing FAQs.' },
      { order: 3, title: 'Record audit', description: 'Create a short Loom with 2–3 specific improvements.' },
      { order: 4, title: 'Send message', description: 'Send a personalised message offering the audit or beta build opportunity.' },
      { order: 5, title: 'Follow up', description: 'Follow up after a few days and log the result.' },
    ],
  },
  {
    title: 'Free Audit Process',
    description: 'A repeatable audit structure that turns website weaknesses into a clear sales conversation.',
    estimated_time: '30–45 mins',
    tools_used: 'Loom, PageSpeed, Google, Search Console if available',
    steps: [
      { order: 1, title: 'First impression', description: 'Explain the visual and clarity issues a new visitor would notice.' },
      { order: 2, title: 'Search visibility', description: 'Check page titles, headings, service pages and local keyword opportunities.' },
      { order: 3, title: 'Enquiry flow', description: 'Review CTAs, forms, booking links and follow-up process.' },
      { order: 4, title: 'AEO opportunities', description: 'Find buyer questions that the website should answer.' },
      { order: 5, title: 'Recommended next step', description: 'Give a clear practical action, then invite them to a call.' },
    ],
  },
  {
    title: 'Sales Call Process',
    description: 'Guide the call around goals, problems, fit and next steps without sounding pushy.',
    estimated_time: '30 mins',
    tools_used: 'Google Meet, Notes, Proposal doc',
    steps: [
      { order: 1, title: 'Understand goals', description: 'Ask what they want more of: bookings, leads, trust, speed or less admin.' },
      { order: 2, title: 'Diagnose blockers', description: 'Talk through current website, SEO, content and enquiry problems.' },
      { order: 3, title: 'Explain transformation', description: 'Show how the website becomes a search-ready enquiry system.' },
      { order: 4, title: 'Pitch package', description: 'Match them to Beta Build, Starter Website or Growth System.' },
      { order: 5, title: 'Agree next action', description: 'Confirm proposal, onboarding form or follow-up date.' },
    ],
  },
  {
    title: 'Client Onboarding',
    description: 'Collect everything needed before the project begins so delivery stays clean.',
    estimated_time: '1 hour setup',
    tools_used: 'Tally, Google Drive, Email, Agency Manager',
    steps: [
      { order: 1, title: 'Send onboarding form', description: 'Collect goals, services, target customers, assets, access and examples.' },
      { order: 2, title: 'Create client folder', description: 'Create a clear Google Drive folder structure for files and screenshots.' },
      { order: 3, title: 'Confirm scope', description: 'Write the agreed pages, deliverables, timeline and responsibilities.' },
      { order: 4, title: 'Create project record', description: 'Add the project and default deliverables in Agency Manager.' },
    ],
  },
  {
    title: 'Initial Audit Step',
    description: 'Internal review of the client’s current website and business opportunity.',
    estimated_time: '1–2 hours',
    tools_used: 'Google, PageSpeed, Analytics, Search Console',
    steps: [
      { order: 1, title: 'Website review', description: 'Check homepage clarity, mobile layout, forms, speed and trust signals.' },
      { order: 2, title: 'Competitor review', description: 'Compare against 3–5 competitors or similar local businesses.' },
      { order: 3, title: 'Search review', description: 'Find key local/service terms and content gaps.' },
    ],
  },
  {
    title: 'Strategy Step',
    description: 'Define the structure and direction before designing anything.',
    estimated_time: '1–2 hours',
    tools_used: 'Figma, Docs, Keyword tools',
    steps: [
      { order: 1, title: 'Define target customer', description: 'Write who the website is for and what they need to trust.' },
      { order: 2, title: 'Map pages', description: 'Plan the homepage, services, portfolio, FAQs and contact journey.' },
      { order: 3, title: 'Choose CTAs', description: 'Decide the primary enquiry path and secondary actions.' },
    ],
  },
  {
    title: 'Copy & Content Step',
    description: 'Create direct, helpful website copy before the build becomes messy.',
    estimated_time: '2–4 hours',
    tools_used: 'Docs, ChatGPT/Gemini, Client assets',
    steps: [
      { order: 1, title: 'Collect raw information', description: 'Use onboarding answers, service details, testimonials and FAQs.' },
      { order: 2, title: 'Draft page copy', description: 'Write clear sections that answer what the client does and why it matters.' },
      { order: 3, title: 'Edit for search', description: 'Add local and service intent naturally without keyword stuffing.' },
    ],
  },
  {
    title: 'Design Step',
    description: 'Produce a premium, conversion-focused visual direction.',
    estimated_time: '3–6 hours',
    tools_used: 'Figma, Client brand assets',
    steps: [
      { order: 1, title: 'Style direction', description: 'Choose typography, spacing, colour and image treatment.' },
      { order: 2, title: 'Homepage layout', description: 'Design the core homepage sections and CTA flow.' },
      { order: 3, title: 'Mobile pass', description: 'Check the layout works cleanly on smaller screens.' },
    ],
  },
  {
    title: 'Build Step',
    description: 'Build the site on the chosen platform with clean structure.',
    estimated_time: '6–15 hours',
    tools_used: 'WordPress, Webflow, Framer or Shopify',
    steps: [
      { order: 1, title: 'Set up project', description: 'Create the site, base styles and page structure.' },
      { order: 2, title: 'Build pages', description: 'Build sections, forms, navigation and responsive layouts.' },
      { order: 3, title: 'Quality check', description: 'Check desktop, tablet and mobile before client review.' },
    ],
  },
  {
    title: 'SEO Setup Step',
    description: 'Add the minimum search foundations every proper site needs.',
    estimated_time: '1–3 hours',
    tools_used: 'CMS SEO settings, Search Console, Analytics',
    steps: [
      { order: 1, title: 'Metadata', description: 'Write page titles and meta descriptions.' },
      { order: 2, title: 'Structure', description: 'Check headings, URLs, image alt text and internal links.' },
      { order: 3, title: 'Indexing', description: 'Submit sitemap and connect Analytics/Search Console.' },
    ],
  },
  {
    title: 'AEO Setup Step',
    description: 'Make the website easier for answer engines and buyers to understand.',
    estimated_time: '1–3 hours',
    tools_used: 'CMS, Docs, Search research',
    steps: [
      { order: 1, title: 'FAQ content', description: 'Add clear questions and direct answers.' },
      { order: 2, title: 'Helpful guides', description: 'Plan buyer education content such as pricing and how-to-choose pages.' },
      { order: 3, title: 'Clean headings', description: 'Structure content so each section explains one answer clearly.' },
    ],
  },
  {
    title: 'Automation Setup Step',
    description: 'Add simple systems that make leads easier to handle.',
    estimated_time: '1–4 hours',
    tools_used: 'Tally, Google Sheets, n8n/Make, Email',
    steps: [
      { order: 1, title: 'Lead capture', description: 'Route forms to email and a tracked sheet or CRM.' },
      { order: 2, title: 'Auto reply', description: 'Send a useful confirmation message to new leads.' },
      { order: 3, title: 'Follow-up reminder', description: 'Create a simple reminder so no enquiry is missed.' },
    ],
  },
  {
    title: 'Launch Checklist',
    description: 'Final checks before a site goes live.',
    estimated_time: '1–2 hours',
    tools_used: 'CMS, Analytics, Search Console, Browser testing',
    steps: [
      { order: 1, title: 'Device test', description: 'Check key pages on mobile, tablet and desktop.' },
      { order: 2, title: 'Forms and links', description: 'Test forms, buttons, navigation and external links.' },
      { order: 3, title: 'SEO and analytics', description: 'Check titles, sitemap, Analytics and Search Console.' },
      { order: 4, title: 'Domain and SSL', description: 'Connect domain, check SSL and final client approval.' },
    ],
  },
  {
    title: 'Monthly Retainer Delivery',
    description: 'Repeatable monthly work to keep clients receiving value.',
    estimated_time: '2–8 hours/month',
    tools_used: 'CMS, Search Console, Analytics, Docs',
    steps: [
      { order: 1, title: 'Review performance', description: 'Check enquiries, clicks, impressions, pages and issues.' },
      { order: 2, title: 'Deliver improvements', description: 'Complete agreed content, SEO, AEO, edits or automation tasks.' },
      { order: 3, title: 'Send update', description: 'Log monthly update and send a clear client summary.' },
    ],
  },
  {
    title: 'Case Study Creation',
    description: 'Turn completed work into proof that helps sell the next project.',
    estimated_time: '1–3 hours',
    tools_used: 'Screenshots, Client testimonial, Website CMS',
    steps: [
      { order: 1, title: 'Collect assets', description: 'Save before/after screenshots, testimonial and results.' },
      { order: 2, title: 'Write story', description: 'Explain the problem, strategy, build and outcome.' },
      { order: 3, title: 'Publish', description: 'Add to the Avozea website once permission is confirmed.' },
    ],
  },
]

export const DEFAULT_PACKAGES = [
  {
    key: 'beta',
    title: 'Beta Build',
    price: '£0 build fee',
    description: 'Selected case study websites in exchange for feedback, testimonial and public case study rights.',
    included: ['Full website build', 'SEO foundations', 'AEO structure', 'Launch support', 'Before/after case study'],
    note: 'Value of £750+ included for selected case study clients.',
  },
  {
    key: 'starter',
    title: 'Starter Website',
    price: '£750+ per build',
    description: 'A proper 5-page website for small service businesses that need to look credible and generate enquiries.',
    included: ['Homepage', 'About page', 'Services page', 'Portfolio/work page', 'Contact page', 'Basic SEO and analytics'],
    note: 'Best first paid offer once proof is built.',
  },
  {
    key: 'growth',
    title: 'Growth System',
    price: '£49–£750/month',
    description: 'Ongoing care, SEO/AEO content, reporting, website improvements and simple automation support.',
    included: ['Maintain: £49–£79/month', 'Grow: £149–£249/month', 'Scale: £399–£750/month'],
    note: 'The recurring revenue backbone of the agency.',
  },
  {
    key: 'custom',
    title: 'Custom',
    price: 'Quoted scope',
    description: 'Bespoke projects for clients needing wider automation, content systems, landing pages or complex builds.',
    included: ['Discovery', 'Custom scope', 'Milestone pricing', 'Retainer option'],
    note: 'Use once the scope is too broad for fixed packages.',
  },
]

export const PRICING_STAGES = [
  { stage: 'Stage 1', description: 'Proof', buildPrice: '£0 beta', retainer: '£60–£149/month', goal: 'Testimonials, portfolio' },
  { stage: 'Stage 2', description: 'Early paid', buildPrice: '£750', retainer: '£99–£149/month', goal: 'First revenue' },
  { stage: 'Stage 3', description: 'Serious agency', buildPrice: '£1,000–£1,500', retainer: '£149–£399/month', goal: '£1,000–£3,000/month' },
  { stage: 'Stage 4', description: 'Travel-ready', buildPrice: '£1,500–£2,500+', retainer: '£249–£750/month', goal: '£3,000–£5,000/month' },
]

export const DEFAULT_SETTINGS = {
  agency_name: 'Avozea',
  owner_name: 'Fin Young',
  default_currency: 'GBP',
  weekly_message_target: '100',
  daily_message_target: '20',
  current_stage: 'Stage 1',
  target_mrr_1: '1000',
  target_mrr_2: '5000',
  travel_fund_goal: '15000',
  travel_fund_saved: '0',
  pricing_packages: JSON.stringify(DEFAULT_PACKAGES),
}
