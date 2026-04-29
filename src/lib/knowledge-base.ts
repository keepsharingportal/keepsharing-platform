export type KBRole = 'publisher' | 'va' | 'editor' | 'all'

export type KBStep = {
  title: string
  description: string
}

export type KBError = {
  error: string
  fix: string
}

export type KBArticle = {
  id: string
  title: string
  category: string
  roles: KBRole[]
  timeRequired: string
  summary: string
  steps: KBStep[]
  whatHappensNext: string
  commonErrors: KBError[]
  relatedArticles: string[]   // IDs
  keywords: string[]
}

export const KB_CATEGORIES = [
  'Getting Started',
  'Advertisers',
  'Content',
  'Distribution',
  'Settings',
  'Reports',
] as const

export type KBCategory = typeof KB_CATEGORIES[number]

export const KB_ARTICLES: KBArticle[] = [
  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'clone-advertiser-sheet',
    title: 'How to clone the monthly advertiser sheet to next month',
    category: 'Advertisers',
    roles: ['va', 'publisher'],
    timeRequired: '5 minutes',
    summary: 'At the end of each month, copy all active advertisers from the current issue into the next month so renewals start pre-populated in the layout sheet.',
    steps: [
      {
        title: 'Open the Layout Sheet',
        description: 'Navigate to Advertisers → Layout Sheet in the sidebar. Make sure the correct publication and current month are selected in the droppers at the top.',
      },
      {
        title: 'Confirm the current issue looks correct',
        description: 'Scan the list. All advertisers who are expected to renew should be visible. If anyone is missing, add them before cloning (see "How to add a new advertiser").',
      },
      {
        title: 'Click the Clone button',
        description: 'In the top action bar, click "Clone to Next Issue". A confirmation dialog shows the target issue (e.g. "RRP APR26") and a count of records to copy.',
      },
      {
        title: 'Review and confirm',
        description: 'The dialog lists every advertiser being cloned. Advertisers marked "Dropped" are excluded automatically. Confirm the target month is correct, then click "Clone X records".',
      },
      {
        title: 'Switch to the new month and verify',
        description: 'Use the month selector to jump to the new issue. All cloned records will appear with their original size, designer, and layout notes. Stage resets to "Renewal" for easy tracking.',
      },
      {
        title: 'Update any changes',
        description: 'If any advertiser changed their size, position, or designer for the new month, update those records now. Contact info carries over automatically.',
      },
    ],
    whatHappensNext: 'The new issue now appears in /api/advertisers/issues, the layout sheet, and the advertiser intelligence reports. Any new bookings made through the self-serve booking tool will appear alongside these cloned records.',
    commonErrors: [
      {
        error: '"Clone to Next Issue" button is grayed out',
        fix: 'The current issue must have at least one advertiser record to clone. If the sheet is empty, import data first using the Zoho import tool.',
      },
      {
        error: 'Dropped advertisers appear in the cloned issue',
        fix: 'Change their stage to "Dropped" in the current month before cloning. The clone excludes any record with stage = Dropped.',
      },
      {
        error: 'Wrong target month was selected',
        fix: 'Delete the incorrectly cloned records by selecting them all in the layout sheet and using the bulk-delete action, then redo the clone.',
      },
    ],
    relatedArticles: ['add-new-advertiser', 'import-zoho-data', 'monthly-advertiser-report'],
    keywords: ['clone', 'copy', 'next month', 'layout sheet', 'renew', 'renewal', 'issue', 'advertiser sheet'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'add-new-advertiser',
    title: 'How to add a new advertiser',
    category: 'Advertisers',
    roles: ['va', 'publisher'],
    timeRequired: '3 minutes',
    summary: 'Manually add a new advertiser record to a specific issue — used for walk-in sales, phone agreements, and new accounts that came in after an import.',
    steps: [
      {
        title: 'Go to the Layout Sheet',
        description: 'Navigate to Advertisers → Layout Sheet. Select the publication and issue month for the new advertiser.',
      },
      {
        title: 'Click "Add Advertiser"',
        description: 'The button is in the top-right of the layout sheet. It opens the Add Advertiser modal.',
      },
      {
        title: 'Enter business information',
        description: 'Type the business name. The system checks if the business already exists — if found, it auto-fills the contact info. If new, enter contact name, email, and phone.',
      },
      {
        title: 'Set the ad details',
        description: 'Select ad size (from 1/8 page through 2-page spread), orientation, and any special position request (inside front cover, back cover, etc.).',
      },
      {
        title: 'Set financial details',
        description: 'Enter the monthly rate agreed upon. Select invoice type (Invoice, Credit Card, or Complimentary). Set the designer assigned and design status (New, Pick-up, or DropBox).',
      },
      {
        title: 'Save the record',
        description: 'Click Save. The record appears in the layout sheet immediately. The business is created in the businesses table if it was new.',
      },
    ],
    whatHappensNext: 'The advertiser appears on the layout sheet and counts toward issue stats (page count, revenue total). If a GHL contact exists for this business, their record is updated automatically. The new advertiser will be included the next time you clone to the next month.',
    commonErrors: [
      {
        error: 'Duplicate business created instead of matching existing',
        fix: 'The name must match exactly (case-insensitive). Search for the business in Advertisers → Businesses first to confirm the exact name before adding.',
      },
      {
        error: 'Rate shows $0 after saving',
        fix: 'The amount field requires a number without the $ symbol. Enter "495" not "$495".',
      },
    ],
    relatedArticles: ['clone-advertiser-sheet', 'import-zoho-data', 'process-ad-proof'],
    keywords: ['add advertiser', 'new advertiser', 'manual entry', 'layout sheet', 'business', 'contact'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'process-ad-proof',
    title: 'How to process an ad proof',
    category: 'Advertisers',
    roles: ['va'],
    timeRequired: '10 minutes',
    summary: 'When a new ad file arrives (via Dropbox, email, or the ad-proofs queue), verify it against the layout sheet, update the design status, and route it to the designer or flag an issue.',
    steps: [
      {
        title: 'Check the incoming queue',
        description: 'Navigate to Advertisers → Ad Proofs. New proofs appear at the top with status "Incoming". You can also run the Dropbox scanner (see "How to run the Dropbox ad scanner") to pull in new files automatically.',
      },
      {
        title: 'Match to layout sheet record',
        description: 'Click on a proof to expand it. The system attempts to auto-match by filename to an advertiser in the current issue. If unmatched, use the search field to find the correct advertiser.',
      },
      {
        title: 'Verify the file',
        description: 'Open the file preview. Check: correct advertiser name or logo, correct ad size, no obvious resolution issues. If the file looks wrong, flag it and move to step 5.',
      },
      {
        title: 'Update design status',
        description: 'If the file is good, change design status from "DropBox" or "New" to "Received" and assign it to the appropriate designer. Add layout notes if the advertiser specified placement details.',
      },
      {
        title: 'Handle rejected proofs',
        description: 'If the file is wrong size, low resolution, or incorrect artwork: click "Flag Issue", select the reason, and the system drafts an email to the advertiser. Review and send. Status becomes "Revision Requested".',
      },
      {
        title: 'Mark complete',
        description: 'Once the designer confirms receipt, update status to "Sent to Designer". The layout sheet design status column updates automatically.',
      },
    ],
    whatHappensNext: 'The advertiser\'s design status updates on the layout sheet. If multiple proofs are outstanding, the layout sheet stats show how many ads still need artwork. On print deadline day, any "New" status is flagged in the Today screen as urgent.',
    commonErrors: [
      {
        error: 'Proof won\'t match to any advertiser',
        fix: 'Search by partial business name. If the advertiser isn\'t in the current issue yet, add them first (see "How to add a new advertiser") then return to match the proof.',
      },
      {
        error: 'File preview doesn\'t load',
        fix: 'Only PDF, JPG, PNG, and EPS files preview in-browser. For AI or InDesign files, download and open locally. Note the filename in the advertiser\'s layout notes.',
      },
    ],
    relatedArticles: ['add-new-advertiser', 'run-dropbox-scanner', 'clone-advertiser-sheet'],
    keywords: ['ad proof', 'proof', 'artwork', 'design', 'dropbox', 'designer', 'file', 'incoming', 'flag'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'import-zoho-data',
    title: 'How to import Zoho data',
    category: 'Advertisers',
    roles: ['publisher'],
    timeRequired: '15–30 minutes',
    summary: 'Import your full Zoho CRM advertiser export into the KeepSharing platform. The import creates or links businesses, creates contacts, and inserts advertiser records — fully idempotent so running it twice creates no duplicates.',
    steps: [
      {
        title: 'Export from Zoho CRM',
        description: 'In Zoho CRM, go to your Advertisers or Deals module. Click ··· → Export → Export Records → All fields → CSV format. Save the file to your computer.',
      },
      {
        title: 'Navigate to Import Data',
        description: 'In the KeepSharing sidebar, go to Advertisers → Import Data. The import page shows field mapping reference and accepted column names.',
      },
      {
        title: 'Upload the CSV',
        description: 'Drag and drop your Zoho CSV export onto the upload zone, or click to browse. The system parses the file immediately and shows a preview.',
      },
      {
        title: 'Review the preview',
        description: 'Check the parsed rows: business names, issues, sizes, and amounts should look correct. The total revenue shown at the top should match what you expect from Zoho. The preview does not write to the database yet.',
      },
      {
        title: 'Click "Import X records"',
        description: 'The import runs in chunks of 100 rows at a time. A progress bar shows the current chunk and total rows. For 3,000+ records, this takes about 10–15 minutes.',
      },
      {
        title: 'Review the results',
        description: 'When complete, results show: Imported (new records created), Businesses Created (new business entries), Already Existed (skipped duplicates), and Failed (rows with errors). Expand the row-by-row table to see exactly what happened.',
      },
      {
        title: 'Retry failed rows',
        description: 'If any rows failed, the "Retry N failed" button re-runs only those rows. This usually fixes transient database errors. After retry, review results again.',
      },
    ],
    whatHappensNext: 'All imported advertisers are available in the layout sheet, filtered by issue. The businesses table is populated for future auto-matching of new ads. GHL contacts are not created during import — use the advertiser intelligence module to sync specific contacts to GHL.',
    commonErrors: [
      {
        error: 'Import shows "0 imported" for all rows',
        fix: 'The Supabase schema must be set up first. Run the SQL migration files in /supabase/migrations in order (001 through current) in the Supabase SQL editor.',
      },
      {
        error: 'Business names imported as duplicates',
        fix: 'The system matches on exact name (case-insensitive). If Zoho has the same business under two slightly different names (e.g. "Baptist Health" vs "Baptist Health System"), one will create a new business. Use the Businesses admin to merge duplicates after import.',
      },
      {
        error: 'Issue column is blank — all records imported to wrong issue',
        fix: 'Zoho exports sometimes name this column differently. Check your CSV headers and compare to the "Supported Zoho column names" dropdown on the import page. The issue field must contain values like "RRP MAR26".',
      },
    ],
    relatedArticles: ['add-new-advertiser', 'clone-advertiser-sheet', 'run-dropbox-scanner'],
    keywords: ['import', 'zoho', 'csv', 'upload', 'batch', 'advertiser', 'bulk', 'migration', 'data'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'run-dropbox-scanner',
    title: 'How to run the Dropbox ad scanner',
    category: 'Distribution',
    roles: ['va'],
    timeRequired: '5 minutes',
    summary: 'The Dropbox scanner automatically detects new ad artwork files that advertisers have uploaded to the shared Dropbox folder and queues them for proof processing.',
    steps: [
      {
        title: 'Navigate to Dropbox Scan',
        description: 'Go to Ad Server → Dropbox Scan in the sidebar. The page shows the last scan timestamp and any files found in the previous scan.',
      },
      {
        title: 'Click "Run Scan"',
        description: 'The scanner connects to the configured Dropbox folder and lists all files modified since the last scan. This typically takes 10–30 seconds depending on folder size.',
      },
      {
        title: 'Review new files',
        description: 'Each new file shows the filename, file size, date modified, and an auto-match suggestion (the advertiser the system thinks this belongs to, based on filename similarity). Review the matches.',
      },
      {
        title: 'Confirm or correct matches',
        description: 'For correctly matched files, click "Confirm". For mis-matched files, use the dropdown to select the correct advertiser, then confirm. For unrecognized files (usually non-ad files), click "Ignore".',
      },
      {
        title: 'Send to proofs queue',
        description: 'Click "Process Confirmed Files" to send all confirmed matches to the Ad Proofs queue. They appear immediately in Advertisers → Ad Proofs for final review.',
      },
    ],
    whatHappensNext: 'Matched files appear in the Ad Proofs queue with status "Incoming" and the linked advertiser record. From there, follow the ad proof processing workflow to assign to a designer and update the layout sheet.',
    commonErrors: [
      {
        error: 'Scanner shows "Dropbox not connected"',
        fix: 'The Dropbox integration uses the DROPBOX_ACCESS_TOKEN environment variable. Verify it is set in .env.local and that the token has not expired. Dropbox long-lived tokens must be refreshed annually.',
      },
      {
        error: 'Files from weeks ago keep appearing in scans',
        fix: 'Files that were previously ignored still show up until they are confirmed or ignored in the UI. Process or ignore all pending files to clear the queue.',
      },
    ],
    relatedArticles: ['process-ad-proof', 'add-new-advertiser'],
    keywords: ['dropbox', 'scan', 'scanner', 'artwork', 'files', 'upload', 'ad proof', 'designer'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'use-editorial-board',
    title: 'How to use the editorial board',
    category: 'Content',
    roles: ['editor', 'publisher'],
    timeRequired: '10 minutes to learn, ongoing daily use',
    summary: 'The editorial board is the central planning tool for all content across River Region Parents and River Region Boom. Use it to plan, assign, track, and approve every article, feature, and department piece for the month.',
    steps: [
      {
        title: 'Select your publication and month',
        description: 'Navigate to Content → Editorial Board. Use the publication switcher (RRP or RRB) and month selector at the top. The board loads all content items for that issue.',
      },
      {
        title: 'Choose your view',
        description: 'Grid view shows a sortable table with all columns visible. Kanban view shows 7 status columns for drag-and-drop workflow. Department view groups items by section (School Bits, Health, etc.).',
      },
      {
        title: 'Add a new content item',
        description: 'Click "+ Add Item". The modal asks for: title, department, responsible person, due date, status, sponsor opportunity (optional), and notes. Save to add to the board.',
      },
      {
        title: 'Update status',
        description: 'Click the status badge on any item to advance it through the workflow: Idea → Assigned → In Progress → Draft Ready → Approved → Scheduled → Published. Each click cycles to the next status.',
      },
      {
        title: 'Approve an item and generate social captions',
        description: 'When status moves to "Approved", the system automatically calls Claude AI to generate a social media caption for the article. The caption appears in the item\'s expanded view. Review and edit before using.',
      },
      {
        title: 'Schedule an item',
        description: 'When moving to "Scheduled", you\'ll be prompted to set a publish date and time. Scheduled items are locked — status cannot be changed without providing a reason.',
      },
    ],
    whatHappensNext: 'Published items are marked in the record and excluded from active views. Approved items with social captions feed into the Social Queue. Items with sponsor opportunities are visible to the sales team. Submission form articles that were AI-generated appear pre-loaded as "Draft Ready".',
    commonErrors: [
      {
        error: 'AI caption generation fails with "API error"',
        fix: 'Verify ANTHROPIC_API_KEY is set in .env.local. The system uses claude-haiku for captions. Check the API key has active billing at console.anthropic.com.',
      },
      {
        error: '"Scheduled" items can\'t be edited',
        fix: 'Scheduled items are locked by design. To make changes: click the lock icon, enter a reason for the change, and the item unlocks for editing. This creates an audit trail.',
      },
    ],
    relatedArticles: ['approve-content-submission', 'clone-advertiser-sheet'],
    keywords: ['editorial', 'board', 'content', 'kanban', 'status', 'publish', 'schedule', 'department', 'article', 'planning'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'approve-content-submission',
    title: 'How to approve a content submission',
    category: 'Content',
    roles: ['editor', 'publisher'],
    timeRequired: '5 minutes per submission',
    summary: 'Reader submissions from the public forms (Second Act, Student Spotlight, etc.) arrive with AI-generated draft articles. Review, edit, approve, and the item drops into the editorial board as Draft Ready.',
    steps: [
      {
        title: 'Go to Submission Forms',
        description: 'Navigate to Content → Submission Forms. All form types are shown in a directory at the top. The list below shows all submissions, filterable by form type and status.',
      },
      {
        title: 'Open a pending submission',
        description: 'Click any row to expand it. You\'ll see: the original form data (name, answers, photo), the AI-generated draft article (first 400 characters), and the current status badge.',
      },
      {
        title: 'Review the AI article',
        description: 'The AI draft is based on the reader\'s answers. It\'s usually 85–90% publishable. Read for: accuracy to the reader\'s words, tone consistency with the publication, any hallucinated details (rare but check).',
      },
      {
        title: 'Click "View in Editorial Board"',
        description: 'This links to the editorial board item that was auto-created for this submission. From there you can edit the full article text, assign a department, and set a due date.',
      },
      {
        title: 'Update submission status',
        description: 'Change the submission status to "Reviewed" (you\'ve seen it), "Approved" (publish this), or "Rejected" (do not use). Rejected submissions stay in the database but don\'t appear in active queues.',
      },
      {
        title: 'For Ask the Doctor submissions',
        description: 'Go to Content → Ask the Doctor. Select one question monthly, change status to "Selected", then "Assigned to Doctor". Once the doctor replies, paste their answer and click "Generate Q&A Article with AI".',
      },
    ],
    whatHappensNext: 'Approved submissions create an editorial board item at Draft Ready status. The assigned editor then takes the piece through the remaining workflow (Approved → Scheduled → Published). The submitter is not automatically notified — send a personal email if you choose to inform them.',
    commonErrors: [
      {
        error: 'AI article field is blank for a submission',
        fix: 'AI generation runs asynchronously after submission. If blank, the generation may have timed out. Open the submission, click "Regenerate Article", and wait 15–20 seconds.',
      },
      {
        error: '"View in Editorial Board" link returns 404',
        fix: 'The editorial board item may not have been created (e.g., submission pre-dates the editorial board). Manually create an editorial board item and paste the article text.',
      },
    ],
    relatedArticles: ['use-editorial-board', 'clone-advertiser-sheet'],
    keywords: ['submission', 'approve', 'content', 'form', 'second act', 'student spotlight', 'ai article', 'draft', 'review'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'monthly-advertiser-report',
    title: 'How to generate a monthly advertiser report',
    category: 'Reports',
    roles: ['publisher'],
    timeRequired: '5 minutes',
    summary: 'Generate a monthly summary of advertiser activity — revenue, page count, design status breakdown, and key metrics — for your own records or to share with your team.',
    steps: [
      {
        title: 'Navigate to Advertiser Intelligence',
        description: 'Go to Advertisers → Intelligence in the sidebar. This section shows analytics and reporting tools for advertiser data.',
      },
      {
        title: 'Select the publication and issue',
        description: 'Use the dropdowns to select the publication (RRP, RRB, etc.) and the specific issue month (e.g., "RRP MAY26"). The report loads data for that issue.',
      },
      {
        title: 'Review the dashboard metrics',
        description: 'The report shows: total revenue, number of advertisers, total pages sold, breakdown by ad size, design status counts (New/Pick-up/DropBox), and stage distribution (Closed Won/Verbal/etc.).',
      },
      {
        title: 'Review advertiser-by-advertiser detail',
        description: 'Scroll down to the detailed table. Each row shows business name, contact, ad size, amount, stage, and design status. Sort by any column.',
      },
      {
        title: 'Export the report',
        description: 'Click "Export CSV" to download the full issue data as a spreadsheet. Click "Print" to generate a print-formatted version suitable for a PDF. The print view uses CSS print styles for clean formatting.',
      },
    ],
    whatHappensNext: 'Reports are for reference only — they don\'t change any records. Export data can be imported into accounting software or shared with your bookkeeper. Month-over-month trend data becomes available after two months of imports.',
    commonErrors: [
      {
        error: 'Revenue total doesn\'t match expectations',
        fix: 'Check if any records have $0 amounts (common for complimentary ads or records added without amounts). Filter by invoiceType = "Invoice" to see only billable revenue.',
      },
      {
        error: 'Export CSV is empty',
        fix: 'The current issue must have advertiser records loaded. Navigate to Layout Sheet → select the issue → confirm records appear, then return to Intelligence and re-run.',
      },
    ],
    relatedArticles: ['clone-advertiser-sheet', 'add-new-advertiser', 'import-zoho-data'],
    keywords: ['report', 'analytics', 'revenue', 'monthly report', 'export', 'metrics', 'intelligence', 'summary'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'onboard-new-publisher',
    title: 'How to onboard a new publisher',
    category: 'Settings',
    roles: ['publisher'],
    timeRequired: '45 minutes',
    summary: 'Add a new publisher sub-account to the KeepSharing platform — connecting their GHL sub-account, configuring their publication entry, and getting them set up to manage their own market.',
    steps: [
      {
        title: 'Create a GHL sub-account',
        description: 'Log into the GHL Agency account. Create a new sub-account (Location) for the publisher\'s market. Note the Location ID from Settings → Business Info → Location ID.',
      },
      {
        title: 'Add the Location ID to environment variables',
        description: 'Open .env.local. Add a new line: GHL_LOCATION_ID_[ABBREV]=[location_id]. Example: GHL_LOCATION_ID_HBP=abc123xyz. Restart the dev server to pick up the change.',
      },
      {
        title: 'Add the publication to the sidebar',
        description: 'Open src/components/Sidebar.tsx. Add the new publication to the PUBLICATIONS array at the top with abbrev, name, market, state, and color fields.',
      },
      {
        title: 'Add the publication to the Supabase publications table',
        description: 'In Supabase SQL editor, run: INSERT INTO publications (abbrev, name, market, state, skin) VALUES (\'HBP\', \'Huntsville Parents\', \'Huntsville\', \'AL\', \'parenting\');',
      },
      {
        title: 'Seed initial data',
        description: 'Run a Zoho import for the new publisher\'s existing advertiser data (see "How to import Zoho data"). This populates their layout sheet and businesses table.',
      },
      {
        title: 'Invite publisher to platform',
        description: 'Share the admin URL and credentials. Walk them through the Today screen, layout sheet, and content calendar. Point them to the Help center for self-serve training.',
      },
    ],
    whatHappensNext: 'The new publisher can log in and see their publication in the sidebar switcher. Their layout sheet and content calendar are ready to use. GHL automations for their sub-account will fire when advertisers sign agreements or book self-serve.',
    commonErrors: [
      {
        error: 'New publication doesn\'t appear in sidebar',
        fix: 'Verify the PUBLICATIONS array in Sidebar.tsx was saved and the dev server restarted. In production, a deployment is required.',
      },
      {
        error: 'GHL webhook fires to wrong location',
        fix: 'Check that getLocationId() in src/lib/ghl.ts correctly maps the publication abbreviation. The LOCATION_IDS map uses the uppercase abbrev as the key.',
      },
    ],
    relatedArticles: ['launch-new-market', 'import-zoho-data'],
    keywords: ['onboard', 'publisher', 'new market', 'setup', 'ghl', 'location', 'publication', 'sub-account', 'configure'],
  },

  // ────────────────────────────────────────────────────────────────────────────
  {
    id: 'launch-new-market',
    title: 'How to launch a new market',
    category: 'Getting Started',
    roles: ['publisher'],
    timeRequired: '2–4 weeks',
    summary: 'End-to-end checklist for launching a new KeepSharing publication in a new city — from market research through first issue live.',
    steps: [
      {
        title: 'Define the market',
        description: 'Confirm city, publication name, abbreviation (3–4 letters), and target demographic. For Parents publications: families with children under 18. For Boom: adults 50+. Document the key ZIP codes for neighborhood personalization.',
      },
      {
        title: 'Onboard the publisher',
        description: 'Complete the publisher onboarding (see "How to onboard a new publisher") — GHL sub-account, Location ID, publication entry in sidebar and Supabase.',
      },
      {
        title: 'Set up the self-serve advertiser page',
        description: 'The /advertise page currently serves RRP. For a new market, create a new route (e.g., /advertise/huntsville) that passes the correct publication context to CampaignBuilder and AdBookingPublic components.',
      },
      {
        title: 'Import or build initial advertiser list',
        description: 'If the publisher has an existing advertiser list from a previous system, import via the Zoho importer. If starting fresh, the publisher manually adds advertisers as they sign contracts.',
      },
      {
        title: 'Configure the content calendar',
        description: 'Navigate to Content → Content Calendar. Add the recurring annual content items for the new publication (Back to School guide, Summer Fun Guide, Holiday Guide, etc.). Set responsible parties.',
      },
      {
        title: 'Set up neighborhood personalization',
        description: 'Add ZIP codes for the new market\'s neighborhoods to src/lib/neighborhood.ts (or a market-specific version). Update the neighborhood detection API route to include the new ZIP ranges.',
      },
      {
        title: 'Soft launch and first issue',
        description: 'Run a soft launch with the publisher to verify all workflows work end-to-end: add advertiser → generate agreement → sign → GHL fires → layout sheet shows record → editorial board has content → publish.',
      },
    ],
    whatHappensNext: 'The new market is live in the platform. The publisher manages their own advertisers, content, and agreements from the same admin interface. KeepSharing receives a revenue share from ad sales tracked through the platform.',
    commonErrors: [
      {
        error: 'New market advertisers appear in other markets\' layout sheets',
        fix: 'Every advertiser record must have a publication_id set correctly. The import tool uses pubAbbrev to look up the publication ID. Verify the new publication exists in the Supabase publications table before importing.',
      },
      {
        error: 'Self-serve booking for new market routes to wrong GHL location',
        fix: 'The /advertise/campaign route hardcodes publication: \'RRP\' in its metadata. For new markets, pass the publication through URL params or a new route-level component.',
      },
    ],
    relatedArticles: ['onboard-new-publisher', 'import-zoho-data', 'add-new-advertiser'],
    keywords: ['launch', 'new market', 'city', 'publication', 'setup', 'checklist', 'getting started', 'first issue'],
  },
]

// ── Helpers ───────────────────────────────────────────────────────────────────

export function searchArticles(query: string): KBArticle[] {
  if (!query.trim()) return KB_ARTICLES
  const q = query.toLowerCase()
  return KB_ARTICLES.filter(a =>
    a.title.toLowerCase().includes(q) ||
    a.summary.toLowerCase().includes(q) ||
    a.keywords.some(k => k.includes(q)) ||
    a.steps.some(s => s.title.toLowerCase().includes(q) || s.description.toLowerCase().includes(q))
  )
}

export function getArticle(id: string): KBArticle | undefined {
  return KB_ARTICLES.find(a => a.id === id)
}

export function getArticlesByCategory(category: string): KBArticle[] {
  return KB_ARTICLES.filter(a => a.category === category)
}

export function buildKBContext(): string {
  return KB_ARTICLES.map(a => `
## ${a.title}
Category: ${a.category} | Roles: ${a.roles.join(', ')} | Time: ${a.timeRequired}

${a.summary}

Steps:
${a.steps.map((s, i) => `${i + 1}. ${s.title}: ${s.description}`).join('\n')}

What happens next: ${a.whatHappensNext}

Common errors:
${a.commonErrors.map(e => `- "${e.error}" → ${e.fix}`).join('\n')}
`).join('\n---\n')
}
