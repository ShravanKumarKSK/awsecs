import path from 'path'
import chai from 'chai'
import chaiHttp from 'chai-http'

const should = chai.should();
import * as dotenv from 'dotenv'
dotenv.config();

import {
    app
} from '../app'

chai.use(chaiHttp);

describe('Auth APIs', function () {
        
    describe('post /signup', function () {
        const userCredentials = {
            "username": "rkuser20@gmail.com",
            "firstname": "rama",
            "lastname": "kalyan",
            "email": ""
        };
        it('It should register the user', function () {
            chai.request(app).post('/signup').send(userCredentials).end(function (err, res) {
                if (err) {
                    console.log(err);
                }
                res.status.should.be.equal(200);
            })
        })
    })
    describe('post /login', function () {
        const userCredentials = {
            "username": "rkuser17@gmail.com",
            "password": "rkPwd@123#",
            "email": "rkuser17@gmail.com"
        };
        it('It should allow the user to login', async function () {
            chai.request(app).post('/login').send(userCredentials).end(function (err, res) {
                if (err) {
                    console.log(err);
                }
                res.status.should.be.equal(200);
            })
        })
    })
})