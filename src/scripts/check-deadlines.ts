import { prisma } from '../config/db';
async function runCheck() {
  try {
    const now = new Date();
    const opps = await prisma.opportunity.findMany({
      where: {
        status: 'ACTIVE',
      },
      select: {
        title: true,
        organisation: true,
        deadline: true,
      }
    });
    console.log('Total ACTIVE Opportunities:', opps.length);
    const expired = opps.filter(o => o.deadline && o.deadline < now);
    const active = opps.filter(o => !o.deadline || o.deadline >= now);
    console.log('Expired (deadline < now):', expired.length);
    console.log('Active (deadline >= now or no deadline):', active.length);
    console.log('Active details:', active.map(o => ({
      title: o.title,
      deadline: o.deadline ? o.deadline.toISOString() : 'No deadline'
    })));
  } catch (err: any) {
    console.error('Error querying DB:', err.message);
  } finally {
    await prisma.$disconnect();
  }
}
runCheck();
