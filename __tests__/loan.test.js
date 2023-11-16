const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const CustomerRouter = require('../routes'); // Make sure this path is correct
const db = require('../models'); // Make sure this path is correct
const LoanService = require('../services/loanService'); // Import the LoanService

jest.mock('../models', () => ({
    customers: {
        LoanInfo: {
            create: jest.fn(),
            findByPk: jest.fn(),
        },
        CustomerInfo: {
            findByPk: jest.fn(),
        },
    },
}));

jest.mock('../services/loanService');


const app = express();
app.use(bodyParser.json());
app.use('/', CustomerRouter); // Changed from '/view-loan' to '/', depending on how the routes are defined

describe('GET /view-loan/:loan_id', () => {
    beforeEach(() => {
        db.customers.LoanInfo.findByPk.mockClear();
        db.customers.CustomerInfo.findByPk.mockClear();
    });

    it('should return loan details if the loan exists', async () => {
        const mockCustomer = {
            customer_id: 123,
            first_name: 'John',
            last_name: 'Doe',
            phone_number: '1234567890',
            age: 30,
        };

        const mockLoan = {
            loan_id: 1,
            customer_id: 123,
            loan_amount: 5000,
            interest_rate: 10,
            tenure: 12,
            monthly_installment: 500,
            CustomerInfo: mockCustomer, // Added this to mock the inclusion of customer data
        };

        db.customers.LoanInfo.findByPk.mockResolvedValue(mockLoan);

        const response = await request(app).get('/view-loan/1');

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            loan_id: mockLoan.loan_id,
            customer: {
                id: mockLoan.CustomerInfo.customer_id,
                first_name: mockLoan.CustomerInfo.first_name,
                last_name: mockLoan.CustomerInfo.last_name,
                phone_number: mockLoan.CustomerInfo.phone_number,
            },
            loan_amount: mockLoan.loan_amount,
            interest_rate: mockLoan.interest_rate,
            tenure: mockLoan.tenure,
        });

        expect(db.customers.LoanInfo.findByPk).toHaveBeenCalledWith('1', { // The loan_id is passed as a string here because route parameters are always strings
            include: [{ model: db.customers.CustomerInfo, as: 'CustomerInfo' }],
        });
    });

    it('should return 404 if the loan does not exist', async () => {
        db.customers.LoanInfo.findByPk.mockResolvedValue(null);

        const response = await request(app).get('/view-loan/1');

        expect(response.statusCode).toBe(404);
        expect(response.body).toEqual({ message: 'Loan not found' });
    });

    it('should return 500 if an error occurs', async () => {
        db.customers.LoanInfo.findByPk.mockRejectedValue(new Error('Database error'));

        const response = await request(app).get('/view-loan/1');

        expect(response.statusCode)
        expect(response.statusCode).toBe(500); // This should be 500 to match the error status code
        expect(response.body).toEqual({ message: 'Database error' });
    });
});

describe('POST /create-loan', () => {
    beforeEach(() => {
        db.customers.LoanInfo.create.mockClear();
        LoanService.mockClear();
    });

    it('should create a loan if eligibility is approved', async () => {
        const mockLoanInfo = {
            loan_id: 1,
            customer_id: 1,
            loan_amount: 10000,
            tenure: 12,
            interest_rate: 5,
            monthly_repayment: 850,
            emis_paid_on_time: 0,
            start_date: new Date(),
            end_date: new Date(new Date().setFullYear(new Date().getFullYear() + 1)) // One year from now
        };

        LoanService.prototype.isEligible = jest.fn().mockResolvedValue({
            approval: true,
            corrected_interest_rate: 5,
            monthly_installment: 850
        });

        db.customers.LoanInfo.create.mockResolvedValue(mockLoanInfo);

        const response = await request(app)
            .post('/create-loan')
            .send({
                customer_id: 1,
                loan_amount: 10000,
                tenure: 12,
                interest_rate: 5
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            customer_id: 1,
            loan_id: 1,
            loan_approved: true,
            monthly_installment: 850,
            message: 'Loan approved'
        });
    });

    it('should return 400 if required fields are missing', async () => {
        const response = await request(app)
            .post('/create-loan')
            .send({
                customer_id: 1,
                loan_amount: 10000
            });

        expect(response.statusCode).toBe(400);
        expect(response.text).toContain('Missing required key');
    });

    it('should return loan not approved if eligibility fails', async () => {
        LoanService.prototype.isEligible = jest.fn().mockResolvedValue({
            approval: false,
            message: 'Loan not approved'
        });

        const response = await request(app)
            .post('/create-loan')
            .send({
                customer_id: 1,
                loan_amount: 10000,
                tenure: 12,
                interest_rate: 5
            });

        expect(response.statusCode).toBe(200);
        expect(response.body).toEqual({
            customer_id: 1,
            loan_id: null,
            loan_approved: false,
            monthly_installment: null,
            message: 'Loan not approved'
        });
    });

});
