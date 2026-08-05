import { ExportService } from '../src/services/export.service';
import { prisma } from '../src/config/db';

async function testExports() {
  console.log('🚀 Testing ExportService PDF & DOCX Buffer Generation...\n');

  try {
    const testDoc = await prisma.studioDocument.findFirst();
    if (!testDoc) {
      console.error('❌ No StudioDocument found in database to test.');
      process.exit(1);
    }

    console.log(`📄 Testing PDF export for document "${testDoc.title}" (${testDoc.id})...`);
    const pdfBuffer = await ExportService.generatePdf(testDoc);
    console.log(`✅ PDF Generated Successfully! Buffer size: ${pdfBuffer.length} bytes`);

    console.log(`\n📝 Testing DOCX export for document "${testDoc.title}" (${testDoc.id})...`);
    const docxBuffer = await ExportService.generateDocx(testDoc);
    console.log(`✅ DOCX Generated Successfully! Buffer size: ${docxBuffer.length} bytes`);

    console.log('\n🎉 ALL EXPORT GENERATION TESTS PASSED CLEANLY!\n');
  } catch (error: any) {
    console.error('\n❌ Export Generation Test Failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testExports();
