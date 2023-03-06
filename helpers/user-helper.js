const db = require('../config/connection')
const { USERS_COLLECTION, ORDER_COLLECTION } = require('../config/collections')
const bcrypt = require('bcrypt')
const { ObjectId } = require('mongodb')

module.exports = {
    doSignup: (userData) => {
        return new Promise(async (resolve, reject) => {
            userData.password = await bcrypt.hash(userData.password, 10)
            const emailAlreadyRegistered = await db.get().collection(USERS_COLLECTION).countDocuments({email: userData.email}, limit = 1)
            if(emailAlreadyRegistered){
                reject()
            }
            else{
                db.get().collection(USERS_COLLECTION).insertOne(userData)
                resolve()
            }
        })
    },
    doLogin: (userData) => {
        return new Promise(async (resolve, reject) => {
            const response = {
                success: false,
                incorrectPass: false,
                user: {}
            }
            const validUser = await db.get().collection(USERS_COLLECTION).findOne({ email: userData.email })
            if (validUser) {
                bcrypt.compare(userData.password, validUser.password).then((status) => {
                    if (status) {
                        response.success = true;
                        response.user = validUser;
                        resolve(response)
                    } else {
                        response.incorrectPass = true
                        resolve(response)
                    }
                })
            } else {
                resolve(response)
            }
        })
    },
    getAccountDetails: (user)=>{
        return new Promise(async (resolve, reject)=>{
            const accountDetails = await db.get().collection(USERS_COLLECTION).findOne({_id: new ObjectId(user)})
            resolve(accountDetails)
        })
    },
    getAllAccountDetails: ()=>{
        return new Promise(async (resolve, reject)=>{
            const accountList = await db.get().collection(USERS_COLLECTION).aggregate(
                [
                    {
                        $lookup: {
                          from: ORDER_COLLECTION,
                          localField: "_id",
                          foreignField: "user",
                          as: "allOrders"
                        }
                      }
                ]
            ).toArray()
            resolve(accountList);
        })
    }
}