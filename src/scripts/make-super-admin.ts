import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

type Role = 'ADMIN' | 'SUPER_ADMIN'

function usageAndExit(message?: string): never {
  if (message) console.error(message)
  console.error(
    [
      '',
      'Usage:',
      '  npm run make-super-admin -- --email you@example.com [--role SUPER_ADMIN|ADMIN] [--dry-run]',
      '',
      'Env:',
      '  DATABASE_URL must be set',
      '',
    ].join('\n'),
  )
  process.exit(1)
}

function parseArgs(argv: string[]) {
  const args = new Map<string, string | true>()
  for (let i = 0; i < argv.length; i++) {
    const tok = argv[i]
    if (!tok.startsWith('--')) continue
    const key = tok.slice(2)
    const next = argv[i + 1]
    if (!next || next.startsWith('--')) {
      args.set(key, true)
      continue
    }
    args.set(key, next)
    i++
  }

  const emailRaw = args.get('email')
  const roleRaw = args.get('role')
  const dryRun = args.get('dry-run') === true

  if (typeof emailRaw !== 'string' || !emailRaw.trim()) {
    usageAndExit('Missing required argument: --email')
  }

  const email = emailRaw.trim().toLowerCase()

  let role: Role = 'SUPER_ADMIN'
  if (typeof roleRaw === 'string') {
    const r = roleRaw.trim().toUpperCase()
    if (r !== 'ADMIN' && r !== 'SUPER_ADMIN') {
      usageAndExit('Invalid --role. Use ADMIN or SUPER_ADMIN.')
    }
    role = r
  }

  return { email, role, dryRun }
}

async function main(): Promise<void> {
  const { email, role, dryRun } = parseArgs(process.argv.slice(2))

  const url = process.env.DATABASE_URL
  if (!url) usageAndExit('DATABASE_URL is not set.')

  const adapter = new PrismaPg({ connectionString: url })
  const prisma = new PrismaClient({ adapter })

  try {
    const existing = await prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, role: true },
    })

    if (!existing) {
      console.error(`User not found for email: ${email}`)
      process.exitCode = 2
      return
    }

    if (existing.role === role) {
      console.log(`No change: ${existing.email} is already ${role}`)
      return
    }

    if (dryRun) {
      console.log(
        `Dry run: would update ${existing.email} (${existing.id}) role ${existing.role} -> ${role}`,
      )
      return
    }

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: { role },
      select: { id: true, email: true, role: true },
    })

    console.log(`Updated: ${updated.email} (${updated.id}) is now ${updated.role}`)
  } finally {
    await prisma.$disconnect().catch(() => undefined)
  }
}

void main().catch((err: unknown) => {
  console.error('Failed to update role.')
  console.error(err)
  process.exit(1)
})

