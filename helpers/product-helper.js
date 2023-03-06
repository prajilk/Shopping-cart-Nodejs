const db = require('../config/connection')
const { PRODUCT_COLLECTION } = require('../config/collections')
const { ObjectId } = require('mongodb')

module.exports = {

    getProducts: () => {
        return new Promise(async (reslove, reject) => {
            const products = await db.get().collection(PRODUCT_COLLECTION).find().toArray()
            reslove(products)
        })
    },

    getThisProduct: (productId) => {
        return new Promise(async (reslove, reject) => {
            const product = await db.get().collection(PRODUCT_COLLECTION).findOne({_id: new ObjectId(productId)})
            reslove(product)
        })
    },

    addProduct: (product, callback) => {
        db.get().collection(PRODUCT_COLLECTION).insertOne(product).then((data) => {
            callback(data.insertedId)
        })
    },

    updateProduct: (product) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(PRODUCT_COLLECTION).updateOne({ _id: new ObjectId(product.id) }, {
                $set: (() => {
                    delete product.id;
                    return product;
                })()
            })
        })
    },

    removeProduct: (id) => {
        db.get().collection(PRODUCT_COLLECTION).deleteOne({ _id: new ObjectId(id) }).then()
    },

    searchProducts: (payload) => {
        return new Promise(async (resolve, reject) => {
            let searchResult = await db.get().collection(PRODUCT_COLLECTION).find({
                // title: { "$regex": payload, "$options": "i" }
                $or: [
                    { title: { "$regex": payload, "$options": "i" } },
                    { category: { "$regex": '^' + payload, "$options": "i" } }
                ]
            }).toArray()
            resolve(searchResult)
        })
    }

}