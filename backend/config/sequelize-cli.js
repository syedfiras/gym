import dotenv from 'dotenv';
dotenv.config();

const baseConfig = {
    dialect: 'postgres',
    protocol: 'postgres',
    port: process.env.DB_PORT || 5432,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
};

export default {
    development: {
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        ...baseConfig
    },

    production: {
        username: process.env.DB_USER,
        password: process.env.DB_PASS,
        database: process.env.DB_NAME,
        host: process.env.DB_HOST,
        ...baseConfig
    }
};