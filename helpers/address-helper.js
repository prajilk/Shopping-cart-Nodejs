const { ObjectId } = require('mongodb')
const { ADDRESS_COLLECTION } = require('../config/collections')
const db = require('../config/connection')

module.exports = {
    addAddress: (user, address) => {
        return new Promise(async (resolve, reject) => {
            const isAddressAddess = await db.get().collection(ADDRESS_COLLECTION).findOne({ user: new ObjectId(user) })
            if (isAddressAddess) {
                address._id = new ObjectId()
                await db.get().collection(ADDRESS_COLLECTION).updateOne(
                    {
                        user: new ObjectId(user)
                    },
                    {
                        $set: {
                            currentAddress: new ObjectId(address._id)
                        },
                        $push: {
                            addressList: address
                        }
                    }
                )
            } else {
                address._id = new ObjectId()
                await db.get().collection(ADDRESS_COLLECTION).insertOne({ user: new ObjectId(user), currentAddress: new ObjectId(address._id), addressList: [address] })
            }
        })
    },
    updateAddress: (user, addressId, address) => {
        return new Promise(async (resolve, reject) => {
            address._id = new ObjectId(addressId)
            await db.get().collection(ADDRESS_COLLECTION).updateOne(
                {
                    user: new ObjectId(user),
                    "addressList._id": new ObjectId(addressId)
                },
                {
                    $set: {
                        "addressList.$": address
                    }
                }
            )
            resolve()
        })
    },
    updateCurrentAddress: (user, addressId) => {
        return new Promise(async (resolve, reject) => {
            await db.get().collection(ADDRESS_COLLECTION).updateOne(
                {
                    user: new ObjectId(user)
                },
                {
                    $set: {
                        currentAddress: new ObjectId(addressId)
                    }
                }
            )
            resolve()
        })
    },
    deleteAddress: (user, addressId) => {
        return new Promise(async (resolve, reject) => {

            let currentAddress = await db.get().collection(ADDRESS_COLLECTION).findOne({ user: new ObjectId(user) })
            await db.get().collection(ADDRESS_COLLECTION).updateOne({ user: new ObjectId(user) }, { $pull: { addressList: { _id: new ObjectId(addressId) } } })

            if (JSON.stringify(currentAddress.currentAddress) === JSON.stringify(addressId)) {
                const addressList = await db.get().collection(ADDRESS_COLLECTION).findOne({ user: new ObjectId(user) })

                if (JSON.stringify(addressList.addressList) !== '[]') {
                    const currentAddressAfterDelete = addressList.addressList.slice(-1).pop()._id;
                    await db.get().collection(ADDRESS_COLLECTION).updateOne(
                        {
                            user: new ObjectId(user)
                        },
                        {
                            $set: {
                                currentAddress: new ObjectId(currentAddressAfterDelete)
                            }
                        }
                    )
                } else {
                    await db.get().collection(ADDRESS_COLLECTION).updateOne(
                        {
                            user: new ObjectId(user)
                        },
                        {
                            $set: {
                                currentAddress: null
                            }
                        }
                    )
                }
            }
            resolve()
        })
    },
    getAllAddress: (user) => {
        return new Promise(async (resolve, reject) => {
            const addressList = await db.get().collection(ADDRESS_COLLECTION).findOne({ user: new ObjectId(user) })
            if (addressList) {
                // Return array of all address
                resolve(addressList.addressList)
            } else {
                resolve(null)
            }
        })
    },
    getThisAddress: (user, addressId) => {
        return new Promise(async (resolve, reject) => {
            const address = await db.get().collection(ADDRESS_COLLECTION).aggregate(
                [
                    { $match: { user: new ObjectId(user) } },
                    {
                        $unwind: '$addressList'
                    },
                    {
                        $match: { 'addressList._id': new ObjectId(addressId) }
                    }
                ]
            ).toArray()
            resolve(address[0].addressList);
        })
    },
    getCurrentAddress: (user) => {
        // Return one Address
        return new Promise(async (resolve, reject) => {
            const addressId = await db.get().collection(ADDRESS_COLLECTION).findOne({ user: new ObjectId(user) })
            if (addressId) {
                const address = await db.get().collection(ADDRESS_COLLECTION).aggregate(
                    [
                        { $match: { user: new ObjectId(user) } },
                        {
                            $unwind: '$addressList'
                        },
                        {
                            $match: { 'addressList._id': new ObjectId(addressId.currentAddress) }
                        }
                    ]
                ).toArray()
                if (address[0] !== undefined)
                    resolve(address[0].addressList);
                else
                    resolve(null)
            } else {
                resolve(null)
            }
        })
    }
}