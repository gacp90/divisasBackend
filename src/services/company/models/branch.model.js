const { Schema } = require('mongoose');

const branchSchema = (connection) => {
    
    if (connection.models['Branch']) {
        return connection.models['Branch'];
    }

    const BranchSchema = Schema({
        name: {
            type: String,
            required: true
        },
        path: {
            type: String,
            required: true,
            unique: true,
            lowercase: true,
            trim: true
        },
        isActive: {
            type: Boolean,
            default: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    });

    BranchSchema.method('toJSON', function() {
        const { __v, _id, ...object } = this.toObject();
        object.id = _id;
        return object;
    });

    return connection.model('Branch', BranchSchema);
};

module.exports = branchSchema;
