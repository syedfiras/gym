import bcrypt from 'bcrypt';

export async function up(queryInterface, Sequelize) {
  // Create gyms
  const gyms = [
    {
      gym_name: 'Iron Paradise',
      contact_email: 'iron@paradise.com',
      address: '123 Muscle St',
      city: 'Fitville',
      state: 'CA',
      country: 'USA',
      contact_phone: '1234567890',
      unique_join_code: 'IRON123',
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      gym_name: 'Cardio Central',
      contact_email: 'cardio@central.com',
      address: '456 Heart Ave',
      city: 'Sweat City',
      state: 'NY',
      country: 'USA',
      contact_phone: '9876543210',
      unique_join_code: 'CARDIO456',
      created_at: new Date(),
      updated_at: new Date()
    }
  ];
  await queryInterface.bulkInsert('gyms', gyms, {});

  // Fetch gyms to get their IDs
  const gymsFromDb = await queryInterface.sequelize.query(
    `SELECT gym_id FROM gyms;`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  // Create owners
  const password_hash = await bcrypt.hash('password123', 10);
  const owners = gymsFromDb.map((gym, idx) => ({
    email: `owner${idx + 1}@demo.com`,
    password_hash,
    role: 'owner',
    first_name: `Owner${idx + 1}`,
    last_name: 'Demo',
    gym_id: gym.gym_id,
    created_at: new Date(),
    updated_at: new Date()
  }));
  await queryInterface.bulkInsert('users', owners, {});
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete('users', { role: 'owner' }, {});
  await queryInterface.bulkDelete('gyms', null, {});
}