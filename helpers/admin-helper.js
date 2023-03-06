const { ADMIN_COLECTION } = require('../config/collections')
const db = require('../config/connection')
const bcrypt = require('bcrypt')

module.exports = {
    doLogin: (adminData) => {
        return new Promise(async (resolve, reject) => {
            const response = {
                success: false,
                incorrectPass: false,
                admin: {}
            }
            const validAdmin = await db.get().collection(ADMIN_COLECTION).findOne({ email: adminData.email })
            if (validAdmin) {
                bcrypt.compare(adminData.password, validAdmin.password).then((status) => {
                    if (status) {
                        response.success = true;
                        response.admin = validAdmin;
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
    }
}