const mongoose = require('mongoose');
const getInventoryModel = require('../services/branch/models/inventory.model');

mongoose.connect('mongodb+srv://masterpezcom:Master25@simid-cluster.snm0ibp.mongodb.net/branch_demo2_simidmas', {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(async () => {
    console.log("Connected to MongoDB branch_demo2_simidmas");
    const Inventory = getInventoryModel(mongoose.connection);
    
    // Saneamiento de USD
    const result = await Inventory.updateOne({ code: 'USD' }, { $set: { tpc: 3450 } });
    console.log(`Update result: Modified ${result.modifiedCount} documents.`);
    
    // Fetch result to verify
    const usd = await Inventory.findOne({ code: 'USD' });
    console.log(`- USD: amount=${usd.amount}, TC=${usd.tc}, TV=${usd.tv}, TPC=${usd.tpc}, TA=${usd.ta}`);
    
    process.exit(0);
}).catch(err => {
    console.error(err);
    process.exit(1);
});
