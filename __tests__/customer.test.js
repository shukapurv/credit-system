const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');
const CustomerRouter = require('../routes');
const db = require('../models');

jest.mock('../models', () => ({
    customers: {
        CustomerInfo: {
            create: jest.fn()
        }
    }
}));

const app = express();
app.use(bodyParser.json());
app.use('/', CustomerRouter);


describe('POST /register', () => {
    beforeEach(() => {
        // Reset the mock before each test
        db.customers.CustomerInfo.create.mockClear();
    });

    it('should register a new customer and return 201 status', async () => {
        const mockCustomer = {
            customer_id: 1,
            first_name: 'John',
            last_name: 'Doe',
            phone_number: '1234567890',
            age: 30,
            monthly_salary: 50000,
            approved_limit: 1800000
        };

        // Mock the DB operation
        db.customers.CustomerInfo.create.mockResolvedValue(mockCustomer);

        const response = await request(app)
            .post('/register')
            .send({
                first_name: 'John',
                last_name: 'Doe',
                phone_number: 1234567890,
                age: 30,
                monthly_income: 50000
            });

        expect(response.statusCode).toBe(201);
        expect(response.body).toEqual({
            customer_id: 1,
            name: 'John Doe',
            monthly_income: 50000,
            phone_number: '1234567890',
            age: 30,
            approved_limit: 1800000
        });
    });

    it('should return 400 if required fields are missing', async () => {
        const response = await request(app)
            .post('/register')
            .send({
                first_name: 'John'
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: 'All fields are required' });
    });

    it('should return 400 for invalid data types', async () => {
        const response = await request(app)
            .post('/register')
            .send({
                first_name: 'John',
                last_name: 'Doe',
                phone_number: 'invalid',
                age: 'invalid',
                monthly_income: 'invalid'
            });

        expect(response.statusCode).toBe(400);
        expect(response.body).toEqual({ message: 'Invalid data types for age, monthly_income, or phone_number' });
    });

});
