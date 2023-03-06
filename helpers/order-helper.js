const { ObjectId } = require('mongodb')
const { ORDER_COLLECTION, PRODUCT_COLLECTION, ADDRESS_COLLECTION } = require('../config/collections')
const db = require('../config/connection')

module.exports = {
    placeOrder: async (user, currentAddressId, paymentMethod, totalAmount, cartItemsList) => {
        let status = paymentMethod === 'COD' ? 'placed' : 'pending';
        const deliveryAddress = await db.get().collection(ADDRESS_COLLECTION).aggregate(
            [
                { $match: { user: new ObjectId(user) } },
                {
                    $unwind: "$addressList"
                },
                {
                    $match: { "addressList._id": new ObjectId(currentAddressId) }
                },
                {
                    $project: {
                        _id: 0,
                        address: "$addressList"
                    }
                }
            ]
        ).toArray()
        let order = {
            _id: new ObjectId(),
            deliveryAddress: deliveryAddress[0].address,
            products: cartItemsList,
            paymentMethod: paymentMethod,
            totalAmount: totalAmount,
            status: status,
            date: new Date().toDateString()
        }
        return new Promise(async (resolve, reject) => {
            const isOrderNotEmpty = await db.get().collection(ORDER_COLLECTION).findOne({ user: new ObjectId(user) })
            if (isOrderNotEmpty) {
                await db.get().collection(ORDER_COLLECTION).updateOne({ user: new ObjectId(user) }, { $push: { orders: order } })
            } else {
                await db.get().collection(ORDER_COLLECTION).insertOne({ user: new ObjectId(user), orders: [order] })
            }
            resolve()
        })
    },
    getOrderProducts: (user) => {
        return new Promise(async (resolve, reject) => {
            const orderProducts = await db.get().collection(ORDER_COLLECTION).aggregate([
                {
                    $match: {
                        user: new ObjectId(user)
                    }
                },
                {
                    $unwind: "$orders"
                },
                {
                    $unwind: "$orders.products"
                },
                {
                    $lookup: {
                        from: PRODUCT_COLLECTION,
                        localField: "orders.products.item",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                {
                    $unwind: "$productDetails"
                },
                {
                    $project: {
                        _id: 0,
                        allProducts: {
                            $mergeObjects: [
                                "$orders.products",
                                { orderId: "$orders._id" },
                                { title: "$productDetails.title" },
                                { status: "$orders.status" }
                            ]
                        }
                    }
                },
                {
                    $group: {
                        _id: null,
                        allProducts: {
                            $push: "$allProducts"
                        }
                    }
                },
                {
                    $project: {
                        _id: 0
                    }
                }
            ]).toArray()
            if (orderProducts[0] !== undefined)
                resolve(orderProducts[0].allProducts)
            else
                resolve(null)
        })
    },
    getProductsFromThisOrder: (user, orderId, excludeProductId) => {
        return new Promise(async (resolve, reject) => {
            const productsList = await db.get().collection(ORDER_COLLECTION).aggregate(
                [
                    { $match: { user: new ObjectId(user) } },
                    {
                        $unwind: "$orders"
                    },
                    {
                        $match: { "orders._id": new ObjectId(orderId) }
                    },
                    {
                        $unwind: "$orders.products"
                    },
                    {
                        $lookup: {
                            from: PRODUCT_COLLECTION,
                            localField: "orders.products.item",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    {
                        $unwind: "$productDetails"
                    },
                    {
                        $project: {
                            _id: 0,
                            products: "$productDetails"
                        }
                    },
                    {
                        $match: { "products._id": { $ne: new ObjectId(excludeProductId) } }
                    },
                    {
                        $project: {
                            products: 1
                        }
                    }
                ]
            ).toArray()
            resolve(productsList)
        })
    },
    getThisOrderProduct: (user, product) => {
        return new Promise(async (resolve, reject) => {
            const orderDetails = await db.get().collection(ORDER_COLLECTION).aggregate(
                [
                    { $match: { user: new ObjectId(user) } },
                    {
                        $unwind: "$orders"
                    },
                    {
                        $unwind: "$orders.products"
                    },
                    { $match: { "orders.products.item": new ObjectId(product) } },
                    {
                        $lookup: {
                            from: PRODUCT_COLLECTION,
                            localField: "orders.products.item",
                            foreignField: "_id",
                            as: "productDetails"
                        }
                    },
                    {
                        $unwind: "$productDetails"
                    }
                ]
            ).toArray()
            resolve(orderDetails[0])
        })
    },
    getAllOrders: () => {
        return new Promise(async (resolve, reject) => {
            const allOrders = await db.get().collection(ORDER_COLLECTION).aggregate(
                [
                    {
                        "$unwind": "$orders"
                    },
                    {
                        "$project": {
                            _id: 0,
                            user: "$user",
                            orders: "$orders"
                        }
                    }
                ]
            ).toArray()
            if (allOrders[0] !== undefined)
                resolve(allOrders)
            else
                resolve(null)
        })
    },
    getOrderFullDetails: (orderId) => {
        return new Promise(async (resolve, reject) => {
            const orderFullDetails = await db.get().collection(ORDER_COLLECTION).aggregate([
                {
                    $unwind: "$orders"
                },
                {
                    $match: {
                        "orders._id": new ObjectId(orderId)
                    }
                },
                {
                    $unwind: "$orders.products"
                },
                {
                    $lookup: {
                        from: "products",
                        localField: "orders.products.item",
                        foreignField: "_id",
                        as: "productDetails"
                    }
                },
                {
                    $addFields: {
                        "productDetails.quantity": "$orders.products.quantity"
                    }
                },
                {
                    $project: {
                        _id: 0,
                        "orders.products": 0
                    }
                },
                {
                    $group: {
                        _id: "$orders._id",
                        orders: {
                            $push: "$orders"
                        },
                        productDetails: {
                            $push: "$productDetails"
                        },
                        user: {
                            $first: "$user"
                        }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        user: 1,
                        orders: {
                            $first: "$orders"
                        },
                        productDetails: {
                            $reduce: {
                                input: "$productDetails",
                                initialValue: [],
                                in: {
                                    $concatArrays: [
                                        "$$value",
                                        "$$this"
                                    ]
                                }
                            }
                        }
                    }
                }
            ]).toArray()
            resolve(orderFullDetails[0])
        })
    },
    updateOrderStatus: (orderId) => {
        return new Promise(async (resolve, reject) => {
            let status = await db.get().collection(ORDER_COLLECTION).aggregate(
                [
                    {
                        $unwind: "$orders"
                    },
                    {
                        $match: {
                            "orders._id": new ObjectId(orderId)
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            status: "$orders.status"
                        }
                    }
                ]
            ).toArray()
            
            let newStatus;
            if (status[0].status === 'placed') {
                newStatus = 'packed'
            } else if (status[0].status === 'packed') {
                newStatus = 'shipped'
            } else if (status[0].status === 'shipped') {
                newStatus = 'out for delivery'
            } else if (status[0].status === 'out for delivery') {
                newStatus = 'delivered'
            }

            await db.get().collection(ORDER_COLLECTION).updateOne(
                { "orders._id": new ObjectId(orderId) },
                { $set: { "orders.$.status": newStatus } }
             )
            resolve()
        })
    }
}