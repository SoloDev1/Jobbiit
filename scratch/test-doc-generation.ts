import { DocumentService } from '../src/services/document.service';
import { prisma } from '../src/config/db';

async function main() {
  console.log('🚀 Starting OpporHub Automated Document Generation Test...\n');

  try {
    // 1. Find or create a test user
    let testUser = await prisma.user.findFirst();
    if (!testUser) {
      console.log('Creating mock test user in database...');
      testUser = await prisma.user.create({
        data: {
          email: 'test_generator@opporhub.com',
          passwordHash: '$2b$10$e7K513iQk0nL0wR.31O4zeoH.f3M1g7M3J4k6L7N8P9Q0R1S2T3U4',
          role: 'MEMBER',
          isActive: true,
          isVerified: true,
        },
      });
    }

    console.log(`✅ Using Test User ID: ${testUser.id} (${testUser.email})`);

    // 2. Test Resume Generation
    console.log('\n📄 [1/2] Testing RESUME Generation with Opportunity Context...');
    const resumeDoc = await DocumentService.generateDocument(
      testUser.id,
      'RESUME',
      {
        targetTitle: 'Senior Full-Stack Engineer',
        yearsExperience: '6 years',
        keySkills: 'TypeScript, React Native, Node.js, GraphQL, PostgreSQL, AWS',
        workHistory: 'Lead Developer at WebTech Corp. Scaled microservices to 1M users.',
        education: 'BSc Computer Science, MIT (2020)',
      },
      'We are looking for a Senior Full-Stack Engineer skilled in TypeScript, React Native, and AWS cloud architecture to build high-performance mobile applications.'
    );

    const resumeSections = (resumeDoc.sections as any[]) || [];
    console.log('✅ RESUME Generated Successfully!');
    console.log(`   - Document ID: ${resumeDoc.id}`);
    console.log(`   - Title: "${resumeDoc.title}"`);
    console.log(`   - Section Count: ${resumeSections.length}`);
    resumeSections.forEach((sec: any, idx: number) => {
      console.log(`     ${idx + 1}. [${sec.title}] (${Array.isArray(sec.content) ? sec.content.length + ' items' : (sec.content || '').length + ' chars'})`);
    });

    // 3. Test SOP Generation
    console.log('\n🎓 [2/2] Testing SOP Generation for University Admission...');
    const sopDoc = await DocumentService.generateDocument(
      testUser.id,
      'SOP',
      {
        targetTitle: 'MSc Artificial Intelligence, ETH Zürich',
        researchInterests: 'Reinforcement Learning & Multi-Agent Systems',
        academicBackground: 'BSc Computer Science with First Class Honors',
        careerGoals: 'Lead AI Safety & System Research at European AI Labs',
      },
      'ETH Zürich MSc AI admission guidelines: Require strong background in algorithms, machine learning, and statement of research purpose.'
    );

    const sopSections = (sopDoc.sections as any[]) || [];
    console.log('✅ SOP Generated Successfully!');
    console.log(`   - Document ID: ${sopDoc.id}`);
    console.log(`   - Title: "${sopDoc.title}"`);
    console.log(`   - Section Count: ${sopSections.length}`);
    sopSections.forEach((sec: any, idx: number) => {
      console.log(`     ${idx + 1}. [${sec.title}] (${(sec.content || '').length} chars)`);
    });

    console.log('\n🎉 ALL DOCUMENT GENERATION TESTS PASSED CLEANLY!\n');
  } catch (error: any) {
    console.error('\n❌ Document Generation Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
