var express = require('express');
var router = express.Router();
var db = require("../models")
const LoanService = require('../services/loanService');
const { calculateNewTenure, truncateToTwoDecimals } = require('../helper/loanInfo')
const { Op } = require('sequelize');


router.post('/register', async (req, res) => {
    const { first_name, last_name, phone_number, age, monthly_income } = req.body;

    if (!first_name || !last_name || !phone_number || !age || !monthly_income) {
        return res.status(400).send({ message: 'All fields are required' });
    }

    if (typeof age !== 'number' || typeof monthly_income !== 'number' || typeof phone_number !== 'number') {
        return res.status(400).send({ message: 'Invalid data types for age, monthly_income, or phone_number' });
    }

    try {
        const approved_limit = Math.round((36 * monthly_income) / 100000) * 100000;

        const customer = await db.customers.CustomerInfo.create({
            first_name,
            last_name,
            age,
            phone_number: phone_number.toString(),
            monthly_salary: monthly_income,
            approved_limit,
            current_debt: 0
        });

        res.status(201).send({
            customer_id: customer.customer_id,
            name: `${customer.first_name} ${customer.last_name}`,
            monthly_income: customer.monthly_salary,
            phone_number: customer.phone_number,
            age: customer.age,
            approved_limit: customer.approved_limit
        });
    } catch (error) {
        console.error('Error registering new customer:', error);
        res.status(500).send({ message: 'Internal Server Error' });
    }
});

router.post('/check-eligibility', async (req, res) => {
    try {
        const requiredKeys = ['customer_id', 'loan_amount', 'tenure', 'interest_rate'];

        for (const key of requiredKeys) {
            if (req.body[key] === undefined) {
                return res.status(400).send(`Missing required key: ${key}`);
            }
        }
        const loanService = new LoanService(req);
        let srv = await loanService.isEligible();

        return res.json(srv);
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.post('/create-loan', async (req, res) => {
    try {
        const requiredKeys = ['customer_id', 'loan_amount', 'tenure', 'interest_rate'];

        for (const key of requiredKeys) {
            if (req.body[key] === undefined) {
                return res.status(400).send(`Missing required key: ${key}`);
            }
        }

        const loanService = new LoanService(req);
        const eligibilityResult = await loanService.isEligible();

        if (eligibilityResult.approval) {
            const newLoan = await db.customers.LoanInfo.create({
                customer_id: req.body.customer_id,
                loan_amount: req.body.loan_amount,
                tenure: req.body.tenure,
                interest_rate: eligibilityResult.corrected_interest_rate,
                monthly_repayment: eligibilityResult.monthly_installment,
                emis_paid_on_time: 0,
                start_date: new Date(),
                end_date: new Date(new Date().setFullYear(new Date().getFullYear() + req.body.tenure / 12)) // Assuming tenure is in months
            });

            const loanDetails = {
                customer_id: req.body.customer_id,
                loan_id: newLoan.loan_id,
                loan_approved: true,
                monthly_installment: eligibilityResult.monthly_installment,
                message: 'Loan approved'
            };
            return res.json(loanDetails);
        } else {
            return res.json({
                customer_id: req.body.customer_id,
                loan_id: null,
                loan_approved: false,
                monthly_installment: null,
                message: eligibilityResult.message || 'Loan not approved'
            });
        }
    } catch (error) {
        res.status(500).send(error.message);
    }
});



router.get('/view-loan/:loan_id', async (req, res) => {
    const { loan_id } = req.params;

    try {
        const loan = await db.customers.LoanInfo.findByPk(loan_id, {
            include: [{ model: db.customers.CustomerInfo, as: 'CustomerInfo' }]
        });

        if (!loan) {
            return res.status(404).json({ message: 'Loan not found' });
        }

        const response = {
            loan_id: loan.loan_id,
            customer: {
                id: loan.CustomerInfo.customer_id,
                first_name: loan.CustomerInfo.first_name,
                last_name: loan.CustomerInfo.last_name,
                phone_number: loan.CustomerInfo.phone_number,
            },
            loan_amount: loan.loan_amount,
            interest_rate: loan.interest_rate,
            tenure: loan.tenure,
            monthly_installment: loan.monthly_repayment
        };

        res.json(response);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
});

router.post('/make-payment/:customer_id/:loan_id', async (req, res) => {
    try {
        const { customer_id, loan_id } = req.params;
        const { payment_amount } = req.body;

        if (!payment_amount || isNaN(payment_amount) || payment_amount <= 0) {
            return res.status(400).send('Invalid payment amount');
        }

        const loan = await db.customers.LoanInfo.findOne({
            where: { customer_id: customer_id, loan_id: loan_id }
        });

        if (!loan) {
            return res.status(404).send('Loan not found');
        }

        let remainingAmount = parseFloat(loan.loan_amount) - payment_amount;
        remainingAmount = Math.max(remainingAmount, 0);


        let adjustedTenure = calculateNewTenure(remainingAmount, loan.interest_rate, loan.monthly_repayment);

        await db.customers.LoanInfo.update({
            loan_amount: remainingAmount,
            tenure: adjustedTenure,
            monthly_repayment: loan.monthly_repayment,
            emis_paid_on_time: loan.emis_paid_on_time + 1
        }, {
            where: { loan_id: loan.loan_id }
        });

        return res.json({
            message: 'Payment processed successfully',
            new_remaining_amount: remainingAmount,
            adjusted_tenure: adjustedTenure,
            monthly_repayment: loan.monthly_repayment
        });
    } catch (error) {
        res.status(500).send(error.message);
    }
});

router.get('/view-statement/:customer_id/:loan_id', async (req, res) => {
    try {
        const { customer_id, loan_id } = req.params;

        const loan = await db.customers.LoanInfo.findOne({
            where: { customer_id: customer_id, loan_id: loan_id }
        });

        if (!loan) {
            return res.status(404).send('Loan not found');
        }

        const totalPaid = loan.monthly_repayment * loan.emis_paid_on_time;
        const repaymentsLeft = loan.tenure - loan.emis_paid_on_time;

        const loanStatement = {
            customer_id: loan.customer_id,
            principal: loan.loan_amount,
            monthly_installment: loan.monthly_repayment,
            loan_id: loan.loan_id,
            interest_rate: loan.interest_rate,
            amount_paid: truncateToTwoDecimals(totalPaid),
            repayments_left: repaymentsLeft
        };

        return res.json(loanStatement);
    } catch (error) {
        res.status(500).send(error.message);
    }
});


module.exports = router;
