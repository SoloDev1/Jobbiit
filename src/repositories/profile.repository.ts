import { prisma } from '../config/db';
import type { Prisma } from '@prisma/client';
import type {
  CreateProfileInput,
  UpdateProfileInput,
  AddExperienceInput,
  AddEducationInput,
} from '../schemas/profile.schema';

const fullInclude = {
  experiences: { orderBy: { startDate: 'desc' as const } },
  educations:  { orderBy: { startDate: 'desc' as const } },
  skills:      { include: { skill: true } },
} satisfies Prisma.ProfileInclude;

type ProfileWithRelations = Prisma.ProfileGetPayload<{ include: typeof fullInclude }>;

export type PublicProfile = Omit<ProfileWithRelations, 'skills'> & {
  skills: { id: string; name: string }[];
};

function mapProfile(profile: ProfileWithRelations): PublicProfile {
  const { skills, ...rest } = profile;
  return {
    ...rest,
    skills: skills.map((ps) => ({ id: ps.skill.id, name: ps.skill.name })),
  };
}

export class ProfileRepository {
  /**
   * Finds profile by user ID.
   */
  public async findByUserId(userId: string): Promise<PublicProfile | null> {
    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: fullInclude,
    });
    if (!profile) return null;
    return mapProfile(profile);
  }

  /**
   * Finds profile ID by user ID.
   */
  public async findIdByUserId(userId: string): Promise<string | null> {
    const row = await prisma.profile.findUnique({
      where: { userId },
      select: { id: true },
    });
    return row?.id ?? null;
  }

  /**
   * Creates a new profile.
   */
  public async create(userId: string, data: CreateProfileInput): Promise<PublicProfile> {
    const website = data.website === undefined || data.website === '' ? null : data.website;
    const profile = await prisma.profile.create({
      data: {
        userId,
        firstName: data.firstName,
        lastName: data.lastName,
        headline: data.headline,
        bio: data.bio ?? null,
        location: data.location ?? null,
        website,
      },
      include: fullInclude,
    });
    return mapProfile(profile);
  }

  /**
   * Updates an existing profile.
   */
  public async update(userId: string, data: UpdateProfileInput): Promise<PublicProfile | null> {
    const exists = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (!exists) return null;

    const patch: Prisma.ProfileUpdateInput = {};
    if (data.firstName !== undefined) patch.firstName = data.firstName;
    if (data.lastName !== undefined) patch.lastName = data.lastName;
    if (data.headline !== undefined) patch.headline = data.headline;
    if (data.bio !== undefined) patch.bio = data.bio;
    if (data.location !== undefined) patch.location = data.location;
    if (data.website !== undefined) {
      patch.website = data.website === '' ? null : data.website;
    }

    const profile = await prisma.profile.update({
      where: { userId },
      data: patch,
      include: fullInclude,
    });
    return mapProfile(profile);
  }

  /**
   * Adds an experience item.
   */
  public async addExperience(profileId: string, data: AddExperienceInput): Promise<{ id: string }> {
    return prisma.experience.create({
      data: {
        profileId,
        title: data.title,
        company: data.company,
        startDate: data.startDate,
        endDate: data.current ? null : data.endDate!,
        description: data.description ?? null,
      },
      select: { id: true },
    });
  }

  /**
   * Deletes an experience item.
   */
  public async deleteExperience(id: string, profileId: string): Promise<boolean> {
    const result = await prisma.experience.deleteMany({
      where: { id, profileId },
    });
    return result.count > 0;
  }

  /**
   * Adds an education item.
   */
  public async addEducation(profileId: string, data: AddEducationInput) {
    const startDate = new Date(Date.UTC(data.startYear, 0, 1));
    const endDate = data.endYear !== undefined ? new Date(Date.UTC(data.endYear, 11, 31)) : null;

    return prisma.education.create({
      data: {
        profileId,
        school: data.school,
        degree: data.degree ?? null,
        field: data.field ?? null,
        startDate,
        endDate,
        description: null,
      },
      select: {
        id: true,
        profileId: true,
        school: true,
        degree: true,
        field: true,
        startDate: true,
        endDate: true,
        description: true,
        createdAt: true,
      },
    });
  }

  /**
   * Deletes an education item.
   */
  public async deleteEducation(id: string, profileId: string): Promise<boolean> {
    const result = await prisma.education.deleteMany({
      where: { id, profileId },
    });
    return result.count > 0;
  }

  /**
   * Sets skills for a profile.
   */
  public async setSkills(profileId: string, skillNames: string[]): Promise<void> {
    const normalized = [...new Set(skillNames.map((s) => s.trim()).filter(Boolean))];
    await prisma.$transaction(async (tx) => {
      await tx.profileSkill.deleteMany({ where: { profileId } });
      for (const name of normalized) {
        const skill = await tx.skill.upsert({
          where: { name },
          create: { name },
          update: {},
        });
        await tx.profileSkill.create({
          data: { profileId, skillId: skill.id },
        });
      }
    });
  }

  /**
   * Updates avatar URL.
   */
  public async updateAvatarUrl(userId: string, avatarUrl: string): Promise<{ avatarUrl: string | null }> {
    return prisma.profile.update({
      where: { userId },
      data: { avatarUrl },
      select: { avatarUrl: true },
    });
  }

  /**
   * Updates banner URL.
   */
  public async updateBannerUrl(userId: string, bannerUrl: string): Promise<{ bannerUrl: string | null }> {
    return prisma.profile.update({
      where: { userId },
      data: { bannerUrl },
      select: { bannerUrl: true },
    });
  }

  /**
   * Updates CV metadata & raw text.
   */
  public async updateCv(
    userId: string,
    cvUrl: string,
    cvKey: string,
    cvName: string,
    cvText: string,
  ): Promise<PublicProfile | null> {
    const exists = await prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (!exists) return null;

    const profile = await prisma.profile.update({
      where: { userId },
      data: { cvUrl, cvKey, cvName, cvText },
      include: fullInclude,
    });
    return mapProfile(profile);
  }
}

export const profileRepository = new ProfileRepository();

