const { MongoClient } = require('mongodb')

const state = {
    db:null
}

module.exports.connect=function(){
    // MongoClient.connect('mongodb://127.0.0.1:27017')
    MongoClient.connect(process.env.MONGODB_URI)
    .then((client)=>{
        state.db = client.db('shopping-cart')
    }).catch((err)=>{
        console.log(err);
    })
}

module.exports.get=function(){
    return state.db
}