
import { PrismaClient } from '@prisma/client';

async function testConnection() {
  const prisma = new PrismaClient();
  try {
    console.log('Testing connection to database...');
    await prisma.$connect();
    console.log('✅ Connection successful!');
    

    const tables = await prisma.$queryRaw`SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`;
    console.log('Tables found:', tables);

    const productCount = await prisma.product.count();
    const categoryCount = await prisma.category.count();
    console.log(`Product count: ${productCount}`);
    console.log(`Category count: ${categoryCount}`);

    // Get all users
    console.log('\n--- ALL USERS ---');
    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, isProtected: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'asc' }
    });
    
    users.forEach(user => {
      console.log(`${user.email} (${user.role}) - Protected: ${user.isProtected} - Active: ${user.isActive}`);
    });

  } catch (error) {
    console.error('❌ Connection failed:');
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
