import { prisma } from '../config/db';
import { Prisma } from '@prisma/client';

export async function findAll(includeInactive = false) {
  return prisma.documentTemplate.findMany({
    where: includeInactive ? {} : { isActive: true },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function findById(id: string) {
  return prisma.documentTemplate.findUnique({
    where: { id },
  });
}

export async function findByType(type: string, includeInactive = false) {
  return prisma.documentTemplate.findMany({
    where: {
      type,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { sortOrder: 'asc' },
  });
}

export async function create(data: Prisma.DocumentTemplateCreateInput) {
  return prisma.documentTemplate.create({
    data,
  });
}

export async function update(id: string, data: Prisma.DocumentTemplateUpdateInput) {
  return prisma.documentTemplate.update({
    where: { id },
    data,
  });
}

export async function remove(id: string, softDelete = true) {
  if (softDelete) {
    return prisma.documentTemplate.update({
      where: { id },
      data: { isActive: false },
    });
  }
  return prisma.documentTemplate.delete({
    where: { id },
  });
}
