const readXlsxFile = require('read-excel-file/node');
const db = require('../models')

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
const processExcelData = async (job) => {
    const { customerDataPath, loanDataPath } = job.data;
    const customers = await readXlsxFile(customerDataPath);
    const loans = await readXlsxFile(loanDataPath);

    customers.shift();

    for (let row of customers) {
        const [customer_id, first_name, last_name, age, phone_number, monthly_salary, approved_limit] = row;

        try {
            const customer = await db.customers.CustomerInfo.create({
                customer_id,
                first_name,
                last_name,
                phone_number,
                monthly_salary,
                approved_limit,
                current_debt: 0
            });

        } catch (error) {
            console.error(`Error ingesting customer data for loan_id ${customer_id}:`, error);
        }
    }

    console.log('All customers have been ingested into the database.');

    loans.shift();

    for (let row of loans) {
        const [customer_id, loan_id, loan_amount, tenure, interest_rate, monthly_payment, emis_paid_on_time, start_date, end_date] = row;

        try {
            const parsedStartDate = new Date(start_date);
            const parsedEndDate = new Date(end_date);

            if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
                throw new Error(`Invalid date format for loan_id ${loan_id}`);
            }

            await db.customers.LoanInfo.create({
                loan_id,
                customer_id,
                loan_amount,
                tenure,
                interest_rate,
                monthly_repayment:monthly_payment,
                emis_paid_on_time,
                start_date: parsedStartDate,
                end_date: parsedEndDate
            });

        } catch (error) {
            console.error(`Error ingesting loan data for loan_id ${loan_id}:`, error);
        }
    }

    console.log('Loan data ingestion process completed.');

    console.log('------Updating customers current debt based on ongoing loans.------');

    for (const customer of customers) {
        const [customer_id] = customer;

        try {
            var totalDebt = await db.customers.LoanInfo.sum('loan_amount', {
                where: {
                    customer_id: customer_id,
                    end_date: {
                        [db.Sequelize.Op.gt]: new Date()
                    }
                }
            });

            totalDebt = totalDebt || 0;


            await db.customers.CustomerInfo.update(
                { current_debt: totalDebt },
                { where: { customer_id: customer_id } }
            );

            console.log(`Updated current debt for customer_id ${customer_id}`);
        } catch (error) {
            console.error(`Error updating current debt for customer_id ${customer_id}:`, error);
        }
    }

    console.log('Customer current debt update process completed.');

    return { success: true };
};

module.exports = processExcelData;
