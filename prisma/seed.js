const prisma = require('../src/config/database');

async function main() {
  console.log('🌱 Iniciando seed de datos iniciales...');

  // Insertar Roles
  const roles = [
    { nombre: 'PROPIETARIO' },
    { nombre: 'ADMINISTRADOR' },
    { nombre: 'INQUILINO' }
  ];

  for (const rol of roles) {
    await prisma.rol.upsert({
      where: { nombre: rol.nombre },
      update: {},
      create: rol
    });
  }
  console.log('✅ Roles insertados');

  // Insertar Planes
  const planes = [
    { nombre: 'GRATUITO', maxUnidades: 10, permiteIaPlacas: true, permiteMetricasAvanzadas: false, precioMensual: 0 },
    { nombre: 'ESTANDAR', maxUnidades: 30, permiteIaPlacas: true, permiteMetricasAvanzadas: false, precioMensual: 9.90 },
    { nombre: 'PREMIUM',  maxUnidades: 100, permiteIaPlacas: true, permiteMetricasAvanzadas: true, precioMensual: 19.90 }
  ];

  for (const plan of planes) {
    await prisma.plan.upsert({
      where: { nombre: plan.nombre },
      update: {},
      create: plan
    });
  }
  console.log('✅ Planes insertados');

  console.log('🎉 Seed completado exitosamente!');

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
};