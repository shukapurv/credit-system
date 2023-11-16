const { DataTypes } = require('sequelize');


module.exports = (sequelize, Sequelize) => {
    const CustomerInfo = sequelize.define('CustomerInfo', {
        customer_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        phone_number: {
            type: DataTypes.STRING,
        },
        monthly_salary: {
            type: DataTypes.DECIMAL(10, 2),
        },
        approved_limit: {
            type: DataTypes.DECIMAL(10, 2),
        },
        current_debt: {
            type: DataTypes.DECIMAL(10, 2),
        },
    });

    const LoanInfo = sequelize.define('LoanInfo', {
        loan_id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true,
        },
        customer_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        loan_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        tenure: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        interest_rate: {
            type: DataTypes.DECIMAL(5, 2),
            allowNull: false,
        },
        monthly_repayment: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
        },
        emis_paid_on_time: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: false,
        },
    });

    CustomerInfo.hasMany(LoanInfo, { foreignKey: 'customer_id' });
    LoanInfo.belongsTo(CustomerInfo, { foreignKey: 'customer_id' });

    return { CustomerInfo, LoanInfo };

};




