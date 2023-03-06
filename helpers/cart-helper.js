const { ObjectId } = require('mongodb')
const { CART_COLLECTION, PRODUCT_COLLECTION } = require('../config/collections')
const db = require('../config/connection')

module.exports = {
    addToCart: (user, product) => {
        let productObj = {
            item: new ObjectId(product),
            quantity: 1
        }
        return new Promise(async (resolve, reject) => {
            const isCartCreated = await db.get().collection(CART_COLLECTION).findOne({ user: new ObjectId(user) })
            if (isCartCreated) {
                let productExists = isCartCreated.cartItems.some(id => id.item.equals(product));
                if (productExists) {
                    await db.get().collection(CART_COLLECTION).updateOne({ 'cartItems.item': new ObjectId(product) },
                        {
                            $inc: { 'cartItems.$.quantity': 1 }
                        }
                    )
                } else {
                    await db.get().collection(CART_COLLECTION).updateOne({ user: new ObjectId(user) }, { $push: { cartItems: productObj } })
                }
            } else {
                await db.get().collection(CART_COLLECTION).insertOne({ user: new ObjectId(user), cartItems: [productObj] })
            }
        })
    },
    removeFromCart: (user, product) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(CART_COLLECTION).updateOne({ user: new ObjectId(user) }, { $pull: { cartItems: { item: new ObjectId(product) } } })
            resolve()
        })
    },
    emptyCartAfterOrderPlaced: (user)=>{
        return new Promise(async (resolve, reject) =>{
            await db.get().collection(CART_COLLECTION).updateOne({ user: new ObjectId(user) }, { $set: { cartItems: [] } })
            resolve()
        })
    },
    getCartItems: (user) => {
        return new Promise(async (resolve, reject) => {
            const cartItems = await db.get().collection(CART_COLLECTION).aggregate(
                [
                    { $match: { user: new ObjectId(user) } },
                    {
                        $unwind: '$cartItems'
                    },
                    {
                        $project: {
                            item: '$cartItems.item',
                            quantity: '$cartItems.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'productDetails'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, productDetails: { $arrayElemAt: ['$productDetails', 0] }
                        }
                    }
                ]
            ).toArray()
            resolve(cartItems)
        })
    },
    getCartItemsList: (user)=>{
        return new Promise(async (resolve, reject)=>{
            const cart = await db.get().collection(CART_COLLECTION).findOne({user: new ObjectId(user)})
            if(cart)
                resolve(cart.cartItems)
            else
                resolve([])
        })
    },
    getCartItemsCount: (user) => {
        return new Promise(async function (resolve, reject) {
            const cart = await db.get().collection(CART_COLLECTION).findOne({ user: new ObjectId(user) })
            if (cart) {
                resolve(cart.cartItems.length)
            } else {
                resolve(null)
            }
        })
    },
    checkCartItems: (user, product) => {
        return new Promise(async (resolve, reject) => {
            const cart = await db.get().collection(CART_COLLECTION).find(
                {
                    user: new ObjectId(user),
                    cartItems:
                        { $elemMatch: { item: new ObjectId(product) } }
                }
            ).toArray()
            console.log(cart);
            if (cart.length === 0) {
                resolve(true)
            } else {
                resolve(false)
            }
        })
    },
    changeProductQuantity: (itemDetails) => {
        const count = parseInt(itemDetails.count)
        return new Promise(async (resolve, reject) => {
            if(count === -1 && parseInt(itemDetails.quantity) === 1){
                await db.get().collection(CART_COLLECTION).updateOne(
                    {
                        _id: new ObjectId(itemDetails.cart)
                    },
                    {
                        $pull: {cartItems: {item: new ObjectId(itemDetails.product)}}
                    }
                ).then(()=>{
                    resolve(false)
                })
            }else{
                await db.get().collection(CART_COLLECTION).updateOne(
                { 
                    _id: new ObjectId(itemDetails.cart),
                    'cartItems.item': new ObjectId(itemDetails.product) 
                },
                {
                    $inc: { 'cartItems.$.quantity': count }
                }
                ).then(()=>{
                    resolve(true)
                })
        }
            resolve()
        })
    },
    getCartTotalAmount: (user)=>{
        return new Promise(async (resolve, reject)=>{
            const totalAmount = await db.get().collection(CART_COLLECTION).aggregate(
                [
                    { $match: { user: new ObjectId(user) } },
                    {
                        $unwind: '$cartItems'
                    },
                    {
                        $project: {
                            item: '$cartItems.item',
                            quantity: '$cartItems.quantity'
                        }
                    },
                    {
                        $lookup: {
                            from: PRODUCT_COLLECTION,
                            localField: 'item',
                            foreignField: '_id',
                            as: 'productDetails'
                        }
                    },
                    {
                        $project: {
                            item: 1, quantity: 1, productDetails: { $arrayElemAt: ['$productDetails', 0] }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            total: {$sum: {$multiply: ['$quantity',{ $toInt: '$productDetails.price' }]}}
                        }
                    }
                ]
            ).toArray()
            if(totalAmount[0] !== undefined)
                resolve(totalAmount[0].total)
            else
                resolve(null)
        })
    }
}