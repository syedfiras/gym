import bcrypt from 'bcrypt';

export async function up(queryInterface, Sequelize) {
  // Fetch gyms and owners
  const gyms = await queryInterface.sequelize.query(
    `SELECT gym_id FROM gyms;`,
    { type: Sequelize.QueryTypes.SELECT }
  );
  const users = await queryInterface.sequelize.query(
    `SELECT user_id, gym_id FROM users WHERE role = 'owner';`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  // Create members for each gym
  let members = [];
  let usersToInsert = [];
  let memberCount = 0;
  for (const gym of gyms) {
    for (let i = 1; i <= 10; i++) { // 10 members per gym
      const email = `member${memberCount + 1}@demo.com`;
      const password_hash = await bcrypt.hash('memberpass', 10);
      usersToInsert.push({
        email,
        password_hash,
        role: 'member',
        first_name: `Member${memberCount + 1}`,
        last_name: 'Demo',
        gym_id: gym.gym_id,
        created_at: new Date(),
        updated_at: new Date()
      });
      memberCount++;
    }
  }
  // Insert users (members)
  await queryInterface.bulkInsert('users', usersToInsert, {});

  // Fetch inserted member users
  const memberUsers = await queryInterface.sequelize.query(
    `SELECT user_id, email, gym_id FROM users WHERE role = 'member';`,
    { type: Sequelize.QueryTypes.SELECT }
  );

  // Insert member records
  memberUsers.forEach((user, idx) => {
    members.push({
      user_id: user.user_id,
      gym_id: user.gym_id,
      email: user.email,
      phone: `555000${idx + 1}`,
      first_name: `Member${idx + 1}`,
      last_name: 'Demo',
      join_date: new Date(),
      member_status: 'active',
      created_at: new Date(),
      updated_at: new Date()
    });
  });

  await queryInterface.bulkInsert('members', members, {});
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.bulkDelete('members', null, {});
  await queryInterface.bulkDelete('users', { role: 'member' }, {});
}