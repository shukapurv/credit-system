const { Op } = require('sequelize');
var db = require("../models");
const { calculateMonthlyInstallment } = require("../helper/loanInfo");

class LoanService {
    constructor(req) {
        this.req = req;
        this.customerId = req.body.customer_id;
    }

    async calculateCreditScore() {
        const customer = await db.customers.CustomerInfo.findByPk(this.customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        const loans = await db.customers.LoanInfo.findAll({
            where: { customer_id: this.customerId }
        });

        let score = 100;
        let totalLoansTaken = loans.length;
        let totalPaidOnTime = loans.reduce((acc, loan) => acc + (loan.emis_paid_on_time === loan.tenure ? 1 : 0), 0);
        let currentYearLoans = loans.filter(loan => new Date(loan.start_date).getFullYear() === new Date().getFullYear()).length;

        score -= totalLoansTaken * 2;
        score += totalPaidOnTime * 5;
        score -= currentYearLoans * 5;

        const totalCurrentLoanAmount = await db.customers.LoanInfo.sum('loan_amount', {
            where: {
                customer_id: this.customerId,
                end_date: { [Op.gt]: new Date() }
            }
        });

        if (totalCurrentLoanAmount > parseFloat(customer.approved_limit)) {
            score = 0;
        }

        return Math.max(0, Math.min(Math.round(score), 100));
    }

    async isEligible() {
        const { loan_amount, tenure, interest_rate } = this.req.body;

        const creditScore = await this.calculateCreditScore();
        let minInterestRate;

        if (creditScore > 50) {
            minInterestRate = null;
        } else if (creditScore > 30) {
            minInterestRate = 12;
        } else if (creditScore > 10) {
            minInterestRate = 16;
        } else {
            return ({ approval: false, message: 'Loan not approved due to low credit score' });
        }

        let corrected_interest_rate = (minInterestRate !== null && interest_rate < minInterestRate) ? minInterestRate : interest_rate;

        const customer = await db.customers.CustomerInfo.findByPk(this.customerId);
        const totalMonthlyEMI = await db.customers.LoanInfo.sum('monthly_repayment', {
            where: { customer_id: this.customerId, end_date: { [Op.gt]: new Date() } }
        });

        if (totalMonthlyEMI > (customer.monthly_salary / 2)) {
            return ({ approval: false, message: 'Loan not approved due to high EMI burden' });
        }

        const monthly_installment = calculateMonthlyInstallment(loan_amount, corrected_interest_rate, tenure);

        return ({
            approval: true,
            customer_id: this.customerId,
            interest_rate: interest_rate,
            corrected_interest_rate: corrected_interest_rate,
            tenure: tenure,
            monthly_installment: monthly_installment
        });

    }
}

module.exports = LoanService;
