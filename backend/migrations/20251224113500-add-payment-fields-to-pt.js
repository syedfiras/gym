export async function up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
        'personal_trainings',
        'actual_price_paid',
        {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true
        }
    );

    await queryInterface.addColumn(
        'personal_trainings',
        'payment_status',
        {
            type: Sequelize.ENUM(
                'paid',
                'due',
                'partially_paid',
                'refunded'
            ),
            allowNull: false,
            defaultValue: 'due'
        }
    );
}

export async function down(queryInterface, Sequelize) {
    await queryInterface.removeColumn(
        'personal_trainings',
        'payment_status'
    );

    await queryInterface.removeColumn(
        'personal_trainings',
        'actual_price_paid'
    );

    await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_personal_trainings_payment_status";'
    );
}