import { Sequelize, DataTypes } from 'sequelize';

import config from '../config/database.js';
import User from './user.model.js';
import Gym from './gym.model.js';
import Member from './member.model.js';
import MembershipPlan from './membership_plan.model.js';
import Membership from './membership.model.js';
import Transaction from './transaction.model.js';
import Staff from './staff.model.js';
import PersonalTraining from './personal_training.model.js';
import WhatsAppTemplate from './whatsapp_template.model.js';
import Notification from './notification.model.js';


const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    dialect: dbConfig.dialect,
    logging: false
  }
);

const db = {};

db.Sequelize = Sequelize;
db.sequelize = sequelize;

// Initialize Models and pass sequelize and DataTypes
db.User = User(sequelize, DataTypes);
db.Gym = Gym(sequelize, DataTypes);
db.Member = Member(sequelize, DataTypes);
db.MembershipPlan = MembershipPlan(sequelize, DataTypes); // Initialize new models
db.Membership = Membership(sequelize, DataTypes);       // Initialize new models
db.Transaction = Transaction(sequelize, DataTypes);     // Initialize new models
db.Staff = Staff(sequelize, DataTypes);
db.PersonalTraining = PersonalTraining(sequelize, DataTypes);
db.Notification = Notification(sequelize, DataTypes);
db.WhatsAppTemplate = WhatsAppTemplate(sequelize, DataTypes);


// Define Associations (Centralized here)
// IMPORTANT: These are the correct associations to put here.

// User Associations
// A User belongs to one Gym (their primary gym, e.g., for owner/member roles)
db.User.belongsTo(db.Gym, { foreignKey: 'gym_id' });
// A User can have multiple Member records (if they join multiple gyms as a member)
db.User.hasMany(db.Member, { foreignKey: 'user_id', onDelete: 'CASCADE' });
db.User.hasMany(db.Staff, { foreignKey: 'user_id' });

// Gym Associations
db.Gym.hasMany(db.User, { foreignKey: 'gym_id' }); // A gym can have many users (owners, members, staff)
db.Gym.hasMany(db.Member, { foreignKey: 'gym_id', onDelete: 'CASCADE' });
db.Gym.hasMany(db.MembershipPlan, { foreignKey: 'gym_id', onDelete: 'CASCADE' });
db.Gym.hasMany(db.Membership, { foreignKey: 'gym_id', onDelete: 'CASCADE' });
db.Gym.hasMany(db.Transaction, { foreignKey: 'gym_id', onDelete: 'CASCADE' });
db.Gym.hasMany(db.Staff, { foreignKey: 'gym_id', onDelete: 'CASCADE' });
db.Gym.hasMany(db.PersonalTraining, { foreignKey: 'gym_id' });
db.Gym.hasMany(db.WhatsAppTemplate, { foreignKey: 'gym_id', onDelete: 'CASCADE' });


// Member Associations
db.Member.belongsTo(db.User, { foreignKey: 'user_id', allowNull: false }); // Member must always belong to a User
db.Member.belongsTo(db.Gym, { foreignKey: 'gym_id' }); // A Member record belongs to a Gym
db.Member.hasMany(db.Membership, { foreignKey: 'member_id', onDelete: 'CASCADE' });
db.Member.hasMany(db.Transaction, { foreignKey: 'member_id', onDelete: 'CASCADE' });
db.Member.hasMany(db.PersonalTraining, { foreignKey: 'member_id' });

// MembershipPlan Associations
db.MembershipPlan.belongsTo(db.Gym, { foreignKey: 'gym_id' });
db.MembershipPlan.hasMany(db.Membership, { foreignKey: 'plan_id', onDelete: 'CASCADE' });

// Membership Associations
db.Membership.belongsTo(db.Member, { foreignKey: 'member_id' });
db.Membership.belongsTo(db.MembershipPlan, { foreignKey: 'plan_id' });
db.Membership.belongsTo(db.Gym, { foreignKey: 'gym_id' }); // Denormalized for easier filtering

// Transaction Associations
db.Transaction.belongsTo(db.Gym, { foreignKey: 'gym_id' });
db.Transaction.belongsTo(db.Member, { foreignKey: 'member_id' });
db.Transaction.belongsTo(db.Membership, { foreignKey: 'membership_id', onDelete: 'SET NULL' }); // Set NULL if membership is deleted

// Staff Associations
db.Staff.belongsTo(db.Gym, { foreignKey: 'gym_id' });
db.Staff.belongsTo(db.User, { foreignKey: 'user_id', as: 'User' });
db.Staff.hasMany(db.PersonalTraining, { foreignKey: 'staff_id' });

// Pt Associations
db.PersonalTraining.belongsTo(db.Gym, { foreignKey: 'gym_id' });
db.PersonalTraining.belongsTo(db.Member, { foreignKey: 'member_id' });
db.PersonalTraining.belongsTo(db.Staff, { foreignKey: 'staff_id', as: 'Trainer' });

// Notification Associations
db.Notification.belongsTo(db.Gym, { foreignKey: 'gym_id' });
db.Notification.belongsTo(db.Member, { foreignKey: 'member_id' });
db.Notification.belongsTo(db.Membership, { foreignKey: 'membership_id' });

export default db;