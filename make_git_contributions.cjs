const fs = require('fs');
const path = require('path');
const git = require('isomorphic-git');

const dir = path.resolve(__dirname);

// Configure Author Details
const author = {
  name: 'Ranveer Amilkanthwar',
  email: 'ranveeramilkanthwar@gmail.com',
};

// Logical sequence of atomic commits file-by-file and folder-by-folder
const commitSteps = [
  {
    message: 'chore: initialize repository and core configuration (package.json, tsconfig.json, vite.config.ts)',
    files: ['package.json', 'package-lock.json', 'tsconfig.json', 'vite.config.ts', '.gitignore'],
  },
  {
    message: 'docs: add architecture specifications, CA blueprints, and implementation documentation',
    files: [
      'Personal_Wealth_OS_Enterprise_Specification_and_Implementation_Plan.docx',
      'WealthOS_v4_Child_Simple_Aesthetic_UI_UX_and_CA_Master_Blueprint.docx',
      'WealthOS v5.0_ Easy-Going, Senior & Child-Friendly Aesthetic UI_UX Documentation.docx',
      'extracted_spec.txt',
      'extracted_v4_doc.txt',
      'extracted_v5_doc.txt',
      'TICK_TRACKER_IMPLEMENTATION_PLAN.md',
    ],
  },
  {
    message: 'feat(engine): double-entry core types, chart of accounts, and micro-unit definitions',
    files: [
      'core/financial-engine/types.ts',
      'core/financial-engine/microUnits.ts',
      'core/financial-engine/sampleData.ts',
    ],
  },
  {
    message: 'feat(engine): double-entry ledger implementation and invariant integrity validation',
    files: [
      'core/financial-engine/doubleEntryLedger.ts',
    ],
  },
  {
    message: 'feat(engine): transaction processing engine with CapEx, splits, and multi-currency support',
    files: [
      'core/financial-engine/transactionProcessingEngine.ts',
      'core/financial-engine/capexEngine.ts',
    ],
  },
  {
    message: 'feat(engine): tax engine with STCG/LTCG FIFO lot tracking and old vs new regime comparator',
    files: [
      'core/financial-engine/analyticsAndTaxEngine.ts',
      'core/financial-engine/debtEngine.ts',
    ],
  },
  {
    message: 'feat(engine): Safe-to-Spend dynamic liquidity engine and daily allowance calculator',
    files: [
      'core/financial-engine/budgetEngine.ts',
      'core/financial-engine/audioSpeechEngine.ts',
    ],
  },
  {
    message: 'feat(engine): persistent storage layer with per-user isolation, Excel/Google Sheets sync, and theme preferences',
    files: [
      'core/financial-engine/storage.ts',
      'core/sheets/userSheetSync.ts',
    ],
  },
  {
    message: 'feat(auth): persistent IndexedDB user database and authentication engine',
    files: [
      'core/auth/userDatabase.ts',
      'core/auth/authEngine.ts',
    ],
  },
  {
    message: 'feat(ui): base HTML entry point and global design system styles with glassmorphic tokens',
    files: [
      'index.html',
      'src/index.css',
      'src/main.tsx',
    ],
  },
  {
    message: 'feat(ui): responsive navigation header with profile trigger, theme toggle, and privacy mode',
    files: [
      'src/components/Header.tsx',
      'src/components/CommandBar.tsx',
    ],
  },
  {
    message: 'feat(ui): interactive onboarding modals and initial cash/bank balance setup',
    files: [
      'src/components/InitialSetupModal.tsx',
      'src/components/AddTransactionModal.tsx',
    ],
  },
  {
    message: 'feat(ui): SimpleHomeView senior & kid-friendly pouches and 10-second undo bar',
    files: [
      'src/components/SimpleHomeView.tsx',
      'src/components/SeniorChildEasyView.tsx',
    ],
  },
  {
    message: 'feat(ui): Zen Bento mode with Safe-to-Spend liquid orb, 72h impulse vault, and Finny mascot',
    files: [
      'src/components/ZenBentoView.tsx',
      'src/components/DashboardView.tsx',
    ],
  },
  {
    message: 'feat(ui): CA Pro Terminal with chart of accounts, double-entry journal, and ledger reports',
    files: [
      'src/components/LedgerView.tsx',
      'src/components/AccountsView.tsx',
    ],
  },
  {
    message: 'feat(ui): CapEx asset registry with depreciation schedules and debt optimizer',
    files: [
      'src/components/CapexView.tsx',
      'src/components/DebtOptimizerView.tsx',
      'src/components/SplitwiseGraphView.tsx',
    ],
  },
  {
    message: 'feat(ui): automated SMS/statement ingestion and CA tax audit export package',
    files: [
      'src/components/IngestionView.tsx',
      'src/components/TaxAndExportView.tsx',
      'src/components/TickPocketView.tsx',
    ],
  },
  {
    message: 'feat(ui): cinematic animated welcome intro with floating particles and coin animation',
    files: [
      'src/components/AnimatedIntro.tsx',
    ],
  },
  {
    message: 'feat(ui): user profile hub with editable starting balances, transactions editor, and transparent glass themes',
    files: [
      'src/components/UserProfileModal.tsx',
    ],
  },
  {
    message: 'feat(ui): user Google Sheet and Excel link connection prompt and auto-sync integration',
    files: [
      'src/components/UserSheetModal.tsx',
      'src/components/AuthScreen.tsx',
      'src/App.tsx',
    ],
  },
  {
    message: 'test: automated test suites for double-entry invariants, tax lots, and user data isolation',
    files: [
      'tests/checkpoint1.test.ts',
      'tests/checkpoint2.test.ts',
      'tests/checkpoint3.test.ts',
      'tests/checkpoint4.test.ts',
      'tests/checkpoint5.test.ts',
      'tests/checkpoint6.test.ts',
      'tests/checkpoint7.test.ts',
      'tests/checkpoint8.test.ts',
      'tests/auth_and_sheet_sync.test.ts',
    ],
  },
  {
    message: 'deploy: continuous deployment configuration for Vercel and Netlify 24/7 hosting',
    files: [
      'vercel.json',
      'netlify.toml',
      'WealthOS_Engine_ui_ux_prototype_index.html',
      'tick_expense_app.html',
    ],
  },
];

async function run() {
  console.log('🚀 Initializing Git repository...');
  await git.init({ fs, dir });

  // Add default branch main
  try {
    await git.branch({ fs, dir, ref: 'main', checkout: true });
  } catch (e) {
    // Branch may already exist
  }

  console.log('📦 Starting atomic commit sequence (folder by folder, file by file)...');

  for (let i = 0; i < commitSteps.length; i++) {
    const step = commitSteps[i];
    const existingFiles = [];

    for (const f of step.files) {
      const fullPath = path.join(dir, f);
      if (fs.existsSync(fullPath)) {
        await git.add({ fs, dir, filepath: f.replace(/\\/g, '/') });
        existingFiles.push(f);
      }
    }

    if (existingFiles.length === 0) {
      console.log(`⚠️ Step ${i + 1}: No files matched for "${step.message}". Skipping.`);
      continue;
    }

    // Stagger timestamp slightly for clear contribution timeline
    const commitDate = new Date(Date.now() - (commitSteps.length - i) * 60000);

    const sha = await git.commit({
      fs,
      dir,
      message: step.message,
      author: {
        name: author.name,
        email: author.email,
        timestamp: Math.floor(commitDate.getTime() / 1000),
      },
    });

    console.log(`✅ [${i + 1}/${commitSteps.length}] ${sha.slice(0, 7)}: ${step.message} (${existingFiles.length} files)`);
  }

  // Check remaining unstaged files
  const statusMatrix = await git.statusMatrix({ fs, dir });
  const uncommitted = statusMatrix.filter((row) => row[1] !== row[2] || row[2] !== row[3]);

  if (uncommitted.length > 0) {
    console.log(`ℹ️ Committing ${uncommitted.length} remaining project files...`);
    for (const [filepath] of uncommitted) {
      await git.add({ fs, dir, filepath });
    }
    const finalSha = await git.commit({
      fs,
      dir,
      message: 'chore(release): complete WealthOS v6.0 enterprise distribution bundle',
      author: {
        name: author.name,
        email: author.email,
      },
    });
    console.log(`✅ Final release commit: ${finalSha.slice(0, 7)}`);
  }

  const logs = await git.log({ fs, dir, depth: 30 });
  console.log(`\n🎉 Completed! Total commits created: ${logs.length}`);
  console.log('\n--- Recent Commit History ---');
  logs.slice(0, 10).forEach((c, idx) => {
    console.log(`${idx + 1}. [${c.oid.slice(0, 7)}] ${c.commit.message.split('\n')[0]} (${c.commit.author.name})`);
  });
}

run().catch((err) => {
  console.error('Error during git contribution generation:', err);
  process.exit(1);
});
