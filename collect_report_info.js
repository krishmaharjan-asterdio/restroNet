const readline = require('readline');
const fs = require('fs');
const path = require('path');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const ask = (question) =>
  new Promise((resolve) => rl.question(question, (ans) => resolve(ans.trim())));

const askList = async (prompt) => {
  console.log(prompt);
  console.log('  (Enter items one by one. Type "done" when finished.)');
  const items = [];
  let i = 1;
  while (true) {
    const item = await ask(`  ${i}. `);
    if (item.toLowerCase() === 'done') break;
    if (item) { items.push(item); i++; }
  }
  return items;
};

const header = (text) => {
  const line = '─'.repeat(60);
  console.log(`\n${line}`);
  console.log(`  ${text}`);
  console.log(`${line}`);
};

const main = async () => {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║       BCA Final Year Project Report — Info Collector       ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('\nAnswer each question. Press Enter to submit each response.\n');

  const data = {};

  // ── 1. Project Title ─────────────────────────────────────────────────────
  header('1 / 21  •  Project Title');
  data.projectTitle = await ask('› ');

  // ── 2. Project Description ───────────────────────────────────────────────
  header('2 / 21  •  Project Description');
  console.log('  (2–3 sentences about what the project does)');
  data.projectDescription = await ask('› ');

  // ── 3. Problem Statement ─────────────────────────────────────────────────
  header('3 / 21  •  Problem Statement');
  console.log('  (What real-world problem does this project solve?)');
  data.problemStatement = await ask('› ');

  // ── 4. Project Objectives ────────────────────────────────────────────────
  header('4 / 21  •  Project Objectives');
  data.objectives = await askList('  List the project objectives:');

  // ── 5. Frontend Tech Stack ───────────────────────────────────────────────
  header('5 / 21  •  Tech Stack — Frontend');
  data.techStack = {};
  data.techStack.frontend = await askList('  List all frontend technologies/libraries used:');

  // ── 6. Backend Tech Stack ────────────────────────────────────────────────
  header('6 / 21  •  Tech Stack — Backend');
  data.techStack.backend = await askList('  List all backend technologies/frameworks used:');

  // ── 7. Database ──────────────────────────────────────────────────────────
  header('7 / 21  •  Tech Stack — Database');
  data.techStack.database = await ask('› Database used: ');

  // ── 8. Key Features / Modules ────────────────────────────────────────────
  header('8 / 21  •  Key Features / Modules');
  data.keyFeatures = await askList('  List all key features or modules of the system:');

  // ── 9. Algorithm(s) Used ─────────────────────────────────────────────────
  header('9 / 21  •  Algorithms Used');
  data.algorithms = await askList(
    '  List algorithms used and a brief description\n  (format: "Algorithm name — brief description"):',
  );

  // ── 10. Team Member 1 — Name ─────────────────────────────────────────────
  header('10 / 21  •  Team Member 1 — Full Name');
  data.team = [];
  const m1name = await ask('› Full name: ');

  // ── 11. Team Member 1 — TU Reg ───────────────────────────────────────────
  header('11 / 21  •  Team Member 1 — TU Registration Number');
  const m1reg = await ask('› TU Reg. No.: ');
  data.team.push({ name: m1name, tuRegNo: m1reg });

  // ── 12. Team Member 2 — Name ─────────────────────────────────────────────
  header('12 / 21  •  Team Member 2 — Full Name');
  console.log('  (Type "none" if this is a solo project)');
  const m2name = await ask('› Full name: ');

  // ── 13. Team Member 2 — TU Reg ───────────────────────────────────────────
  header('13 / 21  •  Team Member 2 — TU Registration Number');
  console.log('  (Type "none" if solo)');
  const m2reg = await ask('› TU Reg. No.: ');
  if (m2name.toLowerCase() !== 'none') {
    data.team.push({ name: m2name, tuRegNo: m2reg });
  }

  // ── 14. Supervisor ───────────────────────────────────────────────────────
  header('14 / 21  •  Supervisor Full Name with Title');
  console.log('  (e.g. Mr. Ram Prasad Shrestha / Dr. Sita Kumari Thapa)');
  data.supervisor = await ask('› ');

  // ── 15. College Name ─────────────────────────────────────────────────────
  header('15 / 21  •  College Name');
  data.college = await ask('› ');

  // ── 16. Department Name ──────────────────────────────────────────────────
  header('16 / 21  •  Department Name');
  data.department = await ask('› ');

  // ── 17. Development Methodology ──────────────────────────────────────────
  header('17 / 21  •  Development Methodology');
  console.log('  (e.g. Agile, Waterfall, Iterative, Spiral)');
  data.methodology = await ask('› ');

  // ── 18. Scope ────────────────────────────────────────────────────────────
  header('18 / 21  •  Scope of the Project');
  console.log('  (What is included in the system? What boundaries exist?)');
  data.scope = await ask('› ');

  // ── 19. Limitations ──────────────────────────────────────────────────────
  header('19 / 21  •  Limitations');
  data.limitations = await askList('  List the known limitations of the project:');

  // ── 20. Conclusion ───────────────────────────────────────────────────────
  header('20 / 21  •  Conclusion');
  console.log('  (2–3 sentences summarizing what was achieved)');
  data.conclusion = await ask('› ');

  // ── 21. Future Recommendations ───────────────────────────────────────────
  header('21 / 21  •  Future Recommendations');
  data.futureRecommendations = await askList('  List recommended future enhancements:');

  rl.close();

  // ── Save to JSON ──────────────────────────────────────────────────────────
  const outputPath = path.join(__dirname, 'project_info.json');
  fs.writeFileSync(outputPath, JSON.stringify(data, null, 2), 'utf-8');

  // ── Print Summary ─────────────────────────────────────────────────────────
  const line = '═'.repeat(60);
  console.log(`\n${line}`);
  console.log('  ✅  All responses saved to project_info.json');
  console.log(`${line}\n`);

  console.log(`  📌  Project Title   : ${data.projectTitle}`);
  console.log(`  🎓  College         : ${data.college}`);
  console.log(`  🏢  Department      : ${data.department}`);
  console.log(`  👤  Supervisor      : ${data.supervisor}`);
  console.log(`  👥  Team Members    :`);
  data.team.forEach((m, i) => {
    console.log(`       ${i + 1}. ${m.name}  (${m.tuRegNo})`);
  });
  console.log(`  🗄️   Database        : ${data.techStack.database}`);
  console.log(`  ⚙️   Methodology     : ${data.methodology}`);
  console.log(`\n  🔑  Key Features (${data.keyFeatures.length}):`);
  data.keyFeatures.forEach((f, i) => console.log(`       ${i + 1}. ${f}`));
  console.log(`\n  🎯  Objectives (${data.objectives.length}):`);
  data.objectives.forEach((o, i) => console.log(`       ${i + 1}. ${o}`));
  console.log(`\n  🔮  Future Enhancements (${data.futureRecommendations.length}):`);
  data.futureRecommendations.forEach((r, i) => console.log(`       ${i + 1}. ${r}`));
  console.log(`\n${line}`);
  console.log(`  File saved at: ${outputPath}`);
  console.log(`${line}\n`);
};

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
