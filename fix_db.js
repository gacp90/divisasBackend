require('dotenv').config();
const mongoose = require('mongoose');

mongoose.connect(process.env.DB_CNN).then(async () => {
    const db = mongoose.connection.useDb('branch_demo2_masterpezcom');
    const Inventory = db.collection('inventories');
    await Inventory.updateOne({ code: 'USD' }, { $set: { tc: 3500 } });
    console.log('Fixed masterpezcom USD tc');
    process.exit(0);
});
