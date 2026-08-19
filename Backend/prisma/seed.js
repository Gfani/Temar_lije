const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // 1. Seed Teacher User
  const teacher = await prisma.user.upsert({
    where: { id: '11111111-1111-4111-8111-111111111111' },
    update: {},
    create: {
      id: '11111111-1111-4111-8111-111111111111',
      email: 'teacher@temarlije.test',
      passwordHash: '$2b$10$hashed_password_sample',
      fullName: 'Abebe Kebede',
      role: 'TEACHER',
    },
  });

  // 2. Seed Student User
  const student = await prisma.user.upsert({
    where: { id: '33333333-3333-4333-8333-333333333333' },
    update: {},
    create: {
      id: '33333333-3333-4333-8333-333333333333',
      email: 'student@temarlije.test',
      passwordHash: '$2b$10$hashed_password_sample',
      fullName: 'Kebede Chala',
      role: 'STUDENT',
    },
  });

  // 3. Seed Default Classroom
  const classroom = await prisma.classroom.upsert({
    where: { id: '66666666-6666-4666-8666-666666666666' },
    update: {},
    create: {
      id: '66666666-6666-4666-8666-666666666666',
      title: 'Flutter Fundamentals',
      subject: 'Widget · widget structure',
      description: 'Learn Flutter UI widgets and backend connectivity',
      inviteCode: 'CHKIN1',
      createdById: teacher.id,
    },
  });

  // 4. Seed Classroom Member
  const existingMember = await prisma.classroomMember.findFirst({
    where: { classroomId: classroom.id, userId: student.id },
  });
  if (!existingMember) {
    await prisma.classroomMember.create({
      data: {
        id: '77777777-7777-4777-8777-777777777777',
        classroomId: classroom.id,
        userId: student.id,
      },
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
